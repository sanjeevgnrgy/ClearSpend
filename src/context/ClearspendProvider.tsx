'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogle,
  signOutUser,
  testFirestoreConnection,
} from '@/lib/firebase';
import {
  CATEGORY_BUDGETS,
  GROUP_MEMBERS,
  INITIAL_AGENT_SUGGESTIONS,
  INITIAL_AUTOMATION_RULES,
  INITIAL_LEDGER_TRANSACTIONS,
  INITIAL_RECEIPTS,
  INITIAL_RECURRING_BILLS,
  INITIAL_SHARED_EXPENSES,
  INITIAL_SPLIT_GROUPS,
  INITIAL_SUBSCRIPTIONS,
} from '@/data/initialWorkspaceData';
import {
  AgentSuggestion,
  AppPage,
  AutomationRule,
  ExpenseCategory,
  GroupMember,
  LedgerTransaction,
  ReceiptDocument,
  RecurringGroupBill,
  SharedExpense,
  SplitAllocation,
  SplitGroup,
  SplitMethod,
  SubscriptionItem,
} from '@/types/clearspend';
import {
  buildEqualAllocations,
  calculateGroupBalances,
  ParsedAgentIntent,
  simplifyGroupDebts,
} from '@/utils/splitMath';
import { AgentChatDrawer, AgentToolCall } from '@/components/AgentChatDrawer';

const VALID_CATEGORIES: ExpenseCategory[] = [
  'Dining',
  'Software',
  'Travel',
  'Groceries',
  'Utilities',
  'Housing',
];

function normalizeCategory(input?: string): ExpenseCategory {
  if (!input) return 'Dining';
  const match = VALID_CATEGORIES.find(
    (c) => c.toLowerCase() === input.trim().toLowerCase()
  );
  return match ?? 'Dining';
}

