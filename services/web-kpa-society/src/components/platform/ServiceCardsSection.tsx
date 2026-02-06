/**
 * ServiceCardsSection - 서비스 카드 그리드 섹션
 *
 * WO-KPA-HOME-FOUNDATION-V1
 * WO-KPA-HOME-SERVICE-SECTION-V1: 서비스 섹션 정비
 *   - 5개 서비스 카드 (지부, 분회, 약국, 포럼, LMS)
 *   - 혈당관리 프로그램 별도 블록
 *   - 배지 규칙: demo(지부만), independent(분회만)
 */

import { ServiceCard, type ServiceBadgeType, type ServiceCardCTA } from './ServiceCard';

interface ServiceItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  href: string;
  badgeType: ServiceBadgeType;
  ctas: ServiceCardCTA[];
  subText?: string;
}

/**
 * 서비스 목록
 * WO-KPA-HOME-SERVICE-SECTION-V1 요구사항에 따라 정의
 */
const services: ServiceItem[] = [
  {
    id: 'branch-org',
    icon: '🏛️',
    title: '약사회 지부 서비스',
    description:
      '약사회 지부를 위한 전용 SaaS 서비스입니다. ' +
      '지부 단위의 운영, 공지, 참여 관리를 독립적인 도메인 환경에서 사용할 수 있도록 설계되었습니다.\n\n' +
      '현재는 실제 도입 지부가 없어 전체 기능을 갖춘 데모 형태로 제공되고 있습니다.',
    href: '/services/branch',
    badgeType: 'demo',
    ctas: [
      { label: '지부 서비스 데모 보기', href: '/demo', primary: true },
      { label: '도입 안내', href: '/join/branch' },
    ],
  },
  {
    id: 'chapter',
    icon: '🏢',
    title: '분회 서비스',
    description:
      '분회가 지부와 관계없이 자체적으로 운영할 수 있는 서비스입니다.\n\n' +
      '여러 분회가 각자 독립적으로 이용할 수 있으며, 도메인은 포워딩 방식으로 운영 가능합니다.',
    href: '/services/division',
    badgeType: 'independent',
    ctas: [
      { label: '분회 서비스 보기', href: '/branch-services/demo', primary: true },
      { label: '분회 참여 안내', href: '/join/division' },
    ],
  },
  {
    id: 'pharmacy',
    icon: '💊',
    title: '약국 서비스',
    description:
      '개별 약국을 위한 서비스 운영 환경을 제공합니다. ' +
      '약국별 전용 대시보드를 통해 필요한 서비스와 프로그램을 선택적으로 이용할 수 있습니다.',
    href: '/services/pharmacy',
    badgeType: 'none',
    subText: '혈당관리 프로그램 (선택 참여)',
    ctas: [{ label: '약국 서비스 보기', href: '/services/pharmacy', primary: true }],
  },
  {
    id: 'forum',
    icon: '💬',
    title: '약사 포럼',
    description:
      '약사를 위한 전용 커뮤니티 서비스입니다. ' +
      '주제별 포럼을 통해 정보 공유와 소통이 가능합니다.',
    href: '/services/forum',
    badgeType: 'none',
    ctas: [{ label: '포럼 바로가기', href: '/forum', primary: true }],
  },
  {
    id: 'lms',
    icon: '📄',
    title: '콘텐츠 안내',
    description:
      '약사 개인을 위한 콘텐츠 열람 및 진행 관리 서비스입니다. ' +
      '콘텐츠 열람과 진행 이력을 관리할 수 있습니다.',
    href: '/services/lms',
    badgeType: 'none',
    ctas: [{ label: '콘텐츠 서비스 보기', href: '/demo/lms', primary: true }],
  },
];

/**
 * 혈당관리 프로그램 별도 블록
 */
function GlucoseProgramBlock() {
  return (
    <div style={glucoseStyles.block}>
      <div style={glucoseStyles.content}>
        <div style={glucoseStyles.icon}>🩸</div>
        <div style={glucoseStyles.textWrapper}>
          <h3 style={glucoseStyles.title}>혈당관리 프로그램</h3>
          <p style={glucoseStyles.description}>
            혈당관리 프로그램은 약국 서비스 내에서 선택적으로 참여하는 특화 프로그램입니다.
          </p>
        </div>
        <a href="/info/glucose-program" style={glucoseStyles.cta}>
          프로그램 안내
        </a>
      </div>
    </div>
  );
}

export function ServiceCardsSection() {
  return (
    <section id="services" style={styles.section}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>서비스</h2>
        <p style={styles.sectionSubtitle}>
          약사 직능을 위한 플랫폼 서비스
        </p>
        <div style={styles.grid}>
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              icon={service.icon}
              title={service.title}
              description={service.description}
              href={service.href}
              badgeType={service.badgeType}
              ctas={service.ctas}
              subText={service.subText}
            />
          ))}
        </div>

        {/* 혈당관리 프로그램 별도 블록 */}
        <GlucoseProgramBlock />
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: '64px 24px',
    backgroundColor: '#f8fafc',
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#0f172a',
    textAlign: 'center',
    margin: '0 0 8px 0',
  },
  sectionSubtitle: {
    fontSize: '1rem',
    color: '#64748b',
    textAlign: 'center',
    margin: '0 0 40px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  },
};

const glucoseStyles: Record<string, React.CSSProperties> = {
  block: {
    marginTop: '40px',
    padding: '24px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e0e7ff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
  },
  icon: {
    fontSize: '2.5rem',
    flexShrink: 0,
  },
  textWrapper: {
    flex: 1,
    minWidth: '200px',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 4px 0',
  },
  description: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  },
  cta: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: '#6366f1',
    color: '#fff',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'background-color 0.2s',
    flexShrink: 0,
  },
};

export default ServiceCardsSection;
