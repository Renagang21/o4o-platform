/**
 * Admin Settlement Detail Page
 * Phase SETTLE-ADMIN: Admin 정산 관리 대시보드 - 상세 페이지
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import type { AdminSettlementDetail, SettlementStatus, SettlementItem } from '../../../types/settlement';
import { adminSettlementApi } from '../../../services/api/settlementApi';

export const AdminSettlementDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [settlement, setSettlement] = useState<AdminSettlementDetail | null>(null);
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
      const response = await adminSettlementApi.fetchSettlementDetail(id);
      if (response.success) {
        setSettlement(response.data);
        setMemoText((response.data as any).memoInternal || (response.data as any).memo_internal || '');
      }
    } catch (err: any) {
      console.error('정산 상세 정보 조회 실패:', err);
      setError(err.message || '정산 상세 정보를 불러올 수 없습니다.');
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

  // Phase SETTLE-ADMIN: PD-5 compatible formatting
  const formatCurrency = (amount: number | string | undefined | null, currency: string = 'KRW') => {
    const value = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    if (currency === 'KRW' || !currency) {
      return `₩ ${value.toLocaleString()}`;
    }
    return `${value.toLocaleString()} ${currency}`;
  };

  const formatDate = (dateString: string | Date | undefined | null) => {
    if (!dateString) return '-';
    const dateStr = typeof dateString === 'string' ? dateString : dateString.toISOString();
    return dateStr.split('T')[0];
  };

  const formatCommissionType = (type: string | undefined) => {
    if (!type) return '-';
    return type === 'rate' ? '비율형' : type === 'fixed' ? '고정형' : type;
  };

  const formatCommissionRate = (rate: number | string | undefined) => {
    if (rate === undefined || rate === null) return '-';
    const value = typeof rate === 'string' ? parseFloat(rate) : rate;
    return (value * 100).toFixed(2) + '%';
  };

  // Status badge
  const getStatusBadge = (status: SettlementStatus) => {
    const normalizedStatus = status.toLowerCase();

    const badges: Record<string, JSX.Element> = {
      pending: <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">정산 준비중</span>,
      open: <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">정산 준비중</span>,
      processing: <span className="px-3 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-800">지급 진행중</span>,
      pending_payout: <span className="px-3 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-800">지급 대기</span>,
      paid: <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">지급 완료</span>,
      cancelled: <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">취소됨</span>,
      draft: <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-600">임시</span>,
    };

    return badges[normalizedStatus] || <span className="px-3 py-1 rounded-full bg-gray-100">{status}</span>;
  };

  // PartyType label
  const getPartyTypeLabel = (partyType: string) => {
    const labels: Record<string, string> = {
      seller: '판매자',
      supplier: '공급사',
      platform: '플랫폼',
    };
    return labels[partyType] || partyType;
  };

  // 메모 저장 핸들러
  const handleSaveMemo = async () => {
    if (!id || !settlement) return;

    setSavingMemo(true);

    try {
      const response = await adminSettlementApi.updateMemo(id, memoText);

      if (response.success) {
        alert(response.message || '메모가 저장되었습니다.');
        if (response.data) {
          setSettlement(response.data);
        }
        setEditingMemo(false);
      } else {
        alert(response.message || '메모 저장에 실패했습니다.');
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
      <div className="p-12 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">정산 상세 정보를 불러올 수 없습니다</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          다시 시도
        </button>
      </div>
    );
  }

  if (!settlement) {
    return (
      <div className="p-12 text-center">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">정산 정보를 찾을 수 없습니다</h3>
        <p className="text-gray-600 mb-4">요청하신 정산 데이터가 존재하지 않습니다.</p>
        <button
          onClick={() => navigate('/admin/settlements')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-wordpress-blue text-white rounded hover:bg-wordpress-blue-hover transition-colors"
        >
          정산 목록으로 돌아가기
        </button>
      </div>
    );
  }

  const periodStart = (settlement as any).periodStart || (settlement as any).period_start;
  const periodEnd = (settlement as any).periodEnd || (settlement as any).period_end;
  const createdAt = (settlement as any).createdAt || (settlement as any).created_at;
  const updatedAt = (settlement as any).updatedAt || (settlement as any).updated_at;
  const paidAt = (settlement as any).paidAt || (settlement as any).paid_at;

  // 금액 데이터 (PD-5 + legacy 호환)
  const totalSaleAmount = (settlement as any).totalSaleAmount || (settlement as any).total_sale_amount;
  const totalBaseAmount = (settlement as any).totalBaseAmount || (settlement as any).total_base_amount || (settlement as any).total_supply_amount;
  const totalCommissionAmount = (settlement as any).totalCommissionAmount || (settlement as any).total_commission_amount;
  const totalMarginAmount = (settlement as any).totalMarginAmount || (settlement as any).total_margin_amount;
  const adjustmentAmount = (settlement as any).adjustmentAmount || (settlement as any).adjustment_amount || 0;
  const payableAmount = (settlement as any).payableAmount || (settlement as any).net_payout_amount;

  // 요약 지표
  const totalOrders = (settlement as any).totalOrders || (settlement as any).total_orders || 0;
  const totalItems = (settlement as any).totalItems || (settlement as any).total_items || 0;

  // Items (PD-5 items 또는 legacy lines)
  const items: SettlementItem[] = (settlement.items || settlement.lines || []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/admin/settlements')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          정산 목록으로 돌아가기
        </button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-normal text-gray-900">정산 상세</h1>
          <p className="text-sm text-gray-600 mt-1">
            {getPartyTypeLabel(settlement.partyType)} | 정산 기간: {formatDate(periodStart)} ~ {formatDate(periodEnd)}
          </p>
        </div>
        <div>{getStatusBadge(settlement.status)}</div>
      </div>

      <div className="space-y-6">
        {/* PD-2/SETTLE-1 Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                PD-5 정산 시스템 + SETTLE-1 커미션 통합
              </h3>
              <p className="text-sm text-blue-800">
                주문 생성 시점의 커미션 정책이 자동으로 스냅샷되어 정산 아이템에 포함됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 정산 요약 카드 */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">정산 요약</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">정산 ID</div>
              <div className="text-base font-mono text-gray-900">{settlement.id}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">대상 유형</div>
              <div className="text-base text-gray-900">{getPartyTypeLabel(settlement.partyType)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">대상 이름/ID</div>
              <div className="text-base font-medium text-gray-900">{settlement.partyName || settlement.partyId}</div>
              {settlement.partyName && <div className="text-xs text-gray-500 font-mono">{settlement.partyId}</div>}
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">정산 상태</div>
              <div>{getStatusBadge(settlement.status)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">생성일</div>
              <div className="text-base text-gray-900">{formatDate(createdAt)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">마지막 업데이트</div>
              <div className="text-base text-gray-900">{formatDate(updatedAt)}</div>
            </div>
            {paidAt && (
              <div>
                <div className="text-sm text-gray-600 mb-1">지급일</div>
                <div className="text-base text-green-600 font-medium">{formatDate(paidAt)}</div>
              </div>
            )}
          </div>

          {/* Financial Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-md font-medium mb-3">금액 상세</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {totalSaleAmount !== undefined && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">총 판매 금액</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(totalSaleAmount, settlement.currency)}
                  </div>
                </div>
              )}
              {totalBaseAmount !== undefined && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">총 공급 금액(기준가)</div>
                  <div className="text-2xl font-bold text-gray-700">
                    {formatCurrency(totalBaseAmount, settlement.currency)}
                  </div>
                </div>
              )}
              {totalCommissionAmount !== undefined && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">총 커미션</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(totalCommissionAmount, settlement.currency)}
                  </div>
                </div>
              )}
              {totalMarginAmount !== undefined && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">총 마진 금액</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(totalMarginAmount, settlement.currency)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">조정 금액</div>
                <div className={`text-xl font-bold ${adjustmentAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {adjustmentAmount >= 0 ? '+' : ''}
                  {formatCurrency(adjustmentAmount, settlement.currency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">최종 지급 예정 금액</div>
                <div className="text-xl font-bold text-blue-600">
                  {formatCurrency(payableAmount, settlement.currency)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 성과 요약 */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">성과 요약</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">총 주문 수</div>
              <div className="text-xl font-bold text-gray-900">{totalOrders.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">총 판매 수량</div>
              <div className="text-xl font-bold text-gray-900">{totalItems.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">평균 주문 금액</div>
              <div className="text-xl font-bold text-gray-900">
                {totalOrders > 0
                  ? formatCurrency(
                      (totalSaleAmount || payableAmount || 0) / totalOrders,
                      settlement.currency
                    )
                  : '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Settlement Items Table */}
        {items.length > 0 && (
          <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">정산 아이템 상세</h2>
              <p className="text-sm text-gray-600 mt-1">
                주문별 판매/공급 금액 및 커미션 정보를 표시합니다. (총 {items.length}개 아이템)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full o4o-list-table widefat">
                <thead>
                  <tr>
                    <th className="manage-column">주문번호</th>
                    <th className="manage-column">상품명</th>
                    <th className="manage-column">판매자/공급사</th>
                    <th className="manage-column text-right">수량</th>
                    <th className="manage-column text-right">판매가</th>
                    <th className="manage-column text-right">공급가</th>
                    <th className="manage-column text-center">커미션 타입</th>
                    <th className="manage-column text-right">커미션율</th>
                    <th className="manage-column text-right">커미션 금액</th>
                    <th className="manage-column text-right">정산 금액</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, index: number) => {
                    // PD-5 + legacy 호환
                    const orderNumber = item.orderNumber || item.order_number || item.orderId;
                    const productName = item.productName || item.product_name;
                    const sellerName = item.sellerName || item.seller_name;
                    const supplierName = item.supplierName || item.supplier_name;
                    const quantity = item.quantity || 0;
                    const salePrice = item.salePriceSnapshot || item.sale_price || 0;
                    const basePrice = item.basePriceSnapshot || item.supply_price || 0;
                    const commissionType = item.commissionType || item.commission_type;
                    const commissionRate = item.commissionRate || item.commission_rate;
                    const commissionAmount = item.commissionAmountSnapshot || item.commission_amount || 0;
                    const lineTotal =
                      item.totalSaleAmount ||
                      item.totalBaseAmount ||
                      item.lineTotal ||
                      item.line_total ||
                      item.line_revenue ||
                      0;

                    return (
                      <tr key={index}>
                        <td className="font-mono text-sm">{orderNumber}</td>
                        <td>
                          {productName}
                          {item.sku && <div className="text-xs text-gray-500">SKU: {item.sku}</div>}
                        </td>
                        <td className="text-sm">{sellerName || supplierName || '-'}</td>
                        <td className="text-right">{quantity.toLocaleString()}</td>
                        <td className="text-right">{formatCurrency(salePrice, settlement.currency)}</td>
                        <td className="text-right font-medium">{formatCurrency(basePrice, settlement.currency)}</td>
                        <td className="text-center text-sm">{formatCommissionType(commissionType)}</td>
                        <td className="text-right text-orange-600 font-medium">
                          {formatCommissionRate(commissionRate)}
                        </td>
                        <td className="text-right text-orange-600 font-medium">
                          {formatCurrency(commissionAmount, settlement.currency)}
                        </td>
                        <td className="text-right text-blue-600 font-bold">
                          {formatCurrency(lineTotal, settlement.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 내부 메모 */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">내부 메모 (Admin 전용)</h2>
            {!editingMemo && (
              <button
                onClick={() => setEditingMemo(true)}
                className="text-sm text-wordpress-blue hover:text-wordpress-blue-hover"
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
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-wordpress-blue focus:border-transparent resize-none"
                placeholder="정산 관련 메모를 입력하세요."
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSaveMemo}
                  disabled={savingMemo}
                  className="flex items-center gap-2 px-4 py-2 bg-wordpress-blue text-white rounded hover:bg-wordpress-blue-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {savingMemo ? '저장 중...' : '메모 저장'}
                </button>
                <button
                  onClick={() => {
                    setEditingMemo(false);
                    setMemoText(
                      (settlement as any).memoInternal || (settlement as any).memo_internal || ''
                    );
                  }}
                  disabled={savingMemo}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="text-gray-700 whitespace-pre-wrap">
              {(settlement as any).memoInternal || (settlement as any).memo_internal || '메모가 없습니다.'}
            </div>
          )}
        </div>

        {/* 상태 관리 액션 (SETTLE-2에서 확장 예정) */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">정산 관리</h2>
          <p className="text-sm text-gray-600 mb-4">
            정산 승인 및 지급 처리 기능은 Phase SETTLE-2에서 구현 예정입니다.
          </p>
          <div className="space-y-2">
            <div className="text-sm text-gray-700">
              <strong>현재 상태:</strong> {getStatusBadge(settlement.status)}
            </div>
            {paidAt && (
              <div className="text-sm text-gray-700">
                <strong>지급일:</strong> {formatDate(paidAt)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettlementDetailPage;
