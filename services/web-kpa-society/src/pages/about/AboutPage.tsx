/**
 * AboutPage — KPA-Society 소개 페이지
 *
 * WO-O4O-KPA-ABOUT-PAGE-IMPLEMENTATION-V1
 *
 * 구조:
 * 1. Hero (다크, 텍스트 중심)
 * 2. 왜 필요한 서비스인가
 * 3. KPA-Society가 제공하는 것
 * 4. 이용자 유형별 가치
 * 5. Online for Offline 철학
 * 6. 주요 서비스 연결 CTA
 */

import { useEffect } from 'react';

export function AboutPage() {
  useEffect(() => {
    const prev = document.title;
    document.title = 'KPA-Society 소개 | 약사 전문 플랫폼';
    const meta = document.querySelector('meta[name="description"]');
    const prevContent = meta?.getAttribute('content') ?? '';
    meta?.setAttribute('content', 'KPA-Society는 약사 커뮤니티, 교육, 매장 경영을 하나의 공간에서 지원하는 약사 전문 플랫폼입니다. O4O 철학을 바탕으로 온라인 역량이 오프라인 약국 운영으로 이어집니다.');
    return () => {
      document.title = prev;
      if (meta) meta.setAttribute('content', prevContent);
    };
  }, []);

  return (
    <div style={s.page}>
      {/* ── 1. Hero ── */}
      <section style={s.hero}>
        <div style={s.heroInner}>
          <span style={s.heroBadge}>약사 전문 플랫폼</span>
          <h1 style={s.heroTitle}>약사와 약국을 위한<br />하나의 전문 공간</h1>
          <p style={s.heroSub}>
            KPA-Society는 약사 커뮤니티·교육·매장 경영을 통합한 플랫폼입니다.<br />
            약사의 전문성을 높이고, 약국 운영을 실질적으로 지원합니다.
          </p>
        </div>
      </section>

      <div style={s.body}>

        {/* ── 2. 왜 필요한가 ── */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>왜 필요한 서비스인가</h2>
          <p style={s.lead}>
            약사는 전문 직능인임과 동시에 약국이라는 소규모 비즈니스를 운영하는 경영자입니다.
            하지만 기존에는 커뮤니티·교육·경영 지원이 각각 분산되어 있어 효율적인 연결이 어려웠습니다.
          </p>
          <div style={s.cardGrid}>
            {WHY_CARDS.map((c) => (
              <div key={c.title} style={s.card}>
                <div style={s.cardIcon}>{c.icon}</div>
                <h3 style={s.cardTitle}>{c.title}</h3>
                <p style={s.cardDesc}>{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 3. 제공하는 것 ── */}
        <section style={{ ...s.section, ...s.altSection }}>
          <h2 style={s.sectionTitle}>KPA-Society가 제공하는 것</h2>
          <div style={s.featureList}>
            {FEATURES.map((f) => (
              <div key={f.title} style={s.featureItem}>
                <div style={s.featureDot} />
                <div>
                  <span style={s.featureTitle}>{f.title}</span>
                  <span style={s.featureDesc}> — {f.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. 이용자 유형별 가치 ── */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>이용자 유형별 가치</h2>
          <div style={s.userGrid}>
            {USER_TYPES.map((u) => (
              <div key={u.role} style={s.userCard}>
                <div style={s.userRole}>{u.role}</div>
                <ul style={s.userList}>
                  {u.items.map((item) => (
                    <li key={item} style={s.userListItem}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── 5. O4O 철학 ── */}
        <section style={{ ...s.section, ...s.o4oSection }}>
          <div style={s.o4oInner}>
            <span style={s.o4oBadge}>O4O 철학</span>
            <h2 style={s.o4oTitle}>Online for Offline</h2>
            <p style={s.o4oDesc}>
              온라인 역량이 오프라인 약국 운영으로 이어지는 구조를 만드는 것이 KPA-Society의 목표입니다.
              포럼에서 쌓은 전문 지식, LMS에서 이수한 교육, 콘텐츠 허브의 자료가 실제 약국 현장에서
              디지털 사이니지·매장 운영·고객 서비스로 구현됩니다.
            </p>
            <div style={s.o4oFlow}>
              {O4O_STEPS.map((step, i) => (
                <div key={step.label} style={s.o4oStep}>
                  <div style={s.o4oStepNum}>{i + 1}</div>
                  <div style={s.o4oStepLabel}>{step.label}</div>
                  <div style={s.o4oStepDesc}>{step.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. CTA ── */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>서비스 시작하기</h2>
          <p style={s.lead}>관심 있는 서비스로 바로 이동하세요.</p>
          <div style={s.ctaGrid}>
            {CTA_ITEMS.map((item) => (
              <a key={item.href} href={item.href} style={s.ctaCard}>
                <div style={s.ctaIcon}>{item.icon}</div>
                <div style={s.ctaLabel}>{item.label}</div>
                <div style={s.ctaDesc}>{item.desc}</div>
              </a>
            ))}
          </div>
          <div style={s.ctaFooter}>
            <a href="/guide/intro" style={s.ctaGuideLink}>
              KPA-Society 이용 가이드 전체 보기 →
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}

// ─── 데이터 ────────────────────────────────────────────────────────────────────

const WHY_CARDS = [
  {
    icon: '💬',
    title: '커뮤니티의 분산',
    desc: '동료 약사와 전문 지식을 나눌 통합 공간이 없었습니다.',
  },
  {
    icon: '📚',
    title: '교육 접근성',
    desc: '보수교육·세미나가 오프라인 중심으로 시간·장소 제약이 컸습니다.',
  },
  {
    icon: '🏪',
    title: '약국 경영 지원 부재',
    desc: '디지털 마케팅·운영 도구를 개별 약국이 따로 구축해야 했습니다.',
  },
];

const FEATURES = [
  { title: '포럼', desc: '약사 전용 커뮤니티에서 질문·토론·정보 공유' },
  { title: 'LMS 강의', desc: '보수교육·세미나 온라인 수강 및 이수 관리' },
  { title: '콘텐츠 허브', desc: '플랫폼 콘텐츠 작성·검색·활용' },
  { title: '자료실', desc: '자료 저장·공유·AI 활용 연결' },
  { title: '디지털 사이니지', desc: '약국 디지털 미디어 콘텐츠 관리·편성' },
  { title: '매장 경영 대시보드', desc: '상품·채널·마케팅·주문을 한 화면에서 관리' },
];

const USER_TYPES = [
  {
    role: '약사 (커뮤니티 참여)',
    items: [
      '동료 약사와 전문 지식 교류',
      '온라인 강의·세미나 수강',
      '콘텐츠·자료 활용',
    ],
  },
  {
    role: '개국 약사 (약국 경영)',
    items: [
      '매장 운영 대시보드 이용',
      '디지털 사이니지·마케팅 도구',
      '상품 정보 제작·배포',
      'B2B 상품 목록 조회 및 주문',
    ],
  },
  {
    role: '콘텐츠 기여자·강사',
    items: [
      '강의·코스 등록 및 관리',
      '플랫폼 콘텐츠 작성·공유',
      '수강생 현황 모니터링',
    ],
  },
];

const O4O_STEPS = [
  { label: '커뮤니티', desc: '포럼·콘텐츠에서 지식 쌓기' },
  { label: '교육', desc: 'LMS로 전문성 강화' },
  { label: '자료', desc: '자료실·콘텐츠 허브 활용' },
  { label: '약국 실행', desc: '사이니지·매장·마케팅 적용' },
];

const CTA_ITEMS = [
  { href: '/forum', icon: '💬', label: '포럼', desc: '약사 커뮤니티' },
  { href: '/lms', icon: '🎓', label: '강의', desc: '보수교육·세미나' },
  { href: '/content', icon: '📄', label: '콘텐츠', desc: '자료 검색·활용' },
  { href: '/resources', icon: '📁', label: '자료실', desc: '파일·AI 연결' },
];

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: 'var(--color-bg-secondary, #f8fafc)',
    minHeight: '100vh',
  },

  // Hero
  hero: {
    backgroundColor: '#0f172a',
    padding: '80px 24px 72px',
    textAlign: 'center',
  },
  heroInner: {
    maxWidth: 680,
    margin: '0 auto',
  },
  heroBadge: {
    display: 'inline-block',
    fontSize: '0.8125rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    backgroundColor: 'rgba(37,99,235,0.25)',
    color: '#93c5fd',
    padding: '5px 14px',
    borderRadius: 20,
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
    fontWeight: 800,
    color: '#f1f5f9',
    lineHeight: 1.25,
    margin: '0 0 20px',
  },
  heroSub: {
    fontSize: '1.0625rem',
    color: '#94a3b8',
    lineHeight: 1.75,
    margin: 0,
  },

  // Body
  body: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '0 24px 80px',
  },

  // Section
  section: {
    paddingTop: 64,
    paddingBottom: 0,
  },
  altSection: {
    // no extra style — reserved for future background variation
  },
  sectionTitle: {
    fontSize: '1.375rem',
    fontWeight: 700,
    color: 'var(--color-text-primary, #0f172a)',
    margin: '0 0 16px',
  },
  lead: {
    fontSize: '1rem',
    color: 'var(--color-text-secondary, #475569)',
    lineHeight: 1.7,
    margin: '0 0 32px',
  },

  // Why cards
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid var(--color-border-default, #e2e8f0)',
    borderRadius: 12,
    padding: '24px 20px',
  },
  cardIcon: {
    fontSize: '1.75rem',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--color-text-primary, #0f172a)',
    margin: '0 0 8px',
  },
  cardDesc: {
    fontSize: '0.9375rem',
    color: 'var(--color-text-secondary, #475569)',
    lineHeight: 1.6,
    margin: 0,
  },

  // Features
  featureList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 14,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '16px 20px',
    backgroundColor: '#fff',
    border: '1px solid var(--color-border-default, #e2e8f0)',
    borderRadius: 10,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary, #2563eb)',
    marginTop: 6,
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: 'var(--color-text-primary, #0f172a)',
  },
  featureDesc: {
    fontSize: '0.9375rem',
    color: 'var(--color-text-secondary, #475569)',
  },

  // User types
  userGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: 16,
  },
  userCard: {
    backgroundColor: '#fff',
    border: '1px solid var(--color-border-default, #e2e8f0)',
    borderRadius: 12,
    padding: '20px',
  },
  userRole: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: 'var(--color-primary, #2563eb)',
    marginBottom: 12,
  },
  userList: {
    margin: 0,
    paddingLeft: 18,
  },
  userListItem: {
    fontSize: '0.9375rem',
    color: 'var(--color-text-secondary, #475569)',
    lineHeight: 1.7,
  },

  // O4O section
  o4oSection: {
    // reserved
  },
  o4oInner: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 16,
    padding: '40px 32px',
    textAlign: 'center' as const,
  },
  o4oBadge: {
    display: 'inline-block',
    fontSize: '0.8125rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    padding: '5px 12px',
    borderRadius: 20,
    marginBottom: 12,
  },
  o4oTitle: {
    fontSize: '1.625rem',
    fontWeight: 800,
    color: '#1e3a8a',
    margin: '0 0 16px',
  },
  o4oDesc: {
    fontSize: '0.9375rem',
    color: '#334155',
    lineHeight: 1.75,
    maxWidth: 640,
    margin: '0 auto 32px',
  },
  o4oFlow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
    gap: 12,
  },
  o4oStep: {
    backgroundColor: '#fff',
    border: '1px solid #bfdbfe',
    borderRadius: 10,
    padding: '16px 20px',
    minWidth: 140,
    textAlign: 'center' as const,
  },
  o4oStepNum: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary, #2563eb)',
    color: '#fff',
    fontSize: '0.8125rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 8px',
  },
  o4oStepLabel: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 4,
  },
  o4oStepDesc: {
    fontSize: '0.8125rem',
    color: '#475569',
  },

  // CTA
  ctaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 24,
  },
  ctaCard: {
    display: 'block',
    backgroundColor: '#fff',
    border: '1px solid var(--color-border-default, #e2e8f0)',
    borderRadius: 12,
    padding: '20px 16px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    transition: 'border-color 0.15s',
  },
  ctaIcon: {
    fontSize: '1.75rem',
    marginBottom: 8,
  },
  ctaLabel: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--color-text-primary, #0f172a)',
    marginBottom: 4,
  },
  ctaDesc: {
    fontSize: '0.8125rem',
    color: 'var(--color-text-secondary, #475569)',
  },
  ctaFooter: {
    textAlign: 'center' as const,
    paddingTop: 8,
  },
  ctaGuideLink: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--color-primary, #2563eb)',
    textDecoration: 'none',
  },
};

export default AboutPage;
