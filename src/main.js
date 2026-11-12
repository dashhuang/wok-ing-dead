import "./style.css";
import { initI18n, setVariant } from "./i18n/index.js";

// Language and interface fonts first, so the loading screen is already localized.
// (the docks stage words some lines its own way; it is chosen by the address)
if (new URLSearchParams(location.search).get("lvl") === "harbor")
  setVariant("docks");
initI18n();
await import("./game.js");
