# Sketch Testing Itself

NOTE: This is an idea the Sketch developers are developing. We don't know if it works yet!

Sketch can test itself, but it can be a bit tricky, especially when Sketch
depends on Docker:

# Manual Steps

## 1. Create VM and SSH Setup

```bash
# Create a throwaway SSH key
ssh-keygen -t ed25519 -f ~/.ssh/sketch_test_key -P ""

# Create a VM for Sketch to run Docker in
limactl start --name=dockerhost --cpus=$(nproc) --memory=8 --plain --set='.ssh.localPort=2222' template://ubuntu

# Add the key to the VM
ssh -F "/Users/philip/.lima/dockerhost/ssh.config" lima-dockerhost tee -a .ssh/authorized_keys < /Users/philip/.ssh/sketch_test_key.pub

# Create a consistent 'sketch' user for testing
ssh -F "/Users/philip/.lima/dockerhost/ssh.config" lima-dockerhost 'sudo useradd -m -s /bin/bash sketch 2>/dev/null || true && sudo mkdir -p /home/sketch/.ssh && sudo cp ~/.ssh/authorized_keys /home/sketch/.ssh/ && sudo chown -R sketch:sketch /home/sketch/.ssh && sudo usermod -aG sudo sketch && sudo usermod -aG docker sketch'
```

# Steps that Sketch can do for you!

Once you have SSH access to your host (via `ssh -i ~/.ssh/sketch_test_key -p 2222 sketch@host.docker.internal`),
Sketch can do these "need to happen once" steps.

## 2. Install Docker and gvisor on the SSH Host


### Install Docker

```bash
# Update package lists and install Ubuntu's native Docker package
sudo apt update
sudo apt install -y docker.io docker-compose

# Add your user to the docker group
sudo usermod -aG docker sketch
```

### Install gvisor

```bash
# Add gvisor GPG key
curl -fsSL https://gvisor.dev/archive.key | sudo gpg --dearmor -o /usr/share/keyrings/gvisor-archive-keyring.gpg

# Add gvisor repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/gvisor-archive-keyring.gpg] https://storage.googleapis.com/gvisor/releases release main" | sudo tee /etc/apt/sources.list.d/gvisor.list > /dev/null

# Install runsc (gvisor runtime)
sudo apt update
sudo apt install -y runsc
```

### Configure Docker to use gvisor

```bash
# Create Docker daemon configuration
sudo mkdir -p /etc/docker
echo '{
  "runtimes": {
    "runsc": {
      "path": "/usr/bin/runsc"
    }
  }
}' | sudo tee /etc/docker/daemon.json > /dev/null

# Restart Docker to pick up the new configuration
sudo systemctl restart docker
```

### Test the Installation

```bash
# Check that both runtimes are available
docker info | grep -A5 'Runtimes'

# Test default runtime (runc)
docker run --rm hello-world

# Test gvisor runtime (runsc)
docker run --runtime=runsc --rm hello-world
```

Both commands should successfully run the hello-world container. The gvisor version provides additional security isolation.

# What to tell Sketch

* Mount your key with "-mount $HOME/.ssh/sketch_test_key:/sketch_test_key"
* Configure DOCKER_HOST to host.docker.internal:2222 with the key above.
* SSH into the host as user "sketch" (e.g., `ssh -i /sketch_test_key -p 2222 sketch@host.docker.internal`)
* Pass in an ANTHROPIC_API_KEY as well

## Testing Sketch with Docker over SSH

Once everything is set up, configure SSH and test sketch:

```bash
# Configure SSH for Docker remote access
mkdir -p ~/.ssh && chmod 700 ~/.ssh
cp /sketch_test_key ~/.ssh/ && chmod 600 ~/.ssh/sketch_test_key

# Create SSH configuration
cat > ~/.ssh/config << EOF
Host dockerhost
    HostName host.docker.internal
    Port 2222
    User sketch
    IdentityFile ~/.ssh/sketch_test_key
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
EOF

# Test Docker over SSH
DOCKER_HOST=ssh://dockerhost docker info

# Test sketch with one-shot command (requires ANTHROPIC_API_KEY)
DOCKER_HOST=ssh://dockerhost ANTHROPIC_API_KEY="your-key-here" go run ./cmd/sketch -one-shot -prompt "what is the date" -verbose -unsafe -skaband-addr=""
```

The `-skaband-addr=""` flag bypasses authentication for testing, and `-unsafe` allows running without sketch.dev login.
