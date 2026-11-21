import React, { useEffect, useState } from 'react';
import {
  Copy,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  UserMinus,
  Users,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/src/app/AuthContext';
import { useToast } from '@/src/app/ToastContext';
import { useWorkspace } from '@/src/app/WorkspaceContext';
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { Modal } from '@/src/components/ui/Modal';
import { db } from '@/src/lib/firebase';
import { normalizeInviteCode } from '@/src/lib/inviteCode';
import type { Group, GroupMemberPermissions } from '@/src/types';

export function GroupsPage() {
  const { firebaseUser, isDemoMode } = useAuth();
  const {
    groups,
    myMemberships,
    activeWorkspaceId,
    activeGroup,
    activeGroupRole,
    activeGroupMembers,
    switchWorkspace,
    createGroup,
    joinGroupByCode,
    updateGroupInfo,
    updateGroupPermissions,
    regenerateGroupInviteCode,
    toggleGroupInviteCodeActive,
    removeGroupMember,
    leaveGroup,
    deleteGroup,
  } = useWorkspace();
  const { showToast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const [editInfoOpen, setEditInfoOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [inviteActive, setInviteActive] = useState<boolean>(true);
  const [confirmRemoveUid, setConfirmRemoveUid] = useState<string | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<Group | null>(null);
  const [confirmLeaveGroup, setConfirmLeaveGroup] = useState<Group | null>(null);

  useEffect(() => {
    if (!activeGroup?.inviteCode || isDemoMode) return;
    getDoc(doc(db, 'inviteCodes', activeGroup.inviteCode))
      .then((snap) => {
        if (snap.exists()) {
          setInviteActive(Boolean(snap.data().active));
        }
      })
      .catch(() => {});
  }, [activeGroup?.inviteCode, isDemoMode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      const created = await createGroup({ name: groupName, description: groupDesc });
      await switchWorkspace(created.id);
      showToast({
        type: 'success',
        title: `Kelompok "${created.name}" dibuat`,
        description: `Kode undangan: ${created.inviteCode}`,
      });
      setCreateOpen(false);
      setGroupName('');
      setGroupDesc('');
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal membuat kelompok',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoining(true);
    try {
      const joined = await joinGroupByCode(joinCode);
      await switchWorkspace(joined.id);
      showToast({
        type: 'success',
        title: `Berhasil bergabung ke "${joined.name}"`,
      });
      setJoinOpen(false);
      setJoinCode('');
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal bergabung ke kelompok',
        description: err instanceof Error ? err.message : 'Periksa kode undangan.',
      });
    } finally {
      setJoining(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast({ type: 'success', title: `Kode ${code} disalin` });
    } catch {
      showToast({ type: 'info', title: `Kode undangan: ${code}` });
    }
  };

  const handleRegenerateCode = async () => {
    if (!activeGroup) return;
    try {
      const nextCode = await regenerateGroupInviteCode(activeGroup.id, activeGroup.inviteCode);
      setInviteActive(true);
      showToast({
        type: 'success',
        title: 'Kode undangan diperbarui',
        description: `Kode baru: ${nextCode}`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal memperbarui kode',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    }
  };

  const handleToggleInviteActive = async () => {
    if (!activeGroup) return;
    try {
      const next = !inviteActive;
      await toggleGroupInviteCodeActive(activeGroup.inviteCode, next);
      setInviteActive(next);
      showToast({
        type: 'success',
        title: next ? 'Kode undangan diaktifkan' : 'Kode undangan dinonaktifkan',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal mengubah status kode',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    }
  };

  const handleTogglePerm = async (key: keyof GroupMemberPermissions) => {
    if (!activeGroup) return;
    const updated: GroupMemberPermissions = {
      ...activeGroup.memberPermissions,
      [key]: !activeGroup.memberPermissions[key],
    };
    try {
      await updateGroupPermissions(activeGroup.id, updated);
      showToast({ type: 'success', title: 'Izin anggota diperbarui' });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal memperbarui izin',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    }
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !editName.trim()) return;
    try {
      await updateGroupInfo(activeGroup.id, { name: editName, description: editDesc });
      showToast({ type: 'success', title: 'Informasi kelompok diperbarui' });
      setEditInfoOpen(false);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal memperbarui kelompok',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Kelompok Keuangan</h1>
          <p className="text-xs text-slate-500">
            Kelola kas bersama teman sekamar kos, patungan makan, atau dana kegiatan mahasiswa.
          </p>
        </div>

        {!isDemoMode && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setJoinOpen(true)}
              className="min-h-[42px] inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              <KeyRound className="h-4 w-4 text-emerald-700" />
              Gabung Kelompok
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="min-h-[42px] inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              Buat Kelompok
            </button>
          </div>
        )}
      </div>

      {/* Group Switcher Cards */}
      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Belum tergabung dalam kelompok"
          description={
            isDemoMode
              ? 'Masuk dengan akun SAKUIN untuk membuat atau bergabung ke kelompok kos.'
              : 'Buat kelompok baru untuk menjadi Pemilik, atau masukkan 8 karakter kode undangan untuk bergabung.'
          }
          actionLabel={!isDemoMode ? 'Buat Kelompok Baru' : undefined}
          onAction={!isDemoMode ? () => setCreateOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => {
            const mem = myMemberships.find((m) => m.groupId === g.id);
            const isSelected = activeWorkspaceId === g.id;
            return (
              <div
                key={g.id}
                className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/40'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-slate-900">{g.name}</h2>
                    <span className="text-xs font-semibold text-emerald-800">
                      {mem?.role === 'owner' ? 'Pemilik' : 'Anggota'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                    {g.description || 'Kelompok keuangan bersama.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => switchWorkspace(g.id)}
                  className={`min-h-[40px] w-full rounded-xl text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-emerald-700 text-white'
                      : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {isSelected ? 'Ruang Kerja Aktif' : 'Buka Ruang Kerja Kelompok'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Group Management Panel */}
      {activeGroup && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{activeGroup.name}</h2>
              <p className="text-xs text-slate-500">
                {activeGroup.description || 'Tidak ada deskripsi'} · Peran kamu:{' '}
                <strong className="text-slate-800">
                  {activeGroupRole === 'owner' ? 'Pemilik' : 'Anggota'}
                </strong>
              </p>
            </div>

            {activeGroupRole === 'owner' ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditName(activeGroup.name);
                    setEditDesc(activeGroup.description);
                    setEditInfoOpen(true);
                  }}
                  className="min-h-[40px] rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ubah Nama
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteGroup(activeGroup)}
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus Kelompok
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmLeaveGroup(activeGroup)}
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <LogOut className="h-3.5 w-3.5" />
                Keluar Kelompok
              </button>
            )}
          </div>

          {/* Invite Code & Owner Permissions */}
          {activeGroupRole === 'owner' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Kode Undangan Kelompok</h3>
                  <span className="text-xs font-semibold text-slate-600">
                    Status: {inviteActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-emerald-800">
                    {activeGroup.inviteCode}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(activeGroup.inviteCode)}
                    aria-label="Salin kode undangan"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-100"
                  >
                    <Copy className="h-4 w-4 text-slate-700" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Buat Kode Baru
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleInviteActive}
                    className="min-h-[38px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {inviteActive ? 'Nonaktifkan Kode' : 'Aktifkan Kode'}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-sm font-bold text-slate-900">Hak Akses Anggota</h3>
                </div>
                <div className="space-y-2.5 text-xs">
                  {[
                    {
                      key: 'canAddTransactions' as const,
                      label: 'Anggota boleh mencatat transaksi baru',
                    },
                    {
                      key: 'canViewAllTransactions' as const,
                      label: 'Anggota boleh melihat semua transaksi kelompok',
                    },
                    {
                      key: 'canEditOwnTransactions' as const,
                      label: 'Anggota boleh mengedit/menghapus transaksi miliknya sendiri',
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between gap-3 cursor-pointer min-h-[36px]"
                    >
                      <span className="text-slate-700 font-medium">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={activeGroup.memberPermissions[item.key]}
                        onChange={() => handleTogglePerm(item.key)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Member List */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Daftar Anggota ({activeGroupMembers.length})
            </h3>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {activeGroupMembers.map((member) => (
                <li
                  key={member.id}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {member.displayName}
                      {member.uid === firebaseUser?.uid && (
                        <span className="ml-1.5 text-xs font-normal text-slate-500">(Kamu)</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {member.role === 'owner' ? 'Pemilik Kelompok' : 'Anggota'}
                    </p>
                  </div>

                  {activeGroupRole === 'owner' && member.role !== 'owner' && (
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveUid(member.uid)}
                      aria-label={`Keluarkan ${member.displayName}`}
                      className="min-h-[38px] inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      Keluarkan
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Buat Kelompok Baru"
        description="Buat ruang kerja bersama untuk kos, kamar, atau organisasi mahasiswa."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="grp-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Kelompok
            </label>
            <input
              id="grp-name"
              type="text"
              required
              maxLength={80}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Contoh: Kos Melati Kamar 4"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="grp-desc" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Deskripsi (opsional)
            </label>
            <textarea
              id="grp-desc"
              rows={2}
              maxLength={300}
              value={groupDesc}
              onChange={(e) => setGroupDesc(e.target.value)}
              placeholder="Patungan air galon, WiFi, dan kebersihan bulanan"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="min-h-[42px] rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={creating}
              className="min-h-[42px] rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {creating ? 'Membuat...' : 'Buat Kelompok'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Join Group Modal */}
      <Modal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        title="Gabung Kelompok"
        description="Masukkan 8 karakter kode undangan dari pemilik kelompok."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label htmlFor="join-code" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kode Undangan (8 Karakter)
            </label>
            <input
              id="join-code"
              type="text"
              required
              maxLength={8}
              value={joinCode}
              onChange={(e) => setJoinCode(normalizeInviteCode(e.target.value))}
              placeholder="Contoh: A7K9P2MN"
              className="w-full min-h-[46px] rounded-xl border border-slate-200 px-4 py-2 text-center font-mono text-lg font-bold tracking-widest uppercase"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setJoinOpen(false)}
              className="min-h-[42px] rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={joining || joinCode.length !== 8}
              className="min-h-[42px] rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {joining ? 'Memproses...' : 'Gabung'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Group Info Modal */}
      <Modal
        open={editInfoOpen}
        onClose={() => setEditInfoOpen(false)}
        title="Ubah Informasi Kelompok"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSaveInfo} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kelompok</label>
            <input
              type="text"
              required
              maxLength={80}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi</label>
            <textarea
              rows={2}
              maxLength={300}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditInfoOpen(false)}
              className="min-h-[42px] rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="min-h-[42px] rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white"
            >
              Simpan
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmRemoveUid)}
        onClose={() => setConfirmRemoveUid(null)}
        onConfirm={async () => {
          if (activeGroup && confirmRemoveUid) {
            await removeGroupMember(activeGroup.id, confirmRemoveUid);
            showToast({ type: 'success', title: 'Anggota dikeluarkan dari kelompok' });
            setConfirmRemoveUid(null);
          }
        }}
        title="Keluarkan Anggota"
        message="Anggota ini akan langsung kehilangan akses ke data transaksi dan anggaran kelompok."
        confirmLabel="Keluarkan"
      />

      <ConfirmDialog
        open={Boolean(confirmLeaveGroup)}
        onClose={() => setConfirmLeaveGroup(null)}
        onConfirm={async () => {
          if (confirmLeaveGroup) {
            await leaveGroup(confirmLeaveGroup.id);
            showToast({ type: 'success', title: `Keluar dari "${confirmLeaveGroup.name}"` });
            setConfirmLeaveGroup(null);
          }
        }}
        title="Keluar dari Kelompok"
        message={
          confirmLeaveGroup
            ? `Kamu akan keluar dari kelompok "${confirmLeaveGroup.name}" dan kembali ke ruang kerja pribadi.`
            : ''
        }
        confirmLabel="Keluar"
      />

      <ConfirmDialog
        open={Boolean(confirmDeleteGroup)}
        onClose={() => setConfirmDeleteGroup(null)}
        onConfirm={async () => {
          if (confirmDeleteGroup) {
            await deleteGroup(confirmDeleteGroup.id);
            showToast({ type: 'success', title: `Kelompok "${confirmDeleteGroup.name}" dihapus` });
            setConfirmDeleteGroup(null);
          }
        }}
        title="Hapus Kelompok"
        message={
          confirmDeleteGroup
            ? `Kelompok "${confirmDeleteGroup.name}" beserta seluruh keanggotaan dan kode undangannya akan dihapus permanen.`
            : ''
        }
      />
    </div>
  );
}
