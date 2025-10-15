package dockerimg

import (
	"bufio"
	"bytes"
	"crypto/ed25519"
	"crypto/rand"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"golang.org/x/crypto/ssh"
)

// MockFileSystem implements the FileSystem interface for testing
type MockFileSystem struct {
	Files          map[string][]byte
	CreatedDirs    map[string]bool
	OpenedFiles    map[string]*MockFile
	StatCalledWith []string
	TempFiles      []string
	FailOn         map[string]error // Map of function name to error to simulate failures
}

func NewMockFileSystem() *MockFileSystem {
	return &MockFileSystem{
		Files:       make(map[string][]byte),
		CreatedDirs: make(map[string]bool),
		OpenedFiles: make(map[string]*MockFile),
		TempFiles:   []string{},
		FailOn:      make(map[string]error),
	}
}

func (m *MockFileSystem) Stat(name string) (fs.FileInfo, error) {
	m.StatCalledWith = append(m.StatCalledWith, name)
	if err, ok := m.FailOn["Stat"]; ok {
		return nil, err
	}

	_, exists := m.Files[name]
	if exists {
		return nil, nil // File exists
	}
	_, exists = m.CreatedDirs[name]
	if exists {
		return nil, nil // Directory exists
	}
	return nil, os.ErrNotExist
}

func (m *MockFileSystem) Mkdir(name string, perm fs.FileMode) error {
	if err, ok := m.FailOn["Mkdir"]; ok {
		return err
	}
	m.CreatedDirs[name] = true
	return nil
}

func (m *MockFileSystem) MkdirAll(name string, perm fs.FileMode) error {
	if err, ok := m.FailOn["MkdirAll"]; ok {
		return err
	}
	m.CreatedDirs[name] = true
	return nil
}

func (m *MockFileSystem) ReadFile(name string) ([]byte, error) {
	if err, ok := m.FailOn["ReadFile"]; ok {
		return nil, err
	}

	data, exists := m.Files[name]
	if !exists {
		return nil, fmt.Errorf("file not found: %s", name)
	}
	return data, nil
}

func (m *MockFileSystem) WriteFile(name string, data []byte, perm fs.FileMode) error {
	if err, ok := m.FailOn["WriteFile"]; ok {
		return err
	}
	m.Files[name] = data
	return nil
}

// MockFile implements a simple in-memory file for testing
type MockFile struct {
	name     string
	buffer   *bytes.Buffer
	fs       *MockFileSystem
	position int64
}

// MockFileContents represents in-memory file contents for testing
type MockFileContents struct {
	name     string
	contents string
}

func (m *MockFileSystem) OpenFile(name string, flag int, perm fs.FileMode) (*os.File, error) {
	if err, ok := m.FailOn["OpenFile"]; ok {
		return nil, err
	}

	// Initialize the file content if it doesn't exist and we're not in read-only mode
	if _, exists := m.Files[name]; !exists && (flag&os.O_CREATE != 0) {
		m.Files[name] = []byte{}
	}

	data, exists := m.Files[name]
	if !exists {
		return nil, fmt.Errorf("file not found: %s", name)
	}

	// For OpenFile, we'll just use WriteFile to simulate file operations
	// The actual file handle isn't used for much in the localsshimmer code
	// but we still need to return a valid file handle
	tmpFile, err := os.CreateTemp("", "mockfile-*")
	if err != nil {
		return nil, err
	}
	if _, err := tmpFile.Write(data); err != nil {
		tmpFile.Close()
		return nil, err
	}
	if _, err := tmpFile.Seek(0, 0); err != nil {
		tmpFile.Close()
		return nil, err
	}

	return tmpFile, nil
}

func (m *MockFileSystem) TempFile(dir, pattern string) (*os.File, error) {
	if err, ok := m.FailOn["TempFile"]; ok {
		return nil, err
	}

	// Create an actual temporary file for testing purposes
	tmpFile, err := os.CreateTemp(dir, pattern)
	if err != nil {
		return nil, err
	}

	// Record the temp file path
	m.TempFiles = append(m.TempFiles, tmpFile.Name())

	return tmpFile, nil
}

