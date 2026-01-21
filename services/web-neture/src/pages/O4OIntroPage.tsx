/**
 * O4OIntroPage - o4o 플랫폼 소개 페이지
 *
 * WO-NETURE-O4O-INTRO-PAGE-IMPLEMENTATION-V1
 * WO-NETURE-O4O-INTRO-PAGE-COPY-REPLACEMENT-V1: 단문 카피 세트 v1 적용
 * WO-NETURE-O4O-INTRO-PAGE-EXPANSION-V2: 판매자(각 매장) 섹션 추가
 * WO-NETURE-O4O-INTRO-PAGE-CHANNEL-UPDATE-V3: 무재고 판매/채널 주도권 컨셉 추가
 * - /o4o 경로
 * - Hero + Section A + Section A-2(판매자) + Section A-3(채널/판매) + Section B~D + Next Step
 * - 반응형 대응 (Desktop/Tablet/Mobile)
 */

import { Link } from 'react-router-dom';

export default function O4OIntroPage() {
  return (
    <div style={styles.page}>
      {/* Hero Section - Full Width Banner */}
      <HeroSection />

      {/* Section A: 비즈니스를 주도하는 운영자 */}
      <SectionA />

      {/* Section A-2: 실제 판매를 담당하는 판매자(각 매장) */}
      <SectionSeller />

      {/* Section A-3: 채널 주도권과 무재고 판매 */}
      <SectionChannel />

      {/* Section B: 투자 관점 */}
      <SectionB />

      {/* Section C: 스타트업 / 사업모델 설계자 */}
      <SectionC />

      {/* Section D: 경계 선언 */}
      <SectionD />

      {/* Next Step / Contact */}
      <NextStepSection />
    </div>
  );
}

/**
 * Hero Section
 * 제목 + 부제목 + Small note
 */
function HeroSection() {
  return (
    <section style={styles.hero}>
      <div style={styles.heroContainer}>
        <h1 style={styles.heroTitle}>
          오프라인 사업자가
          <br />
          스스로 비즈니스를 운영합니다
        </h1>
        <p style={styles.heroSubtitle}>
          o4o는 사업을 대신하지 않습니다.
          <br />
          사업자가 직접 운영합니다.
        </p>
        <p style={styles.heroSmallNote}>
          네뚜레는 o4o 플랫폼 위에서 운영되는 서비스 중 하나입니다.
        </p>
      </div>
    </section>
  );
}

/**
 * Section A: 비즈니스를 주도하는 운영자
 * 3-column card grid - 클릭 가능한 카드
 */
