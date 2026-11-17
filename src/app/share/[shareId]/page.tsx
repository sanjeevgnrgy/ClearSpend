'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowRight, ExternalLink, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { PublicShareSnapshot } from '@/types/clearspend';

export default function PublicSharePage() {
  const params = useParams<{ shareId: string }>();
  const shareId = params?.shareId ?? '';

  const [snapshot, setSnapshot] = useState<Omit<PublicShareSnapshot, 'ownerId' | 'groupId'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadShare() {
      if (!shareId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Check sessionStorage first for demo-mode share links
      if (typeof window !== 'undefined') {
        const localRaw = window.sessionStorage.getItem(`clearspend_share_${shareId}`);
        if (localRaw) {
          try {
            const parsed = JSON.parse(localRaw);
            if (!cancelled) {
              setSnapshot(parsed);
              setLoading(false);
              return;
            }
          } catch {
            // Fall through to Firestore
          }
        }
      }

      try {
        const docSnap = await getDoc(doc(db, 'publicShares', shareId));
        if (!cancelled) {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setSnapshot({
              groupName: String(data.groupName ?? 'Shared Group'),
              description: String(data.description ?? ''),
              currency: String(data.currency ?? 'USD'),
              totalGroupSpend: Number(data.totalGroupSpend ?? 0),
              transfers: Array.isArray(data.transfers) ? data.transfers : [],
              expenses: Array.isArray(data.expenses) ? data.expenses : [],
            });
          } else {
            setNotFound(true);
          }
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadShare();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-sm text-zinc-500">
        Loading shared settlement summary...
      </div>
    );
  }

  if (notFound || !snapshot) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-zinc-200 rounded-xl p-8 text-center space-y-4">
          <h1 className="font-display text-xl font-bold text-zinc-950">
            Settlement link unavailable
          </h1>
          <p className="text-sm text-zinc-600">
            This share link has expired or has not been published yet. Ask your group organizer to click “Share Settlement Link” inside Clearspend.
          </p>
          <Link
            href="/workspace?tab=splits"
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg"
          >
            Go to Clearspend Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-tight text-zinc-950"
          >
            Clearspend
          </Link>
          <span className="text-xs text-zinc-500">
            No-login settlement view · Read only
          </span>
        </header>

        <section className="bg-white border border-zinc-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="pb-5 border-b border-zinc-100 flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-zinc-950">
                {snapshot.groupName}
              </h1>
              <p className="text-sm text-zinc-500 mt-1">{snapshot.description}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Total Group Spend</p>
              <p className="font-mono text-2xl font-semibold text-zinc-950 tabular-nums">
                ${snapshot.totalGroupSpend.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Simplified Transfers + Direct Payment Deep Links */}
          <div className="space-y-3">
            <h2 className="font-display text-base font-semibold text-zinc-950">
              Simplified Settlement Transfers
            </h2>
            {snapshot.transfers.length === 0 ? (
              <div className="py-6 text-center bg-[#FAFAFA] border border-zinc-200 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-emerald-700 mx-auto mb-1.5" />
                <p className="text-sm font-medium text-zinc-900">
                  Everyone in {snapshot.groupName} is settled up
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg bg-[#FAFAFA]">
                {snapshot.transfers.map((tr, idx) => {
                  const note = encodeURIComponent(
                    `Clearspend: ${snapshot.groupName} settlement`
                  );
                  const amt = tr.amount.toFixed(2);
                  return (
                    <div
                      key={`${tr.from}-${tr.to}-${idx}`}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-950 flex items-center gap-1.5">
                          <span>{tr.from}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                          <span>{tr.to}</span>
                        </p>
                        <p className="font-mono text-sm font-semibold text-emerald-800 tabular-nums">
                          ${amt}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <a
                          href={`https://venmo.com/?txn=pay&amount=${amt}&note=${note}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-zinc-800 bg-white border border-zinc-200 hover:border-zinc-400 rounded-md"
                        >
                          <span>Venmo</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                        <a
                          href={`https://www.paypal.com/paypalme/`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-zinc-800 bg-white border border-zinc-200 hover:border-zinc-400 rounded-md"
                        >
                          <span>PayPal</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                        <a
                          href={`https://cash.app/`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 font-medium text-zinc-800 bg-white border border-zinc-200 hover:border-zinc-400 rounded-md"
                        >
                          <span>Cash App</span>
                          <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Itemized Shared Expenses */}
          <div className="space-y-3">
            <h2 className="font-display text-base font-semibold text-zinc-950">
              Included Expenses ({snapshot.expenses.length})
            </h2>
            <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg">
              {snapshot.expenses.map((exp, idx) => (
                <li
                  key={`${exp.title}-${idx}`}
                  className="px-4 py-3 flex items-center justify-between gap-4 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 truncate">{exp.title}</p>
                    <p className="text-xs text-zinc-500">
                      Paid by {exp.paidBy} · {exp.date}
                    </p>
                  </div>
                  <span className="font-mono font-medium text-zinc-950 tabular-nums shrink-0">
                    ${exp.amount.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
