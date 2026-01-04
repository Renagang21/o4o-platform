/**
 * FeatureSection - 아이콘과 서비스 소개
 * 4개의 주요 서비스/역할 소개
 */

import { Link } from 'react-router-dom';

interface Feature {
  icon: string;
  title: string;
  description: string;
  link: string;
  linkText: string;
}

interface FeatureSectionProps {
  title?: string;
  features?: Feature[];
}

const defaultFeatures: Feature[] = [
  {
    icon: '🛡️',
    title: '관리자',
    description: '플랫폼 전체를 관리하고 모니터링합니다. 사용자, 상품, 주문 현황을 한눈에 파악할 수 있습니다.',
    link: '/admin',
    linkText: '관리자 대시보드',
  },
  {
    icon: '📦',
    title: '공급자',
    description: '상품을 등록하고 재고를 관리합니다. 판매자에게 상품 정보와 자료를 제공합니다.',
    link: '/supplier',
    linkText: '공급자 대시보드',
  },
  {
    icon: '🏪',
    title: '판매자',
    description: '다중 채널에서 상품을 판매합니다. 주문 관리와 배송 요청을 간편하게 처리합니다.',
    link: '/seller',
    linkText: '판매자 대시보드',
  },
  {
    icon: '🤝',
    title: '파트너',
    description: '물류, 마케팅 등 부가 서비스를 제공합니다. 판매자와 협력하여 비즈니스를 성장시킵니다.',
    link: '/partner',
    linkText: '파트너 대시보드',
  },
];

export function FeatureSection({
  title = '다양한 역할을 위한 맞춤 서비스',
  features = defaultFeatures,
}: FeatureSectionProps) {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>{title}</h2>
        <div style={styles.grid}>
          {features.map((feature, index) => (
            <div key={index} style={styles.card}>
              <div style={styles.iconWrapper}>
                <span style={styles.icon}>{feature.icon}</span>
              </div>
              <h3 style={styles.cardTitle}>{feature.title}</h3>
              <p style={styles.cardDescription}>{feature.description}</p>
              <Link to={feature.link} style={styles.cardLink}>
                {feature.linkText} →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: '80px 20px',
    backgroundColor: '#fff',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: '48px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '32px',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    padding: '32px',
    textAlign: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid #e2e8f0',
  },
  iconWrapper: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    backgroundColor: '#EFF6FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  icon: {
    fontSize: '32px',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '12px',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#64748B',
    lineHeight: 1.6,
    marginBottom: '20px',
  },
  cardLink: {
    fontSize: '14px',
    fontWeight: 600,
    color: PRIMARY_COLOR,
    textDecoration: 'none',
  },
};
