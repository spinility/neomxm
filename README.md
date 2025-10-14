<div align="center">

# NeoMXM Development Interface

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

**Intelligent agentic coding powered by NeoMXM's multi-expert cortex system**

> **Originally based on [Sketch](https://github.com/boldsoftware/sketch) by [Bold Software](https://github.com/boldsoftware)**  
> Licensed under Apache License 2.0. NeoMXM has taken full ownership and control of this codebase.  
> This is now a completely independent project with no compatibility or connection to the original.

</div>

## 🚀 Overview

This is the **development interface** for NeoMXM - an intelligent agentic coding system that uses a **Cortex** expert system to optimize AI model selection for every task.

### Part of the NeoMXM Project

This folder contains the source code from Sketch, adapted to work as NeoMXM's primary development interface. It communicates with NeoMXM's cortex system to:

- 📊 **Optimize Costs**: Route simple tasks to efficient models (gpt-4o-mini)
- ⚡ **Maximize Speed**: Fast execution on routine work  
- 🎯 **Ensure Quality**: Premium models (Claude Sonnet 4.5) for complex challenges
- 📈 **Learn & Improve**: Track performance and continuously optimize
- 🔧 **Stay Flexible**: Configure expert profiles for your specific needs

### How It Works

Instead of calling Claude's API directly, this interface routes requests through **NeoMXM's Cortex**:

```
Your Request → Development Interface → Cortex Expert System → Best Model for Task
```

The Cortex intelligently chooses between:
- **FirstAttendant** (Tier 1): Fast, cheap models for simple tasks
- **SecondThought** (Tier 2): Balanced models for complex reasoning
- **Elite** (Tier 3): Premium models for the most challenging work

See [cortex/README.md](cortex/README.md) for detailed Cortex documentation.

### Core Features

- Terminal and web UI interfaces
- Docker containerization for clean environments
- Git integration for seamless workflow
- Tool use and code execution
- Multi-provider AI support (Anthropic, OpenAI, DeepSeek)
- Intelligent cost optimization

<img src="https://storage.googleapis.com/sketch-assets/screenshot.jpg" alt="Sketch Screenshot" width="800"/>

## 📋 Quick Start

### Prerequisites

1. **Docker**: Required for containerization
   - MacOS: `brew install colima` or [OrbStack](https://orbstack.dev/) or [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - Linux: `apt install docker.io` (or equivalent for your distro)
   - WSL2: Install Docker Desktop for Windows

2. **API Keys**: At least one API key is required
   - **Anthropic** (Claude models): Get your key from [console.anthropic.com](https://console.anthropic.com/)
   - **OpenAI** (GPT models): Get your key from [platform.openai.com](https://platform.openai.com/)
   - **DeepSeek** (DeepSeek models): Get your key from [platform.deepseek.com](https://platform.deepseek.com/)

### Installation

#### Build from source

This is part of the NeoMXM project. Build from the sketch-neomxm directory:

```sh
cd sketch-neomxm
make
```

### Configuration

1. **Copy the example configuration:**

```sh
cp .env.example .env
```

2. **Edit `.env` and add your API keys:**

```bash
# Required: At least one API key
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here
DEEPSEEK_API_KEY=your-deepseek-key-here

# Optional: Configure model selection per expert
CORTEX_MODEL_FIRSTATTENDANT=gpt-5-nano        # Fast, cheap tasks
CORTEX_MODEL_SECONDTHOUGHT=claude-sonnet-4.5  # Complex reasoning
CORTEX_MODEL_ELITE=claude-opus-4              # Most challenging work

# Optional: Cost and performance tuning
CORTEX_TRACK_COSTS=true
CORTEX_COST_ALERT_THRESHOLD=0.50
CORTEX_DEBUG=false
```

3. **Run NeoMXM Development Interface:**

```sh
./sketch
```

The interface will:
- Load your configuration from `.env`
- Connect to NeoMXM's Cortex expert system
- Route all requests through intelligent model selection
- Track costs and performance
- Open your browser to the web UI

---

**Note**: The original Sketch project that this was based on can be found at [github.com/boldsoftware/sketch](https://github.com/boldsoftware/sketch).  
NeoMXM is now a completely separate, independent project.



## 🔧 Requirements

NeoMXM development interface runs on MacOS and Linux. It uses Docker for containers.

| Platform | Installation                                                               |
| -------- | -------------------------------------------------------------------------- |
| MacOS    | `brew install colima` (or [OrbStack](https://orbstack.dev/) or [Docker Desktop](https://www.docker.com/products/docker-desktop/))                         |
| Linux    | `apt install docker.io` (or equivalent for your distro)                    |
| WSL2     | Install Docker Desktop for Windows (docker entirely inside WSL2 is tricky) |

**Note**: NeoMXM does not use sketch.dev or any external services. All configuration is local via `.env` file.

## 🤝 Community & Feedback

This is the development interface for NeoMXM. For the original Sketch project, see [github.com/boldsoftware/sketch](https://github.com/boldsoftware/sketch).

## 📖 User Guide

### Getting Started

Start NeoMXM by running `./sketch` in a Git repository. It will open your browser to the chat interface, or you can use the CLI interface. Use `-open=false` for CLI-only mode.

Ask NeoMXM about your codebase or to implement a feature. The Cortex system will intelligently route your request to the most appropriate AI model.

### How NeoMXM Works

When you start NeoMXM, it:

1. Creates a Dockerfile
2. Builds it
3. Copies your repository into it
4. Starts a Docker container with the "inside" Sketch running

This design lets you **run multiple sketches in parallel** since they each have their own sandbox. It also lets Sketch work without worry: it can trash its own container, but it can't trash your machine.

Sketch's agentic loop uses tool calls (mostly shell commands, but also a handful of other important tools) to allow the LLM to interact with your codebase.

### Getting Your Git Changes Out

<!-- TODO: git picture -->

Sketch is trained to make Git commits. When those happen, they are
automatically pushed to the git repository where you started sketch with branch
names `sketch/*`.

**Finding Sketch branches:**

```sh
git branch -a --sort=creatordate | grep sketch/ | tail
```

The UI keeps track of the latest branch it pushed and displays it prominently. You can use standard Git workflows to pull those branches into your workspace:

```sh
git cherry-pick $(git merge-base origin/main sketch/foo)
```

or merge the branch

```sh
git merge sketch/foo
```

or reset to the branch

```sh
git reset --hard sketch/foo
```

Ie use the same workflows you would if you were pulling in a friend's Pull Request.

**Advanced:** You can ask Sketch to `git fetch sketch-host` and rebase onto another commit. This will also fetch where you started Sketch, and we do a bit of "git fetch refspec configuration" to make `origin/main` work as a git reference.

Don't be afraid of asking Sketch to help you rebase, merge/squash commits, rewrite commit messages, and so forth; it's good at it!

### Reviewing Diffs

The diff view shows you changes since Sketch started. Leaving comments on lines
adds them to the chat box, and, when you hit Send (at the bottom of the page), Sketch goes to work addressing your
comments.

### Connecting to Sketch's Container

You can interact directly with the container in three ways:

1. **Web UI Terminal**: Use the "Terminal" tab in the UI
2. **SSH**: Look at the startup logs or click the information icon to see a command like `ssh sketch-ilik-eske-tcha-lott`.
   We have automatically configured your SSH configuration to make these special hostnames work.
3. **Visual Studio Code**: Look for a command line or magic link behind the information icon, or when Sketch starts up. This starts a new VSCode session "remoted into" the container. You
   can edit the code, use the terminal, review diffs, and so forth.

Using SSH (and/or VSCode) allows you to forward ports from the container to your machine. For example, if you want to start your development webserver, you can do something like this:

```sh
# Forward container port 8888 to local port 8000
ssh -L8000:localhost:8888 sketch-ilik-epor-tfor-ward go run ./cmd/server
```

This makes `http://localhost:8000/` on your machine point to `localhost:8888` inside the container.

### Using Browser Tools

You can ask Sketch to browse a web page and take screenshots. There are tools
both for taking screenshots and "reading images", the latter of which sends the
image to the LLM. This functionality is handy if you're working on a web page and
want to see what the in-progress change looks like.

## ❓ FAQ

### "No space left on device"

Docker images, containers, and so forth tend to pile up. Ask Docker to prune unused images and containers:

```sh
docker system prune -a
```

## 🛠️ Development

[![Go Reference](https://pkg.go.dev/badge/sketch.dev.svg)](https://pkg.go.dev/sketch.dev)

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## 📄 Open Source

Sketch is open source.
It is right here in this repository!
Have a look around and mod away.

If you want to run Sketch entirely without the sketch.dev service, you can set the flag `-skaband-addr=""` and then provide an `ANTHROPIC_API_KEY` environment variable. (More LLM services coming soon!)
