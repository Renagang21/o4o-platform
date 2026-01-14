/**
 * SellerRequestsPage - 판매자 신청 목록
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P0
 *
 * 핵심 기능:
 * - 여러 서비스의 신청을 통합 표시
 * - 상태별 필터링
 * - 서비스별 필터링
 *
 * 표시 항목:
 * - 신청 판매자명
 * - 신청 서비스 (GlycoPharm / K-Cosmetics 등)
 * - 신청 제품
 * - 신청 상태 (PENDING / APPROVED / REJECTED)
 * - 신청 일시
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

// 신청 상태 타입
type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// 판매자 신청 타입 (여러 서비스 통합)
interface SellerRequest {
  id: string;
  sellerName: string;
  sellerEmail: string;
  serviceName: string;
  serviceId: string;
  serviceIcon: string;
  productId: string;
  productName: string;
  productPurpose: 'CATALOG' | 'APPLICATION' | 'ACTIVE_SALES';
  status: RequestStatus;
  createdAt: string;
}

// Mock 데이터 (API 연동 전)
const MOCK_REQUESTS: SellerRequest[] = [
  {
    id: 'req-1',
    sellerName: '강남약국',
    sellerEmail: 'gangnam@pharmacy.kr',
    serviceName: 'GlycoPharm',
    serviceId: 'glycopharm',
    serviceIcon: '🏥',
    productId: 'prod-1',
    productName: '혈당관리 건강기능식품 A',
    productPurpose: 'APPLICATION',
    status: 'PENDING',
    createdAt: '2026-01-14T09:30:00Z',
  },
  {
    id: 'req-2',
    sellerName: '뷰티플러스 명동점',
    sellerEmail: 'myeongdong@beauty.kr',
    serviceName: 'K-Cosmetics',
    serviceId: 'k-cosmetics',
    serviceIcon: '💄',
    productId: 'prod-2',
    productName: '프리미엄 스킨케어 세트',
    productPurpose: 'APPLICATION',
    status: 'PENDING',
    createdAt: '2026-01-14T08:15:00Z',
  },
  {
    id: 'req-3',
    sellerName: '서초중앙약국',
    sellerEmail: 'seocho@pharmacy.kr',
    serviceName: 'GlycoPharm',
    serviceId: 'glycopharm',
    serviceIcon: '🏥',
    productId: 'prod-3',
    productName: '혈당관리 건강기능식품 B',
    productPurpose: 'ACTIVE_SALES',
    status: 'APPROVED',
    createdAt: '2026-01-13T14:00:00Z',
  },
  {
    id: 'req-4',
    sellerName: '한국약사회 직영',
    sellerEmail: 'kpa@society.kr',
    serviceName: 'GlucoseView',
    serviceId: 'glucoseview',
    serviceIcon: '📊',
    productId: 'prod-4',
    productName: '당뇨 관리 키트',
    productPurpose: 'APPLICATION',
    status: 'REJECTED',
    createdAt: '2026-01-12T11:30:00Z',
  },
  {
    id: 'req-5',
    sellerName: '청담 뷰티샵',
    sellerEmail: 'cheongdam@beauty.kr',
    serviceName: 'K-Cosmetics',
    serviceId: 'k-cosmetics',
    serviceIcon: '💄',
    productId: 'prod-5',
    productName: '안티에이징 크림',
    productPurpose: 'APPLICATION',
    status: 'PENDING',
    createdAt: '2026-01-14T07:45:00Z',
  },
];

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  PENDING: { label: '대기 중', color: '#b45309', bgColor: '#fef3c7', icon: Clock },
  APPROVED: { label: '승인됨', color: '#15803d', bgColor: '#dcfce7', icon: CheckCircle },
  REJECTED: { label: '거절됨', color: '#dc2626', bgColor: '#fee2e2', icon: XCircle },
};

const SERVICES = [
  { id: 'all', name: '전체 서비스', icon: '🌐' },
  { id: 'glycopharm', name: 'GlycoPharm', icon: '🏥' },
  { id: 'k-cosmetics', name: 'K-Cosmetics', icon: '💄' },
  { id: 'glucoseview', name: 'GlucoseView', icon: '📊' },
];

export default function SellerRequestsPage() {
  const [requests, setRequests] = useState<SellerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 500));
      setRequests(MOCK_REQUESTS);
      setLoading(false);
    };
    fetchRequests();
  }, []);

  // 필터링
  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
    if (serviceFilter !== 'all' && req.serviceId !== serviceFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !req.sellerName.toLowerCase().includes(query) &&
        !req.productName.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>판매자 신청 관리</h1>
        <p style={styles.subtitle}>
          여러 서비스에서 들어온 판매자 신청을 한 화면에서 확인하고 처리합니다.
        </p>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        {/* Search */}
        <div style={styles.searchBox}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="판매자명 또는 제품명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {/* Status Filter */}
        <div style={styles.filterGroup}>
          <Filter size={16} style={{ color: '#64748b' }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RequestStatus | 'ALL')}
            style={styles.select}
          >
            <option value="ALL">모든 상태</option>
            <option value="PENDING">대기 중</option>
            <option value="APPROVED">승인됨</option>
            <option value="REJECTED">거절됨</option>
          </select>
        </div>

        {/* Service Filter */}
        <div style={styles.filterGroup}>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            style={styles.select}
          >
            {SERVICES.map((svc) => (
              <option key={svc.id} value={svc.id}>
                {svc.icon} {svc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div style={styles.resultsInfo}>
        <span>총 {filteredRequests.length}건</span>
        {statusFilter === 'PENDING' && (
          <span style={styles.pendingAlert}>
            {filteredRequests.length}건의 신청이 승인 대기 중입니다.
          </span>
        )}
      </div>

      {/* Request List */}
      {loading ? (
        <div style={styles.loading}>로딩 중...</div>
      ) : filteredRequests.length === 0 ? (
        <div style={styles.emptyState}>
          <p>조건에 맞는 신청이 없습니다.</p>
        </div>
      ) : (
        <div style={styles.requestList}>
          {filteredRequests.map((req) => {
            const statusConfig = STATUS_CONFIG[req.status];
            const StatusIcon = statusConfig.icon;

            return (
              <Link
                key={req.id}
                to={`/supplier/requests/${req.id}`}
                style={styles.requestCard}
              >
                {/* Left: Service & Status */}
                <div style={styles.cardLeft}>
                  <span style={styles.serviceIcon}>{req.serviceIcon}</span>
                  <div
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color,
                    }}
                  >
                    <StatusIcon size={12} />
                    {statusConfig.label}
                  </div>
                </div>

                {/* Center: Info */}
                <div style={styles.cardCenter}>
                  <div style={styles.cardRow}>
                    <span style={styles.sellerName}>{req.sellerName}</span>
                    <span style={styles.serviceName}>{req.serviceName}</span>
                  </div>
                  <p style={styles.productName}>{req.productName}</p>
                  <span style={styles.timestamp}>
                    {new Date(req.createdAt).toLocaleString('ko-KR')}
                  </span>
                </div>

                {/* Right: Arrow */}
                <div style={styles.cardRight}>
                  <ArrowRight size={20} style={{ color: '#94a3b8' }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  searchBox: {
    position: 'relative',
    flex: 1,
    minWidth: '200px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 40px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    outline: 'none',
  },
  resultsInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '16px',
  },
  pendingAlert: {
    color: '#b45309',
    fontWeight: 500,
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#64748b',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    color: '#94a3b8',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  requestList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  requestCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '16px 20px',
    textDecoration: 'none',
    transition: 'all 0.15s',
  },
  cardLeft: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    minWidth: '80px',
  },
  serviceIcon: {
    fontSize: '28px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 500,
    padding: '4px 8px',
    borderRadius: '4px',
  },
  cardCenter: {
    flex: 1,
  },
  cardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '4px',
  },
  sellerName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
  },
  serviceName: {
    fontSize: '12px',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  productName: {
    fontSize: '14px',
    color: '#475569',
    margin: '0 0 4px 0',
  },
  timestamp: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  cardRight: {
    display: 'flex',
    alignItems: 'center',
  },
};
