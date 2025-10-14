package claudetool

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"go/parser"
	"go/token"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"github.com/pkg/diff"
	"sketch.dev/claudetool/editbuf"
	"sketch.dev/claudetool/patchkit"
	"sketch.dev/llm"
)

// PatchCallback defines the signature for patch tool callbacks.
// It runs after the patch tool has executed.
// It receives the patch input and the tool output,
// and returns a new, possibly altered tool output.
type PatchCallback func(input PatchInput, output llm.ToolOut) llm.ToolOut

// PatchTool specifies an llm.Tool for patching files.
// PatchTools are not concurrency-safe.
type PatchTool struct {
	Callback PatchCallback // may be nil
	// Pwd is the working directory for resolving relative paths
	Pwd string
	// Simplified indicates whether to use the simplified input schema.
	// Helpful for weaker models.
	Simplified bool
	// ClipboardEnabled controls whether clipboard functionality is enabled.
	// Ignored if Simplified is true.
	// NB: The actual implementation of the patch tool is unchanged,
	// this flag merely extends the description and input schema to include the clipboard operations.
	ClipboardEnabled bool
	// clipboards stores clipboard name -> text
	clipboards map[string]string
}

// Tool returns an llm.Tool based on p.
func (p *PatchTool) Tool() *llm.Tool {
	description := PatchBaseDescription + PatchUsageNotes
	schema := PatchStandardInputSchema
	switch {
	case p.Simplified:
		schema = PatchStandardSimplifiedSchema
	case p.ClipboardEnabled:
		description = PatchBaseDescription + PatchClipboardDescription + PatchUsageNotes
		schema = PatchClipboardInputSchema
	}
	return &llm.Tool{
		Name:        PatchName,
		Description: strings.TrimSpace(description),
		InputSchema: llm.MustSchema(schema),
		Run:         p.Run,
	}
}

const (
	PatchName            = "patch"
	PatchBaseDescription = `
File modification tool for precise text edits.

Operations:
- replace: Substitute unique text with new content
- append_eof: Append new text at the end of the file
- prepend_bof: Insert new text at the beginning of the file
- overwrite: Replace the entire file with new content (automatically creates the file)
`

	PatchClipboardDescription = `
Clipboard:
- toClipboard: Store oldText to a named clipboard before the operation
- fromClipboard: Use clipboard content as newText (ignores provided newText)
- Clipboards persist across patch calls
- Always use clipboards when moving/copying code (within or across files), even when the moved/copied code will also have edits.
  This prevents transcription errors and distinguishes intentional changes from unintentional changes.

Indentation adjustment:
- reindent applies to whatever text is being inserted
- First strips the specified prefix from each line, then adds the new prefix
- Useful when moving code from one indentation to another

Recipes:
- cut: replace with empty newText and toClipboard
- copy: replace with toClipboard and fromClipboard using the same clipboard name
- paste: replace with fromClipboard
- in-place indentation change: same as copy, but add indentation adjustment
`

	PatchUsageNotes = `
Usage notes:
- All inputs are interpreted literally (no automatic newline or whitespace handling)
- For replace operations, oldText must appear EXACTLY ONCE in the file
`

	// If you modify this, update the termui template for prettier rendering.
	PatchStandardInputSchema = `
{
  "type": "object",
  "required": ["path", "patches"],
  "properties": {
    "path": {
      "type": "string",
      "description": "Path to the file to patch"
    },
    "patches": {
      "type": "array",
      "description": "List of patch requests to apply",
      "items": {
        "type": "object",
        "required": ["operation", "newText"],
        "properties": {
          "operation": {
            "type": "string",
            "enum": ["replace", "append_eof", "prepend_bof", "overwrite"],
            "description": "Type of operation to perform"
          },
          "oldText": {
            "type": "string",
            "description": "Text to locate for the operation (must be unique in file, required for replace)"
          },
          "newText": {
            "type": "string",
            "description": "The new text to use (empty for deletions)"
          }
        }
      }
    }
  }
}
`

	PatchStandardSimplifiedSchema = `{
  "type": "object",
  "required": ["path", "patch"],
  "properties": {
    "path": {
      "type": "string",
      "description": "Path to the file to patch"
    },
    "patch": {
      "type": "object",
      "required": ["operation", "newText"],
      "properties": {
        "operation": {
          "type": "string",
          "enum": ["replace", "append_eof", "prepend_bof", "overwrite"],
          "description": "Type of operation to perform"
        },
        "oldText": {
          "type": "string",
          "description": "Text to locate for the operation (must be unique in file, required for replace)"
        },
        "newText": {
          "type": "string",
          "description": "The new text to use (empty for deletions)"
        }
      }
    }
  }
}`

	PatchClipboardInputSchema = `
{
  "type": "object",
  "required": ["path", "patches"],
  "properties": {
    "path": {
      "type": "string",
      "description": "Path to the file to patch"
    },
    "patches": {
      "type": "array",
      "description": "List of patch requests to apply",
      "items": {
        "type": "object",
        "required": ["operation"],
        "properties": {
          "operation": {
            "type": "string",
            "enum": ["replace", "append_eof", "prepend_bof", "overwrite"],
            "description": "Type of operation to perform"
          },
          "oldText": {
            "type": "string",
            "description": "Text to locate (must be unique in file, required for replace)"
          },
          "newText": {
            "type": "string",
            "description": "The new text to use (empty for deletions, leave empty if fromClipboard is set)"
          },
          "toClipboard": {
            "type": "string",
            "description": "Save oldText to this named clipboard before the operation"
          },
          "fromClipboard": {
            "type": "string",
            "description": "Use content from this clipboard as newText (overrides newText field)"
          },
          "reindent": {
            "type": "object",
            "description": "Modify indentation of the inserted text (newText or fromClipboard) before insertion",
            "properties": {
              "strip": {
                "type": "string",
                "description": "Remove this prefix from each non-empty line before insertion"
              },
              "add": {
                "type": "string",
                "description": "Add this prefix to each non-empty line after stripping"
              }
            }
          }
        }
      }
    }
  }
}
`
)

