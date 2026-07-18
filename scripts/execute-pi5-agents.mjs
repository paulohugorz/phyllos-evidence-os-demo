import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

function run(script, args = [], env = {}) {
  const result = spawnSync(process.execPath, [resolve(script), ...args], { stdio: "inherit", env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status || 1);
}
const root = process.env.PI5_AGENT_OUTPUT || "data/pi5/agent-execution/v3-synthetic";
const count = process.env.PI5_SYNTHETIC_COUNT || "720";
const seed = process.env.PI5_SYNTHETIC_SEED || "pi5-synthetic-v3";
run("scripts/generate-pi5-synthetic.mjs", [`--count=${count}`, `--seed=${seed}`, `--output=${root}/raw`]);
run("scripts/build-pi5-agent-dataset.mjs", [`--input=${root}/raw/synthetic-records.jsonl`, `--output=${root}/dataset`, "--version=3.0.0-synthetic"]);
run("scripts/audit-pi5-agent-dataset.mjs", [`--dataset=${root}/dataset`, `--output=${root}/dataset/audit.json`]);
run("scripts/evaluate-pi5-agent-model.mjs", [`--dataset=${root}/dataset`, `--output=${root}/evaluation`]);
run("scripts/report-pi5-agent-execution.mjs", [`--root=${root}`]);
if (process.env.DATABASE_URL && process.env.PI5_REGISTER_SYNTHETIC_DB === "true") run("scripts/register-pi5-agent-run-postgres.mjs", [`--root=${root}`, "--version=3.0.0-synthetic"]);
console.log(`\nExecução concluída: ${root}`);
