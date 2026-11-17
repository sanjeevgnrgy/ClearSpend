'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ScanLine, ArrowRight, Sparkles } from 'lucide-react';
import {
  RECEIPT_SAMPLES,
  MONTHLY_CHART_SERIES,
} from '@/data/expenseData';
import { ResilientImage } from './ResilientImage';
import { AppPage } from '@/types/clearspend';

interface CapabilitiesBentoProps {
  onOpenWorkspace: (page: AppPage) => void;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

type ChartMode = keyof typeof MONTHLY_CHART_SERIES;

const INITIAL_RULES = [
  {
    id: 'rule-1',
    label: 'Auto-split Trader Joe’s 50/50',
    detail: 'Routes half to Maya in Apartment 4B',
    enabled: true,
  },
  {
    id: 'rule-2',
    label: 'Alert on renewals over $50',
    detail: 'Flags SaaS price hikes 48h prior',
    enabled: true,
  },
  {
    id: 'rule-3',
    label: 'Auto-tag rideshares as Travel',
    detail: 'Matches Uber, Lyft, Bolt · 14 runs',
    enabled: false,
  },
];

export function CapabilitiesBento({ onOpenWorkspace }: CapabilitiesBentoProps) {
  const [selectedReceiptId, setSelectedReceiptId] = useState(RECEIPT_SAMPLES[0].id);
  const [rules, setRules] = useState(INITIAL_RULES);
  const [simplifyDebt, setSimplifyDebt] = useState(true);
  const [chartMode, setChartMode] = useState<ChartMode>('Spending');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const selectedReceipt =
    RECEIPT_SAMPLES.find((r) => r.id === selectedReceiptId) ?? RECEIPT_SAMPLES[0];

  const chartData = MONTHLY_CHART_SERIES[chartMode];
  const maxChartVal = Math.max(...chartData.map((d) => d.value));

  function toggleRule(id: string) {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  }

  return (
    <section id="features" className="py-20 lg:py-28 border-b border-zinc-200/80">
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          className="flex flex-wrap items-end justify-between gap-6 mb-12"
        >
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-emerald-800 mb-2">
              01. Agentic & Splitwise Capabilities
            </p>
            <h2
              className="font-display font-bold tracking-tight text-zinc-950 leading-tight"
              style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', textWrap: 'balance' }}
            >
              Autonomous bookkeeping meets frictionless group splitting.
            </h2>
            <p className="mt-3 text-base text-zinc-600 leading-relaxed">
              From natural-language expense capture to multi-person debt simplification, inspect
              each core workflow or jump straight into the full workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenWorkspace('automations')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-900 hover:text-emerald-800 underline underline-offset-4 cursor-pointer"
          >
            <span>Open Agentic Inbox</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1 (col-span-2): Receipt OCR + Split Routing */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-display text-xl font-semibold text-zinc-950">
                  Instant Receipt OCR & Group Routing
                </h3>
                <p className="text-sm text-zinc-600 mt-1">
                  Snap any paper slip to extract line items, tax, and assign directly to a Split Group or Personal Ledger.
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg">
                {RECEIPT_SAMPLES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => setSelectedReceiptId(sample.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedReceiptId === sample.id
                        ? 'bg-white text-zinc-950 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {sample.merchant.split(' ')[0]} · ${sample.total.toFixed(0)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              <div className="md:col-span-5 relative overflow-hidden rounded-lg border border-zinc-200/80 min-h-[210px]">
                <ResilientImage
                  src="/images/editorial_workspace_receipt_1794898286805.jpg"
                  alt="Minimalist oak desk with smartphone and printed coffee receipt"
                  fallbackTitle="Receipt capture workspace"
                  className="w-full h-full object-cover"
                />
                <motion.div
                  key={selectedReceipt.id}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: [0, 170, 0], opacity: [0.9, 0.9, 0] }}
                  transition={{ duration: 1.4, ease: 'easeInOut' }}
                  className="absolute inset-x-0 top-0 h-0.5 bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.75)] pointer-events-none"
                />
              </div>

              <div className="md:col-span-7 flex flex-col justify-between border border-zinc-200 rounded-lg p-5 bg-[#FAFAFA]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedReceipt.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                  >
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-200">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                          <ScanLine className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Extracted Receipt</span>
                        </div>
                        <h4 className="mt-1 font-display text-lg font-semibold text-zinc-950">
                          {selectedReceipt.merchant}
                        </h4>
                        <p className="text-xs text-zinc-500">
                          {selectedReceipt.category} <span aria-hidden="true">·</span> {selectedReceipt.paymentMethod}
                        </p>
                      </div>
                      <span className="font-mono text-xl font-semibold text-zinc-950 tabular-nums">
                        ${selectedReceipt.total.toFixed(2)}
                      </span>
                    </div>

                    <div className="py-3 space-y-2 border-b border-zinc-200">
                      {selectedReceipt.items.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between text-sm text-zinc-700"
                        >
                          <span>{item.name}</span>
                          <span className="font-mono tabular-nums text-zinc-900">
                            ${item.price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 flex items-center justify-between text-xs text-zinc-500">
                      <span>Tax isolated: ${selectedReceipt.tax.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => onOpenWorkspace('receipts')}
                        className="font-medium text-emerald-800 hover:underline cursor-pointer"
                      >
                        Open Receipts Vault →
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Card 2 (col-span-1): Agentic Rules Engine */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.06, ease: EASE_OUT_EXPO }}
            className="lg:col-span-1 bg-white border border-zinc-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                <h3 className="font-display text-xl font-semibold text-zinc-950">
                  Agentic Rules Engine
                </h3>
              </div>
              <p className="text-sm text-zinc-600 mb-6">
                Clearspend learns repeating merchant and roommate split patterns and proposes automated rules.
              </p>

              <div className="divide-y divide-zinc-100">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900">
                        {rule.label}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {rule.detail}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rule.enabled}
                      aria-label={rule.label}
                      onClick={() => toggleRule(rule.id)}
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
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-600">
              <span>Active automations</span>
              <span className="font-mono font-semibold text-zinc-950 tabular-nums">
                {rules.filter((r) => r.enabled).length} / {rules.length} enabled
              </span>
            </div>
          </motion.div>

          {/* Card 3 (col-span-1): Splitwise-Style Debt Simplification */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.08, ease: EASE_OUT_EXPO }}
            className="lg:col-span-1 bg-white border border-zinc-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <h3 className="font-display text-xl font-semibold text-zinc-950">
                Smart Debt Simplification
              </h3>
              <p className="text-sm text-zinc-600 mt-1 mb-5">
                Equal, Exact, Percentage, and Share splits with automatic transfer minimization.
              </p>

