const idrFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/**
 * Formats an integer rupiah amount as "Rp300.000" or "-Rp25.000".
 */
export function formatRupiah(amount: number, options?: { withSign?: boolean }): string {
  const safeInt = Math.round(Number.isFinite(amount) ? amount : 0);
  const absFormatted = idrFormatter.format(Math.abs(safeInt));

  if (safeInt < 0) {
    return `-Rp${absFormatted}`;
  }
  if (options?.withSign && safeInt > 0) {
    return `+Rp${absFormatted}`;
  }
  return `Rp${absFormatted}`;
}

/**
 * Compact format for chart axes (e.g., Rp150rb, Rp1,2jt).
 */
export function formatRupiahCompact(amount: number): string {
  const safeInt = Math.round(Number.isFinite(amount) ? amount : 0);
  const abs = Math.abs(safeInt);
  const prefix = safeInt < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const jt = (abs / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1).replace('.', ',');
    return `${prefix}Rp${jt}jt`;
  }
  if (abs >= 1_000) {
    const rb = Math.round(abs / 1_000);
    return `${prefix}Rp${rb}rb`;
  }
  return `${prefix}Rp${abs}`;
}

/**
 * Formats digits into thousand-separated input display ("300.000").
 */
export function formatRupiahInput(raw: string | number): string {
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  const num = Number.parseInt(digits, 10);
  if (!Number.isFinite(num) || num === 0) return '';
  return idrFormatter.format(num);
}

/**
 * Parses a formatted rupiah string ("300.000" or "Rp300.000") into an integer.
 */
export function parseRupiahInput(raw: string): number {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return 0;
  const parsed = Number.parseInt(digits, 10);
  return Number.isSafeInteger(parsed) ? parsed : 0;
}
