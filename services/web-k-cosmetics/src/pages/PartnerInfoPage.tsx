/**
 * PartnerInfoPage - 공급자/파트너/협력사 안내 페이지
 *
 * 이 페이지는 소비자-facing 서비스에서
 * 공급자·파트너·협력사가 서비스와 관계를 맺을 수 있는 공식 진입 통로를 제공합니다.
 *
 * 책임:
 * - 역할과 관계 설명
 * - 네뚜레(Neture)로의 연결
 *
 * 하지 않는 것:
 * - 회원가입/로그인 유도
 * - 기능/가격/계약 설명
 */

import { Link } from 'react-router-dom';

interface RoleCard {
  id: string;
  icon: string;
  title: string;
  description: string;
}

const ROLE_CARDS: RoleCard[] = [
  {
    id: 'supplier',
    icon: '📦',
    title: '공급자',
    description: '상품을 공급하고 K-Cosmetics 유통망에 참여합니다. 공급 등록 및 관리는 네뚜레에서 진행됩니다.',
  },
  {
    id: 'partner',
    icon: '🤝',
    title: '파트너',
    description: '판매 및 유통 파트너로 참여합니다. 파트너 등록 및 정산은 네뚜레에서 통합 관리됩니다.',
  },
  {
    id: 'collaborator',
    icon: '🌐',
    title: '협력사',
    description: '마케팅, 물류, 기술 등 다양한 형태로 협력합니다. 협력 제안은 네뚜레를 통해 접수됩니다.',
  },
];

export function PartnerInfoPage() {
  return (
    <div style={styles.container}>
      {/* 상단 설명 영역 */}
      <header style={styles.header}>
        <h1 style={styles.title}>공급자 · 파트너 · 협력사 안내</h1>
        <div style={styles.notice}>
          <p style={styles.noticeText}>
            <strong>K-Cosmetics는 소비자를 위한 쇼핑 공간입니다.</strong>
          </p>
          <p style={styles.noticeText}>
            공급자, 파트너, 협력사는 이 서비스의 회원이 아닙니다.
          </p>
          <p style={styles.noticeText}>
            참여 및 협력은 <strong>네뚜레(Neture)</strong>를 통해 이루어집니다.
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
          </div>
        ))}
      </section>

      {/* 네뚜레 연결 */}
      <section style={styles.ctaSection}>
        <p style={styles.ctaText}>
          모든 역할의 등록과 관리는 네뚜레에서 통합 진행됩니다.
        </p>
        <a
          href="https://neture.co.kr"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.ctaButton}
        >
          네뚜레로 이동
        </a>
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

const PRIMARY_COLOR = '#FF6B9D';

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
    backgroundColor: '#FFF0F5',
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
    margin: 0,
  },
  ctaSection: {
    textAlign: 'center',
    padding: '32px',
    backgroundColor: '#f8f9fa',
    borderRadius: '16px',
    marginBottom: '32px',
  },
  ctaText: {
    fontSize: '16px',
    color: '#333',
    marginBottom: '20px',
  },
  ctaButton: {
    display: 'inline-block',
    padding: '16px 48px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
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
