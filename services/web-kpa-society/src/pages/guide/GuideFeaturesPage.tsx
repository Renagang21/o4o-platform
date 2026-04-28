/**
 * GuideFeaturesPage — 기능별 이용 방법
 *
 * WO-KPA-GUIDE-FEATURES-PAGE-V1
 *
 * KPA-Society 주요 기능을 실제 route 기준으로 분류한 기능별 매뉴얼 입구.
 * 흐름형(/guide/usage)이 아닌 기능 묶음형 카드 구성.
 *
 * 그룹: 커뮤니티 / 강의 / 콘텐츠 / 자료실 / 매장 운영 / 디지털 사이니지 / QR·Tablet
 *
 * 공개 페이지 (인증 불필요).
 */

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';

// ─── 데이터 ───────────────────────────────────────────────────────────────────

interface FeatureItem {
  label: string;
  route: string;
}

interface FeatureGroup {
  step: string;
  title: string;
  primaryRoute: string;
  description: string;
  items: FeatureItem[];
  linkTo: string;
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    step: '01',
    title: '커뮤니티',
    primaryRoute: '/forum',
    description: '약사 간 질문·답변·경험 공유. 카테고리별 포럼에서 현장 노하우를 나눕니다.',
    items: [
      { label: '포럼 홈', route: '/forum' },
      { label: '전체 글 목록', route: '/forum/all' },
      { label: '글 작성', route: '/forum/write' },
    ],
    linkTo: '/forum',
  },
  {
    step: '02',
    title: '강의',
    primaryRoute: '/lms',
    description: '약사 전문 교육 강의 조회 및 수강. 강의별 커리큘럼과 학습 진행 상황을 확인합니다.',
    items: [
      { label: '강의 홈', route: '/lms' },
      { label: '강의 목록', route: '/lms/courses' },
      { label: '강의 상세·수강', route: '/lms/course/:id' },
    ],
    linkTo: '/lms',
  },
  {
    step: '03',
    title: '콘텐츠',
    primaryRoute: '/content',
    description: '문서형 콘텐츠, 안내 자료, 마케팅 자료. 플랫폼 공통 콘텐츠를 열람합니다.',
    items: [
      { label: '콘텐츠 목록', route: '/content' },
      { label: '콘텐츠 작성', route: '/content/new' },
    ],
    linkTo: '/content',
  },
  {
    step: '04',
    title: '자료실',
    primaryRoute: '/resources',
    description: '파일 자료, 원본 자료, 매장 활용 자료. 다운로드 가능한 형태로 공유됩니다.',
    items: [
      { label: '자료실', route: '/resources' },
    ],
    linkTo: '/resources',
  },
  {
    step: '05',
    title: '매장 운영',
    primaryRoute: '/store',
    description: '약국 매장의 상품·채널·고객 요청을 통합 관리합니다. 승인된 약사 계정 필요.',
    items: [
      { label: '운영 홈', route: '/store' },
      { label: '상품 구성', route: '/store/commerce/products' },
      { label: 'B2C 가격 설정', route: '/store/commerce/products/b2c' },
      { label: '채널 진열', route: '/store/channels' },
      { label: '고객 요청 관리', route: '/store/requests' },
      { label: '주문 관리', route: '/store/commerce/orders' },
    ],
    linkTo: '/store',
  },
  {
    step: '06',
    title: '디지털 사이니지',
    primaryRoute: '/store/marketing/signage/playlist',
    description: '매장 디스플레이에 재생할 콘텐츠를 플레이리스트로 구성하고 스케줄을 설정합니다.',
    items: [
      { label: '플레이리스트 관리', route: '/store/marketing/signage/playlist' },
      { label: '자료실 (매장)', route: '/store/content' },
      { label: 'POP 자료', route: '/store/marketing/pop' },
    ],
    linkTo: '/store/marketing/signage/playlist',
  },
  {
    step: '07',
    title: 'QR · Tablet',
    primaryRoute: '/store/marketing/qr',
    description: 'QR 코드로 고객을 유입하고 태블릿 키오스크로 상담 요청을 연결합니다.',
    items: [
      { label: 'QR 코드 관리', route: '/store/marketing/qr' },
      { label: '태블릿 키오스크', route: '/tablet/:slug' },
      { label: '마케팅 분석', route: '/store/analytics/marketing' },
    ],
    linkTo: '/store/marketing/qr',
  },
];

