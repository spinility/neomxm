import { LitElement } from "lit";

export class SketchTailwindElement extends LitElement {
  // Disable shadow DOM for better integration with tailwind.
  // Inspired by:
  // https://lengrand.fr/a-simple-setup-to-use-litelement-with-tailwindcss-for-small-projects/

  createRenderRoot() {
    return this;
  }
}
