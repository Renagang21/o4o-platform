/**
 * SupplierDashboardPage - 공급자 대시보드 메인
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P0, P1, P2
 *
 * P2 확장 내용:
 * - 운영 요약 카드 (Summary Cards)
 * - 서비스별 상태판 (Service Status Board)
 * - 최근 활동 타임라인
 * - 최소 통계 영역
 *
 * 금지사항 (HARD RULES):
 * - 주문 생성/처리 ❌
 * - 배송/반품/정산 ❌
 * - 매출 금액 계산 ❌
 * - POST/PUT/DELETE API ❌
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supplierApi, dashboardApi, type SupplierRequest, type SupplierDashboardSummary } from '../../lib/api';
import {
  SupplierSummaryCards,
  SupplierServiceStatusBoard,
  SupplierActivityTimeline,
  SupplierBasicStats,
  type SummaryData,
  type ServiceStatus,
  type ActivityEvent,
  type BasicStatsData,
} from '../../components/supplier';

// 서비스 설정
const SERVICE_CONFIG: Record<string, { name: string; icon: string; url: string; color: string }> = {
  glycopharm: {
    name: 'GlycoPharm',
    icon: '🏥',
    url: 'https://glycopharm.co.kr/pharmacy',
    color: '#22c55e',
  },
  'k-cosmetics': {
    name: 'K-Cosmetics',
    icon: '💄',
    url: 'https://k-cosmetics.site/seller',
    color: '#ec4899',
  },
  glucoseview: {
    name: 'GlucoseView',
    icon: '📊',
    url: 'https://glucoseview.co.kr/provider',
    color: '#3b82f6',
  },
};

// API 데이터를 컴포넌트 props 형식으로 변환
function transformSummaryData(summary: SupplierDashboardSummary | null): SummaryData {
  if (!summary) {
    return {
      activeProducts: 0,
      pendingRequests: 0,
      recentApprovals: 0,
      activeOrders: 0,
      publishedContents: 0,
      connectedServices: 0,
    };
  }

  return {
    activeProducts: summary.stats.activeProducts,
    pendingRequests: summary.stats.pendingRequests,
    recentApprovals: summary.stats.recentApprovals,
    activeOrders: 0, // Neture에서 주문 처리 안함
    publishedContents: summary.stats.publishedContents,
    connectedServices: summary.stats.connectedServices,
  };
}

function transformServiceStatuses(summary: SupplierDashboardSummary | null): ServiceStatus[] {
  if (!summary || summary.serviceStats.length === 0) {
    return [];
  }

  return summary.serviceStats.map((stat) => {
    const config = SERVICE_CONFIG[stat.serviceId] || {
      name: stat.serviceName,
      icon: '📦',
      url: '#',
      color: '#64748b',
    };

    return {
      serviceId: stat.serviceId,
      serviceName: config.name,
      serviceIcon: config.icon,
      serviceUrl: config.url,
      requests: {
        pending: stat.pending,
        approved: stat.approved,
        rejected: stat.rejected,
      },
      orders: { active: 0, completed: 0 }, // Neture에서 주문 처리 안함
      activeProducts: stat.approved * 2, // 승인당 평균 2개 제품 가정
    };
  });
}

function transformActivityEvents(summary: SupplierDashboardSummary | null): ActivityEvent[] {
  if (!summary || summary.recentActivity.length === 0) {
    return [];
  }

  return summary.recentActivity
    .filter((activity) => activity.type === 'approved' || activity.type === 'rejected')
    .map((activity) => ({
      id: activity.id,
      type: activity.type === 'approved' ? 'request_approved' as const : 'request_rejected' as const,
      title: activity.type === 'approved' ? '신청 승인' : '신청 거절',
      description: `${activity.sellerName}님의 ${activity.productName} 신청`,
      serviceName: activity.serviceName,
      timestamp: activity.timestamp,
    }));
}

function transformBasicStats(summary: SupplierDashboardSummary | null): BasicStatsData {
  if (!summary) {
    return {
      approvalRate: { approved: 0, total: 0 },
      serviceDistribution: [],
      conversionCount: 0,
    };
  }

  const total = summary.stats.totalRequests;
  const approved = summary.stats.approvedRequests;

  const distribution = summary.serviceStats.map((stat) => {
    const config = SERVICE_CONFIG[stat.serviceId];
    const count = stat.pending + stat.approved + stat.rejected;
    return {
      serviceId: stat.serviceId,
      serviceName: config?.name || stat.serviceName,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: config?.color || '#64748b',
    };
  });

  return {
    approvalRate: { approved, total },
    serviceDistribution: distribution,
    conversionCount: approved,
  };
}

// 빈 데이터 상태 컴포넌트
function EmptyState({ message }: { message: string }) {
  return (
    <div style={styles.emptyState}>
      <AlertCircle size={40} style={{ color: '#94a3b8', marginBottom: '16px' }} />
      <p style={styles.emptyStateText}>{message}</p>
    </div>
  );
}

export default function SupplierDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<SupplierDashboardSummary | null>(null);
  const [requests, setRequests] = useState<SupplierRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 대시보드 요약 데이터와 대기 중인 요청 병렬 조회
      const [summaryData, requestsData] = await Promise.all([
        dashboardApi.getSupplierDashboardSummary(),
        supplierApi.getRequests({ status: 'pending' }),
      ]);
      setSummary(summaryData);
      setRequests(requestsData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // API 데이터를 컴포넌트 props 형식으로 변환
  const summaryData = transformSummaryData(summary);
  const serviceStatuses = transformServiceStatuses(summary);
  const activityEvents = transformActivityEvents(summary);
  const basicStats = transformBasicStats(summary);

  const pendingRequests = requests.slice(0, 3);
  const hasData = summary !== null;
  const hasServiceData = serviceStatuses.length > 0;
  const hasActivityData = activityEvents.length > 0;

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>공급자 대시보드</h1>
          <p style={styles.subtitle}>
            안녕하세요, <strong>{user?.name || '공급자'}</strong>님.
            현재 운영 상황을 확인하고 필요한 서비스로 이동하세요.
          </p>
        </div>
        <button onClick={fetchData} style={styles.refreshButton} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* P2: 운영 요약 카드 */}
      <SupplierSummaryCards data={summaryData} loading={loading} />

      {/* P2: 서비스별 상태판 */}
      {!loading && !hasServiceData ? (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>서비스별 상태판</h2>
          <EmptyState message="자료가 없습니다. 아직 연결된 서비스가 없습니다." />
        </div>
      ) : (
        <SupplierServiceStatusBoard
          services={hasServiceData ? serviceStatuses : []}
          loading={loading}
        />
      )}

      {/* P2: 2-Column Layout for Timeline & Stats */}
      <div style={styles.twoColumnGrid}>
        {/* 최근 활동 타임라인 */}
        {!loading && !hasActivityData ? (
          <div style={styles.section}>
            <h2 style={styles.sectionTitleSmall}>최근 활동</h2>
            <EmptyState message="자료가 없습니다. 아직 활동 내역이 없습니다." />
          </div>
        ) : (
          <SupplierActivityTimeline events={activityEvents} loading={loading} />
        )}

        {/* 최소 통계 영역 */}
        {!loading && !hasData ? (
          <div style={styles.section}>
            <h2 style={styles.sectionTitleSmall}>기본 통계</h2>
            <EmptyState message="자료가 없습니다. 데이터가 쌓이면 통계가 표시됩니다." />
          </div>
        ) : (
          <SupplierBasicStats data={basicStats} loading={loading} />
        )}
      </div>

      {/* 기존: 대기 중인 신청 미리보기 */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>
            <FileCheck size={20} />
            대기 중인 신청
          </h2>
          <Link to="/supplier/requests" style={styles.viewAllLink}>
            전체 보기 <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <p style={styles.loading}>로딩 중...</p>
        ) : pendingRequests.length === 0 ? (
          <EmptyState message="자료가 없습니다. 현재 대기 중인 신청이 없습니다." />
        ) : (
          <div style={styles.requestList}>
            {pendingRequests.map((req) => {
              const config = SERVICE_CONFIG[req.serviceId];
              return (
                <Link
                  key={req.id}
                  to={`/supplier/requests/${req.id}`}
                  style={styles.requestCard}
                >
                  <div style={styles.requestHeader}>
                    <span style={styles.serviceIcon}>{config?.icon || '📦'}</span>
                    <span style={styles.serviceName}>{config?.name || req.serviceName}</span>
                    <span style={styles.pendingBadge}>대기 중</span>
                  </div>
                  <div style={styles.requestBody}>
                    <p style={styles.sellerName}>{req.sellerName}</p>
                    <p style={styles.productName}>{req.productName}</p>
                  </div>
                  <div style={styles.requestFooter}>
                    <span style={styles.timestamp}>
                      {new Date(req.requestedAt).toLocaleDateString('ko-KR')}
                    </span>
                    <ArrowRight size={16} style={{ color: '#94a3b8' }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 안내 박스 */}
      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>대시보드 안내</h3>
        <ul style={styles.infoList}>
          <li>이 대시보드는 <strong>현재 상황 판단용</strong>입니다. 실제 관리는 각 서비스에서 진행해주세요.</li>
          <li>모든 수치는 실시간 집계 데이터입니다.</li>
          <li>"이 서비스에서 관리" 버튼을 통해 해당 서비스로 이동할 수 있습니다.</li>
        </ul>
        <p style={styles.lastUpdatedText}>
          마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
    marginBottom: '24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  sectionTitleSmall: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 16px 0',
  },
  viewAllLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '14px',
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 500,
  },
  loading: {
    color: '#64748b',
    textAlign: 'center',
    padding: '40px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#94a3b8',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b',
  },
  requestList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  requestCard: {
    display: 'block',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    padding: '16px',
    textDecoration: 'none',
    transition: 'all 0.15s',
  },
  requestHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  serviceIcon: {
    fontSize: '18px',
  },
  serviceName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#64748b',
    flex: 1,
  },
  pendingBadge: {
    fontSize: '11px',
    fontWeight: 500,
    backgroundColor: '#fef3c7',
    color: '#b45309',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  requestBody: {
    marginBottom: '12px',
  },
  sellerName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  productName: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  requestFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    border: '1px solid #bfdbfe',
    padding: '20px',
  },
  infoTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e40af',
    margin: '0 0 12px 0',
  },
  infoList: {
    margin: '0 0 12px 0',
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#1e40af',
    lineHeight: 1.8,
  },
  lastUpdatedText: {
    fontSize: '12px',
    color: '#3b82f6',
    margin: 0,
  },
};