// TODO: maybe rename PatchRequest to PatchOperation or PatchSpec or PatchPart or just Patch?

// PatchInput represents the input structure for patch operations.
type PatchInput struct {
	Path    string         `json:"path"`
	Patches []PatchRequest `json:"patches"`
}

// PatchInputOne is a simplified version of PatchInput for single patch operations.
type PatchInputOne struct {
	Path    string        `json:"path"`
	Patches *PatchRequest `json:"patches"`
}

// PatchInputOneSingular is PatchInputOne with a better name for the singular case.
type PatchInputOneSingular struct {
	Path  string        `json:"path"`
	Patch *PatchRequest `json:"patch"`
}

type PatchInputOneString struct {
	Path    string `json:"path"`
	Patches string `json:"patches"` // contains Patches as a JSON string 🤦
}

// PatchRequest represents a single patch operation.
type PatchRequest struct {
	Operation     string    `json:"operation"`
	OldText       string    `json:"oldText,omitempty"`
	NewText       string    `json:"newText,omitempty"`
	ToClipboard   string    `json:"toClipboard,omitempty"`
	FromClipboard string    `json:"fromClipboard,omitempty"`
	Reindent      *Reindent `json:"reindent,omitempty"`
}

// Reindent represents indentation adjustment configuration.
type Reindent struct {
	// TODO: it might be nice to make this more flexible,
	// so it can e.g. strip all whitespace,
	// or strip the prefix only on lines where it is present,
	// or strip based on a regex.
	Strip string `json:"strip,omitempty"`
	Add   string `json:"add,omitempty"`
}

// Run implements the patch tool logic.
func (p *PatchTool) Run(ctx context.Context, m json.RawMessage) llm.ToolOut {
	if p.clipboards == nil {
		p.clipboards = make(map[string]string)
	}
	input, err := p.patchParse(m)
	var output llm.ToolOut
	if err != nil {
		output = llm.ErrorToolOut(err)
	} else {
		output = p.patchRun(ctx, &input)
	}
	if p.Callback != nil {
		return p.Callback(input, output)
	}
	return output
}