function makeCleanId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface ClearspendContextValue {
  user: User | null;
  authReady: boolean;
  isCloudSynced: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  transactions: LedgerTransaction[];
  groups: SplitGroup[];
  members: GroupMember[];
  sharedExpenses: SharedExpense[];
  recurringBills: RecurringGroupBill[];
  suggestions: AgentSuggestion[];
  rules: AutomationRule[];
  receipts: ReceiptDocument[];
  subscriptions: SubscriptionItem[];
  checkingBuffer: number;
  setCheckingBuffer: (val: number) => void;
  netYouAreOwed: number;
  netYouOwe: number;
  pendingAgentCount: number;
  agentChatOpen: boolean;
  setAgentChatOpen: (open: boolean) => void;
  activeWorkspacePage: AppPage;
  setActiveWorkspacePage: (page: AppPage) => void;
  addPersonalTransaction: (tx: Omit<LedgerTransaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  importCsvTransactions: (rows: Omit<LedgerTransaction, 'id'>[]) => Promise<void>;
  addSharedExpense: (expense: Omit<SharedExpense, 'id'>) => Promise<void>;
  createGroup: (
    name: string,
    description: string,
    fairnessLabel: string,
    memberIds: string[]
  ) => Promise<void>;
  settleTransfer: (
    groupId: string,
    fromMemberId: string,
    toMemberId: string,
    amount: number
  ) => Promise<void>;
  postRecurringBill: (billId: string) => Promise<void>;
  toggleRecurringBill: (billId: string) => void;
  publishShareLink: (groupId: string) => Promise<string>;
  applySuggestion: (id: string) => void;
  dismissSuggestion: (id: string) => void;
  toggleRule: (id: string) => Promise<void>;
  addRule: (
    rule: Omit<AutomationRule, 'id' | 'matchesThisMonth'>
  ) => Promise<void>;
  toggleSubscriptionStatus: (id: string) => Promise<void>;
  assignReceipt: (receiptId: string, target: 'personal' | string) => Promise<void>;
  addScannedReceipt: (receipt: Omit<ReceiptDocument, 'id'>) => Promise<void>;
  executeAgentIntent: (intent: ParsedAgentIntent) => Promise<void>;
}

const ClearspendContext = createContext<ClearspendContextValue | null>(null);

export function useClearspend() {
  const ctx = useContext(ClearspendContext);
  if (!ctx) {
    throw new Error('useClearspend must be used inside ClearspendProvider');
  }
  return ctx;
}

export function ClearspendProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [activeWorkspacePage, setActiveWorkspacePage] = useState<AppPage>('overview');
  const [agentChatOpen, setAgentChatOpen] = useState(false);

  const [transactions, setTransactions] = useState<LedgerTransaction[]>(
    INITIAL_LEDGER_TRANSACTIONS
  );
  const [groups, setGroups] = useState<SplitGroup[]>(INITIAL_SPLIT_GROUPS);
  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>(
    INITIAL_SHARED_EXPENSES
  );
  const [recurringBills, setRecurringBills] = useState<RecurringGroupBill[]>(
    INITIAL_RECURRING_BILLS
  );
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>(
    INITIAL_AGENT_SUGGESTIONS
  );
  const [rules, setRules] = useState<AutomationRule[]>(INITIAL_AUTOMATION_RULES);
  const [receipts, setReceipts] = useState<ReceiptDocument[]>(INITIAL_RECEIPTS);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>(
    INITIAL_SUBSCRIPTIONS
  );
  const [checkingBuffer, setCheckingBuffer] = useState<number>(2150);

  const isCloudSynced = Boolean(user && user.emailVerified);

  // Boot connection probe & auth listener
  useEffect(() => {
    void testFirestoreConnection();
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);

      if (nextUser && nextUser.emailVerified) {
        await ensureUserWorkspaceSeeded(nextUser);
      }
    });
    return () => unsub();
  }, []);

  async function ensureUserWorkspaceSeeded(currentUser: User) {
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) return;

      const batch = writeBatch(db);
      const displayName = (currentUser.displayName || 'Alex Rivera').slice(0, 80);
      const initials = displayName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'AL';

      batch.set(userRef, {
        uid: currentUser.uid,
        displayName,
        initials,
        createdAt: serverTimestamp(),
      });

      batch.set(doc(db, 'users', currentUser.uid, 'private', 'info'), {
        uid: currentUser.uid,
        email: (currentUser.email || 'user@clearspend.app').slice(0, 160),
        monthlyBudgetCap: 2400,
        checkingBuffer: 2150,
        updatedAt: serverTimestamp(),
      });

      for (const tx of INITIAL_LEDGER_TRANSACTIONS) {
        const txPayload: Record<string, unknown> = {
          ownerId: currentUser.uid,
          merchant: tx.merchant,
          category: tx.category,
          date: tx.date,
          amount: tx.amount,
          note: tx.note,
          source: tx.source,
          createdAt: serverTimestamp(),
        };
        if (tx.groupId) txPayload.groupId = tx.groupId;
        batch.set(
          doc(db, 'users', currentUser.uid, 'transactions', tx.id),
          txPayload
        );
      }

      for (const rule of INITIAL_AUTOMATION_RULES) {
        batch.set(doc(db, 'users', currentUser.uid, 'rules', rule.id), {
          ownerId: currentUser.uid,
          name: rule.name,
          conditionText: rule.conditionText,
          actionText: rule.actionText,
          matchesThisMonth: rule.matchesThisMonth,
          enabled: rule.enabled,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const sub of INITIAL_SUBSCRIPTIONS) {
        const subPayload: Record<string, unknown> = {
          ownerId: currentUser.uid,
          vendor: sub.vendor,
          cadence: sub.cadence,
          nextBillDate: sub.nextBillDate,
          monthlyCost: sub.monthlyCost,
          status: sub.status,
          updatedAt: serverTimestamp(),
        };
        if (sub.previousCost !== undefined) {
          subPayload.previousCost = sub.previousCost;
        }
        batch.set(
          doc(db, 'users', currentUser.uid, 'subscriptions', sub.id),
          subPayload
        );
      }

      for (const rcpt of INITIAL_RECEIPTS) {
        batch.set(doc(db, 'users', currentUser.uid, 'receipts', rcpt.id), {
          ownerId: currentUser.uid,
          merchant: rcpt.merchant,
          date: rcpt.date,
          subtotal: rcpt.subtotal,
          tax: rcpt.tax,
          tip: rcpt.tip,
          total: rcpt.total,
          category: rcpt.category,
          paymentMethod: rcpt.paymentMethod,
          items: rcpt.items,
          assignedTarget: rcpt.assignedTarget,
          createdAt: serverTimestamp(),
        });
      }

      // Seed starter groups owned by this user
      for (const grp of INITIAL_SPLIT_GROUPS) {
        const scopedGrpId = `${grp.id}-${currentUser.uid.slice(0, 6)}`;
        batch.set(doc(db, 'groups', scopedGrpId), {
          ownerId: currentUser.uid,
          memberUids: [currentUser.uid],
          name: grp.name,
          description: grp.description,
          currency: grp.currency,
          fairnessLabel: grp.fairnessLabel,
          shareId: `${grp.shareId ?? grp.id}-${currentUser.uid.slice(0, 6)}`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        for (const exp of INITIAL_SHARED_EXPENSES.filter(
          (e) => e.groupId === grp.id
        )) {
          const allocMap: Record<string, number> = {};
          for (const a of exp.allocations) {
            allocMap[a.memberId] = a.amount;
          }
          batch.set(doc(db, 'groups', scopedGrpId, 'expenses', exp.id), {
            groupId: scopedGrpId,
            createdByUid: currentUser.uid,
            title: exp.title,
            category: exp.category,
            totalAmount: exp.totalAmount,
            paidByMemberId: exp.paidByMemberId,
            splitMethod: exp.splitMethod,
            allocations: allocMap,
            date: exp.date,
            isSettlement: Boolean(exp.isSettlement),
            createdAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
    }
  }

  // Real-time Firestore subscriptions when signed in
  useEffect(() => {
    if (!user || !user.emailVerified) return;

    const uid = user.uid;

    const unsubTx = onSnapshot(
      collection(db, 'users', uid, 'transactions'),
      (snap) => {
        const list: LedgerTransaction[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            merchant: String(data.merchant ?? ''),
            category: normalizeCategory(String(data.category ?? 'Dining')),
            date: String(data.date ?? 'Nov 16'),
            amount: Number(data.amount ?? 0),
            note: String(data.note ?? ''),
            source: (data.source as LedgerTransaction['source']) ?? 'Manual',
            groupId: data.groupId ? String(data.groupId) : undefined,
          };
        });
        if (list.length > 0) setTransactions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/transactions`)
    );

    const unsubRules = onSnapshot(
      collection(db, 'users', uid, 'rules'),
      (snap) => {
        const list: AutomationRule[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: String(data.name ?? ''),
            conditionText: String(data.conditionText ?? ''),
            actionText: String(data.actionText ?? ''),
            matchesThisMonth: Number(data.matchesThisMonth ?? 0),
            enabled: Boolean(data.enabled),
          };
        });
        if (list.length > 0) setRules(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/rules`)
    );

    const unsubSubs = onSnapshot(
      collection(db, 'users', uid, 'subscriptions'),
      (snap) => {
        const list: SubscriptionItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            vendor: String(data.vendor ?? ''),
            cadence: (data.cadence as SubscriptionItem['cadence']) ?? 'Monthly',
            nextBillDate: String(data.nextBillDate ?? ''),
            monthlyCost: Number(data.monthlyCost ?? 0),
            previousCost:
              data.previousCost !== undefined ? Number(data.previousCost) : undefined,
            status: (data.status as SubscriptionItem['status']) ?? 'Active',
          };
        });
        if (list.length > 0) setSubscriptions(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/subscriptions`)
    );

    const unsubRcpt = onSnapshot(
      collection(db, 'users', uid, 'receipts'),
      (snap) => {
        const list: ReceiptDocument[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            merchant: String(data.merchant ?? ''),
            date: String(data.date ?? ''),
            subtotal: Number(data.subtotal ?? 0),
            tax: Number(data.tax ?? 0),
            tip: Number(data.tip ?? 0),
            total: Number(data.total ?? 0),
            category: normalizeCategory(String(data.category ?? 'Dining')),
            paymentMethod: String(data.paymentMethod ?? 'Card'),
            items: Array.isArray(data.items)
              ? (data.items as { name: string; price: number }[])
              : [],
            assignedTarget: String(data.assignedTarget ?? 'unassigned'),
          };
        });
        if (list.length > 0) setReceipts(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/receipts`)
    );

    let unsubExpensesList: (() => void)[] = [];
    const groupsQuery = query(
      collection(db, 'groups'),
      where('memberUids', 'array-contains', uid)
    );
    const unsubGroups = onSnapshot(
      groupsQuery,
      (snap) => {
        const loadedGroups: SplitGroup[] = snap.docs.map((d) => {
          const data = d.data();
          const baseName = String(data.name ?? 'Group');
          const defaultMembers =
            baseName.includes('Apartment')
              ? ['m-you', 'm-maya']
              : baseName.includes('Offsite')
              ? ['m-you', 'm-liam', 'm-samira']
              : ['m-you', 'm-maya', 'm-liam', 'm-samira'];
          return {
            id: d.id,
            name: baseName,
            description: String(data.description ?? ''),
            currency: String(data.currency ?? 'USD'),
            fairnessLabel: String(data.fairnessLabel ?? 'Equal'),
            memberIds: defaultMembers,
            shareId: data.shareId ? String(data.shareId) : d.id,
          };
        });

        if (loadedGroups.length > 0) {
          setGroups(loadedGroups);
          unsubExpensesList.forEach((fn) => fn());
          unsubExpensesList = loadedGroups.map((grp) =>
            onSnapshot(
              collection(db, 'groups', grp.id, 'expenses'),
              (expSnap) => {
                const grpExps: SharedExpense[] = expSnap.docs.map((ed) => {
                  const edata = ed.data();
                  const allocObj = (edata.allocations ?? {}) as Record<string, number>;
                  const allocations: SplitAllocation[] = Object.entries(allocObj).map(
                    ([memberId, amount]) => ({ memberId, amount: Number(amount) })
                  );
                  return {
                    id: ed.id,
                    groupId: grp.id,
                    title: String(edata.title ?? ''),
                    category: normalizeCategory(String(edata.category ?? 'Dining')),
                    totalAmount: Number(edata.totalAmount ?? 0),
                    paidByMemberId: String(edata.paidByMemberId ?? 'm-you'),
                    splitMethod: (edata.splitMethod as SplitMethod) ?? 'equal',
                    allocations,
                    date: String(edata.date ?? 'Nov 16'),
                    isSettlement: Boolean(edata.isSettlement),
                  };
                });
                setSharedExpenses((prev) => [
                  ...prev.filter((p) => p.groupId !== grp.id),
                  ...grpExps,
                ]);
              },
              (err) =>
                handleFirestoreError(
                  err,
                  OperationType.LIST,
                  `groups/${grp.id}/expenses`
                )
            )
          );
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'groups')
    );

    return () => {
      unsubTx();
      unsubRules();
      unsubSubs();
      unsubRcpt();
      unsubGroups();
      unsubExpensesList.forEach((fn) => fn());
    };
  }, [user]);

  const pendingAgentCount = useMemo(
    () => suggestions.filter((s) => s.status === 'pending').length,
    [suggestions]
  );

  const { netYouAreOwed, netYouOwe, groupSummaries } = useMemo(() => {
    let owedToYou = 0;
    let youOwe = 0;

    const summaries = groups.map((grp) => {
      const grpExpenses = sharedExpenses.filter((e) => e.groupId === grp.id);
      const balances = calculateGroupBalances(grp.memberIds, grpExpenses);
      const simplified = simplifyGroupDebts(balances);
      const selfBal = balances.find((b) => b.memberId === 'm-you')?.netBalance ?? 0;
      if (selfBal > 0.01) owedToYou += selfBal;
      if (selfBal < -0.01) youOwe += Math.abs(selfBal);

      return {
        id: grp.id,
        name: grp.name,
        fairnessLabel: grp.fairnessLabel,
        shareId: grp.shareId,
        members: grp.memberIds.map(
          (id) => GROUP_MEMBERS.find((m) => m.id === id)?.name ?? id
        ),
        balances: balances.map((b) => ({
          member: GROUP_MEMBERS.find((m) => m.id === b.memberId)?.name ?? b.memberId,
          netBalance: b.netBalance,
        })),
        simplifiedTransfers: simplified.map((t) => ({
          from:
            GROUP_MEMBERS.find((m) => m.id === t.fromMemberId)?.name ??
            t.fromMemberId,
          to:
            GROUP_MEMBERS.find((m) => m.id === t.toMemberId)?.name ?? t.toMemberId,
          amount: t.amount,
        })),
      };
    });

    return {
      netYouAreOwed: Math.round(owedToYou * 100) / 100,
      netYouOwe: Math.round(youOwe * 100) / 100,
      groupSummaries: summaries,
    };
  }, [groups, sharedExpenses]);

  async function addPersonalTransaction(tx: Omit<LedgerTransaction, 'id'>) {
    const newId = makeCleanId('tx');
    const newTx: LedgerTransaction = { ...tx, id: newId };
    setTransactions((prev) => [newTx, ...prev]);

    if (user && user.emailVerified) {
      const path = `users/${user.uid}/transactions/${newId}`;
      try {
        const payload: Record<string, unknown> = {
          ownerId: user.uid,
          merchant: tx.merchant.slice(0, 120),
          category: tx.category,
          date: tx.date.slice(0, 40),
          amount: tx.amount,
          note: tx.note.slice(0, 240),
          source: tx.source,
          createdAt: serverTimestamp(),
        };
        if (tx.groupId) payload.groupId = tx.groupId;
        await setDoc(doc(db, 'users', user.uid, 'transactions', newId), payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }
  }

  async function deleteTransaction(id: string) {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
    if (user && user.emailVerified) {
      const path = `users/${user.uid}/transactions/${id}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }
  }

  async function importCsvTransactions(rows: Omit<LedgerTransaction, 'id'>[]) {
    for (const r of rows) {
      await addPersonalTransaction(r);
    }
  }

  async function addSharedExpense(expense: Omit<SharedExpense, 'id'>) {
    const newId = makeCleanId('se');
    const fullExpense: SharedExpense = { ...expense, id: newId };
    setSharedExpenses((prev) => [fullExpense, ...prev]);

    if (user && user.emailVerified) {
      const path = `groups/${expense.groupId}/expenses/${newId}`;
      try {
        const allocMap: Record<string, number> = {};
        for (const a of expense.allocations) {
          allocMap[a.memberId] = a.amount;
        }
        await setDoc(doc(db, 'groups', expense.groupId, 'expenses', newId), {
          groupId: expense.groupId,
          createdByUid: user.uid,
          title: expense.title.slice(0, 140),
          category: expense.category,
          totalAmount: expense.totalAmount,
          paidByMemberId: expense.paidByMemberId,
          splitMethod: expense.splitMethod,
          allocations: allocMap,
          date: expense.date.slice(0, 40),
          isSettlement: Boolean(expense.isSettlement),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }

    if (!expense.isSettlement) {
      const selfShare =
        expense.allocations.find((a) => a.memberId === 'm-you')?.amount ?? 0;
      if (selfShare > 0) {
        const grpName =
          groups.find((g) => g.id === expense.groupId)?.name ?? 'Group';
        await addPersonalTransaction({
          merchant: `${expense.title} (Your share)`,
          category: expense.category,
          date: expense.date,
          amount: selfShare,
          note: `Split in ${grpName}`,
          source: 'Group Split',
          groupId: expense.groupId,
        });
      }
    }
  }

  async function createGroup(
    name: string,
    description: string,
    fairnessLabel: string,
    memberIds: string[]
  ) {
    const newId = makeCleanId('grp');
    const shareId = makeCleanId('share');
    const newGrp: SplitGroup = {
      id: newId,
      name,
      description,
      currency: 'USD',
      fairnessLabel,
      memberIds,
      shareId,
    };
    setGroups((prev) => [...prev, newGrp]);

    if (user && user.emailVerified) {
      const path = `groups/${newId}`;
      try {
        await setDoc(doc(db, 'groups', newId), {
          ownerId: user.uid,
          memberUids: [user.uid],
          name: name.slice(0, 100),
          description: description.slice(0, 240),
          currency: 'USD',
          fairnessLabel: fairnessLabel.slice(0, 60),
          shareId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }
  }

  async function settleTransfer(
    groupId: string,
    fromMemberId: string,
    toMemberId: string,
    amount: number
  ) {
    const fromName =
      GROUP_MEMBERS.find((m) => m.id === fromMemberId)?.name.split(' ')[0] ??
      'Member';
    const toName =
      GROUP_MEMBERS.find((m) => m.id === toMemberId)?.name.split(' ')[0] ??
      'Member';

    await addSharedExpense({
      groupId,
      title: `${fromName} settled up with ${toName}`,
      category: 'Utilities',
      totalAmount: amount,
      paidByMemberId: fromMemberId,
      splitMethod: 'exact',
      allocations: [{ memberId: toMemberId, amount }],
      date: 'Nov 17',
      isSettlement: true,
    });
  }

  async function postRecurringBill(billId: string) {
    const bill = recurringBills.find((b) => b.id === billId);
    if (!bill) return;
    const grp = groups.find((g) => g.id === bill.groupId) ?? groups[0];
    if (!grp) return;

    const allocations = grp.fairnessLabel.includes('60/40') && grp.memberIds.length === 2
      ? [
          { memberId: grp.memberIds[0], amount: Math.round(bill.amount * 0.6 * 100) / 100 },
          { memberId: grp.memberIds[1], amount: Math.round(bill.amount * 0.4 * 100) / 100 },
        ]
      : buildEqualAllocations(grp.memberIds, bill.amount);

    await addSharedExpense({
      groupId: grp.id,
      title: `${bill.title} (Recurring cycle)`,
      category: bill.category,
      totalAmount: bill.amount,
      paidByMemberId: 'm-you',
      splitMethod: grp.fairnessLabel.includes('60/40') ? 'percentage' : 'equal',
      allocations,
      date: 'Nov 17',
    });
  }

  function toggleRecurringBill(billId: string) {
    setRecurringBills((prev) =>
      prev.map((b) => (b.id === billId ? { ...b, active: !b.active } : b))
    );
  }

  async function publishShareLink(groupId: string): Promise<string> {
    const grp = groups.find((g) => g.id === groupId) ?? groups[0];
    const shareId = grp.shareId || makeCleanId('share');
    const grpExpenses = sharedExpenses.filter((e) => e.groupId === grp.id);
    const balances = calculateGroupBalances(grp.memberIds, grpExpenses);
    const simplified = simplifyGroupDebts(balances);

    const totalGroupSpend = grpExpenses
      .filter((e) => !e.isSettlement)
      .reduce((s, e) => s + e.totalAmount, 0);

    const transfers = simplified.map((t) => ({
      from:
        GROUP_MEMBERS.find((m) => m.id === t.fromMemberId)?.name.split(' ')[0] ??
        'Member',
      to:
        GROUP_MEMBERS.find((m) => m.id === t.toMemberId)?.name.split(' ')[0] ??
        'Member',
      amount: t.amount,
    }));

    const expensesList = grpExpenses.slice(0, 20).map((e) => ({
      title: e.title,
      paidBy:
        GROUP_MEMBERS.find((m) => m.id === e.paidByMemberId)?.name.split(' ')[0] ??
        'Member',
      amount: e.totalAmount,
      date: e.date,
    }));

    if (user && user.emailVerified) {
      const path = `publicShares/${shareId}`;
      try {
        await setDoc(doc(db, 'publicShares', shareId), {
          ownerId: user.uid,
          groupId: grp.id,
          groupName: grp.name,
          description: grp.description,
          currency: grp.currency,
          totalGroupSpend: Math.round(totalGroupSpend * 100) / 100,
          transfers,
          expenses: expensesList,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    // Store lightweight snapshot in sessionStorage too so demo-mode share links work instantaneously
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        `clearspend_share_${shareId}`,
        JSON.stringify({
          groupName: grp.name,
          description: grp.description,
          currency: grp.currency,
          totalGroupSpend: Math.round(totalGroupSpend * 100) / 100,
          transfers,
          expenses: expensesList,
        })
      );
    }

    return `/share/${shareId}`;
  }

  function applySuggestion(id: string) {
    const target = suggestions.find((s) => s.id === id);
    if (!target) return;

    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'applied' } : s))
    );

    if (target.type === 'auto_split' && target.payload?.merchant) {
      void addRule({
        name: `Auto-split ${target.payload.merchant} 60/40`,
        conditionText: `Merchant matches "${target.payload.merchant}"`,
        actionText: 'Split via Apartment 4B Fairness Preset',
        enabled: true,
      });
    } else if (target.type === 'settlement') {
      setActiveWorkspacePage('splits');
    }
  }

  function dismissSuggestion(id: string) {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'dismissed' } : s))
    );
  }

  async function toggleRule(id: string) {
    const target = rules.find((r) => r.id === id);
    if (!target) return;
    const nextEnabled = !target.enabled;
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: nextEnabled } : r))
    );

    if (user && user.emailVerified) {
      const path = `users/${user.uid}/rules/${id}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'rules', id), {
          enabled: nextEnabled,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
  }

  async function addRule(rule: Omit<AutomationRule, 'id' | 'matchesThisMonth'>) {
    const newId = makeCleanId('rule');
    setRules((prev) => [{ ...rule, id: newId, matchesThisMonth: 0 }, ...prev]);

    if (user && user.emailVerified) {
      const path = `users/${user.uid}/rules/${newId}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'rules', newId), {
          ownerId: user.uid,
          name: rule.name.slice(0, 120),
          conditionText: rule.conditionText.slice(0, 200),
          actionText: rule.actionText.slice(0, 200),
          matchesThisMonth: 0,
          enabled: rule.enabled,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }
  }

  async function toggleSubscriptionStatus(id: string) {
    const target = subscriptions.find((s) => s.id === id);
    if (!target) return;
    const nextStatus: SubscriptionItem['status'] =
      target.status === 'Paused' ? 'Active' : 'Paused';

    setSubscriptions((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, status: nextStatus } : sub))
    );

    if (user && user.emailVerified) {
      const path = `users/${user.uid}/subscriptions/${id}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'subscriptions', id), {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
  }

  async function assignReceipt(receiptId: string, target: 'personal' | string) {
    const rcpt = receipts.find((r) => r.id === receiptId);
    if (!rcpt) return;

    setReceipts((prev) =>
      prev.map((r) =>
        r.id === receiptId ? { ...r, assignedTarget: target } : r
      )
    );

    if (user && user.emailVerified) {
      const path = `users/${user.uid}/receipts/${receiptId}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'receipts', receiptId), {
          assignedTarget: target,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }

    if (target === 'personal') {
      await addPersonalTransaction({
        merchant: rcpt.merchant,
        category: rcpt.category,
        date: 'Nov 17',
        amount: rcpt.total,
        note: 'Routed from Receipt Vault',
        source: 'Receipt OCR',
      });
    } else {
      const grp = groups.find((g) => g.id === target);
      if (grp) {
        await addSharedExpense({
          groupId: grp.id,
          title: rcpt.merchant,
          category: rcpt.category,
          totalAmount: rcpt.total,
          paidByMemberId: 'm-you',
          splitMethod: 'equal',
          allocations: buildEqualAllocations(grp.memberIds, rcpt.total),
          date: 'Nov 17',
        });
      }
    }
  }

  async function addScannedReceipt(receipt: Omit<ReceiptDocument, 'id'>) {
    const newId = makeCleanId('rcpt');
    setReceipts((prev) => [{ ...receipt, id: newId }, ...prev]);

    if (user && user.emailVerified) {
      const path = `users/${user.uid}/receipts/${newId}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'receipts', newId), {
          ownerId: user.uid,
          merchant: receipt.merchant.slice(0, 120),
          date: receipt.date.slice(0, 40),
          subtotal: receipt.subtotal,
          tax: receipt.tax,
          tip: receipt.tip,
          total: receipt.total,
          category: receipt.category,
          paymentMethod: receipt.paymentMethod.slice(0, 80),
          items: receipt.items.slice(0, 30),
          assignedTarget: receipt.assignedTarget,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }
  }

  async function executeAgentIntent(intent: ParsedAgentIntent) {
    if (intent.kind === 'shared_split' && intent.groupId && intent.participantIds) {
      const allocations = buildEqualAllocations(
        intent.participantIds,
        intent.amount
      );
      await addSharedExpense({
        groupId: intent.groupId,
        title: intent.merchant,
        category: intent.category,
        totalAmount: intent.amount,
        paidByMemberId: 'm-you',
        splitMethod: 'equal',
        allocations,
        date: 'Nov 17',
      });
    } else {
      await addPersonalTransaction({
        merchant: intent.merchant,
        category: intent.category,
        date: 'Nov 17',
        amount: intent.amount,
        note: 'Parsed via Agentic Command',
        source: 'Agentic Rule',
      });
    }
  }

  const workspaceSnapshot = useMemo(
    () => ({
      activeWorkspacePage,
      isCloudSynced,
      monthlyBudgetCap: 2400,
      checkingBuffer,
      monthlyNetSpend:
        Math.round(transactions.reduce((s, t) => s + t.amount, 0) * 100) / 100,
      netYouAreOwed,
      netYouOwe,
      members: GROUP_MEMBERS.map((m) => ({ id: m.id, name: m.name })),
      recentTransactions: transactions.slice(0, 15),
      groups: groupSummaries,
      recurringBills,
      categoryBudgets: CATEGORY_BUDGETS.map((b) => ({
        category: b.category,
        cap: b.cap,
        spent:
          Math.round(
            transactions
              .filter((t) => t.category === b.category)
              .reduce((s, t) => s + t.amount, 0) * 100
          ) / 100,
      })),
      pendingSuggestions: suggestions.filter((s) => s.status === 'pending'),
      automationRules: rules,
      subscriptions,
      receipts: receipts.map((r) => ({
        id: r.id,
        merchant: r.merchant,
        total: r.total,
        category: r.category,
        assignedTarget: r.assignedTarget,
      })),
    }),
    [
      activeWorkspacePage,
      isCloudSynced,
      checkingBuffer,
      transactions,
      netYouAreOwed,
      netYouOwe,
      groupSummaries,
      recurringBills,
      suggestions,
      rules,
      subscriptions,
      receipts,
    ]
  );

  function findMemberByName(name?: string) {
    if (!name) return GROUP_MEMBERS[0];
    const q = name.trim().toLowerCase();
    return (
      GROUP_MEMBERS.find(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase() === q ||
          (q === 'you' && m.isSelf) ||
          (q === 'me' && m.isSelf)
      ) ?? GROUP_MEMBERS[0]
    );
  }

  function findGroupByNameOrId(queryStr?: string) {
    if (!queryStr) return groups[0];
    const q = queryStr.trim().toLowerCase();
    return (
      groups.find(
        (g) => g.id.toLowerCase() === q || g.name.toLowerCase().includes(q)
      ) ?? groups[0]
    );
  }

  function handleExecuteToolCall(call: AgentToolCall): {
    success: boolean;
    summary: string;
    resultData?: Record<string, unknown>;
  } {
    const args = call.args ?? {};

    switch (call.name) {
      case 'navigate_page': {
        const page = String(args.page ?? 'overview') as AppPage | 'landing';
        if (page === 'landing') {
          window.location.href = '/';
          return { success: true, summary: 'Navigated to Landing Page.' };
        }
        const validPages: AppPage[] = [
          'overview',
          'splits',
          'automations',
          'analytics',
          'receipts',
        ];
        const target = validPages.includes(page as AppPage)
          ? (page as AppPage)
          : 'overview';
        setActiveWorkspacePage(target);
        if (!window.location.pathname.startsWith('/workspace')) {
          window.location.href = `/workspace?tab=${target}`;
        }
        return { success: true, summary: `Opened ${target} view.` };
      }

      case 'add_personal_expense': {
        const merchant = String(args.merchant ?? 'Expense').trim();
        const amount = Number(args.amount ?? 0);
        const category = normalizeCategory(String(args.category ?? 'Dining'));
        const note = String(args.note ?? 'Logged via Clearspend Agent');
        if (amount <= 0) return { success: false, summary: 'Invalid amount.' };
        void addPersonalTransaction({
          merchant,
          amount: Math.round(amount * 100) / 100,
          category,
          date: 'Nov 17',
          note,
          source: 'Agentic Rule',
        });
        return {
          success: true,
          summary: `Logged $${amount.toFixed(2)} for ${merchant} (${category}).`,
        };
      }

      case 'delete_personal_expense': {
        const q = String(args.merchantOrId ?? '').trim().toLowerCase();
        const match = transactions.find(
          (t) =>
            t.id.toLowerCase() === q || t.merchant.toLowerCase().includes(q)
        );
        if (!match) {
          return {
            success: false,
            summary: `No ledger expense found matching "${args.merchantOrId}".`,
          };
        }
        void deleteTransaction(match.id);
        return {
          success: true,
          summary: `Deleted ${match.merchant} ($${match.amount.toFixed(2)}).`,
        };
      }

      case 'add_shared_expense': {
        const grp = findGroupByNameOrId(String(args.groupNameOrId ?? ''));
        const title = String(args.title ?? 'Shared Expense').trim();
        const totalAmount = Number(args.totalAmount ?? 0);
        const category = normalizeCategory(String(args.category ?? 'Dining'));
        const payer = findMemberByName(
          args.paidByMemberName ? String(args.paidByMemberName) : 'Alex'
        );
        const splitMethod = (
          ['equal', 'exact', 'percentage', 'shares'].includes(
            String(args.splitMethod ?? 'equal')
          )
            ? String(args.splitMethod ?? 'equal')
            : 'equal'
        ) as SplitMethod;

        if (totalAmount <= 0 || !grp) {
          return { success: false, summary: 'Invalid split parameters.' };
        }

        let allocations: SplitAllocation[] = [];
        const customRaw = Array.isArray(args.customAllocations)
          ? (args.customAllocations as { memberName: string; value: number }[])
          : [];

        if (splitMethod === 'equal' || customRaw.length === 0) {
          const participantNames = Array.isArray(args.participantNames)
            ? (args.participantNames as string[])
            : [];
          const participantIds =
            participantNames.length > 0
              ? Array.from(
                  new Set([
                    'm-you',
                    ...participantNames.map((n) => findMemberByName(n).id),
                  ])
                )
              : grp.memberIds;
          allocations = buildEqualAllocations(participantIds, totalAmount);
        } else if (splitMethod === 'exact') {
          allocations = customRaw.map((c) => ({
            memberId: findMemberByName(c.memberName).id,
            amount: Math.round(Number(c.value) * 100) / 100,
          }));
        } else if (splitMethod === 'percentage') {
          allocations = customRaw.map((c) => ({
            memberId: findMemberByName(c.memberName).id,
            amount:
              Math.round(((totalAmount * Number(c.value)) / 100) * 100) / 100,
          }));
        } else {
          const totalShares =
            customRaw.reduce((s, c) => s + Number(c.value), 0) || 1;
          allocations = customRaw.map((c) => ({
            memberId: findMemberByName(c.memberName).id,
            amount:
              Math.round(((totalAmount * Number(c.value)) / totalShares) * 100) /
              100,
          }));
        }

        void addSharedExpense({
          groupId: grp.id,
          title,
          category,
          totalAmount: Math.round(totalAmount * 100) / 100,
          paidByMemberId: payer.id,
          splitMethod,
          allocations,
          date: 'Nov 17',
        });

        return {
          success: true,
          summary: `Added $${totalAmount.toFixed(2)} "${title}" (${splitMethod} split) in ${grp.name}.`,
        };
      }

      case 'create_split_group': {
        const name = String(args.name ?? 'New Group').trim();
        const description = String(
          args.description ?? 'Shared group expenses'
        ).trim();
        const fairnessLabel = String(args.fairnessLabel ?? 'Equal').trim();
        const memberNames = Array.isArray(args.memberNames)
          ? (args.memberNames as string[])
          : ['Maya', 'Liam'];
        const memberIds = Array.from(
          new Set(['m-you', ...memberNames.map((n) => findMemberByName(n).id)])
        );
        void createGroup(name, description, fairnessLabel, memberIds);
        return {
          success: true,
          summary: `Created group "${name}" (${fairnessLabel}).`,
        };
      }

      case 'settle_group_debt': {
        const grp = findGroupByNameOrId(String(args.groupNameOrId ?? ''));
        const from = findMemberByName(String(args.fromMemberName ?? ''));
        const to = findMemberByName(String(args.toMemberName ?? 'Alex'));

        const grpExpenses = sharedExpenses.filter((e) => e.groupId === grp.id);
        const balances = calculateGroupBalances(grp.memberIds, grpExpenses);
        const simplified = simplifyGroupDebts(balances);
        const matchingTransfer = simplified.find(
          (t) => t.fromMemberId === from.id && t.toMemberId === to.id
        );

        const amount =
          args.amount && Number(args.amount) > 0
            ? Math.round(Number(args.amount) * 100) / 100
            : matchingTransfer?.amount ?? 0;

        if (amount <= 0) {
          return {
            success: false,
            summary: `No pending balance from ${from.name.split(' ')[0]} to ${to.name.split(' ')[0]} in ${grp.name}.`,
          };
        }

        void settleTransfer(grp.id, from.id, to.id, amount);
        return {
          success: true,
          summary: `Settled $${amount.toFixed(2)} from ${from.name.split(' ')[0]} to ${to.name.split(' ')[0]} in ${grp.name}.`,
        };
      }

      case 'generate_share_link': {
        const grp = findGroupByNameOrId(String(args.groupNameOrId ?? ''));
        const shareId = grp.shareId || grp.id;
        void publishShareLink(grp.id);
        return {
          success: true,
          summary: `Published no-login settlement link for ${grp.name}: /share/${shareId}`,
          resultData: { shareUrl: `/share/${shareId}` },
        };
      }

      case 'post_recurring_bill': {
        const q = String(args.billTitleOrId ?? '').trim().toLowerCase();
        const bill =
          recurringBills.find(
            (b) => b.id.toLowerCase() === q || b.title.toLowerCase().includes(q)
          ) ?? recurringBills[0];
        if (!bill) {
          return { success: false, summary: 'No recurring group bill found.' };
        }
        void postRecurringBill(bill.id);
        return {
          success: true,
          summary: `Posted recurring bill "${bill.title}" ($${bill.amount.toFixed(2)}).`,
        };
      }

      case 'handle_agent_suggestion': {
        const q = String(args.suggestionIdOrKeyword ?? '').trim().toLowerCase();
        const decision = String(args.decision ?? 'apply').toLowerCase();
        const match = suggestions.find(
          (s) =>
            s.status === 'pending' &&
            (s.id.toLowerCase() === q || s.title.toLowerCase().includes(q))
        );
        if (!match) {
          return {
            success: false,
            summary: `No pending alert matching "${args.suggestionIdOrKeyword}".`,
          };
        }
        if (decision === 'dismiss') {
          dismissSuggestion(match.id);
          return { success: true, summary: `Dismissed "${match.title}".` };
        }
        applySuggestion(match.id);
        return {
          success: true,
          summary: `Applied "${match.title}".`,
          resultData: match.draftEmailBody
            ? {
                draftEmailSubject: match.draftEmailSubject,
                draftEmailBody: match.draftEmailBody,
              }
            : undefined,
        };
      }

      case 'create_automation_rule': {
        const name = String(args.name ?? 'Smart Rule').trim();
        const keyword = String(args.merchantKeyword ?? '').trim();
        const actionType =
          String(args.actionType ?? 'categorize') === 'split'
            ? 'split'
            : 'categorize';
        const targetCat = normalizeCategory(
          String(args.targetCategory ?? 'Travel')
        );
        const targetGrp = findGroupByNameOrId(String(args.targetGroupName ?? ''));

        void addRule({
          name,
          conditionText: `Merchant matches "${keyword}"`,
          actionText:
            actionType === 'split'
              ? `Split equally in ${targetGrp.name}`
              : `Assign category ${targetCat}`,
          enabled: true,
        });
        return { success: true, summary: `Created automation rule "${name}".` };
      }

      case 'toggle_automation_rule': {
        const q = String(args.ruleNameOrId ?? '').trim().toLowerCase();
        const enabled = Boolean(args.enabled);
        const match = rules.find(
          (r) => r.id.toLowerCase() === q || r.name.toLowerCase().includes(q)
        );
        if (!match) {
          return {
            success: false,
            summary: `No rule matching "${args.ruleNameOrId}".`,
          };
        }
        if (match.enabled !== enabled) void toggleRule(match.id);
        return {
          success: true,
          summary: `${enabled ? 'Enabled' : 'Disabled'} rule "${match.name}".`,
        };
      }

      case 'toggle_subscription_status': {
        const q = String(args.vendorName ?? '').trim().toLowerCase();
        const action = String(args.action ?? 'pause').toLowerCase();
        const match = subscriptions.find((s) =>
          s.vendor.toLowerCase().includes(q)
        );
        if (!match) {
          return {
            success: false,
            summary: `No subscription matching "${args.vendorName}".`,
          };
        }
        const wantPaused = action !== 'resume';
        if ((match.status === 'Paused') !== wantPaused) {
          void toggleSubscriptionStatus(match.id);
        }
        return {
          success: true,
          summary: `${wantPaused ? 'Paused' : 'Resumed'} ${match.vendor}.`,
        };
      }

      case 'assign_receipt': {
        const q = String(args.receiptMerchantOrId ?? '').trim().toLowerCase();
        const targetRaw = String(args.target ?? 'personal').trim().toLowerCase();
        const rcpt = receipts.find(
          (r) => r.id.toLowerCase() === q || r.merchant.toLowerCase().includes(q)
        );
        if (!rcpt) {
          return {
            success: false,
            summary: `No receipt matching "${args.receiptMerchantOrId}".`,
          };
        }
        const target =
          targetRaw === 'personal'
            ? 'personal'
            : findGroupByNameOrId(targetRaw).id;
        void assignReceipt(rcpt.id, target);
        return {
          success: true,
          summary: `Assigned ${rcpt.merchant} ($${rcpt.total.toFixed(2)}) to ${
            target === 'personal' ? 'Personal Ledger' : findGroupByNameOrId(target).name
          }.`,
        };
      }

      case 'scan_sample_receipt': {
        void addScannedReceipt({
          merchant: 'Tartine Manufactory',
          date: 'Nov 17 · Just now',
          subtotal: 76.0,
          tax: 6.55,
          tip: 13.45,
          total: 96.0,
          category: 'Dining',
          paymentMethod: 'Apple Pay · 4821',
          items: [
            { name: 'Country Sourdough & Butter', price: 14.0 },
            { name: 'Smoked Trout Tartine × 2', price: 42.0 },
            { name: 'Espresso & Matcha', price: 20.0 },
          ],
          assignedTarget: 'unassigned',
        });
        return {
          success: true,
          summary: 'Scanned new receipt: Tartine Manufactory ($96.00).',
        };
      }

      default:
        return {
          success: false,
          summary: `Unknown tool: ${call.name ?? 'none'}.`,
        };
    }
  }

  return (
    <ClearspendContext.Provider
      value={{
        user,
        authReady,
        isCloudSynced,
        signIn: async () => {
          await signInWithGoogle();
        },
        signOut: async () => {
          await signOutUser();
        },
        transactions,
        groups,
        members: GROUP_MEMBERS,
        sharedExpenses,
        recurringBills,
        suggestions,
        rules,
        receipts,
        subscriptions,
        checkingBuffer,
        setCheckingBuffer,
        netYouAreOwed,
        netYouOwe,
        pendingAgentCount,
        agentChatOpen,
        setAgentChatOpen,
        activeWorkspacePage,
        setActiveWorkspacePage,
        addPersonalTransaction,
        deleteTransaction,
        importCsvTransactions,
        addSharedExpense,
        createGroup,
        settleTransfer,
        postRecurringBill,
        toggleRecurringBill,
        publishShareLink,
        applySuggestion,
        dismissSuggestion,
        toggleRule,
        addRule,
        toggleSubscriptionStatus,
        assignReceipt,
        addScannedReceipt,
        executeAgentIntent,
      }}
    >
      {children}
      <AgentChatDrawer
        isOpen={agentChatOpen}
        onClose={() => setAgentChatOpen(false)}
        workspaceSnapshot={workspaceSnapshot}
        onExecuteToolCall={handleExecuteToolCall}
      />
    </ClearspendContext.Provider>
  );
}
