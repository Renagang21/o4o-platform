/**
 * TestGuidePage - KPA-Society 테스트 가이드 메인 페이지
 * WO-TEST-GUIDE-UI-LAYOUT-V1 / WO-TEST-GUIDE-AND-MANUALS-V1 기준
 */

import { Link } from 'react-router-dom';
import TestGuideLayout from '../../components/layouts/TestGuideLayout';

// 서비스별 설정
const SERVICE_CONFIG = {
  name: 'KPA-Society (약사회 SaaS)',
  testPurpose: '지부·분회 회원 관리, 교육 신청, 공동구매 등 약사회 운영을 지원하는 SaaS 플랫폼입니다. 이번 테스트에서는 회원 정보 확인, 게시판 탐색, 운영자 관리 메뉴 접근이 명확한지 점검합니다.',
  actions: [
    '로그인 화면에서 약사 또는 운영자 계정을 선택하고 로그인하세요',
    '회원 정보, 게시판, 교육/공동구매 메뉴를 탐색해 보세요',
    '운영자 계정은 관리 메뉴에 접근되는지 확인해 주세요',
  ],
  roles: [
    { key: 'pharmacist', label: '약사', description: '회원 서비스 이용 (게시판, 교육, 공동구매)' },
    { key: 'district_officer', label: '지부 임원', description: '직책만 보유, 권한 없음' },
    { key: 'branch_officer', label: '분회 임원', description: '직책만 보유, 권한 없음' },
    { key: 'admin', label: '운영자', description: '지부/분회 관리 및 회원 관리', internal: true },
  ],
};

export default function TestGuidePage() {
  return (
    <TestGuideLayout subtitle="테스트 데이터는 초기화될 수 있습니다">
      {/* 테스트 목적 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>이번 테스트의 목적</h2>
        <p style={styles.purpose}>{SERVICE_CONFIG.testPurpose}</p>
      </section>

      {/* 꼭 해주었으면 하는 행동 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>꼭 해주었으면 하는 행동</h2>
        <ol style={styles.actionList}>
          {SERVICE_CONFIG.actions.map((action, index) => (
            <li key={index} style={styles.actionItem}>
              <span style={styles.actionNumber}>{index + 1}</span>
              {action}
            </li>
          ))}
        </ol>
      </section>

      {/* 테스트 계정 안내 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>테스트 계정 안내</h2>
        <div style={styles.accountInfo}>
          <p style={styles.accountText}>
            테스트 계정은 <Link to="/login" style={styles.link}>로그인 화면</Link>에서 버튼으로 자동 입력됩니다.
          </p>
          <p style={styles.passwordNote}>
            모든 테스트 계정의 비밀번호: <code style={styles.code}>TestPassword</code>
          </p>
        </div>
        <div style={styles.roleInfo}>
          <p style={styles.roleInfoText}>
            <strong>권한 계정</strong>: 지부/분회 운영자는 관리 기능에 접근할 수 있습니다.
          </p>
          <p style={styles.roleInfoText}>
            <strong>직책 계정</strong>: 임원 직책은 표시만 되며, 관리 권한은 없습니다.
          </p>
        </div>
      </section>

      {/* 역할별 사용자 매뉴얼 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>역할별 사용자 매뉴얼</h2>
        <div style={styles.roleGrid}>
          {SERVICE_CONFIG.roles.map((role) => (
            <Link
              key={role.key}
              to={`/test-guide/manual/${role.key}`}
              style={{
                ...styles.roleCard,
                ...(role.internal ? styles.internalCard : {}),
              }}
            >
              <span style={styles.roleLabel}>{role.label}</span>
              <span style={styles.roleDesc}>{role.description}</span>
              {role.internal && <span style={styles.internalBadge}>내부용</span>}
            </Link>
          ))}
        </div>
      </section>
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
    margin: '0 0 16px 0',
  },
  purpose: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.6,
    margin: 0,
  },
  actionList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  actionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '15px',
    color: '#334155',
  },
  actionNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: '#2563eb',
    color: '#fff',
    borderRadius: '50%',
    fontSize: '14px',
    fontWeight: 600,
    flexShrink: 0,
  },
  accountInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  accountText: {
    fontSize: '15px',
    color: '#475569',
    margin: 0,
  },
  passwordNote: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  link: {
    color: '#2563eb',
    fontWeight: 500,
  },
  code: {
    backgroundColor: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#0f172a',
  },
  roleInfo: {
    backgroundColor: '#f8fafc',
    padding: '12px 16px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  roleInfoText: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  roleCard: {
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'all 0.2s',
    position: 'relative',
  },
  internalCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  roleLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '4px',
  },
  roleDesc: {
    fontSize: '13px',
    color: '#64748b',
  },
  internalBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    fontSize: '10px',
    backgroundColor: '#ef4444',
    color: '#fff',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 600,
  },
};
