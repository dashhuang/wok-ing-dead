import "./style.css";
import legacy from "./legacy-v8.txt?raw";

// Preserve the original embedded-version switch without Claude's host runtime.
const payload = document.createElement("script");
payload.type = "application/octet-stream";
payload.id = "legacy-v8";
payload.textContent = legacy;
document.body.appendChild(payload);
await import("./game.js");
