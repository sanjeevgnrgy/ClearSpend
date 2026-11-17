import { useState, useMemo } from 'react';
import { MotionConfig } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { CapabilitiesBento } from './components/CapabilitiesBento';
import { LiveSandbox } from './components/LiveSandbox';
import { ProofAndSecurity } from './components/ProofAndSecurity';
import { PricingAndTrial, PlanTier } from './components/PricingAndTrial';
import { Footer } from './components/Footer';
import { WorkspaceLayout } from './components/workspace/WorkspaceLayout';
import { OverviewPage } from './components/workspace/OverviewPage';
import { SplitsPage } from './components/workspace/SplitsPage';
import { AutomationsPage } from './components/workspace/AutomationsPage';
import { AnalyticsPage } from './components/workspace/AnalyticsPage';
import { ReceiptsPage } from './components/workspace/ReceiptsPage';
import { AgentChatDrawer, AgentToolCall } from './components/AgentChatDrawer';
import {
  CATEGORY_BUDGETS,
  GROUP_MEMBERS,
  INITIAL_AGENT_SUGGESTIONS,
  INITIAL_AUTOMATION_RULES,
  INITIAL_LEDGER_TRANSACTIONS,
  INITIAL_RECEIPTS,
  INITIAL_SHARED_EXPENSES,
  INITIAL_SPLIT_GROUPS,
  INITIAL_SUBSCRIPTIONS,
} from './data/initialWorkspaceData';
import {
  AgentSuggestion,
  AppPage,
  AutomationRule,
  ExpenseCategory,
  LedgerTransaction,
  ReceiptDocument,
  SharedExpense,
  SplitAllocation,
  SplitGroup,
  SplitMethod,
  SubscriptionItem,
} from './types/clearspend';
import {
  buildEqualAllocations,
  calculateGroupBalances,
  ParsedAgentIntent,
  simplifyGroupDebts,
} from './utils/splitMath';

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

