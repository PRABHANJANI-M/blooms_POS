/** Date helpers. Internal format is ISO (yyyy-mm-dd); display format is dd/mm/yyyy (Indian convention). */

export const todayISO = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const toDisplayDate = (iso: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

export const addDays = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const isValidRange = (from: string, to: string): boolean => Boolean(from && to && from <= to);

/** Indian financial year label, e.g. 2026-11-04 -> "2026-27" (April start). */
export const financialYearLabel = (iso: string): string => {
  const [y, m] = iso.split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
};

export const displayTime = (): string =>
  new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
