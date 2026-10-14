import {
  Users,
  Clock,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Mail,
} from 'lucide-react';
import type { ServiceSummary } from '../../../lib/api';
import { SERVICE_ICONS, formatRelativeTime } from './presentation';
import { styles } from './styles';

// Service Card Component
export function ServiceCard({
  service,
  expanded,
  onToggle,
}: {
  service: ServiceSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={styles.serviceCard}>
      {/* Main Row */}
      <div style={styles.serviceMainRow}>
        <div style={styles.serviceInfo}>
          <span style={styles.serviceIcon}>
            {SERVICE_ICONS[service.serviceId] || '📦'}
          </span>
          <div>
            <h3 style={styles.serviceName}>{service.serviceName}</h3>
            <div style={styles.serviceStatsRow}>
              <span style={styles.serviceStat}>
                <Users size={14} />
                {service.summary.approvedSellerCount}명 판매 중
              </span>
              {service.summary.pendingRequestCount > 0 && (
                <span style={styles.serviceStatPending}>
                  <Clock size={14} />
                  {service.summary.pendingRequestCount}건 대기
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={styles.serviceActions}>
          {service.summary.lastApprovedAt && (
            <p style={styles.lastApproved}>
              최근 승인: {formatRelativeTime(service.summary.lastApprovedAt)}
            </p>
          )}
          <div style={styles.actionButtons}>
            {service.navigation.ordersUrl ? (
              <a
                href={service.navigation.ordersUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.serviceLink}
              >
                {service.serviceName} 관리 페이지로 이동
                <ExternalLink size={14} />
              </a>
            ) : (
              <span style={styles.serviceLinkDisabled}>
                관리 페이지 URL 미설정
              </span>
            )}
            <button
              type="button"
              aria-label={`${service.serviceName} 상세 ${expanded ? '접기' : '펼치기'}`}
              aria-expanded={expanded}
              onClick={onToggle}
              style={styles.expandButton}
            >
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div style={styles.expandedContent}>
          {/* Features */}
          {service.features.length > 0 && (
            <div style={styles.featuresSection}>
              <p style={styles.sectionLabel}>지원 기능</p>
              <div style={styles.featureTags}>
                {service.features.map((f, i) => (
                  <span key={i} style={styles.featureTag}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          {service.navigation.supportEmail && (
            <div style={styles.contactSection}>
              <Mail size={14} style={{ color: '#64748b' }} />
              <a
                href={`mailto:${service.navigation.supportEmail}`}
                style={styles.emailLink}
              >
                {service.navigation.supportEmail}
              </a>
            </div>
          )}

          {/* Recent Activity */}
          {service.recentActivity.length > 0 && (
            <div style={styles.activitySection}>
              <p style={styles.sectionLabel}>최근 활동</p>
              <div style={styles.activityList}>
                {service.recentActivity.map((act, i) => (
                  <div key={i} style={styles.activityItem}>
                    <span
                      style={{
                        ...styles.activityBadge,
                        backgroundColor:
                          act.eventType === 'approved' ? '#dcfce7' : '#fee2e2',
                        color:
                          act.eventType === 'approved' ? '#166534' : '#991b1b',
                      }}
                    >
                      {act.eventType === 'approved' ? '승인' : '거절'}
                    </span>
                    <span style={styles.activityText}>
                      {act.sellerName} - {act.productName}
                    </span>
                    <span style={styles.activityTime}>
                      {formatRelativeTime(act.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notice */}
          <p style={styles.serviceNotice}>{service.notice}</p>
        </div>
      )}
    </div>
  );
}
