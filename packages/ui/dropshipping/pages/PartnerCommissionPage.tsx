import React, { useState, useMemo } from 'react';
import { 
  DollarSign,
  Calendar,
  Download,
  Search,
  Filter,
  RotateCcw,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Banknote,
  RefreshCw
} from 'lucide-react';
import { CommissionTransaction, getCommissionStatusText, getCommissionStatusColor } from '../types/partner';
import { StatusBadge } from '../ui/StatusBadge';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalButton } from '../ui/Modal';
import { ToastProvider, useSuccessToast, useWarningToast, useInfoToast } from '../ui/ToastNotification';

interface PartnerCommissionPageProps {
  currentRole: string;
  activeMenu: string;
  onMenuChange: (menuId: string) => void;
}

interface CommissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  commission: CommissionTransaction | null;
}

// Generate comprehensive commission data
const generateCommissionData = (): CommissionTransaction[] => {
  const statuses: CommissionTransaction['status'][] = ['pending', 'approved', 'paid', 'cancelled'];
  const campaigns = [
    '무선 이어폰 여름 프로모션',
    '게이밍 마우스 리뷰 캠페인',
    'USB-C 케이블 대량 구매 이벤트',
    '스마트 워치 밴드 신제품 출시',
    '블루투스 스피커 신규 출시'
  ];
  const products = [
    '무선 블루투스 이어폰 프리미엄',
    '무선 마우스 게이밍용',
    'USB-C 고속 충전 케이블 3m',
    '스마트 워치 밴드 실리콘',
    '휴대용 블루투스 스피커'
  ];

  const commissions: CommissionTransaction[] = [];
  
  for (let i = 1; i <= 50; i++) {
    const campaignIndex = Math.floor(Math.random() * campaigns.length);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const orderAmount = Math.floor(Math.random() * 200000) + 20000; // 20K - 220K
    const commissionRate = 3 + Math.random() * 7; // 3-10%
    const commissionAmount = Math.floor(orderAmount * (commissionRate / 100));
    
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 60)); // Last 2 months
    
    let paidAt = undefined;
    if (status === 'paid') {
      const paidDate = new Date(createdDate);
      paidDate.setDate(paidDate.getDate() + Math.floor(Math.random() * 14) + 1); // 1-14 days after creation
      paidAt = paidDate.toISOString();
    }

    commissions.push({
      id: `COM${String(i).padStart(3, '0')}`,
      campaignId: `CAM${String(campaignIndex + 1).padStart(3, '0')}`,
      campaignName: campaigns[campaignIndex],
      orderId: `ORD-${createdDate.toISOString().split('T')[0].replace(/-/g, '')}-${String(i).padStart(3, '0')}`,
      customerId: `CUST${String(Math.floor(Math.random() * 1000) + 1).padStart(3, '0')}`,
      productName: products[campaignIndex],
      orderAmount,
      commissionRate: Math.round(commissionRate * 10) / 10,
      commissionAmount,
      status,
      createdAt: createdDate.toISOString(),
      paidAt
    });
  }

  return commissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// Commission Detail Modal
