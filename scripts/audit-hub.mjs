// Read-only protocol smoke check. Connect through the isolated Hub's SSH tunnel.
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import WebSocket from "ws";

const origin = process.env.MONITOR_HUB || "http://127.0.0.1:9911";
async function json(path) {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, path);
  return response.json();
}
const me = await json("/api/me");
assert.equal(typeof me.authed, "boolean");
assert.equal(typeof me.public_page, "boolean");
assert.equal(typeof me.site_name, "string");
const list = await json("/api/nodes");
assert.ok(Array.isArray(list.nodes));
const config = await json("/api/themes/monitor-theme-guangao/config");
assert.ok(config && typeof config === "object" && !Array.isArray(config));
for (const node of list.nodes) {
  if (!me.authed) for (const key of ["ip", "ipv4", "ipv6", "hostname", "remark", "token", "boot_id"])
    assert.equal(Object.hasOwn(node, key), false, `Unexpected anonymous field: ${key}`);
}
async function snapshot(gzip) {
  const url = new URL(`/api/ws${gzip ? "?gzip" : ""}`, origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  await new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timer = setTimeout(() => { socket.terminate(); reject(new Error("Snapshot timed out")); }, 15000);
    socket.once("error", (error) => { clearTimeout(timer); reject(error); });
    socket.once("message", (data, binary) => {
      try {
        const frame = JSON.parse((binary ? gunzipSync(data) : data).toString());
        assert.ok(Array.isArray(frame.nodes));
        console.log(`Live WS ${gzip ? "gzip" : "text"}: valid ${binary ? "binary gzip" : "text"} snapshot`);
        resolve();
      } catch (error) { reject(error); }
      finally { clearTimeout(timer); socket.close(); }
    });
  });
}
await snapshot(false);
await snapshot(true);
if (!list.nodes.length) {
  const missing = await fetch(new URL("/api/nodes/999/metrics?hours=1&points=60&series=metrics", origin));
  // Hubs can deny an anonymous lookup before disclosing whether the ID exists.
  assert.ok([401, 404].includes(missing.status));
  assert.ok(missing.headers.get("content-type")?.startsWith("text/plain"));
  console.log(`History: inaccessible node returns plain-text ${missing.status}; populated history not tested on this empty Hub`);
}
console.log(`Read-only Hub checks passed: me, nodes (${list.nodes.length}), theme config, text/gzip WS`);
