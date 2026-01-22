/**
 * BranchJoinPage - 지부 참여/도입 안내
 *
 * WO-KPA-HOME-SERVICE-SECTION-V1
 *
 * 대상: 약사회 지부
 * 내용: 도입 전 검토, 데모 사용, 도입 절차
 */

import React from 'react';
import { InfoPageLayout } from '../../components/platform/InfoPageLayout';

export function BranchJoinPage() {
  return (
    <InfoPageLayout
      title="지부 서비스 도입 안내"
      subtitle="약사회 지부를 위한 SaaS 서비스 도입 절차"
      badgeType="demo"
      icon="🏛️"
    >
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>도입 대상</h2>
        <p style={styles.paragraph}>
          광역시·도 약사회(지부)에서 회원 관리 및 운영을 위한 전용 서비스를 도입하고자 하는 경우
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>도입 전 검토 사항</h2>
        <ul style={styles.list}>
          <li>지부별 독립 도메인 운영 여부</li>
          <li>기존 홈페이지 이전 또는 신규 구축 선택</li>
          <li>관리자 및 담당자 지정</li>
          <li>회원 데이터 이관 필요 여부</li>
        </ul>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>데모 사용 안내</h2>
        <p style={styles.paragraph}>
          현재 전체 기능을 갖춘 데모 환경을 제공하고 있습니다.
          실제 도입 전에 데모 환경에서 기능을 충분히 체험해 보시기 바랍니다.
        </p>
        <div style={styles.demoBox}>
          <p style={styles.demoText}>
            데모 환경에서 지부 관리, 공지 발행, 회원 소통 등의 기능을 직접 확인하실 수 있습니다.
          </p>
          <a href="/demo" style={styles.demoLink}>
            데모 환경 둘러보기 →
          </a>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>도입 절차</h2>
        <ol style={styles.orderedList}>
          <li>
            <strong>문의 접수</strong>
            <p style={styles.stepDesc}>도입을 원하시는 지부에서 문의를 접수합니다.</p>
          </li>
          <li>
            <strong>요구사항 협의</strong>
            <p style={styles.stepDesc}>도메인, 기능 범위, 데이터 이관 등을 협의합니다.</p>
          </li>
          <li>
            <strong>환경 구성</strong>
            <p style={styles.stepDesc}>지부 전용 환경을 구성하고 초기 설정을 진행합니다.</p>
          </li>
          <li>
            <strong>관리자 교육</strong>
            <p style={styles.stepDesc}>담당자 대상 사용 교육을 진행합니다.</p>
          </li>
          <li>
            <strong>정식 운영</strong>
            <p style={styles.stepDesc}>도입 완료 후 정식 서비스를 시작합니다.</p>
          </li>
        </ol>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>문의</h2>
        <p style={styles.paragraph}>
          도입에 관심이 있으시거나 궁금한 점이 있으시면 아래로 문의해 주세요.
        </p>
        <div style={styles.contactBox}>
          <p style={styles.contactItem}>📧 이메일: contact@kpa-platform.kr</p>
          <p style={styles.contactItem}>📞 전화: 02-XXX-XXXX</p>
        </div>
      </div>

      <div style={styles.ctaSection}>
        <a href="/demo" style={styles.ctaPrimary}>
          데모 환경 보기
        </a>
        <a href="/services/branch" style={styles.ctaSecondary}>
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
  demoBox: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '12px',
  },
  demoText: {
    fontSize: '0.9375rem',
    color: '#0369a1',
    margin: '0 0 8px 0',
  },
  demoLink: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: '#2563eb',
    textDecoration: 'none',
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

export default BranchJoinPage;
