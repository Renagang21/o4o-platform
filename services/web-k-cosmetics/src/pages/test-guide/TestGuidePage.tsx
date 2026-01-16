/**
 * TestGuidePage - K-Cosmetics 테스트 가이드 메인 페이지
 * WO-TEST-GUIDE-UI-LAYOUT-V1 / WO-TEST-GUIDE-AND-MANUALS-V1 기준
 */

import { Link } from 'react-router-dom';
import TestGuideLayout from '@/components/layouts/TestGuideLayout';

// 서비스별 설정
const SERVICE_CONFIG = {
  name: 'K-Cosmetics',
  testPurpose: '국내 화장품 브랜드를 한 곳에서 탐색하고 구매할 수 있는 뷰티 커머스 플랫폼입니다. 이번 테스트에서는 상품 탐색부터 장바구니, 주문까지의 흐름이 자연스러운지 확인합니다.',
  actions: [
    '로그인 화면에서 테스트 계정을 선택하고 로그인하세요',
    '홈페이지에서 카테고리별 상품을 탐색하고 마음에 드는 상품을 장바구니에 담아보세요',
    '이상하거나 불편한 점이 있으면 테스트 포럼에 자유롭게 남겨주세요',
  ],
  roles: [
    { key: 'consumer', label: '소비자', description: '상품 탐색 및 구매' },
    { key: 'seller', label: '판매자', description: '상품 등록 및 판매 관리' },
    { key: 'supplier', label: '공급자', description: '상품 공급 및 재고 관리' },
    { key: 'admin', label: '관리자', description: '플랫폼 전체 관리', internal: true },
    { key: 'operator', label: '운영자', description: '매장 네트워크 및 주문 운영', internal: true },
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
    backgroundColor: '#e91e63',
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
    color: '#e91e63',
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