function SectionA() {
  const cards = [
    {
      icon: '🏪',
      title: '전통시장 운영자',
      description: '시장 전체를\n하나의 서비스로 운영합니다.',
      smallNote: '운영 주체는 시장입니다',
      linkTo: '/seller/overview/market',
    },
    {
      icon: '💇',
      title: '미용실 · 헬스장',
      description: '대기 공간을\n비즈니스 접점으로 전환합니다.',
      smallNote: '콘텐츠는 매장이 결정합니다',
      linkTo: '/seller/overview/beauty',
    },
    {
      icon: '🏥',
      title: '의료·전문 조직',
      description: '신뢰가 중요한 공간일수록\n주도권은 내부에 있습니다.',
      smallNote: '치과·의원·병원 등',
      linkTo: '/seller/overview/medical',
    },
  ];

  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>
          매장을 가진 당신이
          <br />
          하나의 서비스를 운영할 수 있다면
        </h2>
        <p style={styles.sectionSubtitle}>
          운영의 주도권은 사업자에게 있습니다.
        </p>
        <div style={styles.cardGrid3}>
          {cards.map((card, index) => (
            <Link key={index} to={card.linkTo} style={styles.cardLink}>
              <div style={styles.cardClickable}>
                <div style={styles.cardIcon}>{card.icon}</div>
                <h3 style={styles.cardTitle}>{card.title}</h3>
                <p style={styles.cardDescription}>{card.description}</p>
                {card.smallNote && (
                  <p style={styles.cardSmallNote}>{card.smallNote}</p>
                )}
                <span style={styles.cardArrow}>자세히 보기 →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Section A-2: 실제 판매를 담당하는 판매자(각 매장)
 * WO-NETURE-O4O-INTRO-PAGE-EXPANSION-V2
 * 3-column card grid - 클릭 가능한 카드
 */
function SectionSeller() {
  const cards = [
    {
      icon: '🛒',
      title: '전통시장 내 개별 점포',
      description: '시장 운영 구조에 참여하여\n추가 비용 없이 노출과 참여 기회를 얻습니다.',
      linkTo: '/seller/overview/market',
    },
    {
      icon: '💈',
      title: '미용실 · 헬스장 · 약국',
      description: '복잡한 설정 없이\n선택된 구조에 참여하기만 하면 됩니다.',
      linkTo: '/seller/overview/pharmacy',
    },
    {
      icon: '🏬',
      title: '전문 매장',
      description: '매장의 정체성을 해치지 않는 범위에서\n새로운 홍보·수익 접점을 만듭니다.',
      linkTo: '/seller/overview',
    },
  ];

  return (
    <section style={{ ...styles.section, backgroundColor: '#f8fafc' }}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>
          매장을 운영하는 판매자라면
        </h2>
        <p style={styles.sectionSubtitle}>
          각 매장은 실제 판매를 담당합니다.
        </p>
        <div style={styles.cardGrid3}>
          {cards.map((card, index) => (
            <Link key={index} to={card.linkTo} style={styles.cardLink}>
              <div style={styles.cardClickable}>
                <div style={styles.cardIcon}>{card.icon}</div>
                <h3 style={styles.cardTitle}>{card.title}</h3>
                <p style={styles.cardDescription}>{card.description}</p>
                <span style={styles.cardArrow}>자세히 보기 →</span>
              </div>
            </Link>
          ))}
        </div>
        <p style={styles.sellerNote}>
          매장은 참여에 집중합니다.
        </p>
      </div>
    </section>
  );
}

/**
 * Section A-3: 채널 주도권과 무재고 판매
 * WO-NETURE-O4O-INTRO-PAGE-CHANNEL-UPDATE-V3
 * 핵심: 매장이 채널을 소유하고, 재고 없이 판매 - 클릭 가능한 카드
 */
function SectionChannel() {
  const cards = [
    {
      icon: '📱',
      title: '채널 주도권',
      description: '매장이 디지털 채널을 소유합니다.\nQR 기반으로 고객 접점을 직접 관리합니다.',
      smallNote: '플랫폼은 도구만 제공',
      linkTo: '/seller/qr-guide',
    },
    {
      icon: '📦',
      title: '무재고 판매',
      description: '재고 보유 없이 판매합니다.\n취급과 노출만 매장이 선택합니다.',
      smallNote: '보관·배송 부담 없음',
      linkTo: '/channel/structure',
    },
    {
      icon: '🔄',
      title: 'B2B + B2C 동시',
      description: '공급사에서 매장으로,\n매장에서 소비자로 연결됩니다.',
      smallNote: '하나의 흐름',
      linkTo: '/channel/structure',
    },
  ];

  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>
          매장이 채널을 소유하고
          <br />
          재고 없이 판매할 수 있다면
        </h2>
        <p style={styles.sectionSubtitle}>
          디지털 채널은 매장의 것입니다.
          <br />
          부담 없이 참여할 수 있습니다.
        </p>
        <div style={styles.cardGrid3}>
          {cards.map((card, index) => (
            <Link key={index} to={card.linkTo} style={styles.cardLink}>
              <div style={styles.cardClickable}>
                <div style={styles.cardIcon}>{card.icon}</div>
                <h3 style={styles.cardTitle}>{card.title}</h3>
                <p style={styles.cardDescription}>{card.description}</p>
                {card.smallNote && (
                  <p style={styles.cardSmallNote}>{card.smallNote}</p>
                )}
                <span style={styles.cardArrow}>자세히 보기 →</span>
              </div>
            </Link>
          ))}
        </div>
        <p style={styles.channelNote}>
          <Link to="/channel/structure" style={styles.channelLinkBtn}>
            채널·판매 구조 상세 보기 →
          </Link>
        </p>
      </div>
    </section>
  );
}

/**
 * Section B: 투자 관점
 * 2 cards layout
 */
function SectionB() {
  const cards = [
    {
      icon: '🛡️',
      title: '리스크 분리',
      description: '개별 사업의 성패는\n다른 사업에 영향을 주지 않습니다.',
    },
    {
      icon: '🧱',
      title: '누적',
      description: '사업은 바뀌어도\n경험은 누적됩니다.',
    },
  ];

  return (
    <section style={{ ...styles.section, backgroundColor: '#f8fafc' }}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>
          하나의 사업이 아닌
          <br />
          여러 사업이 함께 성장합니다
        </h2>
        <p style={styles.sectionSubtitle}>
          각 사업은 독립적으로 운영됩니다.
        </p>
        <div style={styles.cardGrid2}>
          {cards.map((card, index) => (
            <div key={index} style={styles.cardLarge}>
              <div style={styles.cardIcon}>{card.icon}</div>
              <h3 style={styles.cardTitle}>{card.title}</h3>
              <p style={styles.cardDescription}>{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Section C: 스타트업 / 사업모델 설계자
 * 3-column card grid - 클릭 가능한 카드
 */
function SectionC() {
  const cards = [
    {
      icon: '📦',
      title: '제품 공급사',
      description: '영업 없이도\n매장 기반 구조를 설계합니다.',
      linkTo: '/partner/overview-info',
    },
    {
      icon: '🎬',
      title: '콘텐츠 사업자',
      description: '콘텐츠를\n실제 공간과 연결합니다.',
      linkTo: '/partner/overview-info',
    },
    {
      icon: '📢',
      title: '마케팅 · 기획사',
      description: '광고가 아닌\n운영 가능한 구조를 만듭니다.',
      linkTo: '/partners/info',
    },
  ];

  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>
          매장을 운영하지 않아도
          <br />
          매장 기반 비즈니스를 설계할 수 있다면
        </h2>
        <p style={styles.sectionSubtitle}>
          o4o와 함께 새로운 시도를 할 수 있습니다.
        </p>
        <div style={styles.cardGrid3}>
          {cards.map((card, index) => (
            <Link key={index} to={card.linkTo} style={styles.cardLink}>
              <div style={styles.cardClickable}>
                <div style={styles.cardIcon}>{card.icon}</div>
                <h3 style={styles.cardTitle}>{card.title}</h3>
                <p style={styles.cardDescription}>{card.description}</p>
                <span style={styles.cardArrow}>자세히 보기 →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Section D: 경계 선언
 * 2-column comparison (What we do / What we don't)
 */
function SectionD() {
  const weDo = [
    '도구',
    '기술',
    '연결',
  ];

  const weDont = [
    '사업 운영',
    '콘텐츠 결정',
    '매출 책임',
  ];

  return (
    <section style={{ ...styles.section, backgroundColor: '#f8fafc' }}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>경계 선언</h2>
        <p style={styles.sectionSubtitle}>
          o4o가 하는 것과 하지 않는 것
        </p>
        <div style={styles.comparisonGrid}>
          <div style={styles.comparisonCard}>
            <h3 style={styles.comparisonTitle}>
              <span style={styles.checkIcon}>✓</span> o4o가 제공하는 것
            </h3>
            <ul style={styles.comparisonList}>
              {weDo.map((item, index) => (
                <li key={index} style={styles.comparisonItem}>{item}</li>
              ))}
            </ul>
          </div>
          <div style={{ ...styles.comparisonCard, backgroundColor: '#fef2f2' }}>
            <h3 style={{ ...styles.comparisonTitle, color: '#dc2626' }}>
              <span style={styles.crossIcon}>✕</span> o4o가 하지 않는 것
            </h3>
            <ul style={styles.comparisonList}>
              {weDont.map((item, index) => (
                <li key={index} style={{ ...styles.comparisonItem, color: '#64748b' }}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Next Step / Contact Section
 */
function NextStepSection() {
  return (
    <section style={styles.nextStep}>
      <div style={styles.container}>
        <p style={styles.nextStepMessage}>
          o4o는 모든 사업에 열려 있지 않습니다.
          <br />
          공감하는 경우에만 다음 단계로 진행합니다.
        </p>
        <div style={styles.ctaGroup}>
          <Link to="/partners/apply" style={styles.ctaPrimary}>
            플랫폼 기반 사업 문의
          </Link>
          <Link to="/partners/apply" style={styles.ctaSecondary}>
            o4o 상담 요청
          </Link>
        </div>
        <p style={styles.nextStepSmallNote}>
          제안서는 접촉 이후에만 제공됩니다.
        </p>
      </div>
    </section>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },

  // Hero
  hero: {
    backgroundColor: PRIMARY_COLOR,
    padding: '80px 20px',
    textAlign: 'center',
  },
  heroContainer: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  heroTitle: {
    fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
    fontWeight: 700,
    color: '#fff',
    margin: '0 0 20px 0',
    lineHeight: 1.4,
  },
  heroSubtitle: {
    fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
    color: 'rgba(255, 255, 255, 0.9)',
    margin: '0 0 24px 0',
    lineHeight: 1.6,
  },
  heroSmallNote: {
    fontSize: 'clamp(0.8rem, 1.5vw, 0.9rem)',
    color: 'rgba(255, 255, 255, 0.6)',
    margin: 0,
  },

  // Section common
  section: {
    padding: '64px 20px',
    backgroundColor: '#fff',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
    fontWeight: 700,
    color: '#0f172a',
    textAlign: 'center',
    margin: '0 0 12px 0',
    lineHeight: 1.4,
  },
  sectionSubtitle: {
    fontSize: 'clamp(0.9rem, 2vw, 1rem)',
    color: '#64748b',
    textAlign: 'center',
    margin: '0 0 40px 0',
    lineHeight: 1.6,
  },

  // 3-column grid
  cardGrid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  },

  // 2-column grid
  cardGrid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px',
  },

  // Card
  card: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '32px 24px',
    textAlign: 'center',
  },
  cardLarge: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '40px 32px',
    textAlign: 'center',
  },
  cardIcon: {
    fontSize: '2.5rem',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 12px 0',
  },
  cardDescription: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: 1.6,
    margin: 0,
    whiteSpace: 'pre-line',
  },
  cardSmallNote: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    marginTop: '12px',
    fontStyle: 'italic',
  },

  // Clickable card styles
  cardLink: {
    textDecoration: 'none',
  },
  cardClickable: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '32px 24px',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  cardArrow: {
    display: 'block',
    marginTop: '16px',
    fontSize: '0.9rem',
    color: PRIMARY_COLOR,
    fontWeight: 500,
  },

  // Seller section note (WO-NETURE-O4O-INTRO-PAGE-EXPANSION-V2)
  sellerNote: {
    fontSize: 'clamp(0.85rem, 1.5vw, 0.95rem)',
    color: '#64748b',
    textAlign: 'center',
    marginTop: '32px',
    margin: '32px auto 0',
    maxWidth: '600px',
    lineHeight: 1.6,
  },

  // Channel section (WO-NETURE-O4O-INTRO-PAGE-CHANNEL-UPDATE-V3)
  channelNote: {
    textAlign: 'center',
    marginTop: '32px',
  },
  channelLink: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#f1f5f9',
    color: PRIMARY_COLOR,
    fontSize: '0.95rem',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
  },
  channelLinkBtn: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
  },

  // Comparison grid
  comparisonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  comparisonCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: '12px',
    padding: '32px',
  },
  comparisonTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#16a34a',
    margin: '0 0 20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  checkIcon: {
    fontSize: '1.25rem',
  },
  crossIcon: {
    fontSize: '1.25rem',
  },
  comparisonList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  comparisonItem: {
    fontSize: '1rem',
    color: '#0f172a',
    padding: '8px 0',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
  },

  // Next Step
  nextStep: {
    backgroundColor: '#0f172a',
    padding: '80px 20px',
    textAlign: 'center',
  },
  nextStepMessage: {
    fontSize: 'clamp(1rem, 2vw, 1.1rem)',
    color: 'rgba(255, 255, 255, 0.9)',
    margin: '0 0 32px 0',
    lineHeight: 1.6,
  },
  ctaGroup: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '24px',
  },
  ctaPrimary: {
    display: 'inline-block',
    padding: '14px 28px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
  },
  ctaSecondary: {
    display: 'inline-block',
    padding: '14px 28px',
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  nextStepSmallNote: {
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.5)',
    margin: 0,
  },
  contactText: {
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.6)',
    margin: 0,
  },
  contactLink: {
    color: '#fff',
    textDecoration: 'none',
  },
};
