'use client';

import { AppPage } from '@/types/clearspend';

interface FooterProps {
  onOpenWorkspace: (page: AppPage) => void;
}

export function Footer({ onOpenWorkspace }: FooterProps) {
  return (
    <footer className="py-12 bg-[#FAFAFA]">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="font-display text-lg font-bold tracking-tight text-zinc-900">
            Clearspend
          </span>
          <p className="mt-1 text-xs text-zinc-500">
            © 2026 Clearspend Financial Inc. All rights reserved.
          </p>
        </div>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap items-center gap-6 text-xs font-medium text-zinc-600"
        >
          <button
            type="button"
            onClick={() => onOpenWorkspace('overview')}
            className="hover:text-zinc-950 transition-colors cursor-pointer"
          >
            Overview & Ledger
          </button>
          <button
            type="button"
            onClick={() => onOpenWorkspace('splits')}
            className="hover:text-zinc-950 transition-colors cursor-pointer"
          >
            Groups & Splits
          </button>
          <button
            type="button"
            onClick={() => onOpenWorkspace('automations')}
            className="hover:text-zinc-950 transition-colors cursor-pointer"
          >
            Agentic Inbox
          </button>
          <button
            type="button"
            onClick={() => onOpenWorkspace('analytics')}
            className="hover:text-zinc-950 transition-colors cursor-pointer"
          >
            Analytics
          </button>
          <button
            type="button"
            onClick={() => onOpenWorkspace('receipts')}
            className="hover:text-zinc-950 transition-colors cursor-pointer"
          >
            Receipts
          </button>
        </nav>
      </div>
    </footer>
  );
}
