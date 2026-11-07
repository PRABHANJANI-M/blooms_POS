import { FileSpreadsheet, FileText, Printer, MessageCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { downloadCsv, printPage, type ExportColumn } from '../../utils/export';
import { useAppStore } from '../../store/appStore';

/** Excel (CSV), PDF (print dialog) and Print buttons used across reports and displays. */
export function ExportBar({ filename, columns, rows, showWhatsApp = false, printLabel = 'Print' }: {
  filename: string; columns: ExportColumn[]; rows: Record<string, unknown>[]; showWhatsApp?: boolean; printLabel?: string;
}) {
  const toast = useAppStore((s) => s.toast);
  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button size="sm" variant="success" icon={<FileSpreadsheet className="h-4 w-4" />} disabled={!rows.length}
        onClick={() => { downloadCsv(filename, columns, rows); toast({ tone: 'success', title: 'Excel file downloaded', message: 'Saved as CSV, which Excel opens directly.' }); }}>
        Excel
      </Button>
      <Button size="sm" variant="danger" icon={<FileText className="h-4 w-4" />} onClick={printPage}>PDF</Button>
      <Button size="sm" variant="navy" icon={<Printer className="h-4 w-4" />} onClick={printPage}>{printLabel}</Button>
      {showWhatsApp && (
        <Button size="sm" variant="success" icon={<MessageCircle className="h-4 w-4" />}
          onClick={() => toast({ tone: 'warning', title: 'WhatsApp not connected', message: 'Connect a WhatsApp provider under Features → W/A - SMS to send messages.' })}>
          WhatsApp
        </Button>
      )}
    </div>
  );
}
