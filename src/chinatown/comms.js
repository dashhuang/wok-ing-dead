// Radio captions: whole sentences on ink-and-paper comic panels. The HUD owns the
// update clock; hidden captions keep their reading time while menus cover the street.
import * as L10N from "../i18n/index.js";

function readingSeconds(text) {
  const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu;
  const glyphs = text.match(cjk)?.length || 0;
  const words = text.replace(cjk, " ").match(/[\p{L}\p{N}]+/gu)?.length || 0;
  return 1.2 + glyphs / 6 + words / 3;
}

function panels(text) {
  const sentences = new Intl.Segmenter(L10N.locale(), {
    granularity: "sentence",
  }).segment(text);
  const out = [];
  let line = "";
  for (const { segment } of sentences) {
    if (line && readingSeconds(line + segment) > 7) {
      out.push(line.trim());
      line = "";
    }
    line += segment;
  }
  if (line.trim()) out.push(line.trim());
  return out;
}

export function createComms(G, parent) {
  const root = document.createElement("div");
  root.className = "comms";
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");
  root.setAttribute("aria-atomic", "true");
  root.hidden = true;
  root.innerHTML = `<div class="comms-head"><span class="comms-who" data-i18n="hud.who"></span><span class="comms-page" aria-hidden="true"></span></div><span class="comms-t"></span>`;
  root.querySelector(".comms-who").textContent = L10N.t("hud.who");
  const body = root.querySelector(".comms-t");
  const page = root.querySelector(".comms-page");
  parent.appendChild(root);
  const queue = [];
  let current = null;
  let index = 0;
  let remaining = 0;

  function showPanel() {
    const text = current.panels[index];
    body.textContent = text;
    page.textContent =
      current.panels.length > 1
        ? `${index + 1} / ${current.panels.length}`
        : "";
    remaining = Math.max(3.6, current.secs, readingSeconds(text));
  }

  function clear() {
    queue.length = 0;
    current = null;
    root.hidden = true;
    body.textContent = "";
    page.textContent = "";
  }

  return {
    push(text, secs = 4.5) {
      if (text?.trim()) queue.push({ text, secs, panels: panels(text) });
    },
    clear,
    update(dt) {
      const covered =
        G.game?.state === "paused" ||
        G.run?.picking ||
        G.run?.hud.root.classList.contains("wheel");
      const hidden = !!covered || (!current && !queue.length);
      if (root.hidden !== hidden) root.hidden = hidden;
      if (hidden) return;
      if (!current) {
        current = queue.shift();
        index = 0;
        showPanel();
        G.events.emit("radio:line", { text: current.text });
        return;
      }
      remaining -= dt;
      if (remaining > 0) return;
      if (++index < current.panels.length) showPanel();
      else {
        current = null;
        root.hidden = true;
      }
    },
  };
}
