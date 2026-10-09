import assert from "node:assert/strict";
import { createCardAppearance, appearanceFor } from "./card-appearance.ts";
const values = [0.99, 0.01, 0.51, 0.2, 0.7];
let calls = 0;
assert.deepEqual(
  createCardAppearance(() => values[calls++]),
  { tone: 5, pattern: 0, sticker: 3, tilt: 1, label: 4 },
);
assert.equal(calls, 5, "Appearance fields need independent draws");
assert.strictEqual(
  appearanceFor(12),
  appearanceFor(12),
  "Remounts reuse their node appearance",
);
assert.notStrictEqual(appearanceFor(12), appearanceFor(13));
for (const value of Object.values(createCardAppearance(() => 0)))
  assert.equal(value, 0);
for (const value of Object.values(createCardAppearance(() => 0.99999)))
  assert.equal(value, 5);
console.log(
  "Card appearance uses independent random choices and remains stable per node",
);
