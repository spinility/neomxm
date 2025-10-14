# NeoMXM Project

This is the root of the NeoMXM project - an intelligent AI system with multi-expert Cortex routing.

## Project Structure

```
NeoMXM/
├── sketch-neomxm/           # Development interface (based on Sketch)
│   ├── cortex/              # Cortex expert system integration
│   ├── .env.example         # Configuration template
│   ├── CONFIGURATION.md     # Setup guide
│   └── sketch               # Binary (after build)
├── [other NeoMXM components]
```

## What is sketch-neomxm?

**sketch-neomxm** is NeoMXM's development interface - an agentic coding tool that routes all AI requests through the Cortex expert system for intelligent model selection.

### Originally Based On Sketch

This component is based on the open-source [Sketch project](https://github.com/boldsoftware/sketch) by Bold Software (Apache 2.0 License). 

**Important Notes:**
- ✅ NeoMXM has full ownership of this code
- ✅ No compatibility maintained with original Sketch
- ✅ Completely independent - free to modify as needed
- ✅ Attribution maintained as required by Apache 2.0 license

### Key Differences from Original Sketch

1. **Cortex Integration**: All requests route through NeoMXM's intelligent expert system
2. **Multi-Provider Support**: Automatic routing to Anthropic, OpenAI, DeepSeek based on model
3. **Cost Optimization**: Intelligent model selection to minimize costs while maintaining quality
4. **Configuration System**: Environment-based configuration for API keys and model selection

## Getting Started

### Option 1: Using the startup script (Recommended)

```bash
# Configure your API keys
cp .env.example .env
# Edit .env with your API keys (nano .env or vim .env)

# Start Cortex + sketch-neomxm (auto-builds if needed)
./start-neomxm.sh
```

**Alternative**: You can also export API keys directly instead of using .env:
```bash
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
export DEEPSEEK_API_KEY="your-key"
./start-neomxm.sh
```

The script will:
- Build the binary if it doesn't exist (`make` is automatically run)
- Start the Cortex server on port 8181
- Launch sketch-neomxm connected to Cortex

### Option 2: Manual build and run

```bash
cd sketch-neomxm
cp .env.example .env
# Edit .env with your API keys
make  # Binary is not committed to git, you must build it
./sketch-neomxm
```

**Note**: The `sketch-neomxm` binary is not included in git (135+ MB). You must run `make` after cloning or pulling changes.

See [sketch-neomxm/CONFIGURATION.md](sketch-neomxm/CONFIGURATION.md) for detailed setup.

## NeoMXM Cortex

The Cortex is the brain of NeoMXM - an intelligent routing system that selects the optimal AI expert for each task:

- **FirstAttendant** (gpt-4o-mini): Fast triage for simple tasks
- **SecondThought** (claude-sonnet-4.5): Complex reasoning and planning
- **Elite** (claude-opus-4): Most challenging work

Benefits:
- 💰 30-40% cost savings vs single premium model
- ⚡ Faster execution on routine tasks
- 🎯 Premium quality on complex tasks
- 📊 Performance tracking and continuous optimization

See [sketch-neomxm/cortex/README.md](sketch-neomxm/cortex/README.md) for technical details.

## License

- NeoMXM project: [Your License]
- sketch-neomxm component: Apache 2.0 (inherited from Sketch)

See [sketch-neomxm/LICENSE](sketch-neomxm/LICENSE) for the Apache 2.0 license text.

## Attribution

The sketch-neomxm component is based on [Sketch](https://github.com/boldsoftware/sketch) by [Bold Software](https://github.com/boldsoftware), licensed under Apache License 2.0. We are grateful for their open-source contribution.
