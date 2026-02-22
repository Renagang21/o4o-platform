/**
 * ManualPlaceholderPage — 매뉴얼 세부 페이지 플레이스홀더
 *
 * WO-KPA-A-MANUAL-MAIN-PAGE-V1
 */

import { useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  description?: string;
}

export function ManualPlaceholderPage({ title, description }: Props) {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
        {title}
      </h1>
      {description && (
        <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '32px' }}>
          {description}
        </p>
      )}
      <div style={{
        padding: '40px 24px',
        borderRadius: '12px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        marginBottom: '24px',
      }}>
        <p style={{ fontSize: '48px', marginBottom: '12px' }}>🚧</p>
        <p style={{ fontSize: '16px', fontWeight: 600, color: '#475569' }}>
          준비 중입니다
        </p>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>
          이 매뉴얼 페이지는 곧 제공될 예정입니다.
        </p>
      </div>
      <button
        onClick={() => navigate('/manual')}
        style={{
          padding: '10px 24px',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          background: '#fff',
          color: '#334155',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        매뉴얼 홈으로
      </button>
    </div>
  );
}
