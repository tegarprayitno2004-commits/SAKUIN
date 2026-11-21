import React from 'react';

interface SakuinLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  inverted?: boolean;
}

export function SakuinLogo({
  size = 'md',
  showWordmark = true,
  inverted = false,
}: SakuinLogoProps) {
  const dims = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
    xl: 'h-20 w-20',
  }[size];

  const textSize = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }[size];

  return (
    <div className="inline-flex items-center gap-2.5 shrink-0">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className={`${dims} shrink-0`}
        aria-hidden="true"
      >
        <rect
          width="64"
          height="64"
          rx="16"
          fill={inverted ? '#ECFDF5' : '#047857'}
        />
        <path
          d="M16 30L32 16L48 30V47C48 48.1046 47.1046 49 46 49H18C16.8954 49 16 48.1046 16 47V30Z"
          fill={inverted ? '#047857' : '#ECFDF5'}
        />
        <path
          d="M26 33C26 30.7909 27.7909 29 30 29H34C36.2091 29 38 30.7909 38 33V49H26V33Z"
          fill={inverted ? '#ECFDF5' : '#047857'}
        />
        <circle cx="32" cy="23.5" r="2.5" fill="#10B981" />
      </svg>
      {showWordmark && (
        <span
          className={`${textSize} font-extrabold tracking-tight whitespace-nowrap ${
            inverted ? 'text-white' : 'text-emerald-950'
          }`}
        >
          Sakuin
        </span>
      )}
    </div>
  );
}
