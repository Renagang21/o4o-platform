/**
 * PartnersApplyPage - 참여 정책 안내 페이지
 *
 * WO-O4O-SUPPLIER-PARTNER-APPLICATION-UI-REDEFINE-V1
 *
 * 정책:
 * - 공급자/파트너 참여 신청은 서비스별로 받지 않음
 * - Neture는 모집 정보 허브 역할
 * - 서비스 연결 진입점 제거, 정책 안내만 제공
 */

import { Link } from 'react-router-dom';

const services = [
  {
    id: 'glycopharm',
    name: 'GlycoPharm',
    icon: '💊',
    description: '의약품 및 건강기능식품 유통',
  },
  {
    id: 'cosmetics',
    name: 'K-Cosmetics',
    icon: '💄',
    description: '화장품 브랜드 유통',
  },
  {
    id: 'glucoseview',
    name: 'GlucoseView',
    icon: '📊',
    description: '혈당 관리 솔루션',
  },
];

export default function PartnersApplyPage() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.badge}>참여 정책</span>
          <h1 style={styles.title}>공급자 / 파트너 참여 안내</h1>
          <p style={styles.subtitle}>
            Neture 플랫폼의 참여 구조와 정책을 안내합니다
          </p>
        </div>

        {/* 정책 안내 */}
        <div style={styles.policyBox}>
          <p style={styles.policyTitle}>참여 정책</p>
          <ul style={styles.policyList}>
            <li>공급자/파트너 참여 신청은 <strong>서비스별로 받지 않습니다.</strong></li>
            <li>공급자는 <strong>제품 공개 범위(전체/서비스별)</strong>를 설정합니다.</li>
            <li>파트너 모집은 <strong>각 서비스의 판매자 대시보드에서 제품별로 시작</strong>되며,
              Neture는 <strong>모집 정보 허브</strong> 역할을 합니다.</li>
            <li>판매자는 Neture에 접속하지 않아도 <strong>서비스 화면에서 구매</strong>합니다.</li>
          </ul>
        </div>

        {/* 연결 서비스 (정보만, 링크 없음) */}
        <div style={styles.cardGrid}>
          {services.map((service) => (
            <div key={service.id} style={styles.card}>
              <div style={styles.cardIcon}>{service.icon}</div>
              <h2 style={styles.cardTitle}>{service.name}</h2>
              <p style={styles.cardDesc}>{service.description}</p>
            </div>
          ))}
        </div>

        {/* 프로세스 안내 */}
        <div style={styles.processSection}>
          <h3 style={styles.sectionTitle}>참여 프로세스</h3>
          <div style={styles.processSteps}>
            <div style={styles.step}>
              <div style={styles.stepNumber}>1</div>
              <div style={styles.stepText}>공급자 등록</div>
              <div style={styles.stepSubtext}>Neture에 정보 등록</div>
            </div>
            <div style={styles.stepArrow}>→</div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>2</div>
              <div style={styles.stepText}>제품 공개 설정</div>
              <div style={styles.stepSubtext}>서비스별 공개 범위 결정</div>
            </div>
            <div style={styles.stepArrow}>→</div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>3</div>
              <div style={styles.stepText}>파트너 모집</div>
              <div style={styles.stepSubtext}>Neture 허브에서 노출</div>
            </div>
            <div style={styles.stepArrow}>→</div>
            <div style={styles.step}>
              <div style={styles.stepNumber}>4</div>
              <div style={styles.stepText}>판매 연결</div>
              <div style={styles.stepSubtext}>서비스 내에서 자동 연결</div>
            </div>
          </div>
        </div>

        {/* 하단 링크 */}
        <div style={styles.footer}>
          <Link to="/supplier-ops/partners/info" style={styles.backLink}>
            ← 참여 안내로 돌아가기
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
  policyBox: {
    padding: '24px 28px',
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    border: '1px solid #bfdbfe',
    marginBottom: '32px',
  },
  policyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e40af',
    margin: '0 0 12px 0',
  },
  policyList: {
    margin: 0,
    padding: '0 0 0 20px',
    color: '#1e293b',
    fontSize: '14px',
    lineHeight: 2,
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
    margin: '0 0 8px 0',
  },
  cardDesc: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.6,
    margin: 0,
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
  backLink: {
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '14px',
  },
};
