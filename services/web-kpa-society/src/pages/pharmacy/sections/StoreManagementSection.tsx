/**
 * StoreManagementSection - 매장 관리 링크 그룹
 *
 * WO-PHARMACY-DASHBOARD-REALIGN-PHASEA1-V1
 *
 * 매장 관리 / B2B / 연결 서비스 링크.
 */

import { useNavigate } from 'react-router-dom';

const items = [
  { icon: '🏪', label: '매장 관리', desc: '테마·템플릿·컴포넌트 설정', path: '/store/settings' },
  // WO-O4O-KPA-MY-STORE-FINAL-CLEANUP-AND-CLOSEOUT-V1: legacy `/store/products`(redirect) → canonical
  { icon: '🤝', label: 'B2B 구매', desc: '공급자·도매 거래', path: '/store/commerce/products' },
  { icon: '🔗', label: '연결 서비스', desc: 'LMS·사이니지·커뮤니티', path: '/store/settings' },
];

export function StoreManagementSection() {
  const navigate = useNavigate();

  return (
    <section style={{ marginBottom: '32px' }}>
      <h2 style={{
        margin: '0 0 16px',
        fontSize: '18px',
        fontWeight: 600,
        color: '#0f172a',
      }}>
        매장 운영
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '12px',
      }}>
        {items.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
              width: '100%',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
          >
            <span style={{ fontSize: '24px', flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{item.label}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{item.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
