'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, RotateCcw, Check, Mic, Square } from 'lucide-react';

export interface AgentToolCall {
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
}

export interface ExecutedActionLog {
  toolName: string;
  summary: string;
  success: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actions?: ExecutedActionLog[];
  isError?: boolean;
}

interface GeminiPart {
  text?: string;
  functionCall?: {
    id?: string;
    name?: string;
    args?: Record<string, unknown>;
  };
  functionResponse?: {
    id?: string;
    name: string;
    response: Record<string, unknown>;
  };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface AgentChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceSnapshot: Record<string, unknown>;
  onExecuteToolCall: (call: AgentToolCall) => {
    success: boolean;
    summary: string;
    resultData?: Record<string, unknown>;
  };
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const QUICK_PROMPTS = [
  'Split $148 dinner at Tartine with Maya and Liam',
  'How much do friends owe me across all groups?',
  'Settle Liam debt in Lisbon Trip',
  'Pause my Notion Workspace subscription',
  'Create a rule to split Whole Foods 50/50 in Apartment 4B',
  'Assign the Daily Grind receipt to Personal Ledger',
];

const INITIAL_WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'I am your Clearspend Agent. I can log or delete expenses, split bills (equal, exact, %, or shares), simplify and settle group debts, manage automation rules, pause subscriptions, route receipts, and navigate across pages.',
};

