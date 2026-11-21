import React, { useState } from 'react';
import { KeyRound, Plus, Trash2, User } from 'lucide-react';
import { useAuth } from '@/src/app/AuthContext';
import { useToast } from '@/src/app/ToastContext';
import { useWorkspace } from '@/src/app/WorkspaceContext';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';

const PRESET_AVATARS = [
  { label: 'Default', url: '' },
  {
    label: 'Hijau Mint',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23047857"/><circle cx="32" cy="24" r="10" fill="%23ECFDF5"/><path d="M14 54c2-11 10-16 18-16s16 5 18 16" fill="%23ECFDF5"/></svg>',
  },
  {
    label: 'Biru Langit',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%230284C7"/><circle cx="32" cy="24" r="10" fill="%23F0F9FF"/><path d="M14 54c2-11 10-16 18-16s16 5 18 16" fill="%23F0F9FF"/></svg>',
  },
  {
    label: 'Amber Hangat',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="%23D97706"/><circle cx="32" cy="24" r="10" fill="%23FFFBEB"/><path d="M14 54c2-11 10-16 18-16s16 5 18 16" fill="%23FFFBEB"/></svg>',
  },
];

export function AccountPage() {
  const {
    firebaseUser,
    profile,
    isDemoMode,
    updateUserProfile,
    changeUserPassword,
    deleteUserAccount,
  } = useAuth();
  const { customCategories, addCustomCategory, deleteCustomCategory, canManageBudgets } =
    useWorkspace();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const hasPasswordProvider =
    firebaseUser?.providerData.some((p) => p.providerId === 'password') ?? false;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoMode) return;
    if (!displayName.trim()) {
      showToast({ type: 'warning', title: 'Nama tampilan tidak boleh kosong' });
      return;
    }
    setSavingProfile(true);
    try {
      await updateUserProfile({ displayName, photoURL });
      showToast({ type: 'success', title: 'Profil berhasil diperbarui' });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal memperbarui profil',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast({ type: 'warning', title: 'Kata sandi baru minimal 6 karakter' });
      return;
    }
    setChangingPass(true);
    try {
      await changeUserPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      showToast({ type: 'success', title: 'Kata sandi berhasil diubah' });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal mengubah kata sandi',
        description: err instanceof Error ? err.message : 'Periksa kata sandi saat ini.',
      });
    } finally {
      setChangingPass(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await addCustomCategory({
        type: newCatType,
        name: newCatName.trim(),
        icon: 'Tag',
        color: newCatType === 'income' ? '#047857' : '#0284C7',
      });
      setNewCatName('');
      showToast({ type: 'success', title: 'Kategori kustom ditambahkan' });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal menambah kategori',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteUserAccount(deletePassword || undefined);
      showToast({ type: 'info', title: 'Akun berhasil dihapus' });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal menghapus akun',
        description: err instanceof Error ? err.message : 'Masuk ulang terlebih dahulu.',
      });
    } finally {
      setDeletingAccount(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Akun &amp; Profil</h1>
        <p className="text-xs text-slate-500">
          Perbarui nama tampilan, avatar, kategori kustom, dan keamanan akun SAKUIN.
        </p>
      </div>

      {/* Profile Section */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5"
      >
        <div className="flex items-center gap-4">
          {photoURL ? (
            <img
              src={photoURL}
              alt={displayName || 'Foto profil'}
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-2xl object-cover border border-slate-200"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
              <User className="h-7 w-7" />
            </div>
          )}
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {profile?.displayName || 'Pengguna Sakuin'}
            </h2>
            <p className="text-xs text-slate-500">{profile?.email}</p>
          </div>
        </div>

        <div>
          <label htmlFor="acc-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Nama Tampilan
          </label>
          <input
            id="acc-name"
            type="text"
            required
            disabled={isDemoMode}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm disabled:bg-slate-50"
          />
        </div>

        <div>
          <label htmlFor="acc-photo" className="block text-xs font-semibold text-slate-700 mb-1.5">
            URL Foto Profil atau Pilih Avatar
          </label>
          <input
            id="acc-photo"
            type="text"
            disabled={isDemoMode}
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            placeholder="https://... (opsional)"
            className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm disabled:bg-slate-50"
          />
          <div className="mt-2.5 flex flex-wrap gap-2">
            {PRESET_AVATARS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={isDemoMode}
                onClick={() => setPhotoURL(preset.url)}
                className={`min-h-[36px] rounded-xl border px-3 py-1 text-xs font-semibold ${
                  photoURL === preset.url
                    ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {!isDemoMode && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="min-h-[44px] rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </div>
        )}
      </form>

      {/* Custom Categories Manager */}
      {!isDemoMode && canManageBudgets && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Kategori Kustom</h2>
            <p className="text-xs text-slate-500">
              Tambahkan kategori khusus di ruang kerja aktif saat ini.
            </p>
          </div>

          <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2.5">
            <select
              value={newCatType}
              onChange={(e) => setNewCatType(e.target.value as 'expense' | 'income')}
              className="min-h-[44px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
            </select>
            <input
              type="text"
              maxLength={50}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Nama kategori baru (misal: Kopi & Camilan)"
              className="flex-1 min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
            />
            <button
              type="submit"
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              Tambah
            </button>
          </form>

          {customCategories.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {customCategories.map((c) => (
                <li key={c.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <span>
                    <strong className="text-slate-900">{c.name}</strong>
                    <span className="ml-2 text-xs text-slate-500">
                      ({c.type === 'income' ? 'Pemasukan' : 'Pengeluaran'})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteCustomCategory(c.id)}
                    aria-label={`Hapus kategori ${c.name}`}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Change Password */}
      {!isDemoMode && hasPasswordProvider && (
        <form
          onSubmit={handleChangePassword}
          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">Ubah Kata Sandi</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi Saat Ini
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi Baru
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changingPass}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              {changingPass ? 'Memperbarui...' : 'Perbarui Kata Sandi'}
            </button>
          </div>
        </form>
      )}

      {/* Danger Zone: Delete Account */}
      {!isDemoMode && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-rose-900">Hapus Akun</h2>
            <p className="mt-0.5 text-xs text-rose-700">
              Menghapus profil pengguna dan kredensial akun secara permanen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            className="min-h-[42px] rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 whitespace-nowrap"
          >
            Hapus Akun Saya
          </button>
        </section>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Konfirmasi Hapus Akun"
        message={
          hasPasswordProvider
            ? 'Masukkan kata sandi saat ini pada kolom akun atau pastikan kamu baru saja masuk sebelum menghapus akun.'
            : 'Tindakan ini akan menghapus akunmu dari SAKUIN secara permanen.'
        }
        confirmLabel="Ya, Hapus Akun"
        loading={deletingAccount}
      />
    </div>
  );
}
