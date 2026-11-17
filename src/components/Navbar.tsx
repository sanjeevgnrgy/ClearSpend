'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AppPage } from '@/types/clearspend';
import { useClearspend } from '@/context/ClearspendProvider';

interface NavbarProps {
  onOpenWorkspace: (page?: AppPage) => void;
}

export function Navbar({ onOpenWorkspace }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isCloudSynced, user, signIn } = useClearspend();

  const navItems = [
    { label: 'Features', href: '#features' },
    { label: 'Group Splits', href: '#live-demo' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Security', href: '#security' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAFAFA]/90 backdrop-blur-md border-b border-zinc-200/80">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        <a
          href="#"
          className="font-display text-xl font-bold tracking-tight text-zinc-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 rounded-sm"
        >
          Clearspend
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600"
        >
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-zinc-950 transition-colors duration-150 whitespace-nowrap shrink-0 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 rounded-sm"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {!isCloudSynced ? (
            <button
              type="button"
              onClick={() => void signIn()}
              className="hidden sm:inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign in
            </button>
          ) : (
            <span className="hidden sm:inline-block text-xs font-medium text-emerald-800 whitespace-nowrap">
              {user?.displayName?.split(' ')[0] ?? 'Synced'}
            </span>
          )}

          <button
            type="button"
            onClick={() => onOpenWorkspace('overview')}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Open Workspace
          </button>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-700"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 bg-white px-6 py-4 space-y-3">
          <nav className="flex flex-col space-y-2" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-sm font-medium text-zinc-700 hover:text-zinc-950 whitespace-nowrap"
              >
                {item.label}
              </a>
            ))}
          </nav>
          {!isCloudSynced && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                void signIn();
              }}
              className="w-full py-2.5 px-4 text-sm font-medium text-zinc-900 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-lg transition-colors cursor-pointer"
            >
              Sign in with Google
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenWorkspace('overview');
            }}
            className="w-full py-2.5 px-4 text-sm font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
          >
            Open Workspace
          </button>
        </div>
      )}
    </header>
  );
}
