import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  PiggyBank,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/src/app/WorkspaceContext';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { evaluateFinancialHealth, pickPrimaryActiveBudget } from '@/src/lib/calculations';
import {
  getMonthRangeJakarta,
  getTodayJakartaDateKey,
  getWeekRangeJakarta,
} from '@/src/lib/dates';
import { formatRupiah } from '@/src/lib/money';

export function EvaluationPage() {
  const { transactions, budgets, customCategories } = useWorkspace();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const todayKey = useMemo(() => getTodayJakartaDateKey(), []);
  const range = useMemo(
    () => (period === 'week' ? getWeekRangeJakarta(todayKey) : getMonthRangeJakarta(todayKey)),
    [period, todayKey]
  );

  const activeBudget = useMemo(
    () =>
      pickPrimaryActiveBudget(budgets, todayKey, period === 'week' ? 'weekly' : 'monthly'),
    [budgets, todayKey, period]
  );

  const evaluation = useMemo(
    () =>
      evaluateFinancialHealth({
        transactions,
        activeBudget,
        startDateKey: range.startDate,
        endDateKey: range.endDate,
        todayDateKey: todayKey,
        customCategories,
      }),
    [transactions, activeBudget, range, todayKey, customCategories]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Evaluasi Keuangan</h1>
          <p className="text-xs text-slate-500">
            Analisis berbasis data transaksi nyatamu pada periode {evaluation.periodLabel}.
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-slate-200/70 p-1 self-start">
          <button
            type="button"
            onClick={() => setPeriod('week')}
            className={`min-h-[38px] rounded-lg px-3.5 text-xs font-semibold ${
              period === 'week' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
            }`}
          >
            Minggu Ini
          </button>
          <button
            type="button"
            onClick={() => setPeriod('month')}
            className={`min-h-[38px] rounded-lg px-3.5 text-xs font-semibold ${
              period === 'month' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
            }`}
          >
            Bulan Ini
          </button>
        </div>
      </div>

      {!evaluation.hasData ? (
        <EmptyState
          icon={Lightbulb}
          title="Belum ada data untuk dievaluasi"
          description="Catat pemasukan dan pengeluaranmu terlebih dahulu pada periode ini agar SAKUIN dapat menghitung rata-rata harian dan rekomendasi penghematan."
          actionLabel="Lihat Riwayat Transaksi"
          onAction={() => navigate('/transaksi')}
        />
      ) : (
        <>
          {/* Hero Evaluation Summary Card */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-emerald-800">
                {evaluation.remainingBudget !== null
                  ? `Sisa Dana Anggaran (${period === 'week' ? 'Minggu Ini' : 'Bulan Ini'})`
                  : 'Selisih Bersih Periode Ini'}
              </p>
              <p
                className={`mt-1 text-3xl font-extrabold tabular-nums ${
                  (evaluation.remainingBudget ?? evaluation.netBalance) < 0
                    ? 'text-rose-600'
                    : 'text-emerald-900'
                }`}
              >
                {formatRupiah(evaluation.remainingBudget ?? evaluation.netBalance)}
              </p>
              {evaluation.safeDailyLimit !== null && (
                <p className="mt-1 text-xs text-slate-600">
                  Batas pengeluaran harian aman:{' '}
                  <strong className="text-slate-900 tabular-nums">
                    {formatRupiah(evaluation.safeDailyLimit)}/hari
                  </strong>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-white border border-emerald-100 p-3.5">
                <p className="text-xs text-slate-500">Rata-rata Harian</p>
                <p className="mt-1 font-bold text-slate-900 tabular-nums">
                  {formatRupiah(evaluation.avgDailySpend)}
                </p>
              </div>
              <div className="rounded-xl bg-white border border-emerald-100 p-3.5">
                <p className="text-xs text-slate-500">Pos Terbesar</p>
                <p className="mt-1 font-bold text-slate-900 truncate max-w-[140px]">
                  {evaluation.topCategory
                    ? `${evaluation.topCategory.categoryName} (${evaluation.topCategory.sharePercent.toFixed(0)}%)`
                    : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Period Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Perbandingan dengan Periode Lalu</p>
              <div className="mt-2 flex items-center gap-2">
                {evaluation.expenseChangeAbsolute > 0 ? (
                  <TrendingUp className="h-5 w-5 text-rose-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-emerald-700" />
                )}
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {evaluation.expenseChangeAbsolute >= 0 ? '+' : ''}
                  {formatRupiah(evaluation.expenseChangeAbsolute)}
                  {evaluation.expenseChangePercent !== null && (
                    <span className="ml-1.5 text-sm font-semibold text-slate-600">
                      ({evaluation.expenseChangePercent >= 0 ? '+' : ''}
                      {evaluation.expenseChangePercent.toFixed(0)}%)
                    </span>
                  )}
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Periode ini {formatRupiah(evaluation.totalExpense)} vs periode sebelumnya{' '}
                {formatRupiah(evaluation.previousPeriodExpense)}.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Proyeksi Akhir Periode</p>
              <p
                className={`mt-2 text-lg font-bold tabular-nums ${
                  (evaluation.projectedEndBalance ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {evaluation.projectedEndBalance !== null
                  ? formatRupiah(evaluation.projectedEndBalance)
                  : 'Belum ada anggaran aktif'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {evaluation.projectedEndBalance !== null
                  ? 'Estimasi sisa anggaran jika pola belanja harian saat ini berlanjut.'
                  : 'Buat anggaran mingguan/bulanan untuk melihat proyeksi sisa dana.'}
              </p>
            </div>
          </div>

          {/* Recommendations */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">Rekomendasi Pengelolaan</h2>
            <div className="space-y-3">
              {evaluation.recommendations.map((rec) => {
                const Icon =
                  rec.type === 'warning'
                    ? AlertTriangle
                    : rec.type === 'save'
                      ? PiggyBank
                      : rec.type === 'positive'
                        ? CheckCircle2
                        : Lightbulb;

                const tone =
                  rec.type === 'warning'
                    ? 'border-amber-200 bg-amber-50/70 text-amber-900'
                    : rec.type === 'save'
                      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-950'
                      : rec.type === 'positive'
                        ? 'border-emerald-200 bg-white text-slate-900'
                        : 'border-slate-200 bg-white text-slate-900';

                return (
                  <div
                    key={rec.id}
                    className={`rounded-2xl border p-4 sm:p-5 flex items-start gap-3.5 ${tone}`}
                  >
                    <Icon className="h-5 w-5 shrink-0 mt-0.5 text-emerald-700" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold">{rec.title}</h3>
                      <p className="mt-1 text-xs sm:text-sm opacity-90 leading-relaxed">
                        {rec.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
