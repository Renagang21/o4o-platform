/**
 * DivisionServicePage - 분회 서비스 상세 소개
 *
 * WO-KPA-HOME-SERVICE-SECTION-V1
 *
 * 페이지 목적: 지부와 무관하게 분회가 바로 쓸 수 있다는 확신 제공
 */

import React from 'react';
import { InfoPageLayout } from '../../components/platform/InfoPageLayout';

export function DivisionServicePage() {
  return (
    <InfoPageLayout
      title="분회 서비스"
      subtitle="분회를 위한 독립 운영 서비스"
      badgeType="independent"
      icon="🏢"
    >
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>서비스 소개</h2>
        <p style={styles.paragraph}>
          분회가 지부 도입 여부와 관계없이 자체적으로 운영할 수 있는 서비스입니다.
        </p>
        <p style={styles.paragraph}>
          여러 분회가 각자 독립적으로 이용 가능하며, 도메인은 포워딩 방식으로 운영할 수 있습니다.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>누가 사용하나요?</h2>
        <ul style={styles.list}>
          <li>시·군·구 약사회 (분회)</li>
          <li>분회 임원진 및 담당자</li>
          <li>분회 소속 회원 약사</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>무엇을 할 수 있나요?</h2>
        <ul style={styles.list}>
          <li>분회 전용 페이지 운영</li>
          <li>회원 소통 및 공지</li>
          <li>분회 행사 및 모임 안내</li>
          <li>공동구매 진행</li>
          <li>포럼 및 커뮤니티 활동</li>
          <li>자료 공유</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>이용 방식</h2>
        <p style={styles.paragraph}>
          분회별로 독립적인 공간이 제공되며, 지부 도입 여부와 무관하게 바로 사용할 수 있습니다.
          분회 고유 도메인을 포워딩하여 운영하는 것도 가능합니다.
        </p>
      </div>

      <div style={styles.ctaSection}>
        <a href="/branch-services/demo" style={styles.ctaPrimary}>
          분회 서비스 시작하기
        </a>
        <a href="/join/division" style={styles.ctaSecondary}>
          운영 방식 안내
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

export default DivisionServicePage;
