/**
 * ERP Connector Status Page
 *
 * Phase 0: ERP 연계 상태 화면
 * - 연결 상태 표시 (연결됨/미연결)
 * - 마지막 동기화 시간 및 결과
 * - 미연결 시 안내 메시지
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  Database,
  List,
} from 'lucide-react';
import { erpConnectorAPI, ErpConnectionStatus } from '../../api/erp-connector';
import { toast } from 'react-hot-toast';

const ErpConnectorStatusPage: React.FC = () => {
  const [status, setStatus] = useState<ErpConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await erpConnectorAPI.getConnectionStatus();
      if (response.success) {
        setStatus(response.data);
      }
    } catch (error) {
      toast.error('ERP 연결 상태를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
    toast.success('상태를 새로고침했습니다');
  };

  // 개발용: Mock 연결 상태 토글
  const handleToggleMock = () => {
    const newState = erpConnectorAPI.toggleMockConnection();
    toast.success(newState ? 'Mock: 연결 상태로 변경' : 'Mock: 미연결 상태로 변경');
    fetchStatus();
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getTimeSince = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // 미연결 상태 화면
  if (!status?.connected) {
    return (
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-normal text-gray-900">ERP 연계 상태</h1>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1 bg-wordpress-blue text-white text-sm rounded hover:bg-wordpress-blue-hover transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 inline mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              새로고침
            </button>
            {/* 개발용 토글 버튼 */}
            <button
              onClick={handleToggleMock}
              className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition"
              title="개발용: Mock 상태 토글"
            >
              Mock 토글
            </button>
          </div>
        </div>

        {/* 미연결 상태 카드 */}
        <div className="bg-white border border-gray-300 rounded-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
            <Database className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">
            ERP 계정이 아직 연결되지 않았습니다
          </h2>
          <p className="text-gray-600 mb-6">
            Ecount ERP 연동을 시작하려면 관리자에게 문의하세요.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left max-w-md mx-auto">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">연동 요청 필요</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  ERP 연동을 위해서는 Ecount 계정 정보(Zone, 회사코드, API 키)가 필요합니다.
                  시스템 관리자에게 연동을 요청해 주세요.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 전송 내역 링크 (미연결 시에도 표시) */}
        <div className="mt-6 text-center">
          <Link
            to="/dropshipping/erp-transmissions"
            className="inline-flex items-center text-wordpress-blue hover:underline"
          >
            <List className="w-4 h-4 mr-1" />
            전송 내역 보기
          </Link>
        </div>
      </div>
    );
  }

  // 연결 상태 화면
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-normal text-gray-900">ERP 연계 상태</h1>
        <div className="flex gap-2">
          <Link
            to="/dropshipping/erp-transmissions"
            className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition"
          >
            <List className="w-4 h-4 inline mr-1" />
            전송 내역
          </Link>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-1 bg-wordpress-blue text-white text-sm rounded hover:bg-wordpress-blue-hover transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 inline mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          {/* 개발용 토글 버튼 */}
          <button
            onClick={handleToggleMock}
            className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition"
            title="개발용: Mock 상태 토글"
          >
            Mock 토글
          </button>
        </div>
      </div>

      {/* 상태 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* 연결 상태 */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-600">연결 상태</h2>
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <div className="flex items-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              연결됨
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            ERP 유형: <span className="font-medium text-gray-900">{status.erpType.toUpperCase()}</span>
          </p>
          {status.companyCode && (
            <p className="text-sm text-gray-500 mt-1">
              회사코드: <span className="font-medium text-gray-900">{status.companyCode}</span>
            </p>
          )}
        </div>

        {/* 마지막 동기화 */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-600">마지막 동기화</h2>
            <Clock className="w-6 h-6 text-gray-400" />
          </div>
          {status.lastSyncAt ? (
            <>
              <p className="text-xl font-bold text-gray-900">
                {getTimeSince(status.lastSyncAt)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {formatDateTime(status.lastSyncAt)}
              </p>
            </>
          ) : (
            <p className="text-gray-500">동기화 기록 없음</p>
          )}
        </div>

        {/* 마지막 결과 */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-600">마지막 결과</h2>
            {status.lastSyncResult === 'success' ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : status.lastSyncResult === 'failure' ? (
              <XCircle className="w-6 h-6 text-red-500" />
            ) : (
              <Clock className="w-6 h-6 text-gray-400" />
            )}
          </div>
          {status.lastSyncResult === 'success' ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              성공
            </span>
          ) : status.lastSyncResult === 'failure' ? (
            <>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                실패
              </span>
              {status.lastErrorMessage && (
                <p className="text-sm text-red-600 mt-2">{status.lastErrorMessage}</p>
              )}
            </>
          ) : (
            <p className="text-gray-500">결과 없음</p>
          )}
        </div>
      </div>

      {/* 안내 정보 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Database className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">Ecount ERP 연동 정보</h3>
            <p className="text-sm text-blue-700 mt-1">
              정산 마감(SETTLEMENT_CLOSED) 이벤트 발생 시 자동으로 매입/지급 전표가 생성됩니다.
              전송 내역에서 상세 결과를 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErpConnectorStatusPage;
