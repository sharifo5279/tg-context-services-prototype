// CLI: npm run scenarios [-- --verbose]
import { runScenarios, SCENARIOS, coverage } from "./scenarios.js";
import { TOOLS, AGENT_ONLY } from "./tools/index.js";

const verbose = process.argv.includes("--verbose");
const results = runScenarios();
let failed = 0, skipped = 0;
for (const r of results) {
  const sc = SCENARIOS.find((s) => s.id === r.id)!;
  if (!r.pass) failed++;
  if (r.skipped) { skipped++; if (verbose) console.log(`SKIP ${r.id} ${sc.title}`); continue; }
  if (!r.pass || verbose) {
    console.log(`${r.pass ? "PASS" : "FAIL"} ${r.id} ${sc.title}`);
    for (const st of r.steps) if (!st.pass || verbose) console.log(`   ${st.pass ? "ok  " : "FAIL"} ${st.tool} -> ${st.status}${st.code ? ` ${st.code}` : ""} ${st.note ?? ""}${!st.pass ? ` ${JSON.stringify(st.out.error ?? st.out.result ?? {}).slice(0, 220)}` : ""}`);
  }
}
const covered = new Set(coverage());
const missing = [...TOOLS, ...AGENT_ONLY].map((t) => t.name).filter((n) => !covered.has(n));
console.log(`\n${results.length} scenarios, ${results.length - failed - skipped} passed, ${failed} failed, ${skipped} without a current example. Tools covered: ${covered.size} of ${TOOLS.length + AGENT_ONLY.length}.${missing.length ? ` Missing: ${missing.join(", ")}` : ""}`);
process.exit(failed ? 1 : 0);
