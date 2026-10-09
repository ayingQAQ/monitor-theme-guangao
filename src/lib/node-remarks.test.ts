/// <reference types="node" />
import assert from "node:assert/strict";
import { nodeRemark } from "./node-remarks.ts";

const live = Array.from({ length: 18 }, (_, id) => nodeRemark(id, "live"));
assert.ok(new Set(live).size > 6);
for (let id = 0; id < 18; id++) assert.equal(nodeRemark(id, "live"), live[id]);
assert.match(nodeRemark(1, "offline"), /离线|暂停|连接|累计|档案|历史|重连|休息/);
assert.match(nodeRemark(1, "pending"), /等待|上报|指标|报到|数据/);
assert.equal(nodeRemark(1, "live"), live[1]);
assert.equal(typeof nodeRemark(100, "live"), "string");
console.log("node remarks are varied, state-aware and fixed by server ID");