func (m *MockFileSystem) Rename(oldpath, newpath string) error {
	if err, ok := m.FailOn["Rename"]; ok {
		return err
	}

	// If the old path exists in our mock file system, move its contents
	if data, exists := m.Files[oldpath]; exists {
		m.Files[newpath] = data
		delete(m.Files, oldpath)
	}

	return nil
}

func (m *MockFileSystem) SafeWriteFile(name string, data []byte, perm fs.FileMode) error {
	if err, ok := m.FailOn["SafeWriteFile"]; ok {
		return err
	}

	// For the mock, we'll create a backup if the file exists
	if existingData, exists := m.Files[name]; exists {
		backupName := name + ".bak"
		m.Files[backupName] = existingData
	}

	// Write the new data
	m.Files[name] = data

	return nil
}

// MockKeyGenerator implements KeyGenerator interface for testing
type MockKeyGenerator struct {
	privateKey   ed25519.PrivateKey
	publicKey    ed25519.PublicKey
	sshPublicKey ssh.PublicKey
	caSigner     ssh.Signer
	FailOn       map[string]error
}

func NewMockKeyGenerator(privateKey ed25519.PrivateKey, publicKey ed25519.PublicKey, sshPublicKey ssh.PublicKey, caSigner ssh.Signer) *MockKeyGenerator {
	return &MockKeyGenerator{
		privateKey:   privateKey,
		publicKey:    publicKey,
		sshPublicKey: sshPublicKey,
		caSigner:     caSigner,
		FailOn:       make(map[string]error),
	}
}

func (m *MockKeyGenerator) GenerateKeyPair() (ed25519.PrivateKey, ed25519.PublicKey, error) {
	if err, ok := m.FailOn["GenerateKeyPair"]; ok {
		return nil, nil, err
	}
	return m.privateKey, m.publicKey, nil
}

func (m *MockKeyGenerator) ConvertToSSHPublicKey(publicKey ed25519.PublicKey) (ssh.PublicKey, error) {
	if err, ok := m.FailOn["ConvertToSSHPublicKey"]; ok {
		return nil, err
	}
	// If we're generating the CA public key, return the caSigner's public key
	if m.caSigner != nil && bytes.Equal(publicKey, m.publicKey) {
		return m.caSigner.PublicKey(), nil
	}
	return m.sshPublicKey, nil
}

// setupMocks sets up common mocks for testing
func setupMocks(t *testing.T) (*MockFileSystem, *MockKeyGenerator, ed25519.PrivateKey) {
	// Generate a real Ed25519 key pair
	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("Failed to generate test key pair: %v", err)
	}

	// Generate a test SSH public key
	sshPublicKey, err := ssh.NewPublicKey(publicKey)
	if err != nil {
		t.Fatalf("Failed to generate test SSH public key: %v", err)
	}

	// Create CA key pair
	_, caPrivKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("Failed to generate CA key pair: %v", err)
	}

	// Create CA signer
	caSigner, err := ssh.NewSignerFromKey(caPrivKey)
	if err != nil {
		t.Fatalf("Failed to create CA signer: %v", err)
	}

	// Create mocks
	mockFS := NewMockFileSystem()
	mockKG := NewMockKeyGenerator(privateKey, publicKey, sshPublicKey, caSigner)

	// Add some files needed for tests
	mockFS.Files["/home/testuser/.config/sketch/host_cert"] = []byte("test-certificate")
	caPubKeyBytes := ssh.MarshalAuthorizedKey(ssh.PublicKey(caSigner.PublicKey()))
	mockFS.Files["/home/testuser/.config/sketch/container_ca.pub"] = caPubKeyBytes

	return mockFS, mockKG, privateKey
}

