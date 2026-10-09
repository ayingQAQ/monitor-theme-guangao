/// <reference types="node" />
import assert from "node:assert/strict";
import { resolveConfig, type ConfigField } from "./config-values.ts";

const fields: ConfigField[] = [
  { type: "title" },
  {
    key: "variant",
    type: "select",
    default: "promo",
    options: [{ value: "promo" }, { value: "neon" }],
  },
  { key: "motion", type: "boolean", default: true },
  { key: "count", type: "number", default: 3, min: 1, max: 6 },
  { key: "notice", type: "text", default: "" },
];
assert.deepEqual(resolveConfig(fields, {}), {
  variant: "promo",
  motion: true,
  count: 3,
  notice: "",
});
assert.deepEqual(
  resolveConfig(fields, {
    variant: "neon",
    motion: false,
    count: 6,
    notice: "<b>公告</b>",
    unknown: 5,
  }),
  { variant: "neon", motion: false, count: 6, notice: "<b>公告</b>" },
);
for (const invalid of ["missing", true, null]) {
  assert.equal(resolveConfig(fields, { variant: invalid }).variant, "promo");
}
for (const count of [0, 7, NaN, Infinity, "4"])
  assert.equal(resolveConfig(fields, { count }).count, 3);
for (const invalid of [null, [], "error"])
  assert.equal(resolveConfig(fields, invalid).motion, true);
assert.equal(
  resolveConfig(fields, { motion: "false", notice: 0 }).motion,
  true,
);
assert.equal(resolveConfig(fields, { motion: "false", notice: 0 }).notice, "");
console.log(
  "config defaults, valid selections, bounds and malformed payloads pass",
);
