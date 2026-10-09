import { spawnSync } from "node:child_process";
for (const file of ["format", "api", "config-values", "node-remarks"]) {
  const run = spawnSync(process.execPath, [`src/lib/${file}.test.ts`], {
    stdio: "inherit",
    env: { ...process.env, TZ: "Asia/Shanghai" },
  });
  if (run.status !== 0) process.exit(run.status ?? 1);
}
