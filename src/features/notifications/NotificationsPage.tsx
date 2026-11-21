import React, { useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCheck, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/src/app/WorkspaceContext';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Modal } from '@/src/components/ui/Modal';
import { calculateBudgetProgress } from '@/src/lib/calculations';
import { formatDateId, getTodayJakartaDateKey } from '@/src/lib/dates';
import { formatRupiah } from '@/src/lib/money';
import type { BudgetNotification } from '@/src/types';

export function NotificationsPage() {
  const {
    notifications,
    budgets,
    transactions,
    customCategories,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useWorkspace();
  const navigate = useNavigate();
  const todayKey = useMemo(() => getTodayJakartaDateKey(), []);
  const [selectedNotif, setSelectedNotif] = useState<BudgetNotification | null>(null);

  const selectedBudgetProgress = useMemo(() => {
    if (!selectedNotif) return null;
    const budget = budgets.find((b) => b.id === selectedNotif.budgetId);
    if (!budget) return null;
    return calculateBudgetProgress(budget, transactions, todayKey, customCategories);
  }, [selectedNotif, budgets, transactions, todayKey, customCategories]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Peringatan Anggaran</h1>
          <p className="text-xs text-slate-500">
            Notifikasi otomatis saat pengeluaran mencapai 70%, 85%, 100%, atau melampaui anggaran.
          </p>
        </div>

        {unreadNotificationCount > 0 && (
          <button
            type="button"
            onClick={() => markAllNotificationsRead()}
            className="min-h-[42px] inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
          >
            <CheckCheck className="h-4 w-4 text-emerald-700" />
            Tandai Semua Dibaca ({unreadNotificationCount})
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Belum ada peringatan anggaran"
          description="Pengeluaranmu masih aman di bawah ambang batas 70%, atau belum ada anggaran aktif yang terhubung."
          actionLabel="Atur Anggaran"
          onAction={() => navigate('/anggaran')}
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const linkedBudget = budgets.find((b) => b.id === notif.budgetId);
            const prog = linkedBudget
              ? calculateBudgetProgress(linkedBudget, transactions, todayKey, customCategories)
              : null;

            const cardTone =
              notif.level === 'danger'
                ? 'border-rose-200 bg-rose-50/60'
                : notif.level === 'warning'
                  ? 'border-amber-200 bg-amber-50/60'
                  : 'border-emerald-200 bg-emerald-50/50';

            const Icon = notif.level === 'info' ? Info : AlertTriangle;

            return (
              <div
                key={notif.id}
                className={`rounded-2xl border p-5 space-y-3 ${
                  notif.isRead ? 'border-slate-200 bg-white' : cardTone
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        notif.level === 'danger'
                          ? 'bg-rose-100 text-rose-600'
                          : notif.level === 'warning'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        {notif.title}
                        {!notif.isRead && (
                          <span className="ml-2 text-xs font-semibold text-rose-600">· Baru</span>
                        )}
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                </div>

                {prog && (
                  <div className="rounded-xl bg-white border border-slate-200/80 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Sisa anggaran saat ini ({prog.budget.name})
                      </span>
                      <span
                        className={`font-bold tabular-nums ${
                          prog.remaining < 0 ? 'text-rose-600' : 'text-slate-900'
                        }`}
                      >
                        {formatRupiah(prog.remaining)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          prog.percentage >= 100
                            ? 'bg-rose-600'
                            : prog.percentage >= 85
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.min(100, prog.percentage)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => markNotificationRead(notif.id, !notif.isRead)}
                    className="min-h-[36px] text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline"
                  >
                    {notif.isRead ? 'Tandai Belum Dibaca' : 'Tandai Sudah Dibaca'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNotif(notif);
                      if (!notif.isRead) markNotificationRead(notif.id, true);
                    }}
                    className="min-h-[38px] rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                  >
                    Lihat Detail
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(selectedNotif)}
        onClose={() => setSelectedNotif(null)}
        title={selectedNotif?.title || 'Detail Peringatan'}
      >
        {selectedNotif && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">{selectedNotif.message}</p>
            {selectedBudgetProgress ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Anggaran</span>
                  <span className="font-bold text-slate-900">
                    {selectedBudgetProgress.budget.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Periode</span>
                  <span className="font-medium text-slate-800">
                    {formatDateId(selectedBudgetProgress.budget.startDate)} –{' '}
                    {formatDateId(selectedBudgetProgress.budget.endDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Terpakai</span>
                  <span className="font-bold text-rose-600 tabular-nums">
                    {formatRupiah(selectedBudgetProgress.used)} (
                    {selectedBudgetProgress.percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sisa</span>
                  <span className="font-bold text-emerald-700 tabular-nums">
                    {formatRupiah(selectedBudgetProgress.remaining)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Anggaran terkait sudah dihapus atau diarsipkan.</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedNotif(null);
                  navigate('/anggaran');
                }}
                className="min-h-[42px] rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                Buka Pengaturan Anggaran
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
