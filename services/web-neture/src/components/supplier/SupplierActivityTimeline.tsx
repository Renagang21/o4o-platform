/**
 * SupplierActivityTimeline - 최근 활동 타임라인
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P2
 *
 * 표시 이벤트:
 * - 판매자 신청 승인/거절
 * - 주문 발생
 * - 콘텐츠 게시/비공개
 *
 * 데이터:
 * - 기존 NetureSupplierRequestEvent 활용
 * - 최신 10건
 * - 시간순 정렬
 */

import {
  CheckCircle,
  XCircle,
  ShoppingCart,
  FileText,
  EyeOff,
  Activity,
} from 'lucide-react';

export type ActivityEventType =
  | 'request_approved'
  | 'request_rejected'
  | 'order_created'
  | 'content_published'
  | 'content_unpublished';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  description: string;
  serviceName: string;
  timestamp: string;
}

interface Props {
  events: ActivityEvent[];
  loading?: boolean;
}

// WO-O4O-ICON-SYSTEM-MODERNIZATION-V1: 무채색 아이콘
const eventConfig: Record<
  ActivityEventType,
  { icon: typeof CheckCircle; color: string; bgColor: string }
> = {
  request_approved: {
    icon: CheckCircle,
    color: '#64748b',
    bgColor: '#f1f5f9',
  },
  request_rejected: {
    icon: XCircle,
    color: '#64748b',
    bgColor: '#f1f5f9',
  },
  order_created: {
    icon: ShoppingCart,
    color: '#64748b',
    bgColor: '#f1f5f9',
  },
  content_published: {
    icon: FileText,
    color: '#64748b',
    bgColor: '#f1f5f9',
  },
  content_unpublished: {
    icon: EyeOff,
    color: '#64748b',
    bgColor: '#f1f5f9',
  },
};

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString('ko-KR');
}

export function SupplierActivityTimeline({ events, loading }: Props) {
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <Activity size={20} style={{ color: '#64748b' }} />
          <h2 style={styles.sectionTitle}>최근 활동</h2>
        </div>
        <div style={styles.timeline}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ ...styles.timelineItem, opacity: 0.5 }}>
              <div style={styles.skeleton} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <Activity size={20} style={{ color: '#64748b' }} />
          <h2 style={styles.sectionTitle}>최근 활동</h2>
        </div>
        <div style={styles.emptyState}>
          <p>최근 활동 내역이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Activity size={20} style={{ color: '#64748b' }} />
        <h2 style={styles.sectionTitle}>최근 활동</h2>
      </div>
      <div style={styles.timeline}>
        {events.map((event, index) => {
          const config = eventConfig[event.type];
          const Icon = config.icon;
          const isLast = index === events.length - 1;

          return (
            <div key={event.id} style={styles.timelineItem}>
              {/* Connector Line */}
              {!isLast && <div style={styles.connector} />}

              {/* Icon */}
              <div
                style={{
                  ...styles.iconWrapper,
                  backgroundColor: config.bgColor,
                }}
              >
                <Icon size={16} style={{ color: config.color }} />
              </div>

              {/* Content */}
              <div style={styles.content}>
                <div style={styles.contentHeader}>
                  <span style={styles.eventTitle}>{event.title}</span>
                  <span style={styles.serviceBadge}>{event.serviceName}</span>
                </div>
                <p style={styles.eventDescription}>{event.description}</p>
                <span style={styles.timestamp}>
                  {formatRelativeTime(event.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  timelineItem: {
    display: 'flex',
    gap: '16px',
    position: 'relative',
    paddingBottom: '20px',
  },
  connector: {
    position: 'absolute',
    left: '17px',
    top: '36px',
    bottom: '0',
    width: '2px',
    backgroundColor: '#e2e8f0',
  },
  iconWrapper: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    zIndex: 1,
  },
  content: {
    flex: 1,
    paddingTop: '2px',
  },
  contentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  eventTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e293b',
  },
  serviceBadge: {
    fontSize: '11px',
    fontWeight: 500,
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  eventDescription: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 4px 0',
    lineHeight: 1.4,
  },
  timestamp: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8',
  },
  skeleton: {
    width: '100%',
    height: '60px',
    backgroundColor: '#e2e8f0',
    borderRadius: '8px',
  },
};

export default SupplierActivityTimeline;