// patchParse parses the input message into a PatchInput structure.
// It accepts a few different formats, because empirically,
// LLMs sometimes generate slightly different JSON structures,
// and we may as well accept such near misses.
func (p *PatchTool) patchParse(m json.RawMessage) (PatchInput, error) {
	var input PatchInput
	originalErr := json.Unmarshal(m, &input)
	if originalErr == nil && len(input.Patches) > 0 {
		return input, nil
	}
	var inputOne PatchInputOne
	if err := json.Unmarshal(m, &inputOne); err == nil && inputOne.Patches != nil {
		return PatchInput{Path: inputOne.Path, Patches: []PatchRequest{*inputOne.Patches}}, nil
	} else if originalErr == nil {
		originalErr = err
	}
	var inputOneSingular PatchInputOneSingular
	if err := json.Unmarshal(m, &inputOneSingular); err == nil && inputOneSingular.Patch != nil {
		return PatchInput{Path: inputOneSingular.Path, Patches: []PatchRequest{*inputOneSingular.Patch}}, nil
	} else if originalErr == nil {
		originalErr = err
	}
	var inputOneString PatchInputOneString
	if err := json.Unmarshal(m, &inputOneString); err == nil {
		var onePatch PatchRequest
		if err := json.Unmarshal([]byte(inputOneString.Patches), &onePatch); err == nil && onePatch.Operation != "" {
			return PatchInput{Path: inputOneString.Path, Patches: []PatchRequest{onePatch}}, nil
		} else if originalErr == nil {
			originalErr = err
		}
		var patches []PatchRequest
		if err := json.Unmarshal([]byte(inputOneString.Patches), &patches); err == nil {
			return PatchInput{Path: inputOneString.Path, Patches: patches}, nil
		} else if originalErr == nil {
			originalErr = err
		}
	}
	return PatchInput{}, fmt.Errorf("failed to unmarshal patch input: %w", originalErr)
}

