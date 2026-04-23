/**
 * StoreHubTemplate — /store-hub 공통 템플릿
 *
 * WO-O4O-STORE-HUB-TEMPLATE-FOUNDATION-V1
 *
 * KPA-Society StoreHubPage를 canonical 기준으로 추출.
 * 서비스별 차이(제목, 카드, 단계, 링크, 문구)는 StoreHubConfig로 주입.
 *
 * 확장 패턴:
 *   <StoreHubTemplate config={serviceConfig} />
 *
 * 서비스별 오버라이드 패턴:
 *   config.renderAiSection  — 실제 AI 결과 또는 커스텀 추천 블록으로 교체
 *
 * 5-block 구조:
 *   1. Summary       — 공간 설명 + 운영 흐름 안내 + /store CTA
 *   2. Resource      — 자원 탐색 카드 (config.resourceCards)
 *   3. AI Recommend  — AI 추천 placeholder 또는 renderAiSection 슬롯
 *   4. Store CTA     — /store 진입 유도 블록
 *   5. Flow Guide    — 탐색→복사→실행 3단계 안내
 */

import { Link } from 'react-router-dom';

// ─── Data Interfaces ─────────────────────────────────────────────────────────

export interface StoreHubResourceCard {
  icon: string;
  title: string;
  desc: string;
  href: string;
  actionLabel: string;
}

export interface StoreHubFlowStep {
  step: string;
  title: string;
  desc: string;
  where: string;
}

// ─── Config Interface ────────────────────────────────────────────────────────

export interface StoreHubConfig {
  serviceKey: string;

  /** Block 1: Hero */
  heroTitle: string;
  heroDesc: string;
  /** Hero 우측 액션 버튼 슬롯 */
  headerAction?: React.ReactNode;
  storeCta: {
    label: string;
    href: string;
  };

  /** Resource Discovery Block */
  resourceSectionTitle?: string;
  resourceSectionDesc?: string;
  resourceCards: StoreHubResourceCard[];

  /** AI Recommendation Block */
  aiBlock?: {
    title?: string;
    desc?: string;
    features?: string[];
    badge?: string;
  };

  /** Store CTA Block */
  storeCtaBlock?: {
    icon?: string;
    title: string;
    desc: string;
    buttonLabel: string;
    href: string;
  };

  /** Operation Flow Block */
  flowSectionTitle?: string;
  flowSectionDesc?: string;
  operationSteps: StoreHubFlowStep[];

  /** Block visibility */
  showAiBlock?: boolean;
  showStoreCtaBlock?: boolean;
  showFlowBlock?: boolean;

