/**
 * PartnersApplyPage - 공급자/파트너 참여 안내 페이지
 *
 * WO-NETURE-ENTRY-POINTS-V1
 * - 실제 신청 폼 없음 (안내만)
 * - 연락처/문의 방법 안내
 */

import { Link } from 'react-router-dom';

export default function PartnersApplyPage() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.badge}>BETA</span>
          <h1 style={styles.title}>공급자 / 파트너 참여 안내</h1>
          <p style={styles.subtitle}>
            Neture 플랫폼에 참여하여 비즈니스를 성장시키세요
          </p>
        </div>

        {/* Cards */}
        <div style={styles.cardGrid}>
          {/* 공급자 */}
          <div style={styles.card}>
            <div style={styles.cardIcon}>📦</div>
            <h2 style={styles.cardTitle}>공급자로 참여</h2>
            <p style={styles.cardDesc}>
              상품을 공급하고 새로운 판매 채널을 확보하세요.
              입점 심사를 거쳐 공급자 계정이 부여됩니다.
            </p>
            <ul style={styles.list}>
              <li>상품 등록 및 관리</li>
              <li>주문 처리 지원</li>
              <li>정산 시스템 연동</li>
            </ul>
            <Link to="/partners/requests/create" style={styles.applyButton}>
              참여 신청하기 →
            </Link>
          </div>

          {/* 파트너 */}
          <div style={styles.card}>
            <div style={styles.cardIcon}>🤝</div>
            <h2 style={styles.cardTitle}>파트너로 참여</h2>
            <p style={styles.cardDesc}>
              제휴를 통해 함께 성장하세요.
              파트너십 검토 후 파트너 계정이 부여됩니다.
            </p>
            <ul style={styles.list}>
              <li>제휴 상품 연계</li>
              <li>공동 마케팅</li>
              <li>협력 네트워크</li>
            </ul>
            <Link to="/partners/requests/create" style={styles.applyButton}>
              참여 신청하기 →
            </Link>
          </div>
        </div>

        {/* 신청 프로세스 */}
        <div style={styles.processSection}>
          <h3 style={styles.sectionTitle}>참여 프로세스</h3>
          <div style={styles.processSteps}>
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <div style={styles.stepText}>온라인 신청</div>
            </div>
            <div style={styles.stepArrow}>→</div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <div style={styles.stepText}>검토 및 심사</div>
            </div>
            <div style={styles.stepArrow}>→</div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <div style={styles.stepText}>계정 부여</div>
            </div>
            <div style={styles.stepArrow}>→</div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>4</div>
              <div style={styles.stepText}>서비스 이용</div>
            </div>
          </div>
        </div>

        {/* 하단 링크 */}
        <div style={styles.footer}>
          <p style={styles.footerText}>이미 계정이 있으신가요?</p>
          <Link to="/login" style={styles.loginLink}>
            로그인하기 →
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: 'calc(100vh - 200px)',
    backgroundColor: '#f8fafc',
    padding: '48px 24px',
  },
  content: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '48px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#fef3c7',
    color: '#d97706',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '16px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 12px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0,
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '48px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    border: '1px solid #e2e8f0',
  },
  cardIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 12px 0',
  },
  cardDesc: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.6,
    margin: '0 0 16px 0',
  },
  list: {
    margin: 0,
    padding: '0 0 0 20px',
    color: '#475569',
    fontSize: '14px',
    lineHeight: 1.8,
    marginBottom: '20px',
  },
  applyButton: {
    display: 'inline-block',
    width: '100%',
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    textAlign: 'center' as const,
    transition: 'background-color 0.2s',
    cursor: 'pointer',
  },
  processSection: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    border: '1px solid #e2e8f0',
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 24px 0',
    textAlign: 'center',
  },
  processSteps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  stepNumber: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 600,
  },
  stepText: {
    fontSize: '14px',
    color: '#64748b',
  },
  stepArrow: {
    color: '#cbd5e1',
    fontSize: '20px',
  },
  contactSection: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    border: '1px solid #e2e8f0',
    marginBottom: '32px',
    textAlign: 'center',
  },
  contactText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 24px 0',
  },
  contactInfo: {
    display: 'flex',
    justifyContent: 'center',
    gap: '48px',
    flexWrap: 'wrap',
  },
  contactItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  contactLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  contactValue: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#1e293b',
  },
  footer: {
    textAlign: 'center',
    padding: '24px',
  },
  footerText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 8px 0',
  },
  loginLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '16px',
  },
};
