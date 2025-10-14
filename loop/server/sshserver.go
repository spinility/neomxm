package server

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"slices"
	"syscall"
	"time"
	"unsafe"

	"github.com/creack/pty"
	"github.com/gliderlabs/ssh"
	"github.com/pkg/sftp"
	gossh "golang.org/x/crypto/ssh"
)

func setWinsize(f *os.File, w, h int) {
	syscall.Syscall(syscall.SYS_IOCTL, f.Fd(), uintptr(syscall.TIOCSWINSZ),
		uintptr(unsafe.Pointer(&struct{ h, w, x, y uint16 }{uint16(h), uint16(w), 0, 0})))
}

func (s *Server) ServeSSH(ctx context.Context, hostKey, authorizedKeys []byte, containerCAKey, hostCertificate []byte) error {
	// Parse all authorized keys
	allowedKeys := make([]ssh.PublicKey, 0)
	rest := authorizedKeys
	var err error

	// Continue parsing as long as there are bytes left
	for len(rest) > 0 {
		var key ssh.PublicKey
		key, _, _, rest, err = ssh.ParseAuthorizedKey(rest)
		if err != nil {
			// If we hit an error, check if we have more lines to try
			if i := bytes.IndexByte(rest, '\n'); i >= 0 {
				// Skip to the next line and continue
				rest = rest[i+1:]
				continue
			}
			// No more lines and we hit an error, so stop parsing
			break
		}
		allowedKeys = append(allowedKeys, key)
	}
	if len(allowedKeys) == 0 {
		return fmt.Errorf("ServeSSH: no valid authorized keys found")
	}

	// Set up the certificate verifier if containerCAKey is provided
	var certChecker *gossh.CertChecker
	var containerCA gossh.PublicKey
	hasMutualAuth := false

	if len(containerCAKey) > 0 {
		// Parse container CA public key
		containerCA, _, _, _, err = ssh.ParseAuthorizedKey(containerCAKey)
		if err != nil {
			slog.WarnContext(ctx, "Failed to parse container CA key", slog.String("err", err.Error()))
		} else {
			certChecker = &gossh.CertChecker{
				// Verify if the certificate was signed by our CA
				IsUserAuthority: func(auth gossh.PublicKey) bool {
					return bytes.Equal(auth.Marshal(), containerCA.Marshal())
				},
				// Check if a certificate has been revoked
				IsRevoked: func(cert *gossh.Certificate) bool {
					// We don't implement certificate revocation yet, so no certificates are revoked
					return false
				},
			}
			slog.InfoContext(ctx, "SSH server configured for mutual authentication with container CA")
			hasMutualAuth = true
		}
	}

	signer, err := gossh.ParsePrivateKey(hostKey)
	if err != nil {
		return fmt.Errorf("ServeSSH: failed to parse host private key, err: %w", err)
	}
	forwardHandler := &ssh.ForwardedTCPHandler{}

	server := ssh.Server{
		LocalPortForwardingCallback: ssh.LocalPortForwardingCallback(func(ctx ssh.Context, dhost string, dport uint32) bool {
			return true
		}),
		ReversePortForwardingCallback: ssh.ReversePortForwardingCallback(func(ctx ssh.Context, bindHost string, bindPort uint32) bool {
			slog.DebugContext(ctx, "Accepted reverse forward", slog.Any("bindHost", bindHost), slog.Any("bindPort", bindPort))
			return true
		}),
		Addr:            ":22",
		ChannelHandlers: ssh.DefaultChannelHandlers,
		Handler: ssh.Handler(func(s ssh.Session) {
			ptyReq, winCh, isPty := s.Pty()
			if isPty {
				handlePTYSession(ctx, s, ptyReq, winCh)
			} else {
				handleSession(ctx, s)
			}
		}),
		RequestHandlers: map[string]ssh.RequestHandler{
			"tcpip-forward":        forwardHandler.HandleSSHRequest,
			"cancel-tcpip-forward": forwardHandler.HandleSSHRequest,
		},
		SubsystemHandlers: map[string]ssh.SubsystemHandler{
			"sftp": func(s ssh.Session) {
				handleSftp(ctx, s)
			},
		},
		HostSigners: []ssh.Signer{signer},
		PublicKeyHandler: func(ctx ssh.Context, key ssh.PublicKey) bool {
			// First, check if it's a certificate signed by our container CA
			if hasMutualAuth {
				if cert, ok := key.(*gossh.Certificate); ok {
					// It's a certificate, check if it's valid and signed by our CA
					if certChecker.IsUserAuthority(cert.SignatureKey) {
						// Verify the certificate validity time
						now := time.Now()
						if now.Before(time.Unix(int64(cert.ValidBefore), 0)) &&
							now.After(time.Unix(int64(cert.ValidAfter), 0)) {
							// Check if the certificate has the right principal
							if sliceContains(cert.ValidPrincipals, "root") {
								slog.InfoContext(ctx, "SSH client authenticated with valid certificate")
								return true
							}
							slog.WarnContext(ctx, "Certificate lacks root principal",
								slog.Any("principals", cert.ValidPrincipals))
						} else {
							slog.WarnContext(ctx, "Certificate time validation failed",
								slog.Time("now", now),
								slog.Time("valid_after", time.Unix(int64(cert.ValidAfter), 0)),
								slog.Time("valid_before", time.Unix(int64(cert.ValidBefore), 0)))
						}
					}
				}
			}

			// Standard key-based authentication fallback
			for _, allowedKey := range allowedKeys {
				if ssh.KeysEqual(key, allowedKey) {
					slog.DebugContext(ctx, "ServeSSH: allow key", slog.String("key", string(key.Marshal())))
					return true
				}
			}
			return false
		},
	}

	// This ChannelHandler is necessary for vscode's Remote-SSH connections to work.
	// Without it the new VSC window will open, but you'll get an error that says something
	// like "Failed to set up dynamic port forwarding connection over SSH to the VS Code Server."
	server.ChannelHandlers["direct-tcpip"] = ssh.DirectTCPIPHandler

	return server.ListenAndServe()
}

