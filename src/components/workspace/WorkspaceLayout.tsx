'use client';

import { ReactNode, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  BarChart3,
  ReceiptText,
  ArrowLeft,
  Menu,
  X,
  Plus,
  LogIn,
  LogOut,
  Cloud,
} from 'lucide-react';
import { AppPage } from '@/types/clearspend';
import { useClearspend } from '@/context/ClearspendProvider';

interface WorkspaceLayoutProps {
  activePage: AppPage;
  onNavigatePage: (page: AppPage) => void;
  onExitToLanding: () => void;
  onQuickNewExpense: () => void;
  onOpenAgentChat: () => void;
  pendingAgentCount: number;
  children: ReactNode;
}

const NAV_ITEMS: { id: AppPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview & Ledger', icon: LayoutDashboard },
  { id: 'splits', label: 'Groups & Splits', icon: Users },
  { id: 'automations', label: 'Agentic Inbox', icon: Sparkles },
  { id: 'analytics', label: 'Analytics & Runway', icon: BarChart3 },
  { id: 'receipts', label: 'Receipts & Scan', icon: ReceiptText },
];

const PAGE_TITLES: Record<AppPage, string> = {
  overview: 'Overview & Ledger',
  splits: 'Groups & Splits',
  automations: 'Agentic Inbox & Rules',
  analytics: 'Analytics & Runway',
  receipts: 'Receipts & Scan Vault',
};

export function WorkspaceLayout({
  activePage,
  onNavigatePage,
  onExitToLanding,
  onQuickNewExpense,
  onOpenAgentChat,
  pendingAgentCount,
  children,
}: WorkspaceLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user, authReady, isCloudSynced, signIn, signOut } = useClearspend();
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  async function handleSignIn() {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await signIn();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await signOut();
    } finally {
      setAuthBusy(false);
    }
  }

  const displayName = user?.displayName || 'Alex Rivera';
  const syncLabel = !authReady
    ? 'Checking session...'
    : isCloudSynced
    ? 'Firestore Cloud Sync'
    : 'Demo Mode · Local';

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 flex">
      {/* Desktop Sidebar (248px) */}
      <aside className="hidden lg:flex lg:w-[248px] lg:shrink-0 lg:flex-col border-r border-zinc-200 bg-white sticky top-0 h-screen">
        <div className="h-16 px-6 flex items-center border-b border-zinc-200">
          <button
            type="button"
            onClick={onExitToLanding}
            className="font-display text-xl font-bold tracking-tight text-zinc-950 whitespace-nowrap cursor-pointer hover:text-emerald-800 transition-colors"
          >
            Clearspend
          </button>
        </div>

        <nav
          aria-label="Workspace navigation"
          className="flex-1 px-3 py-5 space-y-1 overflow-y-auto"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigatePage(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'automations' && pendingAgentCount > 0 && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      isActive ? 'text-emerald-300' : 'text-emerald-800 font-semibold'
                    }`}
                  >
                    {pendingAgentCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-200 space-y-3">
          <div className="px-2 py-1 space-y-1">
            <p className="text-xs font-medium text-zinc-950 truncate">{displayName}</p>
            <p
              className={`text-xs flex items-center gap-1.5 truncate ${
                isCloudSynced ? 'text-emerald-800 font-medium' : 'text-zinc-500'
              }`}
            >
              <Cloud className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{syncLabel}</span>
            </p>
          </div>

          {authError && (
            <p role="alert" className="px-2 text-[11px] text-red-700">
              {authError}
            </p>
          )}

          {isCloudSynced ? (
            <button
              type="button"
              disabled={authBusy}
              onClick={() => void handleSignOut()}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={authBusy}
              onClick={() => void handleSignIn()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{authBusy ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExitToLanding}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Landing Page</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-zinc-950/30"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-white h-full border-r border-zinc-200 flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-zinc-200">
              <span className="font-display text-lg font-bold text-zinc-950">
                Clearspend
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileSidebarOpen(false)}
                className="p-2 text-zinc-600 hover:text-zinc-950 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigatePage(item.id);
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </span>
                    {item.id === 'automations' && pendingAgentCount > 0 && (
                      <span className="font-mono text-xs tabular-nums">
                        {pendingAgentCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-zinc-200 space-y-2.5">
              <div className="px-1 text-xs text-zinc-600">
                <p className="font-medium text-zinc-950 truncate">{displayName}</p>
                <p className={isCloudSynced ? 'text-emerald-800' : 'text-zinc-500'}>
                  {syncLabel}
                </p>
              </div>
              {isCloudSynced ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileSidebarOpen(false);
                    void handleSignOut();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 bg-zinc-100 rounded-lg cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileSidebarOpen(false);
                    void handleSignIn();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-zinc-900 rounded-lg cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign in with Google</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileSidebarOpen(false);
                  onExitToLanding();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Back to Landing Page</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-zinc-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open workspace navigation"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-zinc-400 hidden sm:inline">Clearspend</span>
              <span className="text-zinc-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-display font-semibold text-zinc-950 truncate">
                {PAGE_TITLES[activePage]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenAgentChat}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-zinc-800 bg-white border border-zinc-200 hover:border-zinc-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>Ask Agent</span>
            </button>
            <button
              type="button"
              onClick={onQuickNewExpense}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Log or Split</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1200px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
