/**
 * ERP Transmission History Page
 *
 * Phase 0: ERP 전송 내역 목록 화면
 * - 이벤트 타입, 전표 유형, 금액, 상태 표시
 * - 상태별 필터링
 * - 실패 건 재시도 기능
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ArrowLeft,
  RotateCcw,
  FileText,
  CreditCard,
} from 'lucide-react';
import { erpConnectorAPI, ErpTransmission } from '../../api/erp-connector';
import { toast } from 'react-hot-toast';

const ErpTransmissionHistory: React.FC = () => {
  const [transmissions, setTransmissions] = useState<ErpTransmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEventType, setFilterEventType] = useState('');
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    fetchTransmissions();
  }, [filterStatus, filterEventType]);

  const fetchTransmissions = async () => {
    setLoading(true);
    try {
      const response = await erpConnectorAPI.getTransmissions({
        status: filterStatus || undefined,
        eventType: filterEventType || undefined,
      });
      if (response.success) {
        setTransmissions(response.data);
      }
    } catch (error) {
      toast.error('전송 내역을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (transmissionId: string) => {
    setRetrying(transmissionId);
    try {
      const response = await erpConnectorAPI.retryTransmission(transmissionId);
      if (response.success) {
        toast.success(response.message);
        fetchTransmissions();
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      toast.error('재시도 요청에 실패했습니다');
    } finally {
      setRetrying(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const config = {
      SUCCESS: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: '성공' },
      FAILURE: { color: 'bg-red-100 text-red-800', icon: XCircle, text: '실패' },
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: '대기중' },
    };

    const cfg = config[status as keyof typeof config] || config.PENDING;
    const Icon = cfg.icon;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {cfg.text}
      </span>
    );
  };

  const getEventTypeBadge = (eventType: string) => {
    const config: Record<string, { color: string; text: string }> = {
      SETTLEMENT_CLOSED: { color: 'bg-purple-100 text-purple-800', text: '정산마감' },
      ORDER_COMPLETED: { color: 'bg-blue-100 text-blue-800', text: '주문완료' },
      REFUND_PROCESSED: { color: 'bg-orange-100 text-orange-800', text: '환불처리' },
    };

    const cfg = config[eventType] || { color: 'bg-gray-100 text-gray-800', text: eventType };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}
      >
        {cfg.text}
      </span>
    );
  };

  const getVoucherTypeBadge = (voucherType: string) => {
    const config: Record<string, { icon: React.ElementType; text: string }> = {
      PURCHASE: { icon: FileText, text: '매입전표' },
      PAYMENT: { icon: CreditCard, text: '지급전표' },
      SALES: { icon: FileText, text: '매출전표' },
      RECEIPT: { icon: CreditCard, text: '입금전표' },
    };

    const cfg = config[voucherType] || { icon: FileText, text: voucherType };
    const Icon = cfg.icon;

    return (
      <span className="inline-flex items-center text-gray-700">
        <Icon className="w-4 h-4 mr-1" />
        {cfg.text}
      </span>
    );
  };

  // 통계 계산
  const stats = {
    total: transmissions.length,
    success: transmissions.filter((t) => t.status === 'SUCCESS').length,
    failure: transmissions.filter((t) => t.status === 'FAILURE').length,
    pending: transmissions.filter((t) => t.status === 'PENDING').length,
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/dropshipping/erp-status"
            className="text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-normal text-gray-900">ERP 전송 내역</h1>
        </div>
        <button
          onClick={fetchTransmissions}
          disabled={loading}
          className="px-3 py-1 bg-wordpress-blue text-white text-sm rounded hover:bg-wordpress-blue-hover transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 inline mr-1 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <p className="text-gray-600 text-sm">전체 전송</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <p className="text-gray-600 text-sm">성공</p>
          <p className="text-2xl font-bold text-green-600">{stats.success}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <p className="text-gray-600 text-sm">실패</p>
          <p className="text-2xl font-bold text-red-600">{stats.failure}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <p className="text-gray-600 text-sm">대기중</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-300 rounded-t-lg p-3 flex justify-between items-center">
        <div className="flex gap-2">
          <select
            className="px-3 py-1 border border-gray-300 rounded text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">모든 상태</option>
            <option value="SUCCESS">성공</option>
            <option value="FAILURE">실패</option>
            <option value="PENDING">대기중</option>
          </select>
          <select
            className="px-3 py-1 border border-gray-300 rounded text-sm"
            value={filterEventType}
            onChange={(e) => setFilterEventType(e.target.value)}
          >
            <option value="">모든 이벤트</option>
            <option value="SETTLEMENT_CLOSED">정산마감</option>
            <option value="ORDER_COMPLETED">주문완료</option>
            <option value="REFUND_PROCESSED">환불처리</option>
          </select>
        </div>
        <div className="text-sm text-gray-600">총 {stats.total}건</div>
      </div>

      {/* Transmissions Table */}
      <div className="bg-white border-x border-b border-gray-300 rounded-b-lg">
        <table className="w-full wp-list-table widefat fixed striped">
          <thead>
            <tr>
              <th className="manage-column column-primary" style={{ width: '15%' }}>
                이벤트 유형
              </th>
              <th className="manage-column" style={{ width: '12%' }}>
                전표 유형
              </th>
              <th className="manage-column" style={{ width: '12%' }}>
                배치번호
              </th>
              <th className="manage-column" style={{ width: '12%' }}>
                공급사
              </th>
              <th className="manage-column" style={{ width: '12%' }}>
                금액
              </th>
              <th className="manage-column" style={{ width: '10%' }}>
                상태
              </th>
              <th className="manage-column" style={{ width: '12%' }}>
                전표번호
              </th>
              <th className="manage-column" style={{ width: '10%' }}>
                일시
              </th>
              <th className="manage-column" style={{ width: '5%' }}>
                액션
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">로딩중...</p>
                </td>
              </tr>
            ) : transmissions.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-gray-300" />
                  <p className="text-gray-500 mt-2">전송 내역이 없습니다</p>
                </td>
              </tr>
            ) : (
              transmissions.map((tx) => (
                <tr key={tx.id}>
                  <td className="column-primary">{getEventTypeBadge(tx.eventType)}</td>
                  <td>{getVoucherTypeBadge(tx.voucherType)}</td>
                  <td>
                    <span className="font-mono text-sm">{tx.batchNumber || '-'}</span>
                  </td>
                  <td>
                    <div className="text-sm">
                      <p className="font-medium">{tx.supplierName || '-'}</p>
                      <p className="text-gray-500">{tx.supplierCode}</p>
                    </div>
                  </td>
                  <td className="font-medium">{formatCurrency(tx.amount)}</td>
                  <td>
                    {getStatusBadge(tx.status)}
                    {tx.status === 'FAILURE' && tx.errorMessage && (
                      <p
                        className="text-xs text-red-600 mt-1 truncate"
                        title={tx.errorMessage}
                      >
                        {tx.errorMessage}
                      </p>
                    )}
                  </td>
                  <td>
                    {tx.voucherNo ? (
                      <span className="font-mono text-sm text-green-700">{tx.voucherNo}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="text-sm text-gray-500">{formatDateTime(tx.createdAt)}</td>
                  <td>
                    {tx.status === 'FAILURE' && (
                      <button
                        onClick={() => handleRetry(tx.id)}
                        disabled={retrying === tx.id}
                        className="p-1 text-wordpress-blue hover:bg-blue-50 rounded transition disabled:opacity-50"
                        title="재시도"
                      >
                        <RotateCcw
                          className={`w-4 h-4 ${retrying === tx.id ? 'animate-spin' : ''}`}
                        />
                      </button>
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

export default ErpTransmissionHistory;
