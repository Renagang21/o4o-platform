/**
 * TestGuidePage - Neture 테스트 가이드 메인 페이지
 * WO-TEST-GUIDE-UI-LAYOUT-V1 / WO-TEST-GUIDE-AND-MANUALS-V1 기준
 *
 * 섹션 구성:
 * 1. 서비스별 매뉴얼
 * 2. 역할별 사용자 매뉴얼
 * 3. 도구 사용 매뉴얼
 */

import { Link } from 'react-router-dom';
import {
  Package,
  Building2,
  Shield,
  FileEdit,
  Layers,
  ArrowRight,
} from 'lucide-react';
import TestGuideLayout from '../../components/layouts/TestGuideLayout';

// 서비스별 매뉴얼 설정
const SERVICE_MANUALS = [
  {
    key: 'neture',
    label: 'Neture',
    description: '공급자-파트너 연결 유통 플랫폼',
    icon: Layers,
    color: '#2563eb',
    href: '/test-guide/service/neture',
    available: true,
  },
  {
    key: 'k-cosmetics',
    label: 'K-Cosmetics',
    description: 'K-뷰티 글로벌 유통 플랫폼',
    icon: Package,
    color: '#ec4899',
    href: '/test-guide/service/k-cosmetics',
    available: true,
  },
  {
    key: 'glycopharm',
    label: 'GlycoPharm',
    description: '약국 건강관리 플랫폼',
    icon: Building2,
    color: '#059669',
    href: '/test-guide/service/glycopharm',
    available: true,
  },
  {
    key: 'glucoseview',
    label: 'GlucoseView',
    description: '혈당 모니터링 앱',
    icon: Shield,
    color: '#f59e0b',
    href: '/test-guide/service/glucoseview',
    available: true,
  },
  {
    key: 'kpa-society',
    label: 'KPA Society',
    description: '약사회 회원 관리 SaaS',
    icon: FileEdit,
    color: '#6366f1',
    href: '/test-guide/service/kpa-society',
    available: true,
  },
];

// 역할별 매뉴얼 설정
const ROLE_MANUALS = [
  {
    key: 'supplier',
    label: '공급자',
    description: '상품 등록 및 공급 관리',
    icon: Package,
    color: '#8b5cf6',
    href: '/test-guide/manual/supplier',
  },
  {
    key: 'partner',
    label: '파트너',
    description: '공급자 탐색 및 제휴 관리',
    icon: Building2,
    color: '#0ea5e9',
    href: '/test-guide/manual/partner',
  },
  {
    key: 'admin',
    label: '운영자',
    description: '플랫폼 전체 관리',
    icon: Shield,
    color: '#ef4444',
    href: '/test-guide/manual/admin',
    internal: true,
  },
];

// 도구 사용 매뉴얼 설정
const TOOL_MANUALS = [
  {
    key: 'content-editor',
    label: '콘텐츠 에디터',
    description: '리치 텍스트 편집기 사용법',
    icon: FileEdit,
    color: '#10b981',
    href: '/test-guide/manual/content-editor',
  },
];

