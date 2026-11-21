import { describe, expect, it } from 'vitest';
import {
  calculateBalance,
  calculateBudgetProgress,
  calculatePeriodTotals,
  evaluateBudgetThresholds,
  evaluateFinancialHealth,
  filterAndSearchTransactions,
} from '@/src/lib/calculations';
import { formatRupiah } from '@/src/lib/money';
import type { Budget, Transaction } from '@/src/types';

const baseBudget: Budget = {
  id: 'b1',
  scope: 'personal',
  ownerId: 'u1',
  groupId: null,
  name: 'Anggaran Mingguan Kos',
  amount: 300000,
  periodType: 'weekly',
  startDate: '2026-11-16',
  endDate: '2026-11-22',
  categoryLimits: { makan: 150000, transportasi: 50000 },
  status: 'active',
  createdBy: 'u1',
};

function makeTx(partial: Partial<Transaction>): Transaction {
  return {
    id: partial.id || 'tx',
    scope: partial.scope || 'personal',
    ownerId: partial.ownerId || 'u1',
    groupId: partial.groupId ?? null,
    createdBy: partial.createdBy || 'u1',
    createdByName: partial.createdByName || 'Sari',
    type: partial.type || 'expense',
    amount: partial.amount ?? 10000,
    category: partial.category || 'makan',
    dateKey: partial.dateKey || '2026-11-18',
    date: partial.date || new Date('2026-11-18T05:00:00Z'),
    note: partial.note ?? '',
  };
}

describe('Financial calculations & budget thresholds', () => {
  it('formats IDR as integer Rp without decimals', () => {
    expect(formatRupiah(300000)).toBe('Rp300.000');
    expect(formatRupiah(-25000)).toBe('-Rp25.000');
    expect(formatRupiah(500000, { withSign: true })).toBe('+Rp500.000');
  });

  it('computes all-time available balance separately from period totals', () => {
    const txs = [
      makeTx({ id: '1', type: 'income', amount: 500000, dateKey: '2026-11-01' }),
      makeTx({ id: '2', type: 'expense', amount: 120000, dateKey: '2026-11-10' }),
      makeTx({ id: '3', type: 'expense', amount: 85500, dateKey: '2026-11-18' }),
    ];

    const bal = calculateBalance(txs);
    expect(bal.allTimeIncome).toBe(500000);
    expect(bal.allTimeExpense).toBe(205500);
    expect(bal.availableBalance).toBe(294500);

    const weekTotals = calculatePeriodTotals(txs, '2026-11-16', '2026-11-22');
    expect(weekTotals.income).toBe(0);
    expect(weekTotals.expense).toBe(85500);
    expect(weekTotals.net).toBe(-85500);
  });

  it('never counts income toward budget usage and respects exact boundary dates', () => {
    const txs = [
      makeTx({ id: 'inc1', type: 'income', amount: 1000000, dateKey: '2026-11-17' }),
      makeTx({ id: 'before', type: 'expense', amount: 50000, dateKey: '2026-11-15' }),
      makeTx({ id: 'start', type: 'expense', amount: 100000, dateKey: '2026-11-16' }),
      makeTx({ id: 'end', type: 'expense', amount: 110000, dateKey: '2026-11-22' }),
      makeTx({ id: 'after', type: 'expense', amount: 90000, dateKey: '2026-11-23' }),
    ];

    const progress = calculateBudgetProgress(baseBudget, txs, '2026-11-20');
    expect(progress.used).toBe(210000);
    expect(progress.remaining).toBe(90000);
    expect(progress.percentage).toBeCloseTo(70, 5);
  });

  it('triggers thresholds at 70%, 85%, 100%, and >100% accurately', () => {
    const p70 = calculateBudgetProgress(
      baseBudget,
      [makeTx({ amount: 210000, dateKey: '2026-11-18' })],
      '2026-11-20'
    );
    expect(evaluateBudgetThresholds(p70).highestActive?.threshold).toBe(70);

    const p85 = calculateBudgetProgress(
      baseBudget,
      [makeTx({ amount: 255000, dateKey: '2026-11-18' })],
      '2026-11-20'
    );
    expect(evaluateBudgetThresholds(p85).highestActive?.threshold).toBe(85);
    expect(evaluateBudgetThresholds(p85).crossedRules.map((r) => r.threshold)).toEqual([70, 85]);

    const p100 = calculateBudgetProgress(
      baseBudget,
      [makeTx({ amount: 300000, dateKey: '2026-11-18' })],
      '2026-11-20'
    );
    expect(evaluateBudgetThresholds(p100).highestActive?.threshold).toBe(100);

    const pOver = calculateBudgetProgress(
      baseBudget,
      [makeTx({ amount: 325000, dateKey: '2026-11-18' })],
      '2026-11-20'
    );
    expect(evaluateBudgetThresholds(pOver).highestActive?.threshold).toBe(101);
    expect(pOver.remaining).toBe(-25000);
  });

  it('isolates group transactions from personal budgets', () => {
    const txs = [
      makeTx({ id: 'p1', scope: 'personal', amount: 60000, dateKey: '2026-11-18' }),
      makeTx({ id: 'g1', scope: 'group', groupId: 'grp1', amount: 200000, dateKey: '2026-11-18' }),
    ];

    const progress = calculateBudgetProgress(baseBudget, txs, '2026-11-20');
    expect(progress.used).toBe(60000);
  });

  it('produces data-driven financial evaluation with real numeric citations', () => {
    const txs = [
      makeTx({ id: '1', type: 'income', amount: 400000, dateKey: '2026-11-16' }),
      makeTx({ id: '2', type: 'expense', category: 'makan', amount: 180000, dateKey: '2026-11-17' }),
      makeTx({ id: '3', type: 'expense', category: 'transportasi', amount: 80000, dateKey: '2026-11-19' }),
    ];

    const evalResult = evaluateFinancialHealth({
      transactions: txs,
      activeBudget: baseBudget,
      startDateKey: '2026-11-16',
      endDateKey: '2026-11-22',
      todayDateKey: '2026-11-20',
    });

    expect(evalResult.hasData).toBe(true);
    expect(evalResult.remainingBudget).toBe(40000);
    expect(evalResult.topCategory?.categoryKey).toBe('makan');
    expect(evalResult.recommendations.length).toBeGreaterThan(0);
    expect(evalResult.recommendations.some((r) => r.description.includes('Rp'))).toBe(true);
  });

  it('filters and searches transactions accurately in Indonesian lowercase', () => {
    const txs = [
      makeTx({ id: '1', category: 'makan', note: 'Ayam Geprek', amount: 25000 }),
      makeTx({ id: '2', category: 'laundry', note: 'Cuci Kiloan', amount: 20000 }),
    ];
    const filtered = filterAndSearchTransactions(txs, { search: 'geprek', type: 'expense' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });
});
