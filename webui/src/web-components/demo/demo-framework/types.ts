/**
 * TypeScript interfaces for the demo module system
 */

export interface DemoModule {
  /** Display title for the demo */
  title: string;

  /** Component imports required for this demo */
  imports: string[];

  /** Additional CSS files to load (optional) */
  styles?: string[];

  /** Setup function called when demo is loaded */
  setup: (container: HTMLElement) => void | Promise<void>;

  /** Cleanup function called when demo is unloaded (optional) */
  cleanup?: () => void | Promise<void>;

  /** Demo-specific CSS styles (optional) */
  customStyles?: string;

  /** Description of what this demo shows (optional) */
  description?: string;
}

/**
 * Registry of available demo modules
 */
export interface DemoRegistry {
  [componentName: string]: () => Promise<{ default: DemoModule }>;
}

/**
 * Options for the demo runner
 */
export interface DemoRunnerOptions {
  /** Container element to render demos in */
  container: HTMLElement;

  /** Base path for component imports */
  basePath?: string;

  /** Callback when demo changes */
  onDemoChange?: (componentName: string, demo: DemoModule) => void;
}

/**
 * Event dispatched when demo navigation occurs
 */
export interface DemoNavigationEvent extends CustomEvent {
  detail: {
    componentName: string;
    demo: DemoModule;
  };
}
