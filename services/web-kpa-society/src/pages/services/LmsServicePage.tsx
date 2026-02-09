/**
 * LmsServicePage - 콘텐츠 안내 상세 소개
 *
 * WO-KPA-HOME-SERVICE-SECTION-V1
 * WO-O4O-LMS-REFACTOR-V1: LMS 용어 제거, 중립적 표현으로 통일
 */

import React from 'react';
import { InfoPageLayout } from '../../components/platform/InfoPageLayout';

export function LmsServicePage() {
  return (
    <InfoPageLayout
      title="콘텐츠 안내"
      subtitle="약사 개인을 위한 콘텐츠 열람 및 진행 관리 서비스"
      badgeType="none"
      icon="📄"
    >
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>서비스 소개</h2>
        <p style={styles.paragraph}>
          약사 개인을 위한 콘텐츠 열람 및 진행 관리 서비스입니다.
          콘텐츠 열람과 진행 이력을 관리할 수 있습니다.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>누가 사용하나요?</h2>
        <ul style={styles.list}>
          <li>콘텐츠 확인이 필요한 약사</li>
          <li>정보를 습득하고 싶은 약사</li>
          <li>진행 기록 관리가 필요한 약사</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>무엇을 할 수 있나요?</h2>
        <ul style={styles.list}>
          <li>온라인 콘텐츠 열람</li>
          <li>안내 흐름 진행</li>
          <li>열람 이력 및 진행 관리</li>
          <li>완료 기록 관리</li>
          <li>맞춤형 콘텐츠 추천</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>이용 방법</h2>
        <p style={styles.paragraph}>
          회원 가입 후 콘텐츠를 검색하고 열람할 수 있습니다.
          마이페이지에서 진행 현황과 완료 이력을 확인할 수 있습니다.
        </p>
      </div>

      <div style={styles.ctaSection}>
        <a href="/lms" style={styles.ctaPrimary}>
          콘텐츠 서비스 이용하기
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
};

export default LmsServicePage;
