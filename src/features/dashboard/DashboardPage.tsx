import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Plus,
  ReceiptText,
  Wallet,
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
import { useAuth } from '@/src/app/AuthContext';
import { useWorkspace } from '@/src/app/WorkspaceContext';
import { getCategoryMeta } from '@/src/constants/categories';
import { CategoryIcon } from '@/src/components/ui/CategoryIcon';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { DashboardSkeleton } from '@/src/components/ui/Skeleton';
import { TransactionFormModal } from '@/src/features/transactions/TransactionFormModal';
import {
  buildReportSeries,
  calculateBalance,
  calculateBudgetProgress,
  calculatePeriodTotals,
  evaluateBudgetThresholds,
  pickPrimaryActiveBudget,
} from '@/src/lib/calculations';
import {
  formatDateId,
  getMonthRangeJakarta,
  getTodayJakartaDateKey,
  getWeekRangeJakarta,
} from '@/src/lib/dates';
import { formatRupiah, formatRupiahCompact } from '@/src/lib/money';
import type { PeriodPreset, TransactionType } from '@/src/types';

export function DashboardPage() {
  const { profile } = useAuth();
  const {
    transactions,
    budgets,
    customCategories,
    loadingData,
    canAddTransaction,
    activeGroup,
    scope,
  } = useWorkspace();

  const navigate = useNavigate();
  const todayKey = useMemo(() => getTodayJakartaDateKey(), []);
  const weekRange = useMemo(() => getWeekRangeJakarta(todayKey), [todayKey]);
  const monthRange = useMemo(() => getMonthRangeJakarta(todayKey), [todayKey]);

  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('week');
  const [customStart, setCustomStart] = useState(weekRange.startDate);
  const [customEnd, setCustomEnd] = useState(weekRange.endDate);

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txInitialType, setTxInitialType] = useState<TransactionType>('expense');

  const activeRange = useMemo(() => {
    if (periodPreset === 'week') return weekRange;
    if (periodPreset === 'month') return monthRange;
    return customStart <= customEnd
      ? { startDate: customStart, endDate: customEnd }
      : { startDate: customEnd, endDate: customStart };
  }, [periodPreset, weekRange, monthRange, customStart, customEnd]);

  const balance = useMemo(() => calculateBalance(transactions), [transactions]);
  const periodTotals = useMemo(
    () => calculatePeriodTotals(transactions, activeRange.startDate, activeRange.endDate),
    [transactions, activeRange]
  );

  const primaryBudget = useMemo(
    () =>
      pickPrimaryActiveBudget(
        budgets,
        todayKey,
        periodPreset === 'month' ? 'monthly' : periodPreset === 'week' ? 'weekly' : 'custom'
      ),
    [budgets, todayKey, periodPreset]
  );

  const budgetProgress = useMemo(
    () =>
      primaryBudget
        ? calculateBudgetProgress(primaryBudget, transactions, todayKey, customCategories)
        : null,
    [primaryBudget, transactions, todayKey, customCategories]
  );

  // Highest active alert across all active budgets right now
  const highestActiveAlert = useMemo(() => {
    let highest: {
      budgetName: string;
      threshold: number;
      level: 'info' | 'warning' | 'danger';
      percentage: number;
      remaining: number;
      message: string;
    } | null = null;

    for (const b of budgets) {
      if (b.status !== 'active') continue;
      const prog = calculateBudgetProgress(b, transactions, todayKey, customCategories);
      const { highestActive } = evaluateBudgetThresholds(prog);
      if (highestActive) {
        if (!highest || highestActive.threshold > highest.threshold) {
          highest = {
            budgetName: b.name,
            threshold: highestActive.threshold,
            level: highestActive.level,
            percentage: prog.percentage,
            remaining: prog.remaining,
            message: highestActive.buildMessage(
              b.name,
              prog.percentage,
              formatRupiah(Math.abs(prog.remaining))
            ),
          };
        }
      }
    }
    return highest;
  }, [budgets, transactions, todayKey, customCategories]);

  const chartSeries = useMemo(
    () =>
      buildReportSeries(
        transactions,
        periodPreset === 'month' ? 'monthly' : 'weekly',
        todayKey,
        customCategories
      ),
    [transactions, periodPreset, todayKey, customCategories]
  );

  const openTxModal = (type: TransactionType) => {
    setTxInitialType(type);
    setTxModalOpen(true);
  };

  if (loadingData) {
    return <DashboardSkeleton />;
  }

  const firstName = (profile?.displayName || 'Teman Sakuin').split(' ')[0];
  const ringPercent = budgetProgress ? Math.min(100, Math.max(0, budgetProgress.percentage)) : 0;
  const ringData = [
    { name: 'Terpakai', value: ringPercent },
    { name: 'Sisa', value: Math.max(0, 100 - ringPercent) },
  ];
  const ringColor =
    budgetProgress && budgetProgress.percentage >= 100
      ? '#E11D48'
      : budgetProgress && budgetProgress.percentage >= 85
        ? '#D97706'
        : '#047857';

  return (
    <div className="space-y-6">
      {/* Greeting + Period Selector */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Hai, {firstName}
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            {scope === 'group' && activeGroup
              ? `Mengelola kas bersama kelompok ${activeGroup.name}.`
              : 'Semangat mengatur keuanganmu hari ini!'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-200/70 p-1">
            {(
              [
                { key: 'week', label: 'Minggu ini' },
                { key: 'month', label: 'Bulan ini' },
                { key: 'custom', label: 'Pilih rentang tanggal' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setPeriodPreset(opt.key)}
                className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  periodPreset === opt.key
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {periodPreset === 'custom' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="dash-start" className="block text-xs font-semibold text-slate-600 mb-1">
              Dari Tanggal
            </label>
            <input
              id="dash-start"
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
            />
          </div>
          <div>
            <label htmlFor="dash-end" className="block text-xs font-semibold text-slate-600 mb-1">
              Sampai Tanggal
            </label>
            <input
              id="dash-end"
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="min-h-[40px] rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-900"
            />
          </div>
          <p className="text-xs text-slate-500 pb-2">
            Menampilkan {formatDateId(activeRange.startDate)} – {formatDateId(activeRange.endDate)}
          </p>
        </div>
      )}

      {/* Highest Active Budget Alert Banner */}
      {highestActiveAlert && (
        <div
          role="alert"
          className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
            highestActiveAlert.level === 'danger'
              ? 'border-rose-200 bg-rose-50 text-rose-950'
              : highestActiveAlert.level === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-950'
                : 'border-emerald-200 bg-emerald-50 text-emerald-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`h-5 w-5 shrink-0 mt-0.5 ${
                highestActiveAlert.level === 'danger'
                  ? 'text-rose-600'
                  : highestActiveAlert.level === 'warning'
                    ? 'text-amber-600'
                    : 'text-emerald-700'
              }`}
            />
            <div className="text-sm">
              <p className="font-bold">
                Peringatan Anggaran ({highestActiveAlert.percentage.toFixed(0)}%)
              </p>
              <p className="mt-0.5 text-xs opacity-90 leading-relaxed">
                {highestActiveAlert.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/peringatan')}
            className="min-h-[40px] self-start sm:self-center rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-900 border border-slate-200 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Lihat Detail
          </button>
        </div>
      )}

      {/* Top Grid: Balance Card + Budget Ring Card */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Saldo Tersedia + Income/Expense */}
        <div className="lg:col-span-7 rounded-2xl border border-emerald-800/10 bg-emerald-800 text-white p-6 flex flex-col justify-between shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-emerald-100">
                Saldo Tersedia ({scope === 'group' && activeGroup ? activeGroup.name : 'Pribadi'})
              </p>
              <p className="mt-1.5 text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums">
                {formatRupiah(balance.availableBalance)}
              </p>
              <p className="mt-1 text-xs text-emerald-200">
                Akumulasi seluruh pemasukan dikurangi pengeluaran
              </p>
            </div>
            <button
              type="button"
              onClick={() => openTxModal('income')}
              disabled={!canAddTransaction}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Tambah Pemasukan
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-emerald-700/80 pt-5">
            <div className="rounded-xl bg-emerald-900/50 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-100">
                <ArrowDownLeft className="h-4 w-4 text-emerald-300" />
                <span>Pemasukan</span>
              </div>
              <p className="mt-1 text-lg sm:text-xl font-bold text-white tabular-nums">
                {formatRupiah(periodTotals.income)}
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-200/80">
                {formatDateId(activeRange.startDate)} – {formatDateId(activeRange.endDate)}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-900/50 p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-100">
                <ArrowUpRight className="h-4 w-4 text-rose-300" />
                <span>Pengeluaran</span>
              </div>
              <p className="mt-1 text-lg sm:text-xl font-bold text-white tabular-nums">
                {formatRupiah(periodTotals.expense)}
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-200/80">
                {formatDateId(activeRange.startDate)} – {formatDateId(activeRange.endDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Ringkasan Anggaran Mingguan / Bulanan */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {periodPreset === 'month' ? 'Ringkasan Bulanan' : 'Ringkasan Mingguan'}
              </h2>
              <p className="text-xs text-slate-500">
                {budgetProgress
                  ? `${budgetProgress.budget.name} · ${formatDateId(budgetProgress.budget.startDate)} – ${formatDateId(budgetProgress.budget.endDate)}`
                  : 'Belum ada anggaran aktif untuk periode ini'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/anggaran')}
              className="min-h-[36px] text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap"
            >
              Atur
            </button>
          </div>

          {budgetProgress ? (
            <div className="mt-4 flex items-center gap-5">
              <div className="relative h-28 w-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ringData}
                      dataKey="value"
                      innerRadius={36}
                      outerRadius={48}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      <Cell fill={ringColor} />
                      <Cell fill="#E2E8F0" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base font-extrabold text-slate-900 tabular-nums">
                    {budgetProgress.percentage.toFixed(0)}%
                  </span>
                  <span className="text-[10px] text-slate-500">terpakai</span>
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Total Anggaran</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatRupiah(budgetProgress.budget.amount)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Terpakai</span>
                  <span className="font-semibold text-rose-600 tabular-nums">
                    {formatRupiah(budgetProgress.used)}
                  </span>
                </div>
                <div className="flex justify-between gap-2 border-t border-slate-100 pt-1.5">
                  <span className="text-slate-500">Sisa</span>
                  <span
                    className={`font-bold tabular-nums ${
                      budgetProgress.remaining < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {formatRupiah(budgetProgress.remaining)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-emerald-50/70 border border-emerald-100 p-4 text-center">
              <p className="text-xs text-slate-600">
                Buat anggaran mingguan (misal Rp300.000) agar progres pengeluaranmu terpantau otomatis.
              </p>
              <button
                type="button"
                onClick={() => navigate('/anggaran')}
                className="mt-3 min-h-[40px] rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Buat Anggaran Sekarang
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
        {[
          {
            label: 'Tambah',
            icon: Plus,
            onClick: () => openTxModal('expense'),
            disabled: !canAddTransaction,
          },
          { label: 'Anggaran', icon: Wallet, onClick: () => navigate('/anggaran'), disabled: false },
          {
            label: 'Riwayat',
            icon: ReceiptText,
            onClick: () => navigate('/transaksi'),
            disabled: false,
          },
          { label: 'Laporan', icon: BarChart3, onClick: () => navigate('/laporan'), disabled: false },
        ].map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.label}
              type="button"
              onClick={act.onClick}
              disabled={act.disabled}
              className="min-h-[64px] rounded-2xl border border-slate-200 bg-white p-3 flex flex-col items-center justify-center gap-1.5 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors disabled:opacity-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-slate-800">{act.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Grid: Income vs Expense Chart + Recent Transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Income vs Expense Chart */}
        <section className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Pemasukan vs Pengeluaran
              </h2>
              <p className="text-xs text-slate-500">
                Grafik arus kas {periodPreset === 'month' ? 'bulan ini' : 'minggu ini'} (WIB)
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/laporan')}
              className="text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap"
            >
              Laporan Lengkap
            </button>
          </div>

          {chartSeries.filteredTransactions.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-center text-xs text-slate-500">
              Belum ada data transaksi pada periode ini untuk ditampilkan di grafik.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartSeries.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatRupiahCompact(v)}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    width={58}
                  />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      formatRupiah(Number(value) || 0),
                      name === 'income' ? 'Pemasukan' : 'Pengeluaran',
                    ]}
                    labelFormatter={(label) => `Hari/Tgl: ${label}`}
                    contentStyle={{
                      borderRadius: '12px',
                      borderColor: '#E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="income" name="income" fill="#059669" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="expense" fill="#F43F5E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Recent Transactions */}
        <section className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-base font-bold text-slate-900">Transaksi Terakhir</h2>
            <button
              type="button"
              onClick={() => navigate('/transaksi')}
              className="text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap"
            >
              Lihat Semua
            </button>
          </div>

          {transactions.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="Belum ada transaksi"
              description="Belum ada transaksi. Catat pengeluaran atau pemasukan pertamamu!"
              actionLabel={canAddTransaction ? 'Tambah Transaksi' : undefined}
              onAction={canAddTransaction ? () => openTxModal('expense') : undefined}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {transactions.slice(0, 6).map((tx) => {
                const cat = getCategoryMeta(tx.category, customCategories);
                return (
                  <li key={tx.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                        <CategoryIcon iconName={cat.icon} color={cat.color} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {tx.note || cat.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {cat.name} · {formatDateId(tx.dateKey)}
                          {scope === 'group' ? ` · ${tx.createdByName}` : ''}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums whitespace-nowrap ${
                        tx.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {formatRupiah(tx.type === 'income' ? tx.amount : -tx.amount, {
                        withSign: tx.type === 'income',
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <TransactionFormModal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        initialType={txInitialType}
      />
    </div>
  );
}