export default function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'workspace'>('landing');
  const [activePage, setActivePage] = useState<AppPage>('overview');
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('Pro & Teams');
  const [agentChatOpen, setAgentChatOpen] = useState(false);

  // Shared Interactive Workspace State
  const [transactions, setTransactions] = useState<LedgerTransaction[]>(
    INITIAL_LEDGER_TRANSACTIONS
  );
  const [groups, setGroups] = useState<SplitGroup[]>(INITIAL_SPLIT_GROUPS);
  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>(
    INITIAL_SHARED_EXPENSES
  );
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>(
    INITIAL_AGENT_SUGGESTIONS
  );
  const [rules, setRules] = useState<AutomationRule[]>(INITIAL_AUTOMATION_RULES);
  const [receipts, setReceipts] = useState<ReceiptDocument[]>(INITIAL_RECEIPTS);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>(
    INITIAL_SUBSCRIPTIONS
  );

  const pendingAgentCount = useMemo(
    () => suggestions.filter((s) => s.status === 'pending').length,
    [suggestions]
  );

  // Compute net balances across all groups for the current user ("m-you")
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
        members: grp.memberIds.map(
          (id) => GROUP_MEMBERS.find((m) => m.id === id)?.name ?? id
        ),
        balances: balances.map((b) => ({
          member: GROUP_MEMBERS.find((m) => m.id === b.memberId)?.name ?? b.memberId,
          netBalance: b.netBalance,
        })),
        simplifiedTransfers: simplified.map((t) => ({
          from: GROUP_MEMBERS.find((m) => m.id === t.fromMemberId)?.name ?? t.fromMemberId,
          to: GROUP_MEMBERS.find((m) => m.id === t.toMemberId)?.name ?? t.toMemberId,
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

  const workspaceSnapshot = useMemo(
    () => ({
      currentView: viewMode === 'landing' ? 'landing' : activePage,
      monthlyBudgetCap: 2400,
      monthlyNetSpend: Math.round(transactions.reduce((s, t) => s + t.amount, 0) * 100) / 100,
      netYouAreOwed,
      netYouOwe,
      members: GROUP_MEMBERS.map((m) => ({ id: m.id, name: m.name })),
      recentTransactions: transactions.slice(0, 12),
      groups: groupSummaries,
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
      viewMode,
      activePage,
      transactions,
      netYouAreOwed,
      netYouOwe,
      groupSummaries,
      suggestions,
      rules,
      subscriptions,
      receipts,
    ]
  );

  function openWorkspace(page: AppPage = 'overview') {
    setActivePage(page);
    setViewMode('workspace');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function exitToLanding() {
    setViewMode('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleAddPersonalTransaction(tx: Omit<LedgerTransaction, 'id'>) {
    setTransactions((prev) => [
      { ...tx, id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
      ...prev,
    ]);
  }

  function handleDeleteTransaction(id: string) {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  }

  function handleAddSharedExpense(expense: Omit<SharedExpense, 'id'>) {
    const newId = `se-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setSharedExpenses((prev) => [{ ...expense, id: newId }, ...prev]);

    if (!expense.isSettlement) {
      const selfShare =
        expense.allocations.find((a) => a.memberId === 'm-you')?.amount ?? 0;
      if (selfShare > 0) {
        const grpName =
          groups.find((g) => g.id === expense.groupId)?.name ?? 'Group';
        handleAddPersonalTransaction({
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

  function handleExecuteAgentIntent(intent: ParsedAgentIntent) {
    if (intent.kind === 'shared_split' && intent.groupId && intent.participantIds) {
      const allocations = buildEqualAllocations(
        intent.participantIds,
        intent.amount
      );
      handleAddSharedExpense({
        groupId: intent.groupId,
        title: intent.merchant,
        category: intent.category,
        totalAmount: intent.amount,
        paidByMemberId: 'm-you',
        splitMethod: 'equal',
        allocations,
        date: 'Nov 16',
      });
    } else {
      handleAddPersonalTransaction({
        merchant: intent.merchant,
        category: intent.category,
        date: 'Nov 16',
        amount: intent.amount,
        note: 'Parsed via Agentic Command',
        source: 'Agentic Rule',
      });
    }
  }

  function handleSettleTransfer(
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

    handleAddSharedExpense({
      groupId,
      title: `${fromName} settled up with ${toName}`,
      category: 'Utilities',
      totalAmount: amount,
      paidByMemberId: fromMemberId,
      splitMethod: 'exact',
      allocations: [{ memberId: toMemberId, amount }],
      date: 'Nov 16',
      isSettlement: true,
    });
  }

  function handleCreateGroup(
    name: string,
    description: string,
    memberIds: string[]
  ) {
    const newGrp: SplitGroup = {
      id: `grp-${Date.now()}`,
      name,
      description,
      currency: 'USD',
      memberIds,
    };
    setGroups((prev) => [...prev, newGrp]);
  }

  function handleApplySuggestion(id: string) {
    const target = suggestions.find((s) => s.id === id);
    if (!target) return;

    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'applied' } : s))
    );

    if (target.type === 'auto_split' && target.payload?.merchant) {
      setRules((prev) => [
        {
          id: `rule-${Date.now()}`,
          name: `Auto-split ${target.payload?.merchant} 50/50`,
          conditionText: `Merchant matches "${target.payload?.merchant}"`,
          actionText: 'Split equally in Apartment 4B',
          matchesThisMonth: 4,
          enabled: true,
        },
        ...prev,
      ]);
    } else if (target.type === 'settlement') {
      setViewMode('workspace');
      setActivePage('splits');
    }
  }

  function handleDismissSuggestion(id: string) {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'dismissed' } : s))
    );
  }

  function handleToggleRule(id: string) {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }

  function handleAddRule(rule: Omit<AutomationRule, 'id' | 'matchesThisMonth'>) {
    setRules((prev) => [
      { ...rule, id: `rule-${Date.now()}`, matchesThisMonth: 0 },
      ...prev,
    ]);
  }

  function handleToggleSubscriptionStatus(id: string) {
    setSubscriptions((prev) =>
      prev.map((sub) =>
        sub.id === id
          ? {
              ...sub,
              status: sub.status === 'Paused' ? 'Active' : 'Paused',
            }
          : sub
      )
    );
  }

  function handleAssignReceipt(receiptId: string, target: 'personal' | string) {
    const rcpt = receipts.find((r) => r.id === receiptId);
    if (!rcpt) return;

    setReceipts((prev) =>
      prev.map((r) =>
        r.id === receiptId ? { ...r, assignedTarget: target } : r
      )
    );

    if (target === 'personal') {
      handleAddPersonalTransaction({
        merchant: rcpt.merchant,
        category: rcpt.category,
        date: 'Nov 16',
        amount: rcpt.total,
        note: 'Routed from Receipt Vault',
        source: 'Receipt OCR',
      });
    } else {
      const grp = groups.find((g) => g.id === target);
      if (grp) {
        handleAddSharedExpense({
          groupId: grp.id,
          title: rcpt.merchant,
          category: rcpt.category,
          totalAmount: rcpt.total,
          paidByMemberId: 'm-you',
          splitMethod: 'equal',
          allocations: buildEqualAllocations(grp.memberIds, rcpt.total),
          date: 'Nov 16',
        });
      }
    }
  }

  function handleSimulateScanNewReceipt() {
    const newRcpt: ReceiptDocument = {
      id: `rcpt-${Date.now()}`,
      merchant: 'Tartine Manufactory',
      date: 'Nov 16 · Just now',
      subtotal: 76.0,
      tax: 6.55,
      tip: 13.45,
      total: 96.0,
      category: 'Dining',
      paymentMethod: 'Apple Pay · 4821',
      items: [
        { name: 'Country Sourdough & Cultured Butter', price: 14.0 },
        { name: 'Smoked Trout Tartine × 2', price: 42.0 },
        { name: 'Espresso & Matcha', price: 20.0 },
      ],
      assignedTarget: 'unassigned',
    };
    setReceipts((prev) => [newRcpt, ...prev]);
  }

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

  function findGroupByNameOrId(query?: string) {
    if (!query) return groups[0];
    const q = query.trim().toLowerCase();
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
          exitToLanding();
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
        openWorkspace(target);
        return { success: true, summary: `Opened ${target} page.` };
      }

      case 'add_personal_expense': {
        const merchant = String(args.merchant ?? 'Expense').trim();
        const amount = Number(args.amount ?? 0);
        const category = normalizeCategory(String(args.category ?? 'Dining'));
        const note = String(args.note ?? 'Logged via Clearspend Agent');
        if (amount <= 0) {
          return { success: false, summary: 'Invalid expense amount.' };
        }
        handleAddPersonalTransaction({
          merchant,
          amount: Math.round(amount * 100) / 100,
          category,
          date: 'Nov 16',
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
        handleDeleteTransaction(match.id);
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
          return { success: false, summary: 'Invalid shared expense parameters.' };
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
            amount: Math.round(((totalAmount * Number(c.value)) / 100) * 100) / 100,
          }));
        } else {
          const totalShares = customRaw.reduce((s, c) => s + Number(c.value), 0) || 1;
          allocations = customRaw.map((c) => ({
            memberId: findMemberByName(c.memberName).id,
            amount:
              Math.round(((totalAmount * Number(c.value)) / totalShares) * 100) /
              100,
          }));
        }

        handleAddSharedExpense({
          groupId: grp.id,
          title,
          category,
          totalAmount: Math.round(totalAmount * 100) / 100,
          paidByMemberId: payer.id,
          splitMethod,
          allocations,
          date: 'Nov 16',
        });

        return {
          success: true,
          summary: `Added $${totalAmount.toFixed(2)} "${title}" (${splitMethod} split) in ${grp.name}.`,
        };
      }

      case 'create_split_group': {
        const name = String(args.name ?? 'New Group').trim();
        const description = String(args.description ?? 'Shared group expenses').trim();
        const memberNames = Array.isArray(args.memberNames)
          ? (args.memberNames as string[])
          : ['Maya', 'Liam'];
        const memberIds = Array.from(
          new Set(['m-you', ...memberNames.map((n) => findMemberByName(n).id)])
        );
        handleCreateGroup(name, description, memberIds);
        return {
          success: true,
          summary: `Created group "${name}" with ${memberIds.length} members.`,
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
            summary: `No pending balance found from ${from.name.split(' ')[0]} to ${to.name.split(' ')[0]} in ${grp.name}.`,
          };
        }

        handleSettleTransfer(grp.id, from.id, to.id, amount);
        return {
          success: true,
          summary: `Settled $${amount.toFixed(2)} from ${from.name.split(' ')[0]} to ${to.name.split(' ')[0]} in ${grp.name}.`,
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
            summary: `No pending suggestion matching "${args.suggestionIdOrKeyword}".`,
          };
        }
        if (decision === 'dismiss') {
          handleDismissSuggestion(match.id);
          return { success: true, summary: `Dismissed "${match.title}".` };
        }
        handleApplySuggestion(match.id);
        return { success: true, summary: `Applied "${match.title}".` };
      }

      case 'create_automation_rule': {
        const name = String(args.name ?? 'Smart Rule').trim();
        const keyword = String(args.merchantKeyword ?? '').trim();
        const actionType =
          String(args.actionType ?? 'categorize') === 'split'
            ? 'split'
            : 'categorize';
        const targetCat = normalizeCategory(String(args.targetCategory ?? 'Travel'));
        const targetGrp = findGroupByNameOrId(String(args.targetGroupName ?? ''));

        handleAddRule({
          name,
          conditionText: `Merchant matches "${keyword}"`,
          actionText:
            actionType === 'split'
              ? `Split equally in ${targetGrp.name}`
              : `Assign category ${targetCat}`,
          enabled: true,
        });
        return {
          success: true,
          summary: `Created automation rule "${name}".`,
        };
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
            summary: `No automation rule matching "${args.ruleNameOrId}".`,
          };
        }
        setRules((prev) =>
          prev.map((r) => (r.id === match.id ? { ...r, enabled } : r))
        );
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
            summary: `No subscription found matching "${args.vendorName}".`,
          };
        }
        const nextStatus = action === 'resume' ? 'Active' : 'Paused';
        setSubscriptions((prev) =>
          prev.map((s) => (s.id === match.id ? { ...s, status: nextStatus } : s))
        );
        return {
          success: true,
          summary: `${nextStatus === 'Paused' ? 'Paused' : 'Resumed'} ${match.vendor} ($${match.monthlyCost.toFixed(2)}/mo).`,
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
            summary: `No receipt found matching "${args.receiptMerchantOrId}".`,
          };
        }
        const target =
          targetRaw === 'personal'
            ? 'personal'
            : findGroupByNameOrId(targetRaw).id;
        handleAssignReceipt(rcpt.id, target);
        const targetLabel =
          target === 'personal'
            ? 'Personal Ledger'
            : findGroupByNameOrId(target).name;
        return {
          success: true,
          summary: `Assigned ${rcpt.merchant} ($${rcpt.total.toFixed(2)}) to ${targetLabel}.`,
        };
      }

      case 'scan_sample_receipt': {
        handleSimulateScanNewReceipt();
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
    <MotionConfig reducedMotion="user">
      {viewMode === 'workspace' ? (
        <WorkspaceLayout
          activePage={activePage}
          onNavigatePage={setActivePage}
          onExitToLanding={exitToLanding}
          onQuickNewExpense={() => setActivePage('overview')}
          onOpenAgentChat={() => setAgentChatOpen(true)}
          pendingAgentCount={pendingAgentCount}
        >
          {activePage === 'overview' && (
            <OverviewPage
              transactions={transactions}
              members={GROUP_MEMBERS}
              groups={groups}
              netYouAreOwed={netYouAreOwed}
              netYouOwe={netYouOwe}
              pendingAgentCount={pendingAgentCount}
              onExecuteAgentIntent={handleExecuteAgentIntent}
              onAddPersonalTransaction={handleAddPersonalTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onNavigatePage={setActivePage}
            />
          )}

          {activePage === 'splits' && (
            <SplitsPage
              groups={groups}
              members={GROUP_MEMBERS}
              sharedExpenses={sharedExpenses}
              onAddSharedExpense={handleAddSharedExpense}
              onSettleTransfer={handleSettleTransfer}
              onCreateGroup={handleCreateGroup}
            />
          )}

          {activePage === 'automations' && (
            <AutomationsPage
              suggestions={suggestions}
              rules={rules}
              groups={groups}
              onApplySuggestion={handleApplySuggestion}
              onDismissSuggestion={handleDismissSuggestion}
              onToggleRule={handleToggleRule}
              onAddRule={handleAddRule}
            />
          )}

          {activePage === 'analytics' && (
            <AnalyticsPage
              transactions={transactions}
              subscriptions={subscriptions}
              onToggleSubscriptionStatus={handleToggleSubscriptionStatus}
            />
          )}

          {activePage === 'receipts' && (
            <ReceiptsPage
              receipts={receipts}
              groups={groups}
              onAssignReceipt={handleAssignReceipt}
              onSimulateScanNewReceipt={handleSimulateScanNewReceipt}
            />
          )}
        </WorkspaceLayout>
      ) : (
        <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-zinc-900">
          <Navbar onOpenWorkspace={openWorkspace} />
          <main className="flex-1">
            <HeroSection onOpenWorkspace={openWorkspace} />
            <CapabilitiesBento onOpenWorkspace={openWorkspace} />
            <LiveSandbox onOpenWorkspace={openWorkspace} />
            <ProofAndSecurity />
            <PricingAndTrial
              selectedPlan={selectedPlan}
              onSelectPlan={setSelectedPlan}
            />
          </main>
          <Footer onOpenWorkspace={openWorkspace} />

          {/* Floating Compact Agent Chat Launcher on Landing Page */}
          {!agentChatOpen && (
            <button
              type="button"
              onClick={() => setAgentChatOpen(true)}
              className="fixed bottom-5 right-5 z-40 h-11 inline-flex items-center gap-2 px-4 text-sm font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg shadow-lg transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Ask Agent</span>
            </button>
          )}
        </div>
      )}

      <AgentChatDrawer
        isOpen={agentChatOpen}
        onClose={() => setAgentChatOpen(false)}
        workspaceSnapshot={workspaceSnapshot}
        onExecuteToolCall={handleExecuteToolCall}
      />
    </MotionConfig>
  );
}
