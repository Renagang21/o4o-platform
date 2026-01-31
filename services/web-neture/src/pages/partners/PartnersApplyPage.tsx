/**
 * PartnersApplyPage - 공급자/파트너 참여 안내 페이지
 *
 * Work Order: WO-NETURE-EXTENSION-P1
 *
 * Neture 책임 선언:
 * - Neture는 중앙 신청 시스템이 아님
 * - 신청은 각 서비스에서 직접 처리
 * - 이 페이지는 안내 + 외부 링크만 제공 (Read-Only)
 */

import { Link } from 'react-router-dom';

// 서비스별 신청 링크 정보
const serviceApplications = [
  {
    id: 'glycopharm',
    name: 'GlycoPharm',
    icon: '💊',
    description: '약국 공급자로 참여하여 의약품 및 건강기능식품을 공급합니다.',
    applicationUrl: 'https://glycopharm.co.kr/partners/apply',
    features: ['의약품/건강기능식품 공급', '약국 네트워크 연동', '정산 시스템'],
  },
  {
    id: 'cosmetics',
    name: 'K-Cosmetics',
    icon: '💄',
    description: '화장품 브랜드로 참여하여 국내 유통망에 입점합니다.',
    applicationUrl: 'https://k-cosmetics.site/partners/apply',
    features: ['화장품 브랜드 입점', '유통 채널 연동', '마케팅 지원'],
  },
  {
    id: 'glucoseview',
    name: 'GlucoseView',
    icon: '📊',
    description: '혈당 관리 솔루션 파트너로 참여합니다.',
    applicationUrl: 'https://glucoseview.co.kr/partners/apply',
    features: ['CGM 디바이스 연동', '건강 데이터 분석', '환자 관리'],
  },
];

export default function PartnersApplyPage() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.badge}>안내</span>
          <h1 style={styles.title}>공급자 / 파트너 참여 안내</h1>
          <p style={styles.subtitle}>
            Neture 플랫폼의 각 서비스에서 직접 신청하세요
          </p>
        </div>

        {/* 안내 메시지 */}
        <div style={styles.noticeBox}>
          <div style={styles.noticeIcon}>ℹ️</div>
          <div>
            <p style={styles.noticeTitle}>신청 안내</p>
            <p style={styles.noticeText}>
              공급자/파트너 신청은 각 서비스에서 개별적으로 진행됩니다.
              아래에서 참여하고자 하는 서비스를 선택하여 해당 서비스의 신청 페이지로 이동하세요.
            </p>
          </div>
        </div>

        {/* 서비스별 신청 카드 */}
        <div style={styles.cardGrid}>
          {serviceApplications.map((service) => (
            <div key={service.id} style={styles.card}>
              <div style={styles.cardIcon}>{service.icon}</div>
              <h2 style={styles.cardTitle}>{service.name}</h2>
              <p style={styles.cardDesc}>{service.description}</p>
              <ul style={styles.list}>
                {service.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
              <a
                href={service.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.applyButton}
              >
                {service.name}에서 신청하기 ↗
              </a>
            </div>
          ))}
        </div>

        {/* 프로세스 안내 */}
        <div style={styles.processSection}>
          <h3 style={styles.sectionTitle}>참여 프로세스</h3>
          <div style={styles.processSteps}>
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <div style={styles.stepText}>서비스 선택</div>
              <div style={styles.stepSubtext}>참여할 서비스 선택</div>
            </div>
            <div style={styles.stepArrow}>→</div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <div style={styles.stepText}>해당 서비스 신청</div>
              <div style={styles.stepSubtext}>서비스 페이지에서 직접 신청</div>
            </div>
            <div style={styles.stepArrow}>→</div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <div style={styles.stepText}>심사 및 승인</div>
              <div style={styles.stepSubtext}>각 서비스에서 처리</div>
            </div>
            <div style={styles.stepArrow}>→</div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>4</div>
              <div style={styles.stepText}>서비스 이용</div>
              <div style={styles.stepSubtext}>계정 부여 후 이용</div>
            </div>
          </div>
        </div>

        {/* 문의 안내 */}
        <div style={styles.contactSection}>
          <h3 style={styles.sectionTitle}>문의하기</h3>
          <p style={styles.contactText}>
            신청 관련 문의는 각 서비스의 고객센터로 연락해 주세요.
          </p>
          <div style={styles.contactInfo}>
            <div style={styles.contactItem}>
              <span style={styles.contactLabel}>이메일</span>
              <span style={styles.contactValue}>partners@neture.co.kr</span>
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
    maxWidth: '1000px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#e2e8f0',
    color: '#475569',
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
  noticeBox: {
    display: 'flex',
    gap: '16px',
    padding: '20px 24px',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    marginBottom: '32px',
  },
  noticeIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  noticeTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  noticeText: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.6,
    margin: 0,
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '48px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '28px',
    border: '1px solid #e2e8f0',
  },
  cardIcon: {
    fontSize: '40px',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '18px',
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
    padding: '12px 20px',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    textAlign: 'center' as const,
  },
  processSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
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
    minWidth: '100px',
  },
  stepNumber: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
  },
  stepText: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
  },
  stepSubtext: {
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
  },
  stepArrow: {
    color: '#cbd5e1',
    fontSize: '18px',
    marginTop: '8px',
  },
  contactSection: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '32px',
    border: '1px solid #e2e8f0',
    marginBottom: '32px',
    textAlign: 'center',
  },
  contactText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 20px 0',
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