// Helper function to setup a basic LocalSSHimmer for testing
func setupTestLocalSSHimmer(t *testing.T) (*LocalSSHimmer, *MockFileSystem, *MockKeyGenerator) {
	mockFS, mockKG, _ := setupMocks(t)

	// Setup home dir in mock filesystem
	homePath := "/home/testuser"
	sketchDir := filepath.Join(homePath, ".config/sketch")
	mockFS.CreatedDirs[sketchDir] = true

	// Create empty files so the tests don't fail
	sketchConfigPath := filepath.Join(sketchDir, "ssh_config")
	mockFS.Files[sketchConfigPath] = []byte("")
	knownHostsPath := filepath.Join(sketchDir, "known_hosts")
	mockFS.Files[knownHostsPath] = []byte("")

	// Set HOME environment variable for the test
	oldHome := os.Getenv("HOME")
	os.Setenv("HOME", homePath)
	t.Cleanup(func() { os.Setenv("HOME", oldHome) })

	// Create LocalSSHimmer with mocks
	ssh, err := newLocalSSHimmerWithDeps("test-container", "localhost", "2222", mockFS, mockKG)
	if err != nil {
		t.Fatalf("Failed to create LocalSSHimmer: %v", err)
	}

	return ssh, mockFS, mockKG
}

func TestNewLocalSSHimmerCreatesRequiredDirectories(t *testing.T) {
	mockFS, mockKG, _ := setupMocks(t)

	// Set HOME environment variable for the test
	oldHome := os.Getenv("HOME")
	os.Setenv("HOME", "/home/testuser")
	defer func() { os.Setenv("HOME", oldHome) }()

	// Create empty files so the test doesn't fail
	sketchDir := "/home/testuser/.config/sketch"
	sketchConfigPath := filepath.Join(sketchDir, "ssh_config")
	mockFS.Files[sketchConfigPath] = []byte("")
	knownHostsPath := filepath.Join(sketchDir, "known_hosts")
	mockFS.Files[knownHostsPath] = []byte("")

	// Create sshimmer
	_, err := newLocalSSHimmerWithDeps("test-container", "localhost", "2222", mockFS, mockKG)
	if err != nil {
		t.Fatalf("Failed to create LocalSSHimmer: %v", err)
	}

	// Check if the .config/sketch directory was created
	expectedDir := "/home/testuser/.config/sketch"
	if !mockFS.CreatedDirs[expectedDir] {
		t.Errorf("Expected directory %s to be created", expectedDir)
	}
}

func TestCreateKeyPairIfMissing(t *testing.T) {
	ssh, mockFS, _ := setupTestLocalSSHimmer(t)

	// Test key pair creation
	keyPath := "/home/testuser/.config/sketch/test_key"
	_, err := ssh.createKeyPairIfMissing(keyPath)
	if err != nil {
		t.Fatalf("Failed to create key pair: %v", err)
	}

	// Verify private key file was created
	if _, exists := mockFS.Files[keyPath]; !exists {
		t.Errorf("Private key file not created at %s", keyPath)
	}

	// Verify public key file was created
	pubKeyPath := keyPath + ".pub"
	if _, exists := mockFS.Files[pubKeyPath]; !exists {
		t.Errorf("Public key file not created at %s", pubKeyPath)
	}

	// Verify public key content format
	pubKeyContent, _ := mockFS.ReadFile(pubKeyPath)
	if !bytes.HasPrefix(pubKeyContent, []byte("ssh-ed25519 ")) {
		t.Errorf("Public key does not have expected format, got: %s", pubKeyContent)
	}
}

// TestAddContainerToSSHConfig tests that the container gets added to the SSH config
// This test uses a direct approach since the OpenFile mocking is complex
func TestAddContainerToSSHConfig(t *testing.T) {
	// Create a temporary directory for test files
	tempDir, err := os.MkdirTemp("", "localsshimmer-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create real files in temp directory
	configPath := filepath.Join(tempDir, "ssh_config")
	initialConfig := `# SSH Config
Host existing-host
  HostName example.com
  User testuser
`
	if err := os.WriteFile(configPath, []byte(initialConfig), 0o644); err != nil {
		t.Fatalf("Failed to write initial config: %v", err)
	}

	// Create a sshimmer with the real filesystem but custom paths
	ssh := &LocalSSHimmer{
		cntrName:         "test-container",
		sshHost:          "localhost",
		sshPort:          "2222",
		sshConfigPath:    configPath,
		userIdentityPath: filepath.Join(tempDir, "user_identity"),
		fs:               &RealFileSystem{},
		kg:               &RealKeyGenerator{},
	}

	// Add container to SSH config
	err = ssh.addContainerToSSHConfig()
	if err != nil {
		t.Fatalf("Failed to add container to SSH config: %v", err)
	}

	// Read the updated file
	configData, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("Failed to read updated config: %v", err)
	}
	configStr := string(configData)

	// Check for expected values
	if !strings.Contains(configStr, "Host test-container") {
		t.Errorf("Container host entry not found in config")
	}

	if !strings.Contains(configStr, "HostName localhost") {
		t.Errorf("HostName not correctly added to SSH config")
	}

	if !strings.Contains(configStr, "Port 2222") {
		t.Errorf("Port not correctly added to SSH config")
	}

	if !strings.Contains(configStr, "User root") {
		t.Errorf("User not correctly set to root in SSH config")
	}

	// Check if identity file path is correct
	identityLine := "IdentityFile " + ssh.userIdentityPath
	if !strings.Contains(configStr, identityLine) {
		t.Errorf("Identity file path not correctly added to SSH config")
	}
}

