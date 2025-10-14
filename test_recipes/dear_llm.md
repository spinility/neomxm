# Test Recipes Docker and SSH Guidelines

## SSH Host Access
- The SSH host is accessible as user "sketch" at `host.docker.internal:2222`
- Use the provided SSH key at `/sketch_test_key`
- Connection command: `ssh -i /sketch_test_key -p 2222 sketch@host.docker.internal`

## Docker and gvisor Installation
- The SSH host runs Ubuntu and requires Docker and gvisor to be installed manually
- Use Ubuntu's native `docker.io` package instead of Docker's official repository
- Install with: `sudo apt install -y docker.io docker-compose`
- Follow the instructions in README.md for complete installation steps
- Both `runc` (default) and `runsc` (gvisor) runtimes should be available
- Test with: `docker run --runtime=runsc --rm hello-world`

## Sketch Testing with Docker over SSH
- Configure SSH config for easy access: `Host dockerhost` pointing to the VM
- Use `DOCKER_HOST=ssh://dockerhost` for remote Docker access
- For one-shot testing: `DOCKER_HOST=ssh://dockerhost ANTHROPIC_API_KEY="key" go run ./cmd/sketch -one-shot -prompt "prompt" -verbose -unsafe -skaband-addr=""`
- The `-skaband-addr=""` flag bypasses sketch.dev authentication for testing

## Container Networking Issues
- When running Docker inside containers, expect networking and iptables permission issues
- Use `--iptables=false --bridge=none` flags for dockerd in constrained environments
- Consider using host networking or simplified setups for testing

## Package Installation
- Always use longer timeouts for package installations (2-5 minutes)
- Ubuntu package installs may show debconf warnings in non-interactive environments - this is normal
- Install SSH client with: `apt install -y openssh-client`
