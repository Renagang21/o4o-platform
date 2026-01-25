/**
 * OfficerScheduleSection - 임원 일정 관리 섹션
 *
 * WO-KPA-ORGANIZATION-STRUCTURE-V1
 * - 임원 역할 전체에게 필요한 일정 관리
 * - 회의, 행사, 마감일, 알림 등 관리
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { colors } from '../../styles/theme';
import type { ScheduleItem, OfficerRole } from '../../types/organization';

interface OfficerScheduleSectionProps {
  role: OfficerRole;
  scheduleItems: ScheduleItem[];
  committeeId?: string;
  showAddButton?: boolean;
  onAddSchedule?: () => void;
}

export function OfficerScheduleSection({
  role,
  scheduleItems,
  committeeId,
  showAddButton = true,
  onAddSchedule,
}: OfficerScheduleSectionProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // 역할에 따라 일정 필터링
  const filteredItems = scheduleItems.filter(item => {
    // 공개 일정은 모두 표시
    if (item.isPublic) return true;
    // 대상 역할에 현재 역할이 포함되어 있으면 표시
    if (item.targetRoles?.includes(role)) return true;
    // 위원장은 자신의 위원회 일정만
    if (role === 'committee_chair' && item.committeeId === committeeId) return true;
    // 회장/운영자는 모든 일정
    if (role === 'president' || role === 'operator') return true;
    return false;
  });

  // 일정 정렬 (날짜순)
  const sortedItems = [...filteredItems].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  // 오늘 기준으로 다가오는 일정만
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingItems = sortedItems.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate >= today;
  });

  const getTypeIcon = (type: ScheduleItem['type']) => {
    switch (type) {
      case 'meeting': return '📋';
      case 'event': return '🎉';
      case 'deadline': return '⏰';
      case 'reminder': return '🔔';
      default: return '📌';
    }
  };

  const getTypeLabel = (type: ScheduleItem['type']) => {
    switch (type) {
      case 'meeting': return '회의';
      case 'event': return '행사';
      case 'deadline': return '마감';
      case 'reminder': return '알림';
      default: return '기타';
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[d.getDay()];
    return `${month}/${day} (${weekday})`;
  };

  const getDaysUntil = (date: string) => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '내일';
    if (diffDays < 7) return `${diffDays}일 후`;
    return null;
  };

  return (
    <div style={styles.scheduleSection}>
      <div style={styles.scheduleHeader}>
        <h2 style={styles.sectionTitle}>📅 일정</h2>
        <div style={styles.headerActions}>
          <div style={styles.viewToggle}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                ...styles.viewButton,
                ...(viewMode === 'list' ? styles.viewButtonActive : {}),
              }}
            >
              목록
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                ...styles.viewButton,
                ...(viewMode === 'calendar' ? styles.viewButtonActive : {}),
              }}
            >
              달력
            </button>
          </div>
          {showAddButton && (role === 'president' || role === 'operator' || role === 'committee_chair') && (
            <button onClick={onAddSchedule} style={styles.addButton}>
              + 일정 추가
            </button>
          )}
        </div>
      </div>

      {viewMode === 'list' ? (
        <div style={styles.scheduleList}>
          {upcomingItems.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📭</span>
              <p style={styles.emptyText}>예정된 일정이 없습니다.</p>
            </div>
          ) : (
            upcomingItems.slice(0, 5).map((item) => {
              const daysUntil = getDaysUntil(item.date);
              return (
                <div key={item.id} style={styles.scheduleItem}>
                  <div style={styles.scheduleItemLeft}>
                    <span style={styles.scheduleIcon}>{getTypeIcon(item.type)}</span>
                    <div style={styles.scheduleInfo}>
                      <div style={styles.scheduleTitle}>{item.title}</div>
                      <div style={styles.scheduleMeta}>
                        <span style={styles.scheduleDate}>
                          {formatDate(item.date)}
                          {item.time && ` ${item.time}`}
                        </span>
                        {item.location && (
                          <span style={styles.scheduleLocation}>📍 {item.location}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={styles.scheduleItemRight}>
                    <span style={styles.scheduleTypeTag}>{getTypeLabel(item.type)}</span>
                    {daysUntil && (
                      <span style={{
                        ...styles.daysUntil,
                        backgroundColor: daysUntil === '오늘' ? '#FEE2E2' :
                                        daysUntil === '내일' ? '#FEF3C7' : '#E0E7FF',
                        color: daysUntil === '오늘' ? '#DC2626' :
                               daysUntil === '내일' ? '#D97706' : '#4F46E5',
                      }}>
                        {daysUntil}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {upcomingItems.length > 5 && (
            <Link to="/intranet/schedule" style={styles.viewAllLink}>
              전체 일정 보기 →
            </Link>
          )}
        </div>
      ) : (
        <div style={styles.calendarPlaceholder}>
          <span style={styles.calendarIcon}>📆</span>
          <p style={styles.calendarText}>달력 보기 준비 중</p>
          <button onClick={() => setViewMode('list')} style={styles.backToListButton}>
            목록으로 보기
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  scheduleSection: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    marginTop: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  scheduleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  viewToggle: {
    display: 'flex',
    backgroundColor: colors.neutral100,
    borderRadius: '6px',
    padding: '2px',
  },
  viewButton: {
    padding: '6px 12px',
    fontSize: '13px',
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.neutral600,
    borderRadius: '4px',
    cursor: 'pointer',
  },
  viewButtonActive: {
    backgroundColor: colors.white,
    color: colors.neutral900,
    fontWeight: 500,
  },
  addButton: {
    padding: '8px 14px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  scheduleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  scheduleItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  scheduleItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  scheduleIcon: {
    fontSize: '20px',
  },
  scheduleInfo: {},
  scheduleTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral800,
  },
  scheduleMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '4px',
  },
  scheduleDate: {
    fontSize: '12px',
    color: colors.neutral600,
  },
  scheduleLocation: {
    fontSize: '12px',
    color: colors.neutral500,
  },
  scheduleItemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  scheduleTypeTag: {
    padding: '4px 8px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  daysUntil: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
  },
  viewAllLink: {
    display: 'block',
    textAlign: 'center',
    padding: '12px',
    color: colors.primary,
    fontSize: '14px',
    textDecoration: 'none',
    marginTop: '8px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '32px',
  },
  emptyIcon: {
    fontSize: '32px',
    display: 'block',
    marginBottom: '8px',
  },
  emptyText: {
    color: colors.neutral500,
    margin: 0,
  },
  calendarPlaceholder: {
    textAlign: 'center',
    padding: '48px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  calendarIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  calendarText: {
    color: colors.neutral500,
    marginBottom: '16px',
  },
  backToListButton: {
    padding: '8px 16px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default OfficerScheduleSection;
