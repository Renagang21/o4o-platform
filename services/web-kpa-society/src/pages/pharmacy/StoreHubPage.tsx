/**
 * StoreHubPage — 매장 운영 허브 랜딩
 *
 * WO-O4O-KPA-STORE-HUB-CANONICAL-REFINEMENT-V1
 *
 * /store-hub의 index 페이지.
 * "판단 / 추천 / 진입" 레이어로 정의:
 *   ├─ Summary      — 공간 역할 설명 + 운영 흐름 안내
 *   ├─ Resource Entry — 플랫폼 자원 탐색 진입 (4개 카드)
 *   ├─ AI Recommend — 맞춤 추천 placeholder (AI 도입 전제 공간)
 *   ├─ Store CTA    — /store (실행 공간) 진입
 *   └─ Flow Guide   — 탐색→복사→실행 3단계 안내
 *
 * /store (실행)와 역할 구분:
 *   /store-hub = 판단 · 추천 · 탐색 · 다음 행동 제안
 *   /store     = 실행 · 편집 · 운영 · 실제 작업
 */

import { Link } from 'react-router-dom';
import { colors, spacing } from '../../styles/theme';

// ─── Resource Entry Cards ─────────────────────────────────────────────────────

interface ResourceCard {
  icon: string;
  title: string;
  desc: string;
  href: string;
  actionLabel: string;
}

const RESOURCE_CARDS: ResourceCard[] = [
  {
    icon: '🛒',
    title: '상품 카탈로그',
    desc: '공급 가능 상품을 탐색하고 취급 신청합니다',
    href: '/store-hub/b2b',
    actionLabel: '상품 탐색',
  },
  {
    icon: '🖥️',
    title: '디지털 사이니지',
    desc: '사이니지 미디어와 플레이리스트를 탐색해 내 매장에 추가합니다',
    href: '/store-hub/signage',
    actionLabel: '사이니지 탐색',
  },
  {
    icon: '📄',
    title: '콘텐츠/자료',
    desc: 'CMS 콘텐츠를 탐색하고 내 매장에 복사합니다',
    href: '/store-hub/content',
    actionLabel: '콘텐츠 탐색',
  },
  {
    icon: '🛍️',
    title: '이벤트/특가',
    desc: 'KPA-Society 이벤트 상품을 확인하고 신청합니다',
    href: '/store-hub/event-offers',
    actionLabel: '이벤트 보기',
  },
];

// ─── Flow Steps ───────────────────────────────────────────────────────────────

