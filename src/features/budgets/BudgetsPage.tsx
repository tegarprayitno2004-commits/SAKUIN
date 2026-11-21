import React, { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Crown, Pencil, Plus, Sparkles, Trash2, Wallet } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useToast } from '@/src/app/ToastContext';
import { useWorkspace } from '@/src/app/WorkspaceContext';
import { mergeCategories } from '@/src/constants/categories';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import { CurrencyInput } from '@/src/components/ui/CurrencyInput';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Modal } from '@/src/components/ui/Modal';
import { usePremium } from '@/src/hooks/usePremium';
import {
  calculateBudgetProgress,
  suggestAutomaticCategoryLimits,
} from '@/src/lib/calculations';
import {
  formatDateId,
  getMonthRangeJakarta,
  getTodayJakartaDateKey,
  getWeekRangeJakarta,
} from '@/src/lib/dates';
import { formatRupiah } from '@/src/lib/money';
import type { Budget, BudgetPeriodType } from '@/src/types';

const budgetSchema = z
  .object({
    name: z.string().min(2, 'Nama anggaran minimal 2 karakter.').max(80, 'Maksimal 80 karakter.'),
    periodType: z.enum(['weekly', 'monthly', 'custom']),
    amount: z
      .number()
      .int('Nominal harus berupa angka bulat rupiah.')
      .positive('Total anggaran harus lebih dari Rp0.')
      .max(1_000_000_000_000, 'Nominal melebihi batas maksimum.'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal mulai tidak valid.'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal selesai tidak valid.'),
  })
  .refine((d) => d.startDate <= d.endDate, {
    message: 'Tanggal selesai harus sama atau setelah tanggal mulai.',
    path: ['endDate'],
  });

type BudgetFormValues = z.infer<typeof budgetSchema>;

