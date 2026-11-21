import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { SakuinLogo } from '@/src/components/ui/SakuinLogo';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onFinish();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-white via-emerald-50/60 to-emerald-100/80 flex flex-col items-center justify-between px-6 py-12">
      <div className="w-full max-w-md flex justify-end">
        <button
          type="button"
          onClick={onFinish}
          className="min-h-[44px] px-3 text-xs font-semibold text-emerald-800 hover:text-emerald-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg"
        >
          Lewati
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <SakuinLogo size="xl" showWordmark={false} />
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-emerald-950">
          Sakuin
        </h1>
        <p className="mt-2 max-w-xs text-base font-medium text-slate-600">
          Kelola Keuangan, Raih Masa Depan.
        </p>
        <p className="mt-1 text-xs text-emerald-800 font-medium">
          Aplikasi Keuangan Mahasiswa &amp; Anak Kos
        </p>
      </motion.div>

      {/* Soft green editorial hills illustration */}
      <div className="relative w-full max-w-lg h-36 flex items-end justify-center pointer-events-none">
        <svg
          viewBox="0 0 400 130"
          fill="none"
          className="w-full h-full"
          aria-hidden="true"
        >
          <path
            d="M0 110 C80 65, 160 75, 230 95 C300 115, 350 70, 400 85 L400 130 L0 130 Z"
            fill="#A7F3D0"
            fillOpacity="0.65"
          />
          <path
            d="M0 120 C90 85, 190 105, 290 75 C345 58, 380 75, 400 90 L400 130 L0 130 Z"
            fill="#059669"
            fillOpacity="0.22"
          />
          <g transform="translate(178, 52)">
            <path d="M4 22 L22 6 L40 22 V42 H4 V22 Z" fill="#047857" />
            <rect x="17" y="27" width="10" height="15" rx="2" fill="#ECFDF5" />
          </g>
        </svg>
      </div>
    </div>
  );
}
