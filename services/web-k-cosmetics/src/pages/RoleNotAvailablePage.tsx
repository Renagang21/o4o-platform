/**
 * RoleNotAvailablePage - 해당 역할의 대시보드가 이 서비스에 없음을 안내
 * 공급자/파트너는 Neture에서 관리
 */

import { Link } from 'react-router-dom';

interface RoleNotAvailablePageProps {
  role: 'supplier' | 'partner' | 'admin' | 'seller';
}

const ROLE_INFO = {
  supplier: {
    label: '공급자',
    icon: '📦',
    description: '상품 공급 및 재고 관리',
  },
  partner: {
    label: '파트너',
    icon: '🤝',
    description: '파트너십 및 연계 서비스 관리',
  },
  admin: {
    label: '관리자',
    icon: '🔧',
    description: '플랫폼 운영 및 관리',
  },
  seller: {
    label: '판매자',
    icon: '🛒',
    description: '상품 판매 및 매장 관리',
  },
};

export function RoleNotAvailablePage({ role }: RoleNotAvailablePageProps) {
  const info = ROLE_INFO[role];

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>{info.icon}</div>
        <h1 style={styles.title}>{info.label} 대시보드</h1>
        <p style={styles.description}>{info.description}</p>

        <div style={styles.notice}>
          <div style={styles.noticeIcon}>ℹ️</div>
          <div>
            <p style={styles.noticeTitle}>안내</p>
            <p style={styles.noticeText}>
              {info.label} 역할의 업무 공간은 <strong>Neture 플랫폼</strong>에서 통합 관리됩니다.
            </p>
          </div>
        </div>

        <div style={styles.actions}>
          <a
            href="https://neture.co.kr"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.primaryButton}
          >
            Neture로 이동
          </a>
          <Link to="/" style={styles.secondaryButton}>
            홈으로 돌아가기
          </Link>
        </div>

        <p style={styles.helpText}>
          문의사항이 있으시면 <a href="/contact" style={styles.link}>고객센터</a>로 연락해 주세요.
        </p>
      </div>
    </div>
  );
}

const PRIMARY_COLOR = '#FF6B9D';

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '48px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 8px 0',
  },
  description: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 32px 0',
  },
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    backgroundColor: '#FFF0F5',
    padding: '16px 20px',
    borderRadius: '12px',
    textAlign: 'left',
    marginBottom: '32px',
  },
  noticeIcon: {
    fontSize: '20px',
    flexShrink: 0,
  },
  noticeTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    margin: '0 0 4px 0',
  },
  noticeText: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  primaryButton: {
    display: 'inline-block',
    padding: '14px 24px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'opacity 0.2s',
  },
  secondaryButton: {
    display: 'inline-block',
    padding: '14px 24px',
    backgroundColor: '#f8f9fa',
    color: '#333',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 500,
    textDecoration: 'none',
    border: '1px solid #e2e8f0',
  },
  helpText: {
    fontSize: '13px',
    color: '#888',
    margin: 0,
  },
  link: {
    color: PRIMARY_COLOR,
    textDecoration: 'none',
  },
};
