import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ArrowRight, CheckCircle2 } from 'lucide-react';

export type PlanTier = 'Personal' | 'Pro & Teams';

interface PricingAndTrialProps {
  selectedPlan: PlanTier;
  onSelectPlan: (plan: PlanTier) => void;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function PricingAndTrial({
  selectedPlan,
  onSelectPlan,
}: PricingAndTrialProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [teamSize, setTeamSize] = useState('Just me');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const proPrice = billingCycle === 'annual' ? 9 : 12;

  function handlePlanChoose(plan: PlanTier) {
    onSelectPlan(plan);
    setSubmitted(false);
    const target = document.getElementById('trial');
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (trimmedName.length < 2) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setFormError(null);
    setSubmitted(true);
  }

  return (
    <section id="pricing" className="py-20 lg:py-28 border-b border-zinc-200/80">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Pricing Header & Segmented Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          className="flex flex-wrap items-end justify-between gap-6 mb-12"
        >
          <div className="max-w-xl">
            <p className="text-sm font-medium text-emerald-800 mb-2">
              05. Simple Pricing
            </p>
            <h2
              className="font-display font-bold tracking-tight text-zinc-950 leading-tight"
              style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', textWrap: 'balance' }}
            >
              Start free for personal use. Upgrade when your ledger grows.
            </h2>
          </div>

          <div
            role="group"
            aria-label="Billing cycle"
            className="inline-flex items-center p-1 bg-zinc-200/75 rounded-lg"
          >
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                billingCycle === 'annual'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Annual · Save 25%
            </button>
          </div>
        </motion.div>

        {/* 2 Transparent Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {/* Personal Tier */}
          <div
            className={`bg-white rounded-xl p-8 border transition-colors flex flex-col justify-between ${
              selectedPlan === 'Personal' ? 'border-zinc-900' : 'border-zinc-200'
            }`}
          >
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-display text-2xl font-semibold text-zinc-950">
                  Personal
                </h3>
                <span className="font-mono text-3xl font-semibold text-zinc-950 tabular-nums">
                  $0
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                Everything an individual needs for daily spending clarity and monthly budgets.
              </p>

              <ul className="mt-6 space-y-3 border-t border-zinc-100 pt-6 text-sm text-zinc-700">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>Up to 2 connected bank or card accounts</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>30 receipt scans per month with OCR extraction</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>Custom category budgets & CSV export</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handlePlanChoose('Personal')}
              className={`mt-8 w-full py-2.5 px-4 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                selectedPlan === 'Personal'
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-900 border-zinc-300 hover:border-zinc-900'
              }`}
            >
              {selectedPlan === 'Personal' ? 'Selected: Personal Plan' : 'Choose Personal Free'}
            </button>
          </div>

          {/* Pro & Teams Tier */}
          <div
            className={`bg-white rounded-xl p-8 border transition-colors flex flex-col justify-between ${
              selectedPlan === 'Pro & Teams' ? 'border-emerald-700' : 'border-zinc-200'
            }`}
          >
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <h3 className="font-display text-2xl font-semibold text-zinc-950">
                    Pro & Teams
                  </h3>
                  <p className="text-xs text-emerald-800 font-medium mt-0.5">
                    Includes 14-day full-feature trial
                  </p>
                </div>
                <div className="text-right">
                  <motion.span
                    key={proPrice}
                    initial={{ opacity: 0.4, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="font-mono text-3xl font-semibold text-zinc-950 tabular-nums"
                  >
                    ${proPrice}
                  </motion.span>
                  <span className="text-xs text-zinc-500"> / seat / mo</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                Unlimited receipt scanning, automated merchant rules, and shared workspaces.
              </p>

              <ul className="mt-6 space-y-3 border-t border-zinc-100 pt-6 text-sm text-zinc-700">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>Unlimited bank feeds & 38-currency normalization</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>Unlimited receipt OCR + email invoice forwarding</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>Direct QuickBooks, Xero, and Slack renewal alerts</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => handlePlanChoose('Pro & Teams')}
              className={`mt-8 w-full py-2.5 px-4 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedPlan === 'Pro & Teams'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-zinc-900 text-white hover:bg-emerald-800'
              }`}
            >
              {selectedPlan === 'Pro & Teams'
                ? 'Selected: Pro & Teams (14-Day Trial)'
                : 'Start 14-Day Free Trial'}
            </button>
          </div>
        </div>

        {/* Trial & Early Access Lead Form */}
        <div
          id="trial"
          className="bg-white border border-zinc-200 rounded-xl p-8 sm:p-10"
        >
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="submitted"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                className="py-6 text-center max-w-lg mx-auto"
              >
                <CheckCircle2
                  className="w-10 h-10 text-emerald-700 mx-auto mb-3"
                  aria-hidden="true"
                />
                <h3 className="font-display text-2xl font-semibold text-zinc-950">
                  Your workspace is reserved, {fullName.split(' ')[0]}.
                </h3>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                  We sent an activation link for the <strong className="text-zinc-900">{selectedPlan}</strong> plan ({teamSize}) to{' '}
                  <span className="font-mono text-zinc-900">{email}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setFullName('');
                    setEmail('');
                  }}
                  className="mt-6 px-4 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
                >
                  Register another workspace
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
              >
                <div className="lg:col-span-5">
                  <p className="text-xs font-medium text-emerald-800 mb-1.5">
                    Selected Plan: {selectedPlan} <span aria-hidden="true">·</span>{' '}
                    {selectedPlan === 'Personal' ? 'Free forever' : `$${proPrice}/mo after 14 days`}
                  </p>
                  <h3 className="font-display text-2xl font-bold text-zinc-950 tracking-tight">
                    Create your Clearspend ledger in 30 seconds.
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600">
                    Connect a bank account or import a CSV right away. Cancel in one click at any point.
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className="lg:col-span-7 space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="trial-name"
                        className="block text-xs font-medium text-zinc-700 mb-1.5"
                      >
                        Full name
                      </label>
                      <input
                        id="trial-name"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Alex Rivera"
                        className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-700"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="trial-email"
                        className="block text-xs font-medium text-zinc-700 mb-1.5"
                      >
                        Email address
                      </label>
                      <input
                        id="trial-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@company.com"
                        className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                    <div className="sm:col-span-5">
                      <label
                        htmlFor="trial-size"
                        className="block text-xs font-medium text-zinc-700 mb-1.5"
                      >
                        Workspace size
                      </label>
                      <select
                        id="trial-size"
                        value={teamSize}
                        onChange={(e) => setTeamSize(e.target.value)}
                        className="w-full h-10 px-3 text-sm bg-[#FAFAFA] border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-emerald-700 cursor-pointer"
                      >
                        <option value="Just me">Just me</option>
                        <option value="2–10 people">2–10 people</option>
                        <option value="11–50 people">11–50 people</option>
                      </select>
                    </div>
                    <div className="sm:col-span-7">
                      <button
                        type="submit"
                        className="w-full h-10 inline-flex items-center justify-center gap-2 px-5 text-sm font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <span>Activate Free Workspace</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {formError && (
                    <p role="alert" className="text-xs font-medium text-red-700">
                      {formError}
                    </p>
                  )}
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
