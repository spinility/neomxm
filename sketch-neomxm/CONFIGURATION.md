# NeoMXM Development Interface Configuration

This guide explains how to configure the NeoMXM development interface and its intelligent Cortex expert system.

> **Note**: This is part of the NeoMXM project. Originally based on Sketch's codebase, NeoMXM now has full ownership and is completely independent.

## Quick Start

1. Copy the example configuration:
```bash
cp .env.example .env
```

2. Add at least one API key:
```bash
# Edit .env and add your API keys
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here
DEEPSEEK_API_KEY=your-deepseek-key-here
```

3. Run the NeoMXM development interface:
```bash
./sketch
```

## API Keys

### Required Keys

You must provide **at least one** API key. The system will automatically route to the appropriate provider based on the model name.

| Provider | Environment Variable | Where to Get |
|----------|---------------------|--------------|
| Anthropic (Claude) | `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI (GPT) | `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com/) |
| DeepSeek | `DEEPSEEK_API_KEY` | [platform.deepseek.com](https://platform.deepseek.com/) |

### API Endpoints (Optional)

If you're using custom endpoints or local models:

```bash
ANTHROPIC_API_BASE=https://api.anthropic.com
OPENAI_API_BASE=https://api.openai.com/v1
DEEPSEEK_API_BASE=https://api.deepseek.com
```

## Expert System Configuration

### Model Selection Per Expert

Override the default model for any expert:

```bash
# Format: CORTEX_MODEL_<EXPERT_NAME>=model-name

# Fast triage and simple tasks (default: gpt-5-nano)
CORTEX_MODEL_FIRSTATTENDANT=gpt-4o-mini

# Complex reasoning and planning (default: claude-sonnet-4.5)
CORTEX_MODEL_SECONDTHOUGHT=claude-sonnet-4.5

# Most challenging tasks (default: claude-opus-4)
CORTEX_MODEL_ELITE=claude-opus-4

# Meta-experts (system management)
CORTEX_MODEL_META_EXPERT_RECRUITER=gpt-4o-mini
CORTEX_MODEL_META_MEMORY_SUMMARIZER=gpt-4o-mini
CORTEX_MODEL_META_PERFORMANCE_ANALYZER=deepseek-reasoner
```

### Expert Profiles

Experts are defined in YAML files in `cortex/profiles/`:

- **FirstAttendant** (Tier 1): Fast, cheap, handles simple tasks
- **SecondThought** (Tier 2): Balanced reasoning for complex tasks
- **Elite** (Tier 3): Premium model for most challenging work

Each profile specifies:
- Model to use
- Strengths and weaknesses
- System prompt optimized for that expert
- Max tokens and temperature

You can create custom expert profiles by adding new YAML files to `cortex/profiles/`.

## Performance Tuning

### Confidence Thresholds

Control when experts escalate to higher tiers:

```bash
# FirstAttendant must be 75% confident to handle a task itself
CORTEX_CONFIDENCE_THRESHOLD=0.75

# Tasks with complexity > 85% escalate directly to Elite
CORTEX_ELITE_COMPLEXITY_THRESHOLD=0.85

# Maximum number of escalations before forcing Elite
CORTEX_MAX_ESCALATIONS=2
```

### Cost Optimization

```bash
# Track and report costs
CORTEX_TRACK_COSTS=true

# Alert if a single request exceeds $0.50
CORTEX_COST_ALERT_THRESHOLD=0.50
```

## System Settings

### Enable/Disable Cortex

```bash
# Set to false to bypass NeoMXM cortex (use direct API calls)
CORTEX_ENABLED=true
```

**Note**: When `CORTEX_ENABLED=false`, the interface makes direct API calls to your configured provider. With it enabled (default), all requests route through NeoMXM's intelligent expert system for optimal model selection.

### Directories

```bash
# Where expert profiles are stored
CORTEX_PROFILES_DIR=cortex/profiles

# Where performance logs are saved
CORTEX_LOGS_DIR=cortex/logs
```

### Debugging

```bash
# Log level (debug, info, warn, error)
LOG_LEVEL=info

# Enable detailed cortex decision logging
CORTEX_DEBUG=true

# Analyze but don't execute (testing mode)
CORTEX_DRY_RUN=false
```

## Model Provider Detection

The system automatically detects which provider to use based on model names:

| Model Pattern | Provider | Example |
|--------------|----------|---------|
| `claude-*`, `*-sonnet`, `*-opus` | Anthropic | `claude-sonnet-4.5` |
| `gpt-*`, `o1-*`, `o3-*` | OpenAI | `gpt-5-nano` |
| `deepseek-*` | DeepSeek | `deepseek-reasoner` |

Unknown models default to OpenAI.

## Example Configurations

### Minimal Setup (OpenAI Only)

```bash
OPENAI_API_KEY=sk-your-key-here
CORTEX_ENABLED=true
CORTEX_MODEL_FIRSTATTENDANT=gpt-4o-mini
CORTEX_MODEL_SECONDTHOUGHT=gpt-4o
CORTEX_MODEL_ELITE=o1-preview
```

### Balanced Setup (Multi-Provider)

```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-openai-key-here
DEEPSEEK_API_KEY=your-deepseek-key-here

CORTEX_MODEL_FIRSTATTENDANT=gpt-4o-mini
CORTEX_MODEL_SECONDTHOUGHT=claude-sonnet-4.5
CORTEX_MODEL_ELITE=claude-opus-4
CORTEX_MODEL_META_PERFORMANCE_ANALYZER=deepseek-reasoner

CORTEX_TRACK_COSTS=true
CORTEX_DEBUG=false
```

### Premium Setup (Best Quality)

```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here

CORTEX_MODEL_FIRSTATTENDANT=claude-sonnet-4
CORTEX_MODEL_SECONDTHOUGHT=claude-sonnet-4.5
CORTEX_MODEL_ELITE=claude-opus-4

CORTEX_CONFIDENCE_THRESHOLD=0.85
CORTEX_ELITE_COMPLEXITY_THRESHOLD=0.90
```

## Monitoring Performance

Performance logs are saved to `cortex/logs/` in JSON format:

```bash
# View recent performance
cat cortex/logs/performance_*.json | jq '.[-10:]'

# Calculate average cost per task
cat cortex/logs/performance_*.json | jq 'map(.cost_usd) | add / length'

# Count escalations
cat cortex/logs/performance_*.json | jq 'map(select(.escalated)) | length'
```

## Troubleshooting

### "No API keys configured"

**Problem**: You haven't set any API keys.

**Solution**: Set at least one API key in your `.env` file.

### "ANTHROPIC_API_KEY not set for model: claude-sonnet-4.5"

**Problem**: You configured an expert to use a Claude model but didn't provide the Anthropic API key.

**Solution**: Either:
1. Add `ANTHROPIC_API_KEY=...` to your `.env`
2. Change the model to one from a provider you have credentials for

### High costs

**Problem**: Costs are higher than expected.

**Solution**:
1. Enable cost tracking: `CORTEX_TRACK_COSTS=true`
2. Review logs in `cortex/logs/` to see which models are being used
3. Adjust model selection to use cheaper models for appropriate tasks
4. Lower confidence thresholds to use FirstAttendant more often

### Poor quality results

**Problem**: Results aren't meeting expectations.

**Solution**:
1. Check which expert is handling your tasks in the logs
2. Increase confidence thresholds to escalate to better models
3. Consider using premium models for SecondThought and Elite
4. Review and customize expert profiles in `cortex/profiles/`

## Advanced: Custom Expert Profiles

Create a new expert profile in `cortex/profiles/custom_expert.yaml`:

```yaml
name: CustomExpert
model: gpt-4o
tier: 2
confidence_threshold: 0.8

strengths:
  - Your domain-specific skills
  - Specialized knowledge areas

weaknesses:
  - Areas to avoid

system_prompt: |
  You are CustomExpert, specialized in...
  
  Your expertise includes...
  
  When uncertain, escalate to...

max_tokens: 8192
temperature: 0.3
```

Then configure it:

```bash
CORTEX_MODEL_CUSTOMEXPERT=your-preferred-model
```

The expert will be automatically loaded on startup.

## Architecture Notes

### Integration with NeoMXM

This development interface is **not a standalone tool** - it's a component of the NeoMXM project:

```
NeoMXM/
├── sketch-neomxm/          # This folder (development interface)
│   ├── cortex/             # Expert system integration
│   ├── .env                # Configuration (API keys, model selection)
│   └── sketch              # Binary (NeoMXM-integrated)
├── [other NeoMXM components]
```

When you run `./sketch`, you're running NeoMXM's development interface, not the original Sketch. All AI requests are routed through NeoMXM's Cortex for intelligent model selection.

### About the Name

The binary is named `sketch` because this codebase was originally based on the Sketch project by Bold Software. However:

- **NeoMXM now has full ownership** of this codebase
- **No compatibility** with original Sketch
- **No upstream synchronization** - this is a completely independent project
- **Full control** to modify and optimize for NeoMXM's workflow

This is NeoMXM's development interface, not Sketch.

## Support

For issues or questions about NeoMXM:
- Documentation: [cortex/README.md](cortex/README.md)
- See the main NeoMXM documentation
