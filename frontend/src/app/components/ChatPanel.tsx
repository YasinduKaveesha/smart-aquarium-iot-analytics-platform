import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2, RotateCcw } from 'lucide-react';
import { useChat } from '../hooks/useChat';

const PAGE_SUGGESTIONS: Record<string, string[]> = {
  '/advanced/history':     ['Show pH trend over the past week', 'How has TDS changed in 7 days?', 'Compare all parameters this month'],
  '/advanced/forecast':    ['Will my temperature spike in the next 24 hours?', 'What does the pH forecast look like?', 'Is there an acid crash risk?'],
  '/advanced/anomalies':   ['Explain the most recent anomaly', 'How many anomalies occurred this week?', 'What caused the last pH spike?'],
  '/advanced/map':         ['Which parameter is most out of range right now?', 'What is my overall water quality?'],
  '/advanced/correlation': ['Which parameters are most correlated?', 'What drives WQI the most?'],
  '/simple':               ['What is my water quality score?', 'Should I do a water change?', 'Is my aquarium healthy?'],
};

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isStreaming, error, send, reset, clearNavigation, navigationRequest, suggestions } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  const pagePath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const displaySuggestions = PAGE_SUGGESTIONS[pagePath] ?? suggestions;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Handle dashboard navigation emitted by the LLM
  useEffect(() => {
    if (!navigationRequest) return;
    clearNavigation();
    const { page, filter_params } = navigationRequest;
    if (filter_params && Object.keys(filter_params).length > 0) {
      sessionStorage.setItem('aquaguard_chat_filter', JSON.stringify(filter_params));
    }
    window.location.assign(page);
  }, [navigationRequest, clearNavigation]);

  const handleSend = (text: string) => {
    if (!text.trim() || isStreaming) return;
    send(text.trim(), { page: pagePath });
    setInput('');
  };

  return (
    <>
      {/* Floating launcher button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AquaGuard assistant"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #2E75B6, #006B6B)' }}
        >
          <MessageCircle className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-3rem)] rounded-2xl shadow-2xl flex flex-col overflow-hidden bg-white border border-gray-200">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'linear-gradient(135deg, #1A3D5C, #2E75B6)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">AquaGuard Assistant</p>
              <p className="text-[10px] text-blue-200">Powered by local Gemma 4 · e4b</p>
            </div>
            {messages.length > 0 && (
              <button onClick={reset} aria-label="Reset conversation" className="text-blue-200 hover:text-white p-1">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-blue-200 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Hi! I can read your live sensor data, forecasts, and anomalies. Try asking:
                </p>
                <div className="space-y-2">
                  {displaySuggestions.map(q => (
                    <button
                      key={q}
                      onClick={() => handleSend(q)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                  }`}
                >
                  {m.content || (isStreaming && i === messages.length - 1
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : ''
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 bg-white p-3">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(input);
                  }
                }}
                placeholder="Ask about your aquarium..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                disabled={isStreaming}
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #2E75B6, #006B6B)' }}
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
