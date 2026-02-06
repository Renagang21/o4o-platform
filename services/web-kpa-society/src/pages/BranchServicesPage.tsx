/**
 * BranchServicesPage - 분회 서비스 안내 페이지
 *
 * WO-KPA-SOCIETY-MAIN-NAV-REFINE-V1: 서비스 단위 진입 중심 구조
 * WO-KPA-SOCIETY-SERVICE-STRUCTURE-BASELINE-V1: 분회 서비스 진입점
 *
 * 실제 분회 서비스 안내 및 진입 페이지
 * - 분회별 서비스 선택/안내
 * - 도입 안내
 */

import { Link } from 'react-router-dom';
import { Building2, Users, FileText, Calendar, ArrowRight } from 'lucide-react';

export function BranchServicesPage() {
  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <span style={styles.badge}>분회 서비스</span>
        <h1 style={styles.title}>분회 서비스 안내</h1>
        <p style={styles.subtitle}>
          각 분회를 위한 독립적인 운영 서비스입니다.
          <br />
          분회별 커뮤니티, 공지사항, 행사 관리 등을 지원합니다.
        </p>
      </div>

      <div style={styles.content}>
        {/* 서비스 기능 소개 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>주요 기능</h2>
          <div style={styles.featureGrid}>
            <div style={styles.featureCard}>
              <Building2 style={styles.featureIcon} />
              <h3 style={styles.featureTitle}>분회 전용 페이지</h3>
              <p style={styles.featureDesc}>분회별 독립 공간에서 정보와 소식을 공유합니다.</p>
            </div>
            <div style={styles.featureCard}>
              <Users style={styles.featureIcon} />
              <h3 style={styles.featureTitle}>회원 관리</h3>
              <p style={styles.featureDesc}>분회 회원 현황 파악 및 소통 채널을 제공합니다.</p>
            </div>
            <div style={styles.featureCard}>
              <FileText style={styles.featureIcon} />
              <h3 style={styles.featureTitle}>공지 및 자료</h3>
              <p style={styles.featureDesc}>공지사항, 회의록, 자료실을 운영합니다.</p>
            </div>
            <div style={styles.featureCard}>
              <Calendar style={styles.featureIcon} />
              <h3 style={styles.featureTitle}>행사 관리</h3>
              <p style={styles.featureDesc}>분회 행사 일정을 관리하고 안내합니다.</p>
            </div>
          </div>
        </section>

        {/* 분회 선택 안내 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>분회 서비스 이용</h2>
          <div style={styles.infoCard}>
            <p style={styles.infoText}>
              분회 서비스는 각 지역 약사분회에서 독립적으로 운영됩니다.
              <br />
              소속 분회의 서비스 이용은 해당 분회 관리자에게 문의해주세요.
            </p>
            <div style={styles.actionButtons}>
              <Link to="/demo/branch/demo-branch" style={styles.secondaryButton}>
                데모 서비스 체험하기
                <ArrowRight style={{ width: 16, height: 16 }} />
              </Link>
            </div>
          </div>
        </section>

        {/* 도입 안내 */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>도입 문의</h2>
          <div style={styles.contactCard}>
            <p style={styles.contactText}>
              분회 서비스 도입에 관심이 있으신 분회 담당자께서는
              <br />
              아래 연락처로 문의해주세요.
            </p>
            <div style={styles.contactInfo}>
              <span>📧 kpa-society@example.com</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: 'calc(100vh - 70px)',
    backgroundColor: '#f8fafc',
  },
  hero: {
    backgroundColor: '#fff',
    padding: '48px 20px',
    textAlign: 'center',
    borderBottom: '1px solid #e2e8f0',
  },
  badge: {
    display: 'inline-block',
    padding: '6px 16px',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '20px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 12px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
    lineHeight: 1.6,
    margin: 0,
  },
  content: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '20px',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  featureCard: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  featureIcon: {
    width: '32px',
    height: '32px',
    color: '#2563eb',
    marginBottom: '12px',
  },
  featureTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 8px',
  },
  featureDesc: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  infoText: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.7,
    margin: '0 0 20px',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'background-color 0.2s',
  },
  contactCard: {
    backgroundColor: '#f0f9ff',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #bae6fd',
  },
  contactText: {
    fontSize: '15px',
    color: '#0c4a6e',
    lineHeight: 1.7,
    margin: '0 0 16px',
  },
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '14px',
    color: '#0369a1',
    fontWeight: 500,
  },
};

export default BranchServicesPage;
