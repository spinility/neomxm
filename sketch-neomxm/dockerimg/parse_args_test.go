package dockerimg

import (
	"reflect"
	"testing"
)

func TestParseDockerArgs(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected []string
	}{
		{
			name:     "empty string",
			input:    "",
			expected: []string{},
		},
		{
			name:     "single argument",
			input:    "--memory=2g",
			expected: []string{"--memory=2g"},
		},
		{
			name:     "multiple arguments",
			input:    "--memory=2g --cpus=2",
			expected: []string{"--memory=2g", "--cpus=2"},
		},
		{
			name:     "arguments with double quotes",
			input:    "--label=\"my label\" --env=FOO=bar",
			expected: []string{"--label=my label", "--env=FOO=bar"},
		},
		{
			name:     "arguments with single quotes",
			input:    "--label='my label' --env=FOO=bar",
			expected: []string{"--label=my label", "--env=FOO=bar"},
		},
		{
			name:     "nested quotes",
			input:    "--env=\"KEY=\\\"quoted value\\\"\"",
			expected: []string{"--env=KEY=\"quoted value\""},
		},
		{
			name:     "mixed quotes",
			input:    "--env=\"mixed 'quotes'\" --label='single \"quotes\"'",
			expected: []string{"--env=mixed 'quotes'", "--label=single \"quotes\""},
		},
		{
			name:     "escaped spaces",
			input:    "--label=my\\ label --env=FOO=bar",
			expected: []string{"--label=my label", "--env=FOO=bar"},
		},
		{
			name:     "multiple spaces",
			input:    "  --memory=2g   --cpus=2  ",
			expected: []string{"--memory=2g", "--cpus=2"},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := parseDockerArgs(tc.input)
			if !reflect.DeepEqual(result, tc.expected) {
				t.Errorf("Expected %v, got %v", tc.expected, result)
			}
		})
	}
}
