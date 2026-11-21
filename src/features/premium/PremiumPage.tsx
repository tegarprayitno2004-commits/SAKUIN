import React, { useState } from 'react';
import { CheckCircle2, Crown, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/app/AuthContext';
import { useToast } from '@/src/app/ToastContext';
import { usePremium } from '@/src/hooks/usePremium';

const PREMIUM_FEATURES = [
  'Laporan keuangan lebih detail (rata-rata per kategori & ekspor PDF lengkap)',
  'Rincian anggaran otomatis berdasarkan riwayat atau standar anak kos',
  'Notifikasi lebih lengkap (peringatan batas per kategori pengeluaran)',
  'Akses ke fitur tabungan digital (target dana darurat & impian)',
];

export function PremiumPage() {
  const { isDemoMode } = useAuth();
  const { isPremium, activateSimulatedPremium, cancelSimulatedPremium } = usePremium();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

  const handleSubscribe = async () => {
    if (isDemoMode) {
      showToast({
        type: 'info',
        title: 'Mode Demo',
        description: 'Fitur Premium sudah aktif di Mode Demo. Masuk akun untuk mencoba simulasi di akun pribadimu.',
      });
      return;
    }
    setProcessing(true);
    try {
      await activateSimulatedPremium();
      showToast({
        type: 'success',
        title: 'Simulasi SAKUIN Premium Aktif',
        description:
          'Ini adalah mode simulasi (tanpa tagihan nyata). Semua fitur Premium kini dapat kamu gunakan.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal mengaktifkan simulasi',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    setProcessing(true);
    try {
      await cancelSimulatedPremium();
      showToast({
        type: 'info',
        title: 'Simulasi SAKUIN Premium dibatalkan',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal membatalkan simulasi',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3 text-xs text-amber-950">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Mode Simulasi Langganan:</strong> Aktivasi SAKUIN Premium di tahap ini hanya
          berfungsi sebagai simulasi pengujian fitur aplikasi. SAKUIN tidak memproses pembayaran
          nyata dan tidak mengumpulkan data kartu kredit, rekening bank, maupun e-wallet.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center shadow-xs">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <Crown className="h-8 w-8" aria-hidden="true" />
        </div>

        <h1 className="mt-4 text-2xl font-extrabold text-slate-900">Sakuin Premium</h1>
        <p className="mt-2 max-w-md mx-auto text-sm text-slate-600">
          Dapatkan fitur eksklusif untuk pengelolaan keuangan yang lebih optimal!
        </p>

        <ul className="mt-6 space-y-3 text-left max-w-md mx-auto">
          {PREMIUM_FEATURES.map((feat) => (
            <li key={feat} className="flex items-start gap-3 text-sm text-slate-700">
              <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
              <span>{feat}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
            Rp19.000 <span className="text-sm font-medium text-slate-500">/ bulan (Simulasi)</span>
          </p>

          {isPremium ? (
            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold text-emerald-700">
                Status: Simulasi SAKUIN Premium Sedang Aktif
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/tabungan')}
                  className="min-h-[44px] rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Buka Tabungan Digital
                </button>
                {!isDemoMode && (
                  <button
                    type="button"
                    disabled={processing}
                    onClick={handleCancel}
                    className="min-h-[44px] rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Batalkan Langganan
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={processing}
              onClick={handleSubscribe}
              className="mt-4 w-full sm:w-auto min-w-[240px] min-h-[48px] rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-800 transition-colors disabled:opacity-60"
            >
              {processing ? 'Memproses Simulasi...' : 'Berlangganan (Simulasi)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
