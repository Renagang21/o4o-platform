/**
 * Seller Settlement Detail Page
 * Phase 4-1 Step 2: 판매자 정산 상세 페이지
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { ArrowLeft, Save, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import type { SellerSettlementDetail, SettlementStatus } from '../../types/settlement';
import { sellerSettlementAPI } from '../../services/sellerSettlementApi';
import { handleApiError } from '../../utils/apiErrorHandler';

export const SellerSettlementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [settlement, setSettlement] = useState<SellerSettlementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 메모 편집 상태
  const [editingMemo, setEditingMemo] = useState(false);
  const [memoText, setMemoText] = useState('');
  const [savingMemo, setSavingMemo] = useState(false);

  // 정산 상세 조회
  const fetchSettlementDetail = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await sellerSettlementAPI.fetchSellerSettlementDetail(id);
      if (response.success) {
        setSettlement(response.data);
        // Support both PD-5 'notes' and legacy 'memo_internal'
        setMemoText(response.data.notes || response.data.memo_internal || '');
      }
    } catch (err) {
      const errorMessage = handleApiError(err, '정산 상세 정보');
      setError(errorMessage);
      setSettlement(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchSettlementDetail();
  };

  useEffect(() => {
    fetchSettlementDetail();
  }, [id]);

  // 상태 배지 (PD-5 + legacy status support)
  const getStatusBadge = (status: SettlementStatus | string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
      case 'open':
        return (
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
            정산 준비중
          </span>
        );
      case 'processing':
      case 'pending_payout':
        return (
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-800">
            지급 대기
          </span>
        );
      case 'paid':
        return (
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
            지급 완료
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
            취소됨
          </span>
        );
      case 'draft':
        return (
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-600">
            임시
          </span>
        );
      default:
        return null;
    }
  };

  // 금액 포맷 (PD-5 string amounts + legacy number support)
  const formatCurrency = (amount: number | string | undefined | null, currency: string = 'KRW') => {
    const value = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    if (currency === 'KRW' || !currency) {
      return `₩ ${value.toLocaleString()}`;
    }
    return `${value.toLocaleString()} ${currency}`;
  };

  // 날짜 포맷
  const formatDate = (dateString: string | Date | undefined | null) => {
    if (!dateString) return '-';
    const dateStr = typeof dateString === 'string' ? dateString : dateString.toISOString();
    return dateStr.split('T')[0];
  };

  // 마진율 포맷
  const formatMarginRate = (rate: number | string): string => {
    const value = typeof rate === 'string' ? parseFloat(rate) : rate;
    return (value * 100).toFixed(2) + '%';
  };

  // Phase SETTLE-1: 커미션 타입 표시
  const formatCommissionType = (type: 'rate' | 'fixed' | undefined | null): string => {
    if (!type) return '-';
    return type === 'rate' ? '비율 기반' : '고정 금액';
  };

  // Phase SETTLE-1: 커미션율 표시 (0-1 → percentage)
  const formatCommissionRate = (rate: string | number | undefined | null): string => {
    if (!rate) return '-';
    const value = typeof rate === 'string' ? parseFloat(rate) : rate;
    return (value * 100).toFixed(2) + '%';
  };

  // 상태 변경 가능 여부 확인 (PD-5 + legacy support)
  const getAvailableTransitions = (currentStatus: SettlementStatus | string): SettlementStatus[] => {
    const normalizedStatus = currentStatus.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
      case 'open':
        return ['processing', 'cancelled'];
      case 'processing':
      case 'pending_payout':
        return ['paid', 'cancelled'];
      case 'paid':
      case 'cancelled':
      case 'draft':
        return [];
      default:
        return [];
    }
  };

  // 상태 변경 핸들러
  const handleStatusChange = async (newStatus: SettlementStatus) => {
    if (!id || !settlement) return;

    const confirmMessage =
      newStatus === 'CANCELLED'
        ? '정산을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
        : `정산 상태를 "${getStatusLabel(newStatus)}"(으)로 변경하시겠습니까?`;

    if (!confirm(confirmMessage)) return;

    try {
      const response = await sellerSettlementAPI.updateSellerSettlementStatus(id, {
        status: newStatus,
      });

      if (response.success) {
        alert(response.message || '정산 상태가 업데이트되었습니다.');
        fetchSettlementDetail();
      }
    } catch (err: any) {
      console.error('정산 상태 변경 실패:', err);
      alert(err.message || '정산 상태 변경에 실패했습니다.');
    }
  };

  // 상태 레이블 (PD-5 + legacy support)
  const getStatusLabel = (status: SettlementStatus | string): string => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
      case 'open':
        return '정산 준비중';
      case 'processing':
      case 'pending_payout':
        return '지급 대기';
      case 'paid':
        return '지급 완료';
      case 'cancelled':
        return '취소됨';
      case 'draft':
        return '임시';
      default:
        return status;
    }
  };

  // 메모 저장 핸들러
  const handleSaveMemo = async () => {
    if (!id || !settlement) return;

    setSavingMemo(true);

    try {
      const response = await sellerSettlementAPI.updateSellerSettlementMemo(id, {
        memo_internal: memoText,
      });

      if (response.success) {
        alert(response.message || '메모가 저장되었습니다.');
        setSettlement(response.data);
        setEditingMemo(false);
      }
    } catch (err: any) {
      console.error('메모 저장 실패:', err);
      alert(err.message || '메모 저장에 실패했습니다.');
    } finally {
      setSavingMemo(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500">데이터를 불러오는 중입니다...</div>
    );
  }

  if (error) {
    return (
      <div className="p-12">
        <EmptyState
          icon={<AlertCircle className="w-16 h-16 text-red-400" />}
          title="정산 상세 정보를 불러올 수 없습니다"
          description={error}
          action={
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              다시 시도
            </button>
          }
        />
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="p-12">
        <EmptyState
          icon={<FileText className="w-16 h-16 text-gray-400" />}
          title="정산 정보를 찾을 수 없습니다"
          description="요청하신 정산 데이터가 존재하지 않습니다."
          action={
            <button
              onClick={() => navigate('/dashboard/seller/settlements')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              정산 목록으로 돌아가기
            </button>
          }
        />
      </div>
    );
  }

  const availableTransitions = getAvailableTransitions(settlement.status);

  return (
    <>
      <Breadcrumb
        items={[
          { label: '판매자 대시보드', href: '/dashboard/seller' },
          { label: '정산', href: '/dashboard/seller/settlements' },
          {
            label: `${formatDate(settlement.period_start)} ~ ${formatDate(settlement.period_end)}`,
            isCurrent: true,
          },
        ]}
      />

      <div className="mb-4">
        <button
          onClick={() => navigate('/dashboard/seller/settlements')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          정산 목록으로 돌아가기
        </button>
      </div>

      <PageHeader
        title="정산 상세"
        subtitle={`정산 기간: ${formatDate(settlement.periodStart || settlement.period_start)} ~ ${formatDate(settlement.periodEnd || settlement.period_end)}`}
      >
        {getStatusBadge(settlement.status)}
      </PageHeader>

      <div className="space-y-6">
        {/* 정산 요약 카드 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">정산 요약</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">정산 ID</div>
              <div className="text-base font-mono text-gray-900">{settlement.id}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">정산 상태</div>
              <div>{getStatusBadge(settlement.status)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">생성일</div>
              <div className="text-base text-gray-900">{formatDate(settlement.createdAt || settlement.created_at)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">마지막 업데이트</div>
              <div className="text-base text-gray-900">{formatDate(settlement.updatedAt || settlement.updated_at)}</div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">총 매출</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(settlement.totalSaleAmount || settlement.total_revenue, settlement.currency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">총 공급가</div>
                <div className="text-2xl font-bold text-gray-700">
                  {formatCurrency(settlement.totalBaseAmount || settlement.total_cost || 0, settlement.currency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">총 커미션</div>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(settlement.totalCommissionAmount || 0, settlement.currency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">총 마진</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(settlement.totalMarginAmount || settlement.total_margin_amount || 0, settlement.currency)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">최종 지급 예정 금액</div>
                <div className="text-xl font-bold text-blue-600">
                  {formatCurrency(settlement.payableAmount || settlement.net_payout_amount, settlement.currency)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {settlement.partyType === 'seller' || settlement.role === 'seller'
                    ? '마진 - 커미션'
                    : '지급 금액'}
                </p>
              </div>
              {settlement.average_margin_rate && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">평균 마진율</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatMarginRate(settlement.average_margin_rate)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 성과 요약 */}
        {(settlement.total_orders || settlement.total_items) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">성과 요약</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">포함된 아이템 수</div>
                <div className="text-xl font-bold text-gray-900">
                  {((settlement.items?.length) || (settlement.lines?.length) || (settlement.total_items) || 0).toLocaleString()}개
                </div>
              </div>
              {settlement.total_orders && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">포함된 주문 수</div>
                  <div className="text-xl font-bold text-gray-900">
                    {settlement.total_orders.toLocaleString()}건
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-600 mb-1">총 매출</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(settlement.totalSaleAmount || settlement.total_revenue, settlement.currency)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase SETTLE-1: Commission Integration Info */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>PD-2 커미션 정책 통합:</strong> 각 정산 아이템에는 주문 생성 시점의 커미션 정책(커미션 타입 및 요율)이 기록됩니다.
                이는 정산 투명성과 감사 추적성을 위한 것입니다.
              </p>
            </div>
          </div>
        </div>

        {/* Phase SETTLE-1: Settlement Items with Commission Data */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">정산 아이템 상세</h2>
            <p className="text-sm text-gray-500 mt-1">
              주문별 상품 아이템과 커미션 정책 정보
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상품명
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    수량
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    판매가 (단가)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    공급가 (단가)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    총 매출
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    커미션 타입
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    커미션율
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    커미션 금액
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    마진 금액
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Support both PD-5 items and legacy lines */}
                {(settlement.items || settlement.lines || []).map((item: any, index: number) => {
                  // PD-5 structure
                  const productName = item.productName || item.product_name;
                  const quantity = item.quantity;
                  const salePrice = item.salePriceSnapshot || item.sale_price;
                  const basePrice = item.basePriceSnapshot || item.supply_price;
                  const totalSaleAmount = item.totalSaleAmount || item.line_revenue || (typeof salePrice === 'number' ? salePrice * quantity : parseFloat(salePrice || '0') * quantity);
                  const commissionType = item.commissionType;
                  const commissionRate = item.commissionRate;
                  const commissionAmount = item.commissionAmountSnapshot;
                  const marginAmount = item.marginAmountSnapshot || item.line_margin_amount;

                  return (
                    <tr key={item.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(salePrice, settlement.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        {basePrice ? formatCurrency(basePrice, settlement.currency) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(totalSaleAmount, settlement.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                        {formatCommissionType(commissionType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                        {formatCommissionRate(commissionRate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 text-right font-medium">
                        {commissionAmount ? formatCurrency(commissionAmount, settlement.currency) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-medium">
                        {marginAmount ? formatCurrency(marginAmount, settlement.currency) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 내부 메모 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">내부 메모</h2>
            {!editingMemo && (
              <button
                onClick={() => setEditingMemo(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                편집
              </button>
            )}
          </div>
          {editingMemo ? (
            <div>
              <textarea
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="정산 관련 메모를 입력하세요."
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSaveMemo}
                  disabled={savingMemo}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {savingMemo ? '저장 중...' : '메모 저장'}
                </button>
                <button
                  onClick={() => {
                    setEditingMemo(false);
                    setMemoText(settlement.notes || settlement.memo_internal || '');
                  }}
                  disabled={savingMemo}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="text-gray-700 whitespace-pre-wrap">
              {settlement.notes || settlement.memo_internal || '메모가 없습니다.'}
            </div>
          )}
        </div>

        {/* 상태 변경 액션 */}
        {availableTransitions.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">상태 변경</h2>
            <div className="flex flex-wrap gap-3">
              {availableTransitions.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    status === 'CANCELLED'
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {status === 'PENDING_PAYOUT' && '지급 대기 상태로 변경'}
                  {status === 'PAID' && '지급 완료 처리'}
                  {status === 'CANCELLED' && '정산 취소'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SellerSettlementDetailPage;