const FLOW_LABELS = ['커뮤니티', '강의', '콘텐츠', '자료실', '매장 운영', '사이니지', 'QR · Tablet'];

// ─── Component ───────────────────────────────────────────────────────────────

export function GuideFeaturesPage() {
  return (
    <div>
      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <p style={styles.heroEyebrow}>이용 가이드</p>
          <h1 style={styles.heroTitle}>기능별 이용 방법</h1>
          <p style={styles.heroDesc}>
            KPA-Society 주요 기능을 카테고리별로 정리했습니다. 필요한 기능을 선택해 바로 이동합니다.
          </p>
          <p style={styles.flowBarTitle}>기능 카테고리</p>
          <div style={styles.flowBar}>
            {FLOW_LABELS.map((label, idx, arr) => (
              <span key={label} style={styles.flowBarItem}>
                <span style={styles.flowBarLabel}>{label}</span>
                {idx < arr.length - 1 && <span style={styles.flowBarArrow}>·</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Group Cards */}
      {FEATURE_GROUPS.map((group, idx) => (
        <PageSection key={group.step} last={idx === FEATURE_GROUPS.length - 1}>
          <PageContainer>
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionStep}>{group.step}</span>
                <h2 style={styles.sectionTitle}>{group.title}</h2>
                <span style={styles.sectionRoute}>{group.primaryRoute}</span>
              </div>
              <p style={styles.sectionDesc}>{group.description}</p>

              {/* Sub-route cards */}
              <div style={styles.cardGrid}>
                {group.items.map((item) => (
                  <Link
                    key={item.route}
                    to={item.route.includes(':') ? group.linkTo : item.route}
                    style={styles.card}
                  >
                    <p style={styles.cardLabel}>{item.label}</p>
                    <p style={styles.cardRoute}>{item.route}</p>
                  </Link>
                ))}
              </div>
            </div>
          </PageContainer>
        </PageSection>
      ))}

      {/* Bottom Nav */}
      <div style={styles.bottomNav}>
        <PageContainer>
          <div style={styles.bottomNavInner}>
            <Link to="/guide/usage" style={styles.navLinkMuted}>← 서비스 활용 방법</Link>
            <Link to="/" style={styles.navLinkMuted}>홈으로</Link>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  hero: {
    backgroundColor: '#1e293b',
    padding: '56px 0 48px',
  },
  heroInner: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '0 24px',
  },
  heroEyebrow: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#94a3b8',
    margin: '0 0 10px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  heroTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#f8fafc',
    margin: '0 0 14px 0',
    lineHeight: 1.25,
  },
  heroDesc: {
    fontSize: '1rem',
    color: '#94a3b8',
    lineHeight: 1.7,
    margin: '0 0 24px 0',
  },
  flowBarTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    margin: '0 0 8px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  },
  flowBar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  flowBarItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  flowBarLabel: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#cbd5e1',
  },
  flowBarArrow: {
    fontSize: '0.75rem',
    color: '#475569',
  },
  section: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  sectionStep: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    padding: '2px 7px',
    letterSpacing: '0.04em',
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  sectionRoute: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: '2px 8px',
    fontFamily: 'monospace',
  },
  sectionDesc: {
    fontSize: '0.9375rem',
    color: '#475569',
    lineHeight: 1.7,
    margin: '0 0 20px 0',
    maxWidth: 640,
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
  },
  card: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '16px 18px',
    textDecoration: 'none',
    display: 'block',
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
    cursor: 'pointer',
  },
  cardLabel: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 6px 0',
  },
  cardRoute: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    margin: 0,
    fontFamily: 'monospace',
  },
  bottomNav: {
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    padding: '20px 0',
  },
  bottomNavInner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  navLinkMuted: {
    fontSize: '0.875rem',
    color: '#64748b',
    textDecoration: 'none',
  },
};
