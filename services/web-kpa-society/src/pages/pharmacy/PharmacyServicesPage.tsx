/**
 * PharmacyServicesPage - 내 약국 서비스 연결 허브
 *
 * WO-KPA-PHARMACY-DEPTH-V1
 * - 서비스 자체가 아니라 '내 약국 기준으로 연결된 상태'를 보여주는 허브
 * - LMS, 디지털 사이니지, 포럼 연결 상태 표시
 * - 전체 서비스 탐색, 관리자 설정, 콘텐츠 생성은 제외
 */

import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import { useAuth, TestUser } from '../../contexts/AuthContext';
import { isPharmacyOwner, PharmacistFeeCategory } from '../../types';

// Mock 서비스 상태 데이터
const mockServiceStatus = {
  lms: {
    pharmacyStaff: [
      { name: '홍길동', role: '개설약사', coursesInProgress: 1, coursesCompleted: 5 },
      { name: '김약사', role: '근무약사', coursesInProgress: 2, coursesCompleted: 3 },
    ],
    recentCourses: [
      { id: 'course-1', title: '2025 약사 필수 보수교육', status: 'in_progress', progress: 65 },
      { id: 'course-2', title: '복약지도 실무 과정', status: 'completed', progress: 100 },
    ],
    totalCredits: 24,
  },
  signage: {
    devices: [
      { id: 'device-1', name: '매장 입구 디스플레이', type: 'display', status: 'online', lastSync: '2025-01-24 09:30' },
      { id: 'device-2', name: '조제실 모니터', type: 'monitor', status: 'online', lastSync: '2025-01-24 09:28' },
    ],
    activeContents: 12,
    scheduledContents: 5,
  },
  forum: {
    myPosts: 12,
    myComments: 34,
    recentActivity: [
      { type: 'post', title: '복약지도 시 주의사항 공유', date: '2025-01-22', replies: 8 },
      { type: 'comment', title: '신규 약사 취업 관련 질문', date: '2025-01-20' },
    ],
    pharmacyMentions: 3,
  },
};

// Mock 약국 정보
const mockPharmacy = {
  name: '강남중앙약국',
};

