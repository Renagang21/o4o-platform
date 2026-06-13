/**
 * WorkDisplayPage - 디지털 사이니지 (개인 관여)
 *
 * WO-KPA-WORK-IMPLEMENT-V1
 * - 내가 관여 중인 디스플레이 목록
 * - 콘텐츠 확인/제안 상태
 * - 배포·승인 권한 없음
 */

import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import { useAuth, TestUser } from '../../contexts/AuthContext';

// Mock 사이니지 데이터
const mockDisplayData = {
  myDisplays: [
    {
      id: 'd1',
      name: '메인 디스플레이',
      location: '조제실 앞',
      status: 'active',
      myRole: 'viewer',
      currentContent: '건강 정보 슬라이드',
      lastUpdated: '2025-01-24',
    },
    {
      id: 'd2',
      name: '대기실 모니터',
      location: '대기실',
      status: 'pending',
      myRole: 'contributor',
      currentContent: '대기 번호 안내',
      lastUpdated: '2025-01-23',
      pendingContent: '신규 건강 정보 콘텐츠',
    },
    {
      id: 'd3',
      name: '입구 안내판',
      location: '약국 입구',
      status: 'active',
      myRole: 'viewer',
      currentContent: '영업시간 안내',
      lastUpdated: '2025-01-20',
    },
  ],
  myContributions: [
    { id: 'c1', title: '겨울철 건강 관리 팁', status: 'approved', date: '2025-01-20' },
    { id: 'c2', title: '복약 안내 슬라이드', status: 'pending', date: '2025-01-22' },
    { id: 'c3', title: '신규 이벤트 배너', status: 'rejected', date: '2025-01-18', reason: '이미지 해상도 부족' },
  ],
};

export function WorkDisplayPage() {
  const { user } = useAuth();
  const testUser = user as TestUser | null;
  const userName = testUser?.name || '약사';

  const data = mockDisplayData;

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <Link to="/work" style={styles.backLink}>← 내 업무</Link>
        <div style={styles.headerMain}>
          <div>
            <h1 style={styles.pageTitle}>디지털사이니지</h1>
            <p style={styles.subTitle}>{userName}님이 관여 중인 디스플레이</p>
          </div>
        </div>
      </header>

      {/* 관여 중인 디스플레이 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>디스플레이 목록</h2>
        <div style={styles.displayGrid}>
          {data.myDisplays.map(display => (
            <div key={display.id} style={styles.displayCard}>
              <div style={styles.displayHeader}>
                <div style={styles.displayName}>{display.name}</div>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: display.status === 'active'
                    ? colors.success + '20'
                    : colors.warning + '20',
                  color: display.status === 'active'
                    ? colors.success
                    : colors.warning,
                }}>
                  {display.status === 'active' ? '활성' : '대기'}
                </span>
              </div>
              <div style={styles.displayLocation}>
                <span style={styles.locationIcon}>📍</span>
                {display.location}
              </div>
              <div style={styles.displayContent}>
                <span style={styles.contentLabel}>현재 콘텐츠</span>
                <span style={styles.contentValue}>{display.currentContent}</span>
              </div>
              {display.pendingContent && (
                <div style={styles.pendingContent}>
                  <span style={styles.pendingLabel}>대기 중</span>
                  <span style={styles.pendingValue}>{display.pendingContent}</span>
                </div>
              )}
              <div style={styles.displayFooter}>
                <span style={styles.roleLabel}>
                  내 역할: <strong>{display.myRole === 'viewer' ? '열람' : '기여자'}</strong>
                </span>
                <span style={styles.lastUpdated}>
                  업데이트: {display.lastUpdated}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 내 기여 현황 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>내 기여 현황</h2>
        <p style={styles.sectionDesc}>제안한 콘텐츠의 승인 상태를 확인합니다.</p>
        <div style={styles.contributionList}>
          {data.myContributions.map(contrib => (
            <div key={contrib.id} style={styles.contributionCard}>
              <div style={styles.contribInfo}>
                <h3 style={styles.contribTitle}>{contrib.title}</h3>
                <span style={styles.contribDate}>{contrib.date}</span>
              </div>
              <div style={styles.contribStatus}>
                <span style={{
                  ...styles.contribBadge,
                  backgroundColor:
                    contrib.status === 'approved' ? colors.success + '20' :
                    contrib.status === 'pending' ? colors.warning + '20' :
                    colors.error + '20',
                  color:
                    contrib.status === 'approved' ? colors.success :
                    contrib.status === 'pending' ? colors.warning :
                    colors.error,
                }}>
                  {contrib.status === 'approved' ? '승인됨' :
                   contrib.status === 'pending' ? '검토중' : '반려'}
                </span>
                {contrib.reason && (
                  <span style={styles.rejectReason}>{contrib.reason}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 안내 */}
      <div style={styles.notice}>
        <span style={styles.noticeIcon}>ℹ️</span>
        <div style={styles.noticeContent}>
          <strong>배포·승인 권한 안내</strong>
          <p style={styles.noticeText}>
            콘텐츠 배포 및 승인은 개설약사 권한입니다.
            콘텐츠 제안은 가능하나, 최종 결정은 약국 운영자가 진행합니다.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '32px',
  },
  backLink: {
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
    display: 'inline-block',
    marginBottom: '12px',
  },
  headerMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  subTitle: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    margin: '4px 0 0',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral800,
    marginBottom: '16px',
  },
  sectionDesc: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    margin: '-8px 0 16px',
  },
  displayGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  displayCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: '20px',
  },
  displayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  displayName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral800,
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  displayLocation: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.8125rem',
    color: colors.neutral500,
    marginBottom: '16px',
  },
  locationIcon: {
    fontSize: '0.875rem',
  },
  displayContent: {
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.sm,
    marginBottom: '8px',
  },
  contentLabel: {
    display: 'block',
    fontSize: '0.6875rem',
    color: colors.neutral500,
    marginBottom: '4px',
  },
  contentValue: {
    fontSize: '0.875rem',
    color: colors.neutral700,
    fontWeight: 500,
  },
  pendingContent: {
    padding: '12px',
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.sm,
    marginBottom: '12px',
  },
  pendingLabel: {
    display: 'block',
    fontSize: '0.6875rem',
    color: colors.warning,
    fontWeight: 500,
    marginBottom: '4px',
  },
  pendingValue: {
    fontSize: '0.875rem',
    color: colors.neutral700,
  },
  displayFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: `1px solid ${colors.neutral100}`,
  },
  roleLabel: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  lastUpdated: {
    fontSize: '0.75rem',
    color: colors.neutral400,
  },
  contributionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  contributionCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
  },
  contribInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  contribTitle: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: colors.neutral800,
    margin: 0,
  },
  contribDate: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  contribStatus: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },
  contribBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  rejectReason: {
    fontSize: '0.6875rem',
    color: colors.error,
  },
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px 20px',
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.warning}30`,
  },
  noticeIcon: {
    fontSize: '20px',
    flexShrink: 0,
  },
  noticeContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  noticeText: {
    fontSize: '0.875rem',
    color: colors.neutral600,
    lineHeight: 1.5,
    margin: 0,
  },
};