export function BudgetsPage() {
  const {
    budgets,
    transactions,
    customCategories,
    canManageBudgets,
    addBudget,
    updateBudget,
    deleteBudget,
    scope,
    activeGroup,
  } = useWorkspace();
  const { isPremium } = usePremium();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const todayKey = useMemo(() => getTodayJakartaDateKey(), []);
  const weekRange = useMemo(() => getWeekRangeJakarta(todayKey), [todayKey]);
  const monthRange = useMemo(() => getMonthRangeJakarta(todayKey), [todayKey]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>({});
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const expenseCategories = useMemo(
    () => mergeCategories(customCategories, 'expense'),
    [customCategories]
  );

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: 'Anggaran Mingguan Kos',
      periodType: 'weekly',
      amount: 300000,
      startDate: weekRange.startDate,
      endDate: weekRange.endDate,
    },
  });

  const openCreateModal = () => {
    setEditingBudget(null);
    setCategoryLimits({});
    form.reset({
      name: 'Anggaran Mingguan Kos',
      periodType: 'weekly',
      amount: 300000,
      startDate: weekRange.startDate,
      endDate: weekRange.endDate,
    });
    setFormOpen(true);
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setCategoryLimits({ ...(budget.categoryLimits || {}) });
    form.reset({
      name: budget.name,
      periodType: budget.periodType,
      amount: budget.amount,
      startDate: budget.startDate,
      endDate: budget.endDate,
    });
    setFormOpen(true);
  };

  const handlePeriodChange = (period: BudgetPeriodType) => {
    form.setValue('periodType', period);
    if (period === 'weekly') {
      form.setValue('startDate', weekRange.startDate);
      form.setValue('endDate', weekRange.endDate);
      if (!editingBudget) form.setValue('name', 'Anggaran Mingguan Kos');
    } else if (period === 'monthly') {
      form.setValue('startDate', monthRange.startDate);
      form.setValue('endDate', monthRange.endDate);
      if (!editingBudget) form.setValue('name', 'Anggaran Bulanan Kos');
    }
  };

  const handleAutoBreakdown = () => {
    if (!isPremium) {
      navigate('/premium');
      return;
    }
    const total = form.getValues('amount');
    if (!total || total <= 0) {
      showToast({
        type: 'warning',
        title: 'Isi Total Anggaran terlebih dahulu',
      });
      return;
    }
    const suggested = suggestAutomaticCategoryLimits(total, transactions);
    setCategoryLimits(suggested);
    showToast({
      type: 'success',
      title: 'Rincian anggaran otomatis diterapkan',
      description: 'Batas per kategori dihitung berdasarkan riwayat atau standar anak kos.',
    });
  };

  const onSubmit = async (values: BudgetFormValues) => {
    const cleanLimits: Record<string, number> = {};
    for (const [k, v] of Object.entries(categoryLimits)) {
      if (v > 0) cleanLimits[k] = Math.round(v);
    }

    // Warn about overlapping active budget of same scope and periodType
    const overlapping = budgets.find(
      (b) =>
        b.status === 'active' &&
        b.id !== editingBudget?.id &&
        b.periodType === values.periodType &&
        b.startDate <= values.endDate &&
        b.endDate >= values.startDate
    );

    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, {
          ...values,
          categoryLimits: cleanLimits,
          status: editingBudget.status,
        });
        showToast({ type: 'success', title: 'Anggaran berhasil diperbarui' });
      } else {
        await addBudget({
          ...values,
          categoryLimits: cleanLimits,
          status: 'active',
        });
        showToast({
          type: 'success',
          title: 'Anggaran berhasil dibuat',
          description: overlapping
            ? `Catatan: Ada anggaran aktif lain (${overlapping.name}) di rentang tanggal ini.`
            : undefined,
        });
      }
      setFormOpen(false);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal menyimpan anggaran',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    }
  };

  const handleToggleArchive = async (b: Budget) => {
    try {
      await updateBudget(b.id, {
        name: b.name,
        amount: b.amount,
        periodType: b.periodType,
        startDate: b.startDate,
        endDate: b.endDate,
        categoryLimits: b.categoryLimits,
        status: b.status === 'active' ? 'archived' : 'active',
      });
      showToast({
        type: 'success',
        title: b.status === 'active' ? 'Anggaran diarsipkan' : 'Anggaran diaktifkan kembali',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal memperbarui status anggaran',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBudget(deleteTarget.id);
      showToast({ type: 'success', title: 'Anggaran dihapus' });
      setDeleteTarget(null);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal menghapus anggaran',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Pengaturan Anggaran</h1>
          <p className="text-xs text-slate-500">
            Atur batas anggaran mingguan, bulanan, atau rentang kustom untuk{' '}
            {scope === 'group' && activeGroup ? `kelompok ${activeGroup.name}` : 'ruang kerja pribadi'}.
          </p>
        </div>

        {canManageBudgets && (
          <button
            type="button"
            onClick={openCreateModal}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Atur Anggaran Baru
          </button>
        )}
      </div>

      {!canManageBudgets && scope === 'group' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
          Hanya pemilik kelompok yang dapat membuat atau mengubah anggaran kelompok.
        </div>
      )}

      {budgets.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Belum ada anggaran"
          description="Buat anggaran mingguan (misal Rp300.000) untuk memantau pengeluaran dan mendapatkan peringatan otomatis."
          actionLabel={canManageBudgets ? 'Buat Anggaran Pertama' : undefined}
          onAction={canManageBudgets ? openCreateModal : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {budgets.map((b) => {
            const progress = calculateBudgetProgress(b, transactions, todayKey, customCategories);
            const barPercent = Math.min(100, Math.max(0, progress.percentage));
            const barColor =
              progress.percentage >= 100
                ? 'bg-rose-600'
                : progress.percentage >= 85
                  ? 'bg-amber-500'
                  : 'bg-emerald-600';

            return (
              <div
                key={b.id}
                className={`rounded-2xl border bg-white p-5 space-y-4 ${
                  b.status === 'archived' ? 'border-slate-200 opacity-75' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{b.name}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {b.periodType === 'weekly'
                        ? 'Mingguan'
                        : b.periodType === 'monthly'
                          ? 'Bulanan'
                          : 'Kustom'}{' '}
                      · {formatDateId(b.startDate)} – {formatDateId(b.endDate)} ·{' '}
                      {b.status === 'active' ? 'Aktif' : 'Diarsipkan'}
                    </p>
                  </div>

                  {canManageBudgets && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        aria-label="Edit anggaran"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(b)}
                        aria-label="Hapus anggaran"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline justify-between text-sm mb-2">
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatRupiah(progress.used)}
                      <span className="font-normal text-slate-500">
                        {' '}
                        / {formatRupiah(b.amount)}
                      </span>
                    </span>
                    <span className="font-bold text-slate-800 tabular-nums">
                      {progress.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Sisa:{' '}
                      <strong
                        className={`tabular-nums ${
                          progress.remaining < 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {formatRupiah(progress.remaining)}
                      </strong>
                    </span>
                    <span className="tabular-nums">
                      Batas aman: {formatRupiah(progress.safeDailySpend)}/hari
                    </span>
                  </div>
                </div>

                {/* Category Limits Breakdown */}
                {Object.keys(b.categoryLimits || {}).length > 0 && (
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-700">Batas per Kategori</p>
                    <div className="space-y-2">
                      {progress.categoryBreakdown
                        .filter((c) => c.limit !== null)
                        .map((cat) => {
                          const pct = cat.limit ? Math.min(100, (cat.spent / cat.limit) * 100) : 0;
                          const over = cat.limit ? cat.spent > cat.limit : false;
                          return (
                            <div key={cat.categoryKey} className="text-xs">
                              <div className="flex justify-between mb-1">
                                <span className="text-slate-700 font-medium">{cat.categoryName}</span>
                                <span
                                  className={`tabular-nums font-semibold ${
                                    over ? 'text-rose-600' : 'text-slate-700'
                                  }`}
                                >
                                  {formatRupiah(cat.spent)} / {formatRupiah(cat.limit || 0)}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    over ? 'bg-rose-500' : 'bg-emerald-600'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {canManageBudgets && (
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleToggleArchive(b)}
                      className="text-xs font-semibold text-slate-600 hover:text-emerald-800 hover:underline"
                    >
                      {b.status === 'active' ? 'Arsipkan Anggaran' : 'Aktifkan Kembali'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Budget Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingBudget ? 'Edit Anggaran' : 'Atur Anggaran'}
        description="Tentukan batas pengeluaran agar uang sakumu cukup sampai akhir periode."
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Period Type Toggle */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
            {(
              [
                { key: 'weekly', label: 'Mingguan' },
                { key: 'monthly', label: 'Bulanan' },
                { key: 'custom', label: 'Kustom' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => handlePeriodChange(opt.key)}
                className={`min-h-[42px] rounded-lg text-xs font-semibold transition-colors ${
                  form.watch('periodType') === opt.key
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="budget-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Anggaran
            </label>
            <input
              id="budget-name"
              type="text"
              {...form.register('name')}
              placeholder="Contoh: Anggaran Mingguan Kos"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-rose-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="budget-amount" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Total Anggaran
            </label>
            <Controller
              control={form.control}
              name="amount"
              render={({ field }) => (
                <CurrencyInput
                  id="budget-amount"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="300.000"
                />
              )}
            />
            {form.formState.errors.amount && (
              <p className="mt-1 text-xs text-rose-600">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="budget-start" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Mulai
              </label>
              <input
                id="budget-start"
                type="date"
                {...form.register('startDate')}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="budget-end" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Selesai
              </label>
              <input
                id="budget-end"
                type="date"
                {...form.register('endDate')}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900"
              />
              {form.formState.errors.endDate && (
                <p className="mt-1 text-xs text-rose-600">{form.formState.errors.endDate.message}</p>
              )}
            </div>
          </div>

          {/* Optional Category Limits */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-900">Batas Kategori (Opsional)</p>
                <p className="text-[11px] text-slate-500">
                  Isi batas per pos kebutuhan seperti Makan, Transportasi, Kos, atau Laundry.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutoBreakdown}
                className="min-h-[36px] inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                {isPremium ? <Sparkles className="h-3.5 w-3.5" /> : <Crown className="h-3.5 w-3.5" />}
                Rincian Otomatis {!isPremium && '(Premium)'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
              {expenseCategories.map((cat) => (
                <div key={cat.key}>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {cat.name}
                  </label>
                  <CurrencyInput
                    value={categoryLimits[cat.key] || 0}
                    onChange={(val) =>
                      setCategoryLimits((prev) => ({
                        ...prev,
                        [cat.key]: val,
                      }))
                    }
                    placeholder="Opsional"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="min-h-[44px] rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="min-h-[44px] rounded-xl bg-emerald-700 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {form.formState.isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Anggaran"
        message={
          deleteTarget
            ? `Apakah kamu yakin ingin menghapus anggaran "${deleteTarget.name}"?`
            : ''
        }
        loading={deleting}
      />
    </div>
  );
}
