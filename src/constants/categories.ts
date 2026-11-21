import type { CategoryDefinition, CustomCategory, TransactionType } from '@/src/types';

export const DEFAULT_EXPENSE_CATEGORIES: CategoryDefinition[] = [
  { key: 'makan', name: 'Makan dan Minum', type: 'expense', icon: 'Utensils', color: '#059669', isDefault: true },
  { key: 'transportasi', name: 'Transportasi', type: 'expense', icon: 'Bus', color: '#0284C7', isDefault: true },
  { key: 'kos', name: 'Kos', type: 'expense', icon: 'Home', color: '#D97706', isDefault: true },
  { key: 'laundry', name: 'Laundry', type: 'expense', icon: 'Shirt', color: '#7C3AED', isDefault: true },
  { key: 'pendidikan', name: 'Pendidikan', type: 'expense', icon: 'BookOpen', color: '#2563EB', isDefault: true },
  { key: 'kesehatan', name: 'Kesehatan', type: 'expense', icon: 'HeartPulse', color: '#E11D48', isDefault: true },
  { key: 'hiburan', name: 'Hiburan', type: 'expense', icon: 'Gamepad2', color: '#EC4899', isDefault: true },
  { key: 'belanja', name: 'Belanja', type: 'expense', icon: 'ShoppingBag', color: '#EA580C', isDefault: true },
  { key: 'tagihan', name: 'Tagihan', type: 'expense', icon: 'Receipt', color: '#475569', isDefault: true },
  { key: 'lainnya_expense', name: 'Lainnya', type: 'expense', icon: 'MoreHorizontal', color: '#64748B', isDefault: true },
];

export const DEFAULT_INCOME_CATEGORIES: CategoryDefinition[] = [
  { key: 'uang_saku', name: 'Uang Saku', type: 'income', icon: 'Wallet', color: '#047857', isDefault: true },
  { key: 'kiriman_ortu', name: 'Kiriman Orang Tua', type: 'income', icon: 'Users', color: '#059669', isDefault: true },
  { key: 'beasiswa', name: 'Beasiswa', type: 'income', icon: 'GraduationCap', color: '#0D9488', isDefault: true },
  { key: 'gaji', name: 'Gaji atau Pekerjaan', type: 'income', icon: 'Briefcase', color: '#0284C7', isDefault: true },
  { key: 'bonus', name: 'Bonus', type: 'income', icon: 'Gift', color: '#D97706', isDefault: true },
  { key: 'lainnya_income', name: 'Lainnya', type: 'income', icon: 'PlusCircle', color: '#64748B', isDefault: true },
];

export const ALL_DEFAULT_CATEGORIES: CategoryDefinition[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];

export const DEFAULT_CATEGORY_RATIOS_KOS: Record<string, number> = {
  makan: 0.45,
  transportasi: 0.15,
  kos: 0.2,
  laundry: 0.08,
  tagihan: 0.07,
  lainnya_expense: 0.05,
};

export function mergeCategories(
  customCategories: CustomCategory[],
  type?: TransactionType
): CategoryDefinition[] {
  const customMapped: CategoryDefinition[] = customCategories.map((c) => ({
    key: `custom_${c.id}`,
    name: c.name,
    type: c.type,
    icon: c.icon,
    color: c.color,
    isDefault: false,
  }));

  const combined = [...ALL_DEFAULT_CATEGORIES, ...customMapped];
  return type ? combined.filter((c) => c.type === type) : combined;
}

export function getCategoryMeta(
  key: string,
  customCategories: CustomCategory[] = []
): CategoryDefinition {
  const all = mergeCategories(customCategories);
  const found = all.find((c) => c.key === key);
  if (found) return found;
  return {
    key,
    name: key,
    type: 'expense',
    icon: 'Tag',
    color: '#64748B',
    isDefault: false,
  };
}
