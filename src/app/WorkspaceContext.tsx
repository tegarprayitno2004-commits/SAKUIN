import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { useAuth } from '@/src/app/AuthContext';
import { buildDemoDataset } from '@/src/constants/demoData';
import { calculateBudgetProgress, evaluateBudgetThresholds } from '@/src/lib/calculations';
import { getTodayJakartaDateKey, toJakartaDateKey } from '@/src/lib/dates';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { generateInviteCode, isValidInviteCodeFormat, normalizeInviteCode } from '@/src/lib/inviteCode';
import { formatRupiah } from '@/src/lib/money';
import type {
  Budget,
  BudgetNotification,
  CustomCategory,
  Group,
  GroupMember,
  GroupMemberPermissions,
  GroupRole,
  PremiumSubscription,
  SavingsGoal,
  Transaction,
  WorkspaceScope,
} from '@/src/types';

export type TransactionInput = {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  dateKey: string;
  date: Date;
  note: string;
};

export type BudgetInput = {
  name: string;
  amount: number;
  periodType: 'weekly' | 'monthly' | 'custom';
  startDate: string;
  endDate: string;
  categoryLimits: Record<string, number>;
  status?: 'active' | 'archived';
};

export type SavingsGoalInput = {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  status?: 'active' | 'completed' | 'archived';
};

