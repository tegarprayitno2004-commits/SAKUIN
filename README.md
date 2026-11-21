# SAKUIN — Kelola Keuangan, Raih Masa Depan

**SAKUIN** adalah aplikasi web (**website-only**) pengelolaan keuangan pribadi dan kelompok yang dirancang khusus untuk mahasiswa dan anak kos di Indonesia. Seluruh pengguna dan seluruh kelompok mengakses aplikasi melalui **satu URL publik yang sama**, dengan pemisahan data yang ditegakkan melalui autentikasi Firebase dan aturan keamanan Cloud Firestore.

> **Konfirmasi Platform:** Proyek ini adalah **website murni** berbasis React + TypeScript + Vite. Tidak terdapat kode aplikasi native Android/iOS, APK/AAB, Flutter, React Native/Expo, Capacitor, maupun aplikasi desktop Electron. Pengguna smartphone mengakses website ini langsung melalui browser seluler (Chrome, Safari, dll.) dengan tata letak responsif penuh (`dvh`, safe-area insets, dan target sentuh minimal 44px).

---

## Fitur Utama

1. **Splash Screen & Autentikasi (`/login`)**:
   - Splash screen animasi singkat (~1,5 detik) dengan logo rumah SAKUIN.
   - Login & Daftar dengan Email/Kata Sandi (`Ingat saya`, `Lupa password?` via `sendPasswordResetEmail`), serta Masuk/Daftar dengan Google (`signInWithPopup`).
   - Mode Demo (hanya baca, in-memory) yang terpisah sepenuhnya dari Firestore.
2. **Beranda / Dashboard (`/`)**:
   - Sapaan personal (`Hai, {nama}`), pemilih ruang kerja (`Pribadi` atau kelompok), dan pemilih periode (`Minggu ini`, `Bulan ini`, `Pilih rentang tanggal` berbasis `Asia/Jakarta`).
   - Kartu **Saldo Tersedia** (akumulasi seluruh pemasukan dikurangi seluruh pengeluaran sepanjang waktu) beserta tombol **Tambah Pemasukan**.
   - Ringkasan Pemasukan & Pengeluaran periode berjalan, grafik batang Pemasukan vs Pengeluaran, cincin progres anggaran, akses cepat, dan banner peringatan anggaran aktif tertinggi.
3. **Pencatatan & Riwayat Transaksi (`/transaksi`)**:
   - Input nominal `Rp` integer dengan pemisah ribuan otomatis, kategori Bahasa Indonesia, tanggal & jam `WIB (Asia/Jakarta)`, serta catatan opsional (maks. 200 karakter).
   - Pencarian real-time (debounced), filter tipe/kategori/tanggal, edit & hapus dengan dialog konfirmasi, dan paginasi 50 transaksi per halaman (`Muat lebih banyak`).
4. **Pengaturan Anggaran (`/anggaran`)**:
   - Anggaran `Mingguan` (Senin–Minggu), `Bulanan` (tanggal 1–akhir bulan), dan `Kustom`.
   - Batas opsional per kategori (`Makan dan Minum`, `Transportasi`, `Kos`, `Laundry`, dll.) serta fitur **Rincian Anggaran Otomatis** untuk pengguna Premium.
   - Pemasukan **tidak pernah** mengurangi pemakaian anggaran; hanya transaksi `expense` di rentang `startDate <= dateKey <= endDate` yang dihitung.
5. **Laporan Keuangan (`/laporan`)**:
   - Tab `Harian`, `Mingguan`, dan `Bulanan` dengan navigator periode.
   - Grafik tren arus kas, diagram donat kategori pengeluaran beserta persentase, perbandingan anggaran vs realisasi, tabel transaksi, serta **Ekspor CSV** (UTF-8 BOM, angka rupiah integer) dan **Ekspor PDF** (`jsPDF` + `jspdf-autotable`).
6. **Peringatan Anggaran (`/peringatan`)**:
   - Evaluasi otomatis ambang batas `70%` (Info), `85%` (Peringatan Penting), `100%` (Anggaran Habis), dan `>100%` (Terlampaui) dengan ID dokumen deterministik `{uid}_{budgetId}_{threshold}` sehingga tidak pernah duplikat.
