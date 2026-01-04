/**
 * SchedulePage - 일정 (월간 캘린더)
 * Work Order 5: 월간 캘린더, 조직 일정 / 개인 일정 구분
 */

import { useState } from 'react';
import { IntranetHeader } from '../../components/intranet';
import { colors } from '../../styles/theme';

interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: 'organization' | 'personal';
  category: 'meeting' | 'event' | 'deadline' | 'other';
}

export function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 0, 1)); // 2025년 1월
  const [filter, setFilter] = useState<'all' | 'organization' | 'personal'>('all');

  const [events] = useState<ScheduleEvent[]>([
    { id: '1', title: '1월 정기 이사회', date: '2025-01-10', time: '14:00', type: 'organization', category: 'meeting' },
    { id: '2', title: '신년 사업계획 회의', date: '2025-01-15', time: '10:00', type: 'organization', category: 'meeting' },
    { id: '3', title: '분회장단 협의회', date: '2025-01-20', time: '15:00', type: 'organization', category: 'meeting' },
    { id: '4', title: '신년 하례회', date: '2025-01-25', time: '18:00', type: 'organization', category: 'event' },
    { id: '5', title: '연회비 납부 마감', date: '2025-01-31', type: 'organization', category: 'deadline' },
    { id: '6', title: '개인 일정', date: '2025-01-12', type: 'personal', category: 'other' },
  ]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 달력 생성
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDay = firstDayOfMonth.getDay(); // 0=일요일
  const daysInMonth = lastDayOfMonth.getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => {
      const matchesDate = e.date === dateStr;
      const matchesFilter = filter === 'all' || e.type === filter;
      return matchesDate && matchesFilter;
    });
  };

  const getCategoryColor = (category: string) => {
    const catColors: Record<string, string> = {
      meeting: colors.primary,
      event: colors.accentGreen,
      deadline: colors.accentRed,
      other: colors.neutral500,
    };
    return catColors[category];
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const filteredEvents = events.filter((e) => {
    const eventMonth = new Date(e.date).getMonth();
    const eventYear = new Date(e.date).getFullYear();
    const matchesMonth = eventMonth === month && eventYear === year;
    const matchesFilter = filter === 'all' || e.type === filter;
    return matchesMonth && matchesFilter;
  });

  return (
    <div>
      <IntranetHeader
        title="일정"
        subtitle="조직 일정 및 개인 일정"
      />

      <div style={styles.content}>
        <div style={styles.mainGrid}>
          {/* 캘린더 */}
          <div style={styles.calendarSection}>
            {/* 월 선택 */}
            <div style={styles.calendarHeader}>
              <button style={styles.navButton} onClick={prevMonth}>
                ← 이전
              </button>
              <h2 style={styles.monthTitle}>
                {year}년 {month + 1}월
              </h2>
              <button style={styles.navButton} onClick={nextMonth}>
                다음 →
              </button>
            </div>

            {/* 필터 */}
            <div style={styles.filterTabs}>
              {[
                { key: 'all', label: '전체' },
                { key: 'organization', label: '조직' },
                { key: 'personal', label: '개인' },
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

            {/* 캘린더 그리드 */}
            <div style={styles.calendar}>
              {/* 요일 헤더 */}
              <div style={styles.weekHeader}>
                {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                  <div
                    key={day}
                    style={{
                      ...styles.weekDay,
                      color: i === 0 ? colors.accentRed : i === 6 ? colors.primary : colors.neutral600,
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div style={styles.daysGrid}>
                {calendarDays.map((day, index) => {
                  const dayEvents = day ? getEventsForDay(day) : [];
                  const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                  return (
                    <div
                      key={index}
                      style={{
                        ...styles.dayCell,
                        ...(day === null ? styles.emptyCell : {}),
                        ...(isToday ? styles.todayCell : {}),
                      }}
                    >
                      {day && (
                        <>
                          <span
                            style={{
                              ...styles.dayNumber,
                              ...(isToday ? styles.todayNumber : {}),
                            }}
                          >
                            {day}
                          </span>
                          <div style={styles.eventDots}>
                            {dayEvents.slice(0, 3).map((event) => (
                              <span
                                key={event.id}
                                style={{
                                  ...styles.eventDot,
                                  backgroundColor: getCategoryColor(event.category),
                                }}
                                title={event.title}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 이번 달 일정 목록 */}
          <div style={styles.eventListSection}>
            <h3 style={styles.sectionTitle}>이번 달 일정</h3>
            <div style={styles.eventList}>
              {filteredEvents.length === 0 ? (
                <div style={styles.noEvents}>일정이 없습니다.</div>
              ) : (
                filteredEvents
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((event) => (
                    <div key={event.id} style={styles.eventItem}>
                      <div
                        style={{
                          ...styles.eventMarker,
                          backgroundColor: getCategoryColor(event.category),
                        }}
                      />
                      <div style={styles.eventInfo}>
                        <div style={styles.eventTitle}>{event.title}</div>
                        <div style={styles.eventMeta}>
                          <span>{event.date}</span>
                          {event.time && <span>{event.time}</span>}
                          <span
                            style={{
                              ...styles.typeBadge,
                              backgroundColor: event.type === 'organization' ? colors.primary : colors.neutral400,
                            }}
                          >
                            {event.type === 'organization' ? '조직' : '개인'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* 범례 */}
            <div style={styles.legend}>
              <div style={styles.legendTitle}>범례</div>
              <div style={styles.legendItems}>
                <span style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, backgroundColor: colors.primary }} /> 회의
                </span>
                <span style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, backgroundColor: colors.accentGreen }} /> 행사
                </span>
                <span style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, backgroundColor: colors.accentRed }} /> 마감
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '24px',
  },
  calendarSection: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  calendarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  navButton: {
    padding: '8px 16px',
    backgroundColor: colors.neutral100,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    color: colors.neutral700,
  },
  monthTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  filterTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
  },
  filterTab: {
    padding: '8px 16px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
  },
  calendar: {},
  weekHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    marginBottom: '8px',
  },
  weekDay: {
    textAlign: 'center',
    fontSize: '13px',
    fontWeight: 500,
    padding: '8px',
  },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
  },
  dayCell: {
    aspectRatio: '1',
    padding: '8px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  emptyCell: {
    backgroundColor: 'transparent',
  },
  todayCell: {
    backgroundColor: colors.primary + '15',
    border: `2px solid ${colors.primary}`,
  },
  dayNumber: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral700,
  },
  todayNumber: {
    color: colors.primary,
    fontWeight: 700,
  },
  eventDots: {
    display: 'flex',
    gap: '4px',
  },
  eventDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  eventListSection: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 16px 0',
  },
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  noEvents: {
    padding: '24px',
    textAlign: 'center',
    color: colors.neutral500,
    fontSize: '14px',
  },
  eventItem: {
    display: 'flex',
    gap: '12px',
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  eventMarker: {
    width: '4px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral900,
    marginBottom: '4px',
  },
  eventMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: colors.neutral500,
    alignItems: 'center',
  },
  typeBadge: {
    padding: '2px 6px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 500,
  },
  legend: {
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  legendTitle: {
    fontSize: '12px',
    color: colors.neutral500,
    marginBottom: '8px',
  },
  legendItems: {
    display: 'flex',
    gap: '16px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: colors.neutral600,
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
};
