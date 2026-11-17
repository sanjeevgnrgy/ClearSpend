'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Share2,
  Copy,
  Check,
  Repeat,
  ExternalLink,
} from 'lucide-react';
import {
  ExpenseCategory,
  GroupMember,
  RecurringGroupBill,
  SharedExpense,
  SplitAllocation,
  SplitGroup,
  SplitMethod,
} from '@/types/clearspend';
import {
  buildEqualAllocations,
  calculateGroupBalances,
  simplifyGroupDebts,
} from '@/utils/splitMath';

interface SplitsPageProps {
  groups: SplitGroup[];
  members: GroupMember[];
  sharedExpenses: SharedExpense[];
  recurringBills: RecurringGroupBill[];
  onAddSharedExpense: (expense: Omit<SharedExpense, 'id'>) => void;
  onSettleTransfer: (
    groupId: string,
    fromMemberId: string,
    toMemberId: string,
    amount: number
  ) => void;
  onCreateGroup: (
    name: string,
    description: string,
    fairnessLabel: string,
    memberIds: string[]
  ) => void;
  onPostRecurringBill: (billId: string) => void;
  onToggleRecurringBill: (billId: string) => void;
  onPublishShareLink: (groupId: string) => Promise<string>;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const FAIRNESS_PRESETS = [
  'Equal split',
  '60/40 Household Preset',
  '65/35 Couple Income Preset',
  '70/30 Roommate Preset',
];

export function SplitsPage({
  groups,
  members,
  sharedExpenses,
  recurringBills,
  onAddSharedExpense,
  onSettleTransfer,
  onCreateGroup,
  onPostRecurringBill,
  onToggleRecurringBill,
  onPublishShareLink,
}: SplitsPageProps) {
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? '');
  const [simplifyEnabled, setSimplifyEnabled] = useState(true);
  const [showAddSplit, setShowAddSplit] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Share link state
  const [publishedShareUrl, setPublishedShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [publishingShare, setPublishingShare] = useState(false);

  // Add Shared Expense Form
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Dining');
  const [paidBy, setPaidBy] = useState('m-you');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [splitError, setSplitError] = useState<string | null>(null);

  // Create Group Form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupFairness, setNewGroupFairness] = useState(FAIRNESS_PRESETS[0]);
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([
    'm-you',
    'm-maya',
  ]);
  const [groupError, setGroupError] = useState<string | null>(null);

  const activeGroup = groups.find((g) => g.id === selectedGroupId) ?? groups[0];
  const groupExpenses = sharedExpenses.filter((e) => e.groupId === activeGroup.id);
  const groupMembers = activeGroup.memberIds
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is GroupMember => Boolean(m));

  const groupRecurringBills = recurringBills.filter(
    (b) => b.groupId === activeGroup.id || activeGroup.id.startsWith(b.groupId)
  );

  const balances = calculateGroupBalances(activeGroup.memberIds, groupExpenses);
  const simplifiedTransfers = simplifyGroupDebts(balances);
  const rawPairwiseCount =
    groupExpenses.filter((e) => !e.isSettlement).length *
    Math.max(groupMembers.length - 1, 1);

  function getMember(id: string) {
    return members.find((m) => m.id === id);
  }

  function applyCoupleFairnessPreset(pctFirst: number) {
    if (groupMembers.length < 2) return;
    setSplitMethod('percentage');
    const rest = Math.round(((100 - pctFirst) / (groupMembers.length - 1)) * 10) / 10;
    const next: Record<string, string> = {};
    groupMembers.forEach((m, idx) => {
      next[m.id] = idx === 0 ? String(pctFirst) : String(rest);
    });
    setCustomInputs(next);
  }

  async function handlePublishShare() {
    setPublishingShare(true);
    setShareCopied(false);
    try {
      const url = await onPublishShareLink(activeGroup.id);
      setPublishedShareUrl(url);
    } finally {
      setPublishingShare(false);
    }
  }

