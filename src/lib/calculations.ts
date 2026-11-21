import { DEFAULT_CATEGORY_RATIOS_KOS, getCategoryMeta } from '@/src/constants/categories';
import { BUDGET_THRESHOLDS, type ThresholdRule } from '@/src/constants/thresholds';
import {
  enumerateDateKeys,
  formatDateId,
  getElapsedAndRemainingDays,
  getMonthRangeJakarta,
  getPreviousEquivalentRange,
  getShortDayNameId,
  getWeekRangeJakarta,
} from '@/src/lib/dates';
import { formatRupiah } from '@/src/lib/money';
import type {
  Budget,
  BudgetProgress,
  CategorySpendItem,
  CustomCategory,
  FinancialEvaluation,
  FinancialRecommendation,
  Transaction,
  TransactionType,
} from '@/src/types';

/**
 * Available balance across all-time transactions in the current workspace.
 */
export function calculateBalance(transactions: Transaction[]): {
  allTimeIncome: number;
  allTimeExpense: number;
  availableBalance: number;
} {
  let allTimeIncome = 0;
  let allTimeExpense = 0;

  for (const tx of transactions) {
    if (tx.type === 'income') {
      allTimeIncome += tx.amount;
    } else if (tx.type === 'expense') {
      allTimeExpense += tx.amount;
    }
  }

  return {
    allTimeIncome,
    allTimeExpense,
    availableBalance: allTimeIncome - allTimeExpense,
  };
}

/**
 * Period totals (inclusive by dateKey YYYY-MM-DD in Asia/Jakarta).
 */
export function calculatePeriodTotals(
  transactions: Transaction[],
  startDateKey: string,
  endDateKey: string
): {
  income: number;
  expense: number;
  net: number;
  inRangeTransactions: Transaction[];
} {
  let income = 0;
  let expense = 0;
  const inRangeTransactions: Transaction[] = [];

  for (const tx of transactions) {
    if (tx.dateKey >= startDateKey && tx.dateKey <= endDateKey) {
      inRangeTransactions.push(tx);
      if (tx.type === 'income') {
        income += tx.amount;
      } else if (tx.type === 'expense') {
        expense += tx.amount;
      }
    }
  }

  return {
    income,
    expense,
    net: income - expense,
    inRangeTransactions,
  };
}

/**
 * Computes budget progress strictly from EXPENSE transactions within [budget.startDate, budget.endDate].
 * Income transactions never affect budget usage.
 */
