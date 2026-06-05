'use client';

import { useState, useCallback, useRef } from 'react';

interface StreamState {
  content: string;
  isLoading: boolean;
  error: string | null;
}

export function useStream() {
  const [state, setState] = useState<StreamState>({
    content: '',
    isLoading: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const stream = useCallback(
    async (url: string, body: Record<string, unknown>): Promise<string> => {
      setState({ content: '', isLoading: true, error: null });
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      let fullContent = '';

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.error) throw new Error(data.error);
              if (data.chunk) {
                fullContent += data.chunk;
                setState((prev) => ({
                  ...prev,
                  content: fullContent,
                }));
              }
            } catch (e: unknown) {
              if (e instanceof Error && !e.message.includes('Unexpected token')) {
                throw e;
              }
            }
          }
        }

        setState({ content: fullContent, isLoading: false, error: null });
        return fullContent;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('aborted')) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return fullContent;
        }
        setState({ content: fullContent, isLoading: false, error: msg });
        throw err;
      }
    },
    []
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ content: '', isLoading: false, error: null });
  }, []);

  return { ...state, stream, reset };
}
