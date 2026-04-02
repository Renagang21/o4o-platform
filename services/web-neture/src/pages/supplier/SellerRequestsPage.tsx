/**
 * SellerRequestsPage - 판매자 신청 목록
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P0
 * API: WO-NETURE-SUPPLIER-REQUEST-API-V1
 *
 * 핵심 기능:
 * - 여러 서비스의 신청을 통합 표시
 * - 상태별 필터링
 * - 서비스별 필터링
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Clock, CheckCircle, XCircle, PauseCircle, Ban } from 'lucide-react';
import { supplierApi, type SupplierRequest, type SupplierRequestStatus } from '../../lib/api';
import { DataTable, type Column } from '@o4o/ui';

// 서비스 아이콘 맵핑
const SERVICE_ICONS: Record<string, string> = {
  glycopharm: '🏥',
  'k-cosmetics': '💄',
};

const STATUS_CONFIG: Record<SupplierRequestStatus, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  pending: { label: '대기 중', color: '#b45309', bgColor: '#fef3c7', icon: Clock },
  approved: { label: '승인됨', color: '#15803d', bgColor: '#dcfce7', icon: CheckCircle },
  rejected: { label: '거절됨', color: '#dc2626', bgColor: '#fee2e2', icon: XCircle },
  suspended: { label: '일시 중단', color: '#c2410c', bgColor: '#fff7ed', icon: PauseCircle },
  revoked: { label: '공급 종료', color: '#dc2626', bgColor: '#fee2e2', icon: Ban },
  expired: { label: '계약 만료', color: '#64748b', bgColor: '#f1f5f9', icon: Clock },
};

// WO-NETURE-EXCLUDE-GLUCOSEVIEW-FROM-PRODUCT-SERVICE-SELECTION-V1: glucoseview 제외 (소비자 대상 서비스)
const SERVICES = [
  { id: 'all', name: '전체 서비스', icon: '🌐' },
  { id: 'glycopharm', name: 'GlycoPharm', icon: '🏥' },
  { id: 'k-cosmetics', name: 'K-Cosmetics', icon: '💄' },
];

export default function SellerRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<SupplierRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SupplierRequestStatus | 'ALL'>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      const data = await supplierApi.getRequests();
      setRequests(data);
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

  // DataTable columns (축약 버전: 4개 컬럼 + 액션)
  const columns: Column<Record<string, any>>[] = [
    { key: 'seller', title: '판매자', dataIndex: 'seller', width: '25%' },
    { key: 'service', title: '서비스', dataIndex: 'service', width: '20%' },
    { key: 'date', title: '신청일', dataIndex: 'date', width: '20%' },
    { key: 'status', title: '상태', dataIndex: 'status', width: '20%', align: 'center' },
    { key: 'actions', title: '', dataIndex: 'actions', width: '15%' },
  ];

  // DataTable rows
  const tableRows = filteredRequests.map((req) => {
    const statusConfig = STATUS_CONFIG[req.status];
    const StatusIcon = statusConfig.icon;

    return {
      id: req.id,
      seller: (
        <div>
          <div className="font-medium text-gray-900">{req.sellerName}</div>
          <div className="text-sm text-gray-600">{req.productName}</div>
        </div>
      ),
      service: (
        <div className="flex items-center gap-2">
          <span className="text-lg">{SERVICE_ICONS[req.serviceId] || '📦'}</span>
          <span className="text-sm text-gray-700">{req.serviceName}</span>
        </div>
      ),
      date: (
        <div className="text-sm text-gray-600">
          {new Date(req.requestedAt).toLocaleString('ko-KR')}
        </div>
      ),
      status: (
        <div
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: statusConfig.bgColor,
            color: statusConfig.color,
          }}
        >
          <StatusIcon size={12} />
          {statusConfig.label}
        </div>
      ),
      actions: (
        <button
          onClick={() => navigate(`/supplier/requests/${req.id}`)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          상세보기
        </button>
      ),
    };
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
            onChange={(e) => setStatusFilter(e.target.value as SupplierRequestStatus | 'ALL')}
            style={styles.select}
          >
            <option value="ALL">모든 상태</option>
            <option value="pending">대기 중</option>
            <option value="approved">승인됨</option>
            <option value="rejected">거절됨</option>
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
        {statusFilter === 'pending' && (
          <span style={styles.pendingAlert}>
            {filteredRequests.length}건의 신청이 승인 대기 중입니다.
          </span>
        )}
      </div>

      {/* Request List - SimpleTable */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          dataSource={tableRows}
          rowKey="id"
          loading={loading}
          emptyText="조건에 맞는 신청이 없습니다"
        />
      </div>
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
