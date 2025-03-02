import { render } from "solid-js/web";
import App from "./App";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
  );
}

// polyfill umami track function for cases where it may not be able to get loaded and development
if (!("umami" in window)) {
  // @ts-ignore
  window.umami = {
    // biome-ignore lint/suspicious/noEmptyBlockStatements: <explanation>
    track: () => {},
  };
}

if (root) {
  render(() => <App />, root);
}