  /** AI section override — 실제 AI 결과 또는 커스텀 추천 블록 */
  renderAiSection?: () => React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface StoreHubTemplateProps {
  config: StoreHubConfig;
}

export function StoreHubTemplate({ config }: StoreHubTemplateProps) {
  const {
    heroTitle,
    heroDesc,
    headerAction,
    storeCta,
    resourceSectionTitle = '자원 탐색',
    resourceSectionDesc = '플랫폼 자원을 탐색하고 내 매장으로 가져가세요',
    resourceCards,
    aiBlock,
    storeCtaBlock,
    flowSectionTitle = '운영 흐름',
    flowSectionDesc = '매장 운영 허브 → 내 매장 순서로 작업합니다',
    operationSteps,
    showAiBlock = true,
    showStoreCtaBlock = true,
    showFlowBlock = true,
    renderAiSection,
  } = config;

  return (
    <div style={st.page}>

      {/* ── Block 1: Hero ────────────────────────────────────────────────── */}
      <section style={st.summaryBlock}>
        <div style={st.summaryTextWrap}>
          <h1 style={st.summaryTitle}>{heroTitle}</h1>
          <p style={st.summaryDesc}>{heroDesc}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {headerAction}
          <Link to={storeCta.href} style={st.storeCta}>
            {storeCta.label}
          </Link>
        </div>
      </section>

      {/* ── Block 2: Resource Discovery ────────────────────────────────────── */}
      <section style={st.section}>
        <h2 style={st.sectionTitle}>{resourceSectionTitle}</h2>
        <p style={st.sectionDesc}>{resourceSectionDesc}</p>
        <div style={st.cardGrid}>
          {resourceCards.map((card) => (
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

      {/* ── Block 3: AI Recommendation ─────────────────────────────────────── */}
      {showAiBlock && (
        <section style={st.section}>
          <h2 style={st.sectionTitle}>맞춤 추천</h2>
          <p style={st.sectionDesc}>매장 활동을 분석해 지금 필요한 자원을 제안합니다</p>
          {renderAiSection ? (
            renderAiSection()
          ) : (
            <DefaultAiPlaceholder aiBlock={aiBlock} />
          )}
        </section>
      )}

      {/* ── Block 4: Store CTA ──────────────────────────────────────────────── */}
      {showStoreCtaBlock && storeCtaBlock && (
        <section style={st.section}>
          <div style={st.storeCtaBlock}>
            <div style={st.storeCtaLeft}>
              <span style={st.storeCtaIcon}>{storeCtaBlock.icon ?? '🏪'}</span>
              <div>
                <h3 style={st.storeCtaTitle}>{storeCtaBlock.title}</h3>
                <p style={st.storeCtaDesc}>{storeCtaBlock.desc}</p>
              </div>
            </div>
            <Link to={storeCtaBlock.href} style={st.storeCtaBtn}>
              {storeCtaBlock.buttonLabel}
            </Link>
          </div>
        </section>
      )}

      {/* ── Block 5: Operation Flow ─────────────────────────────────────────── */}
      {showFlowBlock && (
        <section style={{ ...st.section, paddingBottom: 40 }}>
          <h2 style={st.sectionTitle}>{flowSectionTitle}</h2>
          <p style={st.sectionDesc}>{flowSectionDesc}</p>
          <div style={st.flowRow}>
            {operationSteps.map((step, idx) => (
              <div key={step.step} style={st.flowStepWrap}>
                <div style={st.flowCard}>
                  <div style={st.flowStepNum}>{step.step}</div>
                  <div style={st.flowStepTitle}>{step.title}</div>
                  <p style={st.flowStepDesc}>{step.desc}</p>
                  <span style={st.flowStepWhere}>{step.where}</span>
                </div>
                {idx < operationSteps.length - 1 && (
                  <span style={st.flowArrow}>→</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}

export default StoreHubTemplate;

// ─── Default AI Placeholder ───────────────────────────────────────────────────

interface DefaultAiPlaceholderProps {
  aiBlock?: StoreHubConfig['aiBlock'];
}

function DefaultAiPlaceholder({ aiBlock }: DefaultAiPlaceholderProps) {
  const title = aiBlock?.title ?? 'AI 맞춤 추천';
  const badge = aiBlock?.badge ?? '준비 중';
  const desc = aiBlock?.desc ?? '매장 운영 데이터를 기반으로 지금 필요한 상품·콘텐츠·사이니지를 자동으로 추천하는 기능을 준비 중입니다.';
  const features = aiBlock?.features ?? [
    '취급 신청 후 오래된 상품 상태 안내',
    '미복사 콘텐츠 중 현재 시즌 관련 항목 제안',
    '사이니지 업데이트 주기 기반 교체 제안',
  ];

  return (
    <div style={st.aiPlaceholder}>
      <div style={st.aiIconWrap}>
        <span style={{ fontSize: 28 }}>🤖</span>
      </div>
      <div style={st.aiBody}>
        <div style={st.aiTitleRow}>
          <span style={st.aiTitle}>{title}</span>
          <span style={st.aiBadge}>{badge}</span>
        </div>
        <p style={st.aiDesc}>{desc}</p>
        <ul style={st.aiFeatureList}>
          {features.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PRIMARY = '#2563EB';
const WHITE = '#FFFFFF';
const NEUTRAL200 = '#E2E8F0';
const NEUTRAL300 = '#CBD5E1';
const NEUTRAL500 = '#64748B';
const NEUTRAL900 = '#0F172A';

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
    backgroundColor: WHITE,
    borderRadius: 12,
    border: `1px solid ${NEUTRAL200}`,
    marginBottom: 24,
  },
  summaryTextWrap: {},
  summaryTitle: {
    fontSize: '1.375rem',
    fontWeight: 700,
    color: NEUTRAL900,
    margin: '0 0 8px',
  },
  summaryDesc: {
    fontSize: '0.875rem',
    color: NEUTRAL500,
    margin: 0,
    lineHeight: 1.6,
    maxWidth: 520,
  },
  storeCta: {
    flexShrink: 0,
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: WHITE,
    backgroundColor: PRIMARY,
    borderRadius: 8,
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
    alignSelf: 'center',
    marginLeft: 24,
  },

  /* Sections */
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: NEUTRAL900,
    margin: '0 0 4px',
  },
  sectionDesc: {
    fontSize: '0.8125rem',
    color: NEUTRAL500,
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
    backgroundColor: WHITE,
    borderRadius: 10,
    border: `1px solid ${NEUTRAL200}`,
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
    color: NEUTRAL900,
    marginBottom: 3,
  },
  resourceDesc: {
    fontSize: '0.75rem',
    color: NEUTRAL500,
    margin: 0,
    lineHeight: 1.4,
  },
  resourceAction: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: PRIMARY,
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
    backgroundColor: WHITE,
    borderRadius: 10,
    border: `1px solid ${NEUTRAL200}`,
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
    color: NEUTRAL900,
    margin: '0 0 3px',
  },
  storeCtaDesc: {
    fontSize: '0.8125rem',
    color: NEUTRAL500,
    margin: 0,
  },
  storeCtaBtn: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: WHITE,
    backgroundColor: PRIMARY,
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
    backgroundColor: WHITE,
    borderRadius: 10,
    border: `1px solid ${NEUTRAL200}`,
  },
  flowStepNum: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    backgroundColor: PRIMARY,
    color: WHITE,
    borderRadius: '50%',
    fontSize: '0.75rem',
    fontWeight: 700,
    marginBottom: 8,
  },
  flowStepTitle: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: NEUTRAL900,
    marginBottom: 6,
  },
  flowStepDesc: {
    fontSize: '0.75rem',
    color: NEUTRAL500,
    margin: '0 0 8px',
    lineHeight: 1.4,
  },
  flowStepWhere: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    color: PRIMARY,
    backgroundColor: '#EFF6FF',
    padding: '2px 8px',
    borderRadius: 4,
  },
  flowArrow: {
    fontSize: '1.25rem',
    color: NEUTRAL300,
    flexShrink: 0,
  },
};
