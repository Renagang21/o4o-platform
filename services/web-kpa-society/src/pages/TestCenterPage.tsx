/**
 * TestCenterPage - 서비스 테스트 & 개선 참여 센터
 *
 * Work Order: WO-TEST-CENTER-SEPARATION-V1
 */

import { Link } from 'react-router-dom';

export function TestCenterPage() {
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContainer}>
          <Link to="/" style={styles.backLink}>
            ← 홈으로
          </Link>
          <div style={styles.titleWrapper}>
            <div style={styles.iconWrapper}>🧪</div>
            <div>
              <h1 style={styles.title}>테스트 센터</h1>
              <p style={styles.subtitle}>서비스 테스트 & 개선 참여</p>
            </div>
          </div>
          <div style={styles.alphaBadge}>
            <span style={styles.alphaIndicator}></span>
            <span>운영형 알파 · v0.8.0</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* 테스트 안내 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>테스트 참여 안내</h2>
          <div style={styles.cardGrid}>
            <div style={styles.card}>
              <div style={styles.cardIcon}>🎯</div>
              <h3 style={styles.cardTitle}>테스트 목적</h3>
              <p style={styles.cardDesc}>
                실제 사용 환경에서 서비스 안정성과 사용성을 검증합니다.
              </p>
            </div>
            <div style={styles.card}>
              <div style={styles.cardIcon}>✋</div>
              <h3 style={styles.cardTitle}>참여 방법</h3>
              <p style={styles.cardDesc}>
                서비스를 자유롭게 사용하시고, 불편한 점이나 개선 아이디어를 공유해주세요.
              </p>
            </div>
            <div style={styles.card}>
              <div style={styles.cardIcon}>💬</div>
              <h3 style={styles.cardTitle}>의견 남기기</h3>
              <p style={styles.cardDesc}>
                버그 리포트, 기능 제안, 사용성 개선 등 모든 의견을 환영합니다.
              </p>
            </div>
            <div style={styles.card}>
              <div style={styles.cardIcon}>🔄</div>
              <h3 style={styles.cardTitle}>반영 방식</h3>
              <p style={styles.cardDesc}>
                수집된 의견은 우선순위에 따라 검토되며, 주요 개선사항은 공지됩니다.
              </p>
            </div>
          </div>
        </section>

        {/* 유의사항 */}
        <section style={styles.section}>
          <div style={styles.warningBox}>
            <h3 style={styles.warningTitle}>운영형 알파 단계 유의사항</h3>
            <ul style={styles.warningList}>
              <li>화면이나 기능이 예고 없이 변경될 수 있습니다</li>
              <li>일부 기능은 아직 개발 중이거나 미완성일 수 있습니다</li>
              <li>테스트 데이터는 주기적으로 초기화될 수 있습니다</li>
            </ul>
          </div>
        </section>

        {/* Quick Links */}
        <section style={styles.section}>
          <div style={styles.linksWrapper}>
            <a
              href="https://neture.co.kr/forum/test-feedback"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.linkButton}
            >
              테스트 포럼 바로가기 →
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
  },
  headerContainer: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
  },
  backLink: {
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '14px',
  },
  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: '#dbeafe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  alphaBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: '#1e293b',
    borderRadius: '20px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.9)',
  },
  alphaIndicator: {
    width: '6px',
    height: '6px',
    backgroundColor: '#34d399',
    borderRadius: '50%',
  },
  content: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '20px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
  },
  cardIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 8px',
  },
  cardDesc: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.6,
    margin: 0,
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '12px',
    padding: '20px',
  },
  warningTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#92400e',
    margin: '0 0 12px',
  },
  warningList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#92400e',
    fontSize: '14px',
    lineHeight: 1.8,
  },
  linksWrapper: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  linkButton: {
    padding: '12px 24px',
    backgroundColor: '#2563eb',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
  },
};

export default TestCenterPage;