func handleSftp(ctx context.Context, sess ssh.Session) {
	debugStream := io.Discard
	serverOptions := []sftp.ServerOption{
		sftp.WithDebug(debugStream),
	}
	server, err := sftp.NewServer(
		sess,
		serverOptions...,
	)
	if err != nil {
		slog.ErrorContext(ctx, "sftp server init error", slog.Any("err", err))
		return
	}
	if err := server.Serve(); err == io.EOF {
		server.Close()
	} else if err != nil {
		slog.ErrorContext(ctx, "sftp server completed with error", slog.Any("err", err))
	}
}

func handlePTYSession(ctx context.Context, s ssh.Session, ptyReq ssh.Pty, winCh <-chan ssh.Window) {
	cmd := exec.CommandContext(ctx, "/bin/bash")
	slog.DebugContext(ctx, "handlePTYSession", slog.Any("ptyReq", ptyReq))

	cmd.Env = append(os.Environ(), fmt.Sprintf("TERM=%s", ptyReq.Term))
	f, err := pty.Start(cmd)
	if err != nil {
		fmt.Fprintf(s, "PTY requested, but unable to start due to error: %v", err)
		s.Exit(1)
		return
	}

	go func() {
		for win := range winCh {
			setWinsize(f, win.Width, win.Height)
		}
	}()
	go func() {
		io.Copy(f, s) // stdin
	}()
	io.Copy(s, f) // stdout

	// TODO: double check, do we need a sync.WaitGroup here, to make sure we finish
	// the pipe I/O before we call cmd.Wait?
	if err := cmd.Wait(); err != nil {
		slog.ErrorContext(ctx, "handlePTYSession: cmd.Wait", slog.String("err", err.Error()))
		s.Exit(1)
	}
}

func handleSession(ctx context.Context, s ssh.Session) {
	var cmd *exec.Cmd
	slog.DebugContext(ctx, "handleSession", slog.Any("s.Command", s.Command()))
	if len(s.Command()) == 0 {
		cmd = exec.CommandContext(ctx, "/bin/bash")
	} else {
		cmd = exec.CommandContext(ctx, s.Command()[0], s.Command()[1:]...)
	}
	stdinPipe, err := cmd.StdinPipe()
	if err != nil {
		slog.ErrorContext(ctx, "handleSession: cmd.StdinPipe", slog.Any("err", err.Error()))
		fmt.Fprintf(s, "cmd.StdinPipe error: %v", err)

		s.Exit(1)
		return
	}
	defer stdinPipe.Close()

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		slog.ErrorContext(ctx, "handleSession: cmd.StdoutPipe", slog.Any("err", err.Error()))
		fmt.Fprintf(s, "cmd.StdoutPipe error: %v", err)
		s.Exit(1)
		return
	}
	defer stdoutPipe.Close()

	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		slog.ErrorContext(ctx, "handleSession: cmd.StderrPipe", slog.Any("err", err.Error()))
		fmt.Fprintf(s, "cmd.StderrPipe error: %v", err)
		s.Exit(1)
		return
	}
	defer stderrPipe.Close()

	if err := cmd.Start(); err != nil {
		slog.ErrorContext(ctx, "handleSession: cmd.Start", slog.Any("err", err.Error()))
		fmt.Fprintf(s, "cmd.Start error: %v", err)
		s.Exit(1)
		return
	}

	// TODO: double check, do we need a sync.WaitGroup here, to make sure we finish
	// the pipe I/O before we call cmd.Wait?
	go func() {
		io.Copy(s, stderrPipe)
	}()
	go func() {
		io.Copy(s, stdoutPipe)
	}()
	io.Copy(stdinPipe, s)

	if err := cmd.Wait(); err != nil {
		slog.ErrorContext(ctx, "handleSession: cmd.Wait", slog.Any("err", err.Error()))
		fmt.Fprintf(s, "cmd.Wait error: %v", err)
		s.Exit(1)
	}
}

// sliceContains checks if a string slice contains a specific string
func sliceContains(slice []string, value string) bool {
	return slices.Contains(slice, value)
}
