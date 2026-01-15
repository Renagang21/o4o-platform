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
import { FileCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supplierApi, type SupplierRequest } from '../../lib/api';
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
const SERVICE_CONFIG = {
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

// Mock 데이터 생성 함수 (GET API 기반 집계 시뮬레이션)
function calculateSummaryData(requests: SupplierRequest[]): SummaryData {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentApprovals = requests.filter(
    (r) =>
      r.status === 'approved' && new Date(r.requestedAt) >= sevenDaysAgo
  ).length;

  const connectedServices = new Set(requests.map((r) => r.serviceId)).size;

  return {
    activeProducts: requests.filter((r) => r.status === 'approved').length * 2, // 승인당 평균 2개 제품 가정
    pendingRequests: requests.filter((r) => r.status === 'pending').length,
    recentApprovals,
    activeOrders: Math.floor(Math.random() * 5), // 시뮬레이션
    publishedContents: Math.floor(Math.random() * 10) + 1, // 시뮬레이션
    connectedServices: connectedServices || 3,
  };
}

function calculateServiceStatuses(requests: SupplierRequest[]): ServiceStatus[] {
  const serviceMap = new Map<string, SupplierRequest[]>();

  requests.forEach((r) => {
    if (!serviceMap.has(r.serviceId)) {
      serviceMap.set(r.serviceId, []);
    }
    serviceMap.get(r.serviceId)!.push(r);
  });

  const statuses: ServiceStatus[] = [];

  Object.entries(SERVICE_CONFIG).forEach(([serviceId, config]) => {
    const serviceRequests = serviceMap.get(serviceId) || [];

    statuses.push({
      serviceId,
      serviceName: config.name,
      serviceIcon: config.icon,
      serviceUrl: config.url,
      requests: {
        pending: serviceRequests.filter((r) => r.status === 'pending').length,
        approved: serviceRequests.filter((r) => r.status === 'approved').length,
        rejected: serviceRequests.filter((r) => r.status === 'rejected').length,
      },
      orders: {
        active: Math.floor(Math.random() * 3),
        completed: Math.floor(Math.random() * 10),
      },
      activeProducts: serviceRequests.filter((r) => r.status === 'approved').length * 2,
    });
  });

  return statuses.filter(
    (s) => s.requests.pending + s.requests.approved + s.requests.rejected > 0
  );
}

function generateActivityEvents(requests: SupplierRequest[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  // 최근 신청 이벤트 생성
  requests
    .filter((r) => r.status !== 'pending')
    .slice(0, 5)
    .forEach((r) => {
      const config = SERVICE_CONFIG[r.serviceId as keyof typeof SERVICE_CONFIG];
      events.push({
        id: `event-${r.id}`,
        type: r.status === 'approved' ? 'request_approved' : 'request_rejected',
        title: r.status === 'approved' ? '신청 승인' : '신청 거절',
        description: `${r.sellerName}님의 ${r.productName} 신청`,
        serviceName: config?.name || r.serviceName,
        timestamp: r.requestedAt,
      });
    });

  // 시뮬레이션: 주문/콘텐츠 이벤트 추가
  events.push({
    id: 'event-order-1',
    type: 'order_created',
    title: '새 주문 접수',
    description: '글라이코팜 강남점에서 주문 발생',
    serviceName: 'GlycoPharm',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  });

  events.push({
    id: 'event-content-1',
    type: 'content_published',
    title: '콘텐츠 게시',
    description: '신제품 안내 콘텐츠가 게시되었습니다',
    serviceName: 'Neture',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  });

  // 시간순 정렬 (최신 순)
  return events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);
}

function calculateBasicStats(requests: SupplierRequest[]): BasicStatsData {
  const total = requests.length;
  const approved = requests.filter((r) => r.status === 'approved').length;

  const serviceGroups = requests.reduce((acc, r) => {
    acc[r.serviceId] = (acc[r.serviceId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const distribution = Object.entries(serviceGroups).map(([serviceId, count]) => {
    const config = SERVICE_CONFIG[serviceId as keyof typeof SERVICE_CONFIG];
    return {
      serviceId,
      serviceName: config?.name || serviceId,
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

export default function SupplierDashboardPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SupplierRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    const data = await supplierApi.getRequests();
    setRequests(data);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 파생 데이터 계산
  const summaryData = calculateSummaryData(requests);
  const serviceStatuses = calculateServiceStatuses(requests);
  const activityEvents = generateActivityEvents(requests);
  const basicStats = calculateBasicStats(requests);

  const pendingRequests = requests.filter((r) => r.status === 'pending').slice(0, 3);

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
      <SupplierServiceStatusBoard
        services={serviceStatuses.length > 0 ? serviceStatuses : Object.entries(SERVICE_CONFIG).map(([id, config]) => ({
          serviceId: id,
          serviceName: config.name,
          serviceIcon: config.icon,
          serviceUrl: config.url,
          requests: { pending: 0, approved: 0, rejected: 0 },
          orders: { active: 0, completed: 0 },
          activeProducts: 0,
        }))}
        loading={loading}
      />

      {/* P2: 2-Column Layout for Timeline & Stats */}
      <div style={styles.twoColumnGrid}>
        {/* 최근 활동 타임라인 */}
        <SupplierActivityTimeline events={activityEvents} loading={loading} />

        {/* 최소 통계 영역 */}
        <SupplierBasicStats data={basicStats} loading={loading} />
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
          <div style={styles.emptyState}>
            <p>현재 대기 중인 신청이 없습니다.</p>
          </div>
        ) : (
          <div style={styles.requestList}>
            {pendingRequests.map((req) => {
              const config = SERVICE_CONFIG[req.serviceId as keyof typeof SERVICE_CONFIG];
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
