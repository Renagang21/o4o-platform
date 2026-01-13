/**
 * KPA Society Home 페이지 - 경기도약사회 스타일
 * Hero + 카드 그리드 + 공지사항/행사 섹션
 */

import { Link } from 'react-router-dom';
import { HeroSection } from '../components';
import { colors } from '../styles/theme';

// 메인 서비스 카드
const serviceCards = [
  {
    icon: '📋',
    title: '공지사항',
    description: '약사회 공지 및 중요 안내사항을 확인하세요.',
    href: '/notices',
    color: colors.gray200,
  },
  {
    icon: '📚',
    title: '연수교육',
    description: '온라인 연수교육 및 학술세미나 정보',
    href: '/events',
    color: colors.gray200,
  },
  {
    icon: '🏢',
    title: '조직현황',
    description: '본부-지부-분회 조직도 및 현황',
    href: '/organizations',
    color: colors.gray200,
  },
  {
    icon: '📁',
    title: '자료실',
    description: '각종 서식 및 자료 다운로드',
    href: '/resources',
    color: colors.gray200,
  },
  {
    icon: '👥',
    title: '회원서비스',
    description: '회원 가입 및 신청 현황',
    href: '/member/apply',
    color: colors.gray200,
  },
  {
    icon: '💬',
    title: '커뮤니티',
    description: '회원 소식 및 자유게시판',
    href: '/community',
    color: colors.gray200,
  },
];

// 샘플 공지사항
const recentNotices = [
  { id: 1, title: '2024년 정기총회 안내', date: '2024-12-15', isImportant: true },
  { id: 2, title: '연수교육 일정 변경 안내', date: '2024-12-10', isImportant: true },
  { id: 3, title: '회비 납부 안내', date: '2024-12-05', isImportant: false },
  { id: 4, title: '약국 운영 관련 법규 개정 안내', date: '2024-12-01', isImportant: false },
  { id: 5, title: '동절기 의약품 보관 지침', date: '2024-11-25', isImportant: false },
];

// 샘플 행사
const upcomingEvents = [
  { id: 1, title: '2024년 정기총회', date: '2024-12-20', type: '행사' },
  { id: 2, title: '약물요법 심화과정 (12기)', date: '2024-12-15', type: '교육' },
  { id: 3, title: '송년의 밤', date: '2024-12-28', type: '행사' },
];

