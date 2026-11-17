import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ANALYTICS_MONTHLY_SERIES,
  CATEGORY_BUDGETS,
} from '../../data/initialWorkspaceData';
import { LedgerTransaction, SubscriptionItem } from '../../types/clearspend';

interface AnalyticsPageProps {
  transactions: LedgerTransaction[];
  subscriptions: SubscriptionItem[];
  onToggleSubscriptionStatus: (id: string) => void;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
type SeriesKey = keyof typeof ANALYTICS_MONTHLY_SERIES;

export function AnalyticsPage({
  transactions,
  subscriptions,
  onToggleSubscriptionStatus,
}: AnalyticsPageProps) {
  const [chartTab, setChartTab] = useState<SeriesKey>('Spending');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const series = ANALYTICS_MONTHLY_SERIES[chartTab];
  const maxVal = Math.max(...series.map((s) => s.value));

  const totalRecurringMonthly = subscriptions
    .filter((s) => s.status !== 'Paused')
    .reduce((sum, s) => sum + s.monthlyCost, 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: 6-Month Spending / Savings / Shared Splits Chart */}
        <section className="lg:col-span-7 bg-white border border-zinc-200 rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-lg font-semibold text-zinc-950">
                6-Month Cash Flow & Shared Splits
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Compare personal burn, monthly savings rate, and group split volume
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg">
              {(
                [
                  { id: 'Spending', label: 'Spending' },
                  { id: 'Savings', label: 'Savings' },
                  { id: 'SharedSplits', label: 'Shared Splits' },
                ] as { id: SeriesKey; label: string }[]
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setChartTab(t.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    chartTab === t.id
                      ? 'bg-white text-zinc-950 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <div className="grid grid-cols-6 gap-3 sm:gap-5 items-end h-56 border-b border-zinc-200 pb-3">
              {series.map((item, idx) => {
                const ratio = item.value / maxVal;
                const active = hoveredIdx === idx || idx === series.length - 1;
                return (
                  <div
                    key={`${chartTab}-${item.month}`}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="h-full flex flex-col items-center justify-end cursor-pointer"
                  >
                    <span
                      className={`font-mono text-xs tabular-nums mb-2 transition-opacity ${
                        active ? 'text-zinc-950 font-semibold' : 'text-zinc-500'
                      }`}
                    >
                      ${item.value.toLocaleString('en-US')}
                    </span>
                    <div className="w-full max-w-[52px] h-40 bg-zinc-100 rounded-md flex items-end overflow-hidden">
                      <motion.div
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: ratio }}
                        transition={{
                          duration: 0.45,
                          delay: idx * 0.04,
                          ease: EASE_OUT_EXPO,
                        }}
                        className={`w-full h-full origin-bottom rounded-md transition-colors ${
                          chartTab === 'Savings'
                            ? active
                              ? 'bg-emerald-700'
                              : 'bg-emerald-600/75'
                            : active
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
              {series.map((item, idx) => (
                <span
                  key={item.month}
                  className={`text-xs font-medium ${
                    hoveredIdx === idx || idx === series.length - 1
                      ? 'text-zinc-950'
                      : 'text-zinc-500'
                  }`}
                >
                  {item.month}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Right 5 Columns: Live Category Budget Caps */}
        <section className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl p-6">
          <div className="pb-4 border-b border-zinc-100">
            <h2 className="font-display text-lg font-semibold text-zinc-950">
              Monthly Category Caps
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Calculated live from your current ledger entries
            </p>
          </div>

          <div className="pt-5 space-y-5">
            {CATEGORY_BUDGETS.map((budget) => {
              const spent = transactions
                .filter((tx) => tx.category === budget.category)
                .reduce((acc, tx) => acc + tx.amount, 0);
              const pct = spent / budget.cap;
              const statusLabel =
                pct > 1
                  ? 'Over Budget'
                  : pct >= 0.75
                  ? 'Approaching Cap'
                  : 'On Track';
              const statusColor =
                pct > 1
                  ? 'text-red-700'
                  : pct >= 0.75
                  ? 'text-amber-700'
                  : 'text-emerald-800';
              const barColor =
                pct > 1
                  ? 'bg-red-600'
                  : pct >= 0.75
                  ? 'bg-amber-600'
                  : 'bg-emerald-700';

              return (
                <div key={budget.category}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-zinc-900">
                      {budget.category}{' '}
                      <span className={`ml-1.5 font-medium ${statusColor}`}>
                        · {statusLabel}
                      </span>
                    </span>
                    <span className="font-mono text-zinc-700 tabular-nums">
                      ${spent.toFixed(0)} / ${budget.cap}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full w-full origin-left rounded-full ${barColor}`}
                      initial={false}
                      animate={{ scaleX: Math.min(pct, 1) }}
                      transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Recurring Subscriptions & Burn Audit */}
      <section className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-zinc-950">
              Recurring Subscriptions Monitor
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Automatic price-hike detection and virtual card pause simulation
            </p>
          </div>
          <span className="font-mono text-sm font-semibold text-zinc-950 tabular-nums">
            Active Burn: ${totalRecurringMonthly.toFixed(2)} / mo
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-[#FAFAFA] text-xs font-medium text-zinc-500">
                <th className="py-2.5 px-6 font-medium">Vendor</th>
                <th className="py-2.5 px-4 font-medium">Cadence</th>
                <th className="py-2.5 px-4 font-medium">Next Bill</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium text-right">Monthly Cost</th>
                <th className="py-2.5 px-6 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-zinc-50/80 transition-colors">
                  <td className="py-3 px-6 font-medium text-zinc-950">
                    {sub.vendor}
                  </td>
                  <td className="py-3 px-4 text-xs text-zinc-600">{sub.cadence}</td>
                  <td className="py-3 px-4 font-mono text-xs text-zinc-500 tabular-nums">
                    {sub.nextBillDate}
                  </td>
                  <td className="py-3 px-4 text-xs font-medium">
                    <span
                      className={
                        sub.status === 'Price Increased'
                          ? 'text-amber-700'
                          : sub.status === 'Paused'
                          ? 'text-zinc-400'
                          : 'text-emerald-800'
                      }
                    >
                      {sub.status}
                      {sub.previousCost
                        ? ` (was $${sub.previousCost.toFixed(2)})`
                        : ''}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-zinc-950 text-right tabular-nums">
                    ${sub.monthlyCost.toFixed(2)}
                  </td>
                  <td className="py-3 px-6 text-right">
                    <button
                      type="button"
                      onClick={() => onToggleSubscriptionStatus(sub.id)}
                      className="px-3 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors cursor-pointer"
                    >
                      {sub.status === 'Paused' ? 'Resume' : 'Pause Renewal'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
