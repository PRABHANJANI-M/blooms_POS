/**
 * Currency and quantity helpers.
 * Money is rounded to 2 decimals after every operation; quantities keep 3 decimals.
 * Using integer paise internally avoids classic floating point drift (0.1 + 0.2 style errors).
 */
const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
export const round3 = (n: number): number => Math.round((n + Number.EPSILON) * 1000) / 1000;
export const toPaise = (n: number): number => Math.round((n + Number.EPSILON) * 100);
export const fromPaise = (p: number): number => round2(p / 100);

export const formatINR = (n: number): string => inrFormatter.format(Number.isFinite(n) ? n : 0);
export const formatMoneyPlain = (n: number): string =>
  (Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatQty = (n: number): string =>
  (Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });

/** Parses user-typed numbers safely; empty or invalid input becomes 0. */
export const parseNum = (value: string | number | undefined | null): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const cleaned = String(value).replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

export const sumBy = <T,>(rows: T[], pick: (row: T) => number): number =>
  fromPaise(rows.reduce((acc, row) => acc + toPaise(pick(row)), 0));
