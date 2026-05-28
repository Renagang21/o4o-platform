/**
 * PartnerInfoPage - 공급자/파트너/협력사 참여 안내 페이지
 *
 * 네뚜레(Neture)는 유통 정보 플랫폼입니다.
 * 이 페이지는 공급자·파트너·협력사가 네뚜레에 등록하기 위한 안내를 제공합니다.
 *
 * WO-NETURE-PARTNER-INFO-PAGE-V2: 채널·판매 구조 안내 추가
 *
 * 책임:
 * - 각 역할의 정의와 관계 설명
 * - 참여 절차 안내
 * - 채널·판매 구조 연결
 */

import { Link } from 'react-router-dom';

interface RoleCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  linkTo: string;
  linkText: string;
}

const ROLE_CARDS: RoleCard[] = [
  {
    id: 'supplier',
    icon: '📦',
    title: '공급자',
    description: '상품을 공급하고 유통망에 참여합니다. 공급자 등록을 통해 다양한 서비스에 상품을 노출할 수 있습니다.',
    linkTo: '/suppliers',
    linkText: '등록된 공급자 보기',
  },
  {
    id: 'partner',
    icon: '🤝',
    title: '파트너',
    description: '판매 및 유통 파트너로 참여합니다. 파트너십 요청을 통해 공급자와 연결될 수 있습니다.',
    linkTo: '/partners/requests',
    linkText: '파트너십 요청 보기',
  },
  {
    id: 'collaborator',
    icon: '🌐',
    title: '협력사',
    description: '마케팅, 물류, 기술 등 다양한 형태로 협력합니다. 협력 제안은 문의를 통해 접수됩니다.',
    linkTo: '/contact',
    linkText: '문의하기',
  },
];

