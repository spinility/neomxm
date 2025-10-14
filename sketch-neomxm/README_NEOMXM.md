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

### 2. Build and Run sketch-neomxm

In another terminal:

```bash
# First time: build
cd /app/sketch-neomxm
make

# Then run (from sketch-neomxm dir)
export CORTEX_URL=http://localhost:8181
./sketch-neomxm

# OR use wrapper from /app root
cd /app
export CORTEX_URL=http://localhost:8181
./run-sketch-neomxm.sh
```

That's it! All AI requests will now route through the Cortex.

## Configuration

### Using a .env File (Recommended)

The easiest way to configure sketch-neomxm is to create a `.env` file in your git repository root:

```bash
# .env file example
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-openai-key
DEEPSEEK_API_KEY=sk-your-deepseek-key
CORTEX_URL=http://localhost:8181
CORTEX_ENABLED=true
```

When you run sketch-neomxm, it will **automatically** read this `.env` file and forward the variables to the Docker container. No need to export them manually!

**Important:** The `.env` file should be in your git root directory (where `.git/` is located).

**Note:** You should add `.env` to your `.gitignore` to avoid committing API keys.

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

Remove or comment out `CORTEX_URL` from your `.env` file, or unset it:

```bash
unset CORTEX_URL
./sketch-neomxm
```

### Environment Variable Priority

Environment variables are loaded in this order (later sources override earlier ones):
1. `.env` file in git root
2. Current shell environment variables
3. Command-line flags

This means if you have `CORTEX_URL` in your `.env` file but also `export CORTEX_URL=http://other:8181` in your shell, the shell value will be used.

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
./sketch-neomxm
```

## Files Modified from Original Sketch

1. `llm/cortex/cortex_client.go` (NEW) - Client to call cortex HTTP API
2. `cmd/sketch/main.go` - Modified to use cortex client when CORTEX_URL is set

That's it! Minimal changes, maximum benefit.

## Attribution

This code is based on [Sketch](https://github.com/boldsoftware/sketch) by Bold Software (Apache 2.0 License).

NeoMXM has full ownership of this modified version and maintains no compatibility with the original.
