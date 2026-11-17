'use client';

import { useState, useRef, FormEvent, ChangeEvent, DragEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  Search,
  Trash2,
  CheckCircle2,
  Mic,
  Square,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import {
  AppPage,
  ExpenseCategory,
  GroupMember,
  LedgerTransaction,
  RecurringGroupBill,
  SplitGroup,
} from '@/types/clearspend';
import { ParsedAgentIntent, parseAgenticCommand } from '@/utils/splitMath';
import { SAMPLE_BANK_CSV } from '@/data/initialWorkspaceData';

interface OverviewPageProps {
  transactions: LedgerTransaction[];
  members: GroupMember[];
  groups: SplitGroup[];
  recurringBills: RecurringGroupBill[];
  checkingBuffer: number;
  netYouAreOwed: number;
  netYouOwe: number;
  pendingAgentCount: number;
  onExecuteAgentIntent: (intent: ParsedAgentIntent) => void;
  onAddPersonalTransaction: (tx: Omit<LedgerTransaction, 'id'>) => void;
  onImportCsvTransactions: (rows: Omit<LedgerTransaction, 'id'>[]) => void;
  onDeleteTransaction: (id: string) => void;
  onNavigatePage: (page: AppPage) => void;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const PROMPT_EXAMPLES = [
  'Split $128 dinner at Tartine with Maya and Liam',
  'Paid $94 ConEd electric bill for Apartment 4B',
  'Log $16.50 espresso and pastry under Dining',
];

const CATEGORIES: ('All' | ExpenseCategory)[] = [
  'All',
  'Groceries',
  'Dining',
  'Software',
  'Travel',
  'Utilities',
  'Housing',
];

function inferCsvCategory(merchant: string): ExpenseCategory {
  const lower = merchant.toLowerCase();
  if (lower.includes('trader') || lower.includes('whole foods') || lower.includes('market')) {
    return 'Groceries';
  }
  if (lower.includes('coned') || lower.includes('sonic') || lower.includes('utility')) {
    return 'Utilities';
  }
  if (lower.includes('uber') || lower.includes('lyft') || lower.includes('amtrak')) {
    return 'Travel';
  }
  if (lower.includes('figma') || lower.includes('aws') || lower.includes('notion')) {
    return 'Software';
  }
  return 'Dining';
}

function parseBankCsvText(csvText: string): Omit<LedgerTransaction, 'id'>[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const startIdx = lines[0].toLowerCase().includes('merchant') ? 1 : 0;
  const parsed: Omit<LedgerTransaction, 'id'>[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 3) continue;
    const rawDate = cols[0] || 'Nov 16';
    const merchant = cols[1] || 'Bank Transaction';
    const rawAmount = Math.abs(Number.parseFloat(cols[2].replace(/[^0-9.-]/g, '')));
    const card = cols[3] || 'Checking';

    if (Number.isNaN(rawAmount) || rawAmount <= 0) continue;

    const shortDate = rawDate.length >= 10 ? rawDate.slice(5) : rawDate;
    parsed.push({
      merchant,
      category: inferCsvCategory(merchant),
      date: shortDate,
      amount: Math.round(rawAmount * 100) / 100,
      note: `Autopilot CSV · ${card}`,
      source: 'CSV Import',
    });
  }
  return parsed;
}

export function OverviewPage({
  transactions,
  members,
  groups,
  recurringBills,
  checkingBuffer,
  netYouAreOwed,
  netYouOwe,
  pendingAgentCount,
  onExecuteAgentIntent,
  onAddPersonalTransaction,
  onImportCsvTransactions,
  onDeleteTransaction,
  onNavigatePage,
}: OverviewPageProps) {
  const [commandInput, setCommandInput] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ParsedAgentIntent | null>(null);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // CSV Import Autopilot state
  const [showCsvPanel, setShowCsvPanel] = useState(false);
  const [csvPreviewRows, setCsvPreviewRows] = useState<Omit<LedgerTransaction, 'id'>[]>([]);
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<'All' | ExpenseCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Manual Entry Row
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualMerchant, setManualMerchant] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualCategory, setManualCategory] = useState<ExpenseCategory>('Dining');
  const [manualError, setManualError] = useState<string | null>(null);

  const monthlySpend = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const monthlyBudget = 2400;
  const safeDailyRunway = Math.max((monthlyBudget - monthlySpend) / 14, 0);

  // Cash-flow collision calculations
  const activeRecurringTotal = recurringBills
    .filter((b) => b.active)
    .reduce((sum, b) => sum + b.amount, 0);
  const projectedBalanceAfterBills = checkingBuffer - activeRecurringTotal - netYouOwe;
  const hasCollisionRisk = projectedBalanceAfterBills < 150;

  const filteredTransactions = transactions.filter((tx) => {
    const matchesCat = categoryFilter === 'All' || tx.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      q === '' ||
      tx.merchant.toLowerCase().includes(q) ||
      tx.note.toLowerCase().includes(q) ||
      tx.source.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  function handleCommandChange(val: string) {
    setCommandInput(val);
    setCommandFeedback(null);
    setCommandError(null);
    const parsed = parseAgenticCommand(val, members, groups);
    setParsedPreview(parsed);
  }

  function handleRunCommand(e: FormEvent) {
    e.preventDefault();
    const parsed = parseAgenticCommand(commandInput, members, groups);
    if (!parsed) {
      setCommandError(
        'Include an amount and description, e.g. "Split $96 dinner with Maya and Liam".'
      );
      return;
    }
    onExecuteAgentIntent(parsed);
    setCommandFeedback(parsed.summary);
    setCommandInput('');
    setParsedPreview(null);
  }

  async function toggleVoiceCapture() {
    setCommandError(null);
    setCommandFeedback(null);

    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCommandError('Voice recording is not available in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size === 0) return;

        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          const base64: string = await new Promise((resolve, reject) => {
            reader.onloadend = () => {
              const resStr = String(reader.result ?? '');
              resolve(resStr.split(',')[1] ?? '');
            };
            reader.onerror = () => reject(new Error('Failed to read audio file.'));
            reader.readAsDataURL(blob);
          });

          const res = await fetch('/api/voice/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64, mimeType }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error || 'Voice transcription failed.');
          }
          const transcript = String(data.transcript ?? '').trim();
          if (transcript) {
            handleCommandChange(transcript);
          } else {
            setCommandError('No speech detected in audio clip.');
          }
        } catch (err: unknown) {
          setCommandError(
            err instanceof Error ? err.message : 'Unable to transcribe voice note.'
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setCommandError('Microphone permission was denied.');
    }
  }

  function handleCsvFile(file: File) {
    setCsvFeedback(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const rows = parseBankCsvText(text);
      setCsvPreviewRows(rows);
    };
    reader.readAsText(file);
  }

  function handleCsvFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleCsvFile(file);
  }

  function handleCsvDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleCsvFile(file);
  }

  function handleLoadSampleCsv() {
    setCsvFeedback(null);
    setCsvPreviewRows(parseBankCsvText(SAMPLE_BANK_CSV));
  }

  function handleConfirmCsvImport() {
    if (csvPreviewRows.length === 0) return;
    onImportCsvTransactions(csvPreviewRows);
    setCsvFeedback(`Imported ${csvPreviewRows.length} bank lines into your ledger.`);
    setCsvPreviewRows([]);
  }

  function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    const m = manualMerchant.trim();
    const amt = Number.parseFloat(manualAmount);
    if (!m) {
      setManualError('Enter a merchant name.');
      return;
    }
    if (Number.isNaN(amt) || amt <= 0) {
      setManualError('Enter a positive dollar amount.');
      return;
    }
    setManualError(null);
    onAddPersonalTransaction({
      merchant: m,
      amount: Math.round(amt * 100) / 100,
      category: manualCategory,
      date: 'Nov 17',
      note: 'Added manually',
      source: 'Manual',
    });
    setManualMerchant('');
    setManualAmount('');
    setShowManualForm(false);
  }

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-zinc-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-zinc-200">
        <div className="p-5">
          <p className="text-xs text-zinc-500">Monthly Net Spend</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-zinc-950 tabular-nums">
            ${monthlySpend.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-zinc-500 tabular-nums">
            Cap ${monthlyBudget.toLocaleString('en-US')}
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs text-zinc-500">Friends Owe You</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-emerald-800 tabular-nums">
            +${netYouAreOwed.toFixed(2)}
          </p>
          <button
            type="button"
            onClick={() => onNavigatePage('splits')}
            className="mt-1 text-xs font-medium text-zinc-600 hover:text-zinc-950 underline underline-offset-2 cursor-pointer"
          >
            View group balances
          </button>
        </div>

        <div className="p-5">
          <p className="text-xs text-zinc-500">You Owe Groups</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-zinc-950 tabular-nums">
            ${netYouOwe.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {netYouOwe === 0 ? 'All debts clear' : 'Ready to settle up'}
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs text-zinc-500">Safe Daily Runway</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-zinc-950 tabular-nums">
            ${safeDailyRunway.toFixed(2)}
            <span className="text-xs font-normal text-zinc-500"> / day</span>
          </p>
          <button
            type="button"
            onClick={() => onNavigatePage('automations')}
            className="mt-1 text-xs font-medium text-emerald-800 hover:underline underline-offset-2 cursor-pointer"
          >
            {pendingAgentCount} agentic alerts pending
          </button>
        </div>
      </div>

      {/* Cash-Flow Collision Radar */}
      <section
        className={`rounded-xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          hasCollisionRisk
            ? 'bg-amber-50/70 border-amber-300'
            : 'bg-white border-zinc-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            className={`w-5 h-5 mt-0.5 shrink-0 ${
              hasCollisionRisk ? 'text-amber-700' : 'text-emerald-700'
            }`}
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-semibold text-zinc-950">
              {hasCollisionRisk
                ? 'Cash-Flow Collision Alert: Upcoming Recurring Bills vs Checking Buffer'
                : 'Cash-Flow Radar: Checking Buffer Clear'}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
              Checking buffer{' '}
              <span className="font-mono font-semibold text-zinc-900 tabular-nums">
                ${checkingBuffer.toFixed(2)}
              </span>{' '}
              minus{' '}
              <span className="font-mono font-semibold text-zinc-900 tabular-nums">
                ${activeRecurringTotal.toFixed(2)}
              </span>{' '}
              upcoming recurring bills leaves{' '}
              <span
                className={`font-mono font-semibold tabular-nums ${
                  projectedBalanceAfterBills < 0 ? 'text-red-700' : 'text-zinc-950'
                }`}
              >
                ${projectedBalanceAfterBills.toFixed(2)}
              </span>
              . Collecting{' '}
              <span className="font-mono font-semibold text-emerald-800 tabular-nums">
                +${netYouAreOwed.toFixed(2)}
              </span>{' '}
              owed by friends keeps your account positive.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigatePage('splits')}
            className="px-3.5 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            Request Settlements
          </button>
          <button
            type="button"
            onClick={() => onNavigatePage('analytics')}
            className="px-3.5 py-2 text-xs font-medium text-zinc-800 bg-white border border-zinc-200 hover:border-zinc-400 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            Open What-If Simulator
          </button>
        </div>
      </section>

      {/* Agentic Natural-Language + Voice Command Bar */}
      <section className="bg-white border border-zinc-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-zinc-950">
              Agentic Voice & Command Capture
            </h2>
          </div>
          <span className="text-xs text-zinc-500">
            Speak or type in plain English to log charges or split group tabs
          </span>
        </div>

        <form onSubmit={handleRunCommand} noValidate className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <label htmlFor="agent-command-input" className="sr-only">
              Describe an expense or split
            </label>
            <input
              id="agent-command-input"
              type="text"
              value={commandInput}
              onChange={(e) => handleCommandChange(e.target.value)}
              disabled={isTranscribing}
              placeholder={
                isRecording
                  ? 'Listening to voice note... click Stop when finished'
                  : 'Try: "Split $128 dinner at Tartine with Maya and Liam"'
              }
              className="flex-1 h-11 px-4 text-sm bg-[#FAFAFA] border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-700 disabled:opacity-60"
            />

            <button
              type="button"
              onClick={() => void toggleVoiceCapture()}
              disabled={isTranscribing}
              className={`h-11 inline-flex items-center justify-center gap-2 px-4 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 ${
                isRecording
                  ? 'bg-red-700 border-red-700 text-white'
                  : 'bg-white border-zinc-200 text-zinc-800 hover:border-zinc-400'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Stop Mic</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  <span>{isTranscribing ? 'Transcribing...' : 'Voice Log'}</span>
                </>
              )}
            </button>

            <button
              type="submit"
              className="h-11 inline-flex items-center justify-center gap-2 px-5 text-sm font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Execute</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <AnimatePresence>
            {parsedPreview && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                className="px-4 py-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <span className="font-medium text-emerald-950">
                  Parsed Plan: {parsedPreview.summary}
                </span>
                <span className="font-mono text-emerald-800">
                  Category: {parsedPreview.category}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {commandError && (
            <p role="alert" className="text-xs font-medium text-red-700">
              {commandError}
            </p>
          )}

          {commandFeedback && (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Executed: {commandFeedback}</span>
            </div>
          )}
        </form>

        <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500 mr-1">Try prompt:</span>
          {PROMPT_EXAMPLES.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleCommandChange(prompt)}
              className="px-3 py-1.5 text-xs text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors cursor-pointer text-left"
            >
              {prompt}
            </button>
          ))}
        </div>
      </section>

      {/* High-Density Ledger Table + Bank CSV Import Autopilot */}
      <section className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-100 rounded-lg">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-white text-zinc-950 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-52">
              <Search
                className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <label htmlFor="ledger-search" className="sr-only">
                Search ledger
              </label>
              <input
                id="ledger-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search merchant or source..."
                className="w-full h-9 pl-8 pr-3 text-xs bg-[#FAFAFA] border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-700"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setShowCsvPanel((p) => !p);
                setShowManualForm(false);
              }}
              className="h-9 inline-flex items-center gap-1.5 px-3.5 text-xs font-medium text-zinc-800 bg-white border border-zinc-200 hover:border-zinc-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showCsvPanel ? 'Close CSV' : 'Import Bank CSV'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowManualForm((prev) => !prev);
                setShowCsvPanel(false);
              }}
              className="h-9 px-3.5 text-xs font-medium text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {showManualForm ? 'Close' : 'Manual Entry'}
            </button>
          </div>
        </div>

        {/* Drag-and-Drop Bank CSV Import Autopilot */}
        {showCsvPanel && (
          <div className="p-6 bg-[#FAFAFA] border-b border-zinc-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-semibold text-zinc-950">
                  Bank CSV Import Autopilot
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Drop a Chase, Amex, or checking statement CSV (Date, Merchant, Amount, Card) for instant auto-categorization
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadSampleCsv}
                className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg cursor-pointer"
              >
                Load Sample Checking CSV
              </button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleCsvDrop}
              className={`border border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver
                  ? 'border-emerald-700 bg-emerald-50/40'
                  : 'border-zinc-300 bg-white'
              }`}
            >
              <p className="text-xs text-zinc-600 mb-2">
                Drag and drop a .csv file here, or select from your computer
              </p>
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg cursor-pointer">
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Choose CSV File</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileInput}
                  className="sr-only"
                />
              </label>
            </div>

            {csvFeedback && (
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{csvFeedback}</span>
              </div>
            )}

            {csvPreviewRows.length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-zinc-700">
                    Ready to import {csvPreviewRows.length} transactions
                  </span>
                  <button
                    type="button"
                    onClick={handleConfirmCsvImport}
                    className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg cursor-pointer"
                  >
                    Import All to Ledger
                  </button>
                </div>
                <ul className="divide-y divide-zinc-100 text-xs">
                  {csvPreviewRows.map((row, idx) => (
                    <li
                      key={`${row.merchant}-${idx}`}
                      className="px-4 py-2.5 flex items-center justify-between gap-3"
                    >
                      <span className="text-zinc-900 font-medium truncate">
                        {row.merchant} ·{' '}
                        <span className="font-normal text-zinc-500">{row.category}</span>
                      </span>
                      <span className="font-mono font-semibold text-zinc-950 tabular-nums shrink-0">
                        ${row.amount.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Optional Manual Entry Drawer */}
        {showManualForm && (
          <form
            onSubmit={handleManualSubmit}
            noValidate
            className="p-5 bg-[#FAFAFA] border-b border-zinc-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-5">
              <label htmlFor="manual-merchant" className="block text-xs text-zinc-600 mb-1">
                Merchant
              </label>
              <input
                id="manual-merchant"
                type="text"
                value={manualMerchant}
                onChange={(e) => setManualMerchant(e.target.value)}
                placeholder="e.g. Sweetgreen"
                className="w-full h-9 px-3 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700"
              />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="manual-amount" className="block text-xs text-zinc-600 mb-1">
                Amount ($)
              </label>
              <input
                id="manual-amount"
                type="number"
                step="0.01"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="18.40"
                className="w-full h-9 px-3 text-sm font-mono bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700 tabular-nums"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="manual-category" className="block text-xs text-zinc-600 mb-1">
                Category
              </label>
              <select
                id="manual-category"
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value as ExpenseCategory)}
                className="w-full h-9 px-2.5 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-emerald-700"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full h-9 px-4 text-xs font-medium text-white bg-zinc-900 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
              >
                Save Entry
              </button>
            </div>
            {manualError && (
              <p role="alert" className="sm:col-span-12 text-xs text-red-700 font-medium">
                {manualError}
              </p>
            )}
          </form>
        )}

        {/* Table Header & Rows */}
        {filteredTransactions.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-sm font-medium text-zinc-900">
              No transactions match your current filter
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Clear the search query or use the Agentic Command Bar above to log an expense.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-[#FAFAFA] text-xs font-medium text-zinc-500">
                  <th className="py-2.5 px-5 font-medium">Merchant & Note</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium">Source</th>
                  <th className="py-2.5 px-4 font-medium">Date</th>
                  <th className="py-2.5 px-5 font-medium text-right">Amount</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                <AnimatePresence initial={false}>
                  {filteredTransactions.map((tx) => (
                    <motion.tr
                      key={tx.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="hover:bg-zinc-50/90 transition-colors"
                    >
                      <td className="py-2.5 px-5">
                        <p className="font-medium text-zinc-950">{tx.merchant}</p>
                        <p className="text-xs text-zinc-500">{tx.note}</p>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-zinc-600 whitespace-nowrap">
                        {tx.category}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-zinc-500 whitespace-nowrap">
                        {tx.source}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-zinc-500 tabular-nums whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-2.5 px-5 font-mono font-medium text-zinc-950 text-right tabular-nums whitespace-nowrap">
                        ${tx.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          aria-label={`Delete ${tx.merchant}`}
                          onClick={() => onDeleteTransaction(tx.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-700 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
