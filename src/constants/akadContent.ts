export interface AkadSection {
  id: string;
  title: string;
  subtitle: string;
  paragraphs: string[];
  highlights: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface AkadPageContent {
  disclaimerBanner: string;
  lastUpdated: string;
  akadSections: AkadSection[];
  privacySummary: {
    title: string;
    points: string[];
  };
  faq: FaqItem[];
  contact: {
    title: string;
    description: string;
    email: string;
    hours: string;
  };
}

export const AKAD_CONTENT: AkadPageContent = {
  disclaimerBanner:
    'Catatan Penting: Dokumen informasi penggunaan dan simulasi layanan ini disiapkan sebagai draf informasi aplikasi. Seluruh ketentuan penggunaan dan kebijakan privasi wajib ditinjau ulang oleh konsultan hukum atau penasihat legal yang berkualifikasi sebelum peluncuran publik secara komersial.',
  lastUpdated: '20 November 2026',
  akadSections: [
    {
      id: 'akad-pengguna',
      title: 'Ketentuan Pengguna — SAKUIN',
      subtitle: 'Hubungan layanan antara pengguna dan platform SAKUIN',
      paragraphs: [
        'SAKUIN adalah alat bantu digital untuk pencatatan transaksi, penyusunan anggaran pribadi maupun kelompok (seperti teman kos atau kepanitiaan), pelaporan arus kas, dan evaluasi keuangan harian.',
        'Pada tahap pengembangan saat ini, fitur SAKUIN Premium sebesar Rp19.000 per bulan beroperasi sepenuhnya sebagai mode simulasi untuk pengujian fungsionalitas aplikasi. Tidak ada transaksi pembayaran nyata, penarikan saldo otomatis, atau pengumpulan data kartu/rekening bank yang dilakukan.',
      ],
      highlights: [
        'SAKUIN berfungsi murni sebagai platform pencatatan dan perencanaan anggaran.',
        'Aktivasi SAKUIN Premium saat ini bersifat simulasi tanpa tagihan finansial nyata.',
        'Pengguna memiliki kendali penuh atas data catatan transaksi yang diinput pada workspace pribadi.',
      ],
    },
    {
      id: 'akad-bank',
      title: 'Hubungan Perbankan & Penyelenggaraan Dana',
      subtitle: 'Klarifikasi posisi SAKUIN terhadap lembaga keuangan',
      paragraphs: [
        'SAKUIN bukan merupakan lembaga perbankan, perusahaan pembiayaan, layanan pinjaman online, maupun dompet elektronik (e-wallet). SAKUIN tidak menjalin kerja sama operasional pembiayaan dengan bank mana pun pada versi ini.',
        'SAKUIN tidak menyimpan, menghimpun, menginvestasikan, atau menyalurkan dana milik pengguna secara langsung. Seluruh nominal saldo yang ditampilkan di aplikasi merupakan hasil perhitungan dari catatan pemasukan dan pengeluaran yang diinput oleh pengguna sendiri.',
      ],
      highlights: [
        'Tidak ada penyimpanan atau penitipan uang nyata di dalam sistem SAKUIN.',
        'Tidak menyediakan fasilitas pinjaman, kredit, simpanan berbunga, atau produk investasi.',
        'Tidak terhubung dengan rekening bank atau sistem pembayaran pihak ketiga.',
      ],
    },
  ],
  privacySummary: {
    title: 'Ringkasan Kebijakan Privasi',
    points: [
      'Data akun (nama, email, foto profil) dan catatan keuangan disimpan secara aman di Google Cloud Firestore dengan aturan keamanan berbasis identitas pengguna (UID) dan keanggotaan kelompok.',
      'Data pribadi pada workspace "Pribadi" hanya dapat diakses oleh pemilik akun dan tidak dapat dilihat oleh pengguna lain maupun anggota kelompok.',
      'Untuk workspace "Kelompok", hanya pengguna yang memiliki kode undangan aktif yang dapat bergabung, dan hak akses dikelola oleh pemilik kelompok.',
      'Pengguna dapat memperbarui profil atau mengajukan penghapusan akun beserta data terkait melalui halaman Akun & Profil.',
    ],
  },
  faq: [
    {
      question: 'Apakah uang saya benar-benar tersimpan di aplikasi SAKUIN?',
      answer:
        'Tidak. SAKUIN adalah aplikasi pencatatan dan pengelolaan anggaran. Angka saldo dan tabungan yang tampil adalah catatan digital untuk membantu kamu memantau uang saku yang kamu pegang secara tunai maupun di rekening pribadimu.',
    },
    {
      question: 'Bagaimana cara kerja fitur Kelompok untuk anak kos?',
      answer:
        'Pemilik kelompok (misalnya bendahara kos) membuat kelompok baru lalu membagikan kode undangan 8 karakter kepada teman sekamar/sekos. Pemilik dapat mengatur apakah anggota boleh melihat semua transaksi, menambah transaksi, atau mengubah transaksi milik sendiri.',
    },
    {
      question: 'Apakah berlangganan SAKUIN Premium akan memotong saldo rekening saya?',
      answer:
        'Tidak. Fitur SAKUIN Premium pada versi ini berjalan sebagai simulasi (Rp19.000/bulan) tanpa integrasi pembayaran nyata. Kamu bisa mencoba fitur Premium dan membatalkan simulasinya kapan saja.',
    },
    {
      question: 'Mengapa catatan saya tidak memengaruhi anggaran ketika saya menambah Pemasukan?',
      answer:
        'Sesuai prinsip perencanaan anggaran, pemasukan menambah Saldo Tersedia secara keseluruhan, sedangkan batas Anggaran hanya menghitung transaksi Pengeluaran dalam rentang tanggal anggaran yang ditentukan.',
    },
  ],
  contact: {
    title: 'Bantuan & Kontak Pengembang',
    description:
      'Mengalami kendala teknis, kesalahan pencatatan, atau memiliki masukan untuk fitur mahasiswa dan anak kos? Hubungi tim dukungan kami.',
    email: 'dukungan@sakuin.web.id',
    hours: 'Senin – Jumat, 09.00 – 17.00 WIB (Zona Waktu Asia/Jakarta)',
  },
};
