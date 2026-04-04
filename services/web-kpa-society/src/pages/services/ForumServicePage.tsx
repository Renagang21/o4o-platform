/**
 * ForumServicePage - 약사 포럼 상세 소개
 *
 * WO-KPA-HOME-SERVICE-SECTION-V1
 */

import React from 'react';
import { InfoPageLayout } from '../../components/platform/InfoPageLayout';

export function ForumServicePage() {
  return (
    <InfoPageLayout
      title="약사 포럼"
      subtitle="약사를 위한 전용 커뮤니티"
      badgeType="none"
      icon="💬"
    >
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>서비스 소개</h2>
        <p style={styles.paragraph}>
          약사를 위한 전용 커뮤니티 서비스입니다.
          주제별 포럼을 통해 정보 공유와 소통이 가능합니다.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>누가 사용하나요?</h2>
        <ul style={styles.list}>
          <li>약사 회원 누구나</li>
          <li>개국약사, 근무약사, 기업약사 등 모든 직능</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>무엇을 할 수 있나요?</h2>
        <ul style={styles.list}>
          <li>주제별 포럼에서 정보 교류</li>
          <li>업무 관련 질문 및 답변</li>
          <li>동료 약사와의 네트워킹</li>
          <li>최신 약업 정보 공유</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>이용 방법</h2>
        <p style={styles.paragraph}>
          회원 가입 후 바로 포럼을 이용할 수 있습니다.
          글 작성, 댓글, 좋아요 등의 활동에 참여해 보세요.
        </p>
      </div>

      <div style={styles.ctaSection}>
        <a href="/forum" style={styles.ctaPrimary}>
          포럼 이용하기
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

export default ForumServicePage;