              <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg mb-5">
                <button
                  type="button"
                  onClick={() => setSimplifyDebt(true)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    simplifyDebt ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-600'
                  }`}
                >
                  Simplified (2)
                </button>
                <button
                  type="button"
                  onClick={() => setSimplifyDebt(false)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    !simplifyDebt ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-600'
                  }`}
                >
                  Raw IOUs (5)
                </button>
              </div>

              <div className="space-y-2.5">
                {simplifyDebt ? (
                  <>
                    <div className="flex items-center justify-between py-2 border-b border-zinc-100 text-sm">
                      <span className="text-zinc-800">Liam → Alex</span>
                      <span className="font-mono font-semibold text-emerald-800 tabular-nums">
                        $137.00
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-zinc-100 text-sm">
                      <span className="text-zinc-800">Samira → Alex</span>
                      <span className="font-mono font-semibold text-emerald-800 tabular-nums">
                        $115.30
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 text-xs">
                      <span className="text-zinc-600">Liam → Maya (Dinner)</span>
                      <span className="font-mono text-zinc-900 tabular-nums">$46.00</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 text-xs">
                      <span className="text-zinc-600">Maya → Liam (Van)</span>
                      <span className="font-mono text-zinc-900 tabular-nums">$23.00</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 text-xs">
                      <span className="text-zinc-600">Liam → Alex (Stay)</span>
                      <span className="font-mono text-zinc-900 tabular-nums">$160.00</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 text-xs">
                      <span className="text-zinc-600">Samira → Alex (Stay)</span>
                      <span className="font-mono text-zinc-900 tabular-nums">$160.00</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-zinc-500">
                <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                <span>Min-cash-flow engine</span>
              </span>
              <button
                type="button"
                onClick={() => onOpenWorkspace('splits')}
                className="font-medium text-emerald-800 hover:underline cursor-pointer"
              >
                Open Splits →
              </button>
            </div>
          </motion.div>

          {/* Card 4 (col-span-2): Animated Cash Runway & Shared Volume Chart */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.12, ease: EASE_OUT_EXPO }}
            className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-display text-xl font-semibold text-zinc-950">
                  6-Month Cash Flow & Burn Trajectory
                </h3>
                <p className="text-sm text-zinc-600 mt-1">
                  Monitor personal burn, net savings, and recurring vendor creep across every cycle.
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg">
                {(['Spending', 'Savings', 'Recurring'] as ChartMode[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setChartMode(tab)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      chartMode === tab
                        ? 'bg-white text-zinc-950 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative pt-6 pb-2">
              <div className="grid grid-cols-6 gap-3 sm:gap-5 items-end h-52 border-b border-zinc-200 pb-3">
                {chartData.map((bar, index) => {
                  const ratio = bar.value / maxChartVal;
                  const isHighlighted =
                    hoveredBarIndex === index || index === chartData.length - 1;
                  return (
                    <div
                      key={`${chartMode}-${bar.month}`}
                      onMouseEnter={() => setHoveredBarIndex(index)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                      className="h-full flex flex-col items-center justify-end group cursor-pointer"
                    >
                      <span
                        className={`font-mono text-xs tabular-nums mb-2 transition-opacity duration-150 ${
                          isHighlighted
                            ? 'text-zinc-950 font-semibold opacity-100'
                            : 'text-zinc-500 opacity-80'
                        }`}
                      >
                        ${bar.value.toLocaleString('en-US')}
                      </span>
                      <div className="w-full max-w-[54px] h-36 bg-zinc-100 rounded-md flex items-end overflow-hidden">
                        <motion.div
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: ratio }}
                          transition={{
                            duration: 0.48,
                            delay: index * 0.04,
                            ease: EASE_OUT_EXPO,
                          }}
                          className={`w-full h-full origin-bottom rounded-md transition-colors duration-150 ${
                            chartMode === 'Savings'
                              ? isHighlighted
                                ? 'bg-emerald-700'
                                : 'bg-emerald-600/75'
                              : isHighlighted
                              ? 'bg-zinc-900'
                              : 'bg-zinc-400/70'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-6 gap-3 sm:gap-5 pt-2.5 text-center">
                {chartData.map((bar, index) => (
                  <span
                    key={bar.month}
                    className={`text-xs font-medium ${
                      hoveredBarIndex === index || index === chartData.length - 1
                        ? 'text-zinc-950'
                        : 'text-zinc-500'
                    }`}
                  >
                    {bar.month}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