// 테스트 목적 설정
const SERVICE_CONFIG = {
  name: 'Neture',
  testPurpose: '공급자와 파트너를 연결하는 B2B 유통 정보 플랫폼입니다. 이번 테스트에서는 공급자 탐색, 제휴 요청, 상품 정보 확인 흐름이 명확한지 점검합니다.',
  actions: [
    '로그인 화면에서 공급자 또는 파트너 계정을 선택하고 로그인하세요',
    '공급자 목록에서 관심 있는 공급자를 클릭하여 상세 정보를 확인해 보세요',
    '화면 이동이나 정보 표시에 불편한 점이 있으면 포럼에 남겨주세요',
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

      {/* 서비스별 매뉴얼 */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>서비스 매뉴얼</h2>
          <span style={styles.sectionBadge}>Service</span>
        </div>
        <p style={styles.sectionDesc}>
          각 서비스의 전체 기능과 사용 방법을 안내합니다.
        </p>
        <div style={styles.cardGrid}>
          {SERVICE_MANUALS.map((manual) => {
            const IconComponent = manual.icon;
            return manual.available ? (
              <Link
                key={manual.key}
                to={manual.href}
                style={{
                  ...styles.card,
                  ...styles.cardLink,
                  borderLeftColor: manual.color,
                }}
              >
                <div style={styles.cardIcon}>
                  <IconComponent size={24} style={{ color: manual.color }} />
                </div>
                <div style={styles.cardContent}>
                  <h3 style={styles.cardTitle}>{manual.label}</h3>
                  <p style={styles.cardDesc}>{manual.description}</p>
                </div>
                <div style={styles.cardArrow}>
                  <ArrowRight size={18} style={{ color: '#94a3b8' }} />
                </div>
              </Link>
            ) : (
              <div
                key={manual.key}
                style={{
                  ...styles.card,
                  borderLeftColor: manual.color,
                  opacity: 0.5,
                }}
              >
                <div style={styles.cardIcon}>
                  <IconComponent size={24} style={{ color: manual.color }} />
                </div>
                <div style={styles.cardContent}>
                  <h3 style={styles.cardTitle}>{manual.label}</h3>
                  <p style={styles.cardDesc}>{manual.description}</p>
                </div>
                <span style={styles.comingSoon}>준비중</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 역할별 사용자 매뉴얼 */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>역할별 사용자 매뉴얼</h2>
          <span style={{ ...styles.sectionBadge, backgroundColor: '#ede9fe', color: '#7c3aed' }}>Role</span>
        </div>
        <p style={styles.sectionDesc}>
          각 역할에 맞는 기능과 사용 방법을 안내합니다.
        </p>
        <div style={styles.cardGrid}>
          {ROLE_MANUALS.map((manual) => {
            const IconComponent = manual.icon;
            return (
              <Link
                key={manual.key}
                to={manual.href}
                style={{
                  ...styles.card,
                  ...styles.cardLink,
                  borderLeftColor: manual.color,
                  ...(manual.internal ? styles.internalCard : {}),
                }}
              >
                <div style={styles.cardIcon}>
                  <IconComponent size={24} style={{ color: manual.color }} />
                </div>
                <div style={styles.cardContent}>
                  <h3 style={styles.cardTitle}>{manual.label}</h3>
                  <p style={styles.cardDesc}>{manual.description}</p>
                </div>
                <div style={styles.cardArrow}>
                  <ArrowRight size={18} style={{ color: '#94a3b8' }} />
                </div>
                {manual.internal && (
                  <span style={styles.internalBadge}>내부용</span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* 도구 사용 매뉴얼 */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>도구 사용 매뉴얼</h2>
          <span style={{ ...styles.sectionBadge, backgroundColor: '#d1fae5', color: '#059669' }}>Tool</span>
        </div>
        <p style={styles.sectionDesc}>
          플랫폼에서 사용하는 각종 도구의 사용법을 안내합니다.
        </p>
        <div style={styles.cardGrid}>
          {TOOL_MANUALS.map((manual) => {
            const IconComponent = manual.icon;
            return (
              <Link
                key={manual.key}
                to={manual.href}
                style={{
                  ...styles.card,
                  ...styles.cardLink,
                  borderLeftColor: manual.color,
                }}
              >
                <div style={styles.cardIcon}>
                  <IconComponent size={24} style={{ color: manual.color }} />
                </div>
                <div style={styles.cardContent}>
                  <h3 style={styles.cardTitle}>{manual.label}</h3>
                  <p style={styles.cardDesc}>{manual.description}</p>
                </div>
                <div style={styles.cardArrow}>
                  <ArrowRight size={18} style={{ color: '#94a3b8' }} />
                </div>
              </Link>
            );
          })}
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
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  sectionBadge: {
    fontSize: '10px',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '4px',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  sectionDesc: {
    fontSize: '13px',
    color: '#64748b',
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
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderLeft: '4px solid #2563eb',
    borderRadius: '8px',
    position: 'relative',
  },
  cardLink: {
    textDecoration: 'none',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
  },
  internalCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  cardIcon: {
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  cardDesc: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  cardArrow: {
    flexShrink: 0,
  },
  currentBadge: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    fontSize: '10px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
    color: '#fff',
  },
  comingSoon: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    fontSize: '10px',
    fontWeight: 500,
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: '#e2e8f0',
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
