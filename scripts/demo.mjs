import { spawn } from "node:child_process";
const child = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: { ...process.env, MONITOR_DEMO: "1" },
  },
);
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
