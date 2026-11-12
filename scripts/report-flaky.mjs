// Reads Playwright JSON results and calls out tests that only passed on a retry, so a
// green run with flaky tests is still visible (a warning on the run and in its summary).
//
//   node scripts/report-flaky.mjs test-results/results.json [more.json ...]
import fs from "node:fs";

const flaky = [];
for (const file of process.argv.slice(2)) {
  if (!fs.existsSync(file)) continue;
  const walk = (suite, trail) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        if (t.status === "flaky")
          flaky.push(`${spec.file}: ${[...trail, spec.title].join(" › ")}`);
      }
    }
    for (const child of suite.suites ?? [])
      walk(child, child.title ? [...trail, child.title] : trail);
  };
  for (const suite of JSON.parse(fs.readFileSync(file, "utf8")).suites ?? [])
    walk(suite, []);
}

if (!flaky.length) {
  console.log("No flaky tests.");
} else {
  for (const name of flaky)
    console.log(`::warning title=Flaky test (passed on retry)::${name}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### ⚠️ ${flaky.length} flaky test(s) — passed only on retry\n\n${flaky.map((n) => `- ${n}`).join("\n")}\n`,
    );
  }
}
