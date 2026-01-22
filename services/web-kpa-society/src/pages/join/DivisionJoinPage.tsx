/**
 * DivisionJoinPage - 분회 참여 안내
 *
 * WO-KPA-HOME-SERVICE-SECTION-V1
 *
 * 대상: 분회
 * 내용: 지부와 무관한 독립 운영, 포워딩 도메인 사용, 즉시 사용 가능
 */

import React from 'react';
import { InfoPageLayout } from '../../components/platform/InfoPageLayout';
import { JoinInquiryForm } from '../../components/platform/JoinInquiryForm';

export function DivisionJoinPage() {
  return (
    <InfoPageLayout
      title="분회 서비스 참여 안내"
      subtitle="지부와 독립적으로 바로 사용할 수 있습니다"
      badgeType="independent"
      icon="🏢"
    >
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>참여 대상</h2>
        <p style={styles.paragraph}>
          시·군·구 약사회(분회)에서 자체적인 온라인 공간을 운영하고자 하는 경우
        </p>
      </div>

      <div style={styles.highlightBox}>
        <h3 style={styles.highlightTitle}>지부 도입과 무관하게 독립 이용 가능</h3>
        <p style={styles.highlightText}>
          분회 서비스는 지부의 플랫폼 도입 여부와 관계없이 독립적으로 이용할 수 있습니다.
          분회별로 각자 운영하며, 다른 분회와 별도로 관리됩니다.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>이용 방식</h2>
        <ul style={styles.list}>
          <li>분회별 독립 공간 제공</li>
          <li>분회 고유 도메인 포워딩 가능</li>
          <li>분회 임원 및 회원 관리</li>
          <li>공지, 행사, 공동구매 등 자체 운영</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>참여 절차</h2>
        <ol style={styles.orderedList}>
          <li>
            <strong>참여 신청</strong>
            <p style={styles.stepDesc}>분회 명의로 참여 신청을 접수합니다.</p>
          </li>
          <li>
            <strong>분회 정보 등록</strong>
            <p style={styles.stepDesc}>분회 기본 정보와 임원 정보를 등록합니다.</p>
          </li>
          <li>
            <strong>관리자 계정 발급</strong>
            <p style={styles.stepDesc}>분회 관리를 위한 관리자 계정을 발급받습니다.</p>
          </li>
          <li>
            <strong>서비스 이용 시작</strong>
            <p style={styles.stepDesc}>바로 서비스를 이용할 수 있습니다.</p>
          </li>
        </ol>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>도메인 포워딩</h2>
        <p style={styles.paragraph}>
          분회 고유 도메인이 있는 경우, 해당 도메인을 플랫폼 분회 페이지로 포워딩하여
          분회 전용 주소로 접근할 수 있도록 설정할 수 있습니다.
        </p>
        <div style={styles.exampleBox}>
          <p style={styles.exampleLabel}>예시:</p>
          <p style={styles.exampleText}>
            gangnam-pharm.kr → kpa-platform.kr/branch/gangnam
          </p>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>참여 문의</h2>
        <p style={styles.paragraph}>
          분회 서비스 참여에 관심이 있으시면 아래 양식을 통해 문의해 주세요.
          담당자가 확인 후 연락드리겠습니다.
        </p>
        <JoinInquiryForm inquiryType="division" />
      </div>

      <div style={styles.ctaSection}>
        <a href="/demo/branch/demo-branch" style={styles.ctaPrimary}>
          분회 서비스 시작하기
        </a>
        <a href="/services/division" style={styles.ctaSecondary}>
          서비스 소개로 돌아가기
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
  orderedList: {
    fontSize: '1rem',
    color: '#475569',
    lineHeight: 1.6,
    margin: 0,
    paddingLeft: '20px',
  },
  stepDesc: {
    fontSize: '0.9375rem',
    color: '#64748b',
    margin: '4px 0 16px 0',
  },
  highlightBox: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '32px',
  },
  highlightTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#065f46',
    margin: '0 0 8px 0',
  },
  highlightText: {
    fontSize: '0.9375rem',
    color: '#047857',
    margin: 0,
    lineHeight: 1.6,
  },
  exampleBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '12px',
  },
  exampleLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#64748b',
    margin: '0 0 4px 0',
  },
  exampleText: {
    fontSize: '0.9375rem',
    color: '#334155',
    fontFamily: 'monospace',
    margin: 0,
  },
  contactBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '12px',
  },
  contactItem: {
    fontSize: '0.9375rem',
    color: '#475569',
    margin: '0 0 8px 0',
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

export default DivisionJoinPage;
