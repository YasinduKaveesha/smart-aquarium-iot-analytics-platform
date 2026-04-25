import { useState, useCallback } from 'react'
import { apiFetch } from '../api/client'
import type { ChatMessage, ChatResponse } from '../api/types'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (text: string, currentPage: string = '') => {
    const userMsg: ChatMessage = { role: 'user', content: text }
    const nextHistory = [...messages, userMsg]
    setMessages(nextHistory)
    setLoading(true)
    setError(null)

    try {
      const res = await apiFetch<ChatResponse>('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10),
          current_page: currentPage,
        }),
      })
      setMessages([...nextHistory, { role: 'assistant', content: res.response }])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(`AquaGuard AI is unavailable. ${msg}`)
      setMessages(nextHistory)
    } finally {
      setLoading(false)
    }
  }, [messages])

  const clear = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, loading, error, sendMessage, clear }
}
