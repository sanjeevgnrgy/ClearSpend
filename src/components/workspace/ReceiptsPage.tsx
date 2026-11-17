'use client';

import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanLine, Check, Users, User, Camera } from 'lucide-react';
import {
  ExpenseCategory,
  GroupMember,
  ReceiptDocument,
  SplitAllocation,
  SplitGroup,
} from '@/types/clearspend';
import { ResilientImage } from '@/components/ResilientImage';

interface ReceiptsPageProps {
  receipts: ReceiptDocument[];
  groups: SplitGroup[];
  members: GroupMember[];
  onAssignReceipt: (receiptId: string, target: 'personal' | string) => void;
  onAddScannedReceipt: (receipt: Omit<ReceiptDocument, 'id'>) => Promise<void>;
  onSaveItemizedSplit: (
    groupId: string,
    receipt: ReceiptDocument,
    allocations: SplitAllocation[]
  ) => Promise<void>;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function ReceiptsPage({
  receipts,
  groups,
  members,
  onAssignReceipt,
  onAddScannedReceipt,
  onSaveItemizedSplit,
}: ReceiptsPageProps) {
  const [selectedId, setSelectedId] = useState(receipts[0]?.id ?? '');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Item-level splitter ("Who ordered what")
  const [splitGroupId, setSplitGroupId] = useState(groups[0]?.id ?? '');
  const [itemAssignees, setItemAssignees] = useState<Record<number, string[]>>({});
  const [itemSplitSaved, setItemSplitSaved] = useState<string | null>(null);

  const selected = receipts.find((r) => r.id === selectedId) ?? receipts[0];
  const targetGroup = groups.find((g) => g.id === splitGroupId) ?? groups[0];
  const groupMemberIds = targetGroup?.memberIds ?? ['m-you', 'm-maya'];

  // Initialize default per-item member selections whenever selected receipt or group changes
  useEffect(() => {
    if (!selected) return;
    const defaults: Record<number, string[]> = {};
    selected.items.forEach((item, idx) => {
      const lower = item.name.toLowerCase();
      const matched = groupMemberIds.filter((mid) => {
        const member = members.find((m) => m.id === mid);
        if (!member) return false;
        const first = member.name.split(' ')[0].toLowerCase();
        const isAlex = mid === 'm-you' && lower.includes('alex');
        return isAlex || lower.includes(first);
      });
      defaults[idx] = matched.length > 0 ? matched : [...groupMemberIds];
    });
    setItemAssignees(defaults);
    setItemSplitSaved(null);
  }, [selected?.id, targetGroup?.id]);

  function toggleItemMember(itemIdx: number, memberId: string) {
    setItemSplitSaved(null);
    setItemAssignees((prev) => {
      const curr = prev[itemIdx] ?? groupMemberIds;
      const exists = curr.includes(memberId);
      if (exists && curr.length === 1) return prev; // keep at least 1 assignee per item
      return {
        ...prev,
        [itemIdx]: exists
          ? curr.filter((id) => id !== memberId)
          : [...curr, memberId],
      };
    });
  }

  // Proportional tax + tip calculation
  const itemizedAllocations: SplitAllocation[] = useMemo(() => {
    if (!selected) return [];
    const subByMember: Record<string, number> = {};
    groupMemberIds.forEach((id) => {
      subByMember[id] = 0;
    });

    selected.items.forEach((item, idx) => {
      const assignees = itemAssignees[idx]?.length
        ? itemAssignees[idx]
        : groupMemberIds;
      const share = item.price / assignees.length;
      assignees.forEach((id) => {
        subByMember[id] = (subByMember[id] ?? 0) + share;
      });
    });

    const totalItemsSum = Object.values(subByMember).reduce((a, b) => a + b, 0);
    const extras = selected.tax + selected.tip;

    let runningCents = 0;
    const totalCents = Math.round(selected.total * 100);
    const result = groupMemberIds.map((id, idx) => {
      const ratio =
        totalItemsSum > 0
          ? subByMember[id] / totalItemsSum
          : 1 / groupMemberIds.length;
      const rawAmount = subByMember[id] + extras * ratio;
      let cents = Math.round(rawAmount * 100);
      if (idx === groupMemberIds.length - 1) {
        cents = Math.max(totalCents - runningCents, 0);
      } else {
        runningCents += cents;
      }
      return { memberId: id, amount: cents / 100 };
    });

    return result;
  }, [selected, itemAssignees, groupMemberIds]);

  async function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError(null);
    setIsScanning(true);

    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const resStr = String(reader.result ?? '');
          resolve(resStr.split(',')[1] ?? '');
        };
        reader.onerror = () => reject(new Error('Failed to read receipt image.'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/receipts/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type || 'image/jpeg',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Receipt OCR scan failed.');
      }

      const r = data.receipt;
      await onAddScannedReceipt({
        merchant: String(r.merchant || 'Uploaded Receipt'),
        date: String(r.date || 'Nov 17 · Scanned'),
        subtotal: Number(r.subtotal ?? 0),
        tax: Number(r.tax ?? 0),
        tip: Number(r.tip ?? 0),
        total: Number(r.total ?? 0),
        category: (r.category as ExpenseCategory) || 'Dining',
        paymentMethod: String(r.paymentMethod || 'Card'),
        items: Array.isArray(r.items) ? r.items : [],
        assignedTarget: 'unassigned',
      });
    } catch (err: unknown) {
      setScanError(
        err instanceof Error ? err.message : 'Unable to scan receipt photo.'
      );
    } finally {
      setIsScanning(false);
      e.target.value = '';
    }
  }

  async function handleSampleScan() {
    setScanError(null);
    setIsScanning(true);
    try {
      await onAddScannedReceipt({
        merchant: 'Tartine Manufactory',
        date: 'Nov 17 · Just now',
        subtotal: 76.0,
        tax: 6.55,
        tip: 13.45,
        total: 96.0,
        category: 'Dining',
        paymentMethod: 'Apple Pay · 4821',
        items: [
          { name: 'Country Sourdough & Butter (Shared)', price: 14.0 },
          { name: 'Smoked Trout Tartine (Maya)', price: 21.0 },
          { name: 'Porchetta Sandwich (Alex)', price: 21.0 },
          { name: 'Espresso & Matcha (Liam & Alex)', price: 20.0 },
        ],
        assignedTarget: 'unassigned',
      });
    } finally {
      setIsScanning(false);
    }
  }

  async function handleSaveItemized() {
    if (!selected || !targetGroup) return;
    await onSaveItemizedSplit(targetGroup.id, selected, itemizedAllocations);
    setItemSplitSaved(`Saved itemized split ($${selected.total.toFixed(2)}) to ${targetGroup.name}.`);
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
            Item-Level Photo Receipt Splitter
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Upload a real receipt photo for Gemini OCR line extraction, assign who ordered each item, and split tax + tip proportionally
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer">
            <Camera className="w-4 h-4" aria-hidden="true" />
            <span>{isScanning ? 'Extracting items...' : 'Scan Receipt Photo'}</span>
            <input
              type="file"
              accept="image/*"
              disabled={isScanning}
              onChange={(e) => void handlePhotoUpload(e)}
              className="sr-only"
            />
          </label>

          <button
            type="button"
            onClick={() => void handleSampleScan()}
            disabled={isScanning}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <ScanLine className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Load Sample Receipt</span>
          </button>
        </div>
      </div>

      {scanError && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-xs font-medium text-red-800"
        >
          {scanError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 4 Columns: Receipt Queue */}
        <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-xl overflow-hidden">
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

        {/* Right 8 Columns: Receipt Detail & Interactive "Who Ordered What" Splitter */}
        {selected && (
          <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-xl p-6">
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
                  <div className="md:col-span-4 relative overflow-hidden rounded-lg border border-zinc-200 min-h-[180px]">
                    <ResilientImage
                      src="/images/editorial_workspace_receipt_1794898286805.jpg"
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

                  <div className="md:col-span-8 flex flex-col justify-between">
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

                    <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 font-mono tabular-nums">
                      <span>Subtotal ${selected.subtotal.toFixed(2)}</span>
                      <span>Tax ${selected.tax.toFixed(2)}</span>
                      <span>Tip ${selected.tip.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Item-Level Assignment ("Who Ordered What") */}
                <div className="border border-zinc-200 rounded-xl bg-[#FAFAFA] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200">
                    <div>
                      <h4 className="font-display text-sm font-semibold text-zinc-950">
                        Who Ordered What (Proportional Tax & Tip)
                      </h4>
                      <p className="text-xs text-zinc-500">
                        Tap members on each line item to split accurately down to the cent
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label htmlFor="item-split-group" className="text-xs text-zinc-600">
                        Group:
                      </label>
                      <select
                        id="item-split-group"
                        value={targetGroup?.id ?? ''}
                        onChange={(e) => setSplitGroupId(e.target.value)}
                        className="h-8 px-2.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700"
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="divide-y divide-zinc-200">
                    {selected.items.map((item, idx) => {
                      const assigned = itemAssignees[idx] ?? groupMemberIds;
                      return (
                        <div
                          key={`${item.name}-${idx}`}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-zinc-900">
                              {item.name}
                            </p>
                            <p className="font-mono text-xs text-zinc-500 tabular-nums">
                              ${item.price.toFixed(2)} ({assigned.length} sharing · $
                              {(item.price / Math.max(assigned.length, 1)).toFixed(2)} ea)
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {groupMemberIds.map((mid) => {
                              const m = members.find((mem) => mem.id === mid);
                              if (!m) return null;
                              const active = assigned.includes(mid);
                              return (
                                <button
                                  key={mid}
                                  type="button"
                                  onClick={() => toggleItemMember(idx, mid)}
                                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                                    active
                                      ? 'bg-zinc-900 text-white border-zinc-900'
                                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                                  }`}
                                >
                                  {m.name.split(' ')[0]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Calculated Per-Member Totals + Save */}
                  <div className="pt-3 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      {itemizedAllocations.map((alloc) => {
                        const m = members.find((mem) => mem.id === alloc.memberId);
                        return (
                          <div key={alloc.memberId} className="font-mono tabular-nums">
                            <span className="text-zinc-500">
                              {m?.name.split(' ')[0]}:{' '}
                            </span>
                            <span className="font-semibold text-zinc-950">
                              ${alloc.amount.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleSaveItemized()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Save Itemized Split to {targetGroup?.name}</span>
                    </button>
                  </div>

                  {itemSplitSaved && (
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
                      <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{itemSplitSaved}</span>
                    </div>
                  )}
                </div>

                {/* Quick Whole-Receipt Routing Controls */}
                <div className="pt-2 border-t border-zinc-200">
                  <p className="text-xs font-medium text-zinc-700 mb-3">
                    Or route entire receipt equally ({getAssignmentLabel(selected.assignedTarget)}):
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
                          <span>Equal Split in {grp.name}</span>
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
