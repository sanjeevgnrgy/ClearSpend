'use client';

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Check, Plus, X, Mail, Copy } from 'lucide-react';
import {
  AgentSuggestion,
  AutomationRule,
  ExpenseCategory,
  SplitGroup,
} from '@/types/clearspend';

interface AutomationsPageProps {
  suggestions: AgentSuggestion[];
  rules: AutomationRule[];
  groups: SplitGroup[];
  onApplySuggestion: (id: string) => void;
  onDismissSuggestion: (id: string) => void;
  onToggleRule: (id: string) => void;
  onAddRule: (rule: Omit<AutomationRule, 'id' | 'matchesThisMonth'>) => void;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function AutomationsPage({
  suggestions,
  rules,
  groups,
  onApplySuggestion,
  onDismissSuggestion,
  onToggleRule,
  onAddRule,
}: AutomationsPageProps) {
  const [showNewRule, setShowNewRule] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [merchantMatch, setMerchantMatch] = useState('');
  const [actionType, setActionType] = useState<'categorize' | 'split'>('categorize');
  const [targetCategory, setTargetCategory] = useState<ExpenseCategory>('Travel');
  const [targetGroupId, setTargetGroupId] = useState(groups[0]?.id ?? '');
  const [ruleError, setRuleError] = useState<string | null>(null);

  // Email draft modal/composer state
  const [activeDraftItem, setActiveDraftItem] = useState<AgentSuggestion | null>(null);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftCopied, setDraftCopied] = useState(false);

  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending');
  const resolvedSuggestions = suggestions.filter((s) => s.status !== 'pending');

  function openEmailDraft(item: AgentSuggestion) {
    setActiveDraftItem(item);
    setDraftSubject(
      item.draftEmailSubject ?? `Billing inquiry regarding ${item.title}`
    );
    setDraftBody(
      item.draftEmailBody ??
        `Hello Billing Support,\n\nI am writing regarding "${item.title}". ${item.description}\n\nPlease confirm resolution at your earliest convenience.\n\nThank you,\nAlex Rivera`
    );
    setDraftCopied(false);
  }

  async function handleCopyDraft() {
    const fullText = `Subject: ${draftSubject}\n\n${draftBody}`;
    await navigator.clipboard?.writeText(fullText);
    setDraftCopied(true);
    setTimeout(() => setDraftCopied(false), 2000);
  }

  function handleApplyDraftedResolution() {
    if (!activeDraftItem) return;
    onApplySuggestion(activeDraftItem.id);
    setActiveDraftItem(null);
  }

  function handleCreateRule(e: FormEvent) {
    e.preventDefault();
    if (!ruleName.trim() || !merchantMatch.trim()) {
      setRuleError('Provide both a rule name and a merchant keyword.');
      return;
    }
    setRuleError(null);
    const groupName =
      groups.find((g) => g.id === targetGroupId)?.name ?? 'Selected Group';

    onAddRule({
      name: ruleName.trim(),
      conditionText: `Merchant matches "${merchantMatch.trim()}"`,
      actionText:
        actionType === 'categorize'
          ? `Assign category ${targetCategory}`
          : `Split equally in ${groupName}`,
      enabled: true,
    });

    setRuleName('');
    setMerchantMatch('');
    setShowNewRule(false);
  }

