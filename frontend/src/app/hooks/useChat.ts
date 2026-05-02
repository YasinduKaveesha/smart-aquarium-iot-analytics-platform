import { useCallback, useRef, useState } from 'react';
import { ChatMessage } from '../api/types';

const BASE = import.meta.env.VITE_API_URL ?? '';

export interface NavigationRequest {
  page: string;
  filter_params?: Record<string, unknown>;
}

export interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  navigationRequest: NavigationRequest | null;
}

const SUGGESTIONS = [
  'What is my current water quality?',
  'Why is my WQI low?',
  'Show TDS trend over the past week',
  'Are there any anomalies recently?',
  'Will my temperature spike in the next 24 hours?',
  'Should I do a water change?',
];

export function useChat() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isStreaming: false,
    error: null,
    navigationRequest: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (text: string, dashboardContext?: Record<string, unknown>) => {
    const userMsg: ChatMessage = { role: 'user', content: text };
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' };

    setState(s => ({
      ...s,
      messages: [...s.messages, userMsg, assistantMsg],
      isStreaming: true,
      error: null,
    }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...state.messages, userMsg],
          dashboard_context: dashboardContext,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.chunk) {
              setState(s => {
                const msgs = [...s.messages];
                const last = msgs[msgs.length - 1];
                msgs[msgs.length - 1] = { ...last, content: last.content + evt.chunk };
                return { ...s, messages: msgs };
              });
            }
            if (evt.navigate) {
              setState(s => ({ ...s, navigationRequest: evt.navigate as NavigationRequest }));
            }
            if (evt.error) throw new Error(evt.error);
          } catch (_err) {
            // ignore partial JSON
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setState(s => ({ ...s, error: String(err instanceof Error ? err.message : err) }));
    } finally {
      setState(s => ({ ...s, isStreaming: false }));
      abortRef.current = null;
    }
  }, [state.messages]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setState({ messages: [], isStreaming: false, error: null, navigationRequest: null });
  }, []);

  const clearNavigation = useCallback(() => {
    setState(s => ({ ...s, navigationRequest: null }));
  }, []);

  return { ...state, send, stop, reset, clearNavigation, suggestions: SUGGESTIONS };
}
