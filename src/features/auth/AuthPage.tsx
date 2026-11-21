import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, Lock, Mail, User as UserIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/src/app/AuthContext';
import { useToast } from '@/src/app/ToastContext';
import { Modal } from '@/src/components/ui/Modal';
import { SakuinLogo } from '@/src/components/ui/SakuinLogo';

const loginSchema = z.object({
  email: z.string().email('Masukkan alamat email yang valid.'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter.'),
});

const registerSchema = z
  .object({
    name: z.string().min(2, 'Nama lengkap minimal 2 karakter.').max(80, 'Maksimal 80 karakter.'),
    email: z.string().email('Masukkan alamat email yang valid.'),
    password: z.string().min(6, 'Kata sandi minimal 6 karakter.'),
    confirmPassword: z.string().min(6, 'Konfirmasi kata sandi wajib diisi.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok.',
    path: ['confirmPassword'],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export function AuthPage() {
  const { loginEmail, registerEmail, loginGoogle, resetPassword, enterDemoMode } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const handleLogin = async (values: LoginFormValues) => {
    setAuthError(null);
    setSubmitting(true);
    try {
      await loginEmail(values.email, values.password, rememberMe);
      showToast({ type: 'success', title: 'Selamat datang kembali di SAKUIN' });
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Gagal masuk.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (values: RegisterFormValues) => {
    setAuthError(null);
    setSubmitting(true);
    try {
      await registerEmail(values.name, values.email, values.password);
      showToast({
        type: 'success',
        title: 'Akun berhasil dibuat',
        description: 'Selamat datang! Mulai catat keuanganmu sekarang.',
      });
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Gagal mendaftar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setAuthError(null);
    setGoogleLoading(true);
    try {
      await loginGoogle();
      showToast({ type: 'success', title: 'Berhasil masuk dengan Google' });
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Gagal masuk dengan Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetSending(true);
    try {
      await resetPassword(resetEmail);
      showToast({
        type: 'success',
        title: 'Tautan reset kata sandi terkirim',
        description: `Periksa kotak masuk atau folder spam pada ${resetEmail.trim()}.`,
      });
      setResetOpen(false);
      setResetEmail('');
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Gagal mengirim reset kata sandi',
        description: err instanceof Error ? err.message : 'Coba lagi.',
      });
    } finally {
      setResetSending(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col lg:grid lg:grid-cols-12">
      {/* Left editorial showcase on desktop */}
      <div className="hidden lg:flex lg:col-span-5 bg-emerald-800 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <SakuinLogo size="lg" inverted />
          <h1 className="mt-10 text-3xl font-extrabold tracking-tight leading-snug text-balance">
            Uang saku anak kos terjaga sampai akhir minggu dan akhir bulan.
          </h1>
          <p className="mt-4 text-emerald-100 text-base leading-relaxed max-w-md">
            Susun anggaran mingguan atau bulanan, catat pengeluaran harian dengan cepat, pantau
            peringatan sebelum boros, dan kelola kas bersama teman sekamar dalam satu tempat.
          </p>
        </div>

        <div className="relative z-10 space-y-4 border-t border-emerald-700/80 pt-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-bold text-white">Pribadi &amp; Kelompok</p>
              <p className="mt-0.5 text-xs text-emerald-200">
                Pisahkan catatan personal dengan kas kos atau kepanitiaan.
              </p>
            </div>
            <div>
              <p className="font-bold text-white">Zona Waktu WIB</p>
              <p className="mt-0.5 text-xs text-emerald-200">
                Periode Senin–Minggu dan tanggal 1–akhir bulan akurat sesuai Asia/Jakarta.
              </p>
            </div>
          </div>
          <p className="text-xs text-emerald-200/80">
            SAKUIN adalah alat bantu pencatatan keuangan, bukan layanan perbankan atau pinjaman.{' '}
            <Link to="/akad-publik" className="underline hover:text-white">
              Pelajari ketentuan layanan
            </Link>
          </p>
        </div>
      </div>

      {/* Right Auth Card */}
      <div className="flex-1 lg:col-span-7 flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="lg:hidden mb-3">
              <SakuinLogo size="lg" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {tab === 'login' ? 'Masuk ke Akun Sakuin' : 'Buat Akun Sakuin Baru'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Kelola keuangan pribadi dan kelompok dengan rapi.
            </p>
          </div>

          {/* Segmented Tab Switch */}
          <div
            role="tablist"
            aria-label="Pilih masuk atau daftar"
            className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'login'}
              onClick={() => {
                setTab('login');
                setAuthError(null);
              }}
              className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                tab === 'login'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'register'}
              onClick={() => {
                setTab('register');
                setAuthError(null);
              }}
              className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors ${
                tab === 'register'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar
            </button>
          </div>

          {authError && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 leading-relaxed"
            >
              {authError}
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="mt-5 space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="nama@mahasiswa.ac.id"
                    {...loginForm.register('email')}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-rose-600">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    {...loginForm.register('password')}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pl-10 pr-12 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute right-1 top-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-rose-600">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 min-h-[44px] cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  Ingat saya
                </label>
                <button
                  type="button"
                  onClick={() => setResetOpen(true)}
                  className="min-h-[44px] px-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Lupa password?
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[46px] rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Masuk
              </button>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="mt-5 space-y-4">
              <div>
                <label htmlFor="reg-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Contoh: Sari Rahmawati"
                    {...registerForm.register('name')}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  />
                </div>
                {registerForm.formState.errors.name && (
                  <p className="mt-1 text-xs text-rose-600">
                    {registerForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    placeholder="nama@mahasiswa.ac.id"
                    {...registerForm.register('email')}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  />
                </div>
                {registerForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-rose-600">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Minimal 6 karakter"
                    {...registerForm.register('password')}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pl-10 pr-12 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute right-1 top-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-rose-600">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="reg-confirm" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Konfirmasi Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    id="reg-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Ulangi kata sandi"
                    {...registerForm.register('confirmPassword')}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white pl-10 pr-12 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Sembunyikan konfirmasi' : 'Tampilkan konfirmasi'}
                    className="absolute right-1 top-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {registerForm.formState.errors.confirmPassword && (
                  <p className="mt-1 text-xs text-rose-600">
                    {registerForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[46px] rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Daftar Akun
              </button>
            </form>
          )}

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">atau</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full min-h-[46px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 flex items-center justify-center gap-2.5 disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
            )}
            {tab === 'login' ? 'Masuk dengan Google' : 'Daftar dengan Google'}
          </button>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={enterDemoMode}
              className="min-h-[44px] px-3 text-xs font-semibold text-slate-600 hover:text-emerald-800 hover:underline"
            >
              Lihat pratinjau aplikasi lewat Mode Demo (data contoh lokal)
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset Kata Sandi"
        description="Masukkan email akunmu untuk menerima tautan pengaturan ulang kata sandi."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Alamat Email
            </label>
            <input
              id="reset-email"
              type="email"
              required
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="nama@mahasiswa.ac.id"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setResetOpen(false)}
              className="min-h-[44px] rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={resetSending}
              className="min-h-[44px] rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {resetSending ? 'Mengirim...' : 'Kirim Tautan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
