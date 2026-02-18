/**
 * TestCenterPage - KPA-a 테스트 센터 메인 페이지
 *
 * 2단계 구조화된 테스트 흐름:
 * - 1단계: 준비된 계정으로 체험 테스트
 * - 2단계: 실제 가입 → 승인 → 운영 체험
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
              <h1 style={styles.title}>KPA-a 테스트 센터</h1>
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
        {/* 안내 영역 */}
        <section style={styles.introSection}>
          <div style={styles.introBox}>
            <p style={styles.introText}>
              본 서비스는 시범 운영 단계입니다.
            </p>
            <p style={styles.introText}>
              실제 약국 운영자의 사용성을 점검하기 위해 체험 테스트를 진행합니다.
            </p>
            <p style={styles.introText}>
              테스트는 <strong>2단계</strong>로 구성되어 있습니다.
            </p>
            <p style={styles.introMeta}>
              소요 시간: 약 30~40분
            </p>
          </div>
        </section>

        {/* 카드 영역 */}
        <section style={styles.cardSection}>
          <div style={styles.cardGrid}>
            {/* 카드 1 — 1단계 체험 테스트 */}
            <div style={styles.card}>
              <div style={styles.cardStepBadge}>1단계</div>
              <div style={styles.cardIconLarge}>🔵</div>
              <h2 style={styles.cardTitle}>체험 테스트</h2>
              <ul style={styles.cardList}>
                <li>준비된 계정으로 즉시 체험</li>
                <li>로그인 후 주요 메뉴 흐름 확인</li>
                <li>UX 중심 점검</li>
              </ul>
              <Link to="/demo/test-guide" style={styles.cardButton}>
                1단계 테스트 시작
              </Link>
            </div>

            {/* 카드 2 — 2단계 실제 가입 테스트 */}
            <div style={{ ...styles.card, ...styles.cardHighlight }}>
              <div style={{ ...styles.cardStepBadge, ...styles.cardStepBadgeGreen }}>2단계</div>
              <div style={styles.cardIconLarge}>🟢</div>
              <h2 style={styles.cardTitle}>실제 가입 테스트</h2>
              <ul style={styles.cardList}>
                <li>직접 가입</li>
                <li>승인 요청 → 승인 완료</li>
                <li>실제 운영 체험</li>
                <li>자신의 약국을 운영한다고 가정하고 진행</li>
              </ul>
              <Link to="/test/step2" style={{ ...styles.cardButton, ...styles.cardButtonGreen }}>
                2단계 테스트 시작
              </Link>
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
  introSection: {
    marginBottom: '32px',
  },
  introBox: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e2e8f0',
  },
  introText: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.8,
    margin: '0 0 4px 0',
  },
  introMeta: {
    fontSize: '14px',
    color: '#94a3b8',
    marginTop: '12px',
    margin: '12px 0 0 0',
  },
  cardSection: {
    marginBottom: '32px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '32px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    position: 'relative',
  },
  cardHighlight: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  cardStepBadge: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    padding: '4px 12px',
    backgroundColor: '#2563eb',
    color: '#fff',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
  },
  cardStepBadgeGreen: {
    backgroundColor: '#059669',
  },
  cardIconLarge: {
    fontSize: '48px',
    marginBottom: '16px',
    marginTop: '8px',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 16px 0',
  },
  cardList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 24px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.6,
  },
  cardButton: {
    display: 'inline-block',
    padding: '12px 32px',
    backgroundColor: '#2563eb',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    marginTop: 'auto',
  },
  cardButtonGreen: {
    backgroundColor: '#059669',
  },
  section: {
    marginBottom: '32px',
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
