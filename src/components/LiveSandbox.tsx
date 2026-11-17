import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, RotateCcw, Search, ArrowRight } from 'lucide-react';
import {
  SANDBOX_INITIAL_EXPENSES,
  LedgerEntry,
  ExpenseCategory,
} from '../data/expenseData';
import { AppPage } from '../types/clearspend';

interface LiveSandboxProps {
  onOpenWorkspace: (page?: AppPage) => void;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const CATEGORIES: ('All' | ExpenseCategory)[] = [
  'All',
  'Groceries',
  'Software',
  'Travel',
  'Dining',
];

const BUDGET_LIMIT = 1200;

export function LiveSandbox({ onOpenWorkspace }: LiveSandboxProps) {
  const [expenses, setExpenses] = useState<LedgerEntry[]>(SANDBOX_INITIAL_EXPENSES);
  const [activeFilter, setActiveFilter] = useState<'All' | ExpenseCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline Add Expense Form state
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Dining');
  const [formError, setFormError] = useState<string | null>(null);

  const filteredExpenses = expenses.filter((item) => {
    const matchesCategory = activeFilter === 'All' || item.category === activeFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.merchant.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      item.note.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remaining = Math.max(BUDGET_LIMIT - totalSpent, 0);
  const overBudget = totalSpent > BUDGET_LIMIT;

  const categoryTotals = (['Groceries', 'Software', 'Travel', 'Dining'] as ExpenseCategory[]).map(
    (cat) => {
      const sum = expenses
        .filter((e) => e.category === cat)
        .reduce((acc, e) => acc + e.amount, 0);
      return {
        category: cat,
        total: sum,
        share: totalSpent > 0 ? sum / totalSpent : 0,
      };
    }
  );

  function handleAddExpense(e: FormEvent) {
    e.preventDefault();
    const trimmedMerchant = merchant.trim();
    const parsedAmount = Number.parseFloat(amount);

    if (!trimmedMerchant) {
      setFormError('Enter a merchant or expense description.');
      return;
    }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 50000) {
      setFormError('Enter a valid amount between $0.01 and $50,000.');
      return;
    }

    setFormError(null);
    const newEntry: LedgerEntry = {
      id: `sb-${Date.now()}`,
      merchant: trimmedMerchant,
      category,
      date: 'Nov 16',
      amount: Math.round(parsedAmount * 100) / 100,
      note: 'Added in live sandbox',
    };

    setExpenses((prev) => [newEntry, ...prev]);
    setMerchant('');
    setAmount('');
  }

  function handleDelete(id: string) {
    setExpenses((prev) => prev.filter((item) => item.id !== id));
  }

  function handleReset() {
    setExpenses(SANDBOX_INITIAL_EXPENSES);
    setActiveFilter('All');
    setSearchQuery('');
    setFormError(null);
  }

  return (
    <section id="live-demo" className="py-20 lg:py-28 border-b border-zinc-200/80 bg-white">
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          className="flex flex-wrap items-end justify-between gap-6 mb-10"
        >
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-emerald-800 mb-2">
              02. Interactive Ledger Sandbox
            </p>
            <h2
              className="font-display font-bold tracking-tight text-zinc-950 leading-tight"
              style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', textWrap: 'balance' }}
            >
              Test the ledger before creating an account.
            </h2>
            <p className="mt-3 text-base text-zinc-600">
              Log a purchase, filter by category, or remove an entry to watch category allocations
              rebalance in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset sample data</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenWorkspace('splits')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Open Group Splits</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 8 Columns: Filter Bar, Quick Add Form, and Animated Table */}
          <div className="lg:col-span-8 border border-zinc-200 rounded-xl bg-[#FAFAFA] p-5 sm:p-6">
            {/* Add Expense Inline Form */}
            <form
              onSubmit={handleAddExpense}
              noValidate
              className="pb-5 mb-5 border-b border-zinc-200"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <label htmlFor="sandbox-merchant" className="sr-only">
                    Merchant name
                  </label>
                  <input
                    id="sandbox-merchant"
                    type="text"
                    placeholder="Merchant (e.g. Sweetgreen)"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="w-full h-10 px-3 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-700"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="sandbox-amount" className="sr-only">
                    Amount in USD
                  </label>
                  <input
                    id="sandbox-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Amount ($)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-mono bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-700 tabular-nums"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="sandbox-category" className="sr-only">
                    Category
                  </label>
                  <select
                    id="sandbox-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full h-10 px-2.5 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-emerald-700 cursor-pointer"
                  >
                    <option value="Dining">Dining</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Software">Software</option>
                    <option value="Travel">Travel</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full h-10 inline-flex items-center justify-center gap-1.5 px-4 text-sm font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
              {formError && (
                <p role="alert" className="mt-2 text-xs font-medium text-red-700">
                  {formError}
                </p>
              )}
            </form>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-200/70 rounded-lg">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveFilter(cat)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeFilter === cat
                        ? 'bg-white text-zinc-950 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-52">
                <Search
                  className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <label htmlFor="sandbox-search" className="sr-only">
                  Search transactions
                </label>
                <input
                  id="sandbox-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter merchant..."
                  className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-700"
                />
              </div>
            </div>

            {/* Transaction List */}
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              {filteredExpenses.length === 0 ? (
                <div className="py-12 px-6 text-center">
                  <p className="text-sm font-medium text-zinc-900">
                    No matching expenses
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Adjust your category filter or add a new purchase above.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  <AnimatePresence initial={false}>
                    {filteredExpenses.map((item) => (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                        className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-zinc-50/80 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-950 truncate">
                            {item.merchant}
                          </p>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            {item.category} <span aria-hidden="true">·</span> {item.date}{' '}
                            <span aria-hidden="true">·</span> {item.note}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <span className="font-mono text-sm font-medium text-zinc-950 tabular-nums">
                            ${item.amount.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            aria-label={`Remove ${item.merchant}`}
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-zinc-400 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </div>

          {/* Right 4 Columns: Live Category Allocation Summary */}
          <div className="lg:col-span-4 border border-zinc-200 rounded-xl bg-white p-6">
            <div className="pb-5 border-b border-zinc-100">
              <div className="text-xs font-medium text-zinc-500">
                Monthly Sandbox Allocation
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="font-mono text-3xl font-semibold text-zinc-950 tabular-nums">
                  ${totalSpent.toFixed(2)}
                </span>
                <span
                  className={`text-xs font-medium ${
                    overBudget ? 'text-red-700' : 'text-emerald-800'
                  }`}
                >
                  {overBudget
                    ? `Over limit by $${(totalSpent - BUDGET_LIMIT).toFixed(2)}`
                    : `$${remaining.toFixed(2)} remaining`}
                </span>
              </div>

              <div className="mt-3 h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full w-full origin-left rounded-full ${
                    overBudget ? 'bg-red-600' : 'bg-emerald-700'
                  }`}
                  initial={false}
                  animate={{ scaleX: Math.min(totalSpent / BUDGET_LIMIT, 1) }}
                  transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                <span>$0</span>
                <span className="font-mono tabular-nums">Cap: ${BUDGET_LIMIT}</span>
              </div>
            </div>

            <div className="pt-5 space-y-4">
              <h3 className="text-xs font-semibold text-zinc-500">
                Category Breakdown
              </h3>
              {categoryTotals.map((row) => (
                <div key={row.category}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-zinc-700 font-medium">{row.category}</span>
                    <span className="font-mono text-zinc-950 tabular-nums">
                      ${row.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full w-full bg-zinc-900 origin-left rounded-full"
                      initial={false}
                      animate={{ scaleX: row.share }}
                      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
