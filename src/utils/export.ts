/**
 * Export helpers.
 * Excel: writes a UTF-8 CSV with BOM, which Excel opens directly.
 * PDF: uses the browser print dialog (choose "Save as PDF"), so no server is required.
 */
export interface ExportColumn { label: string; key: string }

const escapeCsv = (value: unknown): string => {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const downloadCsv = (filename: string, columns: ExportColumn[], rows: Record<string, unknown>[]) => {
  const header = columns.map((c) => escapeCsv(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => escapeCsv(r[c.key])).join(',')).join('\n');
  const blob = new Blob(['﻿' + header + '\n' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const printPage = () => window.print();
