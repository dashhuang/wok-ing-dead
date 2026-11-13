import "./style.css";
import { initI18n } from "./i18n/index.js";

// Language and interface fonts first, so the loading screen is already localized.
initI18n();
await import("./game.js");