func TestAddContainerToKnownHosts(t *testing.T) {
	// Skip this test as it requires more complex setup
	// The TestLocalSSHimmerCleanup test covers the addContainerToKnownHosts
	// functionality in a more integrated way
	t.Skip("This test requires more complex setup, integrated test coverage exists in TestLocalSSHimmerCleanup")
}

func TestRemoveContainerFromSSHConfig(t *testing.T) {
	// Create a temporary directory for test files
	tempDir, err := os.MkdirTemp("", "localsshimmer-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create paths for test files
	sshConfigPath := filepath.Join(tempDir, "ssh_config")
	userIdentityPath := filepath.Join(tempDir, "user_identity")
	knownHostsPath := filepath.Join(tempDir, "known_hosts")

	// Create initial SSH config with container entry
	cntrName := "test-container"
	sshHost := "localhost"
	sshPort := "2222"

	initialConfig := fmt.Sprintf(
		`Host existing-host
  HostName example.com
  User testuser

Host %s
  HostName %s
  User root
  Port %s
  IdentityFile %s
  UserKnownHostsFile %s
`,
		cntrName, sshHost, sshPort, userIdentityPath, knownHostsPath,
	)

	if err := os.WriteFile(sshConfigPath, []byte(initialConfig), 0o644); err != nil {
		t.Fatalf("Failed to write initial SSH config: %v", err)
	}

	// Create a sshimmer with the real filesystem but custom paths
	ssh := &LocalSSHimmer{
		cntrName:         cntrName,
		sshHost:          sshHost,
		sshPort:          sshPort,
		sshConfigPath:    sshConfigPath,
		userIdentityPath: userIdentityPath,
		knownHostsPath:   knownHostsPath,
		fs:               &RealFileSystem{},
	}

	// Remove container from SSH config
	err = ssh.removeContainerFromSSHConfig()
	if err != nil {
		t.Fatalf("Failed to remove container from SSH config: %v", err)
	}

	// Read the updated file
	configData, err := os.ReadFile(sshConfigPath)
	if err != nil {
		t.Fatalf("Failed to read updated config: %v", err)
	}
	configStr := string(configData)

	// Check if the container host entry was removed
	if strings.Contains(configStr, "Host "+cntrName) {
		t.Errorf("Container host not removed from SSH config")
	}

	// Check if existing host remains
	if !strings.Contains(configStr, "Host existing-host") {
		t.Errorf("Existing host entry affected by container removal")
	}
}

func TestRemoveContainerFromKnownHosts(t *testing.T) {
	ssh, mockFS, _ := setupTestLocalSSHimmer(t)

	// Setup server public key
	_, publicKey, _ := ssh.kg.GenerateKeyPair()
	sshPublicKey, _ := ssh.kg.ConvertToSSHPublicKey(publicKey)
	ssh.serverPublicKey = sshPublicKey

	// Create host line to be removed
	hostLine := "[localhost]:2222 ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ..."
	otherLine := "otherhost ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ..."

	// Set initial content with the line to be removed
	initialContent := otherLine + "\n" + hostLine
	mockFS.Files[ssh.knownHostsPath] = []byte(initialContent)

	// Add the host to test remove function
	err := ssh.addContainerToKnownHosts()
	if err != nil {
		t.Fatalf("Failed to add container to known_hosts for removal test: %v", err)
	}

	// Now remove it
	err = ssh.removeContainerFromKnownHosts()
	if err != nil {
		t.Fatalf("Failed to remove container from known_hosts: %v", err)
	}

	// Verify content
	updatedContent, _ := mockFS.ReadFile(ssh.knownHostsPath)
	content := string(updatedContent)

	hostPattern := ssh.sshHost + ":" + ssh.sshPort
	if strings.Contains(content, hostPattern) {
		t.Errorf("Container entry not removed from known_hosts")
	}

	// Verify other content remains
	if !strings.Contains(content, otherLine) {
		t.Errorf("Other known_hosts entries improperly removed")
	}
}

func TestLocalSSHimmerCleanup(t *testing.T) {
	// Create a temporary directory for test files
	tempDir, err := os.MkdirTemp("", "localsshimmer-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create paths for test files
	sshConfigPath := filepath.Join(tempDir, "ssh_config")
	userIdentityPath := filepath.Join(tempDir, "user_identity")
	knownHostsPath := filepath.Join(tempDir, "known_hosts")
	serverIdentityPath := filepath.Join(tempDir, "server_identity")

	// Create keys for server key
	publicKey, _, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatalf("Failed to generate key pair: %v", err)
	}
	sshPublicKey, err := ssh.NewPublicKey(publicKey)
	if err != nil {
		t.Fatalf("Failed to generate SSH public key: %v", err)
	}

	// Initialize files
	os.WriteFile(sshConfigPath, []byte("initial ssh_config content"), 0o644)
	os.WriteFile(knownHostsPath, []byte("initial known_hosts content"), 0o644)

	// Create a sshimmer with the real filesystem but custom paths
	cntrName := "test-container"
	sshHost := "localhost"
	sshPort := "2222"

	ssh := &LocalSSHimmer{
		cntrName:           cntrName,
		sshHost:            sshHost,
		sshPort:            sshPort,
		sshConfigPath:      sshConfigPath,
		userIdentityPath:   userIdentityPath,
		knownHostsPath:     knownHostsPath,
		serverIdentityPath: serverIdentityPath,
		serverPublicKey:    sshPublicKey,
		fs:                 &RealFileSystem{},
		kg:                 &RealKeyGenerator{},
	}

	// Add container to configs
	err = ssh.addContainerToSSHConfig()
	if err != nil {
		t.Fatalf("Failed to set up SSH config for cleanup test: %v", err)
	}

	err = ssh.addContainerToKnownHosts()
	if err != nil {
		t.Fatalf("Failed to set up known_hosts for cleanup test: %v", err)
	}

	// Execute cleanup
	err = ssh.Cleanup()
	if err != nil {
		t.Fatalf("Cleanup failed: %v", err)
	}

	// Read updated files
	configData, err := os.ReadFile(sshConfigPath)
	if err != nil {
		t.Fatalf("Failed to read updated SSH config: %v", err)
	}
	configStr := string(configData)

	// Check container was removed from SSH config
	hostEntry := "Host " + ssh.cntrName
	if strings.Contains(configStr, hostEntry) {
		t.Errorf("Container not removed from SSH config during cleanup")
	}

	// Verify known hosts was updated
	knownHostsContent, err := os.ReadFile(knownHostsPath)
	if err != nil {
		t.Fatalf("Failed to read updated known_hosts: %v", err)
	}

	expectedHostPattern := ssh.sshHost + ":" + ssh.sshPort
	if strings.Contains(string(knownHostsContent), expectedHostPattern) {
		t.Errorf("Container not removed from known_hosts during cleanup")
	}
}

func TestCheckForInclude_userAccepts(t *testing.T) {
	mockFS := NewMockFileSystem()

	// Set HOME environment variable for the test
	oldHome := os.Getenv("HOME")
	os.Setenv("HOME", "/home/testuser")
	defer func() { os.Setenv("HOME", oldHome) }()

	// Create a mock ssh config with the expected include
	includeLine := "Include /home/testuser/.config/sketch/ssh_config"
	initialConfig := fmt.Sprintf("%s\nHost example\n  HostName example.com\n", includeLine)

	// Add the config to the mock filesystem
	sshConfigPath := "/home/testuser/.ssh/config"
	mockFS.Files[sshConfigPath] = []byte(initialConfig)
	stdinReader := bufio.NewReader(strings.NewReader("y\n"))
	// Test the function with our mock
	err := CheckForIncludeWithFS(mockFS, *stdinReader)
	if err != nil {
		t.Fatalf("CheckForInclude failed with proper include: %v", err)
	}

	// Now test with config missing the include
	mockFS.Files[sshConfigPath] = []byte("Host example\n  HostName example.com\n")

	stdinReader = bufio.NewReader(strings.NewReader("y\n"))
	err = CheckForIncludeWithFS(mockFS, *stdinReader)
	if err != nil {
		t.Fatalf("CheckForInclude should have created the Include line without an error")
	}
}

func TestCheckForInclude_userDeclines(t *testing.T) {
	mockFS := NewMockFileSystem()

	// Set HOME environment variable for the test
	oldHome := os.Getenv("HOME")
	os.Setenv("HOME", "/home/testuser")
	defer func() { os.Setenv("HOME", oldHome) }()

	// Create a mock ssh config with the expected include
	includeLine := "Include /home/testuser/.config/sketch/ssh_config"
	initialConfig := fmt.Sprintf("%s\nHost example\n  HostName example.com\n", includeLine)

	// Add the config to the mock filesystem
	sshConfigPath := "/home/testuser/.ssh/config"
	mockFS.Files[sshConfigPath] = []byte(initialConfig)
	stdinReader := bufio.NewReader(strings.NewReader("n\n"))
	// Test the function with our mock
	err := CheckForIncludeWithFS(mockFS, *stdinReader)
	if err != nil {
		t.Fatalf("CheckForInclude failed with proper include: %v", err)
	}

	// Now test with config missing the include
	missingInclude := []byte("Host example\n  HostName example.com\n")
	mockFS.Files[sshConfigPath] = missingInclude

	stdinReader = bufio.NewReader(strings.NewReader("n\n"))
	err = CheckForIncludeWithFS(mockFS, *stdinReader)
	if err == nil {
		t.Errorf("CheckForInclude should have returned an error")
	}
	if !bytes.Equal(mockFS.Files[sshConfigPath], missingInclude) {
		t.Errorf("ssh config should not have been edited")
	}
}

func TestLocalSSHimmerWithErrors(t *testing.T) {
	// Test directory creation failure
	mockFS := NewMockFileSystem()
	mockFS.FailOn["MkdirAll"] = fmt.Errorf("mock mkdir error")
	mockKG := NewMockKeyGenerator(nil, nil, nil, nil)

	// Set HOME environment variable for the test
	oldHome := os.Getenv("HOME")
	os.Setenv("HOME", "/home/testuser")
	defer func() { os.Setenv("HOME", oldHome) }()

	// Try to create sshimmer with failing FS
	_, err := newLocalSSHimmerWithDeps("test-container", "localhost", "2222", mockFS, mockKG)
	if err == nil || !strings.Contains(err.Error(), "mock mkdir error") {
		t.Errorf("Should have failed with mkdir error, got: %v", err)
	}

	// Test key generation failure
	mockFS = NewMockFileSystem()
	mockKG = NewMockKeyGenerator(nil, nil, nil, nil)
	mockKG.FailOn["GenerateKeyPair"] = fmt.Errorf("mock key generation error")

	_, err = newLocalSSHimmerWithDeps("test-container", "localhost", "2222", mockFS, mockKG)
	if err == nil || !strings.Contains(err.Error(), "key generation error") {
		t.Errorf("Should have failed with key generation error, got: %v", err)
	}
}

func TestRealSSHTheatherInit(t *testing.T) {
	// Skip this test as it requires real files for the CA which we don't want to create
	// in a real integration test
	t.Skip("Skipping test that requires real file system access for the CA")
}

// Methods to help with the mocking interface
func (m *MockKeyGenerator) GetCASigner() ssh.Signer {
	return m.caSigner
}

func (m *MockKeyGenerator) IsMock() bool {
	return true
}
