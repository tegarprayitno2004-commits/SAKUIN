import React, { useState } from 'react';
import { Crown, Pencil, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/app/AuthContext';
import { useToast } from '@/src/app/ToastContext';
import { useWorkspace } from '@/src/app/WorkspaceContext';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import { CurrencyInput } from '@/src/components/ui/CurrencyInput';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Modal } from '@/src/components/ui/Modal';
import { usePremium } from '@/src/hooks/usePremium';
import { formatDateId } from '@/src/lib/dates';
import { formatRupiah } from '@/src/lib/money';
import type { SavingsGoal } from '@/src/types';

export function SavingsPage() {
  const { isDemoMode } = useAuth();
  const { savingsGoals, canManageBudgets, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal } =
    useWorkspace();
  const { isPremium } = usePremium();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState(500000);
  const [currentAmount, setCurrentAmount] = useState(0);
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  const [depositTarget, setDepositTarget] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null);

  if (!isPremium) {
    return (
      <div className="max-w-xl mx-auto rounded-3xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <Crown className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-extrabold text-slate-900">
          Tabungan Digital Khusus SAKUIN Premium
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Tetapkan target dana darurat kos, bayar semester, atau laptop baru dan pantau progres
          setorannya. Aktifkan simulasi SAKUIN Premium gratis untuk mencoba fitur ini.
        </p>
        <button
          type="button"
          onClick={() => navigate('/premium')}
          className="mt-6 min-h-[44px] rounded-xl bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Lihat SAKUIN Premium
        </button>
      </div>
    );
  }

  const openCreate = () => {
    setEditingGoal(null);
    setName('');
    setTargetAmount(500000);
    setCurrentAmount(0);
    setDeadline('');
    setModalOpen(true);
  };

  const openEdit = (g: SavingsGoal) => {
    setEditingGoal(g);
    setName(g.name);
    setTargetAmount(g.targetAmount);
    setCurrentAmount(g.currentAmount);
    setDeadline(g.deadline);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || targetAmount <= 0) {
      showToast({ type: 'warning', title: 'Lengkapi nama target dan nominal > Rp0' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        targetAmount,
        currentAmount,
        deadline,
      };
      if (editingGoal) {
        await updateSavingsGoal(editingGoal.id, payload);
        showToast({ type: 'success', title: 'Target tabungan diperbarui' });
      } else {
        await addSavingsGoal(payload);
        showToast({ type: 'success', title: 'Target tabungan dibuat' });
      }
      setModalOpen(false);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal menyimpan target tabungan',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositTarget || depositAmount <= 0) return;
    try {
      await updateSavingsGoal(depositTarget.id, {
        name: depositTarget.name,
        targetAmount: depositTarget.targetAmount,
        currentAmount: depositTarget.currentAmount + depositAmount,
        deadline: depositTarget.deadline,
      });
      showToast({
        type: 'success',
        title: `Berhasil menambah ${formatRupiah(depositAmount)} ke "${depositTarget.name}"`,
      });
      setDepositTarget(null);
      setDepositAmount(0);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal menambah tabungan',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Tabungan Digital</h1>
          <p className="text-xs text-slate-500">
            Catat dan pantau progres target tabungan pribadimu atau kelompok (pencatatan target).
          </p>
        </div>

        {canManageBudgets && !isDemoMode && (
          <button
            type="button"
            onClick={openCreate}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            Target Tabungan Baru
          </button>
        )}
      </div>

      {savingsGoals.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Belum ada target tabungan"
          description="Mulai sisihkan sisa uang saku mingguan untuk dana darurat atau kebutuhan kuliah."
          actionLabel={canManageBudgets && !isDemoMode ? 'Buat Target Pertama' : undefined}
          onAction={canManageBudgets && !isDemoMode ? openCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savingsGoals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            return (
              <div key={goal.id} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{goal.name}</h2>
                    <p className="text-xs text-slate-500">
                      {goal.status === 'completed' ? 'Tercapai' : 'Berjalan'}
                      {goal.deadline ? ` · Target ${formatDateId(goal.deadline)}` : ''}
                    </p>
                  </div>
                  {canManageBudgets && !isDemoMode && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(goal)}
                        aria-label="Edit target"
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(goal)}
                        aria-label="Hapus target"
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-bold text-emerald-800 tabular-nums">
                      {formatRupiah(goal.currentAmount)}
                    </span>
                    <span className="text-slate-600 tabular-nums">
                      Target {formatRupiah(goal.targetAmount)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {canManageBudgets && !isDemoMode && goal.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={() => {
                      setDepositTarget(goal);
                      setDepositAmount(25000);
                    }}
                    className="w-full min-h-[40px] rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    + Catat Setoran Tabungan
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGoal ? 'Edit Target Tabungan' : 'Target Tabungan Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Target</label>
            <input
              type="text"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Dana Darurat Kos"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal Target</label>
            <CurrencyInput value={targetAmount} onChange={setTargetAmount} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Terkumpul Saat Ini
            </label>
            <CurrencyInput value={currentAmount} onChange={setCurrentAmount} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Batas Waktu (Opsional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-[42px] rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[42px] rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(depositTarget)}
        onClose={() => setDepositTarget(null)}
        title={`Catat Setoran: ${depositTarget?.name || ''}`}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleDeposit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nominal Setoran
            </label>
            <CurrencyInput value={depositAmount} onChange={setDepositAmount} />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDepositTarget(null)}
              className="min-h-[42px] rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="min-h-[42px] rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white"
            >
              Tambah Setoran
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteSavingsGoal(deleteTarget.id);
            showToast({ type: 'success', title: 'Target tabungan dihapus' });
            setDeleteTarget(null);
          }
        }}
        title="Hapus Target Tabungan"
        message={`Hapus target "${deleteTarget?.name || ''}"?`}
      />
    </div>
  );
}
