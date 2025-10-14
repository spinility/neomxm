# Cortex - NeoMXM's Intelligent Expert System

> **Part of the NeoMXM Project**  
> This Cortex system is the brain of NeoMXM, routing development requests to the optimal AI model for each task.

The Cortex is an intelligent routing system that selects the optimal AI expert for each task based on complexity, cost, and capability. It's fully integrated with NeoMXM's development interface (based on Sketch) to provide intelligent, cost-optimized AI assistance.

## Overview

Instead of using a single model for all tasks, the Cortex maintains a hierarchy of specialized experts:

- **FirstAttendant** (gpt-5-nano): Fast, cost-effective expert for simple tasks
- **SecondThought** (DeepSeek-V3.2-Exp): Mid-tier expert for complex problem decomposition
- **Elite** (claude-sonnet-4-5): Premium expert for the most challenging tasks

## How It Works

### 1. Request Interception

All user requests are intercepted by the Cortex before reaching the LLM:

```go
// In loop/agent.go
if a.cortex != nil {
    request := a.buildLLMRequest(userMessage)
    choice, err := a.cortex.ChooseExpert(ctx, request)
    // Expert's system prompt is prepended to the conversation
}
```

### 2. Expert Evaluation

Each expert evaluates the request and decides:
- **High confidence**: Handle the task directly
- **Low confidence**: Escalate to the next tier

```yaml
# Example from first_attendant.yaml
confidence_threshold: 0.75
strengths:
  - Simple file operations
  - Pattern matching
  - Quick classifications
weaknesses:
  - Multi-step complex reasoning
  - Deep architectural decisions
```

### 3. Complexity Assessment

The system uses heuristics to assess task complexity:

```go
func assessComplexity(content string) float64 {
    // Checks for:
    // - Complex keywords (architecture, refactor, optimize)
    // - Multiple file mentions
    // - Content length
    // Returns score 0.0 - 1.0
}
```

### 4. Intelligent Routing

```
User Request
     |
     v
FirstAttendant (gpt-5-nano)
     |
     +--> confidence >= 0.75 ? Execute
     |
     +--> confidence < 0.75 ? Escalate
              |
              v
         SecondThought (DeepSeek-V3.2-Exp)
              |
              +--> complexity < 0.85 ? Execute
              |
              +--> complexity >= 0.85 ? Escalate
                       |
                       v
                  Elite (claude-sonnet-4-5)
                       |
                       v
                   Always Execute
```

## Expert Profiles

Expert profiles are defined in YAML and loaded at runtime:

```yaml
name: FirstAttendant
model: gpt-5-nano
tier: 1
confidence_threshold: 0.75

system_prompt: |
  You are FirstAttendant, specialized in straightforward tasks.
  
  CONFIDENCE ASSESSMENT:
  Evaluate your confidence (0.0-1.0):
  - HIGH (0.8-1.0): Simple, predictable tasks
  - MEDIUM (0.5-0.79): Requires 3+ steps
  - LOW (<0.5): Complex or ambiguous
  
  If confidence < 0.75, escalate to SecondThought.

strengths:
  - Pattern matching
  - Structured data operations
  - Simple file operations

weaknesses:
  - Multi-step reasoning
  - Architectural decisions
```

## Performance Tracking

The Cortex logs all interactions for analysis:

```json
{
  "timestamp": "2025-10-14T14:30:00Z",
  "expert": "FirstAttendant",
  "model": "gpt-5-nano",
  "duration": "1.2s",
  "tokens_input": 100,
  "tokens_output": 50,
  "success": true,
  "escalated": false
}
```

Logs are stored in `cortex/logs/performance_YYYY-MM-DD.json`.

## Configuration

The Cortex can be configured programmatically:

```go
config := cortex.DefaultConfig()
config.ProfilesDir = "cortex/profiles"
config.LogsDir = "cortex/logs"
config.Enabled = true

cortex, err := cortex.NewCortex(config, llmService)
```

## Cost Optimization

The Cortex automatically optimizes costs:

1. **Simple tasks** → gpt-5-nano (10x cheaper than premium)
2. **Medium complexity** → DeepSeek-V3.2-Exp (5x cheaper than premium)
3. **Elite tasks only** → claude-sonnet-4-5 (premium pricing)

**Example savings:**
- If 60% of tasks are simple: ~70% cost reduction
- If 30% are medium: ~40% cost reduction  
- Only 10% use Elite: full capability when needed

## Self-Improvement

The system tracks performance metrics to identify optimization opportunities:

```go
stats := cortex.GetStatistics()
fmt.Printf("Success rate: %.2f%%\n", stats.SuccessRate*100)
fmt.Printf("Avg duration: %v\n", stats.AvgDuration)
fmt.Printf("Escalation rate: %.2f%%\n", stats.EscalationRate*100)
```

## Future Enhancements

### Meta-Experts (Planned)

1. **PerformanceAnalyzer**: Identifies routing inefficiencies
2. **ExpertRecruiter**: Suggests new specialized experts based on patterns
3. **MemorySummarizer**: Creates compact context summaries

### Example Use Case

If the system detects 100+ database-related tasks:

```json
{
  "recommendation": "Create DatabaseExpert",
  "specialization": "SQL queries, migrations, schema design",
  "model": "gpt-5-nano",
  "expected_savings": "$200/month",
  "confidence": 0.92
}
```

## Testing

Run tests:

```bash
go test ./cortex -v
```

Tests cover:
- Expert initialization
- Selection logic
- Complexity assessment
- Performance logging

## Adding New Experts

1. Create profile YAML in `cortex/profiles/`:

```yaml
name: MyNewExpert
model: gpt-5-nano
tier: 1
system_prompt: |
  You are MyNewExpert, specialized in X.
strengths:
  - Strength 1
  - Strength 2
```

2. Restart the system - new experts are loaded automatically

3. Monitor performance logs to validate effectiveness

## Architecture Benefits

✅ **Cost Optimization**: Use cheaper models when appropriate  
✅ **Speed**: Fast models for simple tasks  
✅ **Quality**: Premium models for complex challenges  
✅ **Scalability**: Add new experts without code changes  
✅ **Learning**: Performance tracking enables continuous improvement  
✅ **Flexibility**: YAML configuration, no hardcoding

## Integration

The Cortex integrates seamlessly with Sketch's existing architecture:

- **Non-invasive**: Can be disabled by setting `config.Enabled = false`
- **Backward compatible**: Falls back to standard flow if cortex unavailable
- **Tool support**: All experts use Sketch's existing tools (bash, patch, etc.)
- **Conversation state**: Maintains conversation history correctly

## License

Same as Sketch-NeoMXM (Apache License 2.0)
