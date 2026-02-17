/**
 * AdminManualPage - 운영자 역할 매뉴얼 (내부용)
 * WO-TEST-GUIDE-AND-MANUALS-V1 기준
 *
 * 접근 제어: admin 역할만 접근 가능 (district_admin, branch_admin)
 */

import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts';
import TestGuideLayout from '../../../components/layouts/TestGuideLayout';

export default function AdminManualPage() {
  const { user, isAuthenticated } = useAuth();

  // 권한 체크: admin 역할만 접근 가능
  const adminRoles = ['admin', 'district_admin', 'branch_admin'];
  if (!isAuthenticated || !user?.roles.some(r => adminRoles.includes(r))) {
    return <Navigate to="/test-guide" replace />;
  }

  return (
    <TestGuideLayout title="운영자 매뉴얼" subtitle="약사회 SaaS 관리 가이드 (내부용)">
      {/* 내부용 경고 */}
      <div style={styles.warning}>
        이 문서는 내부 운영자 전용입니다. 외부 공개 금지.
      </div>

      {/* 이 역할은 무엇을 하는가 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>운영자는 무엇을 하나요?</h2>
        <p style={styles.text}>
          운영자는 약사회 SaaS <strong>지부 또는 분회를 관리</strong>하는 역할입니다.
          공지 작성, 회원 관리, 교육 관리, 공동구매 설정을 담당합니다.
        </p>
        <div style={styles.roleTypes}>
          <div style={styles.roleType}>
            <strong>지부 운영자</strong>: 전체 지부 및 소속 분회 관리
          </div>
          <div style={styles.roleType}>
            <strong>분회 운영자</strong>: 해당 분회만 관리
          </div>
        </div>
      </section>

      {/* 로그인 후 가장 먼저 보게 되는 화면 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>로그인 후 첫 화면</h2>
        <p style={styles.text}>
          로그인하면 <strong>관리자 대시보드</strong>로 이동합니다.
          회원 현황, 최근 게시물, 진행 중인 공동구매 등을 확인할 수 있습니다.
        </p>
      </section>

      {/* 자주 사용하는 기능 3가지 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>자주 사용하는 기능</h2>
        <div style={styles.featureList}>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>1</span>
            <div>
              <strong>공지 관리</strong>
              <p style={styles.featureDesc}>공지사항을 작성하고 회원에게 공유합니다.</p>
            </div>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>2</span>
            <div>
              <strong>회원 관리</strong>
              <p style={styles.featureDesc}>소속 회원 목록을 확인하고 관리합니다.</p>
            </div>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>3</span>
            <div>
              <strong>공동구매 설정</strong>
              <p style={styles.featureDesc}>공동구매를 등록하고 신청을 관리합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 테스트 운영 시 주의사항 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>테스트 운영 시 주의사항</h2>
        <ul style={styles.noteList}>
          <li><strong>테스트 포럼 관리</strong>: 테스터 의견을 주기적으로 확인하고 정리합니다.</li>
          <li><strong>계정/역할 대응</strong>: 테스터 요청 시 역할 변경을 지원합니다.</li>
          <li><strong>데이터 초기화</strong>: 필요 시 테스트 데이터를 초기화합니다.</li>
          <li><strong>이슈 기록</strong>: 발견된 버그와 개선점을 문서화합니다.</li>
        </ul>
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
  warning: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#dc2626',
    fontWeight: 500,
    textAlign: 'center',
  },
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
  roleTypes: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  roleType: {
    fontSize: '14px',
    color: '#64748b',
    padding: '8px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
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
    backgroundColor: '#ef4444',
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
  noteList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#475569',
    fontSize: '14px',
    lineHeight: 2,
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
