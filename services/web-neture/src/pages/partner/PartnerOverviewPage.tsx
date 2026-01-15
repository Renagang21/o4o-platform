/**
 * PartnerOverviewPage - 파트너 운영 허브
 *
 * Work Order: WO-NETURE-PARTNER-DASHBOARD-HUB
 *
 * 파트너 역할:
 * - 공급자와의 협업 상태 확인
 * - 연결된 서비스별 현황 확인
 * - 각 서비스로 이동하여 상세 작업 수행
 *
 * 허브 개념:
 * - Neture는 파트너의 운영 허브
 * - 전체 현황 파악 및 이동 지점
 * - 상세 분석/처리는 각 서비스에서
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Info, ExternalLink, Users, Megaphone, ArrowRight, Sparkles } from 'lucide-react';
import { AiPreviewModal } from '../../components/ai/AiPreviewModal';

// Mock 데이터: 연결된 서비스/공급자 목록
const connectedServices = [
  {
    id: 'glycopharm',
    name: 'GlycoPharm',
    icon: '🏥',
    status: 'active',
    supplierCount: 3,
    activeCampaigns: 2,
    lastActivity: '2시간 전',
    url: 'https://glycopharm.neture.co.kr/partner',
  },
  {
    id: 'k-cosmetics',
    name: 'K-Cosmetics',
    icon: '💄',
    status: 'active',
    supplierCount: 5,
    activeCampaigns: 1,
    lastActivity: '1일 전',
    url: 'https://k-cosmetics.neture.co.kr/partner',
  },
];

// Mock 데이터: 알림
const notifications = [
  { type: 'info', icon: '📬', text: '신규 협업 요청 2건', action: '검토하기', link: '#' },
  { type: 'success', icon: '💰', text: '이번 달 정산 완료: ₩850,000', action: '상세 보기', link: '#' },
];

export function PartnerOverviewPage() {
  const [showAiModal, setShowAiModal] = useState(false);
  const totalSuppliers = connectedServices.reduce((sum, s) => sum + s.supplierCount, 0);
  const totalCampaigns = connectedServices.reduce((sum, s) => sum + s.activeCampaigns, 0);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <Compass size={28} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <h1 style={styles.title}>파트너 운영 허브</h1>
            <p style={styles.subtitle}>
              연결된 서비스 현황을 확인하고, 필요한 서비스로 바로 이동합니다
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAiModal(true)}
          style={styles.aiButton}
          aria-label="AI 요약"
        >
          <Sparkles size={16} />
          AI 요약
        </button>
      </div>

      {/* Hub Concept Info */}
      <div style={styles.infoCard}>
        <Info size={20} style={{ color: '#2563eb', flexShrink: 0 }} />
        <div>
          <p style={styles.infoCardText}>
            <strong>Neture는 파트너의 운영 허브입니다.</strong><br />
            협업 중인 공급자와 서비스 현황을 한눈에 확인하고,
            상세 작업이 필요한 서비스로 바로 이동할 수 있습니다.
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <Users size={24} style={{ color: '#2563eb' }} />
          <div>
            <p style={styles.statValue}>{connectedServices.length}</p>
            <p style={styles.statLabel}>연결된 서비스</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Users size={24} style={{ color: '#16a34a' }} />
          <div>
            <p style={styles.statValue}>{totalSuppliers}</p>
            <p style={styles.statLabel}>협업 공급자</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Megaphone size={24} style={{ color: '#f59e0b' }} />
          <div>
            <p style={styles.statValue}>{totalCampaigns}</p>
            <p style={styles.statLabel}>진행 중 캠페인</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div style={styles.notificationSection}>
          <h2 style={styles.sectionTitle}>확인이 필요한 항목</h2>
          <div style={styles.notificationList}>
            {notifications.map((noti, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.notificationItem,
                  backgroundColor: noti.type === 'success' ? '#f0fdf4' : '#eff6ff',
                  borderColor: noti.type === 'success' ? '#86efac' : '#bfdbfe',
                }}
              >
                <span style={styles.notificationIcon}>{noti.icon}</span>
                <span style={styles.notificationText}>{noti.text}</span>
                <Link to={noti.link} style={styles.notificationAction}>
                  {noti.action}
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Service Entry Cards */}
      <div style={styles.serviceSection}>
        <h2 style={styles.sectionTitle}>서비스별 운영 현황</h2>
        {connectedServices.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyStateIcon}>
              <Compass size={40} style={{ color: '#94a3b8' }} />
            </div>
            <h3 style={styles.emptyStateTitle}>아직 연결된 서비스가 없습니다</h3>
            <p style={styles.emptyStateText}>
              공급자와 협업이 시작되면,<br />
              해당 서비스가 이곳에 자동으로 표시됩니다.
            </p>
          </div>
        ) : (
          <div style={styles.serviceList}>
            {connectedServices.map((service) => (
              <div key={service.id} style={styles.serviceCard}>
                <div style={styles.serviceHeader}>
                  <div style={styles.serviceInfo}>
                    <span style={styles.serviceIcon}>{service.icon}</span>
                    <div>
                      <h3 style={styles.serviceName}>{service.name}</h3>
                      <div style={styles.serviceStats}>
                        <span style={styles.serviceStat}>
                          <Users size={14} />
                          {service.supplierCount}개 공급자
                        </span>
                        <span style={styles.serviceStat}>
                          <Megaphone size={14} />
                          {service.activeCampaigns}개 캠페인
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={styles.serviceActions}>
                    <p style={styles.lastActivity}>최근 활동: {service.lastActivity}</p>
                    <a
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.serviceLink}
                    >
                      {service.name} 파트너 페이지로 이동
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={styles.quickSection}>
        <h2 style={styles.sectionTitle}>빠른 액션</h2>
        <div style={styles.quickGrid}>
          <Link to="#" style={styles.quickCard}>
            <span style={styles.quickIcon}>🤝</span>
            <span style={styles.quickLabel}>협업 관리</span>
            <span style={styles.quickDesc}>공급자 연결 및 계약</span>
          </Link>
          <Link to="#" style={styles.quickCard}>
            <span style={styles.quickIcon}>📢</span>
            <span style={styles.quickLabel}>프로모션</span>
            <span style={styles.quickDesc}>캠페인 현황 확인</span>
          </Link>
          <Link to="#" style={styles.quickCard}>
            <span style={styles.quickIcon}>💳</span>
            <span style={styles.quickLabel}>정산 내역</span>
            <span style={styles.quickDesc}>커미션 및 정산</span>
          </Link>
        </div>
      </div>

      {/* Role Separation Notice */}
      <div style={styles.roleNotice}>
        <div style={styles.roleNoticeContent}>
          <span style={styles.roleNoticeBadge}>책임 분리</span>
          <p style={styles.roleNoticeText}>
            <strong>Neture</strong>: 전체 현황 확인 및 이동 &nbsp;|&nbsp;
            <strong>각 서비스</strong>: 상세 협업, 캠페인 관리, 정산 처리
          </p>
        </div>
      </div>

      <AiPreviewModal isOpen={showAiModal} onClose={() => setShowAiModal(false)} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  aiButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  infoCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '12px',
    padding: '18px 22px',
    marginBottom: '24px',
  },
  infoCardText: {
    fontSize: '14px',
    color: '#1e40af',
    margin: 0,
    lineHeight: 1.6,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  notificationSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#475569',
    margin: '0 0 16px 0',
  },
  notificationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  notificationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 18px',
    borderRadius: '10px',
    border: '1px solid',
  },
  notificationIcon: {
    fontSize: '18px',
  },
  notificationText: {
    flex: 1,
    fontSize: '14px',
    color: '#1e293b',
  },
  notificationAction: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 500,
  },
  serviceSection: {
    marginBottom: '24px',
  },
  serviceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  serviceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
  },
  serviceInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  serviceIcon: {
    fontSize: '32px',
  },
  serviceName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 6px 0',
  },
  serviceStats: {
    display: 'flex',
    gap: '16px',
  },
  serviceStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#64748b',
  },
  serviceActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
  },
  lastActivity: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
  },
  serviceLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#2563eb',
    padding: '8px 14px',
    borderRadius: '6px',
    textDecoration: 'none',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 40px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
  },
  emptyStateIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  emptyStateTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#475569',
    margin: '0 0 12px 0',
  },
  emptyStateText: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.6,
  },
  quickSection: {
    marginBottom: '24px',
  },
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  quickCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    textDecoration: 'none',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  quickIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  quickLabel: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '4px',
  },
  quickDesc: {
    fontSize: '12px',
    color: '#64748b',
    textAlign: 'center',
  },
  roleNotice: {
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    padding: '16px 20px',
  },
  roleNoticeContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  roleNoticeBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#475569',
    backgroundColor: '#e2e8f0',
    padding: '4px 10px',
    borderRadius: '4px',
    whiteSpace: 'nowrap',
  },
  roleNoticeText: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
};
