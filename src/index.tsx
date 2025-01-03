/* @refresh reload */
import { MetaProvider } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { render } from "solid-js/web";

import App from "./App";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
  );
}

if (root) {
  render(
    () => (
      <div class="mx-auto max-w-screen-2xl">
        <MetaProvider>
          <Router
          // root={(props) => {
          //   const navigate = useNavigate();
          //   const { pathname } = props.location;

          //   createEffect(() => {
          //     if (!db() && pathname !== "/") {
          //       navigate("/");
          //     }
          //   });

          //   return props.children;
          // }}
          >
            <App />
          </Router>
        </MetaProvider>
      </div>
    ),
    root,
  );
}
