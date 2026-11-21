import type { Timestamp } from 'firebase/firestore';

export type WorkspaceScope = 'personal' | 'group';
export type TransactionType = 'income' | 'expense';
export type BudgetPeriodType = 'weekly' | 'monthly' | 'custom';
export type BudgetStatus = 'active' | 'archived';
export type GroupRole = 'owner' | 'member';
export type NotificationLevel = 'info' | 'warning' | 'danger';
export type SavingsGoalStatus = 'active' | 'completed' | 'archived';
export type PeriodPreset = 'week' | 'month' | 'custom';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  lastWorkspace: string;
  createdAt?: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
}

export interface GroupMemberPermissions {
  canAddTransactions: boolean;
  canViewAllTransactions: boolean;
  canEditOwnTransactions: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  inviteCode: string;
  memberPermissions: GroupMemberPermissions;
  createdAt?: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
}

export interface GroupMember {
  id: string;
  groupId: string;
  uid: string;
  role: GroupRole;
  displayName: string;
  photoURL: string;
  inviteCode: string;
  joinedAt?: Timestamp | Date | null;
}

export interface CategoryDefinition {
  key: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isDefault?: boolean;
}

export interface CustomCategory {
  id: string;
  scope: WorkspaceScope;
  ownerId: string;
  groupId: string | null;
  type: TransactionType;
  name: string;
  icon: string;
  color: string;
  createdAt?: Timestamp | Date | null;
}

export interface Budget {
  id: string;
  scope: WorkspaceScope;
  ownerId: string;
  groupId: string | null;
  name: string;
  amount: number;
  periodType: BudgetPeriodType;
  startDate: string; // YYYY-MM-DD in Asia/Jakarta
  endDate: string; // YYYY-MM-DD in Asia/Jakarta
  categoryLimits: Record<string, number>;
  status: BudgetStatus;
  createdBy: string;
  createdAt?: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
}

export interface Transaction {
  id: string;
  scope: WorkspaceScope;
  ownerId: string;
  groupId: string | null;
  createdBy: string;
  createdByName: string;
  type: TransactionType;
  amount: number; // positive integer IDR
  category: string;
  dateKey: string; // YYYY-MM-DD in Asia/Jakarta
  date: Date;
  note: string;
  createdAt?: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
}

export interface BudgetNotification {
  id: string;
  userId: string;
  scope: WorkspaceScope;
  groupId: string | null;
  budgetId: string;
  threshold: number;
  level: NotificationLevel;
  title: string;
  message: string;
  isRead: boolean;
  createdAt?: Timestamp | Date | null;
}

export interface SavingsGoal {
  id: string;
  scope: WorkspaceScope;
  ownerId: string;
  groupId: string | null;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // YYYY-MM-DD or ''
  status: SavingsGoalStatus;
  createdBy: string;
  createdAt?: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
}

export interface PremiumSubscription {
  userId: string;
  plan: 'premium_monthly';
  priceIdr: 19000;
  status: 'active' | 'inactive';
  simulated: true;
  startedAt?: Timestamp | Date | null;
  expiresAt?: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface CategorySpendItem {
  categoryKey: string;
  categoryName: string;
  spent: number;
  limit: number | null;
  sharePercent: number;
  color: string;
}

export interface BudgetProgress {
  budget: Budget;
  used: number;
  remaining: number;
  percentage: number;
  elapsedDays: number;
  totalDays: number;
  remainingDays: number;
  avgDailySpend: number;
  safeDailySpend: number;
  projectedRemaining: number;
  categoryBreakdown: CategorySpendItem[];
}

export interface FinancialRecommendation {
  id: string;
  type: 'warning' | 'save' | 'category' | 'positive';
  title: string;
  description: string;
  suggestedAmount: number | null;
}

export interface FinancialEvaluation {
  hasData: boolean;
  periodLabel: string;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  remainingBudget: number | null;
  budgetAmount: number | null;
  topCategory: CategorySpendItem | null;
  previousPeriodExpense: number;
  expenseChangeAbsolute: number;
  expenseChangePercent: number | null;
  avgDailySpend: number;
  safeDailyLimit: number | null;
  projectedEndBalance: number | null;
  recommendations: FinancialRecommendation[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
}