// patchRun implements the guts of the patch tool.
// It populates input from m.
func (p *PatchTool) patchRun(ctx context.Context, input *PatchInput) llm.ToolOut {
	path := input.Path
	if !filepath.IsAbs(input.Path) {
		if p.Pwd == "" {
			return llm.ErrorfToolOut("path %q is not absolute and no working directory is set", input.Path)
		}
		path = filepath.Join(p.Pwd, input.Path)
	}
	input.Path = path
	if len(input.Patches) == 0 {
		return llm.ErrorToolOut(fmt.Errorf("no patches provided"))
	}
	// TODO: check whether the file is autogenerated, and if so, require a "force" flag to modify it.

	orig, err := os.ReadFile(input.Path)
	// If the file doesn't exist, we can still apply patches
	// that don't require finding existing text.
	switch {
	case errors.Is(err, os.ErrNotExist):
		for _, patch := range input.Patches {
			switch patch.Operation {
			case "prepend_bof", "append_eof", "overwrite":
			default:
				return llm.ErrorfToolOut("file %q does not exist", input.Path)
			}
		}
	case err != nil:
		return llm.ErrorfToolOut("failed to read file %q: %w", input.Path, err)
	}

	likelyGoFile := strings.HasSuffix(input.Path, ".go")

	autogenerated := likelyGoFile && IsAutogeneratedGoFile(orig)

	origStr := string(orig)
	// Process the patches "simultaneously", minimizing them along the way.
	// Claude generates patches that interact with each other.
	buf := editbuf.NewBuffer(orig)

	// TODO: is it better to apply the patches that apply cleanly and report on the failures?
	// or instead have it be all-or-nothing?
	// For now, it is all-or-nothing.
	// TODO: when the model gets into a "cannot apply patch" cycle of doom, how do we get it unstuck?
	// Also: how do we detect that it's in a cycle?
	var patchErr error

	var clipboardsModified []string
	updateToClipboard := func(patch PatchRequest, spec *patchkit.Spec) {
		if patch.ToClipboard == "" {
			return
		}
		// Update clipboard with the actual matched text
		matchedOldText := origStr[spec.Off : spec.Off+spec.Len]
		p.clipboards[patch.ToClipboard] = matchedOldText
		clipboardsModified = append(clipboardsModified, fmt.Sprintf(`<clipboard_modified name="%s"><message>clipboard contents altered in order to match uniquely</message><new_contents>%q</new_contents></clipboard_modified>`, patch.ToClipboard, matchedOldText))
	}

	for i, patch := range input.Patches {
		// Process toClipboard first, so that copy works
		if patch.ToClipboard != "" {
			if patch.Operation != "replace" {
				return llm.ErrorfToolOut("toClipboard (%s): can only be used with replace operation", patch.ToClipboard)
			}
			if patch.OldText == "" {
				return llm.ErrorfToolOut("toClipboard (%s): oldText cannot be empty when using toClipboard", patch.ToClipboard)
			}
			p.clipboards[patch.ToClipboard] = patch.OldText
		}

		// Handle fromClipboard
		newText := patch.NewText
		if patch.FromClipboard != "" {
			clipboardText, ok := p.clipboards[patch.FromClipboard]
			if !ok {
				return llm.ErrorfToolOut("fromClipboard (%s): no clipboard with that name", patch.FromClipboard)
			}
			newText = clipboardText
		}

		// Apply indentation adjustment if specified
		if patch.Reindent != nil {
			reindentedText, err := reindent(newText, patch.Reindent)
			if err != nil {
				return llm.ErrorfToolOut("reindent(%q -> %q): %w", patch.Reindent.Strip, patch.Reindent.Add, err)
			}
			newText = reindentedText
		}

		switch patch.Operation {
		case "prepend_bof":
			buf.Insert(0, newText)
		case "append_eof":
			buf.Insert(len(orig), newText)
		case "overwrite":
			buf.Replace(0, len(orig), newText)
		case "replace":
			if patch.OldText == "" {
				return llm.ErrorfToolOut("patch %d: oldText cannot be empty for %s operation", i, patch.Operation)
			}

			// Attempt to apply the patch.
			spec, count := patchkit.Unique(origStr, patch.OldText, newText)
			switch count {
			case 0:
				// no matches, maybe recoverable, continued below
			case 1:
				// exact match, apply
				slog.DebugContext(ctx, "patch_applied", "method", "unique")
				spec.ApplyToEditBuf(buf)
				continue
			case 2:
				// multiple matches
				patchErr = errors.Join(patchErr, fmt.Errorf("old text not unique:\n%s", patch.OldText))
				continue
			default:
				slog.ErrorContext(ctx, "unique returned unexpected count", "count", count)
				patchErr = errors.Join(patchErr, fmt.Errorf("internal error"))
				continue
			}

			// The following recovery mechanisms are heuristic.
			// They aren't perfect, but they appear safe,
			// and the cases they cover appear with some regularity.

			// Try adjusting the whitespace prefix.
			spec, ok := patchkit.UniqueDedent(origStr, patch.OldText, newText)
			if ok {
				slog.DebugContext(ctx, "patch_applied", "method", "unique_dedent")
				spec.ApplyToEditBuf(buf)
				updateToClipboard(patch, spec)
				continue
			}

			// Try ignoring leading/trailing whitespace in a semantically safe way.
			spec, ok = patchkit.UniqueInValidGo(origStr, patch.OldText, newText)
			if ok {
				slog.DebugContext(ctx, "patch_applied", "method", "unique_in_valid_go")
				spec.ApplyToEditBuf(buf)
				updateToClipboard(patch, spec)
				continue
			}

			// Try ignoring semantically insignificant whitespace.
			spec, ok = patchkit.UniqueGoTokens(origStr, patch.OldText, newText)
			if ok {
				slog.DebugContext(ctx, "patch_applied", "method", "unique_go_tokens")
				spec.ApplyToEditBuf(buf)
				updateToClipboard(patch, spec)
				continue
			}

			// Try trimming the first line of the patch, if we can do so safely.
			spec, ok = patchkit.UniqueTrim(origStr, patch.OldText, newText)
			if ok {
				slog.DebugContext(ctx, "patch_applied", "method", "unique_trim")
				spec.ApplyToEditBuf(buf)
				// Do NOT call updateToClipboard here,
				// because the trimmed text may vary significantly from the original text.
				continue
			}

			// No dice.
			patchErr = errors.Join(patchErr, fmt.Errorf("old text not found:\n%s", patch.OldText))
			continue
		default:
			return llm.ErrorfToolOut("unrecognized operation %q", patch.Operation)
		}
	}

	if patchErr != nil {
		errorMsg := patchErr.Error()
		for _, msg := range clipboardsModified {
			errorMsg += "\n" + msg
		}
		return llm.ErrorToolOut(fmt.Errorf("%s", errorMsg))
	}

	patched, err := buf.Bytes()
	if err != nil {
		return llm.ErrorToolOut(err)
	}
	if err := os.MkdirAll(filepath.Dir(input.Path), 0o700); err != nil {
		return llm.ErrorfToolOut("failed to create directory %q: %w", filepath.Dir(input.Path), err)
	}
	if err := os.WriteFile(input.Path, patched, 0o600); err != nil {
		return llm.ErrorfToolOut("failed to write patched contents to file %q: %w", input.Path, err)
	}

	response := new(strings.Builder)
	fmt.Fprintf(response, "<patches_applied>all</patches_applied>\n")
	for _, msg := range clipboardsModified {
		fmt.Fprintln(response, msg)
	}

	if autogenerated {
		fmt.Fprintf(response, "<warning>%q appears to be autogenerated. Patches were applied anyway.</warning>\n", input.Path)
	}

	diff := generateUnifiedDiff(input.Path, string(orig), string(patched))

	// TODO: maybe report the patch result to the model, i.e. some/all of the new code after the patches and formatting.
	return llm.ToolOut{
		LLMContent: llm.TextContent(response.String()),
		Display:    diff,
	}
}

