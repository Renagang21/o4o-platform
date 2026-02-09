/**
 * PharmacyServicePage - 약국 서비스 상세 소개
 *
 * WO-KPA-HOME-SERVICE-SECTION-V1
 *
 * 페이지 목적: 약국이 "내가 쓸 수 있는 서비스인가"를 판단
 */

import React from 'react';
import { InfoPageLayout } from '../../components/platform/InfoPageLayout';

export function PharmacyServicePage() {
  return (
    <InfoPageLayout
      title="약국 서비스"
      subtitle="개별 약국을 위한 서비스 환경"
      badgeType="none"
      icon="💊"
    >
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>서비스 소개</h2>
        <p style={styles.paragraph}>
          개별 약국을 위한 서비스 운영 환경을 제공합니다.
          약국별 전용 대시보드를 통해 필요한 서비스와 프로그램을 선택적으로 이용할 수 있습니다.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>누가 사용하나요?</h2>
        <ul style={styles.list}>
          <li>개국 약사</li>
          <li>약국 관리 담당자</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>무엇을 할 수 있나요?</h2>
        <ul style={styles.list}>
          <li>약국 정보 관리</li>
          <li>회원 서비스 이용</li>
          <li>공동구매 참여</li>
          <li>교육 및 자격증 관리</li>
          <li>포럼 및 커뮤니티 활동</li>
        </ul>
      </div>

      {/* 혈당관리 프로그램 섹션 */}
      <div style={styles.programSection}>
        <div style={styles.programHeader}>
          <span style={styles.programIcon}>🩸</span>
          <h3 style={styles.programTitle}>혈당관리 프로그램</h3>
          <span style={styles.programBadge}>선택 참여</span>
        </div>
        <p style={styles.programDescription}>
          혈당관리 프로그램은 약국 서비스 내에서 선택적으로 참여하는 특화 프로그램입니다.
          약국 기반 혈당관리 서비스를 제공할 수 있으며, 참여를 원하시는 경우 별도 신청이 필요합니다.
        </p>
        <a href="/info/glucose-program" style={styles.programLink}>
          프로그램 안내 →
        </a>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>이용 방식</h2>
        <p style={styles.paragraph}>
          약사회 회원이라면 누구나 약국 서비스를 이용할 수 있습니다.
          기본 서비스는 회원 가입 후 바로 이용 가능하며, 특화 프로그램은 별도 참여 신청을 통해 이용할 수 있습니다.
        </p>
      </div>

      <div style={styles.ctaSection}>
        <a href="/mypage" style={styles.ctaPrimary}>
          약국 서비스 안내
        </a>
        <a href="/join/pharmacy" style={styles.ctaSecondary}>
          참여 문의
        </a>
      </div>
    </InfoPageLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 12px 0',
  },
  paragraph: {
    fontSize: '1rem',
    color: '#475569',
    lineHeight: 1.7,
    margin: '0 0 12px 0',
  },
  list: {
    fontSize: '1rem',
    color: '#475569',
    lineHeight: 1.8,
    margin: 0,
    paddingLeft: '20px',
  },
  programSection: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '32px',
  },
  programHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  programIcon: {
    fontSize: '1.5rem',
  },
  programTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0f172a',
    margin: 0,
  },
  programBadge: {
    fontSize: '0.75rem',
    fontWeight: 500,
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    padding: '4px 8px',
    borderRadius: '12px',
  },
  programDescription: {
    fontSize: '0.9375rem',
    color: '#475569',
    lineHeight: 1.6,
    margin: '0 0 12px 0',
  },
  programLink: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: '#2563eb',
    textDecoration: 'none',
  },
  ctaSection: {
    display: 'flex',
    gap: '12px',
    marginTop: '40px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  ctaPrimary: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#2563eb',
    color: '#fff',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 500,
    textDecoration: 'none',
  },
  ctaSecondary: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 500,
    textDecoration: 'none',
  },
};

export default PharmacyServicePage;
