import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Plus, Sparkles } from 'lucide-react';
import {
  INITIAL_HERO_PERSONAL,
  LedgerEntry,
  ExpenseCategory,
} from '../data/expenseData';
import { AppPage } from '../types/clearspend';

interface HeroSectionProps {
  onOpenWorkspace: (page?: AppPage) => void;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const PERSONAL_PRESETS: {
  merchant: string;
  amount: number;
  category: ExpenseCategory;
  note: string;
}[] = [
  { merchant: 'Balthazar Bakery', amount: 18.5, category: 'Dining', note: 'Lunch pastry' },
  { merchant: 'Trader Joe’s', amount: 46.2, category: 'Groceries', note: 'Produce & coffee' },
];

const INITIAL_SPLIT_PREVIEW = [
  { id: 'sp-1', name: 'Maya Lin', detail: 'Owes you · Lisbon Trip + Apt 4B', balance: 158.7 },
  { id: 'sp-2', name: 'Liam Chen', detail: 'Owes you · Lisbon Trip', balance: 137.0 },
  { id: 'sp-3', name: 'Samira Patel', detail: 'Owes you · Lisbon Trip + Offsite', balance: 115.3 },
];

export function HeroSection({ onOpenWorkspace }: HeroSectionProps) {
  const [mode, setMode] = useState<'ledger' | 'splits'>('ledger');
  const [personalEntries, setPersonalEntries] = useState<LedgerEntry[]>(INITIAL_HERO_PERSONAL);
  const [splitBalances, setSplitBalances] = useState(INITIAL_SPLIT_PREVIEW);

  const monthlyBudget = 2800;
  const baseMonthSpend = 1480;
  const currentTotal =
    baseMonthSpend + personalEntries.reduce((sum, item) => sum + item.amount, 0);
  const utilizationRatio = Math.min(currentTotal / monthlyBudget, 1);
  const remainingAmount = Math.max(monthlyBudget - currentTotal, 0);

  const totalOwedToYou = splitBalances.reduce((sum, m) => sum + m.balance, 0);

  function handleQuickAdd(preset: {
    merchant: string;
    amount: number;
    category: ExpenseCategory;
    note: string;
  }) {
    const newItem: LedgerEntry = {
      id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      merchant: preset.merchant,
      amount: preset.amount,
      category: preset.category,
      date: 'Just now · Agent tagged',
      note: preset.note,
    };
    setPersonalEntries((prev) => [newItem, ...prev.slice(0, 3)]);
  }

  function handleQuickSplitDinner() {
    setSplitBalances((prev) =>
      prev.map((m) => ({
        ...m,
        balance: Math.round((m.balance + 32.0) * 100) / 100,
      }))
    );
  }

  function handleSettleOne(id: string) {
    setSplitBalances((prev) =>
      prev.map((m) => (m.id === id ? { ...m, balance: 0 } : m))
    );
  }

  return (
    <section className="pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-zinc-200/80">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          {/* Left Column: Agentic + Splitwise Proposition */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            <p className="text-xs font-medium tracking-wide text-zinc-500 mb-4">
              Agentic Expense Tracker <span aria-hidden="true">·</span> Group Bill Splitting
            </p>

            <h1
              className="font-display font-bold tracking-tight text-zinc-950 leading-[1.06] mb-6"
              style={{ fontSize: 'clamp(2.25rem, 4.1vw, 3.65rem)', textWrap: 'balance' }}
            >
              One intelligent ledger for personal spend and shared splits.
            </h1>

            <p className="text-base sm:text-lg text-zinc-600 leading-relaxed max-w-xl mb-8">
              Log or split expenses in plain English, catch duplicate renewals automatically, and
              simplify group balances with friends or roommates in a single click.
            </p>

            <div className="flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={() => onOpenWorkspace('overview')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                <span>Launch Live Workspace</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onOpenWorkspace('splits')}
                className="inline-flex items-center gap-1.5 py-2.5 px-2 text-sm font-medium text-zinc-700 hover:text-zinc-950 underline underline-offset-4 decoration-zinc-300 hover:decoration-zinc-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Explore Group Splits
              </button>
            </div>

            <p className="mt-6 text-xs text-zinc-500">
              5 interactive app pages included <span aria-hidden="true">·</span> Agentic command bar, Splitwise-style groups, and receipt OCR
            </p>
          </motion.div>

          {/* Right Column: Dual-Mode Interactive Preview (Agentic Ledger / Group Splits) */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: EASE_OUT_EXPO }}
            className="lg:col-span-6 flex"
          >
            <div className="w-full bg-white border border-zinc-200 rounded-xl p-6 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-zinc-100">
                  <div>
                    <div className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      <span>
                        {mode === 'ledger'
                          ? 'Agentic Personal Ledger'
                          : 'Lisbon Trip & Apt 4B Splits'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-2.5">
                      <motion.span
                        key={mode === 'ledger' ? currentTotal : totalOwedToYou}
                        initial={{ opacity: 0.5, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="font-mono text-2xl sm:text-3xl font-semibold text-zinc-950 tabular-nums"
                      >
                        {mode === 'ledger'
                          ? `$${currentTotal.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : `+$${totalOwedToYou.toFixed(2)}`}
                      </motion.span>
                      <span className="text-xs font-mono text-zinc-500 tabular-nums">
                        {mode === 'ledger'
                          ? `/ $${monthlyBudget.toLocaleString('en-US')} cap`
                          : 'net owed to you'}
                      </span>
                    </div>
                  </div>

                  {/* Mode Switch */}
                  <div
                    role="group"
                    aria-label="Hero preview mode"
                    className="inline-flex items-center p-1 bg-zinc-100 rounded-lg"
                  >
                    <button
                      type="button"
                      onClick={() => setMode('ledger')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        mode === 'ledger'
                          ? 'bg-white text-zinc-950 shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      Agentic Ledger
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('splits')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        mode === 'splits'
                          ? 'bg-white text-zinc-950 shadow-xs'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      Group Splits
                    </button>
                  </div>
                </div>

                {mode === 'ledger' ? (
                  <>
                    <div className="py-4 border-b border-zinc-100">
                      <div className="flex items-center justify-between text-xs text-zinc-600 mb-2">
                        <span>Monthly budget used</span>
                        <span className="font-mono tabular-nums text-emerald-800 font-medium">
                          ${remainingAmount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          remaining
                        </span>
                      </div>
                      <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full w-full bg-emerald-700 origin-left rounded-full"
                          initial={false}
                          animate={{ scaleX: utilizationRatio }}
                          transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
                        />
                      </div>
                    </div>

                    <div className="py-3 space-y-1 min-h-[224px]">
                      <AnimatePresence initial={false} mode="popLayout">
                        {personalEntries.slice(0, 4).map((entry) => (
                          <motion.div
                            key={entry.id}
                            layout
                            initial={{ opacity: 0, y: -10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.98 }}
                            transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
                            className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-zinc-50 transition-colors"
                          >
                            <div className="min-w-0 pr-4">
                              <p className="text-sm font-medium text-zinc-900 truncate">
                                {entry.merchant}
                              </p>
                              <p className="text-xs text-zinc-500 truncate">
                                {entry.category} <span aria-hidden="true">·</span> {entry.date}
                              </p>
                            </div>
                            <span className="font-mono text-sm font-medium text-zinc-900 tabular-nums shrink-0">
                              -${entry.amount.toFixed(2)}
                            </span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </>
                ) : (
                  <div className="py-3 divide-y divide-zinc-100 min-h-[278px]">
                    {splitBalances.map((person) => (
                      <div
                        key={person.id}
                        className="py-4 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-950 truncate">
                            {person.name}
                          </p>
                          <p className="text-xs text-zinc-500 truncate">
                            {person.balance > 0 ? person.detail : 'Settled up'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`font-mono text-sm font-semibold tabular-nums ${
                              person.balance > 0 ? 'text-emerald-800' : 'text-zinc-400'
                            }`}
                          >
                            {person.balance > 0
                              ? `+$${person.balance.toFixed(2)}`
                              : '$0.00'}
                          </span>
                          {person.balance > 0 && (
                            <button
                              type="button"
                              onClick={() => handleSettleOne(person.id)}
                              className="px-2.5 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors cursor-pointer"
                            >
                              Settle
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Interactive Bar */}
              <div className="pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-zinc-500">
                  {mode === 'ledger' ? 'Test agentic capture:' : 'Test group split:'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {mode === 'ledger' ? (
                    PERSONAL_PRESETS.map((preset) => (
                      <button
                        key={preset.merchant}
                        type="button"
                        onClick={() => handleQuickAdd(preset)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                        <span>
                          ${preset.amount.toFixed(2)} {preset.merchant}
                        </span>
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      onClick={handleQuickSplitDinner}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      <span>Split $128 dinner equally (4 ways)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Full-Width 4-Column Quantified Metrics Strip */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16, ease: EASE_OUT_EXPO }}
          className="mt-14 pt-10 border-t border-zinc-200 grid grid-cols-2 lg:grid-cols-4 gap-8"
        >
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-semibold text-zinc-950 tabular-nums">
              12,400+
            </div>
            <div className="mt-1 text-sm text-zinc-600">
              Active personal & shared group ledgers
            </div>
          </div>
          <div className="lg:border-l lg:border-zinc-200 lg:pl-8">
            <div className="font-mono text-2xl sm:text-3xl font-semibold text-zinc-950 tabular-nums">
              52%
            </div>
            <div className="mt-1 text-sm text-zinc-600">
              Fewer transfers via automatic debt simplification
            </div>
          </div>
          <div className="lg:border-l lg:border-zinc-200 lg:pl-8">
            <div className="font-mono text-2xl sm:text-3xl font-semibold text-zinc-950 tabular-nums">
              1.8s
            </div>
            <div className="mt-1 text-sm text-zinc-600">
              Median receipt OCR extraction & split routing
            </div>
          </div>
          <div className="lg:border-l lg:border-zinc-200 lg:pl-8">
            <div className="font-mono text-2xl sm:text-3xl font-semibold text-zinc-950 tabular-nums">
              99.4%
            </div>
            <div className="mt-1 text-sm text-zinc-600">
              First-pass merchant & anomaly detection accuracy
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
