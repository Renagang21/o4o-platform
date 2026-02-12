/**
 * Dropshipping Settlements Page
 *
 * Refactored: PageHeader pattern applied (Master-Detail layout - DataTable not applicable)
 */

import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Clock, CheckCircle, CreditCard, Building, RefreshCw, Settings } from 'lucide-react';
import { dropshippingAPI } from '../../api/dropshipping-cpt';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';

interface Settlement {
  id: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  meta_data: {
    settlement_type?: 'seller' | 'partner';
    order_id?: string;
    seller_id?: string;
    seller_name?: string;
    partner_id?: string;
    partner_name?: string;
    order_amount?: number;
    total_sales?: number;
    shipping_fee?: number;
    total_amount?: number;
    commission_rate: number;
    commission_amount: number;
    settlement_amount: number;
    settlement_status: 'pending' | 'settled' | 'hold';
    settlement_date?: string;
    payment_method?: string;
    payment_status?: string;
    bank_name: string;
    account_number: string;
    account_holder: string;
  };
}

const Settlements: React.FC = () => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchSettlements();
  }, [filterStatus, filterType]);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const response = await dropshippingAPI.getSettlements(filterStatus, filterType);
      if (response.success) {
        setSettlements(response.data);
      }
    } catch (error) {
      toast.error('정산 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const updateSettlementStatus = async (settlementId: string, newStatus: string) => {
    try {
      const response = await dropshippingAPI.updateSettlementStatus(settlementId, newStatus);
      if (response.success) {
        toast.success('정산 상태가 업데이트되었습니다');
        fetchSettlements();
      }
    } catch (error) {
      toast.error('정산 상태 업데이트에 실패했습니다');
    }
  };

  const processSettlement = async (settlementId: string) => {
    if (!confirm('정산을 처리하시겠습니까?')) return;
    
    try {
      const response = await dropshippingAPI.processSettlement(settlementId);
      if (response.success) {
        toast.success('정산이 처리되었습니다');
        fetchSettlements();
      }
    } catch (error) {
      toast.error('정산 처리에 실패했습니다');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: '대기중' },
      settled: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: '정산완료' },
      hold: { color: 'bg-red-100 text-red-800', icon: Clock, text: '보류' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    if (type === 'partner') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          파트너
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        판매자
      </span>
    );
  };

  const viewSettlementDetails = (settlement: Settlement) => {
    setSelectedSettlement(settlement);
    setShowDetails(true);
  };

  // 통계 계산
  const stats = {
    total: settlements.length,
    totalAmount: settlements.reduce((sum, s) => sum + (s.meta_data.settlement_amount || 0), 0),
    totalCommission: settlements.reduce((sum, s) => sum + (s.meta_data.commission_amount || 0), 0),
    pending: settlements.filter(s => s.meta_data.settlement_status === 'pending').length,
    settled: settlements.filter(s => s.meta_data.settlement_status === 'settled').length,
    hold: settlements.filter(s => s.meta_data.settlement_status === 'hold').length
  };

  if (showDetails && selectedSettlement) {
    return (
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-normal text-gray-900">정산 상세 - {selectedSettlement.title}</h1>
          <button
            onClick={() => {
              setShowDetails(false);
              setSelectedSettlement(null);
            }}
            className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            목록으로
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Settlement Details */}
            <div className="bg-white border border-gray-300 rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">정산 정보</h2>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-600">정산 유형</dt>
                  <dd className="mt-1">{getTypeBadge(selectedSettlement.meta_data.settlement_type || 'seller')}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">정산 상태</dt>
                  <dd className="mt-1">{getStatusBadge(selectedSettlement.meta_data.settlement_status)}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">{selectedSettlement.meta_data.settlement_type === 'partner' ? '파트너명' : '판매자명'}</dt>
                  <dd className="font-medium">{selectedSettlement.meta_data.seller_name || selectedSettlement.meta_data.partner_name}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">수수료율</dt>
                  <dd>{selectedSettlement.meta_data.commission_rate}%</dd>
                </div>
                <div>
                  <dt className="text-gray-600">주문 금액</dt>
                  <dd className="font-medium">{formatCurrency(selectedSettlement.meta_data.order_amount || selectedSettlement.meta_data.total_sales || 0)}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">수수료</dt>
                  <dd className="text-red-600">{formatCurrency(selectedSettlement.meta_data.commission_amount)}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">정산 금액</dt>
                  <dd className="text-lg font-bold text-blue-600">{formatCurrency(selectedSettlement.meta_data.settlement_amount)}</dd>
                </div>
                {selectedSettlement.meta_data.settlement_date && (
                  <div>
                    <dt className="text-gray-600">정산일</dt>
                    <dd>{new Date(selectedSettlement.meta_data.settlement_date).toLocaleDateString('ko-KR')}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div>
            {/* Bank Info */}
            <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium mb-4">계좌 정보</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-600">은행명</dt>
                  <dd className="font-medium">{selectedSettlement.meta_data.bank_name}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">계좌번호</dt>
                  <dd className="font-mono">{selectedSettlement.meta_data.account_number}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">예금주</dt>
                  <dd>{selectedSettlement.meta_data.account_holder}</dd>
                </div>
              </dl>
            </div>

            {/* Actions */}
            <div className="bg-white border border-gray-300 rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">정산 처리</h2>
              {selectedSettlement.meta_data.settlement_status === 'pending' && (
                <button
                  onClick={() => processSettlement(selectedSettlement.id)}
                  className="w-full px-4 py-2 bg-o4o-blue text-white rounded hover:bg-o4o-blue-hover"
                >
                  정산 처리하기
                </button>
              )}
              {selectedSettlement.meta_data.settlement_status === 'settled' && (
                <div className="text-center text-green-600">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                  <p>정산 완료됨</p>
                </div>
              )}
              {selectedSettlement.meta_data.settlement_status === 'hold' && (
                <div className="space-y-2">
                  <p className="text-sm text-red-600 mb-3">보류 상태입니다</p>
                  <button
                    onClick={() => updateSettlementStatus(selectedSettlement.id, 'pending')}
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    보류 해제
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PageHeader actions
  const headerActions = [
    {
      id: 'screen-options',
      label: 'Screen Options',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => {
        // TODO: Implement screen options
      },
      variant: 'secondary' as const,
    },
    {
      id: 'refresh',
      label: '새로고침',
      icon: <RefreshCw className="w-4 h-4" />,
      onClick: fetchSettlements,
      variant: 'secondary' as const,
    },
    {
      id: 'bulk-settle',
      label: '일괄 정산',
      icon: <DollarSign className="w-4 h-4" />,
      onClick: () => {
        // TODO: Implement bulk settlement
      },
      variant: 'primary' as const,
    },
  ];

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="정산 관리"
        subtitle="드롭쉬핑 정산 목록 및 상세"
        actions={headerActions}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">전체 정산</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <DollarSign className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">정산 금액</p>
              <p className="text-xl font-bold">{formatCurrency(stats.totalAmount)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">대기중</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">정산완료</p>
              <p className="text-2xl font-bold text-green-600">{stats.settled}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">총 수수료</p>
              <p className="text-xl font-bold">{formatCurrency(stats.totalCommission)}</p>
            </div>
            <CreditCard className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-300 rounded-t-lg p-3 flex justify-between items-center">
        <div className="flex gap-2">
          <select
            className="px-3 py-1 border border-gray-300 rounded text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">모든 유형</option>
            <option value="seller">판매자</option>
            <option value="partner">파트너</option>
          </select>
          <select
            className="px-3 py-1 border border-gray-300 rounded text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">모든 상태</option>
            <option value="pending">대기중</option>
            <option value="settled">정산완료</option>
            <option value="hold">보류</option>
          </select>
        </div>
        
        <div className="text-sm text-gray-600">
          총 {stats.total}개 정산
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-white border-x border-b border-gray-300 rounded-b-lg">
        <table className="w-full o4o-list-table widefat fixed striped">
          <thead>
            <tr>
              <th className="manage-column column-title column-primary">정산번호</th>
              <th className="manage-column">유형</th>
              <th className="manage-column">판매자/파트너</th>
              <th className="manage-column">주문금액</th>
              <th className="manage-column">수수료율</th>
              <th className="manage-column">수수료</th>
              <th className="manage-column">정산금액</th>
              <th className="manage-column">은행</th>
              <th className="manage-column">상태</th>
              <th className="manage-column">정산일</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-4">
                  로딩중...
                </td>
              </tr>
            ) : settlements.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-4">
                  정산 내역이 없습니다
                </td>
              </tr>
            ) : (
              settlements?.map((settlement) => (
                <tr key={settlement.id}>
                  <td className="title column-title column-primary page-title">
                    <strong>
                      <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); viewSettlementDetails(settlement); }}
                        className="row-title"
                      >
                        {settlement.title}
                      </a>
                    </strong>
                    <div className="row-actions">
                      <span className="view">
                        <a href="#" onClick={(e) => { e.preventDefault(); viewSettlementDetails(settlement); }}>
                          상세보기
                        </a>
                      </span>
                      {settlement.meta_data.settlement_status === 'pending' && (
                        <>
                          {' | '}
                          <span className="edit">
                            <a href="#" onClick={(e) => { e.preventDefault(); processSettlement(settlement.id); }}>
                              정산처리
                            </a>
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td>{getTypeBadge(settlement.meta_data.settlement_type || 'seller')}</td>
                  <td>{settlement.meta_data.seller_name || settlement.meta_data.partner_name}</td>
                  <td>{formatCurrency(settlement.meta_data.order_amount || settlement.meta_data.total_sales || 0)}</td>
                  <td className="text-center">{settlement.meta_data.commission_rate}%</td>
                  <td className="text-red-600">{formatCurrency(settlement.meta_data.commission_amount)}</td>
                  <td className="font-medium">{formatCurrency(settlement.meta_data.settlement_amount)}</td>
                  <td className="text-sm">{settlement.meta_data.bank_name}</td>
                  <td>{getStatusBadge(settlement.meta_data.settlement_status)}</td>
                  <td className="date column-date">
                    {settlement.meta_data.settlement_date ? (
                      <abbr title={new Date(settlement.meta_data.settlement_date).toLocaleString('ko-KR')}>
                        {new Date(settlement.meta_data.settlement_date).toLocaleDateString('ko-KR')}
                      </abbr>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Settlements;