7. **Evaluasi Keuangan (`/evaluasi`)**:
   - Sisa dana periode, kategori terbesar, perbandingan dengan periode ekuivalen sebelumnya, rata-rata harian, batas aman harian, proyeksi akhir periode, dan rekomendasi berbasis angka nyata.
8. **Kelompok Keuangan (`/kelompok`)**:
   - Buat kelompok dan dapatkan kode undangan acak kriptografis 8 karakter.
   - Pemilik dapat mengelola izin anggota (`canAddTransactions`, `canViewAllTransactions`, `canEditOwnTransactions`), membuat kode baru, menonaktifkan kode, mengeluarkan anggota, atau menghapus kelompok.
9. **SAKUIN Premium (Simulasi) (`/premium`) & Tabungan Digital (`/tabungan`)**:
   - Simulasi langganan Rp19.000/bulan (`simulated: true`) tanpa pembayaran nyata dan tanpa pengumpulan data kartu/rekening.
   - Membuka Tabungan Digital (`savingsGoals`), rincian anggaran otomatis, tabel detail laporan, dan notifikasi batas per kategori.
10. **Akun & Profil (`/akun`) & Akad & Informasi (`/akad`)**:
    - Edit nama/avatar, pengelola kategori kustom, ubah kata sandi (re-autentikasi), hapus akun, serta halaman ketentuan layanan (`src/constants/akadContent.ts`).

---

## Struktur Data Firestore (`firebase-blueprint.json`)

Semua koleksi menerapkan identitas pemilik atau kelompok:
- `users/{uid}`: `displayName`, `email`, `photoURL`, `lastWorkspace`, `createdAt`, `updatedAt`.
- `groups/{groupId}`: `name`, `description`, `ownerId`, `inviteCode`, `memberPermissions`, `createdAt`, `updatedAt`.
- `inviteCodes/{code}`: `groupId`, `ownerId`, `active`, `createdAt`, `updatedAt` (hanya `get`, `allow list: if false`).
- `groupMembers/{groupId_uid}`: `groupId`, `uid`, `role` (`owner` | `member`), `displayName`, `photoURL`, `inviteCode`, `joinedAt`.
- `categories/{id}`: `scope`, `ownerId`, `groupId`, `type`, `name`, `icon`, `color`, `createdAt`.
- `budgets/{id}`: `scope`, `ownerId`, `groupId`, `name`, `amount`, `periodType`, `startDate`, `endDate`, `categoryLimits`, `status`, `createdBy`, `createdAt`, `updatedAt`.
- `transactions/{id}`: `scope`, `ownerId`, `groupId`, `createdBy`, `createdByName`, `type`, `amount`, `category`, `dateKey` (`YYYY-MM-DD` WIB), `date`, `note`, `createdAt`, `updatedAt`.
- `notifications/{userId_budgetId_threshold}`: `userId`, `scope`, `groupId`, `budgetId`, `threshold`, `level`, `title`, `message`, `isRead`, `createdAt`.
- `savingsGoals/{id}`: `scope`, `ownerId`, `groupId`, `name`, `targetAmount`, `currentAmount`, `deadline`, `status`, `createdBy`, `createdAt`, `updatedAt`.
- `premiumSubscriptions/{userId}`: `userId`, `plan`, `priceIdr` (`19000`), `status`, `simulated` (`true`), `startedAt`, `expiresAt`, `updatedAt`.

Indeks komposit didefinisikan pada `firestore.indexes.json` untuk kueri `transactions`, `budgets`, `notifications`, dan `savingsGoals` berbasis `scope` + `ownerId`/`groupId` + urutan tanggal.

---

## Penjelasan Aturan Keamanan (`firestore.rules`)

