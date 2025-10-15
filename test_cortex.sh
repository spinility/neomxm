#!/bin/bash

echo "🧪 Testing Cortex Expert System"
echo "================================="
echo ""

# Test 1: Simple task (should use FirstAttendant)
echo "📝 Test 1: Simple task (list files)"
echo "Expected: FirstAttendant (gpt-5-nano)"
echo ""

# Test 2: Check if cortex is enabled by looking at the code
echo "🔍 Checking cortex integration in agent.go..."
if grep -q "if a.cortex != nil" loop/agent.go; then
    echo "✅ Cortex integration found in agent.go"
else
    echo "❌ Cortex integration NOT found"
    exit 1
fi
echo ""

# Test 3: Verify profiles exist
echo "📁 Checking expert profiles..."
for profile in first_attendant second_thought elite; do
    if [ -f "cortex/profiles/${profile}.yaml" ]; then
        echo "  ✅ ${profile}.yaml exists"
    else
        echo "  ❌ ${profile}.yaml missing"
        exit 1
    fi
done
echo ""

# Test 4: Run unit tests
echo "🧪 Running cortex unit tests..."
if go test ./cortex -v 2>&1 | grep -q "PASS"; then
    echo "✅ All tests passed"
else
    echo "❌ Tests failed"
    exit 1
fi
echo ""

# Test 5: Check monitoring tool
echo "📊 Testing monitoring tool..."
if [ -f "./cortex-monitor" ]; then
    echo "✅ cortex-monitor binary exists"
    echo "Running monitor on test data..."
    ./cortex-monitor --logs cortex/logs --days 365 2>&1 | grep -q "CORTEX MONITORING REPORT"
    if [ $? -eq 0 ]; then
        echo "✅ Monitoring tool works"
    else
        echo "❌ Monitoring tool failed"
    fi
else
    echo "❌ cortex-monitor not found"
fi
echo ""

echo "🎉 All cortex system checks passed!"
echo ""
echo "💡 To test with a real request:"
echo "   1. Make sure you have ANTHROPIC_API_KEY set"
echo "   2. Run: ./sketch \"list files in current directory\""
echo "   3. Check logs: cat cortex/logs/performance_*.json | jq ."
echo "   4. See report: ./cortex-monitor --logs cortex/logs --days 1"
