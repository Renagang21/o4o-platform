/**
 * GlucoseView Vendor List Page
 *
 * Phase C-3: GlucoseView Admin Integration
 * CGM vendor management (metadata only, no raw CGM data)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGTag,
} from '@o4o/ui';
import {
  Building2,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Cpu,
} from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  code: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  supported_devices: string[];
  integration_type: string;
  status: 'active' | 'inactive' | 'planned';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface VendorListResponse {
  data: Vendor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

const statusLabels: Record<string, string> = {
  active: '지원 중',
  inactive: '지원 중단',
  planned: '예정',
};

const statusColors: Record<string, 'green' | 'gray' | 'blue'> = {
  active: 'green',
  inactive: 'gray',
  planned: 'blue',
};

const integrationLabels: Record<string, string> = {
  api: 'API 연동',
  manual: '수동 입력',
  file_import: '파일 가져오기',
};

const VendorListPage: React.FC = () => {
  const api = authClient.api;
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/v1/glucoseview/admin/vendors?limit=100';
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      const response = await api.get<VendorListResponse>(url);
      if (response.data) {
        setVendors(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch vendors:', err);
      setError(err.message || '제조사 목록을 불러오는데 실패했습니다.');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AGPageHeader
        title="CGM Vendors"
        description="연속 혈당 측정기 제조사 관리"
        icon={<Building2 className="w-5 h-5" />}
        actions={
          <AGButton
            variant="ghost"
            size="sm"
            onClick={fetchVendors}
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
          {['active', 'planned', 'inactive'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {statusLabels[status]}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 <span className="font-medium">{vendors.length}</span>개 제조사
          </p>
        </div>

        {/* Vendor Grid */}
        <AGSection>
          {vendors.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>등록된 제조사가 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map((vendor) => (
                <Link
                  key={vendor.id}
                  to={`/glucoseview/vendors/${vendor.id}`}
                >
                  <AGCard hoverable padding="lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-5 h-5 text-blue-500" />
                          <h3 className="font-semibold text-gray-900">
                            {vendor.name}
                          </h3>
                          <AGTag
                            color={statusColors[vendor.status]}
                            size="sm"
                          >
                            {statusLabels[vendor.status]}
                          </AGTag>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                          {vendor.code}
                        </p>
                        {vendor.description && (
                          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                            {vendor.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {vendor.supported_devices.slice(0, 3).map((device, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                            >
                              <Cpu className="w-3 h-3" />
                              {device}
                            </span>
                          ))}
                          {vendor.supported_devices.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              +{vendor.supported_devices.length - 3}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{integrationLabels[vendor.integration_type] || vendor.integration_type}</span>
                          {vendor.website_url && (
                            <ExternalLink className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </AGCard>
                </Link>
              ))}
            </div>
          )}
        </AGSection>
      </div>
    </div>
  );
};

export default VendorListPage;