Aturan keamanan telah diaudit menggunakan `@firebase/eslint-plugin-security-rules` (0 error) dan menerapkan prinsip zero-trust:
- **Default Deny**: `match /{document=**} { allow read, write: if false; }`.
- **Isolasi Pribadi & Kelompok**: Dokumen `personal` hanya dapat dibaca/ditulis bila `ownerId == request.auth.uid`. Dokumen `group` memverifikasi keanggotaan melalui `exists(/databases/$(database)/documents/groupMembers/${groupId}_${uid})`.
- **Kueri Terfilter Wajib**: Kueri tanpa filter `ownerId` atau `groupId` ditolak oleh aturan `allow list`. Anggota yang tidak memiliki izin `canViewAllTransactions` wajib memfilter `createdBy == uid`.
- **Anti-Update-Gap & Imutabilitas**: Setiap `create` dan `update` divalidasi dengan fungsi helper `isValid[Entity]`, membatasi panjang string, angka rupiah integer positif (`> 0`), dan mengunci bidang `ownerId`, `groupId`, `scope`, `createdBy`, serta `createdAt`.
- **Perlindungan Kode Undangan & Simulasi**: `inviteCodes` tidak dapat di-`list` oleh klien mana pun. `premiumSubscriptions` hanya menerima `simulated == true` dan `priceIdr == 19000`.

*Catatan kerendahan hati keamanan:* Harap tinjau ulang dan uji kembali `firestore.rules` dengan Firebase Emulator Suite sebelum membuka aplikasi ke basis pengguna luas.

---

## Pengaturan & Menjalankan Proyek

```bash
npm install
npm run dev      # Menjalankan server pengembangan di port 3000
npm run build    # Build produksi ke folder dist/
npm run lint     # Pemeriksaan TypeScript (tsc --noEmit)
npm test         # Menjalankan unit test Vitest
npx eslint firestore.rules
```

### Konfigurasi Firebase Console Sebelum Produksi
1. **Authentication → Sign-in method**: Pastikan penyedia **Google** dan **Email/Password** diaktifkan.
2. **Authentication → Settings → Authorized domains**: Tambahkan domain URL publik aplikasi yang dideploy agar `signInWithPopup` Google Sign-In berjalan lancar.
3. **Firestore Indexes**: Deploy indeks dari `firestore.indexes.json` (`firebase deploy --only firestore:indexes`) jika membuat database baru di luar AI Studio.
4. **SPA Routing**: File `firebase.json` sudah mengonfigurasi rewrite `** -> /index.html` sehingga refresh halaman pada deep link (`/transaksi`, `/laporan`, dll.) tidak mengembalikan 404.

---

## Hasil Pengujian & Verifikasi

| Skenario Uji | Metode Verifikasi | Status |
|---|---|---|
| Perhitungan saldo, periode `Asia/Jakarta` (23:30 & 00:30 WIB), batas Senin–Minggu & bulanan | Unit test (`src/lib/__tests__/dates.test.ts`) | Lulus (6/6) |
| Anggaran mingguan Rp300.000, pemasukan tidak mengurangi anggaran, threshold 70/85/100/>100%, evaluasi & filter | Unit test (`src/lib/__tests__/calculations.test.ts`) | Lulus (7/7) |
| Invarian aturan keamanan Firestore & larangan `allow true` | Static & ESLint (`firestore.rules.test.ts`, `@firebase/eslint-plugin-security-rules`) | Lulus (3/3 & 0 lint error) |
| Kompilasi produksi & strict TypeScript | `npm run build` (`vite build`) & `npm run lint` (`tsc --noEmit`) | Lulus |
| Deployment `firestore.rules` ke project Firebase | `DeployRules` RPC ke `spiritual-incentive-zq7xb` | Terdeploy |

---

## Keterbatasan & Langkah Menuju Publikasi

1. **Pembayaran Nyata**: Langganan Premium saat ini bersifat simulasi (`simulated: true`). Sebelum menerima pembayaran asli, integrasi payment gateway (seperti Midtrans/Xendit) dan pembaruan status `premiumSubscriptions` harus dipindahkan sepenuhnya ke backend tepercaya (Cloud Functions / server webhook terverifikasi), serta aturan klien untuk menulis `status: 'active'` di `premiumSubscriptions` harus dinonaktifkan.
2. **Tinjauan Hukum Konten Akad**: Seluruh teks di `src/constants/akadContent.ts` bersifat netral dan perlu ditinjau oleh konsultan hukum sebelum peluncuran komersial.
3. **Domain Kustom & Pemantauan**: Gunakan domain resmi dengan HTTPS, aktifkan Firebase App Check, dan pantau kuota pembacaan/penulisan Firestore secara berkala.