export function AgentChatDrawer({
  isOpen,
  onClose,
  workspaceSnapshot,
  onExecuteToolCall,
}: AgentChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME]);
  const [geminiHistory, setGeminiHistory] = useState<GeminiContent[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const scrollEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  function handleResetChat() {
    setMessages([INITIAL_WELCOME]);
    setGeminiHistory([]);
    setInput('');
    setVoiceError(null);
  }

  async function toggleVoiceRecording() {
    setVoiceError(null);
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError('Microphone recording is not supported in this browser.');
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
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size === 0) return;

        setIsTranscribing(true);
        try {
          const reader = new FileReader();
          const base64: string = await new Promise((resolve, reject) => {
            reader.onloadend = () => {
              const result = String(reader.result ?? '');
              resolve(result.split(',')[1] ?? '');
            };
            reader.onerror = () => reject(new Error('Failed to read audio.'));
            reader.readAsDataURL(audioBlob);
          });

          const res = await fetch('/api/voice/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64, mimeType }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error || 'Transcription failed.');
          }
          const transcript = String(data.transcript ?? '').trim();
          if (transcript) {
            void sendMessage(transcript);
          } else {
            setVoiceError('No speech detected. Try speaking closer to the mic.');
          }
        } catch (err: unknown) {
          setVoiceError(
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
      setVoiceError('Microphone access was denied.');
    }
  }

  async function sendMessage(textToSend: string) {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const turnUserContent: GeminiContent = {
      role: 'user',
      parts: [{ text: trimmed }],
    };
    let workingHistory: GeminiContent[] = [...geminiHistory, turnUserContent];

    try {
      const res1 = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: workingHistory,
          workspaceSnapshot,
        }),
      });

      const data1 = await res1.json();
      if (!res1.ok) {
        throw new Error(data1?.error || `Server responded with ${res1.status}`);
      }

      const functionCalls: AgentToolCall[] = data1.functionCalls ?? [];
      const candidateContent: GeminiContent | null = data1.candidateContent ?? null;

      if (candidateContent) {
        workingHistory = [...workingHistory, candidateContent];
      }

      if (functionCalls.length > 0) {
        const executedLogs: ExecutedActionLog[] = [];
        const responseParts: GeminiPart[] = [];

        for (const call of functionCalls) {
          const execution = onExecuteToolCall(call);
          executedLogs.push({
            toolName: call.name ?? 'action',
            summary: execution.summary,
            success: execution.success,
          });
          responseParts.push({
            functionResponse: {
              id: call.id,
              name: call.name ?? 'unknown',
              response: {
                success: execution.success,
                summary: execution.summary,
                ...(execution.resultData ?? {}),
              },
            },
          });
        }

        const toolResponseContent: GeminiContent = {
          role: 'user',
          parts: responseParts,
        };
        workingHistory = [...workingHistory, toolResponseContent];

        // Follow-up turn so Gemini gives a natural summary grounded in tool outputs
        const res2 = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: workingHistory,
            workspaceSnapshot,
          }),
        });

        const data2 = await res2.json();
        if (!res2.ok) {
          throw new Error(data2?.error || 'Failed to finalize agent response.');
        }

        if (data2.candidateContent) {
          workingHistory = [...workingHistory, data2.candidateContent];
        }

        const finalText =
          (data2.replyText && data2.replyText.trim()) ||
          executedLogs.map((l) => l.summary).join(' ');

        setGeminiHistory(workingHistory);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: finalText,
            actions: executedLogs,
          },
        ]);
      } else {
        setGeminiHistory(workingHistory);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text:
              (data1.replyText && data1.replyText.trim()) ||
              'Done.',
          },
        ]);
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : 'Unable to reach Clearspend Agent.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: errMsg,
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/25 backdrop-blur-[1px]"
          />

          {/* Slide-over Drawer */}
          <motion.aside
            role="dialog"
            aria-label="Clearspend Agentic Chatbot"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
            className="relative z-10 w-full max-w-[440px] h-full bg-white border-l border-zinc-200 flex flex-col shadow-xl"
          >
            {/* Header */}
            <div className="h-16 px-5 border-b border-zinc-200 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <h2 className="font-display text-base font-semibold text-zinc-950 truncate">
                    Clearspend Agent
                  </h2>
                  <p className="text-[11px] text-zinc-500 truncate">
                    Full ledger, splits, rules & analytics control
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleResetChat}
                  aria-label="Reset conversation"
                  className="p-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close agent chat"
                  className="p-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-[#FAFAFA]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-zinc-900 text-white'
                        : msg.isError
                        ? 'bg-red-50 border border-red-200 text-red-900'
                        : 'bg-white border border-zinc-200 text-zinc-800'
                    }`}
                  >
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mb-2.5 pb-2.5 border-b border-zinc-100 space-y-1.5">
                        {msg.actions.map((act, idx) => (
                          <div
                            key={`${msg.id}-act-${idx}`}
                            className="flex items-start gap-2 text-xs font-mono text-emerald-800"
                          >
                            <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                            <span>{act.summary}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-start">
                  <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-xs font-mono text-zinc-500">
                    Executing agent workflow...
                  </div>
                </div>
              )}

              {/* Quick Suggestions when conversation is short */}
              {messages.length <= 2 && !isLoading && (
                <div className="pt-2 space-y-2">
                  <p className="text-xs font-medium text-zinc-500">
                    Try asking the agent to:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendMessage(prompt)}
                        className="text-left px-3 py-1.5 text-xs text-zinc-700 bg-white border border-zinc-200 hover:border-zinc-400 hover:text-zinc-950 rounded-lg transition-colors cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={scrollEndRef} />
            </div>

            {/* Composer */}
            <div className="bg-white border-t border-zinc-200 shrink-0">
              {voiceError && (
                <p role="alert" className="px-4 pt-2 text-xs font-medium text-red-700">
                  {voiceError}
                </p>
              )}
              {isTranscribing && (
                <p className="px-4 pt-2 text-xs font-mono text-emerald-800">
                  Transcribing voice command via Gemini...
                </p>
              )}
              <form
                onSubmit={handleFormSubmit}
                className="p-4 flex items-center gap-2"
              >
                <label htmlFor="agent-drawer-input" className="sr-only">
                  Ask Clearspend Agent
                </label>
                <input
                  ref={inputRef}
                  id="agent-drawer-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading || isTranscribing}
                  placeholder={
                    isRecording
                      ? 'Listening... click stop when done'
                      : 'Split a bill, log spend, or ask a question...'
                  }
                  className="flex-1 h-11 px-3.5 text-sm bg-[#FAFAFA] border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-700 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => void toggleVoiceRecording()}
                  disabled={isLoading || isTranscribing}
                  aria-label={isRecording ? 'Stop voice recording' : 'Record voice command'}
                  title={isRecording ? 'Stop recording' : 'Speak command'}
                  className={`h-11 w-11 inline-flex items-center justify-center rounded-lg border transition-colors shrink-0 cursor-pointer disabled:opacity-40 ${
                    isRecording
                      ? 'bg-red-700 border-red-700 text-white'
                      : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:text-zinc-950'
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Mic className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="submit"
                  disabled={isLoading || isTranscribing || input.trim().length === 0}
                  aria-label="Send message"
                  className="h-11 w-11 inline-flex items-center justify-center bg-zinc-900 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-lg transition-colors shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                </button>
              </form>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
