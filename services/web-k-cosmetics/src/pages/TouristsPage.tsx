/**
 * TouristsPage - 관광객 안내
 * WO-KCOS-HOME-UI-V1
 */

import { Link } from 'react-router-dom';

export function TouristsPage() {
  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <h1 style={styles.title}>관광객 안내</h1>
        <p style={styles.subtitle}>
          한국을 방문하는 관광객을 위한 K-Beauty 매장 안내
        </p>
      </div>

      <div style={styles.container}>
        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.cardIcon}>👥</div>
            <h3 style={styles.cardTitle}>단체 관광객</h3>
            <p style={styles.cardDesc}>
              여행사 및 가이드를 통한 단체 방문을 위한 파트너 매장 안내
            </p>
            <Link to="/stores?tag=group_friendly" style={styles.cardLink}>
              단체 환영 매장 보기 →
            </Link>
          </div>

          <div style={styles.card}>
            <div style={styles.cardIcon}>🧳</div>
            <h3 style={styles.cardTitle}>개인 관광객</h3>
            <p style={styles.cardDesc}>
              자유여행 관광객을 위한 외국어 가능 매장 안내
            </p>
            <Link to="/stores?tag=english_ok" style={styles.cardLink}>
              외국어 가능 매장 보기 →
            </Link>
          </div>
        </div>

        <div style={styles.notice}>
          <h3 style={styles.noticeTitle}>안내사항</h3>
          <ul style={styles.noticeList}>
            <li>모든 구매는 각 매장에서 직접 이루어집니다</li>
            <li>가격 및 결제 방법은 매장마다 다를 수 있습니다</li>
            <li>세금 환급(Tax Refund)은 매장에 직접 문의해 주세요</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },
  hero: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: '64px 24px',
    textAlign: 'center',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    margin: '0 0 12px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#aaa',
    margin: 0,
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '48px 24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '48px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    border: '1px solid #e9ecef',
    textAlign: 'center',
  },
  cardIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 12px 0',
  },
  cardDesc: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 24px 0',
    lineHeight: 1.6,
  },
  cardLink: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
  },
  notice: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e9ecef',
  },
  noticeTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 16px 0',
  },
  noticeList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#666',
    fontSize: '14px',
    lineHeight: 1.8,
  },
};
