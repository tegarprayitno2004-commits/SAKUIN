import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useToast } from '@/src/app/ToastContext';
import { useWorkspace } from '@/src/app/WorkspaceContext';
import { getCategoryMeta } from '@/src/constants/categories';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { usePremium } from '@/src/hooks/usePremium';
import {
  buildReportSeries,
  calculateBudgetProgress,
  pickPrimaryActiveBudget,
} from '@/src/lib/calculations';
import {
  formatDateId,
  formatMonthYearId,
  getTodayJakartaDateKey,
  shiftDateKey,
} from '@/src/lib/dates';
import { exportReportToPdf, exportTransactionsToCsv } from '@/src/lib/export';
import { formatRupiah, formatRupiahCompact } from '@/src/lib/money';

type ReportTab = 'daily' | 'weekly' | 'monthly';

export function ReportsPage() {
  const { transactions, budgets, customCategories, activeGroup, scope } = useWorkspace();
  const { isPremium } = usePremium();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<ReportTab>('weekly');
  const [refDateKey, setRefDateKey] = useState<string>(() => getTodayJakartaDateKey());

  const report = useMemo(
    () => buildReportSeries(transactions, tab, refDateKey, customCategories),
    [transactions, tab, refDateKey, customCategories]
  );

  const primaryBudget = useMemo(
    () =>
      pickPrimaryActiveBudget(
        budgets,
        refDateKey,
        tab === 'monthly' ? 'monthly' : 'weekly'
      ),
    [budgets, refDateKey, tab]
  );

  const budgetProgress = useMemo(
    () =>
      primaryBudget
        ? calculateBudgetProgress(primaryBudget, transactions, refDateKey, customCategories)
        : null,
    [primaryBudget, transactions, refDateKey, customCategories]
  );

  const periodLabel = useMemo(() => {
    if (tab === 'daily') return formatDateId(refDateKey);
    if (tab === 'monthly') return formatMonthYearId(refDateKey);
    return `${formatDateId(report.range.startDate)} – ${formatDateId(report.range.endDate)}`;
  }, [tab, refDateKey, report.range]);

  const workspaceLabel = scope === 'group' && activeGroup ? activeGroup.name : 'Pribadi';

  const shiftPeriod = (dir: -1 | 1) => {
    const unit = tab === 'daily' ? 'day' : tab === 'weekly' ? 'week' : 'month';
    setRefDateKey((prev) => shiftDateKey(prev, unit, dir));
  };

  const handleExportCsv = () => {
    exportTransactionsToCsv({
      transactions: report.filteredTransactions,
      workspaceLabel,
      periodLabel,
      customCategories,
    });
    showToast({ type: 'success', title: 'Laporan CSV diunduh' });
  };

  const handleExportPdf = () => {
    exportReportToPdf({
      workspaceLabel,
      periodLabel,
      income: report.income,
      expense: report.expense,
      net: report.net,
      categoryBreakdown: report.categoryDonut,
      transactions: report.filteredTransactions,
      customCategories,
      includeDetailedNotes: isPremium,
    });
    showToast({ type: 'success', title: 'Laporan PDF diunduh' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Laporan Keuangan</h1>
          <p className="text-xs text-slate-500">
            Analisis tren harian, kategori pengeluaran, dan perbandingan anggaran ({workspaceLabel}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="min-h-[42px] inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            Ekspor CSV
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="min-h-[42px] inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            Ekspor PDF
          </button>
        </div>
      </div>

      {/* Tabs + Date Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
          {(
            [
              { key: 'daily', label: 'Harian' },
              { key: 'weekly', label: 'Mingguan' },
              { key: 'monthly', label: 'Bulanan' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`min-h-[40px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                tab === item.key
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => shiftPeriod(-1)}
            aria-label="Periode sebelumnya"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-xs sm:text-sm font-bold text-slate-900 text-center min-w-[160px]">
            {periodLabel}
          </span>
          <button
            type="button"
            onClick={() => shiftPeriod(1)}
            aria-label="Periode berikutnya"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Pemasukan</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700 tabular-nums">
            {formatRupiah(report.income)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Pengeluaran</p>
          <p className="mt-1 text-2xl font-extrabold text-rose-600 tabular-nums">
            {formatRupiah(report.expense)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Selisih Bersih</p>
          <p
            className={`mt-1 text-2xl font-extrabold tabular-nums ${
              report.net >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            {formatRupiah(report.net)}
          </p>
        </div>
      </div>

      {report.filteredTransactions.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Belum ada transaksi di periode ini"
          description="Catat transaksi pada periode ini atau pindah ke tanggal lain untuk melihat grafik laporan."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Trend Bar Chart */}
            <section className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4">
                Grafik Arus Kas ({tab === 'daily' ? 'Hari Ini' : tab === 'weekly' ? 'Per Hari' : 'Bulanan'})
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} />
                    <YAxis
                      tickFormatter={(v: number) => formatRupiahCompact(v)}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      width={58}
                    />
                    <Tooltip
                      formatter={(val: unknown, name: unknown) => [
                        formatRupiah(Number(val) || 0),
                        name === 'income' ? 'Pemasukan' : 'Pengeluaran',
                      ]}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Bar dataKey="income" name="income" fill="#059669" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="expense" name="expense" fill="#F43F5E" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Expense Donut Chart */}
            <section className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="text-base font-bold text-slate-900 mb-4">Kategori Pengeluaran</h2>
              {report.categoryDonut.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                  Tidak ada pengeluaran pada periode ini.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="h-52 w-52 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={report.categoryDonut}
                          dataKey="spent"
                          nameKey="categoryName"
                          innerRadius={52}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {report.categoryDonut.map((entry) => (
                            <Cell key={entry.categoryKey} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: unknown) => formatRupiah(Number(val) || 0)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <ul className="flex-1 w-full space-y-2 text-xs">
                    {report.categoryDonut.map((item) => (
                      <li key={item.categoryKey} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: item.color }}
                            aria-hidden="true"
                          />
                          <span className="text-slate-700 truncate">{item.categoryName}</span>
                        </span>
                        <span className="font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {item.sharePercent.toFixed(0)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>

          {/* Budget vs Actual Comparison */}
          {budgetProgress && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Anggaran vs Realisasi ({budgetProgress.budget.name})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Periode {formatDateId(budgetProgress.budget.startDate)} –{' '}
                    {formatDateId(budgetProgress.budget.endDate)}
                  </p>
                </div>
                <span className="text-sm font-bold text-slate-900 tabular-nums">
                  {formatRupiah(budgetProgress.used)} / {formatRupiah(budgetProgress.budget.amount)} (
                  {budgetProgress.percentage.toFixed(0)}%)
                </span>
              </div>

              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    budgetProgress.percentage >= 100
                      ? 'bg-rose-600'
                      : budgetProgress.percentage >= 85
                        ? 'bg-amber-500'
                        : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, budgetProgress.percentage)}%` }}
                />
              </div>
            </section>
          )}

          {/* Premium Detailed Breakdown Gate */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Rincian Detail per Kategori
                </h2>
                <p className="text-xs text-slate-500">
                  Analisis nominal dan proporsi pengeluaran secara terperinci.
                </p>
              </div>
              {!isPremium && (
                <button
                  type="button"
                  onClick={() => navigate('/premium')}
                  className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  <Crown className="h-3.5 w-3.5" />
                  Buka Rincian Premium
                </button>
              )}
            </div>

            {isPremium ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="py-2.5 pr-4">Kategori</th>
                      <th className="py-2.5 pr-4 text-right">Total Pengeluaran</th>
                      <th className="py-2.5 pr-4 text-right">Porsi</th>
                      <th className="py-2.5 text-right">Rata-rata / Hari</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.categoryDonut.map((item) => {
                      const daysCount = Math.max(1, report.trend.length);
                      return (
                        <tr key={item.categoryKey}>
                          <td className="py-3 pr-4 font-medium text-slate-900">
                            {item.categoryName}
                          </td>
                          <td className="py-3 pr-4 text-right font-semibold text-slate-900 tabular-nums">
                            {formatRupiah(item.spent)}
                          </td>
                          <td className="py-3 pr-4 text-right text-slate-600 tabular-nums">
                            {item.sharePercent.toFixed(1)}%
                          </td>
                          <td className="py-3 text-right text-slate-600 tabular-nums">
                            {formatRupiah(Math.round(item.spent / daysCount))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Aktifkan simulasi SAKUIN Premium untuk melihat tabel rata-rata harian per kategori
                serta ekspor PDF lengkap hingga 150 transaksi.
              </p>
            )}
          </section>

          {/* Transaction Table */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-base font-bold text-slate-900 mb-3">
              Daftar Transaksi Periode Ini ({report.filteredTransactions.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-2.5 pr-4">Tanggal</th>
                    <th className="py-2.5 pr-4">Kategori</th>
                    <th className="py-2.5 pr-4">Keterangan</th>
                    <th className="py-2.5 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.filteredTransactions.slice(0, 50).map((tx) => {
                    const cat = getCategoryMeta(tx.category, customCategories);
                    return (
                      <tr key={tx.id}>
                        <td className="py-2.5 pr-4 text-xs text-slate-600 whitespace-nowrap">
                          {formatDateId(tx.dateKey)}
                        </td>
                        <td className="py-2.5 pr-4 font-medium text-slate-800 whitespace-nowrap">
                          {cat.name}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600 max-w-xs truncate">
                          {tx.note || '-'}
                        </td>
                        <td
                          className={`py-2.5 text-right font-bold tabular-nums whitespace-nowrap ${
                            tx.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {formatRupiah(tx.type === 'income' ? tx.amount : -tx.amount, {
                            withSign: tx.type === 'income',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
