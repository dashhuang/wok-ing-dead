// Parses every JavaScript file in the repo with `node --check`, so a syntax error fails
// fast without a full build. New folders are picked up automatically.
//
//   node scripts/check-syntax.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const skip = new Set([
  "node_modules",
  ".git",
  "dist",
  "dist-single",
  "upstream",
  "public",
  "test-results",
  "playwright-report",
]);

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".githooks") continue;
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(m?js)$/.test(entry.name)) files.push(full);
  }
})(root);

let failed = 0;
for (const file of files) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (err) {
    failed++;
    process.stderr.write(err.stderr?.toString() || String(err));
  }
}
console.log(
  `syntax: ${files.length - failed}/${files.length} files parse` +
    (failed ? `, ${failed} failed` : ""),
);
process.exit(failed ? 1 : 0);
