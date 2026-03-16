import React, { useState } from 'react';
import { api, API_BASE_URL } from '../../lib/apiClient';
import type { CopilotEntryProps } from './CopilotEntry';

interface Props {
  context?: CopilotEntryProps;
}

export function CopilotSummary({ context }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generate = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.post(`${API_BASE_URL}/api/ai/query`, {
        question: '현재 페이지를 요약해주세요.',
        contextType: 'service' as const,
        serviceId: context?.serviceId || 'neture',
        storeId: context?.storeId,
        productId: context?.productId,
      });
      setSummary(data.answer || data.error || 'No response');
    } catch {
      setSummary('요약 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {!summary && !isLoading && (
        <div style={styles.center}>
          <p style={styles.desc}>AI가 현재 페이지의 핵심 내용을 요약합니다.</p>
          <button style={styles.btn} onClick={generate}>요약 생성</button>
        </div>
      )}
      {isLoading && <p style={styles.loading}>요약 생성 중...</p>}
      {summary && (
        <div style={styles.result}>
          <strong style={styles.resultTitle}>페이지 요약</strong>
          <p style={styles.resultText}>{summary}</p>
          <button style={styles.retryBtn} onClick={generate}>다시 생성</button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '16px', height: '100%' },
  center: { textAlign: 'center', marginTop: '40px' },
  desc: { fontSize: '14px', color: '#6B7280', marginBottom: '16px' },
  btn: { background: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 },
  loading: { textAlign: 'center', color: '#9CA3AF', marginTop: '40px', fontSize: '14px' },
  result: { background: '#F9FAFB', borderRadius: '10px', padding: '16px', border: '1px solid #E5E7EB' },
  resultTitle: { fontSize: '14px', color: '#111827' },
  resultText: { fontSize: '13px', color: '#374151', lineHeight: '1.6', margin: '8px 0', whiteSpace: 'pre-wrap' },
  retryBtn: { background: 'none', border: '1px solid #D1D5DB', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', color: '#6B7280' },
};