  return (
    <div className="space-y-8">
      {/* Proactive Agentic Inbox */}
      <section className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            <div>
              <h2 className="font-display text-lg font-semibold text-zinc-950">
                Proactive Agent Queue
              </h2>
              <p className="text-xs text-zinc-500">
                Detected anomalies, renewal hikes, refund drafts, and recurring split opportunities awaiting your approval
              </p>
            </div>
          </div>

          <span className="font-mono text-xs text-zinc-600 tabular-nums">
            {pendingSuggestions.length} pending review
          </span>
        </div>

        {pendingSuggestions.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <Check className="w-7 h-7 text-emerald-700 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-medium text-zinc-950">
              All agentic suggestions reviewed
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Clearspend is monitoring your bank feeds, receipts, and group splits continuously.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            <AnimatePresence initial={false}>
              {pendingSuggestions.map((item) => {
                const hasEmailDraft =
                  Boolean(item.draftEmailBody) ||
                  item.type === 'duplicate' ||
                  item.type === 'price_hike';

                return (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:bg-zinc-50/70 transition-colors"
                  >
                    <div className="max-w-2xl">
                      <p className="text-xs font-mono font-medium text-emerald-800 mb-1">
                        {item.impactLabel}
                      </p>
                      <h3 className="text-sm font-semibold text-zinc-950">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onDismissSuggestion(item.id)}
                        aria-label={`Dismiss ${item.title}`}
                        className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Dismiss</span>
                      </button>

                      {hasEmailDraft ? (
                        <button
                          type="button"
                          onClick={() => openEmailDraft(item)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{item.actionLabel}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onApplySuggestion(item.id)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{item.actionLabel}</span>
                        </button>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}

        {resolvedSuggestions.length > 0 && (
          <div className="px-6 py-3 bg-[#FAFAFA] border-t border-zinc-200 text-xs text-zinc-500 flex flex-wrap items-center justify-between gap-2">
            <span>
              Recently handled:{' '}
              {resolvedSuggestions.map((s) => `${s.title} (${s.status})`).join(' · ')}
            </span>
          </div>
        )}
      </section>

      {/* Agentic Refund / Cancellation Draft Editor Modal */}
      <AnimatePresence>
        {activeDraftItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveDraftItem(null)}
              className="fixed inset-0 bg-zinc-950/35 backdrop-blur-[1px]"
            />
            <motion.div
              role="dialog"
              aria-label="Agentic Email Draft"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
              className="relative z-10 w-full max-w-xl bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <h3 className="font-display text-base font-semibold text-zinc-950 truncate">
                    Agentic Refund & Cancellation Draft
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close email draft"
                  onClick={() => setActiveDraftItem(null)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-950 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label
                    htmlFor="draft-subject"
                    className="block text-xs font-medium text-zinc-700 mb-1"
                  >
                    Subject line
                  </label>
                  <input
                    id="draft-subject"
                    type="text"
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                    className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="draft-body"
                    className="block text-xs font-medium text-zinc-700 mb-1"
                  >
                    Message body
                  </label>
                  <textarea
                    id="draft-body"
                    rows={7}
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    className="w-full p-3 text-sm bg-[#FAFAFA] border border-zinc-200 rounded-lg leading-relaxed focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-[#FAFAFA] border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => void handleCopyDraft()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-800 bg-white border border-zinc-200 hover:border-zinc-400 rounded-lg cursor-pointer"
                >
                  {draftCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      <span>Copied Draft</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Copy Subject & Body</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2.5">
                  <a
                    href={`mailto:?subject=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(draftBody)}`}
                    className="px-3.5 py-2 text-xs font-medium text-zinc-700 bg-zinc-200/70 hover:bg-zinc-200 rounded-lg"
                  >
                    Open in Mail App
                  </a>
                  <button
                    type="button"
                    onClick={handleApplyDraftedResolution}
                    className="px-4 py-2 text-xs font-medium text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg cursor-pointer"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Smart Automation Rules */}
      <section className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-zinc-950">
              Active Automation Rules
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Deterministic rules run automatically on incoming bank feeds and receipt scans
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowNewRule((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{showNewRule ? 'Close Builder' : 'New Smart Rule'}</span>
          </button>
        </div>

        <AnimatePresence>
          {showNewRule && (
            <motion.form
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
              onSubmit={handleCreateRule}
              noValidate
              className="p-6 bg-[#FAFAFA] border-b border-zinc-200 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="rule-name" className="block text-xs font-medium text-zinc-700 mb-1">
                    Rule title
                  </label>
                  <input
                    id="rule-name"
                    type="text"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    placeholder="e.g. Auto-split groceries"
                    className="w-full h-9 px-3 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label htmlFor="rule-match" className="block text-xs font-medium text-zinc-700 mb-1">
                    If merchant contains
                  </label>
                  <input
                    id="rule-match"
                    type="text"
                    value={merchantMatch}
                    onChange={(e) => setMerchantMatch(e.target.value)}
                    placeholder="e.g. Whole Foods"
                    className="w-full h-9 px-3 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700"
                  />
                </div>
                <div>
                  <label htmlFor="rule-action" className="block text-xs font-medium text-zinc-700 mb-1">
                    Then perform
                  </label>
                  <select
                    id="rule-action"
                    value={actionType}
                    onChange={(e) => setActionType(e.target.value as 'categorize' | 'split')}
                    className="w-full h-9 px-2.5 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700"
                  >
                    <option value="categorize">Auto-Categorize</option>
                    <option value="split">Auto-Split with Group</option>
                  </select>
                </div>
                <div>
                  {actionType === 'categorize' ? (
                    <>
                      <label htmlFor="rule-cat" className="block text-xs font-medium text-zinc-700 mb-1">
                        Target category
                      </label>
                      <select
                        id="rule-cat"
                        value={targetCategory}
                        onChange={(e) => setTargetCategory(e.target.value as ExpenseCategory)}
                        className="w-full h-9 px-2.5 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700"
                      >
                        <option value="Travel">Travel</option>
                        <option value="Dining">Dining</option>
                        <option value="Groceries">Groceries</option>
                        <option value="Software">Software</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Housing">Housing</option>
                      </select>
                    </>
                  ) : (
                    <>
                      <label htmlFor="rule-group" className="block text-xs font-medium text-zinc-700 mb-1">
                        Target group
                      </label>
                      <select
                        id="rule-group"
                        value={targetGroupId}
                        onChange={(e) => setTargetGroupId(e.target.value)}
                        className="w-full h-9 px-2.5 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700"
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              </div>

              {ruleError && (
                <p role="alert" className="text-xs font-medium text-red-700">
                  {ruleError}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewRule(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-700 bg-zinc-200/70 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg cursor-pointer"
                >
                  Save Rule
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <ul className="divide-y divide-zinc-100">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-zinc-50/70 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-950">{rule.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {rule.conditionText} <span aria-hidden="true">·</span> {rule.actionText}{' '}
                  <span aria-hidden="true">·</span>{' '}
                  <span className="font-mono tabular-nums">
                    {rule.matchesThisMonth} runs this month
                  </span>
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={rule.enabled}
                aria-label={rule.name}
                onClick={() => onToggleRule(rule.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  rule.enabled ? 'bg-emerald-700' : 'bg-zinc-200'
                }`}
              >
                <motion.span
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-xs ${
                    rule.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
