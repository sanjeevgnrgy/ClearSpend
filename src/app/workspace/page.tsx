'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MotionConfig } from 'motion/react';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';
import { OverviewPage } from '@/components/workspace/OverviewPage';
import { SplitsPage } from '@/components/workspace/SplitsPage';
import { AutomationsPage } from '@/components/workspace/AutomationsPage';
import { AnalyticsPage } from '@/components/workspace/AnalyticsPage';
import { ReceiptsPage } from '@/components/workspace/ReceiptsPage';
import { useClearspend } from '@/context/ClearspendProvider';
import { AppPage, ReceiptDocument, SplitAllocation } from '@/types/clearspend';

const VALID_PAGES: AppPage[] = [
  'overview',
  'splits',
  'automations',
  'analytics',
  'receipts',
];

function WorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    transactions,
    groups,
    members,
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
    activeWorkspacePage,
    setActiveWorkspacePage,
    setAgentChatOpen,
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
  } = useClearspend();

  useEffect(() => {
    const tab = searchParams.get('tab') as AppPage | null;
    if (tab && VALID_PAGES.includes(tab)) {
      setActiveWorkspacePage(tab);
    }
  }, [searchParams, setActiveWorkspacePage]);

  function handleNavigatePage(page: AppPage) {
    setActiveWorkspacePage(page);
    router.replace(`/workspace?tab=${page}`);
  }

  async function handleSaveItemizedSplit(
    groupId: string,
    receipt: ReceiptDocument,
    allocations: SplitAllocation[]
  ) {
    await addSharedExpense({
      groupId,
      title: `${receipt.merchant} (Itemized)`,
      category: receipt.category,
      totalAmount: receipt.total,
      paidByMemberId: 'm-you',
      splitMethod: 'itemized',
      allocations,
      date: 'Nov 17',
    });
  }

  return (
    <MotionConfig reducedMotion="user">
      <WorkspaceLayout
        activePage={activeWorkspacePage}
        onNavigatePage={handleNavigatePage}
        onExitToLanding={() => router.push('/')}
        onQuickNewExpense={() => handleNavigatePage('overview')}
        onOpenAgentChat={() => setAgentChatOpen(true)}
        pendingAgentCount={pendingAgentCount}
      >
        {activeWorkspacePage === 'overview' && (
          <OverviewPage
            transactions={transactions}
            members={members}
            groups={groups}
            recurringBills={recurringBills}
            checkingBuffer={checkingBuffer}
            netYouAreOwed={netYouAreOwed}
            netYouOwe={netYouOwe}
            pendingAgentCount={pendingAgentCount}
            onExecuteAgentIntent={(intent) => void executeAgentIntent(intent)}
            onAddPersonalTransaction={(tx) => void addPersonalTransaction(tx)}
            onImportCsvTransactions={(rows) => void importCsvTransactions(rows)}
            onDeleteTransaction={(id) => void deleteTransaction(id)}
            onNavigatePage={handleNavigatePage}
          />
        )}

        {activeWorkspacePage === 'splits' && (
          <SplitsPage
            groups={groups}
            members={members}
            sharedExpenses={sharedExpenses}
            recurringBills={recurringBills}
            onAddSharedExpense={(exp) => void addSharedExpense(exp)}
            onSettleTransfer={(gId, fromId, toId, amt) =>
              void settleTransfer(gId, fromId, toId, amt)
            }
            onCreateGroup={(name, desc, fairness, mIds) =>
              void createGroup(name, desc, fairness, mIds)
            }
            onPostRecurringBill={(billId) => void postRecurringBill(billId)}
            onToggleRecurringBill={toggleRecurringBill}
            onPublishShareLink={publishShareLink}
          />
        )}

        {activeWorkspacePage === 'automations' && (
          <AutomationsPage
            suggestions={suggestions}
            rules={rules}
            groups={groups}
            onApplySuggestion={applySuggestion}
            onDismissSuggestion={dismissSuggestion}
            onToggleRule={(id) => void toggleRule(id)}
            onAddRule={(rule) => void addRule(rule)}
          />
        )}

        {activeWorkspacePage === 'analytics' && (
          <AnalyticsPage
            transactions={transactions}
            subscriptions={subscriptions}
            recurringBills={recurringBills}
            checkingBuffer={checkingBuffer}
            netYouAreOwed={netYouAreOwed}
            netYouOwe={netYouOwe}
            onChangeCheckingBuffer={setCheckingBuffer}
            onToggleSubscriptionStatus={(id) => void toggleSubscriptionStatus(id)}
          />
        )}

        {activeWorkspacePage === 'receipts' && (
          <ReceiptsPage
            receipts={receipts}
            groups={groups}
            members={members}
            onAssignReceipt={(id, target) => void assignReceipt(id, target)}
            onAddScannedReceipt={addScannedReceipt}
            onSaveItemizedSplit={handleSaveItemizedSplit}
          />
        )}
      </WorkspaceLayout>
    </MotionConfig>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-sm text-zinc-500">
          Loading Clearspend workspace...
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}
