/**
 * 행사/교육 페이지
 * Phase H8-FE: KPA Society Frontend
 */

import { useState } from 'react';

interface Event {
  id: number;
  title: string;
  type: 'event' | 'education';
  date: string;
  endDate?: string;
  location: string;
  status: 'upcoming' | 'ongoing' | 'closed';
  capacity?: number;
  registered?: number;
}

// 샘플 데이터 (실제로는 API에서 가져옴)
const sampleEvents: Event[] = [
  { id: 1, title: '2024년 정기총회', type: 'event', date: '2024-12-20', location: '약사회관 대강당', status: 'upcoming', capacity: 200, registered: 156 },
  { id: 2, title: '약물요법 심화과정 (12기)', type: 'education', date: '2024-12-15', endDate: '2024-12-17', location: '온라인', status: 'upcoming', capacity: 100, registered: 78 },
  { id: 3, title: '신규 회원 오리엔테이션', type: 'event', date: '2024-12-10', location: '약사회관 세미나실', status: 'closed', capacity: 50, registered: 50 },
  { id: 4, title: '복약지도 기초과정', type: 'education', date: '2024-12-08', location: '온라인', status: 'closed', capacity: 80, registered: 80 },
  { id: 5, title: '송년의 밤', type: 'event', date: '2024-12-28', location: '그랜드호텔', status: 'upcoming', capacity: 300, registered: 124 },
  { id: 6, title: '의약품 안전관리 교육', type: 'education', date: '2025-01-10', endDate: '2025-01-12', location: '약사회관', status: 'upcoming', capacity: 60, registered: 23 },
];

export function EventsPage() {
  const [selectedType, setSelectedType] = useState<string>('전체');
  const [selectedStatus, setSelectedStatus] = useState<string>('전체');

  const types = ['전체', '행사', '교육'];
  const statuses = ['전체', '예정', '진행중', '마감'];

  const getTypeFilter = (type: string) => {
    if (type === '행사') return 'event';
    if (type === '교육') return 'education';
    return null;
  };

  const getStatusFilter = (status: string) => {
    if (status === '예정') return 'upcoming';
    if (status === '진행중') return 'ongoing';
    if (status === '마감') return 'closed';
    return null;
  };

  const filteredEvents = sampleEvents.filter((event) => {
    const typeFilter = getTypeFilter(selectedType);
    const statusFilter = getStatusFilter(selectedStatus);

    const matchesType = !typeFilter || event.type === typeFilter;
    const matchesStatus = !statusFilter || event.status === statusFilter;

    return matchesType && matchesStatus;
  });

  const getStatusStyle = (status: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
    };
    switch (status) {
      case 'upcoming':
        return { ...base, backgroundColor: '#d4edda', color: '#155724' };
      case 'ongoing':
        return { ...base, backgroundColor: '#fff3cd', color: '#856404' };
      case 'closed':
        return { ...base, backgroundColor: '#f8d7da', color: '#721c24' };
      default:
        return base;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'upcoming':
        return '예정';
      case 'ongoing':
        return '진행중';
      case 'closed':
        return '마감';
      default:
        return status;
    }
  };

  const getTypeText = (type: string): string => {
    return type === 'event' ? '행사' : '교육';
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>행사/교육</h1>

      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>구분:</span>
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              style={{
                ...styles.filterButton,
                ...(selectedType === type ? styles.filterButtonActive : {}),
              }}
            >
              {type}
            </button>
          ))}
        </div>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>상태:</span>
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              style={{
                ...styles.filterButton,
                ...(selectedStatus === status ? styles.filterButtonActive : {}),
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.eventList}>
        {filteredEvents.map((event) => (
          <div key={event.id} style={styles.eventCard}>
            <div style={styles.eventHeader}>
              <span style={styles.typeTag}>{getTypeText(event.type)}</span>
              <span style={getStatusStyle(event.status)}>{getStatusText(event.status)}</span>
            </div>
            <h3 style={styles.eventTitle}>
              <a href={`/events/${event.id}`} style={styles.link}>
                {event.title}
              </a>
            </h3>
            <div style={styles.eventDetails}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>일시:</span>
                <span>{event.date}{event.endDate ? ` ~ ${event.endDate}` : ''}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>장소:</span>
                <span>{event.location}</span>
              </div>
              {event.capacity && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>모집:</span>
                  <span>{event.registered} / {event.capacity}명</span>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${(event.registered! / event.capacity) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div style={styles.eventActions}>
              {event.status === 'upcoming' && (
                <button style={styles.applyButton}>신청하기</button>
              )}
              <button style={styles.detailButton}>상세보기</button>
            </div>
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <p style={styles.noData}>해당 조건의 행사/교육이 없습니다.</p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px 20px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '30px',
    textAlign: 'center',
  },
  filterBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    minWidth: '40px',
  },
  filterButton: {
    padding: '6px 14px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  filterButtonActive: {
    backgroundColor: '#007bff',
    color: '#fff',
    border: '1px solid #007bff',
  },
  eventList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  eventCard: {
    padding: '20px',
    backgroundColor: '#fff',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  typeTag: {
    padding: '4px 10px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  eventTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
    lineHeight: 1.4,
  },
  link: {
    color: '#333',
    textDecoration: 'none',
  },
  eventDetails: {
    marginBottom: '16px',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#666',
  },
  detailLabel: {
    fontWeight: 'bold',
    minWidth: '40px',
  },
  progressBar: {
    flex: 1,
    height: '6px',
    backgroundColor: '#e9ecef',
    borderRadius: '3px',
    overflow: 'hidden',
    marginLeft: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: '3px',
  },
  eventActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
  },
  applyButton: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  detailButton: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: '#fff',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    padding: '40px',
  },
};
