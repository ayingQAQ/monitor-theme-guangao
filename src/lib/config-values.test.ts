/// <reference types="node" />
import assert from "node:assert/strict";
import { resolveConfig, type ConfigField } from "./config-values.ts";
import { readFileSync } from "node:fs";

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
const manifest = JSON.parse(readFileSync(new URL('../../theme.json', import.meta.url), 'utf8'));
const calculatorField = manifest.config.find((field: ConfigField) => field.key === 'show_value_calculator');
assert.equal(calculatorField?.type, 'boolean');
assert.equal(resolveConfig(manifest.config, {}).show_value_calculator, true);
assert.equal(resolveConfig(manifest.config, { show_value_calculator: false }).show_value_calculator, false);
assert.equal(resolveConfig(manifest.config, { show_value_calculator: true }).show_value_calculator, true);
assert.equal(resolveConfig(manifest.config, { show_value_calculator: 'false' }).show_value_calculator, true);
console.log(
  "config defaults, valid selections, bounds and malformed payloads pass",
);
