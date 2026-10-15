/**
 * PharmacyJoinPage - 약국 참여 안내
 *
 * WO-KPA-HOME-SERVICE-SECTION-V1
 *
 * 대상: 개별 약국
 * 내용: 기본 서비스, 참여 방법
 */

import React from 'react';
import { InfoPageLayout } from '../../components/platform/InfoPageLayout';
import { JoinInquiryForm } from '../../components/platform/JoinInquiryForm';

export function PharmacyJoinPage() {
  return (
    <InfoPageLayout
      title="약국 서비스 참여 안내"
      subtitle="약국별 맞춤 서비스 이용 방법"
      icon="💊"
    >
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>참여 대상</h2>
        <p style={styles.paragraph}>
          약사회 회원 약국이라면 누구나 참여할 수 있습니다.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>기본 서비스</h2>
        <p style={styles.paragraph}>
          회원 가입 후 바로 이용할 수 있는 기본 서비스입니다.
        </p>
        <ul style={styles.list}>
          <li>포럼 및 커뮤니티 이용</li>
          <li>이벤트 참여</li>
          <li>교육 서비스 이용</li>
          <li>자료실 및 정보 열람</li>
          <li>약국 정보 관리</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>참여 방법</h2>
        <ol style={styles.orderedList}>
          <li>
            <strong>회원 가입</strong>
            <p style={styles.stepDesc}>플랫폼에 회원 가입합니다.</p>
          </li>
          <li>
            <strong>약국 정보 등록</strong>
            <p style={styles.stepDesc}>약국 기본 정보를 등록합니다.</p>
          </li>
          <li>
            <strong>서비스 이용</strong>
            <p style={styles.stepDesc}>기본 서비스를 바로 이용할 수 있습니다.</p>
          </li>
        </ol>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>참여 문의</h2>
        <p style={styles.paragraph}>
          약국 서비스 이용에 관해 궁금한 점이 있으시면 아래 양식을 통해 문의해 주세요.
          담당자가 확인 후 연락드리겠습니다.
        </p>
        <JoinInquiryForm inquiryType="pharmacy" />
      </div>

      <div style={styles.ctaSection} className="flex-wrap">
        <a href="/register" style={styles.ctaPrimary}>
          회원 가입하기
        </a>
        <a href="/services/pharmacy" style={styles.ctaSecondary}>
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

export default PharmacyJoinPage;
