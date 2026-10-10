const cycles: Record<string, number> = {
  monthly: 30, quarterly: 90, semiannual: 180,
  yearly: 365, biennial: 730, triennial: 1095,
};

export function billingDays(cycle: string): number | null {
  if (cycles[cycle]) return cycles[cycle];
  const months = Number(/^(\d+)m$/.exec(cycle)?.[1]);
  return months > 0 && months <= 1200 ? (months % 12 ? months * 30 : months / 12 * 365) : null;
}

/** Calendar dates use UTC midnight, so DST never adds/subtracts a day. */
export function dateDays(start: string, end: string): number | null {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const time = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : NaN;
  };
  const days = (parse(end) - parse(start)) / 86400000;
  return Number.isFinite(days) ? days : null;
}

export function remainingValue(price: number, days: number, remaining: number): number | null {
  if (![price, days, remaining].every(Number.isFinite) || price < 0 || days <= 0) return null;
  const value = price * (Math.min(days, Math.max(0, remaining)) / days);
  return Number.isFinite(value) ? Math.round((value + Number.EPSILON) * 100) / 100 : null;
}

export function premium(sale: number, value: number): { amount: number; percent: number | null } | null {
  if (![sale, value].every(Number.isFinite) || sale < 0 || value < 0) return null;
  const amount = Math.round((sale - value + Number.EPSILON) * 100) / 100;
  return { amount, percent: value === 0 ? null : amount / value * 100 };
}
