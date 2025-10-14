# Modern Component Architecture: SketchTailwindElement

**IMPORTANT: New component architecture standards for all Sketch web components**

## New Component Standard (Use This)

All new Sketch web components should:

1. **Inherit from `SketchTailwindElement`** instead of `LitElement`
2. **Use Tailwind CSS classes** for styling instead of CSS-in-JS
3. **Use property-based composition** instead of slot-based composition
4. **Avoid Shadow DOM** whenever possible

### Example of Modern Component:

```typescript
import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { SketchTailwindElement } from "./sketch-tailwind-element";
import "./sketch-tool-card-base";

@customElement("sketch-tool-card-example")
export class SketchToolCardExample extends SketchTailwindElement {
  @property() toolCall: ToolCall;
  @property() open: boolean;

  render() {
    const summaryContent = html`<span class="font-mono text-sm text-gray-700">
      ${this.toolCall?.name}
    </span>`;

    const inputContent = html`<div class="p-2 bg-gray-100 rounded">
      <pre class="whitespace-pre-wrap break-words">${this.toolCall?.input}</pre>
    </div>`;

    return html`<sketch-tool-card-base
      .open=${this.open}
      .toolCall=${this.toolCall}
      .summaryContent=${summaryContent}
      .inputContent=${inputContent}
    ></sketch-tool-card-base>`;
  }
}
```

### Key Differences from Legacy Components:

- **Extends SketchTailwindElement** (not LitElement)
- **Uses sketch-tool-card-base** with property binding (not slots)
- **Tailwind classes** like `font-mono text-sm text-gray-700` (not CSS-in-JS)
- **No static styles** or Shadow DOM
- **Property-based composition** (`.summaryContent=${html\`...\`}`)

## Preview, debug and iterate on your component changes with the demo server

### Setup (first time):

1. Navigate to the webui directory: `cd ./sketch/webui`
2. Install dependencies: `npm install`
3. If you encounter rollup/architecture errors, remove dependencies and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Running the demo server:

- Use the `npm run demo` command to start the demo server. It will render your component changes, populated with fake example data.
- The server runs at http://localhost:5173/src/web-components/demo/demo.html
- If you need to write or update the demo definition for an element, do so in demo files like ./demo/some-component-name.demo.ts
- If you need to add new example data objects for demoing components, do so in ./demo/fixtures

# API URLs Must Be Relative

When making fetch requests to backend APIs in Sketch, all URLs **must be relative** without leading slashes. The base URL for Sketch varies depending on how it is deployed and run:

```javascript
// CORRECT - use relative paths without leading slash
const response = await fetch(`git/rawdiff?commit=${commit}`);
const data = await fetch(`git/show?hash=${hash}`);

// INCORRECT - do not use absolute paths with leading slash
const response = await fetch(`/git/rawdiff?commit=${commit}`); // WRONG!
const data = await fetch(`/git/show?hash=${hash}`); // WRONG!
```

The reason for this requirement is that Sketch may be deployed:

1. At the root path of a domain
2. In a subdirectory
3. Behind a proxy with a path prefix
4. In different environments (dev, production)

Using relative paths ensures that requests are correctly routed regardless of the deployment configuration. The browser will resolve the URLs relative to the current page location.
