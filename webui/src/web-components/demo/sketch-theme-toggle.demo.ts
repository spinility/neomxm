/**
 * Demo module for theme-toggle component
 */

import { DemoModule } from "./demo-framework/types";
import { demoUtils } from "./demo-fixtures/index";
import { ThemeService } from "../theme-service.js";

const demo: DemoModule = {
  title: "Theme Toggle Demo",
  description:
    "Three-way theme toggle: light mode, dark mode, and system preference",
  imports: ["../sketch-theme-toggle"],
  styles: ["/dist/tailwind.css"],

  setup: async (container: HTMLElement) => {
    // Initialize the theme service
    const themeService = ThemeService.getInstance();
    themeService.initializeTheme();
    // Create demo sections
    const basicSection = demoUtils.createDemoSection(
      "Three-Way Theme Toggle",
      "Click the toggle button to cycle through: light → dark → system → light",
    );

    const toggleContainer = document.createElement("div");
    toggleContainer.className =
      "flex items-center gap-4 p-4 bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700";
    toggleContainer.innerHTML = `
      <sketch-theme-toggle></sketch-theme-toggle>
      <div class="text-sm text-gray-600 dark:text-neutral-400">
        <div class="font-medium mb-1">Theme modes:</div>
        <div class="space-y-1">
          <div>☀️ Light mode - Always light theme</div>
          <div>🌙 Dark mode - Always dark theme</div>
          <div>💻 System theme - Follows OS preference</div>
        </div>
      </div>
    `;
    basicSection.appendChild(toggleContainer);

    // Visual test elements section
    const visualSection = demoUtils.createDemoSection(
      "Visual Test Elements",
      "Elements that demonstrate the theme switching behavior",
    );

    const visualContainer = document.createElement("div");
    visualContainer.className = "space-y-4";
    visualContainer.innerHTML = `
      <div class="bg-white dark:bg-neutral-800 p-4 rounded border border-gray-200 dark:border-neutral-600">
        <h4 class="font-medium text-gray-900 dark:text-neutral-100 mb-2">Test Card</h4>
        <p class="text-gray-600 dark:text-neutral-300">
          This card should switch between light and dark styling when you toggle the theme.
        </p>
      </div>
      
      <div class="flex gap-3">
        <button class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors">
          Primary Button
        </button>
        <button class="px-4 py-2 bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300 dark:hover:bg-neutral-600 text-gray-700 dark:text-neutral-200 rounded transition-colors">
          Secondary Button
        </button>
      </div>
      
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-white dark:bg-neutral-800 p-3 rounded border border-gray-200 dark:border-neutral-600">
          <div class="text-sm font-medium text-gray-900 dark:text-neutral-100">Light Background</div>
          <div class="text-xs text-gray-500 dark:text-neutral-400">Should be dark in dark mode</div>
        </div>
        <div class="bg-gray-100 dark:bg-neutral-800 p-3 rounded border border-gray-200 dark:border-neutral-600">
          <div class="text-sm font-medium text-gray-900 dark:text-neutral-100">Gray Background</div>
          <div class="text-xs text-gray-500 dark:text-neutral-400">Should be darker in dark mode</div>
        </div>
        <div class="bg-gray-200 dark:bg-neutral-700 p-3 rounded border border-gray-200 dark:border-neutral-600">
          <div class="text-sm font-medium text-gray-900 dark:text-neutral-100">Darker Background</div>
          <div class="text-xs text-gray-500 dark:text-neutral-400">Should be lighter in dark mode</div>
        </div>
      </div>
    `;
    visualSection.appendChild(visualContainer);

    // Features section
    const featuresSection = demoUtils.createDemoSection(
      "Features",
      "Key capabilities of the theme toggle component",
    );

    const featuresContainer = document.createElement("div");
    featuresContainer.className =
      "bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800";
    featuresContainer.innerHTML = `
      <ul class="space-y-2 text-sm text-blue-800 dark:text-blue-200">
        <li>• Three-way toggle: light → dark → system → light</li>
        <li>• Icons: ☀️ (light), 🌙 (dark), 💻 (system)</li>
        <li>• System mode follows OS dark/light preference</li>
        <li>• Theme preference persists across page reloads</li>
        <li>• Emits theme-changed events for component coordination</li>
        <li>• Smooth transitions between themes</li>
        <li>• Uses localStorage for preference storage</li>
      </ul>
    `;
    featuresSection.appendChild(featuresContainer);

    // Add all sections to container
    container.appendChild(basicSection);
    container.appendChild(visualSection);
    container.appendChild(featuresSection);
  },

  cleanup: async () => {
    // Clean up any event listeners or resources if needed
    // The theme toggle component handles its own cleanup
  },
};

export default demo;
