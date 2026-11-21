import React, { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatInTimeZone } from 'date-fns-tz';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/src/app/ToastContext';
import { useWorkspace } from '@/src/app/WorkspaceContext';
import { mergeCategories } from '@/src/constants/categories';
import { CurrencyInput } from '@/src/components/ui/CurrencyInput';
import { Modal } from '@/src/components/ui/Modal';
import {
  getTodayJakartaDateKey,
  JAKARTA_TIMEZONE,
  jakartaDateKeyToDate,
} from '@/src/lib/dates';
import type { Transaction, TransactionType } from '@/src/types';

const txSchema = z.object({
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'Pilih kategori transaksi.'),
  amount: z
    .number()
    .int('Nominal harus berupa angka bulat rupiah.')
    .positive('Nominal harus lebih dari Rp0.')
    .max(1_000_000_000_000, 'Nominal melebihi batas maksimum.'),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pilih tanggal yang valid.'),
  timeHHmm: z.string().regex(/^\d{2}:\d{2}$/, 'Format waktu harus JJ:MM.'),
  note: z.string().max(200, 'Keterangan maksimal 200 karakter.'),
});

type TxFormValues = z.infer<typeof txSchema>;

interface TransactionFormModalProps {
  open: boolean;
  onClose: () => void;
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
}

export function TransactionFormModal({
  open,
  onClose,
  initialType = 'expense',
  editingTransaction = null,
}: TransactionFormModalProps) {
  const { customCategories, addTransaction, updateTransaction, canAddTransaction } =
    useWorkspace();
  const { showToast } = useToast();

  const defaultTimeWib = useMemo(
    () => formatInTimeZone(new Date(), JAKARTA_TIMEZONE, 'HH:mm'),
    []
  );

  const form = useForm<TxFormValues>({
    resolver: zodResolver(txSchema),
    defaultValues: {
      type: initialType,
      category: initialType === 'income' ? 'uang_saku' : 'makan',
      amount: 0,
      dateKey: getTodayJakartaDateKey(),
      timeHHmm: defaultTimeWib,
      note: '',
    },
  });

  const watchedType = form.watch('type');
  const categories = useMemo(
    () => mergeCategories(customCategories, watchedType),
    [customCategories, watchedType]
  );

  useEffect(() => {
    if (!open) return;
    if (editingTransaction) {
      form.reset({
        type: editingTransaction.type,
        category: editingTransaction.category,
        amount: editingTransaction.amount,
        dateKey: editingTransaction.dateKey,
        timeHHmm: formatInTimeZone(editingTransaction.date, JAKARTA_TIMEZONE, 'HH:mm'),
        note: editingTransaction.note,
      });
    } else {
      form.reset({
        type: initialType,
        category: initialType === 'income' ? 'uang_saku' : 'makan',
        amount: 0,
        dateKey: getTodayJakartaDateKey(),
        timeHHmm: formatInTimeZone(new Date(), JAKARTA_TIMEZONE, 'HH:mm'),
        note: '',
      });
    }
  }, [open, editingTransaction, initialType, form]);

  // Keep category valid when switching income <-> expense
  useEffect(() => {
    const currentCat = form.getValues('category');
    if (!categories.some((c) => c.key === currentCat) && categories.length > 0) {
      form.setValue('category', categories[0].key);
    }
  }, [categories, form]);

  const onSubmit = async (values: TxFormValues) => {
    if (!canAddTransaction && !editingTransaction) {
      showToast({
        type: 'warning',
        title: 'Tidak dapat mencatat transaksi',
        description: 'Mode Demo hanya bisa dibaca atau izin kelompok membatasi penambahan transaksi.',
      });
      return;
    }

    try {
      const dateInstant = jakartaDateKeyToDate(values.dateKey, values.timeHHmm);
      const payload = {
        type: values.type,
        amount: values.amount,
        category: values.category,
        dateKey: values.dateKey,
        date: dateInstant,
        note: values.note,
      };

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, payload);
        showToast({ type: 'success', title: 'Transaksi berhasil diperbarui' });
      } else {
        await addTransaction(payload);
        showToast({
          type: 'success',
          title: values.type === 'income' ? 'Pemasukan dicatat' : 'Pengeluaran dicatat',
        });
      }
      onClose();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal menyimpan transaksi',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingTransaction ? 'Edit Transaksi' : 'Tambah Transaksi'}
      description="Catat pemasukan atau pengeluaranmu sesuai waktu WIB."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Segmented toggle Pemasukan | Pengeluaran */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => form.setValue('type', 'income')}
            className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
              watchedType === 'income'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pemasukan
          </button>
          <button
            type="button"
            onClick={() => form.setValue('type', 'expense')}
            className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
              watchedType === 'expense'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pengeluaran
          </button>
        </div>

        {/* Category */}
        <div>
          <label htmlFor="tx-category" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Kategori
          </label>
          <select
            id="tx-category"
            {...form.register('category')}
            className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            {categories.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.name}
              </option>
            ))}
          </select>
          {form.formState.errors.category && (
            <p className="mt-1 text-xs text-rose-600">{form.formState.errors.category.message}</p>
          )}
        </div>

        {/* Nominal */}
        <div>
          <label htmlFor="tx-amount" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Nominal
          </label>
          <Controller
            control={form.control}
            name="amount"
            render={({ field }) => (
              <CurrencyInput
                id="tx-amount"
                value={field.value}
                onChange={field.onChange}
                placeholder="Contoh: 25.000"
                aria-invalid={Boolean(form.formState.errors.amount)}
              />
            )}
          />
          {form.formState.errors.amount && (
            <p className="mt-1 text-xs text-rose-600">{form.formState.errors.amount.message}</p>
          )}
        </div>

        {/* Date & Time WIB */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="tx-date" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tanggal (WIB)
            </label>
            <input
              id="tx-date"
              type="date"
              {...form.register('dateKey')}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            />
            {form.formState.errors.dateKey && (
              <p className="mt-1 text-xs text-rose-600">{form.formState.errors.dateKey.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="tx-time" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Jam (WIB)
            </label>
            <input
              id="tx-time"
              type="time"
              {...form.register('timeHHmm')}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="tx-note" className="block text-xs font-semibold text-slate-700">
              Keterangan (opsional)
            </label>
            <span className="text-xs text-slate-400 tabular-nums">
              {form.watch('note').length}/200
            </span>
          </div>
          <textarea
            id="tx-note"
            rows={2}
            maxLength={200}
            placeholder="Tulis keterangan (misal: Makan siang warteg)"
            {...form.register('note')}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          />
          {form.formState.errors.note && (
            <p className="mt-1 text-xs text-rose-600">{form.formState.errors.note.message}</p>
          )}
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="min-h-[44px] rounded-xl bg-emerald-700 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60"
          >
            {form.formState.isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
