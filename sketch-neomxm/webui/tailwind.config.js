/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,html}", "./src/test-theme.html"],
  darkMode: "selector", // Enable class-based dark mode
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
