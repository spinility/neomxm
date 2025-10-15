# Dark Mode Implementation Plan

## Overview

This document outlines the plan to implement dark mode for Sketch's web UI using Tailwind CSS's built-in dark mode capabilities.

## Current State Analysis

Sketch's web UI currently uses:

- Tailwind CSS with basic configuration
- Lit web components extending `SketchTailwindElement`
- Components avoid Shadow DOM (`createRenderRoot() { return this; }`)
- Standard Tailwind classes like `bg-white`, `text-gray-600`, `border-gray-200`
- Global CSS approach, making dark mode implementation straightforward

## Implementation Strategy: Class-Based Dark Mode

### Phase 1: Foundation

#### 1. Update Tailwind Configuration

```javascript
// tailwind.config.js
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,html}", "./src/test-theme.html"],
  darkMode: "selector", // Enable selector-based dark mode
  plugins: ["@tailwindcss/container-queries"],
  theme: {
    extend: {
      // Custom colors for better dark mode support
      colors: {
        // Define semantic color tokens
        surface: {
          DEFAULT: "#ffffff",
          dark: "#1f2937",
        },
        "surface-secondary": {
          DEFAULT: "#f9fafb",
          dark: "#374151",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": {
            opacity: "0",
            transform: "translateX(-50%) translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateX(-50%) translateY(0)",
          },
        },
      },
    },
  },
};
```

#### 2. Theme Management Service (Already Implemented)

```typescript
// src/web-components/theme-service.ts
export type ThemeMode = "light" | "dark" | "system";

export class ThemeService {
  private static instance: ThemeService;
  private systemPrefersDark = false;
  private systemMediaQuery: MediaQueryList;

  static getInstance(): ThemeService {
    if (!this.instance) {
      this.instance = new ThemeService();
    }
    return this.instance;
  }

  /**
   * Cycle through theme modes: light -> dark -> system -> light
   */
  toggleTheme(): void {
    const currentTheme = this.getTheme();
    let nextTheme: ThemeMode;

    switch (currentTheme) {
      case "light":
        nextTheme = "dark";
        break;
      case "dark":
        nextTheme = "system";
        break;
      case "system":
        nextTheme = "light";
        break;
      default:
        nextTheme = "light";
    }

    this.setTheme(nextTheme);
  }

  setTheme(theme: ThemeMode): void {
    // Store the theme preference
    if (theme === "system") {
      localStorage.removeItem("theme");
    } else {
      localStorage.setItem("theme", theme);
    }

    // Apply the theme
    this.applyTheme();

    // Dispatch event for components that need to react
    document.dispatchEvent(
      new CustomEvent("theme-changed", {
        detail: {
          theme,
          effectiveTheme: this.getEffectiveTheme(),
          systemPrefersDark: this.systemPrefersDark,
        },
      }),
    );
  }

  getTheme(): ThemeMode {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    return "system";
  }

  getEffectiveTheme(): "light" | "dark" {
    const theme = this.getTheme();
    if (theme === "system") {
      return this.systemPrefersDark ? "dark" : "light";
    }
    return theme;
  }

  initializeTheme(): void {
    this.applyTheme();
  }
}
```

#### 3. Theme Toggle Component (Already Implemented)

```typescript
// src/web-components/sketch-theme-toggle.ts
import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { SketchTailwindElement } from "./sketch-tailwind-element.js";
import { ThemeService, ThemeMode } from "./theme-service.js";

@customElement("sketch-theme-toggle")
export class SketchThemeToggle extends SketchTailwindElement {
  @state() private currentTheme: ThemeMode = "system";
  @state() private effectiveTheme: "light" | "dark" = "light";

  private themeService = ThemeService.getInstance();

  connectedCallback() {
    super.connectedCallback();
    this.updateThemeState();

    // Listen for theme changes from other sources
    document.addEventListener("theme-changed", this.handleThemeChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("theme-changed", this.handleThemeChange);
  }

  private handleThemeChange = (e: CustomEvent) => {
    this.currentTheme = e.detail.theme;
    this.effectiveTheme = e.detail.effectiveTheme;
  };

  private toggleTheme() {
    this.themeService.toggleTheme();
  }

  private getThemeIcon(): string {
    switch (this.currentTheme) {
      case "light":
        return "☀️"; // Sun
      case "dark":
        return "🌙"; // Moon
      case "system":
        return "💻"; // Computer/Laptop
      default:
        return "💻";
    }
  }

  render() {
    return html`
      <button
        @click=${this.toggleTheme}
        class="p-2 rounded-md border border-gray-300 dark:border-gray-600
               bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
               hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
               focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="${this.currentTheme} theme - Click to cycle themes"
        aria-label="Cycle between light, dark, and system theme"
      >
        ${this.getThemeIcon()}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sketch-theme-toggle": SketchThemeToggle;
  }
}
```

#### 4. Initialize Theme in App Shell

Add theme initialization to the main app shell component. This needs to be implemented:

```typescript
// In sketch-app-shell.ts or sketch-app-shell-base.ts
import { ThemeService } from "./theme-service.js";