const CommissionDetailModal: React.FC<CommissionDetailModalProps> = ({
  isOpen,
  onClose,
  commission
}) => {
  if (!commission) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="커미션 상세 정보"
    >
      <ModalBody>
        <div className="space-y-6">
          {/* Header Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">{commission.campaignName}</h3>
              <StatusBadge status={getCommissionStatusText(commission.status)} size="sm" />
            </div>
            <p className="text-sm text-gray-600">{commission.productName}</p>
          </div>

          {/* Commission Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">주문 번호</label>
                <p className="text-sm font-mono text-gray-900">{commission.orderId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">고객 ID</label>
                <p className="text-sm font-mono text-gray-900">{commission.customerId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">주문 금액</label>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(commission.orderAmount)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">커미션율</label>
                <p className="text-sm font-bold text-orange-600">{commission.commissionRate}%</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">커미션 금액</label>
                <p className="text-lg font-bold text-green-600">{formatCurrency(commission.commissionAmount)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">발생일</label>
                <p className="text-sm text-gray-900">{formatDate(commission.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          {commission.paidAt && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900">지급 완료</span>
              </div>
              <p className="text-sm text-green-700">
                지급일: {formatDate(commission.paidAt)}
              </p>
            </div>
          )}

          {commission.status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="font-semibold text-yellow-900">승인 대기 중</span>
              </div>
              <p className="text-sm text-yellow-700">
                주문 확정 후 승인 처리됩니다. 일반적으로 3-5일 소요됩니다.
              </p>
            </div>
          )}

          {commission.status === 'cancelled' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-900">취소됨</span>
              </div>
              <p className="text-sm text-red-700">
                주문이 취소되어 커미션이 지급되지 않습니다.
              </p>
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <ModalButton variant="primary" onClick={onClose}>
          확인
        </ModalButton>
      </ModalFooter>
    </Modal>
  );
};

// Main content component
const PartnerCommissionContent: React.FC<PartnerCommissionPageProps> = ({
  currentRole,
  activeMenu,
  onMenuChange
}) => {
  const [commissions] = useState<CommissionTransaction[]>(generateCommissionData());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'cancelled'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7days' | '30days' | '90days'>('30days');
  const [selectedCommission, setSelectedCommission] = useState<CommissionTransaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const showSuccess = useSuccessToast();
  const showInfo = useInfoToast();

  // Filter commissions
  const filteredCommissions = useMemo(() => {
    let filtered = [...commissions];

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(commission =>
        commission.campaignName.toLowerCase().includes(search) ||
        commission.productName.toLowerCase().includes(search) ||
        commission.orderId.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(commission => commission.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const days = dateFilter === '7days' ? 7 : dateFilter === '30days' ? 30 : 90;
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(commission => new Date(commission.createdAt) >= cutoffDate);
    }

    return filtered;
  }, [commissions, searchTerm, statusFilter, dateFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredCommissions.length / itemsPerPage);
  const paginatedCommissions = filteredCommissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = commissions.filter(c => {
      const commissionDate = new Date(c.createdAt);
      return commissionDate.getMonth() === now.getMonth() && 
             commissionDate.getFullYear() === now.getFullYear();
    });

    const lastMonth = commissions.filter(c => {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const commissionDate = new Date(c.createdAt);
      return commissionDate.getMonth() === lastMonthDate.getMonth() && 
             commissionDate.getFullYear() === lastMonthDate.getFullYear();
    });

    const pendingCommissions = commissions.filter(c => c.status === 'pending' || c.status === 'approved');
    const paidCommissions = commissions.filter(c => c.status === 'paid');

    const thisMonthTotal = thisMonth.reduce((sum, c) => sum + c.commissionAmount, 0);
    const lastMonthTotal = lastMonth.reduce((sum, c) => sum + c.commissionAmount, 0);
    const pendingTotal = pendingCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const paidTotal = paidCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);

    const monthlyGrowth = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    return {
      thisMonthTotal,
      lastMonthTotal,
      monthlyGrowth,
      pendingTotal,
      pendingCount: pendingCommissions.length,
      paidTotal,
      paidCount: paidCommissions.length,
      totalEarnings: commissions.reduce((sum, c) => sum + (c.status === 'paid' ? c.commissionAmount : 0), 0)
    };
  }, [commissions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewDetail = (commission: CommissionTransaction) => {
    setSelectedCommission(commission);
    setIsDetailModalOpen(true);
  };

  const handleExportReport = () => {
    showSuccess('리포트 생성', '커미션 리포트가 다운로드 폴더에 저장되었습니다.');
  };

  const handleRequestSettlement = () => {
    showInfo('정산 요청', '정산 요청이 전송되었습니다. 처리까지 3-5일 소요됩니다.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-6 border border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              커미션 관리 💰
            </h1>
            <p className="text-gray-700 font-medium">
              발생한 커미션을 확인하고 정산을 관리하세요.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleRequestSettlement}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <CreditCard className="w-4 h-4" />
              정산 요청
            </button>
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 px-4 py-2 bg-white text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              리포트
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">이번 달 커미션</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.thisMonthTotal)}</div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${
                stats.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.monthlyGrowth >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span>{Math.abs(stats.monthlyGrowth).toFixed(1)}% vs 지난달</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">승인 대기</div>
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingTotal)}</div>
              <div className="text-xs text-gray-500 mt-1">{stats.pendingCount}건</div>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">지급 완료</div>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidTotal)}</div>
              <div className="text-xs text-gray-500 mt-1">{stats.paidCount}건</div>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">총 수익</div>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalEarnings)}</div>
              <div className="text-xs text-gray-500 mt-1">누적</div>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Banknote className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="캠페인명, 상품명, 주문번호로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">모든 상태</option>
            <option value="pending">승인 대기</option>
            <option value="approved">승인 완료</option>
            <option value="paid">지급 완료</option>
            <option value="cancelled">취소</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">전체 기간</option>
            <option value="7days">최근 7일</option>
            <option value="30days">최근 30일</option>
            <option value="90days">최근 90일</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDateFilter('30days');
              setCurrentPage(1);
            }}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            초기화
          </button>
        </div>
      </div>

      {/* Commission List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              커미션 내역 ({filteredCommissions.length.toLocaleString()}건)
            </h3>
            <div className="text-sm text-gray-500">
              페이지 {currentPage} / {totalPages}
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {paginatedCommissions.length === 0 ? (
            <div className="p-12 text-center">
              <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                  ? '검색 결과가 없습니다' 
                  : '커미션 내역이 없습니다'
                }
              </h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                  ? '다른 검색어나 필터를 시도해보세요.'
                  : '마케팅 활동을 통해 첫 커미션을 받아보세요.'
                }
              </p>
            </div>
          ) : (
            paginatedCommissions.map((commission) => (
              <div key={commission.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900 truncate">
                        {commission.campaignName}
                      </h4>
                      <StatusBadge 
                        status={getCommissionStatusText(commission.status)} 
                        size="sm" 
                      />
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{commission.productName}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">주문 금액</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(commission.orderAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">커미션율</div>
                        <div className="text-sm font-semibold text-orange-600">
                          {commission.commissionRate}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">커미션 금액</div>
                        <div className="text-sm font-bold text-green-600">
                          {formatCurrency(commission.commissionAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">발생일</div>
                        <div className="text-sm text-gray-900">
                          {formatDate(commission.createdAt)}
                        </div>
                      </div>
                    </div>

                    {commission.paidAt && (
                      <div className="mt-3 text-xs text-green-600">
                        지급일: {formatDate(commission.paidAt)}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleViewDetail(commission)}
                    className="ml-4 p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    title="상세 보기"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  const isActive = page === currentPage;
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm rounded-md transition-colors ${
                        isActive
                          ? 'bg-green-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Commission Detail Modal */}
      <CommissionDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        commission={selectedCommission}
      />
    </div>
  );
};

// Main component with providers
export const PartnerCommissionPage: React.FC<PartnerCommissionPageProps> = (props) => {
  return (
    <ToastProvider position="top-right" maxToasts={3}>
      <PartnerCommissionContent {...props} />
    </ToastProvider>
  );
};