export function calculateBudgetProgress(
  budget: Budget,
  transactions: Transaction[],
  todayDateKey: string,
  customCategories: CustomCategory[] = []
): BudgetProgress {
  let used = 0;
  const spentByCategory: Record<string, number> = {};

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    if (tx.scope !== budget.scope) continue;
    if (budget.scope === 'group' && tx.groupId !== budget.groupId) continue;
    if (tx.dateKey < budget.startDate || tx.dateKey > budget.endDate) continue;

    used += tx.amount;
    spentByCategory[tx.category] = (spentByCategory[tx.category] || 0) + tx.amount;
  }

  const remaining = budget.amount - used;
  const percentage = budget.amount > 0 ? (used / budget.amount) * 100 : 0;

  const { totalDays, elapsedDays, remainingDays } = getElapsedAndRemainingDays(
    budget.startDate,
    budget.endDate,
    todayDateKey
  );

  const avgDailySpend = Math.round(used / elapsedDays);
  const safeDailySpend = remaining > 0 ? Math.floor(remaining / remainingDays) : 0;
  const projectedRemaining = remaining - avgDailySpend * Math.max(0, remainingDays - 1);

  const allKeys = new Set<string>([
    ...Object.keys(spentByCategory),
    ...Object.keys(budget.categoryLimits || {}),
  ]);

  const categoryBreakdown: CategorySpendItem[] = Array.from(allKeys)
    .map((key) => {
      const meta = getCategoryMeta(key, customCategories);
      const spent = spentByCategory[key] || 0;
      const limit =
        typeof budget.categoryLimits?.[key] === 'number' && budget.categoryLimits[key] > 0
          ? budget.categoryLimits[key]
          : null;
      const sharePercent = used > 0 ? (spent / used) * 100 : 0;

      return {
        categoryKey: key,
        categoryName: meta.name,
        spent,
        limit,
        sharePercent,
        color: meta.color,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  return {
    budget,
    used,
    remaining,
    percentage,
    elapsedDays,
    totalDays,
    remainingDays,
    avgDailySpend,
    safeDailySpend,
    projectedRemaining,
    categoryBreakdown,
  };
}

/**
 * Returns crossed threshold rules sorted from lowest to highest, plus the highest active threshold.
 */
export function evaluateBudgetThresholds(progress: BudgetProgress): {
  crossedRules: ThresholdRule[];
  highestActive: ThresholdRule | null;
} {
  const pct = progress.percentage;
  const crossedRules: ThresholdRule[] = [];

  if (pct >= 70) crossedRules.push(BUDGET_THRESHOLDS[0]);
  if (pct >= 85) crossedRules.push(BUDGET_THRESHOLDS[1]);
  if (pct >= 100) crossedRules.push(BUDGET_THRESHOLDS[2]);
  if (pct > 100) crossedRules.push(BUDGET_THRESHOLDS[3]);

  const highestActive = crossedRules.length > 0 ? crossedRules[crossedRules.length - 1] : null;
  return { crossedRules, highestActive };
}

/**
 * Selects the most relevant active budget for the current period or today.
 */
export function pickPrimaryActiveBudget(
  budgets: Budget[],
  todayDateKey: string,
  preferredPeriodType?: 'weekly' | 'monthly' | 'custom'
): Budget | null {
  const active = budgets.filter((b) => b.status === 'active');
  if (active.length === 0) return null;

  const coveringToday = active.filter(
    (b) => b.startDate <= todayDateKey && b.endDate >= todayDateKey
  );
  const pool = coveringToday.length > 0 ? coveringToday : active;

  if (preferredPeriodType) {
    const matched = pool.find((b) => b.periodType === preferredPeriodType);
    if (matched) return matched;
  }

  return [...pool].sort((a, b) => b.startDate.localeCompare(a.startDate))[0] || null;
}

/**
 * Evaluates financial health and generates data-driven Indonesian recommendations citing real figures.
 */
export function evaluateFinancialHealth(params: {
  transactions: Transaction[];
  activeBudget: Budget | null;
  startDateKey: string;
  endDateKey: string;
  todayDateKey: string;
  customCategories?: CustomCategory[];
}): FinancialEvaluation {
  const {
    transactions,
    activeBudget,
    startDateKey,
    endDateKey,
    todayDateKey,
    customCategories = [],
  } = params;

  const periodTotals = calculatePeriodTotals(transactions, startDateKey, endDateKey);
  const prevRange = getPreviousEquivalentRange(startDateKey, endDateKey);
  const prevTotals = calculatePeriodTotals(transactions, prevRange.startDate, prevRange.endDate);

  const hasData = periodTotals.inRangeTransactions.length > 0;
  const periodLabel = `${formatDateId(startDateKey)} – ${formatDateId(endDateKey)}`;

  const budgetProgress = activeBudget
    ? calculateBudgetProgress(activeBudget, transactions, todayDateKey, customCategories)
    : null;

  const expenseMap: Record<string, number> = {};
  for (const tx of periodTotals.inRangeTransactions) {
    if (tx.type === 'expense') {
      expenseMap[tx.category] = (expenseMap[tx.category] || 0) + tx.amount;
    }
  }

  const categoryItems: CategorySpendItem[] = Object.entries(expenseMap)
    .map(([key, spent]) => {
      const meta = getCategoryMeta(key, customCategories);
      const limit =
        activeBudget && typeof activeBudget.categoryLimits?.[key] === 'number'
          ? activeBudget.categoryLimits[key]
          : null;
      return {
        categoryKey: key,
        categoryName: meta.name,
        spent,
        limit,
        sharePercent: periodTotals.expense > 0 ? (spent / periodTotals.expense) * 100 : 0,
        color: meta.color,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  const topCategory = categoryItems.length > 0 ? categoryItems[0] : null;
  const expenseChangeAbsolute = periodTotals.expense - prevTotals.expense;
  const expenseChangePercent =
    prevTotals.expense > 0 ? (expenseChangeAbsolute / prevTotals.expense) * 100 : null;

  const { elapsedDays, remainingDays } = getElapsedAndRemainingDays(
    startDateKey,
    endDateKey,
    todayDateKey
  );
  const avgDailySpend = Math.round(periodTotals.expense / elapsedDays);

  const remainingBudget = budgetProgress ? budgetProgress.remaining : null;
  const safeDailyLimit = budgetProgress ? budgetProgress.safeDailySpend : null;
  const projectedEndBalance = budgetProgress ? budgetProgress.projectedRemaining : null;

  const recommendations: FinancialRecommendation[] = [];

  if (hasData) {
    if (budgetProgress) {
      if (budgetProgress.remaining <= 0) {
        const overAmount = Math.abs(budgetProgress.remaining);
        recommendations.push({
          id: 'rec-overspent',
          type: 'warning',
          title: 'Anggaran sudah habis atau terlampaui',
          description: `Pengeluaranmu mencapai ${formatRupiah(budgetProgress.used)} dari anggaran ${formatRupiah(budgetProgress.budget.amount)}${overAmount > 0 ? ` (defisit ${formatRupiah(overAmount)})` : ''}. Tahan pengeluaran non-esensial hingga ${formatDateId(budgetProgress.budget.endDate)}.`,
          suggestedAmount: overAmount > 0 ? overAmount : null,
        });
      } else if (budgetProgress.projectedRemaining < 0) {
        recommendations.push({
          id: 'rec-projected-overspend',
          type: 'warning',
          title: 'Proyeksi pengeluaran berisiko melebihi batas',
          description: `Dengan rata-rata ${formatRupiah(budgetProgress.avgDailySpend)}/hari, saldo anggaran diproyeksikan defisit ${formatRupiah(Math.abs(budgetProgress.projectedRemaining))} sebelum periode berakhir. Batasi pengeluaran harian maksimal ${formatRupiah(budgetProgress.safeDailySpend)}/hari untuk ${budgetProgress.remainingDays} hari tersisa.`,
          suggestedAmount: budgetProgress.safeDailySpend,
        });
      } else if (budgetProgress.remaining > 0) {
        const suggestedSave = Math.round(budgetProgress.remaining * 0.5);
        recommendations.push({
          id: 'rec-save-surplus',
          type: 'save',
          title: 'Peluang alokasi ke Tabungan',
          description: `Sisa anggaran periode ini masih ${formatRupiah(budgetProgress.remaining)} dengan batas aman ${formatRupiah(budgetProgress.safeDailySpend)}/hari. Sisihkan sekitar ${formatRupiah(suggestedSave)} (50% sisa) untuk dana darurat atau target tabungan.`,
          suggestedAmount: suggestedSave,
        });
      }

      // Check category limit overruns
      for (const cat of budgetProgress.categoryBreakdown) {
        if (cat.limit && cat.spent > cat.limit) {
          const excess = cat.spent - cat.limit;
          recommendations.push({
            id: `rec-cat-limit-${cat.categoryKey}`,
            type: 'category',
            title: `Kurangi pengeluaran ${cat.categoryName}`,
            description: `Kategori ${cat.categoryName} sudah mencapai ${formatRupiah(cat.spent)}, melebihi batas kategori ${formatRupiah(cat.limit)} sebesar ${formatRupiah(excess)}.`,
            suggestedAmount: excess,
          });
        }
      }
    }

    if (topCategory && topCategory.sharePercent >= 40 && periodTotals.expense > 0) {
      const cutSuggestion = Math.round(topCategory.spent * 0.15);
      recommendations.push({
        id: 'rec-top-category',
        type: 'category',
        title: `Pos terbesar: ${topCategory.categoryName} (${topCategory.sharePercent.toFixed(0)}%)`,
        description: `Sebesar ${formatRupiah(topCategory.spent)} dari total pengeluaran ${formatRupiah(periodTotals.expense)} terserap untuk ${topCategory.categoryName}. Menghemat 15% di pos ini akan mengembalikan ${formatRupiah(cutSuggestion)} ke kasmu.`,
        suggestedAmount: cutSuggestion,
      });
    }

    if (expenseChangePercent !== null && expenseChangePercent > 15) {
      recommendations.push({
        id: 'rec-period-spike',
        type: 'warning',
        title: `Pengeluaran naik ${expenseChangePercent.toFixed(0)}% dibanding periode lalu`,
        description: `Periode ini kamu membelanjakan ${formatRupiah(periodTotals.expense)} dibanding ${formatRupiah(prevTotals.expense)} pada periode sebelumnya (naik ${formatRupiah(expenseChangeAbsolute)}). Evaluasi transaksi berulang untuk menekan laju harian.`,
        suggestedAmount: expenseChangeAbsolute,
      });
    } else if (expenseChangePercent !== null && expenseChangePercent <= -10) {
      recommendations.push({
        id: 'rec-period-improved',
        type: 'positive',
        title: `Pengeluaran lebih hemat ${Math.abs(expenseChangePercent).toFixed(0)}%`,
        description: `Kerja bagus! Pengeluaran periode ini (${formatRupiah(periodTotals.expense)}) lebih rendah ${formatRupiah(Math.abs(expenseChangeAbsolute))} dibandingkan periode sebelumnya (${formatRupiah(prevTotals.expense)}).`,
        suggestedAmount: Math.abs(expenseChangeAbsolute),
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        id: 'rec-steady',
        type: 'positive',
        title: 'Arus kas berada di jalur yang sehat',
        description: `Rata-rata pengeluaran harianmu ${formatRupiah(avgDailySpend)}/hari dengan total ${formatRupiah(periodTotals.expense)} pada periode ini. Pertahankan kedisiplinan pencatatan setiap hari.`,
        suggestedAmount: null,
      });
    }
  }

  return {
    hasData,
    periodLabel,
    totalIncome: periodTotals.income,
    totalExpense: periodTotals.expense,
    netBalance: periodTotals.net,
    remainingBudget,
    budgetAmount: activeBudget ? activeBudget.amount : null,
    topCategory,
    previousPeriodExpense: prevTotals.expense,
    expenseChangeAbsolute,
    expenseChangePercent,
    avgDailySpend,
    safeDailyLimit,
    projectedEndBalance,
    recommendations,
  };
}

/**
 * Filters transactions by search text (note or category name), type, category, and date range.
 */
export function filterAndSearchTransactions(
  transactions: Transaction[],
  filters: {
    search?: string;
    type?: TransactionType | 'all';
    category?: string;
    startDate?: string;
    endDate?: string;
  },
  customCategories: CustomCategory[] = []
): Transaction[] {
  const searchLower = (filters.search || '').trim().toLowerCase();

  return transactions.filter((tx) => {
    if (filters.type && filters.type !== 'all' && tx.type !== filters.type) {
      return false;
    }
    if (filters.category && filters.category !== 'all' && tx.category !== filters.category) {
      return false;
    }
    if (filters.startDate && tx.dateKey < filters.startDate) {
      return false;
    }
    if (filters.endDate && tx.dateKey > filters.endDate) {
      return false;
    }
    if (searchLower) {
      const catName = getCategoryMeta(tx.category, customCategories).name.toLowerCase();
      const noteLower = tx.note.toLowerCase();
      const creatorLower = tx.createdByName.toLowerCase();
      if (
        !noteLower.includes(searchLower) &&
        !catName.includes(searchLower) &&
        !creatorLower.includes(searchLower)
      ) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Builds daily trend bars & category breakdown for Reports and Dashboard charts.
 */
export function buildReportSeries(
  transactions: Transaction[],
  mode: 'daily' | 'weekly' | 'monthly',
  refDateKey: string,
  customCategories: CustomCategory[] = []
): {
  range: { startDate: string; endDate: string };
  income: number;
  expense: number;
  net: number;
  trend: { dateKey: string; label: string; income: number; expense: number }[];
  categoryDonut: CategorySpendItem[];
  filteredTransactions: Transaction[];
} {
  const range =
    mode === 'daily'
      ? { startDate: refDateKey, endDate: refDateKey }
      : mode === 'weekly'
        ? getWeekRangeJakarta(refDateKey)
        : getMonthRangeJakarta(refDateKey);

  const { income, expense, net, inRangeTransactions } = calculatePeriodTotals(
    transactions,
    range.startDate,
    range.endDate
  );

  const dateKeys = enumerateDateKeys(range.startDate, range.endDate);
  const dailyMap: Record<string, { income: number; expense: number }> = {};
  for (const key of dateKeys) {
    dailyMap[key] = { income: 0, expense: 0 };
  }

  const catExpenseMap: Record<string, number> = {};

  for (const tx of inRangeTransactions) {
    if (!dailyMap[tx.dateKey]) {
      dailyMap[tx.dateKey] = { income: 0, expense: 0 };
    }
    if (tx.type === 'income') {
      dailyMap[tx.dateKey].income += tx.amount;
    } else {
      dailyMap[tx.dateKey].expense += tx.amount;
      catExpenseMap[tx.category] = (catExpenseMap[tx.category] || 0) + tx.amount;
    }
  }

  const trend = dateKeys.map((key) => ({
    dateKey: key,
    label: mode === 'weekly' ? getShortDayNameId(key) : key.slice(8, 10),
    income: dailyMap[key].income,
    expense: dailyMap[key].expense,
  }));

  const categoryDonut: CategorySpendItem[] = Object.entries(catExpenseMap)
    .map(([key, spent]) => {
      const meta = getCategoryMeta(key, customCategories);
      return {
        categoryKey: key,
        categoryName: meta.name,
        spent,
        limit: null,
        sharePercent: expense > 0 ? (spent / expense) * 100 : 0,
        color: meta.color,
      };
    })
    .sort((a, b) => b.spent - a.spent);

  return {
    range,
    income,
    expense,
    net,
    trend,
    categoryDonut,
    filteredTransactions: inRangeTransactions,
  };
}

/**
 * Premium feature: suggests automatic category limits based on historical spending or student kos ratios.
 */
export function suggestAutomaticCategoryLimits(
  totalBudgetAmount: number,
  historicalTransactions: Transaction[]
): Record<string, number> {
  if (totalBudgetAmount <= 0) return {};

  const expenses = historicalTransactions.filter((t) => t.type === 'expense');
  const totalHist = expenses.reduce((acc, t) => acc + t.amount, 0);

  if (expenses.length >= 5 && totalHist > 0) {
    const byCat: Record<string, number> = {};
    for (const tx of expenses) {
      byCat[tx.category] = (byCat[tx.category] || 0) + tx.amount;
    }
    const result: Record<string, number> = {};
    let allocated = 0;
    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    entries.forEach(([cat, amt], idx) => {
      if (idx === entries.length - 1) {
        result[cat] = Math.max(0, totalBudgetAmount - allocated);
      } else {
        const share = Math.round(((amt / totalHist) * totalBudgetAmount) / 1000) * 1000;
        result[cat] = share;
        allocated += share;
      }
    });
    return result;
  }

  const result: Record<string, number> = {};
  let allocated = 0;
  const entries = Object.entries(DEFAULT_CATEGORY_RATIOS_KOS);
  entries.forEach(([cat, ratio], idx) => {
    if (idx === entries.length - 1) {
      result[cat] = Math.max(0, totalBudgetAmount - allocated);
    } else {
      const val = Math.round((totalBudgetAmount * ratio) / 1000) * 1000;
      result[cat] = val;
      allocated += val;
    }
  });
  return result;
}
