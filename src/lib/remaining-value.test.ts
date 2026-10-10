/// <reference types="node" />
import assert from 'node:assert/strict';
import { remainingValue, billingDays, dateDays, premium } from './remaining-value.ts';
import { valueMarkdown } from './value-export.ts';

assert.equal(remainingValue(200, 365, 180), 98.63);
assert.equal(remainingValue(30, 30, 15), 15);
assert.equal(remainingValue(0, 365, 200), 0);
assert.equal(remainingValue(20, 30, -2), 0);
assert.equal(remainingValue(20, 30, 60), 40);
assert.equal(remainingValue(10.9 * 6.6944, 30, 137), 333.22);
assert.equal(remainingValue(200, 365, 730), 400);
assert.equal(remainingValue(10, 30, 0.5), 0.17);
for (const args of [[-1, 30, 15], [10, 0, 5], [10, -1, 5], [NaN, 30, 5], [10, Infinity, 5], [10, 30, NaN]]) {
  assert.equal(remainingValue(...args as [number, number, number]), null);
}
assert.equal(billingDays('monthly'), 30);
assert.equal(billingDays('yearly'), 365);
assert.equal(billingDays('biennial'), 730);
assert.equal(billingDays('18m'), 540);
assert.equal(billingDays('60m'), 1825);
assert.equal(billingDays('once'), null);
assert.equal(billingDays('unknown'), null);
assert.equal(dateDays('2026-10-10', '2027-10-10'), 365);
assert.equal(dateDays('2024-02-28', '2024-03-01'), 2);
assert.equal(dateDays('2026-03-07', '2026-03-09'), 2);
assert.equal(dateDays('2026-10-10', '2026-10-08'), -2);
assert.equal(dateDays('2026-02-30', '2026-03-03'), null);
assert.equal(dateDays('', '2026-03-03'), null);
assert.deepEqual(premium(120, 100), { amount: 20, percent: 20 });
assert.deepEqual(premium(80, 100), { amount: -20, percent: -20 });
assert.deepEqual(premium(20, 0), { amount: 20, percent: null });
assert.equal(premium(-1, 20), null);
assert.match(valueMarkdown([['产品名称', 'a|b\n<script>']]), /a\\\|b \\<script\\>/);
console.log('remaining value handles paid/free/expired plans, multiple prepaid periods and invalid inputs');
