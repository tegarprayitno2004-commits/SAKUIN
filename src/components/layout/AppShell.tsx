import React, { useState } from 'react';
import {
  BarChart3,
  Bell,
  ChevronDown,
  Crown,
  FileText,
  Home,
  LayoutGrid,
  Lightbulb,
  LogOut,
  PiggyBank,
  Plus,
  ReceiptText,
  ShieldCheck,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/app/AuthContext';
import { useWorkspace } from '@/src/app/WorkspaceContext';
import { Modal } from '@/src/components/ui/Modal';
import { SakuinLogo } from '@/src/components/ui/SakuinLogo';
import { TransactionFormModal } from '@/src/features/transactions/TransactionFormModal';
import type { TransactionType } from '@/src/types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, logout, isDemoMode, exitDemoMode, firestoreOnline } = useAuth();
  const {
    activeWorkspaceId,
    activeGroup,
    groups,
    unreadNotificationCount,
    switchWorkspace,
    canAddTransaction,
    isPremium,
  } = useWorkspace();

  const navigate = useNavigate();
  const location = useLocation();
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txInitialType, setTxInitialType] = useState<TransactionType>('expense');
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  const sidebarItems: NavItem[] = [
    { to: '/', label: 'Beranda', icon: Home },
    { to: '/transaksi', label: 'Transaksi', icon: ReceiptText },
    { to: '/anggaran', label: 'Anggaran', icon: Wallet },
    { to: '/laporan', label: 'Laporan', icon: BarChart3 },
    { to: '/evaluasi', label: 'Evaluasi', icon: Lightbulb },
    { to: '/peringatan', label: 'Peringatan', icon: Bell, badge: unreadNotificationCount },
    { to: '/kelompok', label: 'Kelompok', icon: Users },
    { to: '/tabungan', label: 'Tabungan', icon: PiggyBank },
    { to: '/premium', label: 'SAKUIN Premium', icon: Crown },
    { to: '/akun', label: 'Akun & Profil', icon: User },
    { to: '/akad', label: 'Akad & Informasi', icon: ShieldCheck },
  ];

  const pageTitleMap: Record<string, string> = {
    '/': 'Beranda',
    '/transaksi': 'Riwayat Transaksi',
    '/anggaran': 'Pengaturan Anggaran',
    '/laporan': 'Laporan Keuangan',
    '/evaluasi': 'Evaluasi Keuangan',
    '/peringatan': 'Peringatan Anggaran',
    '/kelompok': 'Kelompok Keuangan',
    '/tabungan': 'Tabungan Digital',
    '/premium': 'SAKUIN Premium',
    '/akun': 'Akun & Profil',
    '/akad': 'Akad & Informasi',
  };

  const currentPageTitle = pageTitleMap[location.pathname] || 'SAKUIN';

  const openAddTransaction = (type: TransactionType = 'expense') => {
    setTxInitialType(type);
    setTxModalOpen(true);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white lg:sticky lg:top-0 lg:h-[100dvh]">
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
          <SakuinLogo size="md" />
          {isPremium && (
            <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
              <Crown className="h-3.5 w-3.5" aria-hidden="true" />
              Pro
            </span>
          )}
        </div>

        {/* Workspace Switcher inside Sidebar */}
        <div className="px-4 py-3 border-b border-slate-100">
          <label
            htmlFor="desktop-workspace-select"
            className="block text-xs font-medium text-slate-500 mb-1.5"
          >
            Ruang Kerja
          </label>
          <div className="relative">
            <select
              id="desktop-workspace-select"
              value={activeWorkspaceId}
              onChange={(e) => switchWorkspace(e.target.value)}
              className="w-full min-h-[40px] appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-8 py-2 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <option value="personal">Pribadi</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  Kelompok: {g.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-slate-500" />
          </div>
        </div>

        <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between min-h-[42px] rounded-xl px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="ml-2 inline-flex min-w-[20px] h-5 items-center justify-center rounded-md bg-rose-600 px-1.5 text-[11px] font-bold text-white tabular-nums">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 min-h-[44px] rounded-xl px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{isDemoMode ? 'Keluar Mode Demo' : 'Keluar'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (Desktop & Mobile) */}
        <header className="sticky top-0 z-30 h-14 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between gap-4 pt-safe">
          <div className="flex items-center gap-3 min-w-0">
            <div className="lg:hidden">
              <SakuinLogo size="sm" showWordmark={false} />
            </div>
            <h2 className="text-base font-bold text-slate-900 truncate">{currentPageTitle}</h2>
            <span className="hidden sm:inline text-slate-300" aria-hidden="true">
              /
            </span>
            <span className="hidden sm:inline text-xs font-medium text-slate-500 truncate">
              {activeGroup ? `Kelompok: ${activeGroup.name}` : 'Pribadi'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Compact Mobile Workspace Switcher */}
            <div className="lg:hidden relative">
              <select
                aria-label="Pilih ruang kerja"
                value={activeWorkspaceId}
                onChange={(e) => switchWorkspace(e.target.value)}
                className="min-h-[40px] max-w-[130px] appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-2.5 pr-7 py-1.5 text-xs font-semibold text-slate-800 truncate"
              >
                <option value="personal">Pribadi</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-3 h-3.5 w-3.5 text-slate-500" />
            </div>

            <button
              type="button"
              onClick={() => navigate('/peringatan')}
              aria-label="Lihat peringatan anggaran"
              className="relative min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Bell className="h-5 w-5" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-600" />
              )}
            </button>

            <button
              type="button"
              onClick={() => openAddTransaction('expense')}
              disabled={!canAddTransaction}
              className="hidden sm:inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Catat Transaksi
            </button>
          </div>
        </header>

        {/* Demo Mode or Offline Banner */}
        {isDemoMode && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
            <span>
              <strong>Mode Demo (Hanya Baca):</strong> Kamu sedang melihat contoh data lokal. Masuk akun untuk mencatat dan menyimpan data ke cloud.
            </span>
            <button
              type="button"
              onClick={() => {
                exitDemoMode();
                navigate('/login');
              }}
              className="font-bold underline hover:text-amber-950"
            >
              Masuk / Daftar Akun
            </button>
          </div>
        )}

        {!firestoreOnline && !isDemoMode && (
          <div className="bg-slate-800 text-white px-4 lg:px-8 py-2 text-xs">
            Mode luring aktif: perubahan akan disinkronkan saat koneksi internet kembali normal.
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Navigasi bawah"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                isActive ? 'text-emerald-700 font-semibold' : 'text-slate-500'
              }`
            }
          >
            <Home className="h-5 w-5" />
            <span>Beranda</span>
          </NavLink>

          <NavLink
            to="/transaksi"
            className={({ isActive }) =>
              `min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                isActive ? 'text-emerald-700 font-semibold' : 'text-slate-500'
              }`
            }
          >
            <ReceiptText className="h-5 w-5" />
            <span>Transaksi</span>
          </NavLink>

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => openAddTransaction('expense')}
              disabled={!canAddTransaction}
              aria-label="Tambah transaksi baru"
              className="h-12 w-12 -mt-4 rounded-2xl bg-emerald-700 text-white shadow-md hover:bg-emerald-800 active:scale-95 transition-transform flex items-center justify-center disabled:opacity-50"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>

          <NavLink
            to="/anggaran"
            className={({ isActive }) =>
              `min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                isActive ? 'text-emerald-700 font-semibold' : 'text-slate-500'
              }`
            }
          >
            <Wallet className="h-5 w-5" />
            <span>Anggaran</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setMoreSheetOpen(true)}
            className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              moreSheetOpen ? 'text-emerald-700 font-semibold' : 'text-slate-500'
            }`}
          >
            <LayoutGrid className="h-5 w-5" />
            <span>Lainnya</span>
          </button>
        </div>
      </nav>

      {/* Mobile "Lainnya" Sheet */}
      <Modal
        open={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        title="Menu Lainnya"
        description={profile ? `Masuk sebagai ${profile.displayName}` : undefined}
      >
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { to: '/laporan', label: 'Laporan', icon: BarChart3 },
            { to: '/evaluasi', label: 'Evaluasi', icon: Lightbulb },
            {
              to: '/peringatan',
              label: `Peringatan${unreadNotificationCount > 0 ? ` (${unreadNotificationCount})` : ''}`,
              icon: Bell,
            },
            { to: '/kelompok', label: 'Kelompok', icon: Users },
            { to: '/tabungan', label: 'Tabungan', icon: PiggyBank },
            { to: '/premium', label: 'SAKUIN Premium', icon: Crown },
            { to: '/akun', label: 'Akun & Profil', icon: User },
            { to: '/akad', label: 'Akad & Informasi', icon: FileText },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => {
                  setMoreSheetOpen(false);
                  navigate(item.to);
                }}
                className="min-h-[52px] flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-emerald-50 hover:border-emerald-200"
              >
                <Icon className="h-4 w-4 text-emerald-700 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setMoreSheetOpen(false);
            handleLogout();
          }}
          className="mt-4 w-full min-h-[46px] flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 hover:bg-rose-100"
        >
          <LogOut className="h-4 w-4" />
          {isDemoMode ? 'Keluar Mode Demo' : 'Keluar Akun'}
        </button>
      </Modal>

      <TransactionFormModal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        initialType={txInitialType}
      />
    </div>
  );
}