export function PartnerInfoPage() {
  return (
    <div style={styles.container}>
      {/* 운영형 알파 상태 배너 (WO-V080-PARTNER-STABILITY-CHECKLIST-UPDATE) */}
      <div style={styles.alphaBanner}>
        <div style={styles.alphaBadgeWrapper}>
          <span style={styles.alphaIndicator}></span>
          <span style={styles.alphaBadgeText}>운영형 알파 · v0.8.0</span>
        </div>
        <p style={styles.alphaBannerText}>
          현재 파트너·운영자와 함께 구조를 검증하는 단계입니다.
        </p>
      </div>

      {/* o4o 소개 유도 배너 (WO-NETURE-PARTNERS-INFO-O4O-REALIGNMENT-V1) */}
      <div style={styles.o4oBanner}>
        <p style={styles.o4oBannerText}>
          o4o 플랫폼의 구조와 철학을 먼저 확인해 보세요.
        </p>
        <Link to="/o4o" style={styles.o4oBannerLink}>
          o4o 플랫폼 소개 보기 →
        </Link>
      </div>

      {/* 상단 설명 영역 */}
      <header style={styles.header}>
        <h1 style={styles.title}>참여 안내</h1>
        <div style={styles.notice}>
          <p style={styles.noticeText}>
            공급자, 파트너, 협력사로 네뚜레에 참여할 수 있습니다.
          </p>
          <p style={styles.noticeText}>
            등록된 정보는 K-Cosmetics, GlycoPharm 등 연결된 서비스에 노출됩니다.
          </p>
        </div>
      </header>

      {/* 역할 카드 영역 */}
      <section style={styles.cardsSection}>
        {ROLE_CARDS.map((card) => (
          <div key={card.id} style={styles.card}>
            <div style={styles.cardIcon}>{card.icon}</div>
            <h2 style={styles.cardTitle}>{card.title}</h2>
            <p style={styles.cardDescription}>{card.description}</p>
            <Link to={card.linkTo} style={styles.cardLink}>
              {card.linkText} →
            </Link>
          </div>
        ))}
      </section>

      {/* 파트너 모집 제품 안내 (WO-PARTNER-RECRUIT-PHASE1-V1) */}
      <section style={styles.recruitSection}>
        <h2 style={styles.recruitSectionTitle}>파트너 모집 중인 제품</h2>
        <p style={styles.recruitSectionText}>
          공급자가 파트너를 모집 중인 제품을 확인하고,
          <br />
          파트너로서 소개할 수 있는 기회를 탐색하세요.
        </p>
        <Link to="/partner/dashboard" style={styles.recruitLink}>
          모집 중인 제품 보기 →
        </Link>
      </section>

      {/* 참여 절차 안내 */}
      <section style={styles.processSection}>
        <h2 style={styles.processTitle}>참여 절차</h2>
        <div style={styles.processSteps}>
          <div style={styles.step}>
            <div style={styles.stepNumber}>1</div>
            <p style={styles.stepText}>공급자/파트너 정보 확인</p>
          </div>
          <div style={styles.stepArrow}>→</div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>2</div>
            <p style={styles.stepText}>문의 또는 신청</p>
          </div>
          <div style={styles.stepArrow}>→</div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>3</div>
            <p style={styles.stepText}>검토 및 승인</p>
          </div>
          <div style={styles.stepArrow}>→</div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>4</div>
            <p style={styles.stepText}>정보 등록 완료</p>
          </div>
        </div>
      </section>

      {/* 채널·판매 구조 안내 (WO-NETURE-PARTNER-INFO-PAGE-V2) */}
      <section style={styles.channelSection}>
        <h2 style={styles.channelSectionTitle}>채널·판매 구조 이해하기</h2>
        <p style={styles.channelSectionText}>
          o4o 플랫폼의 <strong>무재고 판매 구조</strong>와 <strong>채널 주도권</strong> 개념을 이해하면
          <br />
          파트너로서 어떤 역할을 수행하게 되는지 명확해집니다.
        </p>
        <div style={styles.channelLinks}>
          <Link to="/channel/structure" style={styles.channelLinkPrimary}>
            채널·판매 구조 상세 보기 →
          </Link>
          <Link to="/seller/overview" style={styles.channelLinkSecondary}>
            매장(판매자) 안내 보기 →
          </Link>
        </div>
      </section>

      {/* 플랫폼 운영 원칙 안내 (WO-NETURE-PHARMA-LEGAL-JUDGMENT-V1) */}
      <section style={styles.principlesSection}>
        <h2 style={styles.principlesSectionTitle}>플랫폼 운영 원칙</h2>
        <p style={styles.principlesSectionText}>
          Neture는 왜 약국·도매상 자격을 직접 검증하지 않는지,
          <br />
          플랫폼의 역할과 책임 범위를 안내합니다.
        </p>
        <Link to="/platform/principles" style={styles.principlesLink}>
          운영 원칙 자세히 보기 →
        </Link>
      </section>

      {/* 하단 */}
      <footer style={styles.footer}>
        <Link to="/" style={styles.backLink}>
          ← 홈으로 돌아가기
        </Link>
      </footer>
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB'; // Neture blue color

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '48px 24px',
  },
  // Alpha 상태 배너 (WO-V080-PARTNER-STABILITY-CHECKLIST-UPDATE)
  alphaBanner: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '16px',
    textAlign: 'center',
  },
  alphaBadgeWrapper: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 12px',
    backgroundColor: '#0f172a',
    borderRadius: '20px',
    marginBottom: '12px',
  },
  alphaIndicator: {
    width: '6px',
    height: '6px',
    backgroundColor: '#34d399',
    borderRadius: '50%',
  },
  alphaBadgeText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.9)',
  },
  alphaBannerText: {
    fontSize: '14px',
    color: '#065f46',
    margin: 0,
  },
  // o4o 유도 배너 (WO-NETURE-PARTNERS-INFO-O4O-REALIGNMENT-V1)
  o4oBanner: {
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
  },
  o4oBannerText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '15px',
    margin: 0,
  },
  o4oBannerLink: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '6px',
    textDecoration: 'none',
  },
  header: {
    textAlign: 'center',
    marginBottom: '48px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: '24px',
  },
  notice: {
    backgroundColor: '#EFF6FF',
    padding: '24px',
    borderRadius: '12px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  noticeText: {
    fontSize: '15px',
    color: '#333',
    margin: '0 0 8px 0',
    lineHeight: 1.6,
  },
  cardsSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '24px',
    marginBottom: '48px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '32px 24px',
    textAlign: 'center',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
    border: '1px solid #f0f0f0',
  },
  cardIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '12px',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.6,
    marginBottom: '16px',
  },
  cardLink: {
    fontSize: '14px',
    color: PRIMARY_COLOR,
    textDecoration: 'none',
    fontWeight: 500,
  },
  processSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '32px',
    textAlign: 'center',
  },
  processTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '24px',
  },
  processSteps: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  stepNumber: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 600,
  },
  stepText: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
  },
  stepArrow: {
    fontSize: '20px',
    color: '#ccc',
  },
  // Recruit Section (WO-PARTNER-RECRUIT-PHASE1-V1)
  recruitSection: {
    backgroundColor: '#f5f3ff',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '32px',
    textAlign: 'center',
  },
  recruitSectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#6d28d9',
    marginBottom: '16px',
  },
  recruitSectionText: {
    fontSize: '15px',
    color: '#334155',
    lineHeight: 1.7,
    marginBottom: '20px',
  },
  recruitLink: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#7c3aed',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
  },
  // Channel Section (WO-NETURE-PARTNER-INFO-PAGE-V2)
  channelSection: {
    backgroundColor: '#f0f9ff',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '32px',
    textAlign: 'center',
  },
  channelSectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#0369a1',
    marginBottom: '16px',
  },
  channelSectionText: {
    fontSize: '15px',
    color: '#334155',
    lineHeight: 1.7,
    marginBottom: '20px',
  },
  channelLinks: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  channelLinkPrimary: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
  },
  channelLinkSecondary: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#fff',
    color: PRIMARY_COLOR,
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
    border: `1px solid ${PRIMARY_COLOR}`,
  },
  // Principles Section (WO-NETURE-PHARMA-LEGAL-JUDGMENT-V1)
  principlesSection: {
    backgroundColor: '#fef3c7',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '32px',
    textAlign: 'center',
  },
  principlesSectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#92400e',
    marginBottom: '16px',
  },
  principlesSectionText: {
    fontSize: '15px',
    color: '#78350f',
    lineHeight: 1.7,
    marginBottom: '20px',
  },
  principlesLink: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#92400e',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
  },
  footer: {
    textAlign: 'center',
  },
  backLink: {
    fontSize: '14px',
    color: '#666',
    textDecoration: 'none',
  },
};

export default PartnerInfoPage;
