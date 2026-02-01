/**
 * ConsultationRequestPage - o4o 상담 요청
 *
 * /o4o/consultation
 * o4o 플랫폼에 대해 알아보고 싶은 사업자를 위한 상담 안내 페이지.
 */

import { Link } from 'react-router-dom';

export default function ConsultationRequestPage() {
  return (
    <div style={styles.page}>
      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.container}>
          <span style={styles.badge}>상담 요청</span>
          <h1 style={styles.heroTitle}>o4o 상담 요청</h1>
          <p style={styles.heroSubtitle}>
            o4o 플랫폼이 무엇인지, 우리 사업에 어떻게 적용할 수 있는지
            <br />
            궁금한 점을 상담받으세요.
          </p>
        </div>
      </section>

      {/* 상담 범위 */}
      <section style={styles.section}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>상담 가능한 내용</h2>
          <div style={styles.cardGrid}>
            <div style={styles.card}>
              <div style={styles.cardIcon}>💡</div>
              <h3 style={styles.cardTitle}>플랫폼 개요</h3>
              <p style={styles.cardDesc}>
                o4o가 무엇이고, 어떤 구조로 운영되는지 설명합니다.
              </p>
            </div>
            <div style={styles.card}>
              <div style={styles.cardIcon}>🏪</div>
              <h3 style={styles.cardTitle}>적용 가능성</h3>
              <p style={styles.cardDesc}>
                해당 업종과 사업 모델에 o4o를 적용할 수 있는지 검토합니다.
              </p>
            </div>
            <div style={styles.card}>
              <div style={styles.cardIcon}>📋</div>
              <h3 style={styles.cardTitle}>참여 방법</h3>
              <p style={styles.cardDesc}>
                공급자, 파트너 등 각 역할의 참여 구조와 절차를 안내합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 상담 방식 */}
      <section style={styles.sectionAlt}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>상담 진행 방식</h2>
          <div style={styles.infoBox}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>방식</span>
              <span style={styles.infoValue}>이메일 접수 후 유선 또는 화상 상담</span>
            </div>
            <div style={styles.infoDivider} />
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>소요</span>
              <span style={styles.infoValue}>접수 후 영업일 기준 2-3일 내 회신</span>
            </div>
            <div style={styles.infoDivider} />
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>비용</span>
              <span style={styles.infoValue}>초기 상담은 무료</span>
            </div>
          </div>
        </div>
      </section>

      {/* 안내 */}
      <section style={styles.section}>
        <div style={styles.container}>
          <div style={styles.noticeBox}>
            <p style={styles.noticeTitle}>상담 요청 시 포함하면 좋은 내용</p>
            <ul style={styles.noticeList}>
              <li>회사/사업자 소개 (업종, 규모)</li>
              <li>관심 분야 (공급, 유통, 채널 활용 등)</li>
              <li>구체적인 질문이나 확인하고 싶은 사항</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={styles.ctaSection}>
        <div style={styles.container}>
          <p style={styles.ctaText}>상담 요청은 아래 이메일로 보내주세요.</p>
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
    backgroundColor: '#475569',
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
  infoBox: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
  },
  infoLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#475569',
    minWidth: '60px',
  },
  infoValue: {
    fontSize: '14px',
    color: '#1e293b',
  },
  infoDivider: {
    height: '1px',
    backgroundColor: '#f1f5f9',
  },
  noticeBox: {
    padding: '28px 32px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    maxWidth: '600px',
    margin: '0 auto',
  },
  noticeTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#334155',
    margin: '0 0 12px 0',
  },
  noticeList: {
    margin: 0,
    padding: '0 0 0 20px',
    color: '#475569',
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
