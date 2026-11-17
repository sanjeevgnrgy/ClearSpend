import { motion } from 'motion/react';
import { Lock, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { ResilientImage } from './ResilientImage';

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const TESTIMONIALS = [
  {
    name: 'Hannah Lindqvist',
    role: 'Operations Director',
    org: 'Northstar Studio',
    metric: '6 hrs → 22 mins monthly close',
    quote:
      'Before Clearspend, our studio spent Friday afternoons chasing missing SaaS receipts across three cards. Now every receipt matches its bank line automatically before noon.',
  },
  {
    name: 'Marcus Vance',
    role: 'Independent Product Designer',
    org: 'Vance Digital LLC',
    metric: '$340/mo unused renewals caught',
    quote:
      'In my first week, the recurring burn monitor flagged four forgotten software seats I had been paying for since spring. It paid for the entire year in two days.',
  },
  {
    name: 'Priya Nair',
    role: 'Finance Lead',
    org: 'Oakridge Logistics',
    metric: '14 team cards in one ledger',
    quote:
      'Drivers snap fuel and toll receipts straight from the cab. Accounting sees clean, categorized exports ready for Xero without manual re-keying.',
  },
];

export function ProofAndSecurity() {
  return (
    <>
      {/* Section 03: Proof of Impact */}
      <section className="py-20 lg:py-28 border-b border-zinc-200/80">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch mb-14">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
              className="lg:col-span-5 flex flex-col justify-center"
            >
              <p className="text-sm font-medium text-emerald-800 mb-2">
                03. Verified Outcomes
              </p>
              <h2
                className="font-display font-bold tracking-tight text-zinc-950 leading-tight"
                style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', textWrap: 'balance' }}
              >
                Built for households and finance leads who hate month-end surprises.
              </h2>
              <p className="mt-4 text-base text-zinc-600 leading-relaxed">
                Whether tracking personal cash flow or reconciling 14 team cards, Clearspend replaces
                fragile spreadsheets with a single auditable source of truth.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, delay: 0.08, ease: EASE_OUT_EXPO }}
              className="lg:col-span-7 overflow-hidden rounded-xl border border-zinc-200 min-h-[280px]"
            >
              <ResilientImage
                src="/src/assets/images/team_finance_review_1794898288808.jpg"
                alt="Two team leads reviewing quarterly expense reports on a laptop at an oak table"
                fallbackTitle="Team expense review"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((item, idx) => (
              <motion.article
                key={item.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: idx * 0.06, ease: EASE_OUT_EXPO }}
                className="bg-white border border-zinc-200 rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <p className="font-mono text-sm font-semibold text-emerald-800 tabular-nums mb-3">
                    {item.metric}
                  </p>
                  <p className="text-sm text-zinc-700 leading-relaxed">
                    “{item.quote}”
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100">
                  <p className="text-sm font-semibold text-zinc-950">{item.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {item.role} <span aria-hidden="true">·</span> {item.org}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Section 04: Security & Data Ownership */}
      <section id="security" className="py-20 lg:py-24 border-b border-zinc-200/80 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
              className="lg:col-span-5 overflow-hidden rounded-xl border border-zinc-200 min-h-[260px]"
            >
              <ResilientImage
                src="/src/assets/images/security_vault_minimal_1794898288233.jpg"
                alt="Precision brushed aluminum and frosted glass blocks symbolizing encrypted ledger security"
                fallbackTitle="Bank-grade security architecture"
                className="w-full h-full object-cover"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, delay: 0.06, ease: EASE_OUT_EXPO }}
              className="lg:col-span-7 flex flex-col justify-center"
            >
              <p className="text-sm font-medium text-emerald-800 mb-2">
                04. Privacy & Security
              </p>
              <h2
                className="font-display font-bold tracking-tight text-zinc-950 leading-tight mb-6"
                style={{ fontSize: 'clamp(1.75rem, 3vw, 2.35rem)', textWrap: 'balance' }}
              >
                Read-only bank connectivity. Your ledger belongs strictly to you.
              </h2>

              <div className="divide-y divide-zinc-200 border-t border-b border-zinc-200">
                <div className="py-4 flex items-start gap-4">
                  <Lock className="w-5 h-5 text-zinc-900 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950">
                      Zero Credential Storage
                    </h3>
                    <p className="text-sm text-zinc-600 mt-0.5">
                      Bank feeds connect via tokenized OAuth through regulated open-banking rails. Clearspend never sees or stores your banking password.
                    </p>
                  </div>
                </div>

                <div className="py-4 flex items-start gap-4">
                  <ShieldCheck className="w-5 h-5 text-zinc-900 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950">
                      SOC 2 Type II & AES-256 Encryption
                    </h3>
                    <p className="text-sm text-zinc-600 mt-0.5">
                      Every uploaded receipt image and transaction row is encrypted at rest with AES-256 and transmitted exclusively over TLS 1.3.
                    </p>
                  </div>
                </div>

                <div className="py-4 flex items-start gap-4">
                  <FileSpreadsheet className="w-5 h-5 text-zinc-900 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950">
                      One-Click Full Ledger Export
                    </h3>
                    <p className="text-sm text-zinc-600 mt-0.5">
                      Leave anytime with your complete transaction history, tax tags, and original receipt PDFs in clean CSV or JSON format.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
}
