import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, ReceiptText, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/src/app/ToastContext';
import { useWorkspace } from '@/src/app/WorkspaceContext';
import { getCategoryMeta, mergeCategories } from '@/src/constants/categories';
import { CategoryIcon } from '@/src/components/ui/CategoryIcon';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { SkeletonBlock } from '@/src/components/ui/Skeleton';
import { TransactionFormModal } from '@/src/features/transactions/TransactionFormModal';
import { filterAndSearchTransactions } from '@/src/lib/calculations';
import { formatDateId } from '@/src/lib/dates';
import { formatRupiah } from '@/src/lib/money';
import type { Transaction, TransactionType } from '@/src/types';

export function TransactionsPage() {
  const {
    transactions,
    customCategories,
    loadingData,
    hasMoreTransactions,
    loadMoreTransactions,
    canAddTransaction,
    canEditTransaction,
    deleteTransaction,
    scope,
  } = useWorkspace();
  const { showToast } = useToast();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const allCategories = useMemo(
    () => mergeCategories(customCategories),
    [customCategories]
  );

  const filtered = useMemo(
    () =>
      filterAndSearchTransactions(
        transactions,
        {
          search: debouncedSearch,
          type: typeFilter,
          category: categoryFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
        customCategories
      ),
    [transactions, debouncedSearch, typeFilter, categoryFilter, startDate, endDate, customCategories]
  );

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTransaction(deleteTarget.id);
      showToast({ type: 'success', title: 'Transaksi dihapus' });
      setDeleteTarget(null);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal menghapus transaksi',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Riwayat Transaksi</h1>
          <p className="text-xs text-slate-500">
            Cari, filter, ubah, atau hapus catatan pemasukan dan pengeluaranmu.
          </p>
        </div>
        {canAddTransaction && (
          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setFormOpen(true);
            }}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Tambah Transaksi
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari transaksi atau kategori..."
              aria-label="Cari transaksi"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            />
          </div>

          <select
            aria-label="Filter tipe transaksi"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="all">Semua Tipe</option>
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>

          <select
            aria-label="Filter kategori"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            <option value="all">Semua Kategori</option>
            {allCategories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name} ({c.type === 'income' ? 'Masuk' : 'Keluar'})
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              aria-label="Dari tanggal"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900"
            />
            <input
              type="date"
              aria-label="Sampai tanggal"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {loadingData ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-16" />
          <SkeletonBlock className="h-16" />
          <SkeletonBlock className="h-16" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Tidak ada transaksi ditemukan"
          description={
            transactions.length === 0
              ? 'Belum ada transaksi. Catat pengeluaran pertamamu!'
              : 'Tidak ada transaksi yang cocok dengan filter pencarianmu.'
          }
          actionLabel={transactions.length === 0 && canAddTransaction ? 'Tambah Transaksi' : undefined}
          onAction={
            transactions.length === 0 && canAddTransaction
              ? () => {
                  setEditingTx(null);
                  setFormOpen(true);
                }
              : undefined
          }
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
          {filtered.map((tx) => {
            const cat = getCategoryMeta(tx.category, customCategories);
            const editable = canEditTransaction(tx);

            return (
              <div
                key={tx.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <CategoryIcon iconName={cat.icon} color={cat.color} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {tx.note || cat.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 truncate">
                      {cat.name} · {formatDateId(tx.dateKey)}
                      {scope === 'group' ? ` · ${tx.createdByName}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-sm font-bold tabular-nums whitespace-nowrap ${
                      tx.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {formatRupiah(tx.type === 'income' ? tx.amount : -tx.amount, {
                      withSign: tx.type === 'income',
                    })}
                  </span>

                  {editable && (
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTx(tx);
                          setFormOpen(true);
                        }}
                        aria-label="Edit transaksi"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(tx)}
                        aria-label="Hapus transaksi"
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMoreTransactions && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMoreTransactions}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Muat lebih banyak
          </button>
        </div>
      )}

      <TransactionFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTx(null);
        }}
        editingTransaction={editingTx}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Transaksi"
        message={
          deleteTarget
            ? `Apakah kamu yakin ingin menghapus transaksi ${getCategoryMeta(deleteTarget.category, customCategories).name} sebesar ${formatRupiah(deleteTarget.amount)}? Saldo dan anggaran akan langsung diperbarui.`
            : ''
        }
        loading={deleting}
      />
    </div>
  );
}
