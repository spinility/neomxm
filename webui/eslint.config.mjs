import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "*.min.js",
      "coverage/**",
      "playwright/.cache/**",
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        console: "readonly",
        fetch: "readonly",
        EventSource: "readonly",
        CustomEvent: "readonly",
        localStorage: "readonly",
        Notification: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        ResizeObserver: "readonly",
        MutationObserver: "readonly",
        FormData: "readonly",
        Event: "readonly",
        DragEvent: "readonly",
        AbortController: "readonly",
        TextEncoder: "readonly",
        ReadableStream: "readonly",
        atob: "readonly",
        self: "readonly",
      },
    },
    rules: {
      // Allow unused vars with underscore prefix
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Allow explicit any - often needed for interfacing with dynamic data
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
