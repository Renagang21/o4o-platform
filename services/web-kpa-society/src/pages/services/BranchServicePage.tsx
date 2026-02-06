/**
 * BranchServicePage - 약사회 지부 서비스 상세 소개
 *
 * WO-KPA-HOME-SERVICE-SECTION-V1
 *
 * 페이지 목적: 지부가 실제로 도입하면 무엇을 얻게 되는가를 보여주는 페이지
 */

import React from 'react';
import { InfoPageLayout } from '../../components/platform/InfoPageLayout';

export function BranchServicePage() {
  return (
    <InfoPageLayout
      title="약사회 지부 서비스"
      subtitle="지부를 위한 전용 SaaS 서비스"
      badgeType="demo"
      icon="🏛️"
    >
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>서비스 소개</h2>
        <p style={styles.paragraph}>
          약사회 지부를 위한 전용 SaaS 서비스입니다.
          지부 단위의 운영과 회원 소통을 독립적인 도메인 환경에서 운영할 수 있도록 설계되었습니다.
        </p>
        <p style={styles.paragraph}>
          현재는 실제 도입 지부가 없어 전체 기능을 갖춘 데모 형태로 제공되고 있습니다.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>누가 사용하나요?</h2>
        <ul style={styles.list}>
          <li>광역시·도 약사회 (지부)</li>
          <li>지부 사무국 운영 담당자</li>
          <li>지부 임원진</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>무엇을 할 수 있나요?</h2>
        <ul style={styles.list}>
          <li>지부 전용 홈페이지 운영</li>
          <li>회원 관리 및 소통</li>
          <li>공지사항 및 소식 발행</li>
          <li>분회 정보 통합 관리</li>
          <li>행사 및 교육 안내</li>
          <li>자료실 및 문서 관리</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>도입 방식</h2>
        <p style={styles.paragraph}>
          지부별 독립 도메인으로 운영되며, 도입 시 맞춤 설정이 가능합니다.
          현재 데모 환경에서 전체 기능을 미리 체험해보실 수 있습니다.
        </p>
      </div>

      <div style={styles.ctaSection}>
        <a href="/branch-services/demo" style={styles.ctaPrimary}>
          데모 화면 보기
        </a>
        <a href="/join/branch" style={styles.ctaSecondary}>
          도입 문의
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

export default BranchServicePage;
