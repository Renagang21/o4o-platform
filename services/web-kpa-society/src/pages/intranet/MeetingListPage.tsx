/**
 * MeetingListPage - 회의 목록
 * Work Order 5: 회의 생성/목록/상세, 참여자 지정, 회의 자료 첨부, 회의 결과 메모
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IntranetHeader } from '../../components/intranet';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  status: 'scheduled' | 'ongoing' | 'completed';
  participantCount: number;
  hasAttachments: boolean;
  hasMinutes: boolean;
}

export function MeetingListPage() {
  const { user } = useAuth();
  const userRole = user?.role || 'member';
  const canCreate = ['officer', 'chair', 'admin', 'super_admin'].includes(userRole);

  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');

  const [meetings] = useState<Meeting[]>([
    {
      id: '1',
      title: '1월 정기 이사회',
      date: '2025-01-10',
      time: '14:00',
      location: '본회의실',
      status: 'scheduled',
      participantCount: 12,
      hasAttachments: true,
      hasMinutes: false,
    },
    {
      id: '2',
      title: '신년 사업계획 회의',
      date: '2025-01-15',
      time: '10:00',
      location: '제2회의실',
      status: 'scheduled',
      participantCount: 8,
      hasAttachments: true,
      hasMinutes: false,
    },
    {
      id: '3',
      title: '분회장단 협의회',
      date: '2025-01-20',
      time: '15:00',
      location: '대강당',
      status: 'scheduled',
      participantCount: 20,
      hasAttachments: false,
      hasMinutes: false,
    },
    {
      id: '4',
      title: '12월 정기 이사회',
      date: '2024-12-15',
      time: '14:00',
      location: '본회의실',
      status: 'completed',
      participantCount: 11,
      hasAttachments: true,
      hasMinutes: true,
    },
    {
      id: '5',
      title: '연말 결산 회의',
      date: '2024-12-20',
      time: '10:00',
      location: '제2회의실',
      status: 'completed',
      participantCount: 6,
      hasAttachments: true,
      hasMinutes: true,
    },
  ]);

  const filteredMeetings = meetings.filter((m) => {
    if (filter === 'upcoming') return m.status === 'scheduled';
    if (filter === 'completed') return m.status === 'completed';
    return true;
  });

  const getStatusBadge = (status: Meeting['status']) => {
    const config: Record<string, { bg: string; label: string }> = {
      scheduled: { bg: colors.primary, label: '예정' },
      ongoing: { bg: colors.accentYellow, label: '진행중' },
      completed: { bg: colors.neutral400, label: '완료' },
    };
    const { bg, label } = config[status];
    return <span style={{ ...styles.badge, backgroundColor: bg }}>{label}</span>;
  };

  return (
    <div>
      <IntranetHeader
        title="회의"
        subtitle="조직 회의 일정 및 기록"
        actions={
          canCreate && (
            <Link to="/intranet/meetings/new" style={styles.createButton}>
              + 회의 생성
            </Link>
          )
        }
      />

      <div style={styles.content}>
        {/* 필터 탭 */}
        <div style={styles.filterTabs}>
          {[
            { key: 'all', label: '전체' },
            { key: 'upcoming', label: '예정' },
            { key: 'completed', label: '완료' },
          ].map((tab) => (
            <button
              key={tab.key}
              style={{
                ...styles.filterTab,
                ...(filter === tab.key ? styles.filterTabActive : {}),
              }}
              onClick={() => setFilter(tab.key as typeof filter)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 회의 목록 */}
        <div style={styles.meetingList}>
          {filteredMeetings.map((meeting) => (
            <Link
              key={meeting.id}
              to={`/intranet/meetings/${meeting.id}`}
              style={styles.meetingCard}
            >
              <div style={styles.cardLeft}>
                <div style={styles.dateBox}>
                  <span style={styles.dateDay}>
                    {new Date(meeting.date).getDate()}
                  </span>
                  <span style={styles.dateMonth}>
                    {new Date(meeting.date).getMonth() + 1}월
                  </span>
                </div>
              </div>

              <div style={styles.cardMain}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.meetingTitle}>{meeting.title}</h3>
                  {getStatusBadge(meeting.status)}
                </div>
                <div style={styles.meetingMeta}>
                  <span>🕐 {meeting.time}</span>
                  <span>📍 {meeting.location}</span>
                  <span>👥 {meeting.participantCount}명</span>
                </div>
                <div style={styles.meetingTags}>
                  {meeting.hasAttachments && (
                    <span style={styles.tag}>📎 자료첨부</span>
                  )}
                  {meeting.hasMinutes && (
                    <span style={styles.tag}>📝 회의록</span>
                  )}
                </div>
              </div>

              <div style={styles.cardRight}>
                <span style={styles.arrow}>→</span>
              </div>
            </Link>
          ))}
        </div>

        {filteredMeetings.length === 0 && (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📋</span>
            <p style={styles.emptyText}>해당 조건의 회의가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  createButton: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
  },
  filterTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  filterTab: {
    padding: '10px 20px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
  },
  meetingList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  meetingCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '20px',
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textDecoration: 'none',
    color: colors.neutral800,
  },
  cardLeft: {},
  dateBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '56px',
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  dateDay: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.primary,
  },
  dateMonth: {
    fontSize: '12px',
    color: colors.neutral500,
  },
  cardMain: {
    flex: 1,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  meetingTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  badge: {
    padding: '4px 10px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  meetingMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: colors.neutral500,
    marginBottom: '8px',
  },
  meetingTags: {
    display: 'flex',
    gap: '8px',
  },
  tag: {
    padding: '4px 8px',
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    borderRadius: '4px',
    fontSize: '11px',
  },
  cardRight: {
    padding: '0 8px',
  },
  arrow: {
    fontSize: '20px',
    color: colors.neutral400,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: colors.white,
    borderRadius: '12px',
  },
  emptyIcon: {
    fontSize: '48px',
  },
  emptyText: {
    fontSize: '14px',
    color: colors.neutral500,
    marginTop: '12px',
  },
};