export function PharmacyServicesPage() {
  const { user } = useAuth();
  const testUser = user as TestUser | null;

  const userFeeCategory: PharmacistFeeCategory =
    testUser?.role === 'pharmacist' ? 'B1_pharmacy_employee' : 'A1_pharmacy_owner';
  const isOwner = isPharmacyOwner(userFeeCategory);
  const roleLabel = isOwner ? '개설약사' : '근무약사';

  const services = mockServiceStatus;

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/pharmacy" style={styles.backLink}>← 돌아가기</Link>
          <div style={styles.headerMain}>
            <div style={styles.pharmacyInfo}>
              <h1 style={styles.pharmacyName}>{mockPharmacy.name}</h1>
              <span style={styles.subLabel}>· 연결 서비스</span>
            </div>
            <div style={styles.roleInfo}>
              <span style={styles.roleBadge}>{roleLabel}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 서비스 그리드 */}
      <div style={styles.serviceGrid}>
        {/* 콘텐츠 안내 */}
        <div style={styles.serviceCard}>
          <div style={styles.serviceHeader}>
            <div style={styles.serviceIcon}>📄</div>
            <div style={styles.serviceTitleGroup}>
              <h2 style={styles.serviceTitle}>콘텐츠 안내</h2>
              <span style={styles.serviceSubtitle}>약국 구성원 기준 진행 현황</span>
            </div>
          </div>
          <div style={styles.serviceBody}>
            {/* 구성원 진행 현황 */}
            <div style={styles.staffSection}>
              <h3 style={styles.subsectionTitle}>구성원 진행 현황</h3>
              <div style={styles.staffList}>
                {services.lms.pharmacyStaff.map((staff, index) => (
                  <div key={index} style={styles.staffRow}>
                    <div style={styles.staffInfo}>
                      <span style={styles.staffName}>{staff.name}</span>
                      <span style={styles.staffRole}>{staff.role}</span>
                    </div>
                    <div style={styles.staffStats}>
                      <span style={styles.statBadge}>
                        수강중 {staff.coursesInProgress}
                      </span>
                      <span style={styles.statBadgeGreen}>
                        수료 {staff.coursesCompleted}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 최근 교육 과정 */}
            <div style={styles.coursesSection}>
              <h3 style={styles.subsectionTitle}>최근 교육 과정</h3>
              {services.lms.recentCourses.map((course) => (
                <div key={course.id} style={styles.courseItem}>
                  <span style={styles.courseTitle}>{course.title}</span>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${course.progress}%`,
                        backgroundColor: course.status === 'completed' ? '#22c55e' : colors.primary,
                      }}
                    />
                  </div>
                  <span style={styles.progressText}>{course.progress}%</span>
                </div>
              ))}
            </div>

            <div style={styles.totalCredits}>
              <span style={styles.creditsLabel}>누적 이수 학점</span>
              <span style={styles.creditsValue}>{services.lms.totalCredits}점</span>
            </div>
          </div>
          <div style={styles.serviceFooter}>
            <Link to="/lms" style={styles.linkButton}>
              교육 센터 가기 →
            </Link>
          </div>
        </div>

        {/* 디지털 사이니지 */}
        <div style={styles.serviceCard}>
          <div style={styles.serviceHeader}>
            <div style={styles.serviceIcon}>📺</div>
            <div style={styles.serviceTitleGroup}>
              <h2 style={styles.serviceTitle}>디지털 사이니지</h2>
              <span style={styles.serviceSubtitle}>약국 디바이스 기준 현황</span>
            </div>
          </div>
          <div style={styles.serviceBody}>
            {/* 연결된 디바이스 */}
            <div style={styles.devicesSection}>
              <h3 style={styles.subsectionTitle}>연결된 디바이스</h3>
              <div style={styles.deviceList}>
                {services.signage.devices.map((device) => (
                  <div key={device.id} style={styles.deviceRow}>
                    <div style={styles.deviceInfo}>
                      <span style={styles.deviceName}>{device.name}</span>
                      <span style={styles.deviceMeta}>
                        마지막 동기화: {device.lastSync}
                      </span>
                    </div>
                    <span style={{
                      ...styles.deviceStatus,
                      backgroundColor: device.status === 'online' ? '#dcfce7' : '#fee2e2',
                      color: device.status === 'online' ? '#166534' : '#991b1b',
                    }}>
                      {device.status === 'online' ? '온라인' : '오프라인'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 콘텐츠 현황 */}
            <div style={styles.contentStats}>
              <div style={styles.contentStat}>
                <span style={styles.contentStatValue}>{services.signage.activeContents}</span>
                <span style={styles.contentStatLabel}>활성 콘텐츠</span>
              </div>
              <div style={styles.contentStat}>
                <span style={styles.contentStatValue}>{services.signage.scheduledContents}</span>
                <span style={styles.contentStatLabel}>예약 콘텐츠</span>
              </div>
            </div>
          </div>
          <div style={styles.serviceFooter}>
            <Link to="/content-hub" style={styles.linkButton}>
              사이니지 관리 →
            </Link>
          </div>
        </div>

        {/* 포럼 */}
        <div style={styles.serviceCard}>
          <div style={styles.serviceHeader}>
            <div style={styles.serviceIcon}>💬</div>
            <div style={styles.serviceTitleGroup}>
              <h2 style={styles.serviceTitle}>포럼</h2>
              <span style={styles.serviceSubtitle}>내 참여 및 약국 관련 흐름</span>
            </div>
          </div>
          <div style={styles.serviceBody}>
            {/* 내 활동 요약 */}
            <div style={styles.forumStats}>
              <div style={styles.forumStat}>
                <span style={styles.forumStatValue}>{services.forum.myPosts}</span>
                <span style={styles.forumStatLabel}>내 글</span>
              </div>
              <div style={styles.forumStat}>
                <span style={styles.forumStatValue}>{services.forum.myComments}</span>
                <span style={styles.forumStatLabel}>내 댓글</span>
              </div>
              <div style={styles.forumStat}>
                <span style={styles.forumStatValue}>{services.forum.pharmacyMentions}</span>
                <span style={styles.forumStatLabel}>약국 언급</span>
              </div>
            </div>

            {/* 최근 활동 */}
            <div style={styles.recentActivitySection}>
              <h3 style={styles.subsectionTitle}>최근 활동</h3>
              {services.forum.recentActivity.map((activity, index) => (
                <div key={index} style={styles.activityItem}>
                  <span style={styles.activityIcon}>
                    {activity.type === 'post' ? '📝' : '💬'}
                  </span>
                  <div style={styles.activityContent}>
                    <span style={styles.activityTitle}>{activity.title}</span>
                    <span style={styles.activityMeta}>
                      {activity.date}
                      {activity.replies !== undefined && ` · 답글 ${activity.replies}개`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={styles.serviceFooter}>
            <Link to="/forum" style={styles.linkButton}>
              포럼 가기 →
            </Link>
          </div>
        </div>
      </div>

      {/* 안내 */}
      <div style={styles.notice}>
        <span style={styles.noticeIcon}>ℹ️</span>
        <span style={styles.noticeText}>
          {isOwner
            ? '약국에 연결된 서비스 현황을 한 눈에 확인할 수 있습니다.'
            : '약국에 연결된 서비스 현황을 확인할 수 있습니다.'}
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  backLink: {
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  headerMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pharmacyInfo: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  pharmacyName: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  subLabel: {
    fontSize: '1rem',
    color: colors.neutral500,
    fontWeight: 500,
  },
  roleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  roleBadge: {
    padding: '4px 12px',
    backgroundColor: colors.primary + '15',
    color: colors.primary,
    borderRadius: '16px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },

  // Service Grid
  serviceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  serviceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.md,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  serviceHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '20px',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  serviceIcon: {
    fontSize: '32px',
  },
  serviceTitleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  serviceTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  serviceSubtitle: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },
  serviceBody: {
    padding: '20px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  serviceFooter: {
    padding: '16px 20px',
    borderTop: `1px solid ${colors.neutral100}`,
    backgroundColor: colors.gray100 + '50',
  },
  linkButton: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 500,
    textAlign: 'center',
    textDecoration: 'none',
  },

  // Subsections
  subsectionTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: colors.neutral600,
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  // LMS Styles
  staffSection: {},
  staffList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  staffRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
  },
  staffInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  staffName: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral800,
  },
  staffRole: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  staffStats: {
    display: 'flex',
    gap: '6px',
  },
  statBadge: {
    padding: '2px 8px',
    backgroundColor: colors.primary + '20',
    color: colors.primary,
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  statBadgeGreen: {
    padding: '2px 8px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  coursesSection: {},
  courseItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  courseTitle: {
    flex: 1,
    fontSize: '0.875rem',
    color: colors.neutral700,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  progressBar: {
    width: '80px',
    height: '6px',
    backgroundColor: colors.neutral200,
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s',
  },
  progressText: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: colors.neutral600,
    minWidth: '32px',
    textAlign: 'right',
  },
  totalCredits: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    marginTop: 'auto',
  },
  creditsLabel: {
    fontSize: '0.875rem',
    color: colors.neutral600,
  },
  creditsValue: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: colors.primary,
  },

  // Signage Styles
  devicesSection: {},
  deviceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  deviceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
  },
  deviceInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  deviceName: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral800,
  },
  deviceMeta: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  deviceStatus: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  contentStats: {
    display: 'flex',
    gap: '16px',
  },
  contentStat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
  },
  contentStatValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.neutral900,
  },
  contentStatLabel: {
    fontSize: '0.75rem',
    color: colors.neutral500,
    marginTop: '4px',
  },

  // Forum Styles
  forumStats: {
    display: 'flex',
    gap: '12px',
  },
  forumStat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
  },
  forumStatValue: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: colors.neutral900,
  },
  forumStatLabel: {
    fontSize: '0.75rem',
    color: colors.neutral500,
    marginTop: '4px',
  },
  recentActivitySection: {},
  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 0',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  activityIcon: {
    fontSize: '16px',
  },
  activityContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  activityTitle: {
    fontSize: '0.875rem',
    color: colors.neutral800,
  },
  activityMeta: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },

  // Notice
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '16px 20px',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
  },
  noticeIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  noticeText: {
    fontSize: '0.875rem',
    color: colors.neutral600,
    lineHeight: 1.5,
  },
};
