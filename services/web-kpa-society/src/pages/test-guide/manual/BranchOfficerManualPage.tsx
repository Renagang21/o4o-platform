/**
 * BranchOfficerManualPage - 분회 임원 역할 매뉴얼
 * WO-ROLE-MANUALS-COPY-V1 기준
 *
 * 분회 임원은 직책만 보유하며 관리 권한은 없습니다.
 * (권한 vs 직책 구분: docs/app-guidelines/kpa-auth-role-position-principles.md)
 */

import { Link } from 'react-router-dom';
import TestGuideLayout from '../../../components/layouts/TestGuideLayout';

export default function BranchOfficerManualPage() {
  return (
    <TestGuideLayout title="분회 임원 매뉴얼" subtitle="약사회 SaaS 분회 임원 가이드">
      {/* 이 역할은 무엇을 하는가 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>분회 임원은 무엇을 하나요?</h2>
        <p style={styles.text}>
          분회 임원은 약사회의 <strong>분회 단위 임원 직책을 가진 회원</strong>입니다.
          일반 회원과 동일한 서비스를 이용하면서, 분회 임원 전용 정보에 접근할 수 있습니다.
        </p>
        <div style={styles.highlight}>
          <strong>참고:</strong> 임원은 "직책"만 있고 관리 "권한"은 없습니다.
          관리 기능이 필요하면 운영자(branch_admin)로 문의하세요.
        </div>
      </section>

      {/* 로그인 후 가장 먼저 보게 되는 화면 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>로그인 후 첫 화면</h2>
        <p style={styles.text}>
          로그인하면 <strong>홈페이지(대시보드)</strong>로 이동합니다.
          일반 회원과 동일하게 공지사항, 교육, 공동구매 등을 확인할 수 있습니다.
        </p>
      </section>

      {/* 자주 사용하는 기능 3가지 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>자주 사용하는 기능</h2>
        <div style={styles.featureList}>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>1</span>
            <div>
              <strong>분회 공지 확인</strong>
              <p style={styles.featureDesc}>소속 분회의 공지사항을 확인합니다.</p>
            </div>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>2</span>
            <div>
              <strong>포럼 참여</strong>
              <p style={styles.featureDesc}>약사 간 정보 공유 및 토론에 참여합니다.</p>
            </div>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>3</span>
            <div>
              <strong>교육/공동구매</strong>
              <p style={styles.featureDesc}>온라인 교육 수강 및 공동구매에 참여합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 이번 테스트에서 안 해도 되는 것 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>이번 테스트에서 안 해도 되는 것</h2>
        <ul style={styles.skipList}>
          <li>관리 기능 접근 (임원 직책은 관리 권한이 없습니다)</li>
          <li>실제 결제</li>
          <li>회원 정보 변경</li>
        </ul>
        <p style={styles.notice}>※ 테스트 환경은 실제 서비스와 다를 수 있습니다.</p>
      </section>

      {/* 연결 문구 */}
      <div style={styles.footer}>
        <Link to="/test-guide" style={styles.footerLink}>← 테스트 가이드로 돌아가기</Link>
        <p style={styles.footerText}>의견은 테스트 포럼에 남겨주세요</p>
      </div>
    </TestGuideLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '16px',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 12px 0',
  },
  text: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.7,
    margin: 0,
  },
  highlight: {
    marginTop: '12px',
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#92400e',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  featureItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  featureNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    backgroundColor: '#f59e0b',
    color: '#fff',
    borderRadius: '50%',
    fontSize: '13px',
    fontWeight: 600,
    flexShrink: 0,
    marginTop: '2px',
  },
  featureDesc: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  skipList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#64748b',
    fontSize: '14px',
    lineHeight: 1.8,
  },
  notice: {
    marginTop: '12px',
    fontSize: '13px',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  footer: {
    textAlign: 'center',
    padding: '16px 0',
  },
  footerLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  footerText: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#64748b',
  },
};
