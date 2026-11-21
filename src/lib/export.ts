import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCategoryMeta } from '@/src/constants/categories';
import { formatDateId } from '@/src/lib/dates';
import { formatRupiah } from '@/src/lib/money';
import type { CategorySpendItem, CustomCategory, Transaction } from '@/src/types';

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports transactions to a UTF-8 BOM CSV file with integer Rp amounts.
 */
export function exportTransactionsToCsv(params: {
  transactions: Transaction[];
  workspaceLabel: string;
  periodLabel: string;
  customCategories?: CustomCategory[];
}): void {
  const { transactions, workspaceLabel, periodLabel, customCategories = [] } = params;
  const headers = ['Tanggal', 'Tipe', 'Kategori', 'Nominal (Rp)', 'Catatan', 'Dicatat Oleh'];

  const rows = transactions.map((tx) => {
    const catName = getCategoryMeta(tx.category, customCategories).name;
    const typeLabel = tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    return [
      formatDateId(tx.dateKey),
      typeLabel,
      catName,
      tx.amount,
      tx.note || '-',
      tx.createdByName,
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeSlug = workspaceLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  link.href = url;
  link.download = `sakuin-laporan-${safeSlug}-${periodLabel.replace(/\s+/g, '_')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports financial report summary, category breakdown, and transactions to PDF.
 */
export function exportReportToPdf(params: {
  workspaceLabel: string;
  periodLabel: string;
  income: number;
  expense: number;
  net: number;
  categoryBreakdown: CategorySpendItem[];
  transactions: Transaction[];
  customCategories?: CustomCategory[];
  includeDetailedNotes?: boolean;
}): void {
  const {
    workspaceLabel,
    periodLabel,
    income,
    expense,
    net,
    categoryBreakdown,
    transactions,
    customCategories = [],
    includeDetailedNotes = false,
  } = params;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // SAKUIN Header
  doc.setFillColor(4, 120, 87);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SAKUIN', 14, 13);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Kelola Keuangan, Raih Masa Depan', 14, 20);

  doc.setFontSize(10);
  doc.text(`Workspace: ${workspaceLabel}`, 196, 13, { align: 'right' });
  doc.text(`Periode: ${periodLabel}`, 196, 20, { align: 'right' });

  // Summary block
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Ringkasan Keuangan', 14, 38);

  autoTable(doc, {
    startY: 42,
    head: [['Total Pemasukan', 'Total Pengeluaran', 'Selisih Bersih']],
    body: [[formatRupiah(income), formatRupiah(expense), formatRupiah(net)]],
    theme: 'grid',
    headStyles: { fillColor: [236, 253, 245], textColor: [4, 120, 87], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 4 },
  });

  const afterSummaryY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 64;

  // Category Breakdown
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Pengeluaran per Kategori', 14, afterSummaryY + 10);

  autoTable(doc, {
    startY: afterSummaryY + 14,
    head: [['Kategori', 'Total Pengeluaran', 'Porsi (%)']],
    body:
      categoryBreakdown.length > 0
        ? categoryBreakdown.map((item) => [
            item.categoryName,
            formatRupiah(item.spent),
            `${item.sharePercent.toFixed(1)}%`,
          ])
        : [['Belum ada pengeluaran pada periode ini', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255] },
    styles: { fontSize: 9.5, cellPadding: 3 },
  });

  const afterCategoryY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 110;

  // Transaction table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Daftar Transaksi', 14, afterCategoryY + 10);

  const txRows = transactions.slice(0, includeDetailedNotes ? 150 : 60).map((tx) => [
    formatDateId(tx.dateKey),
    tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    getCategoryMeta(tx.category, customCategories).name,
    tx.note || '-',
    formatRupiah(tx.type === 'income' ? tx.amount : -tx.amount),
  ]);

  autoTable(doc, {
    startY: afterCategoryY + 14,
    head: [['Tanggal', 'Tipe', 'Kategori', 'Keterangan', 'Nominal']],
    body:
      txRows.length > 0
        ? txRows
        : [['-', '-', 'Belum ada transaksi pada periode ini', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  const safeSlug = workspaceLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`sakuin-laporan-${safeSlug}.pdf`);
}
