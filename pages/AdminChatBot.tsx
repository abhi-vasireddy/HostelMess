/**
 * AdminChatBot — Premium AI assistant with glass-morphism UI
 *
 * Features:
 * - Glass-morphism header and input areas
 * - Gradient message bubbles with timeline connector
 * - Animated typing indicator with floating dots
 * - Rich markdown with polished table rendering
 * - Suggestion chips with icons
 * - Copy-to-clipboard on hover
 * - Smooth entrance animations
 * - Dark/light mode aware
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Bot,
  Loader2,
  Sparkles,
  Trash2,
  Check,
  Copy,
  MessageSquare,
  Lightbulb,
  Users,
  BarChart3,
  Star,
  TrendingUp,
  AlertTriangle,
  CalendarRange,
} from 'lucide-react';
import type { ChatMessage } from '../services/adminAiService';
import { processQuery } from '../services/adminAiService';
import AIChatCharts from '../components/AIChatCharts';

// ─── Suggestion chips with icons ─────────────────────────────────────────────

interface Suggestion {
  label: string;
  icon: React.ReactNode;
}

const SUGGESTIONS: Suggestion[] = [
  { label: 'How many users?', icon: <Users size={13} /> },
  { label: "Today's average rating", icon: <Star size={13} /> },
  { label: 'Highest rated meal', icon: <BarChart3 size={13} /> },
  { label: 'Top 5 dishes', icon: <TrendingUp size={13} /> },
  { label: 'Dishes to improve', icon: <AlertTriangle size={13} /> },
  { label: 'Common complaints', icon: <MessageSquare size={13} /> },
  { label: 'Week comparison', icon: <CalendarRange size={13} /> },
  { label: "Today's summary", icon: <Sparkles size={13} /> },
];

// ─── Rich Markdown Renderer ─────────────────────────────────────────────────

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-slate-200/70 dark:bg-slate-700/70 px-1.5 py-0.5 rounded text-xs font-mono text-orange-600 dark:text-orange-400">$1</code>'
    )
    .replace(
      /^[•\-]\s+(.*)$/gm,
      '<li class="flex items-start gap-2 py-0.5"><span class="text-orange-500 mt-1 shrink-0">•</span><span>$1</span></li>'
    )
    .replace(/[█░]+/g, (match) => `<span class="text-sm tracking-widest font-mono">${match}</span>`)
    .replace(
      /^\|(.+)\|$/gm,
      (row) => {
        const cells = row.split('|').filter((c) => c.trim());
        const isHeader = row.includes('---');
        if (isHeader) return '';
        const tag = row.startsWith('|---') || row.startsWith('| -') ? 'th' : 'td';
        const cellHtml = cells
          .map(
            (c) =>
              `<${tag} class="px-3 py-2 text-sm border-b border-slate-200/50 dark:border-slate-700/50">${c.trim()}</${tag}>`
          )
          .join('');
        return tag === 'th'
          ? `<thead><tr class="bg-slate-100/50 dark:bg-slate-800/50">${cellHtml}</tr></thead>`
          : `<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">${cellHtml}</tr>`;
      }
    )
    .replace(
      /(<thead>.*?<\/thead>)?(<tr>.*?<\/tr>)+/gs,
      (match) => {
        // Strip newlines inside table markup so step 11 doesn't inject <br /> into the table
        const clean = match.replace(/\n/g, '');
        if (clean.includes('<thead>'))
          return `<table class="w-full border-collapse my-2 rounded-xl overflow-hidden shadow-sm">${clean}</table>`;
        return `<table class="w-full border-collapse my-2 rounded-xl overflow-hidden shadow-sm"><tbody>${clean}</tbody></table>`;
      }
    )
    .replace(/\n/g, '<br />');
  return html;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdminChatBotProps {
  externalHistory?: ChatMessage[];
  onHistoryChange?: (history: ChatMessage[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'admin-ai-chat-history';
const MAX_SAVED_MSGS = 100;

function loadSavedMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [{ role: 'assistant' as const, text: "👋 **How Can I help you**" }];
}

const AdminChatBot: React.FC<AdminChatBotProps> = ({ externalHistory, onHistoryChange }) => {
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>(() =>
    externalHistory
      ? [{ role: 'assistant', text: "👋 **How Can I help you**" }]
      : loadSavedMessages()
  );

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const messages = externalHistory || internalMessages;
  const setMessages = onHistoryChange || setInternalMessages;

  // ── Persist chat to localStorage (debounced, strip charts) ──
  useEffect(() => {
    if (externalHistory) return; // parent manages state, skip save
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        // Strip chart data and limit to keep storage tiny
        const lean = messages
          .slice(-MAX_SAVED_MSGS)
          .map(({ role, text }) => ({ role, text } as ChatMessage));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lean));
      } catch {
        // localStorage full or unavailable — silently skip
      }
    }, 400);
  }, [messages, externalHistory]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const autoResize = useCallback(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, []);

  useEffect(() => {
    autoResize();
  }, [input, autoResize]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ─── Send ──────────────────────────────────────────────────────────────────

  const handleSendMessage = useCallback(async () => {
    const userMsg = input.trim();
    if (!userMsg || isLoading) return;

    setError(null);
    setShowSuggestions(false);

    const userMessage: ChatMessage = { role: 'user', text: userMsg };
    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    setInput('');
    setIsLoading(true);

    try {
      const result = await processQuery(userMsg, messages);
      if (result.error) {
        setMessages([
          ...updatedHistory,
          { role: 'assistant', text: `⚠️ **Error**\n\n${result.error}` },
        ]);
        setError(result.error);
      } else {
        setMessages([
          ...updatedHistory,
          {
            role: 'assistant',
            text: result.text,
            charts: result.charts?.length ? result.charts : undefined,
          },
        ]);
      }
    } catch (err: any) {
      setMessages([
        ...updatedHistory,
        {
          role: 'assistant',
          text: `⚠️ **Something went wrong**\n\n${err.message || 'Unexpected error'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, messages, setMessages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (messages.length <= 1) return;
    setMessages([
      { role: 'assistant', text: '👋 **How Can I help you**' },
    ]);
    setShowSuggestions(true);
    setError(null);
    setInput('');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(index);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(index);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // ─── Render Message ────────────────────────────────────────────────────────

  const renderMessage = (msg: ChatMessage, index: number) => {
    const isUser = msg.role === 'user';
    const rendered = renderMarkdown(msg.text);
    const showAvatar = index === 0 || messages[index - 1]?.role !== msg.role;

    return (
      <div
        key={index}
        className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} ${
          index === 0 ? '' : 'mt-3'
        } animate-in fade-in slide-in-from-bottom-2 duration-300`}
      >
        {/* AI Avatar */}
        {!isUser && (
          <div className="flex flex-col items-center shrink-0">
            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/10 transition-all ${
                showAvatar ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
              }`}
            >
              <Sparkles size={16} />
            </div>
            {/* Timeline connector line */}
            {!showAvatar && (
              <div className="w-0.5 flex-1 min-h-[20px] bg-gradient-to-b from-orange-300/30 to-transparent mt-1 rounded-full" />
            )}
          </div>
        )}

        {/* Bubble — wider when charts are present */}
        <div className={`group relative ${msg.charts?.length ? 'max-w-[97%] md:max-w-[92%]' : 'max-w-[88%] md:max-w-[78%]'}`}>
          {isUser ? (
            // User bubble — gradient bg
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-md shadow-orange-500/15">
              <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
            </div>
          ) : (
            // AI bubble — clean card
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl rounded-bl-sm border border-slate-200/70 dark:border-slate-700/70 shadow-sm hover:shadow-md transition-shadow">
              <div className="px-4 py-3">
                <div
                  className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 space-y-1 [&_strong]:font-bold [&_em]:italic [&_table]:text-sm [&_table_th]:font-semibold [&_table_td]:text-slate-700 dark:[&_table_td]:text-slate-300"
                  dangerouslySetInnerHTML={{ __html: rendered }}
                />
                {msg.charts && <AIChatCharts charts={msg.charts} />}
              </div>
              {/* Copy bar */}
              <div className="flex items-center justify-end gap-1 px-3 pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleCopy(msg.text, index)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  title="Copy response"
                >
                  {copiedId === index ? (
                    <>
                      <Check size={11} className="text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={11} /> Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        {isUser && (
          <div className="flex flex-col items-center shrink-0">
            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white shadow-md transition-all ${
                showAvatar ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
              }`}
            >
              <span className="font-bold text-sm">A</span>
            </div>
            {!showAvatar && (
              <div className="w-0.5 flex-1 min-h-[20px] bg-gradient-to-b from-orange-400/30 to-transparent mt-1 rounded-full" />
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── Empty State ──────────────────────────────────────────────────────────

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="relative mb-8">
          <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
            <Bot size={56} />
          </div>
          <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-emerald-400 flex items-center justify-center text-white shadow-lg border-2 border-white dark:border-slate-900">
            <Check size={18} />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          AI Admin Assistant
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md leading-relaxed">
          Connected to Firebase. Ask me about users, ratings, menu items, complaints, and more.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-lg w-full">
          {SUGGESTIONS.slice(0, 9).map((s) => (
            <button
              key={s.label}
              onClick={() =>
                setMessages([
                  {
                    role: 'assistant',
                    text: `👋 Let me look into that for you.\n\n${s.label}`,
                  },
                ])
              }
              className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-200 dark:hover:border-orange-800 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
            >
              <span className="text-orange-500 dark:text-orange-400 shrink-0">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Typing Indicator ────────────────────────────────────────────────────

  const renderTypingIndicator = () => (
    <div className="flex gap-3 justify-start mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/10">
          <Sparkles size={16} />
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl rounded-bl-sm border border-slate-200/70 dark:border-slate-700/70 shadow-sm px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span
              className="w-2 h-2 rounded-full bg-orange-400 animate-bounce"
              style={{ animationDelay: '0ms', animationDuration: '1.2s' }}
            />
            <span
              className="w-2 h-2 rounded-full bg-orange-400 animate-bounce"
              style={{ animationDelay: '200ms', animationDuration: '1.2s' }}
            />
            <span
              className="w-2 h-2 rounded-full bg-orange-400 animate-bounce"
              style={{ animationDelay: '400ms', animationDuration: '1.2s' }}
            />
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Analyzing your data...
          </span>
        </div>
      </div>
    </div>
  );

  // ─── Main Chat ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50/40 to-white dark:from-slate-950/40 dark:to-slate-900">
      {/* ── Glass Header ──────────────────────────────────────────────────────── */}
      <div className="relative shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-amber-500/5 dark:from-orange-500/10 dark:to-amber-500/10" />
        <div className="relative flex items-center justify-between px-5 py-3 border-b border-slate-200/60 dark:border-slate-800/60 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/15 ring-1 ring-white/20">
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">
                AI Assistant
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full inline-block ${
                    isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
                  }`}
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isLoading
                    ? 'Processing...'
                    : `${messages.filter((m) => m.role === 'user').length} queries today`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className={`p-2 rounded-lg transition-all ${
                showSuggestions
                  ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={showSuggestions ? 'Hide suggestions' : 'Show suggestions'}
            >
              <Lightbulb size={16} />
            </button>
            <button
              onClick={handleClearChat}
              disabled={messages.length <= 1}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Clear conversation"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-6 py-5 custom-scrollbar"
      >
        {messages.map((msg, i) => renderMessage(msg, i))}

        {isLoading && renderTypingIndicator()}

        {/* Error */}
        {error && !isLoading && (
          <div className="flex items-center gap-3 px-4 py-3 mt-4 bg-red-50/80 dark:bg-red-900/15 border border-red-200/60 dark:border-red-800/60 rounded-xl text-sm text-red-700 dark:text-red-400 backdrop-blur-sm animate-in fade-in">
            <span className="flex-1 text-xs">⚠️ Try rephrasing your question.</span>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 font-semibold text-xs px-2 py-1 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Suggestions Bar ──────────────────────────────────────────────────── */}
      {showSuggestions && !isLoading && (
        <div className="shrink-0 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="px-4 md:px-6 py-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm">
            <div className="flex gap-2 overflow-x-auto pb-0.5 custom-scrollbar">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => {
                    setInput(s.label);
                    setShowSuggestions(false);
                    inputRef.current?.focus();
                  }}
                  className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-200 dark:hover:border-orange-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                >
                  <span className="text-orange-500 dark:text-orange-400 shrink-0">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Glass Input Area ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="px-4 md:px-6 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your mess data..."
                rows={1}
                disabled={isLoading}
                className="w-full px-4 py-3 pr-10 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400 transition-all resize-none min-h-[48px] max-h-[120px]"
                style={{ scrollbarWidth: 'thin' }}
              />
              {input.length > 0 && (
                <button
                  onClick={() => setInput('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              className="p-3.5 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-slate-300 dark:disabled:from-slate-700 disabled:to-slate-300 dark:disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 active:scale-95 min-w-[48px] flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            AI responses are generated from your Firebase data
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminChatBot;