// IsAutogeneratedGoFile reports whether a Go file has markers indicating it was autogenerated.
func IsAutogeneratedGoFile(buf []byte) bool {
	for _, sig := range autogeneratedSignals {
		if bytes.Contains(buf, []byte(sig)) {
			return true
		}
	}

	// https://pkg.go.dev/cmd/go#hdr-Generate_Go_files_by_processing_source
	// "This line must appear before the first non-comment, non-blank text in the file."
	// Approximate that by looking for it at the top of the file, before the last of the imports.
	// (Sometimes people put it after the package declaration, because of course they do.)
	// At least in the imports region we know it's not part of their actual code;
	// we don't want to ignore the generator (which also includes these strings!),
	// just the generated code.
	fset := token.NewFileSet()
	f, err := parser.ParseFile(fset, "x.go", buf, parser.ImportsOnly|parser.ParseComments)
	if err == nil {
		for _, cg := range f.Comments {
			t := strings.ToLower(cg.Text())
			for _, sig := range autogeneratedHeaderSignals {
				if strings.Contains(t, sig) {
					return true
				}
			}
		}
	}

	return false
}

// autogeneratedSignals are signals that a file is autogenerated, when present anywhere in the file.
var autogeneratedSignals = [][]byte{
	[]byte("\nfunc bindataRead("), // pre-embed bindata packed file
}

// autogeneratedHeaderSignals are signals that a file is autogenerated, when present at the top of the file.
var autogeneratedHeaderSignals = []string{
	// canonical would be `(?m)^// Code generated .* DO NOT EDIT\.$`
	// but people screw it up, a lot, so be more lenient
	strings.ToLower("generate"),
	strings.ToLower("DO NOT EDIT"),
	strings.ToLower("export by"),
}

func generateUnifiedDiff(filePath, original, patched string) string {
	buf := new(strings.Builder)
	err := diff.Text(filePath, filePath, original, patched, buf)
	if err != nil {
		return fmt.Sprintf("(diff generation failed: %v)\n", err)
	}
	return buf.String()
}

// reindent applies indentation adjustments to text.
func reindent(text string, adj *Reindent) (string, error) {
	if adj == nil {
		return text, nil
	}

	lines := strings.Split(text, "\n")

	for i, line := range lines {
		if line == "" {
			continue
		}
		var ok bool
		lines[i], ok = strings.CutPrefix(line, adj.Strip)
		if !ok {
			return "", fmt.Errorf("strip precondition failed: line %q does not start with %q", line, adj.Strip)
		}
	}

	for i, line := range lines {
		if line == "" {
			continue
		}
		lines[i] = adj.Add + line
	}

	return strings.Join(lines, "\n"), nil
}
