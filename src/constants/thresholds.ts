import type { NotificationLevel } from '@/src/types';

export interface ThresholdRule {
  threshold: 70 | 85 | 100 | 101;
  level: NotificationLevel;
  title: string;
  buildMessage: (budgetName: string, percent: number, remainingText: string) => string;
}

export const BUDGET_THRESHOLDS: ThresholdRule[] = [
  {
    threshold: 70,
    level: 'info',
    title: 'Peringatan Awal Anggaran (70%)',
    buildMessage: (budgetName, percent, remainingText) =>
      `Penggunaan anggaran "${budgetName}" telah mencapai ${percent.toFixed(0)}%. Sisa anggaran saat ini ${remainingText}. Mulai atur prioritas pengeluaranmu.`,
  },
  {
    threshold: 85,
    level: 'warning',
    title: 'Peringatan Penting Anggaran (85%)',
    buildMessage: (budgetName, percent, remainingText) =>
      `Perhatian! Pengeluaran pada anggaran "${budgetName}" sudah mencapai ${percent.toFixed(0)}%. Kurangi pengeluaran yang tidak terlalu diperlukan (sisa ${remainingText}).`,
  },
  {
    threshold: 100,
    level: 'danger',
    title: 'Anggaran Habis (100%)',
    buildMessage: (budgetName, _percent, _remainingText) =>
      `Batas anggaran "${budgetName}" sudah mencapai 100% dan telah habis. Hindari pengeluaran tambahan hingga periode berikutnya.`,
  },
  {
    threshold: 101,
    level: 'danger',
    title: 'Anggaran Terlampaui (>100%)',
    buildMessage: (budgetName, percent, remainingText) =>
      `Peringatan! Pengeluaran pada anggaran "${budgetName}" sudah melampaui batas (${percent.toFixed(0)}%), defisit sebesar ${remainingText}.`,
  },
];
