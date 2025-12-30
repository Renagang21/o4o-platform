/**
 * GlucoseView Connection List Page
 *
 * Phase C-3: GlucoseView Admin Integration
 * Pharmacy-Vendor connection status management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGTag,
} from '@o4o/ui';
import {
  Link2,
  RefreshCw,
  AlertCircle,
  Building2,
  Plug,
  CheckCircle,
  XCircle,
  Clock,
  Pause,
} from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  code: string;
}

interface Connection {
  id: string;
  pharmacy_id?: string;
  pharmacy_name?: string;
  vendor_id: string;
  vendor?: Vendor;
  status: 'pending' | 'active' | 'suspended' | 'disconnected';
  connected_at?: string;
  last_verified_at?: string;
  notes?: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface ConnectionListResponse {
  data: Connection[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

const statusLabels: Record<string, string> = {
  pending: '대기 중',
  active: '연결됨',
  suspended: '일시 중지',
  disconnected: '연결 해제',
};

const statusColors: Record<string, 'yellow' | 'green' | 'gray' | 'red'> = {
  pending: 'yellow',
  active: 'green',
  suspended: 'gray',
  disconnected: 'red',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4" />,
  active: <CheckCircle className="w-4 h-4" />,
  suspended: <Pause className="w-4 h-4" />,
  disconnected: <XCircle className="w-4 h-4" />,
};

const ConnectionListPage: React.FC = () => {
  const api = authClient.api;
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/v1/glucoseview/admin/connections?limit=100';
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      const response = await api.get<ConnectionListResponse>(url);
      if (response.data) {
        setConnections(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch connections:', err);
      setError(err.message || '연동 목록을 불러오는데 실패했습니다.');
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleStatusChange = async (connectionId: string, newStatus: string) => {
    setUpdating(connectionId);
    try {
      await api.patch(`/api/v1/glucoseview/admin/connections/${connectionId}/status`, {
        status: newStatus,
      });
      // Refresh list
      fetchConnections();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert('상태 변경에 실패했습니다.');
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AGPageHeader
        title="Connections"
        description="약국-제조사 연동 상태 관리"
        icon={<Link2 className="w-5 h-5" />}
        actions={
          <AGButton
            variant="ghost"
            size="sm"
            onClick={fetchConnections}
            iconLeft={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            새로고침
          </AGButton>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-700">
            연동 상태는 약국이 어떤 CGM 제조사와 연결되어 있는지 추적합니다.
            이 정보는 메타데이터이며 실제 CGM 데이터를 저장하지 않습니다.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === ''
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          {['active', 'pending', 'suspended', 'disconnected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                statusFilter === status
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {statusIcons[status]}
              {statusLabels[status]}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 <span className="font-medium">{connections.length}</span>개 연동
          </p>
        </div>

        {/* Connection List */}
        <AGSection>
          {connections.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Link2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>등록된 연동이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <AGCard key={connection.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {connection.pharmacy_name || '(약국 미지정)'}
                          </span>
                        </div>
                        <Plug className="w-4 h-4 text-gray-300" />
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-blue-600">
                            {connection.vendor?.name || connection.vendor_id}
                          </span>
                        </div>
                        <AGTag
                          color={statusColors[connection.status]}
                          size="sm"
                        >
                          {statusLabels[connection.status]}
                        </AGTag>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span>
                          생성: {formatDate(connection.created_at)}
                        </span>
                        {connection.connected_at && (
                          <span>
                            연결: {formatDate(connection.connected_at)}
                          </span>
                        )}
                        {connection.last_verified_at && (
                          <span>
                            확인: {formatDate(connection.last_verified_at)}
                          </span>
                        )}
                      </div>

                      {connection.notes && (
                        <p className="mt-2 text-sm text-gray-400">
                          {connection.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 ml-4">
                      {connection.status !== 'active' && (
                        <AGButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(connection.id, 'active')}
                          disabled={updating === connection.id}
                          iconLeft={<CheckCircle className="w-4 h-4 text-green-500" />}
                        >
                          연결
                        </AGButton>
                      )}
                      {connection.status === 'active' && (
                        <AGButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(connection.id, 'suspended')}
                          disabled={updating === connection.id}
                          iconLeft={<Pause className="w-4 h-4 text-yellow-500" />}
                        >
                          일시 중지
                        </AGButton>
                      )}
                      {connection.status !== 'disconnected' && (
                        <AGButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(connection.id, 'disconnected')}
                          disabled={updating === connection.id}
                          iconLeft={<XCircle className="w-4 h-4 text-red-500" />}
                        >
                          해제
                        </AGButton>
                      )}
                    </div>
                  </div>
                </AGCard>
              ))}
            </div>
          )}
        </AGSection>
      </div>
    </div>
  );
};

export default ConnectionListPage;
