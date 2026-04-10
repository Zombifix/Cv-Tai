import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// #region agent log
window.addEventListener("error", (event) => {
  fetch("http://127.0.0.1:7297/ingest/a5304bcd-7823-4ec6-ac0b-4a69ddc533f3", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "77058f" },
    body: JSON.stringify({
      sessionId: "77058f",
      runId: "pre-fix",
      hypothesisId: "H1_H3",
      location: "client/src/main.tsx:error-listener",
      message: "Window error captured",
      data: {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
});
// #endregion

createRoot(document.getElementById("root")!).render(<App />);