  async function handleCopyShareUrl() {
    if (!publishedShareUrl || typeof window === 'undefined') return;
    const fullUrl = `${window.location.origin}${publishedShareUrl}`;
    await navigator.clipboard?.writeText(fullUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  function handleSplitSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const parsedTotal = Number.parseFloat(totalAmount);

    if (!trimmedTitle) {
      setSplitError('Enter an expense title.');
      return;
    }
    if (Number.isNaN(parsedTotal) || parsedTotal <= 0) {
      setSplitError('Enter a valid amount greater than $0.00.');
      return;
    }

    let allocations: SplitAllocation[] = [];

    if (splitMethod === 'equal') {
      allocations = buildEqualAllocations(activeGroup.memberIds, parsedTotal);
    } else if (splitMethod === 'exact') {
      let sum = 0;
      allocations = activeGroup.memberIds.map((id) => {
        const val = Number.parseFloat(customInputs[id] || '0');
        const safeVal = Number.isNaN(val) || val < 0 ? 0 : Math.round(val * 100) / 100;
        sum += safeVal;
        return { memberId: id, amount: safeVal };
      });
      if (Math.abs(sum - parsedTotal) > 0.02) {
        setSplitError(
          `Exact amounts sum to $${sum.toFixed(2)}, but total is $${parsedTotal.toFixed(2)}.`
        );
        return;
      }
    } else if (splitMethod === 'percentage') {
      let pctSum = 0;
      allocations = activeGroup.memberIds.map((id) => {
        const pct = Number.parseFloat(customInputs[id] || '0');
        const safePct = Number.isNaN(pct) || pct < 0 ? 0 : pct;
        pctSum += safePct;
        return {
          memberId: id,
          amount: Math.round(((parsedTotal * safePct) / 100) * 100) / 100,
        };
      });
      if (Math.abs(pctSum - 100) > 0.2) {
        setSplitError(
          `Percentages currently total ${pctSum.toFixed(1)}% (must equal 100%).`
        );
        return;
      }
    } else if (splitMethod === 'shares') {
      const shares = activeGroup.memberIds.map((id) => {
        const s = Number.parseFloat(customInputs[id] || '1');
        return { id, shares: Number.isNaN(s) || s < 0 ? 0 : s };
      });
      const totalShares = shares.reduce((acc, s) => acc + s.shares, 0);
      if (totalShares <= 0) {
        setSplitError('At least one member must have more than 0 shares.');
        return;
      }
      allocations = shares.map((s) => ({
        memberId: s.id,
        amount: Math.round(((parsedTotal * s.shares) / totalShares) * 100) / 100,
      }));
    }

    setSplitError(null);
    onAddSharedExpense({
      groupId: activeGroup.id,
      title: trimmedTitle,
      category,
      totalAmount: Math.round(parsedTotal * 100) / 100,
      paidByMemberId: paidBy,
      splitMethod,
      allocations,
      date: 'Nov 17',
    });

    setTitle('');
    setTotalAmount('');
    setCustomInputs({});
    setShowAddSplit(false);
  }

  function handleCreateGroupSubmit(e: FormEvent) {
    e.preventDefault();
    if (newGroupName.trim().length < 2) {
      setGroupError('Enter a group name.');
      return;
    }
    if (selectedNewMembers.length < 2) {
      setGroupError('Select at least 2 group members.');
      return;
    }
    setGroupError(null);
    onCreateGroup(
      newGroupName.trim(),
      newGroupDesc.trim() || 'Shared group expenses',
      newGroupFairness,
      selectedNewMembers
    );
    setNewGroupName('');
    setNewGroupDesc('');
    setShowCreateGroup(false);
  }

  function toggleNewGroupMember(id: string) {
    if (id === 'm-you') return;
    setSelectedNewMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-6">
      {/* Group Selector Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {groups.map((grp) => {
            const isSelected = grp.id === activeGroup.id;
            return (
              <button
                key={grp.id}
                type="button"
                onClick={() => {
                  setSelectedGroupId(grp.id);
                  setPublishedShareUrl(null);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                }`}
              >
                {grp.name}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowCreateGroup((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>New Group</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={publishingShare}
            onClick={() => void handlePublishShare()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-zinc-800 bg-white border border-zinc-200 hover:border-zinc-400 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            <Share2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            <span>{publishingShare ? 'Publishing...' : 'Share Settlement Link'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddSplit((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{showAddSplit ? 'Cancel Split' : 'Add Shared Expense'}</span>
          </button>
        </div>
      </div>

      {/* Published No-Login Share Link Banner */}
      <AnimatePresence>
        {publishedShareUrl && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-950">
                No-login settlement link ready for {activeGroup.name}
              </p>
              <p className="font-mono text-xs text-emerald-800 truncate mt-0.5">
                {publishedShareUrl}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void handleCopyShareUrl()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-900 bg-white border border-zinc-200 hover:border-zinc-400 rounded-lg cursor-pointer"
              >
                {shareCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
              <Link
                href={publishedShareUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg"
              >
                <span>Open Public View</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Group Inline Form */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
            onSubmit={handleCreateGroupSubmit}
            noValidate
            className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-semibold text-zinc-950">
              Create Shared Group
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="grp-name" className="block text-xs font-medium text-zinc-700 mb-1">
                  Group name
                </label>
                <input
                  id="grp-name"
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Tahoe Ski Weekend"
                  className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700"
                />
              </div>
              <div>
                <label htmlFor="grp-desc" className="block text-xs font-medium text-zinc-700 mb-1">
                  Description
                </label>
                <input
                  id="grp-desc"
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Cabin, lift tickets, and groceries"
                  className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700"
                />
              </div>
              <div>
                <label htmlFor="grp-fairness" className="block text-xs font-medium text-zinc-700 mb-1">
                  Fairness Preset
                </label>
                <select
                  id="grp-fairness"
                  value={newGroupFairness}
                  onChange={(e) => setNewGroupFairness(e.target.value)}
                  className="w-full h-10 px-2.5 text-sm bg-[#FAFAFA] border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700"
                >
                  {FAIRNESS_PRESETS.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-zinc-700 mb-2">Members</p>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const active = selectedNewMembers.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleNewGroupMember(m.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {groupError && (
              <p role="alert" className="text-xs font-medium text-red-700">
                {groupError}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateGroup(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                Create Group
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Add Shared Expense Composer (Equal / Exact / % / Shares + Fairness Presets) */}
      <AnimatePresence>
        {showAddSplit && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
            onSubmit={handleSplitSubmit}
            noValidate
            className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-100 pb-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-zinc-950">
                  Add Shared Expense to {activeGroup.name}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Choose Equal, Exact Dollar, Percentage, Share weighting, or Couple/Roommate Fairness Presets
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyCoupleFairnessPreset(60)}
                  className="px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-md cursor-pointer"
                >
                  60/40 Preset
                </button>
                <button
                  type="button"
                  onClick={() => applyCoupleFairnessPreset(65)}
                  className="px-2.5 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-md cursor-pointer"
                >
                  65/35 Preset
                </button>
                <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg">
                  {(
                    [
                      { id: 'equal', label: 'Equal' },
                      { id: 'exact', label: 'Exact ($)' },
                      { id: 'percentage', label: 'Percent (%)' },
                      { id: 'shares', label: 'Shares (×)' },
                    ] as { id: SplitMethod; label: string }[]
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setSplitMethod(mode.id);
                        setSplitError(null);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        splitMethod === mode.id
                          ? 'bg-white text-zinc-950 shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-5">
                <label htmlFor="split-title" className="block text-xs font-medium text-zinc-700 mb-1">
                  Description
                </label>
                <input
                  id="split-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Tapas & wine night"
                  className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="split-amount" className="block text-xs font-medium text-zinc-700 mb-1">
                  Total ($ USD)
                </label>
                <input
                  id="split-amount"
                  type="number"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="120.00"
                  className="w-full h-10 px-3 text-sm font-mono bg-[#FAFAFA] border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700 tabular-nums"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="split-paid-by" className="block text-xs font-medium text-zinc-700 mb-1">
                  Paid by
                </label>
                <select
                  id="split-paid-by"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full h-10 px-2.5 text-sm bg-[#FAFAFA] border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700"
                >
                  {groupMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="split-category" className="block text-xs font-medium text-zinc-700 mb-1">
                  Category
                </label>
                <select
                  id="split-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full h-10 px-2.5 text-sm bg-[#FAFAFA] border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700"
                >
                  <option value="Dining">Dining</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Travel">Travel</option>
                  <option value="Housing">Housing</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Software">Software</option>
                </select>
              </div>
            </div>

            {/* Split Allocation Preview / Inputs */}
            <div className="border-t border-zinc-100 pt-4">
              <p className="text-xs font-medium text-zinc-600 mb-3">
                Member breakdown ({splitMethod})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {groupMembers.map((m) => {
                  const parsedTotal = Number.parseFloat(totalAmount) || 0;
                  const equalShare =
                    groupMembers.length > 0 ? parsedTotal / groupMembers.length : 0;

                  return (
                    <div
                      key={m.id}
                      className="p-3 border border-zinc-200 rounded-lg bg-[#FAFAFA] flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-medium text-zinc-900 truncate">
                        {m.name}
                      </span>
                      {splitMethod === 'equal' ? (
                        <span className="font-mono text-xs text-zinc-700 tabular-nums">
                          ${equalShare.toFixed(2)}
                        </span>
                      ) : (
                        <input
                          type="number"
                          step={splitMethod === 'shares' ? '1' : '0.01'}
                          min="0"
                          aria-label={`${m.name} ${splitMethod} value`}
                          placeholder={
                            splitMethod === 'percentage'
                              ? `${(100 / groupMembers.length).toFixed(0)}%`
                              : splitMethod === 'shares'
                              ? '1'
                              : '0.00'
                          }
                          value={customInputs[m.id] ?? ''}
                          onChange={(e) =>
                            setCustomInputs((prev) => ({
                              ...prev,
                              [m.id]: e.target.value,
                            }))
                          }
                          className="w-20 h-8 px-2 text-xs font-mono text-right bg-white border border-zinc-200 rounded-md focus:outline-none focus:border-emerald-700 tabular-nums"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {splitError && (
              <p role="alert" className="text-xs font-medium text-red-700">
                {splitError}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddSplit(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                Record Split
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Main Splitwise-style Group View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-xl p-6">
            <div className="pb-4 border-b border-zinc-100">
              <h2 className="font-display text-lg font-semibold text-zinc-950">
                {activeGroup.name}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {activeGroup.description} <span aria-hidden="true">·</span>{' '}
                <span className="text-emerald-800 font-medium">
                  {activeGroup.fairnessLabel}
                </span>
              </p>
            </div>

            <div className="py-4 divide-y divide-zinc-100">
              {balances.map((b) => {
                const member = getMember(b.memberId);
                if (!member) return null;
                const isPositive = b.netBalance > 0.01;
                const isNegative = b.netBalance < -0.01;

                return (
                  <div
                    key={b.memberId}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center font-mono text-xs font-semibold text-zinc-800 shrink-0">
                        {member.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-950 truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {isPositive
                            ? 'Owed by group'
                            : isNegative
                            ? 'Owes group'
                            : 'All settled up'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`font-mono text-sm font-semibold tabular-nums shrink-0 ${
                        isPositive
                          ? 'text-emerald-800'
                          : isNegative
                          ? 'text-amber-700'
                          : 'text-zinc-500'
                      }`}
                    >
                      {isPositive
                        ? `+$${b.netBalance.toFixed(2)}`
                        : isNegative
                        ? `-$${Math.abs(b.netBalance).toFixed(2)}`
                        : '$0.00'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Suggested Settlements */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6">
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                <h3 className="font-display text-base font-semibold text-zinc-950">
                  Suggested Settlements
                </h3>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={simplifyEnabled}
                onClick={() => setSimplifyEnabled((p) => !p)}
                className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 hover:text-zinc-950 cursor-pointer"
              >
                <span>Simplify debts:</span>
                <span
                  className={`font-mono font-semibold ${
                    simplifyEnabled ? 'text-emerald-800' : 'text-zinc-500'
                  }`}
                >
                  {simplifyEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {simplifiedTransfers.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2
                  className="w-7 h-7 text-emerald-700 mx-auto mb-2"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-zinc-950">
                  Everyone in {activeGroup.name} is settled
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Zero pending transfers remaining.
                </p>
              </div>
            ) : (
              <div className="pt-4 space-y-3">
                <p className="text-xs text-zinc-500">
                  {simplifyEnabled
                    ? `Minimized ${Math.max(rawPairwiseCount, simplifiedTransfers.length)} raw IOUs into ${simplifiedTransfers.length} direct transfers.`
                    : `Showing direct net settlement paths (${simplifiedTransfers.length} transfers).`}
                </p>

                <div className="divide-y divide-zinc-100">
                  {simplifiedTransfers.map((tr) => {
                    const from = getMember(tr.fromMemberId);
                    const to = getMember(tr.toMemberId);
                    if (!from || !to) return null;

                    return (
                      <div
                        key={`${tr.fromMemberId}-${tr.toMemberId}`}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 flex items-center gap-1.5 flex-wrap">
                            <span>{from.name.split(' ')[0]}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                            <span>{to.name.split(' ')[0]}</span>
                          </p>
                          <p className="font-mono text-xs text-zinc-600 tabular-nums mt-0.5">
                            ${tr.amount.toFixed(2)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            onSettleTransfer(
                              activeGroup.id,
                              tr.fromMemberId,
                              tr.toMemberId,
                              tr.amount
                            )
                          }
                          className="px-3.5 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Settle Up
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Recurring Group Bills */}
          <div className="bg-white border border-zinc-200 rounded-xl p-6">
            <div className="flex items-center gap-2 pb-4 border-b border-zinc-100">
              <Repeat className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <div>
                <h3 className="font-display text-base font-semibold text-zinc-950">
                  Recurring Auto-Posting Bills
                </h3>
                <p className="text-xs text-zinc-500">
                  Rent & utilities split automatically using your group fairness preset
                </p>
              </div>
            </div>

            {groupRecurringBills.length === 0 ? (
              <p className="pt-4 text-xs text-zinc-500">
                No recurring bills scheduled for {activeGroup.name}. Switch to Apartment 4B to view recurring rent & fiber.
              </p>
            ) : (
              <div className="divide-y divide-zinc-100 pt-2">
                {groupRecurringBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-950 truncate">
                        {bill.title}
                      </p>
                      <p className="text-xs text-zinc-500 font-mono tabular-nums">
                        ${bill.amount.toFixed(2)} · Day {bill.dayOfMonth} ·{' '}
                        {bill.active ? 'Auto-active' : 'Paused'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleRecurringBill(bill.id)}
                        className="px-2.5 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md cursor-pointer"
                      >
                        {bill.active ? 'Pause' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onPostRecurringBill(bill.id)}
                        className="px-2.5 py-1 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-md cursor-pointer"
                      >
                        Post Cycle Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 7 Columns: Shared Expenses Feed */}
        <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-zinc-950">
              Group Expense History
            </h3>
            <span className="font-mono text-xs text-zinc-500 tabular-nums">
              {groupExpenses.length} entries
            </span>
          </div>

          {groupExpenses.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <p className="text-sm font-medium text-zinc-900">
                No shared expenses in {activeGroup.name} yet
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Click “Add Shared Expense” above to split your first bill.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              <AnimatePresence initial={false}>
                {groupExpenses.map((exp) => {
                  const payer = getMember(exp.paidByMemberId);
                  const selfAlloc = exp.allocations.find((a) => a.memberId === 'm-you');
                  const payerIsSelf = exp.paidByMemberId === 'm-you';

                  return (
                    <motion.li
                      key={exp.id}
                      layout
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                      className="px-6 py-4 hover:bg-zinc-50/80 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-950 truncate">
                          {exp.title}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {exp.isSettlement ? (
                            <>Settlement recorded · {exp.date}</>
                          ) : (
                            <>
                              Paid by {payer?.name.split(' ')[0]} · {exp.splitMethod} split ·{' '}
                              {exp.category} · {exp.date}
                            </>
                          )}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-semibold text-zinc-950 tabular-nums">
                          ${exp.totalAmount.toFixed(2)}
                        </p>
                        {!exp.isSettlement && selfAlloc && (
                          <p
                            className={`font-mono text-xs tabular-nums ${
                              payerIsSelf ? 'text-emerald-800' : 'text-amber-700'
                            }`}
                          >
                            {payerIsSelf
                              ? `You lent $${(exp.totalAmount - selfAlloc.amount).toFixed(2)}`
                              : `Your share $${selfAlloc.amount.toFixed(2)}`}
                          </p>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
