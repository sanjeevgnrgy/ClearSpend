import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanLine, Check, Users, User } from 'lucide-react';
import { ReceiptDocument, SplitGroup } from '../../types/clearspend';
import { ResilientImage } from '../ResilientImage';

interface ReceiptsPageProps {
  receipts: ReceiptDocument[];
  groups: SplitGroup[];
  onAssignReceipt: (receiptId: string, target: 'personal' | string) => void;
  onSimulateScanNewReceipt: () => void;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function ReceiptsPage({
  receipts,
  groups,
  onAssignReceipt,
  onSimulateScanNewReceipt,
}: ReceiptsPageProps) {
  const [selectedId, setSelectedId] = useState(receipts[0]?.id ?? '');
  const [isScanning, setIsScanning] = useState(false);

  const selected = receipts.find((r) => r.id === selectedId) ?? receipts[0];

  function handleScanDemoReceipt() {
    setIsScanning(true);
    setTimeout(() => {
      onSimulateScanNewReceipt();
      setIsScanning(false);
    }, 900);
  }

  function getAssignmentLabel(target: string) {
    if (target === 'unassigned') return 'Needs routing';
    if (target === 'personal') return 'Personal Ledger';
    const grp = groups.find((g) => g.id === target);
    return grp ? `Split in ${grp.name}` : 'Assigned to group';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-zinc-200 rounded-xl p-5">
        <div>
          <h2 className="font-display text-base font-semibold text-zinc-950">
            Receipt OCR & Smart Routing
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Scan paper receipts or forward PDF invoices, then route them to your Personal Ledger or Split Groups
          </p>
        </div>

        <button
          type="button"
          onClick={handleScanDemoReceipt}
          disabled={isScanning}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
        >
          <ScanLine className="w-4 h-4" aria-hidden="true" />
          <span>{isScanning ? 'Extracting line items...' : 'Simulate Receipt Scan'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Columns: Receipt Queue */}
        <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-zinc-700">Captured Receipts</h3>
            <span className="font-mono text-xs text-zinc-500 tabular-nums">
              {receipts.length} documents
            </span>
          </div>

          <ul className="divide-y divide-zinc-100">
            {receipts.map((rcpt) => {
              const isSelected = rcpt.id === selected?.id;
              return (
                <li key={rcpt.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(rcpt.id)}
                    className={`w-full text-left px-5 py-4 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected ? 'bg-zinc-100/80' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-950 truncate">
                        {rcpt.merchant}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {rcpt.date} <span aria-hidden="true">·</span>{' '}
                        <span
                          className={
                            rcpt.assignedTarget === 'unassigned'
                              ? 'text-amber-700 font-medium'
                              : 'text-emerald-800 font-medium'
                          }
                        >
                          {getAssignmentLabel(rcpt.assignedTarget)}
                        </span>
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-zinc-950 tabular-nums shrink-0">
                      ${rcpt.total.toFixed(2)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right 7 Columns: Receipt Detail & Routing Actions */}
        {selected && (
          <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-xl p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                  <div className="md:col-span-5 relative overflow-hidden rounded-lg border border-zinc-200 min-h-[190px]">
                    <ResilientImage
                      src="/src/assets/images/editorial_workspace_receipt_1794898286805.jpg"
                      alt={`Scanned receipt for ${selected.merchant}`}
                      fallbackTitle={selected.merchant}
                      className="w-full h-full object-cover"
                    />
                    {isScanning && (
                      <motion.div
                        initial={{ y: 0 }}
                        animate={{ y: [0, 180, 0] }}
                        transition={{ duration: 0.9, repeat: Infinity }}
                        className="absolute inset-x-0 top-0 h-0.5 bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                      />
                    )}
                  </div>

                  <div className="md:col-span-7 flex flex-col justify-between">
                    <div className="pb-4 border-b border-zinc-100 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-emerald-800 font-medium">
                          OCR Verified · {selected.category}
                        </p>
                        <h3 className="font-display text-xl font-semibold text-zinc-950 mt-1">
                          {selected.merchant}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {selected.date} <span aria-hidden="true">·</span> {selected.paymentMethod}
                        </p>
                      </div>
                      <span className="font-mono text-2xl font-semibold text-zinc-950 tabular-nums">
                        ${selected.total.toFixed(2)}
                      </span>
                    </div>

                    <div className="py-4 space-y-2 border-b border-zinc-100">
                      {selected.items.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between text-sm text-zinc-700"
                        >
                          <span>{item.name}</span>
                          <span className="font-mono tabular-nums text-zinc-950">
                            ${item.price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 flex items-center justify-between text-xs text-zinc-500 font-mono tabular-nums">
                      <span>Subtotal ${selected.subtotal.toFixed(2)}</span>
                      <span>Tax ${selected.tax.toFixed(2)}</span>
                      <span>Tip ${selected.tip.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Routing Controls: Personal Ledger or Split Group */}
                <div className="pt-5 border-t border-zinc-200">
                  <p className="text-xs font-medium text-zinc-700 mb-3">
                    Route this receipt ({getAssignmentLabel(selected.assignedTarget)}):
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onAssignReceipt(selected.id, 'personal')}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                        selected.assignedTarget === 'personal'
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Personal Ledger</span>
                      {selected.assignedTarget === 'personal' && (
                        <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                      )}
                    </button>

                    {groups.map((grp) => {
                      const active = selected.assignedTarget === grp.id;
                      return (
                        <button
                          key={grp.id}
                          type="button"
                          onClick={() => onAssignReceipt(selected.id, grp.id)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                            active
                              ? 'bg-emerald-800 text-white border-emerald-800'
                              : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Split in {grp.name}</span>
                          {active && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
