/**
 * BusinessInquiryPage - 플랫폼 기반 사업 문의
 *
 * /o4o/business-inquiry
 * o4o 플랫폼을 활용한 사업 구축에 관심 있는 사업자를 위한 안내 페이지.
 */

import { Link } from 'react-router-dom';

export default function BusinessInquiryPage() {
  return (
    <div style={styles.page}>
      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.container}>
          <span style={styles.badge}>사업 문의</span>
          <h1 style={styles.heroTitle}>플랫폼 기반 사업 문의</h1>
          <p style={styles.heroSubtitle}>
            o4o 플랫폼을 활용해 매장 네트워크 기반 사업을 구축하고자 하는
            <br />
            사업자를 위한 안내입니다.
          </p>
        </div>
      </section>

      {/* 대상 */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>이런 분들이 문의합니다</h2>
          <div style={styles.cardGrid}>
            <div style={styles.card}>
              <div style={styles.cardIcon}>🏢</div>
              <h3 style={styles.cardTitle}>제조/유통 사업자</h3>
              <p style={styles.cardDesc}>
                자사 제품을 오프라인 매장 채널에 공급하고 싶은 사업자
              </p>
            </div>
            <div style={styles.card}>
              <div style={styles.cardIcon}>🔗</div>
              <h3 style={styles.cardTitle}>프랜차이즈/본부</h3>
              <p style={styles.cardDesc}>
                가맹점 네트워크에 새로운 수익 구조를 도입하려는 본부
              </p>
            </div>
            <div style={styles.card}>
              <div style={styles.cardIcon}>📊</div>
              <h3 style={styles.cardTitle}>서비스 기획자</h3>
              <p style={styles.cardDesc}>
                오프라인 채널을 활용한 신규 서비스를 기획하는 사업자
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 진행 과정 */}
      <section style={styles.sectionAlt}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>문의 후 진행 과정</h2>
          <div style={styles.processSteps}>
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <div style={styles.stepLabel}>사업 문의</div>
              <div style={styles.stepDesc}>이메일로 사업 개요 전달</div>
            </div>
            <div style={styles.stepArrow}>→</div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <div style={styles.stepLabel}>검토 및 회신</div>
              <div style={styles.stepDesc}>사업 적합성 검토 후 연락</div>
            </div>
            <div style={styles.stepArrow}>→</div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <div style={styles.stepLabel}>상세 논의</div>
              <div style={styles.stepDesc}>구조, 비용, 일정 협의</div>
            </div>
            <div style={styles.stepArrow}>→</div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>4</div>
              <div style={styles.stepLabel}>서비스 구축</div>
              <div style={styles.stepDesc}>플랫폼 기반 사업 개시</div>
            </div>
          </div>
        </div>
      </section>

      {/* 안내 사항 */}
      <section style={styles.section}>
        <div style={styles.container}>
          <div style={styles.noticeBox}>
            <p style={styles.noticeTitle}>안내 사항</p>
            <ul style={styles.noticeList}>
              <li>o4o는 모든 사업에 열려 있지 않습니다. 플랫폼 취지에 부합하는 경우에만 진행합니다.</li>
              <li>제안서는 접촉 이후에만 제공됩니다.</li>
              <li>사업 개요(업종, 규모, 목적)를 포함하여 문의해 주시면 검토가 빠릅니다.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={styles.ctaSection}>
        <div style={styles.container}>
          <p style={styles.ctaText}>사업 문의는 아래 이메일로 보내주세요.</p>
          <p style={styles.email}>contact@neture.co.kr</p>
          <div style={styles.navLinks}>
            <Link to="/o4o" style={styles.backLink}>← o4o 소개로 돌아가기</Link>
            <Link to="/" style={styles.homeLink}>메인으로</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 20px',
  },
  badge: {
    display: 'inline-block',
    padding: '6px 16px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '16px',
  },
  hero: {
    backgroundColor: PRIMARY_COLOR,
    padding: '80px 20px',
    textAlign: 'center',
    color: '#fff',
  },
  heroTitle: {
    fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
    fontWeight: 700,
    margin: '0 0 16px 0',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 1.7,
    margin: 0,
  },
  section: {
    padding: '64px 20px',
  },
  sectionAlt: {
    padding: '64px 20px',
    backgroundColor: '#f8fafc',
  },
  sectionTitle: {
    fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
    fontWeight: 700,
    color: '#0f172a',
    textAlign: 'center',
    margin: '0 0 40px 0',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '32px 24px',
    textAlign: 'center',
  },
  cardIcon: {
    fontSize: '2.5rem',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  cardDesc: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: 1.6,
    margin: 0,
  },
  processSteps: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    minWidth: '120px',
  },
  stepNumber: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: 700,
  },
  stepLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f172a',
  },
  stepDesc: {
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
  },
  stepArrow: {
    color: '#cbd5e1',
    fontSize: '18px',
    marginTop: '10px',
  },
  noticeBox: {
    padding: '28px 32px',
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    border: '1px solid #bfdbfe',
    maxWidth: '700px',
    margin: '0 auto',
  },
  noticeTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e40af',
    margin: '0 0 12px 0',
  },
  noticeList: {
    margin: 0,
    padding: '0 0 0 20px',
    color: '#1e293b',
    fontSize: '14px',
    lineHeight: 2,
  },
  ctaSection: {
    padding: '64px 20px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
  },
  ctaText: {
    fontSize: '16px',
    color: '#475569',
    margin: '0 0 12px 0',
  },
  email: {
    fontSize: '24px',
    fontWeight: 700,
    color: PRIMARY_COLOR,
    margin: '0 0 32px 0',
  },
  navLinks: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
  },
  backLink: {
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '14px',
  },
  homeLink: {
    color: PRIMARY_COLOR,
    textDecoration: 'none',
    fontSize: '14px',
  },
};
