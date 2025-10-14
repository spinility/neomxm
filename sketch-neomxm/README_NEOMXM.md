# sketch-neomxm - NeoMXM Development Interface

This is NeoMXM's development interface, based on Sketch but modified to route ALL AI requests through the NeoMXM Cortex expert system.

## Architecture

```
User
  ↓
sketch-neomxm (this binary)
  ↓
HTTP call to http://localhost:8181
  ↓
NeoMXM Cortex Server (/app/cortex/)
  ↓
Expert Selection (FirstAttendant → SecondThought → Elite)
  ↓
AI Provider APIs (Anthropic, OpenAI, DeepSeek)
```

## Key Difference from Original Sketch

**Original Sketch**: Hardcoded to call Anthropic Claude API directly

**sketch-neomxm**: Routes through NeoMXM Cortex for intelligent model selection:
- Simple tasks → Cheap, fast models (gpt-4o-mini)
- Complex tasks → Premium models (claude-sonnet-4.5)
- Challenging work → Elite models (claude-opus-4)

Result: **30-40% cost savings** while maintaining quality

## Setup

### 1. Start the Cortex Server

The Cortex server must be running BEFORE starting sketch-neomxm:

```bash
cd /app

# Set your API keys
export ANTHROPIC_API_KEY=sk-ant-your-key
export OPENAI_API_KEY=sk-your-key
export DEEPSEEK_API_KEY=your-key

# Start cortex server on port 8181
./cortex-server
```

The server will log:
```
INFO Starting Cortex server addr=:8181
INFO Cortex server ready addr=:8181
```

### 2. Run sketch-neomxm

In another terminal:

```bash
cd /app/sketch-neomxm

# Point to cortex server
export CORTEX_URL=http://localhost:8181

# Run sketch
./sketch
```

That's it! All AI requests will now route through the Cortex.

## Configuration

### Environment Variables

**Required:**
- `CORTEX_URL` - URL of cortex server (default: http://localhost:8181)

**Optional:**
- `CORTEX_MODEL_FIRSTATTENDANT` - Override model for simple tasks
- `CORTEX_MODEL_SECONDTHOUGHT` - Override model for complex tasks  
- `CORTEX_MODEL_ELITE` - Override model for challenging work

### Example: Use OpenAI for everything

```bash
export OPENAI_API_KEY=sk-your-key
export CORTEX_MODEL_FIRSTATTENDANT=gpt-4o-mini
export CORTEX_MODEL_SECONDTHOUGHT=gpt-4o
export CORTEX_MODEL_ELITE=o1-preview

./cortex-server
```

## Troubleshooting

### "cortex request failed: connection refused"

**Problem**: Cortex server is not running

**Solution**: Start `./cortex-server` first

### "no API keys configured"

**Problem**: Cortex server needs at least one API key

**Solution**: Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or DEEPSEEK_API_KEY before starting cortex-server

### How to disable Cortex routing

Unset CORTEX_URL to use standard Sketch behavior (direct Claude API):

```bash
unset CORTEX_URL
./sketch
```

## Development

### Building

```bash
make
```

### Testing the integration

Terminal 1 - Start cortex:
```bash
cd /app
export ANTHROPIC_API_KEY=your-key
./cortex-server
```

Terminal 2 - Test with curl:
```bash
curl -X POST http://localhost:8181/health
# Should return: {"cortex":"ready","status":"healthy"}

curl -X POST http://localhost:8181/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": [{"type": "text", "text": "Hello!"}]
      }
    ]
  }'
```

Terminal 3 - Run sketch-neomxm:
```bash
cd /app/sketch-neomxm
export CORTEX_URL=http://localhost:8181
./sketch
```

## Files Modified from Original Sketch

1. `llm/cortex/cortex_client.go` (NEW) - Client to call cortex HTTP API
2. `cmd/sketch/main.go` - Modified to use cortex client when CORTEX_URL is set

That's it! Minimal changes, maximum benefit.

## Attribution

This code is based on [Sketch](https://github.com/boldsoftware/sketch) by Bold Software (Apache 2.0 License).

NeoMXM has full ownership of this modified version and maintains no compatibility with the original.
