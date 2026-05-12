/**
 * ContactPage — KPA-Society 협업 및 연결 창구
 *
 * WO-O4O-KPA-CONTACT-PAGE-IMPLEMENTATION-V1
 *
 * 구조:
 * 1. Hero (다크, 텍스트 중심)
 * 2. 운영자 / 단체 협력
 * 3. 강의 개설 / 협업
 * 4. CTA (About / 포럼 / 가이드)
 *
 * 고객센터/기술지원/CS 구조 배제 — 협업과 연결 창구
 */

import { useEffect } from 'react';

export function ContactPage() {
  useEffect(() => {
    const prev = document.title;
    document.title = 'KPA-Society Contact';
    const meta = document.querySelector('meta[name="description"]');
    const prevContent = meta?.getAttribute('content') ?? '';
    meta?.setAttribute('content', 'KPA-Society 협업 및 강의 개설 안내');
    return () => {
      document.title = prev;
      if (meta) meta.setAttribute('content', prevContent);
    };
  }, []);

  return (
    <div style={s.page}>
      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.heroInner}>
          <span style={s.heroBadge}>KPA-Society</span>
          <h1 style={s.heroTitle}>협업과 연결</h1>
          <p style={s.heroSub}>
            KPA-Society는 약사 네트워크와 함께<br />
            다양한 교육과 운영 협업을 지원합니다.
          </p>
        </div>
      </section>

      <div style={s.body}>

        {/* ── 카드 영역 ── */}
        <section style={s.section}>
          <div style={s.cardGrid}>

            {/* 카드 1: 운영자 / 단체 협력 */}
            <div style={s.card}>
              <div style={s.cardIcon}>🤝</div>
              <h2 style={s.cardTitle}>운영자 / 단체 협력</h2>
              <p style={s.cardDesc}>
                약사회, 전문약사 모임, 협동조합, 공급·유통 파트너 등
                약사 네트워크와 연결된 조직과의 협력 문의를 받습니다.
              </p>
              <ul style={s.cardList}>
                <li style={s.cardListItem}>약사회 / 지부·분회</li>
                <li style={s.cardListItem}>전문약사 학술 모임</li>
                <li style={s.cardListItem}>협동조합 / 공동 구매</li>
                <li style={s.cardListItem}>공급·유통 파트너</li>
              </ul>
              <a href="mailto:partner@kpa-society.kr" style={s.cardLink}>
                partner@kpa-society.kr
              </a>
            </div>

            {/* 카드 2: 강의 개설 / 협업 */}
            <div style={s.card}>
              <div style={s.cardIcon}>🎓</div>
              <h2 style={s.cardTitle}>강의 개설 / 협업</h2>
              <p style={s.cardDesc}>
                약사 대상 교육 콘텐츠 개설 및 강의 운영 협업에 관한
                문의를 받습니다.
              </p>
              <ul style={s.cardList}>
                <li style={s.cardListItem}>온라인 강의 개설</li>
                <li style={s.cardListItem}>보수교육 협력</li>
                <li style={s.cardListItem}>세미나 / 워크숍 운영</li>
                <li style={s.cardListItem}>교육 콘텐츠 제작 협업</li>
              </ul>
              <a href="mailto:edu@kpa-society.kr" style={s.cardLink}>
                edu@kpa-society.kr
              </a>
            </div>

          </div>
        </section>

        {/* ── CTA ── */}
        <section style={s.ctaSection}>
          <div style={s.ctaLinks}>
            <a href="/about" style={s.ctaLink}>KPA-Society 소개 →</a>
            <a href="/forum" style={s.ctaLink}>포럼 →</a>
            <a href="/guide/intro" style={s.ctaLink}>이용 가이드 →</a>
          </div>
        </section>

      </div>
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: 'var(--color-bg-secondary, #f8fafc)',
    minHeight: '100vh',
  },

  // Hero
  hero: {
    backgroundColor: '#0f172a',
    padding: '72px 24px 64px',
    textAlign: 'center',
  },
  heroInner: {
    maxWidth: 560,
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
    fontSize: 'clamp(1.625rem, 4vw, 2.25rem)',
    fontWeight: 800,
    color: '#f1f5f9',
    margin: '0 0 16px',
  },
  heroSub: {
    fontSize: '1rem',
    color: '#94a3b8',
    lineHeight: 1.75,
    margin: 0,
  },

  // Body
  body: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '0 24px 72px',
  },

  // Section
  section: {
    paddingTop: 56,
  },

  // Cards
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
  },
  card: {
    backgroundColor: '#fff',
    border: '1px solid var(--color-border-default, #e2e8f0)',
    borderRadius: 14,
    padding: '28px 24px',
  },
  cardIcon: {
    fontSize: '2rem',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: 'var(--color-text-primary, #0f172a)',
    margin: '0 0 10px',
  },
  cardDesc: {
    fontSize: '0.9375rem',
    color: 'var(--color-text-secondary, #475569)',
    lineHeight: 1.65,
    margin: '0 0 16px',
  },
  cardList: {
    margin: '0 0 20px',
    paddingLeft: 18,
  },
  cardListItem: {
    fontSize: '0.875rem',
    color: 'var(--color-text-secondary, #64748b)',
    lineHeight: 1.8,
  },
  cardLink: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-primary, #2563eb)',
    textDecoration: 'none',
  },

  // CTA
  ctaSection: {
    paddingTop: 48,
    borderTop: '1px solid var(--color-border-default, #e2e8f0)',
    marginTop: 56,
  },
  ctaLinks: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 24,
    justifyContent: 'center',
  },
  ctaLink: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--color-primary, #2563eb)',
    textDecoration: 'none',
  },
};

export default ContactPage;
