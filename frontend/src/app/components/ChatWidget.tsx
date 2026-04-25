import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { MessageCircle, X, Send, Trash2, Bot, User, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { useChat } from '../hooks/useChat'

// ── Page-aware quick questions ───────────────────────────────────────────────

const PAGE_QUESTIONS: Record<string, string[]> = {
  '/simple': [
    'Is my tank safe for Neon Tetras right now?',
    'Should I do a water change today?',
    'What does my WQI score mean?',
    'Is my temperature in the safe range?',
  ],
  '/advanced/anomaly-detection': [
    'What caused the latest anomaly?',
    'Is this anomaly a false alarm?',
    'How many anomalies happened this week?',
    'What should I do about this anomaly?',
  ],
  '/advanced/forecast': [
    'What will my pH be in 24 hours?',
    'Is my temperature trending dangerously?',
    'Should I be worried about the forecast?',
    'What does the confidence band mean?',
  ],
  '/advanced/sensors': [
    'Which sensor needs the most attention?',
    'What does TDS mean for my fish?',
    'Why is my turbidity high?',
    'Is my pH trend concerning?',
  ],
  '/advanced/wqi': [
    'Why is my WQI this score?',
    'Which parameter is hurting my WQI most?',
    'How can I improve my WQI score?',
    'What is fuzzy scoring?',
  ],
  '/advanced/health': [
    'Are my Neon Tetras stressed right now?',
    'What are signs of pH stress in fish?',
    'Is my tank temperature safe for breeding?',
    'What fish behaviour should I watch for?',
  ],
}

const DEFAULT_QUESTIONS = [
  'What is the current water quality?',
  'Should I do a water change today?',
  'When was the last anomaly?',
  'Is my tank safe for fish?',
]

function getQuestions(pathname: string): string[] {
  for (const [key, qs] of Object.entries(PAGE_QUESTIONS)) {
    if (pathname.startsWith(key)) return qs
  }
  return DEFAULT_QUESTIONS
}

// ── Component ────────────────────────────────────────────────────────────────

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, loading, error, sendMessage, clear } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const currentPage = window.location.pathname
  const quickQuestions = getQuestions(currentPage)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const submit = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    await sendMessage(text, currentPage)
  }

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Open AquaGuard AI"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #2E75B6 0%, #006B6B 100%)',
          boxShadow: '0 8px 32px rgba(46,117,182,0.45)',
        }}
      >
        {open
          ? <X className="w-6 h-6 text-white" />
          : <MessageCircle className="w-6 h-6 text-white" />}
        {!open && messages.length > 0 && (
          <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col rounded-2xl overflow-hidden"
          style={{
            width: 390,
            height: 540,
            background: 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 24px 72px rgba(0,0,0,0.18), 0 0 0 1px rgba(46,117,182,0.12)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #1F4E79 0%, #006B6B 100%)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">AquaGuard AI</p>
                <p className="text-white/50 text-[10px] leading-tight">Powered by Gemini 2.0</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clear}
                title="Clear conversation"
                disabled={messages.length === 0}
                className="p-1.5 rounded-lg transition-all"
                style={{
                  color: messages.length > 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
                  cursor: messages.length > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">

            {/* Welcome + quick questions (empty state) */}
            {messages.length === 0 && !loading && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-start gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(135deg, #2E75B6, #006B6B)' }}
                  >
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div
                    className="px-3 py-2.5 rounded-2xl rounded-tl-sm text-sm text-gray-700 leading-relaxed max-w-[85%]"
                    style={{ background: '#F1F5F9' }}
                  >
                    Hi! I'm AquaGuard AI. I have live access to your tank's sensor data and can help you understand water quality, anomalies, and fish health. What would you like to know?
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 font-medium pl-1 mt-1">
                  Suggested for this page:
                </p>
                <div className="flex flex-col gap-1.5">
                  {quickQuestions.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q, currentPage)}
                      className="text-left text-xs px-3 py-2 rounded-xl border transition-all hover:shadow-sm active:scale-[0.98]"
                      style={{
                        borderColor: 'rgba(46,117,182,0.22)',
                        color: '#2E75B6',
                        background: 'rgba(46,117,182,0.04)',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message history */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm"
                  style={{
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #2E75B6, #1F4E79)'
                      : 'linear-gradient(135deg, #006B6B, #2E75B6)',
                  }}
                >
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5 text-white" />
                    : <Bot className="w-3.5 h-3.5 text-white" />}
                </div>
                <div
                  className={`px-3 py-2.5 rounded-2xl text-sm max-w-[80%] leading-relaxed whitespace-pre-wrap shadow-sm ${
                    msg.role === 'user' ? 'rounded-tr-sm text-white' : 'rounded-tl-sm text-gray-700'
                  }`}
                  style={{
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #2E75B6, #1F4E79)'
                      : '#F1F5F9',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-start gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #006B6B, #2E75B6)' }}
                >
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div
                  className="px-4 py-3.5 rounded-2xl rounded-tl-sm"
                  style={{ background: '#F1F5F9' }}
                >
                  <div className="flex gap-1.5 items-center">
                    <span
                      className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: '160ms' }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: '320ms' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
              >
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 leading-relaxed">{error}</p>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div
            className="flex-shrink-0 px-3 py-3"
            style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
          >
            <div
              className="flex items-end gap-2 rounded-xl px-3 py-2 transition-all"
              style={{
                background: '#F8FAFC',
                border: '1px solid rgba(46,117,182,0.2)',
              }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Ask about water quality, fish health, anomalies…"
                disabled={loading}
                className="flex-1 resize-none bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
                style={{ maxHeight: 88, lineHeight: '1.5' }}
              />
              <button
                onClick={submit}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0"
                style={{
                  background: input.trim() && !loading
                    ? 'linear-gradient(135deg, #2E75B6, #006B6B)'
                    : '#E2E8F0',
                }}
              >
                {loading
                  ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                  : <Send className="w-4 h-4" style={{ color: input.trim() ? 'white' : '#94A3B8' }} />}
              </button>
            </div>
            <p className="text-center text-gray-300 text-[10px] mt-1.5">
              Enter to send · Shift+Enter for newline
            </p>
          </div>
        </div>
      )}
    </>
  )
}
