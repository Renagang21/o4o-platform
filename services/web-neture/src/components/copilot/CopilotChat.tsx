import React, { useState, useRef, useEffect } from 'react';
import { api, API_BASE_URL } from '../../lib/apiClient';
import type { CopilotEntryProps } from './CopilotEntry';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  context?: CopilotEntryProps;
}

export function CopilotChat({ context }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages]);

  const send = async () => {
    const q = input.trim();
    if (!q || isLoading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setIsLoading(true);

    try {
      const { data } = await api.post(`${API_BASE_URL}/api/ai/query`, {
        question: q,
        contextType: 'service' as const,
        serviceId: context?.serviceId || 'neture',
        storeId: context?.storeId,
        productId: context?.productId,
        categoryId: context?.categoryId,
        pageType: context?.pageType,
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer || data.error || 'No response' },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network error' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={styles.container}>
      <div ref={listRef} style={styles.messages}>
        {messages.length === 0 && (
          <p style={styles.empty}>AI에게 질문해보세요.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={m.role === 'user' ? styles.userBubble : styles.aiBubble}>
            <span style={styles.label}>{m.role === 'user' ? 'You' : 'AI'}</span>
            <p style={styles.text}>{m.content}</p>
          </div>
        ))}
        {isLoading && (
          <div style={styles.aiBubble}>
            <span style={styles.label}>AI</span>
            <p style={styles.text}>...</p>
          </div>
        )}
      </div>
      <div style={styles.inputRow}>
        <textarea
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="메시지 입력..."
          rows={1}
        />
        <button style={styles.sendBtn} onClick={send} disabled={isLoading || !input.trim()}>
          전송
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', height: '100%' },
  messages: { flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' },
  empty: { color: '#9CA3AF', textAlign: 'center', marginTop: '40px', fontSize: '14px' },
  userBubble: { alignSelf: 'flex-end', background: '#2563EB', color: '#fff', borderRadius: '12px 12px 0 12px', padding: '8px 12px', maxWidth: '80%' },
  aiBubble: { alignSelf: 'flex-start', background: '#F3F4F6', color: '#374151', borderRadius: '12px 12px 12px 0', padding: '8px 12px', maxWidth: '80%' },
  label: { fontSize: '10px', fontWeight: 600, opacity: 0.7 },
  text: { margin: '2px 0 0', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' },
  inputRow: { display: 'flex', gap: '8px', padding: '12px', borderTop: '1px solid #E5E7EB' },
  input: { flex: 1, border: '1px solid #D1D5DB', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', resize: 'none', outline: 'none', fontFamily: 'inherit' },
  sendBtn: { background: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 },
};
