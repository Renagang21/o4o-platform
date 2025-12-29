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
  Settings,
} from 'lucide-react';
import { erpConnectorAPI, ErpTransmission } from '../../api/erp-connector';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';

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

  const headerActions = [
    { id: 'screen-options', label: 'Screen Options', icon: <Settings className="w-4 h-4" />, onClick: () => {}, variant: 'secondary' as const },
    { id: 'back', label: '상태 보기', icon: <ArrowLeft className="w-4 h-4" />, onClick: () => window.location.href = '/dropshipping/erp-status', variant: 'secondary' as const },
    { id: 'refresh', label: '새로고침', icon: <RefreshCw className="w-4 h-4" />, onClick: fetchTransmissions, variant: 'primary' as const },
  ];

  const columns: Column<ErpTransmission>[] = [
    {
      key: 'eventType',
      title: '이벤트 유형',
      dataIndex: 'eventType',
      render: (value: string) => getEventTypeBadge(value),
    },
    {
      key: 'voucherType',
      title: '전표 유형',
      dataIndex: 'voucherType',
      render: (value: string) => getVoucherTypeBadge(value),
    },
    {
      key: 'batchNumber',
      title: '배치번호',
      dataIndex: 'batchNumber',
      render: (value: string) => (
        <span className="font-mono text-sm">{value || '-'}</span>
      ),
    },
    {
      key: 'supplier',
      title: '공급사',
      render: (_: unknown, record: ErpTransmission) => (
        <div className="text-sm">
          <p className="font-medium">{record.supplierName || '-'}</p>
          <p className="text-gray-500">{record.supplierCode}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      title: '금액',
      dataIndex: 'amount',
      align: 'right' as const,
      render: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      key: 'status',
      title: '상태',
      dataIndex: 'status',
      align: 'center' as const,
      render: (value: string, record: ErpTransmission) => (
        <div>
          {getStatusBadge(value)}
          {value === 'FAILURE' && record.errorMessage && (
            <p className="text-xs text-red-600 mt-1 truncate" title={record.errorMessage}>
              {record.errorMessage}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'voucherNo',
      title: '전표번호',
      dataIndex: 'voucherNo',
      render: (value: string) => value ? (
        <span className="font-mono text-sm text-green-700">{value}</span>
      ) : (
        <span className="text-gray-400">-</span>
      ),
    },
    {
      key: 'createdAt',
      title: '일시',
      dataIndex: 'createdAt',
      render: (value: string) => (
        <span className="text-sm text-gray-500">{formatDateTime(value)}</span>
      ),
    },
    {
      key: 'actions',
      title: '액션',
      align: 'center' as const,
      render: (_: unknown, record: ErpTransmission) => (
        record.status === 'FAILURE' ? (
          <button
            onClick={() => handleRetry(record.id)}
            disabled={retrying === record.id}
            className="p-1 text-wordpress-blue hover:bg-blue-50 rounded transition disabled:opacity-50"
            title="재시도"
          >
            <RotateCcw className={`w-4 h-4 ${retrying === record.id ? 'animate-spin' : ''}`} />
          </button>
        ) : null
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="ERP 전송 내역"
        subtitle="ERP로 전송된 전표 내역을 확인합니다"
        actions={headerActions}
      />

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

      {/* DataTable */}
      <DataTable<ErpTransmission>
        columns={columns}
        data={transmissions}
        loading={loading}
        emptyMessage="전송 내역이 없습니다"
      />
    </div>
  );
};

export default ErpTransmissionHistory;
