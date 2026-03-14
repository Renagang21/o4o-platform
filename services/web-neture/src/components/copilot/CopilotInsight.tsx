import React from 'react';

const MOCK_INSIGHTS = [
  { icon: '📊', title: '매장 성과', body: '이번 주 방문자 전주 대비 +12% 증가' },
  { icon: '🏆', title: '인기 상품', body: '비타민D 3000IU 주문량 20% 증가' },
  { icon: '⚠️', title: '재고 알림', body: '재고 부족 상품 2개 확인 필요' },
];

export function CopilotInsight() {
  return (
    <div style={styles.container}>
      <p style={styles.note}>Mock 데이터 — 향후 실제 API 연결 예정</p>
      {MOCK_INSIGHTS.map((item, i) => (
        <div key={i} style={styles.card}>
          <span style={styles.icon}>{item.icon}</span>
          <div>
            <strong style={styles.title}>{item.title}</strong>
            <p style={styles.body}>{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  note: { fontSize: '12px', color: '#9CA3AF', textAlign: 'center', margin: 0 },
  card: { display: 'flex', gap: '12px', padding: '12px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB' },
  icon: { fontSize: '24px', flexShrink: 0 },
  title: { fontSize: '14px', color: '#111827' },
  body: { fontSize: '13px', color: '#6B7280', margin: '4px 0 0' },
};