connectedCallback() {
  super.connectedCallback();
  ThemeService.getInstance().initializeTheme();
}
```

**Note**: This initialization is not yet implemented in the app shell components.

### Phase 2: Component Updates

#### Systematic Component Audit

1. **Identify all components using color classes**

   - Search for `bg-`, `text-`, `border-`, `ring-`, `divide-` classes
   - Document current color usage patterns

2. **Add dark mode variants systematically**

   - Start with core components (app shell, chat input, etc.)
   - Update classes following the pattern:

     ```typescript
     // Before:
     class="bg-white text-gray-900 border-gray-200"

     // After:
     class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700"
     ```

3. **Priority order for component updates:**
   1. `sketch-app-shell` - Main container
   2. `sketch-chat-input` - Primary interaction component
   3. `sketch-container-status` - Status indicators
   4. `sketch-call-status` - Call indicators
   5. Demo components and other secondary components

#### Common Dark Mode Color Mappings

```scss
// Light -> Dark mappings
bg-white -> bg-gray-900
bg-gray-50 -> bg-gray-800
bg-gray-100 -> bg-gray-800
bg-gray-200 -> bg-gray-700

text-gray-900 -> text-gray-100
text-gray-800 -> text-gray-200
text-gray-700 -> text-gray-300
text-gray-600 -> text-gray-400
text-gray-500 -> text-gray-500 (neutral)

border-gray-200 -> border-gray-700
border-gray-300 -> border-gray-600

ring-gray-300 -> ring-gray-600
```

### Phase 3: Polish and Testing

#### 1. Smooth Transitions

- Add `transition-colors` to interactive elements
- Consider adding a global transition class for theme changes

#### 2. Accessibility

- Ensure sufficient contrast ratios in both modes
- Test with screen readers
- Verify focus indicators work in both themes
- Add proper ARIA labels to theme toggle

#### 3. Testing Checklist

- [ ] Theme persists across page reloads
- [ ] System preference detection works
- [ ] All components render correctly in both modes
- [ ] Interactive states (hover, focus, active) work in both themes
- [ ] No flash of unstyled content (FOUC)
- [ ] Works across different screen sizes
- [ ] Performance impact is minimal

## File Structure

```
src/web-components/
├── theme-service.ts              # Theme management service (✅ implemented)
├── sketch-theme-toggle.ts        # Theme toggle component (✅ implemented)
├── sketch-tailwind-element.ts    # Base class (✅ existing)
└── [other components].ts         # Need dark mode variants added
```

## Benefits of This Approach

- **Incremental**: Can be implemented component by component
- **Standard**: Uses Tailwind's built-in dark mode features
- **Performant**: Class-based approach is efficient
- **Maintainable**: Clear separation of concerns with theme service
- **Accessible**: Respects system preferences by default
- **Consistent**: Follows Sketch's existing component patterns

## Current Implementation Status

### ✅ Completed:

- Tailwind configuration with dark mode enabled
- Theme management service with light/dark/system modes
- Theme toggle component with cycling behavior
- Base `SketchTailwindElement` class

### 🚧 Partially Complete:

- Some components may have dark mode classes

### ❌ Still Needed:

- Theme initialization in app shell components
- Systematic audit and update of all components for dark mode
- Testing and accessibility verification

## Next Steps Timeline

1. Phase 1 - Add theme initialization to app shell
2. Phase 2 - Core component updates (systematic audit)
3. Phase 2 - Secondary component updates
4. Phase 3 - Polish, testing, and accessibility

## Notes

- Components extend `SketchTailwindElement` (not `LitElement`) ✅
- No Shadow DOM usage allows for global Tailwind classes ✅
- Theme service uses singleton pattern for consistency ✅
- Theme service supports three modes: light, dark, and system ✅
- Event system allows components to react to theme changes ✅
- LocalStorage preserves user preference across sessions ✅
- Theme toggle cycles through all three modes ✅
