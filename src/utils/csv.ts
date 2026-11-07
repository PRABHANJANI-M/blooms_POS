import type { Item } from '../types';

/** Parses "item code, quantity" lines (CSV) and matches them to the item list. Unknown codes are skipped. */
export interface CsvMatch { item: Item; qty: number }

export const parseCodeQtyCsv = (text: string, items: Item[]): { matches: CsvMatch[]; skipped: number } => {
  const rows = text
    .split(/\r?\n/)
    .map((r) => r.split(',').map((c) => c.trim().replace(/^"|"$/g, '')))
    .filter((r) => r[0] && r[0].toLowerCase() !== 'code');
  const matches: CsvMatch[] = [];
  let skipped = 0;
  for (const [code, qty] of rows) {
    const item = items.find((i) => i.code.toLowerCase() === code.toLowerCase());
    const q = Number(qty);
    if (!item || !(q > 0)) { skipped += 1; continue; }
    matches.push({ item, qty: q });
  }
  return { matches, skipped };
};
