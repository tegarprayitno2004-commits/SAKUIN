import { getMonthRangeJakarta, getTodayJakartaDateKey, getWeekRangeJakarta, jakartaDateKeyToDate, shiftDateKey } from '@/src/lib/dates';
import type { Budget, BudgetNotification, SavingsGoal, Transaction, UserProfile } from '@/src/types';

export function buildDemoDataset(): {
  user: UserProfile;
  transactions: Transaction[];
  budgets: Budget[];
  notifications: BudgetNotification[];
  savingsGoals: SavingsGoal[];
} {
  const today = getTodayJakartaDateKey();
  const week = getWeekRangeJakarta(today);
  const month = getMonthRangeJakarta(today);
  const d1 = week.startDate;
  const d2 = shiftDateKey(week.startDate, 'day', 1) <= today ? shiftDateKey(week.startDate, 'day', 1) : today;
  const d3 = shiftDateKey(week.startDate, 'day', 2) <= today ? shiftDateKey(week.startDate, 'day', 2) : today;
  const prevWeekDay = shiftDateKey(week.startDate, 'day', -3);

  const user: UserProfile = {
    uid: 'demo-user',
    displayName: 'Sari (Mode Demo)',
    email: 'sari.demo@sakuin.web.id',
    photoURL: '',
    lastWorkspace: 'personal',
  };

  const transactions: Transaction[] = [
    {
      id: 'demo-tx-1',
      scope: 'personal',
      ownerId: 'demo-user',
      groupId: null,
      createdBy: 'demo-user',
      createdByName: 'Sari (Mode Demo)',
      type: 'income',
      amount: 500000,
      category: 'kiriman_ortu',
      dateKey: d1,
      date: jakartaDateKeyToDate(d1, '08:30'),
      note: 'Kiriman uang saku mingguan',
    },
    {
      id: 'demo-tx-2',
      scope: 'personal',
      ownerId: 'demo-user',
      groupId: null,
      createdBy: 'demo-user',
      createdByName: 'Sari (Mode Demo)',
      type: 'expense',
      amount: 25000,
      category: 'makan',
      dateKey: d1,
      date: jakartaDateKeyToDate(d1, '12:15'),
      note: 'Nasi ayam geprek + es teh',
    },
    {
      id: 'demo-tx-3',
      scope: 'personal',
      ownerId: 'demo-user',
      groupId: null,
      createdBy: 'demo-user',
      createdByName: 'Sari (Mode Demo)',
      type: 'expense',
      amount: 15000,
      category: 'transportasi',
      dateKey: d1,
      date: jakartaDateKeyToDate(d1, '16:40'),
      note: 'Ojek online ke kampus',
    },
    {
      id: 'demo-tx-4',
      scope: 'personal',
      ownerId: 'demo-user',
      groupId: null,
      createdBy: 'demo-user',
      createdByName: 'Sari (Mode Demo)',
      type: 'expense',
      amount: 50000,
      category: 'tagihan',
      dateKey: d2,
      date: jakartaDateKeyToDate(d2, '09:00'),
      note: 'Paket kuota internet bulanan',
    },
    {
      id: 'demo-tx-5',
      scope: 'personal',
      ownerId: 'demo-user',
      groupId: null,
      createdBy: 'demo-user',
      createdByName: 'Sari (Mode Demo)',
      type: 'expense',
      amount: 20000,
      category: 'laundry',
      dateKey: d2,
      date: jakartaDateKeyToDate(d2, '18:00'),
      note: 'Laundry kiloan baju kos',
    },
    {
      id: 'demo-tx-6',
      scope: 'personal',
      ownerId: 'demo-user',
      groupId: null,
      createdBy: 'demo-user',
      createdByName: 'Sari (Mode Demo)',
      type: 'expense',
      amount: 145000,
      category: 'makan',
      dateKey: d3,
      date: jakartaDateKeyToDate(d3, '13:00'),
      note: 'Belanja lauk & galon air minggu ini',
    },
    {
      id: 'demo-tx-7',
      scope: 'personal',
      ownerId: 'demo-user',
      groupId: null,
      createdBy: 'demo-user',
      createdByName: 'Sari (Mode Demo)',
      type: 'expense',
      amount: 180000,
      category: 'makan',
      dateKey: prevWeekDay,
      date: jakartaDateKeyToDate(prevWeekDay, '19:00'),
      note: 'Makan minggu lalu',
    },
  ];

  const budgets: Budget[] = [
    {
      id: 'demo-budget-week',
      scope: 'personal',
      ownerId: 'demo-user',
      groupId: null,
      name: 'Anggaran Mingguan Kos',
      amount: 300000,
      periodType: 'weekly',
      startDate: week.startDate,
      endDate: week.endDate,
      categoryLimits: {
        makan: 170000,
        transportasi: 30000,
        laundry: 25000,
        tagihan: 50000,
      },
      status: 'active',
      createdBy: 'demo-user',
    },
    {
      id: 'demo-budget-month',
      scope: 'personal',
      ownerId: 'demo-user',
      groupId: null,
      name: 'Anggaran Bulanan',
      amount: 1500000,
      periodType: 'monthly',
      startDate: month.startDate,
      endDate: month.endDate,
      categoryLimits: {},
      status: 'active',
      createdBy: 'demo-user',
    },
  ];

  const notifications: BudgetNotification[] = [
    {
      id: 'demo-notif-85',
      userId: 'demo-user',
      scope: 'personal',
      groupId: null,
      budgetId: 'demo-budget-week',
      threshold: 85,
      level: 'warning',
      title: 'Peringatan Penting Anggaran (85%)',
      message:
        'Perhatian! Pengeluaran pada anggaran "Anggaran Mingguan Kos" sudah mencapai 85%. Kurangi pengeluaran yang tidak terlalu diperlukan (sisa Rp45.000).',
      isRead: false,
    },
  ];

  const savingsGoals: SavingsGoal[] = [
    {
      id: 'demo-goal-1',
      scope: 'personal',
      ownerId: 'demo-user',
      groupId: null,
      name: 'Dana Darurat Anak Kos',
      targetAmount: 1000000,
      currentAmount: 450000,
      deadline: shiftDateKey(today, 'month', 3),
      status: 'active',
      createdBy: 'demo-user',
    },
  ];

  return { user, transactions, budgets, notifications, savingsGoals };
}