export function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <HeroSection />

      {/* Service Cards Grid */}
      <section style={styles.serviceSection}>
        <div style={styles.container}>
          <h2 style={styles.sectionTitle}>주요 서비스</h2>
          <div style={styles.cardGrid}>
            {serviceCards.map((card) => (
              <Link key={card.title} to={card.href} style={styles.card}>
                <div style={{ ...styles.cardIcon, backgroundColor: card.color }}>
                  {card.icon}
                </div>
                <h3 style={styles.cardTitle}>{card.title}</h3>
                <p style={styles.cardDescription}>{card.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Notice & Events Section */}
      <section style={styles.infoSection}>
        <div style={styles.container}>
          <div style={styles.infoGrid}>
            {/* 공지사항 */}
            <div style={styles.infoCard}>
              <div style={styles.infoHeader}>
                <h3 style={styles.infoTitle}>공지사항</h3>
                <Link to="/notices" style={styles.moreLink}>
                  더보기 →
                </Link>
              </div>
              <ul style={styles.noticeList}>
                {recentNotices.map((notice) => (
                  <li key={notice.id} style={styles.noticeItem}>
                    <Link to={`/notices/${notice.id}`} style={styles.noticeLink}>
                      {notice.isImportant && (
                        <span style={styles.importantBadge}>중요</span>
                      )}
                      <span style={styles.noticeTitle}>{notice.title}</span>
                      <span style={styles.noticeDate}>{notice.date}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 행사/교육 */}
            <div style={styles.infoCard}>
              <div style={styles.infoHeader}>
                <h3 style={styles.infoTitle}>행사/교육</h3>
                <Link to="/events" style={styles.moreLink}>
                  더보기 →
                </Link>
              </div>
              <ul style={styles.eventList}>
                {upcomingEvents.map((event) => (
                  <li key={event.id} style={styles.eventItem}>
                    <Link to={`/events/${event.id}`} style={styles.eventLink}>
                      <span style={styles.eventType}>{event.type}</span>
                      <span style={styles.eventTitle}>{event.title}</span>
                      <span style={styles.eventDate}>{event.date}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links Banner */}
      <section style={styles.bannerSection}>
        <div style={styles.container}>
          <div style={styles.bannerGrid}>
            <a href="https://kpanet.or.kr" target="_blank" rel="noopener noreferrer" style={styles.bannerItem}>
              <span style={styles.bannerText}>대한약사회</span>
            </a>
            <a href="https://health.kdca.go.kr" target="_blank" rel="noopener noreferrer" style={styles.bannerItem}>
              <span style={styles.bannerText}>질병관리청</span>
            </a>
            <a href="https://www.mfds.go.kr" target="_blank" rel="noopener noreferrer" style={styles.bannerItem}>
              <span style={styles.bannerText}>식품의약품안전처</span>
            </a>
            <a href="https://www.hira.or.kr" target="_blank" rel="noopener noreferrer" style={styles.bannerItem}>
              <span style={styles.bannerText}>건강보험심사평가원</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },
  // Service Section
  serviceSection: {
    padding: '60px 0',
    backgroundColor: colors.white,
  },
  sectionTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.gray900,
    textAlign: 'center',
    marginBottom: '40px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  },
  card: {
    display: 'block',
    padding: '30px',
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    textDecoration: 'none',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: `1px solid ${colors.gray200}`,
  },
  cardIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.gray900,
    marginBottom: '8px',
  },
  cardDescription: {
    fontSize: '14px',
    color: colors.gray600,
    lineHeight: 1.5,
    margin: 0,
  },
  // Info Section
  infoSection: {
    padding: '60px 0',
    backgroundColor: colors.gray100,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '30px',
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  infoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: `2px solid ${colors.primary}`,
  },
  infoTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.gray900,
    margin: 0,
  },
  moreLink: {
    fontSize: '14px',
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },
  // Notice List
  noticeList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  noticeItem: {
    borderBottom: `1px solid ${colors.gray200}`,
  },
  noticeLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 0',
    textDecoration: 'none',
    gap: '10px',
  },
  importantBadge: {
    flexShrink: 0,
    padding: '2px 8px',
    backgroundColor: colors.gray200,
    color: colors.gray700,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
  },
  noticeTitle: {
    flex: 1,
    fontSize: '14px',
    color: colors.gray800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  noticeDate: {
    flexShrink: 0,
    fontSize: '13px',
    color: colors.gray500,
  },
  // Event List
  eventList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  eventItem: {
    borderBottom: `1px solid ${colors.gray200}`,
  },
  eventLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 0',
    textDecoration: 'none',
    gap: '10px',
  },
  eventType: {
    flexShrink: 0,
    padding: '2px 10px',
    backgroundColor: colors.gray200,
    color: colors.gray700,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  eventTitle: {
    flex: 1,
    fontSize: '14px',
    color: colors.gray800,
  },
  eventDate: {
    flexShrink: 0,
    fontSize: '13px',
    color: colors.gray500,
  },
  // Banner Section
  bannerSection: {
    padding: '40px 0',
    backgroundColor: colors.white,
    borderTop: `1px solid ${colors.gray200}`,
  },
  bannerGrid: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    flexWrap: 'wrap',
  },
  bannerItem: {
    padding: '12px 24px',
    backgroundColor: colors.gray100,
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'background-color 0.2s',
  },
  bannerText: {
    fontSize: '14px',
    color: colors.gray700,
    fontWeight: 500,
  },
};