const FLOW_STEPS = [
  {
    step: '1',
    title: '탐색',
    desc: '상품·사이니지·콘텐츠를 이곳에서 탐색합니다',
    where: '매장 운영 허브',
  },
  {
    step: '2',
    title: '복사 · 신청',
    desc: '"내 매장에 추가" 또는 "취급 신청"으로 가져옵니다',
    where: '매장 운영 허브',
  },
  {
    step: '3',
    title: '실행',
    desc: '내 매장에서 게시, 스케줄, 판매 설정을 완료합니다',
    where: '내 약국 (/store)',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function StoreHubPage() {
  return (
    <div style={st.page}>

      {/* ── Block 1: Summary ───────────────────────────────────────────────── */}
      <section style={st.summaryBlock}>
        <div style={st.summaryTextWrap}>
          <h1 style={st.summaryTitle}>매장 운영 허브</h1>
          <p style={st.summaryDesc}>
            플랫폼이 제공하는 상품·콘텐츠·사이니지를 탐색하고,
            내 매장으로 가져가 운영에 활용합니다.
          </p>
        </div>
        <Link to="/store" style={st.storeCta}>
          내 약국 관리 →
        </Link>
      </section>

      {/* ── Block 2: Resource Entry Cards ──────────────────────────────────── */}
      <section style={st.section}>
        <h2 style={st.sectionTitle}>자원 탐색</h2>
        <p style={st.sectionDesc}>플랫폼 자원을 탐색하고 내 매장으로 가져가세요</p>
        <div style={st.cardGrid}>
          {RESOURCE_CARDS.map((card) => (
            <Link key={card.href} to={card.href} style={st.resourceCard}>
              <span style={st.resourceIcon}>{card.icon}</span>
              <div style={st.resourceBody}>
                <span style={st.resourceTitle}>{card.title}</span>
                <p style={st.resourceDesc}>{card.desc}</p>
              </div>
              <span style={st.resourceAction}>{card.actionLabel} →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Block 3: AI Recommendation Placeholder ─────────────────────────── */}
      <section style={st.section}>
        <h2 style={st.sectionTitle}>맞춤 추천</h2>
        <p style={st.sectionDesc}>매장 활동을 분석해 지금 필요한 자원을 제안합니다</p>
        <div style={st.aiPlaceholder}>
          <div style={st.aiIconWrap}>
            <span style={{ fontSize: 28 }}>🤖</span>
          </div>
          <div style={st.aiBody}>
            <div style={st.aiTitleRow}>
              <span style={st.aiTitle}>AI 맞춤 추천</span>
              <span style={st.aiBadge}>준비 중</span>
            </div>
            <p style={st.aiDesc}>
              매장 운영 데이터를 기반으로 지금 필요한 상품·콘텐츠·사이니지를
              자동으로 추천하는 기능을 준비 중입니다.
            </p>
            <ul style={st.aiFeatureList}>
              <li>취급 신청 후 오래된 상품 상태 안내</li>
              <li>미복사 콘텐츠 중 현재 시즌 관련 항목 제안</li>
              <li>사이니지 업데이트 주기 기반 교체 제안</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Block 4: /store CTA ─────────────────────────────────────────────── */}
      <section style={st.section}>
        <div style={st.storeCtaBlock}>
          <div style={st.storeCtaLeft}>
            <span style={st.storeCtaIcon}>🏪</span>
            <div>
              <h3 style={st.storeCtaTitle}>내 약국으로 이동</h3>
              <p style={st.storeCtaDesc}>
                탐색한 상품·콘텐츠·사이니지의 실제 설정과 운영은 내 약국에서 합니다
              </p>
            </div>
          </div>
          <Link to="/store" style={st.storeCtaBtn}>내 약국 관리 →</Link>
        </div>
      </section>

      {/* ── Block 5: Flow Guide ─────────────────────────────────────────────── */}
      <section style={{ ...st.section, paddingBottom: 40 }}>
        <h2 style={st.sectionTitle}>운영 흐름</h2>
        <p style={st.sectionDesc}>매장 운영 허브 → 내 약국 순서로 작업합니다</p>
        <div style={st.flowRow}>
          {FLOW_STEPS.map((step, idx) => (
            <div key={step.step} style={st.flowStepWrap}>
              <div style={st.flowCard}>
                <div style={st.flowStepNum}>{step.step}</div>
                <div style={st.flowStepTitle}>{step.title}</div>
                <p style={st.flowStepDesc}>{step.desc}</p>
                <span style={st.flowStepWhere}>{step.where}</span>
              </div>
              {idx < FLOW_STEPS.length - 1 && (
                <span style={st.flowArrow}>→</span>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

export default StoreHubPage;

// ─── Styles ───────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  page: {
    padding: '32px 32px 0',
    maxWidth: 960,
  },

  /* Summary */
  summaryBlock: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '24px',
    backgroundColor: colors.white,
    borderRadius: 12,
    border: `1px solid ${colors.neutral200}`,
    marginBottom: spacing.xl,
  },
  summaryTextWrap: {},
  summaryTitle: {
    fontSize: '1.375rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: '0 0 8px',
  },
  summaryDesc: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    margin: 0,
    lineHeight: 1.6,
    maxWidth: 520,
  },
  storeCta: {
    flexShrink: 0,
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    borderRadius: 8,
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
    alignSelf: 'center',
    marginLeft: 24,
  },

  /* Sections */
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: '0 0 4px',
  },
  sectionDesc: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
    margin: '0 0 14px',
  },

  /* Resource cards */
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 12,
  },
  resourceCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '16px 18px',
    backgroundColor: colors.white,
    borderRadius: 10,
    border: `1px solid ${colors.neutral200}`,
    textDecoration: 'none',
    color: 'inherit',
    transition: 'border-color 0.15s',
  },
  resourceIcon: {
    fontSize: 22,
    flexShrink: 0,
    marginTop: 1,
  },
  resourceBody: {
    flex: 1,
    minWidth: 0,
  },
  resourceTitle: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: 3,
  },
  resourceDesc: {
    fontSize: '0.75rem',
    color: colors.neutral500,
    margin: 0,
    lineHeight: 1.4,
  },
  resourceAction: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: colors.primary,
    flexShrink: 0,
    alignSelf: 'center',
    whiteSpace: 'nowrap' as const,
  },

  /* AI Placeholder */
  aiPlaceholder: {
    display: 'flex',
    gap: 16,
    padding: '20px 24px',
    backgroundColor: '#F0F7FF',
    borderRadius: 10,
    border: '1px dashed #BFDBFE',
  },
  aiIconWrap: {
    flexShrink: 0,
    width: 48,
    height: 48,
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBody: {
    flex: 1,
  },
  aiTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  aiTitle: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#1E40AF',
  },
  aiBadge: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: '#3B82F6',
    backgroundColor: '#DBEAFE',
    padding: '2px 8px',
    borderRadius: 20,
  },
  aiDesc: {
    fontSize: '0.8125rem',
    color: '#1E40AF',
    margin: '0 0 8px',
    lineHeight: 1.5,
  },
  aiFeatureList: {
    margin: 0,
    paddingLeft: 16,
    fontSize: '0.75rem',
    color: '#3B82F6',
    lineHeight: 1.7,
  },

  /* Store CTA Block */
  storeCtaBlock: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    backgroundColor: colors.white,
    borderRadius: 10,
    border: `1px solid ${colors.neutral200}`,
  },
  storeCtaLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  storeCtaIcon: {
    fontSize: 28,
    flexShrink: 0,
  },
  storeCtaTitle: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: '0 0 3px',
  },
  storeCtaDesc: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
    margin: 0,
  },
  storeCtaBtn: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    borderRadius: 8,
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },

  /* Flow Guide */
  flowRow: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 8,
  },
  flowStepWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  flowCard: {
    flex: 1,
    padding: '16px 18px',
    backgroundColor: colors.white,
    borderRadius: 10,
    border: `1px solid ${colors.neutral200}`,
  },
  flowStepNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '50%',
    fontSize: '0.75rem',
    fontWeight: 700,
    marginBottom: 8,
  },
  flowStepTitle: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: colors.neutral900,
    marginBottom: 6,
  },
  flowStepDesc: {
    fontSize: '0.75rem',
    color: colors.neutral500,
    margin: '0 0 8px',
    lineHeight: 1.4,
  },
  flowStepWhere: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: colors.primary,
    backgroundColor: '#EFF6FF',
    padding: '2px 8px',
    borderRadius: 4,
  },
  flowArrow: {
    fontSize: '1.25rem',
    color: colors.neutral300,
    flexShrink: 0,
  },
};