interface WorkspaceContextValue {
  activeWorkspaceId: string; // 'personal' or groupId
  scope: WorkspaceScope;
  activeGroup: Group | null;
  activeGroupRole: GroupRole | null;
  groups: Group[];
  myMemberships: GroupMember[];
  activeGroupMembers: GroupMember[];
  transactions: Transaction[];
  hasMoreTransactions: boolean;
  loadMoreTransactions: () => void;
  budgets: Budget[];
  customCategories: CustomCategory[];
  notifications: BudgetNotification[];
  unreadNotificationCount: number;
  savingsGoals: SavingsGoal[];
  subscription: PremiumSubscription | null;
  isPremium: boolean;
  loadingData: boolean;
  canAddTransaction: boolean;
  canEditTransaction: (tx: Transaction) => boolean;
  canManageBudgets: boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  addTransaction: (input: TransactionInput) => Promise<void>;
  updateTransaction: (id: string, input: TransactionInput) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addBudget: (input: BudgetInput) => Promise<void>;
  updateBudget: (id: string, input: BudgetInput) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addCustomCategory: (input: { type: 'income' | 'expense'; name: string; icon: string; color: string }) => Promise<void>;
  deleteCustomCategory: (id: string) => Promise<void>;
  markNotificationRead: (id: string, isRead?: boolean) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  createGroup: (input: { name: string; description: string }) => Promise<Group>;
  joinGroupByCode: (rawCode: string) => Promise<Group>;
  updateGroupInfo: (groupId: string, input: { name: string; description: string }) => Promise<void>;
  updateGroupPermissions: (groupId: string, perms: GroupMemberPermissions) => Promise<void>;
  regenerateGroupInviteCode: (groupId: string, currentCode: string) => Promise<string>;
  toggleGroupInviteCodeActive: (code: string, active: boolean) => Promise<void>;
  removeGroupMember: (groupId: string, memberUid: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  activateSimulatedPremium: () => Promise<void>;
  cancelSimulatedPremium: () => Promise<void>;
  addSavingsGoal: (input: SavingsGoalInput) => Promise<void>;
  updateSavingsGoal: (id: string, input: SavingsGoalInput) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

function parseTimestampToDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return new Date();
}

function sanitizeRuleId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { firebaseUser, profile, authReady, isDemoMode } = useAuth();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('personal');
  const [txLimit, setTxLimit] = useState<number>(50);
  const [myMemberships, setMyMemberships] = useState<GroupMember[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupMembers, setActiveGroupMembers] = useState<GroupMember[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [notifications, setNotifications] = useState<BudgetNotification[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [subscription, setSubscription] = useState<PremiumSubscription | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const createdNotifIdsRef = useRef<Set<string>>(new Set());

  // Initialize workspace selection from localStorage or user profile
  useEffect(() => {
    if (isDemoMode) {
      setActiveWorkspaceId('personal');
      return;
    }
    if (!firebaseUser) {
      setActiveWorkspaceId('personal');
      return;
    }
    const cached = window.localStorage.getItem(`sakuin_last_workspace_${firebaseUser.uid}`);
    if (cached) {
      setActiveWorkspaceId(cached);
    } else if (profile?.lastWorkspace) {
      setActiveWorkspaceId(profile.lastWorkspace);
    }
  }, [firebaseUser, profile?.lastWorkspace, isDemoMode]);

  // Demo mode dataset hydration
  useEffect(() => {
    if (!isDemoMode) return;
    const demo = buildDemoDataset();
    setGroups([]);
    setMyMemberships([]);
    setActiveGroupMembers([]);
    setTransactions(demo.transactions);
    setHasMoreTransactions(false);
    setBudgets(demo.budgets);
    setCustomCategories([]);
    setNotifications(demo.notifications);
    setSavingsGoals(demo.savingsGoals);
    setSubscription({
      userId: 'demo-user',
      plan: 'premium_monthly',
      priceIdr: 19000,
      status: 'active',
      simulated: true,
    });
    setLoadingData(false);
  }, [isDemoMode]);

  // Real-time listener: user's groupMemberships & subscription
  useEffect(() => {
    if (!authReady || isDemoMode || !firebaseUser) {
      if (authReady && !isDemoMode && !firebaseUser) {
        setMyMemberships([]);
        setGroups([]);
        setTransactions([]);
        setBudgets([]);
        setCustomCategories([]);
        setNotifications([]);
        setSavingsGoals([]);
        setSubscription(null);
        setLoadingData(false);
      }
      return;
    }

    const qMembers = query(
      collection(db, 'groupMembers'),
      where('uid', '==', firebaseUser.uid)
    );

    const unsubMembers = onSnapshot(
      qMembers,
      (snap) => {
        const list: GroupMember[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            groupId: String(data.groupId),
            uid: String(data.uid),
            role: data.role === 'owner' ? 'owner' : 'member',
            displayName: String(data.displayName || 'Anggota'),
            photoURL: String(data.photoURL || ''),
            inviteCode: String(data.inviteCode || ''),
            joinedAt: data.joinedAt ?? null,
          };
        });
        setMyMemberships(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'groupMembers');
        } catch (wrapped) {
          setFatalError(wrapped instanceof Error ? wrapped.message : String(wrapped));
        }
      }
    );

    const subRef = doc(db, 'premiumSubscriptions', firebaseUser.uid);
    const unsubSub = onSnapshot(
      subRef,
      (snap) => {
        if (!snap.exists()) {
          setSubscription(null);
          return;
        }
        const d = snap.data();
        setSubscription({
          userId: String(d.userId),
          plan: 'premium_monthly',
          priceIdr: 19000,
          status: d.status === 'active' ? 'active' : 'inactive',
          simulated: true,
          startedAt: d.startedAt ?? null,
          expiresAt: d.expiresAt ?? null,
          updatedAt: d.updatedAt ?? null,
        });
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, `premiumSubscriptions/${firebaseUser.uid}`);
        } catch (wrapped) {
          setFatalError(wrapped instanceof Error ? wrapped.message : String(wrapped));
        }
      }
    );

    return () => {
      unsubMembers();
      unsubSub();
    };
  }, [authReady, firebaseUser, isDemoMode]);

  // Listen to each group the user belongs to
  useEffect(() => {
    if (!authReady || isDemoMode || !firebaseUser) return;
    if (myMemberships.length === 0) {
      setGroups([]);
      return;
    }

    const groupMap = new Map<string, Group>();
    const unsubs = myMemberships.map((m) =>
      onSnapshot(
        doc(db, 'groups', m.groupId),
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            groupMap.set(snap.id, {
              id: snap.id,
              name: String(d.name),
              description: String(d.description || ''),
              ownerId: String(d.ownerId),
              inviteCode: String(d.inviteCode),
              memberPermissions: {
                canAddTransactions: Boolean(d.memberPermissions?.canAddTransactions),
                canViewAllTransactions: Boolean(d.memberPermissions?.canViewAllTransactions),
                canEditOwnTransactions: Boolean(d.memberPermissions?.canEditOwnTransactions),
              },
              createdAt: d.createdAt ?? null,
              updatedAt: d.updatedAt ?? null,
            });
          } else {
            groupMap.delete(m.groupId);
          }
          setGroups(Array.from(groupMap.values()));
        },
        () => {
          groupMap.delete(m.groupId);
          setGroups(Array.from(groupMap.values()));
        }
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, firebaseUser, isDemoMode, myMemberships]);

  // Fallback to personal if active group no longer exists in memberships
  useEffect(() => {
    if (isDemoMode || !authReady) return;
    if (activeWorkspaceId === 'personal') return;
    const stillMember = myMemberships.some((m) => m.groupId === activeWorkspaceId);
    if (!stillMember && groups.length === 0 && myMemberships.length === 0) {
      // Wait briefly until memberships load, or if memberships loaded and doesn't include it:
    }
    if (myMemberships.length > 0 && !stillMember) {
      setActiveWorkspaceId('personal');
    }
  }, [activeWorkspaceId, myMemberships, groups.length, isDemoMode, authReady]);

  const activeGroup = useMemo(
    () =>
      activeWorkspaceId === 'personal'
        ? null
        : groups.find((g) => g.id === activeWorkspaceId) || null,
    [activeWorkspaceId, groups]
  );

  const activeMembership = useMemo(
    () =>
      activeWorkspaceId === 'personal'
        ? null
        : myMemberships.find((m) => m.groupId === activeWorkspaceId) || null,
    [activeWorkspaceId, myMemberships]
  );

  const scope: WorkspaceScope = activeGroup ? 'group' : 'personal';
  const activeGroupRole: GroupRole | null = activeMembership ? activeMembership.role : null;

  // Main real-time workspace listeners (transactions, budgets, categories, notifications, savingsGoals, group members)
  useEffect(() => {
    if (!authReady || isDemoMode || !firebaseUser) return;

    if (activeWorkspaceId !== 'personal' && !activeGroup) {
      // Waiting for activeGroup document or membership resolution
      return;
    }

    setLoadingData(true);
    const uid = firebaseUser.uid;
    const isGroup = scope === 'group' && activeGroup !== null;
    const groupId = activeGroup?.id ?? null;

    const canViewAllGroupTx =
      isGroup &&
      (activeGroupRole === 'owner' || activeGroup?.memberPermissions.canViewAllTransactions === true);

    const txQuery = isGroup && groupId
      ? canViewAllGroupTx
        ? query(
            collection(db, 'transactions'),
            where('scope', '==', 'group'),
            where('groupId', '==', groupId),
            orderBy('dateKey', 'desc'),
            orderBy('createdAt', 'desc'),
            limit(txLimit)
          )
        : query(
            collection(db, 'transactions'),
            where('scope', '==', 'group'),
            where('groupId', '==', groupId),
            where('createdBy', '==', uid),
            orderBy('dateKey', 'desc'),
            orderBy('createdAt', 'desc'),
            limit(txLimit)
          )
      : query(
          collection(db, 'transactions'),
          where('scope', '==', 'personal'),
          where('ownerId', '==', uid),
          orderBy('dateKey', 'desc'),
          orderBy('createdAt', 'desc'),
          limit(txLimit)
        );

    const budgetsQuery = isGroup && groupId
      ? query(
          collection(db, 'budgets'),
          where('scope', '==', 'group'),
          where('groupId', '==', groupId),
          orderBy('startDate', 'desc')
        )
      : query(
          collection(db, 'budgets'),
          where('scope', '==', 'personal'),
          where('ownerId', '==', uid),
          orderBy('startDate', 'desc')
        );

    const categoriesQuery = isGroup && groupId
      ? query(
          collection(db, 'categories'),
          where('scope', '==', 'group'),
          where('groupId', '==', groupId)
        )
      : query(
          collection(db, 'categories'),
          where('scope', '==', 'personal'),
          where('ownerId', '==', uid)
        );

    const notificationsQuery = isGroup && groupId
      ? query(
          collection(db, 'notifications'),
          where('userId', '==', uid),
          where('scope', '==', 'group'),
          where('groupId', '==', groupId),
          orderBy('createdAt', 'desc')
        )
      : query(
          collection(db, 'notifications'),
          where('userId', '==', uid),
          where('scope', '==', 'personal'),
          orderBy('createdAt', 'desc')
        );

    const savingsQuery = isGroup && groupId
      ? query(
          collection(db, 'savingsGoals'),
          where('scope', '==', 'group'),
          where('groupId', '==', groupId),
          orderBy('createdAt', 'desc')
        )
      : query(
          collection(db, 'savingsGoals'),
          where('scope', '==', 'personal'),
          where('ownerId', '==', uid),
          orderBy('createdAt', 'desc')
        );

    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        txQuery,
        (snap) => {
          const list: Transaction[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              scope: data.scope === 'group' ? 'group' : 'personal',
              ownerId: String(data.ownerId),
              groupId: data.groupId ? String(data.groupId) : null,
              createdBy: String(data.createdBy),
              createdByName: String(data.createdByName || 'Pengguna'),
              type: data.type === 'income' ? 'income' : 'expense',
              amount: Number(data.amount) || 0,
              category: String(data.category),
              dateKey: String(data.dateKey),
              date: parseTimestampToDate(data.date),
              note: String(data.note || ''),
              createdAt: data.createdAt ?? null,
              updatedAt: data.updatedAt ?? null,
            };
          });
          setTransactions(list);
          setHasMoreTransactions(snap.docs.length >= txLimit);
          setLoadingData(false);
        },
        (err) => {
          setLoadingData(false);
          try {
            handleFirestoreError(err, OperationType.LIST, 'transactions');
          } catch (wrapped) {
            setFatalError(wrapped instanceof Error ? wrapped.message : String(wrapped));
          }
        }
      )
    );

    unsubs.push(
      onSnapshot(
        budgetsQuery,
        (snap) => {
          const list: Budget[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              scope: data.scope === 'group' ? 'group' : 'personal',
              ownerId: String(data.ownerId),
              groupId: data.groupId ? String(data.groupId) : null,
              name: String(data.name),
              amount: Number(data.amount) || 0,
              periodType:
                data.periodType === 'monthly' || data.periodType === 'custom'
                  ? data.periodType
                  : 'weekly',
              startDate: String(data.startDate),
              endDate: String(data.endDate),
              categoryLimits: (data.categoryLimits as Record<string, number>) || {},
              status: data.status === 'archived' ? 'archived' : 'active',
              createdBy: String(data.createdBy),
              createdAt: data.createdAt ?? null,
              updatedAt: data.updatedAt ?? null,
            };
          });
          setBudgets(list);
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.LIST, 'budgets');
          } catch (wrapped) {
            setFatalError(wrapped instanceof Error ? wrapped.message : String(wrapped));
          }
        }
      )
    );

    unsubs.push(
      onSnapshot(
        categoriesQuery,
        (snap) => {
          const list: CustomCategory[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              scope: data.scope === 'group' ? 'group' : 'personal',
              ownerId: String(data.ownerId),
              groupId: data.groupId ? String(data.groupId) : null,
              type: data.type === 'income' ? 'income' : 'expense',
              name: String(data.name),
              icon: String(data.icon || 'Tag'),
              color: String(data.color || '#047857'),
              createdAt: data.createdAt ?? null,
            };
          });
          setCustomCategories(list);
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.LIST, 'categories');
          } catch (wrapped) {
            setFatalError(wrapped instanceof Error ? wrapped.message : String(wrapped));
          }
        }
      )
    );

    unsubs.push(
      onSnapshot(
        notificationsQuery,
        (snap) => {
          const list: BudgetNotification[] = snap.docs.map((d) => {
            const data = d.data();
            createdNotifIdsRef.current.add(d.id);
            return {
              id: d.id,
              userId: String(data.userId),
              scope: data.scope === 'group' ? 'group' : 'personal',
              groupId: data.groupId ? String(data.groupId) : null,
              budgetId: String(data.budgetId),
              threshold: Number(data.threshold) || 70,
              level:
                data.level === 'danger' || data.level === 'warning' ? data.level : 'info',
              title: String(data.title),
              message: String(data.message),
              isRead: Boolean(data.isRead),
              createdAt: data.createdAt ?? null,
            };
          });
          setNotifications(list);
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.LIST, 'notifications');
          } catch (wrapped) {
            setFatalError(wrapped instanceof Error ? wrapped.message : String(wrapped));
          }
        }
      )
    );

    unsubs.push(
      onSnapshot(
        savingsQuery,
        (snap) => {
          const list: SavingsGoal[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              scope: data.scope === 'group' ? 'group' : 'personal',
              ownerId: String(data.ownerId),
              groupId: data.groupId ? String(data.groupId) : null,
              name: String(data.name),
              targetAmount: Number(data.targetAmount) || 0,
              currentAmount: Number(data.currentAmount) || 0,
              deadline: String(data.deadline || ''),
              status:
                data.status === 'completed' || data.status === 'archived'
                  ? data.status
                  : 'active',
              createdBy: String(data.createdBy),
              createdAt: data.createdAt ?? null,
              updatedAt: data.updatedAt ?? null,
            };
          });
          setSavingsGoals(list);
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.LIST, 'savingsGoals');
          } catch (wrapped) {
            setFatalError(wrapped instanceof Error ? wrapped.message : String(wrapped));
          }
        }
      )
    );

    if (isGroup && groupId) {
      const groupMembersQ = query(
        collection(db, 'groupMembers'),
        where('groupId', '==', groupId)
      );
      unsubs.push(
        onSnapshot(
          groupMembersQ,
          (snap) => {
            const list: GroupMember[] = snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                groupId: String(data.groupId),
                uid: String(data.uid),
                role: data.role === 'owner' ? 'owner' : 'member',
                displayName: String(data.displayName || 'Anggota'),
                photoURL: String(data.photoURL || ''),
                inviteCode: String(data.inviteCode || ''),
                joinedAt: data.joinedAt ?? null,
              };
            });
            setActiveGroupMembers(list);
          },
          (err) => {
            try {
              handleFirestoreError(err, OperationType.LIST, 'groupMembers');
            } catch (wrapped) {
              setFatalError(wrapped instanceof Error ? wrapped.message : String(wrapped));
            }
          }
        )
      );
    } else {
      setActiveGroupMembers([]);
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [
    authReady,
    isDemoMode,
    firebaseUser,
    activeWorkspaceId,
    activeGroup,
    activeGroupRole,
    scope,
    txLimit,
  ]);

  const isPremium = useMemo(() => {
    if (isDemoMode) return true;
    return subscription?.status === 'active';
  }, [isDemoMode, subscription]);

  // Deterministic, create-only threshold notification evaluation
  useEffect(() => {
    if (!authReady || isDemoMode || !firebaseUser || loadingData) return;
    if (budgets.length === 0) return;

    const todayKey = getTodayJakartaDateKey();
    const uid = firebaseUser.uid;
    const existingIds = new Set(notifications.map((n) => n.id));

    for (const budget of budgets) {
      if (budget.status !== 'active') continue;
      if (budget.scope !== scope) continue;
      if (scope === 'group' && budget.groupId !== activeGroup?.id) continue;

      const progress = calculateBudgetProgress(budget, transactions, todayKey, customCategories);
      const { crossedRules } = evaluateBudgetThresholds(progress);

      for (const rule of crossedRules) {
        const notifId = sanitizeRuleId(`${uid}_${budget.id}_${rule.threshold}`);
        if (existingIds.has(notifId) || createdNotifIdsRef.current.has(notifId)) continue;

        createdNotifIdsRef.current.add(notifId);
        const remainingText = formatRupiah(Math.abs(progress.remaining));
        const message = rule
          .buildMessage(budget.name, progress.percentage, remainingText)
          .slice(0, 400);

        const notifRef = doc(db, 'notifications', notifId);
        getDoc(notifRef)
          .then((snap) => {
            if (!snap.exists()) {
              return setDoc(notifRef, {
                userId: uid,
                scope: budget.scope,
                groupId: budget.groupId,
                budgetId: budget.id,
                threshold: rule.threshold,
                level: rule.level,
                title: rule.title.slice(0, 120),
                message,
                isRead: false,
                createdAt: serverTimestamp(),
              });
            }
            return undefined;
          })
          .catch(() => {
            createdNotifIdsRef.current.delete(notifId);
          });
      }

      // Extended notification for Premium: per-category limit exceeded
      if (isPremium) {
        for (const cat of progress.categoryBreakdown) {
          if (cat.limit && cat.spent > cat.limit) {
            const catNotifId = sanitizeRuleId(`${uid}_${budget.id}_cat_${cat.categoryKey}_100`);
            if (existingIds.has(catNotifId) || createdNotifIdsRef.current.has(catNotifId)) continue;
            createdNotifIdsRef.current.add(catNotifId);
            const notifRef = doc(db, 'notifications', catNotifId);
            getDoc(notifRef)
              .then((snap) => {
                if (!snap.exists()) {
                  return setDoc(notifRef, {
                    userId: uid,
                    scope: budget.scope,
                    groupId: budget.groupId,
                    budgetId: budget.id,
                    threshold: 100,
                    level: 'warning',
                    title: `Batas Kategori ${cat.categoryName} Terlampaui`.slice(0, 120),
                    message: `Pengeluaran kategori ${cat.categoryName} pada "${budget.name}" telah mencapai ${formatRupiah(cat.spent)}, melebihi batas ${formatRupiah(cat.limit ?? 0)}.`.slice(0, 400),
                    isRead: false,
                    createdAt: serverTimestamp(),
                  });
                }
                return undefined;
              })
              .catch(() => {
                createdNotifIdsRef.current.delete(catNotifId);
              });
          }
        }
      }
    }
  }, [
    authReady,
    isDemoMode,
    firebaseUser,
    loadingData,
    budgets,
    transactions,
    notifications,
    scope,
    activeGroup?.id,
    customCategories,
    isPremium,
  ]);

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      setTxLimit(50);
      setActiveWorkspaceId(workspaceId);
      if (firebaseUser && !isDemoMode) {
        window.localStorage.setItem(`sakuin_last_workspace_${firebaseUser.uid}`, workspaceId);
        try {
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            lastWorkspace: workspaceId.slice(0, 128),
            updatedAt: serverTimestamp(),
          });
        } catch {
          // non-fatal preference sync
        }
      }
    },
    [firebaseUser, isDemoMode]
  );

  const loadMoreTransactions = useCallback(() => {
    setTxLimit((prev) => prev + 50);
  }, []);

  const canAddTransaction = useMemo(() => {
    if (isDemoMode) return false;
    if (scope === 'personal') return true;
    if (!activeGroup) return false;
    return activeGroupRole === 'owner' || activeGroup.memberPermissions.canAddTransactions;
  }, [isDemoMode, scope, activeGroup, activeGroupRole]);

  const canEditTransaction = useCallback(
    (tx: Transaction) => {
      if (isDemoMode || !firebaseUser) return false;
      if (tx.scope === 'personal') return tx.ownerId === firebaseUser.uid;
      if (!activeGroup) return false;
      if (activeGroupRole === 'owner') return true;
      return (
        tx.createdBy === firebaseUser.uid &&
        activeGroup.memberPermissions.canEditOwnTransactions
      );
    },
    [isDemoMode, firebaseUser, activeGroup, activeGroupRole]
  );

  const canManageBudgets = useMemo(() => {
    if (isDemoMode) return false;
    if (scope === 'personal') return true;
    return activeGroupRole === 'owner';
  }, [isDemoMode, scope, activeGroupRole]);

  // CRUD Actions
  const addTransaction = useCallback(
    async (input: TransactionInput) => {
      if (isDemoMode || !firebaseUser) throw new Error('Mode Demo hanya untuk dibaca.');
      const normalizedDateKey = input.dateKey || toJakartaDateKey(input.date);
      try {
        await addDoc(collection(db, 'transactions'), {
          scope,
          ownerId: firebaseUser.uid,
          groupId: scope === 'group' && activeGroup ? activeGroup.id : null,
          createdBy: firebaseUser.uid,
          createdByName: (profile?.displayName || firebaseUser.displayName || 'Pengguna').slice(0, 80),
          type: input.type,
          amount: Math.round(input.amount),
          category: input.category.slice(0, 50),
          dateKey: normalizedDateKey,
          date: Timestamp.fromDate(input.date),
          note: input.note.trim().slice(0, 200),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'transactions');
      }
    },
    [isDemoMode, firebaseUser, scope, activeGroup, profile?.displayName]
  );

  const updateTransaction = useCallback(
    async (id: string, input: TransactionInput) => {
      if (isDemoMode || !firebaseUser) throw new Error('Mode Demo hanya untuk dibaca.');
      const normalizedDateKey = input.dateKey || toJakartaDateKey(input.date);
      try {
        await updateDoc(doc(db, 'transactions', id), {
          type: input.type,
          amount: Math.round(input.amount),
          category: input.category.slice(0, 50),
          dateKey: normalizedDateKey,
          date: Timestamp.fromDate(input.date),
          note: input.note.trim().slice(0, 200),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `transactions/${id}`);
      }
    },
    [isDemoMode, firebaseUser]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (isDemoMode || !firebaseUser) throw new Error('Mode Demo hanya untuk dibaca.');
      try {
        await deleteDoc(doc(db, 'transactions', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `transactions/${id}`);
      }
    },
    [isDemoMode, firebaseUser]
  );

  const addBudget = useCallback(
    async (input: BudgetInput) => {
      if (isDemoMode || !firebaseUser) throw new Error('Mode Demo hanya untuk dibaca.');
      try {
        await addDoc(collection(db, 'budgets'), {
          scope,
          ownerId: firebaseUser.uid,
          groupId: scope === 'group' && activeGroup ? activeGroup.id : null,
          name: input.name.trim().slice(0, 80),
          amount: Math.round(input.amount),
          periodType: input.periodType,
          startDate: input.startDate,
          endDate: input.endDate,
          categoryLimits: input.categoryLimits || {},
          status: input.status || 'active',
          createdBy: firebaseUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'budgets');
      }
    },
    [isDemoMode, firebaseUser, scope, activeGroup]
  );

  const updateBudget = useCallback(
    async (id: string, input: BudgetInput) => {
      if (isDemoMode || !firebaseUser) throw new Error('Mode Demo hanya untuk dibaca.');
      try {
        await updateDoc(doc(db, 'budgets', id), {
          name: input.name.trim().slice(0, 80),
          amount: Math.round(input.amount),
          periodType: input.periodType,
          startDate: input.startDate,
          endDate: input.endDate,
          categoryLimits: input.categoryLimits || {},
          status: input.status || 'active',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `budgets/${id}`);
      }
    },
    [isDemoMode, firebaseUser]
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      if (isDemoMode || !firebaseUser) throw new Error('Mode Demo hanya untuk dibaca.');
      try {
        await deleteDoc(doc(db, 'budgets', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `budgets/${id}`);
      }
    },
    [isDemoMode, firebaseUser]
  );

  const addCustomCategory = useCallback(
    async (input: { type: 'income' | 'expense'; name: string; icon: string; color: string }) => {
      if (isDemoMode || !firebaseUser) throw new Error('Mode Demo hanya untuk dibaca.');
      try {
        await addDoc(collection(db, 'categories'), {
          scope,
          ownerId: firebaseUser.uid,
          groupId: scope === 'group' && activeGroup ? activeGroup.id : null,
          type: input.type,
          name: input.name.trim().slice(0, 50),
          icon: input.icon.slice(0, 40),
          color: input.color.slice(0, 30),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'categories');
      }
    },
    [isDemoMode, firebaseUser, scope, activeGroup]
  );

  const deleteCustomCategory = useCallback(
    async (id: string) => {
      if (isDemoMode || !firebaseUser) throw new Error('Mode Demo hanya untuk dibaca.');
      try {
        await deleteDoc(doc(db, 'categories', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
      }
    },
    [isDemoMode, firebaseUser]
  );

  const markNotificationRead = useCallback(
    async (id: string, isRead = true) => {
      if (isDemoMode) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead } : n)));
        return;
      }
      if (!firebaseUser) return;
      try {
        await updateDoc(doc(db, 'notifications', id), { isRead });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
      }
    },
    [isDemoMode, firebaseUser]
  );

  const markAllNotificationsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    if (isDemoMode) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      return;
    }
    if (!firebaseUser) return;
    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, 'notifications', n.id), { isRead: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'notifications');
    }
  }, [notifications, isDemoMode, firebaseUser]);

  // Group Operations
  const createGroup = useCallback(
    async (input: { name: string; description: string }): Promise<Group> => {
      if (isDemoMode || !firebaseUser) throw new Error('Silakan masuk akun untuk membuat kelompok.');
      const groupRef = doc(collection(db, 'groups'));
      const code = generateInviteCode(8);
      const memberRef = doc(db, 'groupMembers', `${groupRef.id}_${firebaseUser.uid}`);
      const inviteRef = doc(db, 'inviteCodes', code);
      const cleanName = input.name.trim().slice(0, 80);
      const cleanDesc = input.description.trim().slice(0, 300);
      const defaultPerms: GroupMemberPermissions = {
        canAddTransactions: true,
        canViewAllTransactions: true,
        canEditOwnTransactions: true,
      };

      const batch = writeBatch(db);
      batch.set(groupRef, {
        name: cleanName,
        description: cleanDesc,
        ownerId: firebaseUser.uid,
        inviteCode: code,
        memberPermissions: defaultPerms,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(inviteRef, {
        groupId: groupRef.id,
        ownerId: firebaseUser.uid,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(memberRef, {
        groupId: groupRef.id,
        uid: firebaseUser.uid,
        role: 'owner',
        displayName: (profile?.displayName || firebaseUser.displayName || 'Pemilik').slice(0, 80),
        photoURL: (profile?.photoURL || '').slice(0, 500),
        inviteCode: code,
        joinedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `groups/${groupRef.id}`);
      }

      return {
        id: groupRef.id,
        name: cleanName,
        description: cleanDesc,
        ownerId: firebaseUser.uid,
        inviteCode: code,
        memberPermissions: defaultPerms,
      };
    },
    [isDemoMode, firebaseUser, profile?.displayName, profile?.photoURL]
  );

  const joinGroupByCode = useCallback(
    async (rawCode: string): Promise<Group> => {
      if (isDemoMode || !firebaseUser) throw new Error('Silakan masuk akun untuk bergabung.');
      const code = normalizeInviteCode(rawCode);
      if (!isValidInviteCodeFormat(code)) {
        throw new Error('Format kode undangan harus 8 karakter huruf/angka valid.');
      }

      const inviteSnap = await getDoc(doc(db, 'inviteCodes', code));
      if (!inviteSnap.exists()) {
        throw new Error('Kode undangan tidak ditemukan.');
      }
      const inviteData = inviteSnap.data();
      if (!inviteData.active) {
        throw new Error('Kode undangan ini sudah dinonaktifkan oleh pemilik kelompok.');
      }
      const groupId = String(inviteData.groupId);

      const existingMemberSnap = await getDoc(
        doc(db, 'groupMembers', `${groupId}_${firebaseUser.uid}`)
      );
      if (existingMemberSnap.exists()) {
        throw new Error('Kamu sudah tergabung di kelompok ini.');
      }

      try {
        await setDoc(doc(db, 'groupMembers', `${groupId}_${firebaseUser.uid}`), {
          groupId,
          uid: firebaseUser.uid,
          role: 'member',
          displayName: (profile?.displayName || firebaseUser.displayName || 'Anggota').slice(0, 80),
          photoURL: (profile?.photoURL || '').slice(0, 500),
          inviteCode: code,
          joinedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `groupMembers/${groupId}_${firebaseUser.uid}`);
      }

      const groupSnap = await getDoc(doc(db, 'groups', groupId));
      const gd = groupSnap.data();
      return {
        id: groupId,
        name: String(gd?.name || 'Kelompok'),
        description: String(gd?.description || ''),
        ownerId: String(gd?.ownerId || ''),
        inviteCode: code,
        memberPermissions: {
          canAddTransactions: Boolean(gd?.memberPermissions?.canAddTransactions),
          canViewAllTransactions: Boolean(gd?.memberPermissions?.canViewAllTransactions),
          canEditOwnTransactions: Boolean(gd?.memberPermissions?.canEditOwnTransactions),
        },
      };
    },
    [isDemoMode, firebaseUser, profile?.displayName, profile?.photoURL]
  );

  const updateGroupInfo = useCallback(
    async (groupId: string, input: { name: string; description: string }) => {
      if (isDemoMode || !firebaseUser) return;
      try {
        await updateDoc(doc(db, 'groups', groupId), {
          name: input.name.trim().slice(0, 80),
          description: input.description.trim().slice(0, 300),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}`);
      }
    },
    [isDemoMode, firebaseUser]
  );

  const updateGroupPermissions = useCallback(
    async (groupId: string, perms: GroupMemberPermissions) => {
      if (isDemoMode || !firebaseUser) return;
      try {
        await updateDoc(doc(db, 'groups', groupId), {
          memberPermissions: perms,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}`);
      }
    },
    [isDemoMode, firebaseUser]
  );

  const regenerateGroupInviteCode = useCallback(
    async (groupId: string, currentCode: string): Promise<string> => {
      if (isDemoMode || !firebaseUser) throw new Error('Mode Demo tidak mendukung aksi ini.');
      const newCode = generateInviteCode(8);
      const batch = writeBatch(db);
      if (currentCode && isValidInviteCodeFormat(currentCode)) {
        batch.update(doc(db, 'inviteCodes', currentCode), {
          active: false,
          updatedAt: serverTimestamp(),
        });
      }
      batch.set(doc(db, 'inviteCodes', newCode), {
        groupId,
        ownerId: firebaseUser.uid,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'groups', groupId), {
        inviteCode: newCode,
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}`);
      }
      return newCode;
    },
    [isDemoMode, firebaseUser]
  );

  const toggleGroupInviteCodeActive = useCallback(
    async (code: string, active: boolean) => {
      if (isDemoMode || !firebaseUser) return;
      try {
        await updateDoc(doc(db, 'inviteCodes', code), {
          active,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `inviteCodes/${code}`);
      }
    },
    [isDemoMode, firebaseUser]
  );

  const removeGroupMember = useCallback(
    async (groupId: string, memberUid: string) => {
      if (isDemoMode || !firebaseUser) return;
      try {
        await deleteDoc(doc(db, 'groupMembers', `${groupId}_${memberUid}`));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `groupMembers/${groupId}_${memberUid}`);
      }
    },
    [isDemoMode, firebaseUser]
  );

  const leaveGroup = useCallback(
    async (groupId: string) => {
      if (isDemoMode || !firebaseUser) return;
      try {
        await deleteDoc(doc(db, 'groupMembers', `${groupId}_${firebaseUser.uid}`));
        if (activeWorkspaceId === groupId) {
          await switchWorkspace('personal');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `groupMembers/${groupId}_${firebaseUser.uid}`);
      }
    },
    [isDemoMode, firebaseUser, activeWorkspaceId, switchWorkspace]
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      if (isDemoMode || !firebaseUser) return;
      const targetGroup = groups.find((g) => g.id === groupId);
      try {
        const membersSnap = await getDocs(
          query(collection(db, 'groupMembers'), where('groupId', '==', groupId))
        );
        const batch = writeBatch(db);
        membersSnap.forEach((m) => batch.delete(m.ref));
        if (targetGroup?.inviteCode) {
          batch.delete(doc(db, 'inviteCodes', targetGroup.inviteCode));
        }
        batch.delete(doc(db, 'groups', groupId));
        await batch.commit();

        if (activeWorkspaceId === groupId) {
          await switchWorkspace('personal');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `groups/${groupId}`);
      }
    },
    [isDemoMode, firebaseUser, groups, activeWorkspaceId, switchWorkspace]
  );

  // Simulated Premium & Savings Goals
  const activateSimulatedPremium = useCallback(async () => {
    if (isDemoMode) return;
    if (!firebaseUser) throw new Error('Silakan masuk akun terlebih dahulu.');
    const expiresDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const ref = doc(db, 'premiumSubscriptions', firebaseUser.uid);
    try {
      const existingSnap = await getDoc(ref);
      if (existingSnap.exists()) {
        await updateDoc(ref, {
          status: 'active',
          startedAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(expiresDate),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          userId: firebaseUser.uid,
          plan: 'premium_monthly',
          priceIdr: 19000,
          status: 'active',
          simulated: true,
          startedAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(expiresDate),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `premiumSubscriptions/${firebaseUser.uid}`);
    }
  }, [isDemoMode, firebaseUser]);

  const cancelSimulatedPremium = useCallback(async () => {
    if (isDemoMode || !firebaseUser) return;
    const ref = doc(db, 'premiumSubscriptions', firebaseUser.uid);
    try {
      await updateDoc(ref, {
        status: 'inactive',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `premiumSubscriptions/${firebaseUser.uid}`);
    }
  }, [isDemoMode, firebaseUser]);

  const addSavingsGoal = useCallback(
    async (input: SavingsGoalInput) => {
      if (isDemoMode || !firebaseUser) throw new Error('Mode Demo hanya untuk dibaca.');
      try {
        await addDoc(collection(db, 'savingsGoals'), {
          scope,
          ownerId: firebaseUser.uid,
          groupId: scope === 'group' && activeGroup ? activeGroup.id : null,
          name: input.name.trim().slice(0, 80),
          targetAmount: Math.round(input.targetAmount),
          currentAmount: Math.round(input.currentAmount),
          deadline: input.deadline || '',
          status:
            input.currentAmount >= input.targetAmount ? 'completed' : input.status || 'active',
          createdBy: firebaseUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'savingsGoals');
      }
    },
    [isDemoMode, firebaseUser, scope, activeGroup]
  );

  const updateSavingsGoal = useCallback(
    async (id: string, input: SavingsGoalInput) => {
      if (isDemoMode || !firebaseUser) throw new Error('Mode Demo hanya untuk dibaca.');
      try {
        await updateDoc(doc(db, 'savingsGoals', id), {
          name: input.name.trim().slice(0, 80),
          targetAmount: Math.round(input.targetAmount),
          currentAmount: Math.round(input.currentAmount),
          deadline: input.deadline || '',
          status:
            input.currentAmount >= input.targetAmount ? 'completed' : input.status || 'active',
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `savingsGoals/${id}`);
      }
    },
    [isDemoMode, firebaseUser]
  );

  const deleteSavingsGoal = useCallback(
    async (id: string) => {
      if (isDemoMode || !firebaseUser) throw new Error('Mode Demo hanya untuk dibaca.');
      try {
        await deleteDoc(doc(db, 'savingsGoals', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `savingsGoals/${id}`);
      }
    },
    [isDemoMode, firebaseUser]
  );

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  if (fatalError) {
    throw new Error(fatalError);
  }

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspaceId,
        scope,
        activeGroup,
        activeGroupRole,
        groups,
        myMemberships,
        activeGroupMembers,
        transactions,
        hasMoreTransactions,
        loadMoreTransactions,
        budgets,
        customCategories,
        notifications,
        unreadNotificationCount,
        savingsGoals,
        subscription,
        isPremium,
        loadingData,
        canAddTransaction,
        canEditTransaction,
        canManageBudgets,
        switchWorkspace,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addBudget,
        updateBudget,
        deleteBudget,
        addCustomCategory,
        deleteCustomCategory,
        markNotificationRead,
        markAllNotificationsRead,
        createGroup,
        joinGroupByCode,
        updateGroupInfo,
        updateGroupPermissions,
        regenerateGroupInviteCode,
        toggleGroupInviteCodeActive,
        removeGroupMember,
        leaveGroup,
        deleteGroup,
        activateSimulatedPremium,
        cancelSimulatedPremium,
        addSavingsGoal,
        updateSavingsGoal,
        deleteSavingsGoal,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace harus digunakan di dalam WorkspaceProvider');
  return ctx;
}
