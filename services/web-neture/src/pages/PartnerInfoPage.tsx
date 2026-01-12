/**
 * PartnerInfoPage - 공급자/파트너/협력사 참여 안내 페이지
 *
 * 네뚜레(Neture)는 유통 정보 플랫폼입니다.
 * 이 페이지는 공급자·파트너·협력사가 네뚜레에 등록하기 위한 안내를 제공합니다.
 *
 * 책임:
 * - 각 역할의 정의와 관계 설명
 * - 참여 절차 안내
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
    description: '상품을 공급하고 O4O 유통망에 참여합니다. 공급자 등록을 통해 다양한 서비스에 상품을 노출할 수 있습니다.',
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
      {/* 상단 설명 영역 */}
      <header style={styles.header}>
        <h1 style={styles.title}>참여 안내</h1>
        <div style={styles.notice}>
          <p style={styles.noticeText}>
            <strong>네뚜레(Neture)는 O4O 유통 정보 플랫폼입니다.</strong>
          </p>
          <p style={styles.noticeText}>
            공급자, 파트너, 협력사로 참여하여 O4O 생태계에 합류하세요.
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
