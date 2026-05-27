/**
 * ApplicationsPage - K-Cosmetics 매장 가입신청 관리
 *
 * WO-O4O-COSMETICS-ORG-REUSE-AND-ENROLLMENT-V1:
 * 모의 데이터 → 실제 API 연결
 * GET /api/v1/cosmetics/stores/admin/applications (cosmetics:admin scope)
 */

import { useState, useEffect } from 'react';
import { BaseDetailDrawer } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { api } from '../../lib/apiClient';

interface Application {
  id: string;
  storeName: string;
  ownerName: string;
  contactPhone?: string;
  businessNumber: string;
  address?: string;
  region?: string;
  note?: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: '검토중',
  APPROVED: '승인완료',
  REJECTED: '반려',
};

const statusColors: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true);
        setFetchError(null);
        const res = await api.get('/cosmetics/stores/admin/applications', {
          params: { limit: 100 },
        });
        setApplications(res.data?.data || []);
      } catch (err: any) {
        const msg = err?.response?.data?.error?.message || err?.response?.data?.error || '신청 목록을 불러오지 못했습니다.';
        setFetchError(typeof msg === 'string' ? msg : '신청 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const statuses = ['all', 'SUBMITTED', 'APPROVED', 'REJECTED'];

  const filteredApplications = applications.filter(app =>
    statusFilter === 'all' || app.status === statusFilter
  );

  const columns: ListColumnDef<Application>[] = [
    {
      key: 'storeName',
      header: '매장 정보',
      render: (_v, app) => (
        <div>
          <p className="font-medium text-slate-800">{app.storeName}</p>
          <p className="text-sm text-slate-600 mt-1">{app.ownerName}</p>
        </div>
      ),
    },
    {
      key: 'contactPhone',
      header: '연락처',
      width: '150px',
      render: (_v, app) => <p className="text-sm text-slate-600">{app.contactPhone || '-'}</p>,
    },
    {
      key: 'createdAt',
      header: '신청일',
      width: '130px',
      render: (_v, app) => (
        <p className="text-sm text-slate-600">
          {new Date(app.createdAt).toLocaleDateString('ko-KR')}
        </p>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '120px',
      align: 'center',
      render: (_v, app) => (
        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors[app.status] ?? 'bg-slate-100 text-slate-600'}`}>
          {STATUS_LABEL[app.status] ?? app.status}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
        {fetchError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">신청 관리</h1>
          <p className="text-slate-500 mt-1">매장 가입신청을 검토하고 승인합니다</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">전체 신청</p>
          <p className="text-2xl font-bold text-slate-800">{applications.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">검토중</p>
          <p className="text-2xl font-bold text-blue-600">{applications.filter(a => a.status === 'SUBMITTED').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">승인완료</p>
          <p className="text-2xl font-bold text-green-600">{applications.filter(a => a.status === 'APPROVED').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">반려</p>
          <p className="text-2xl font-bold text-red-600">{applications.filter(a => a.status === 'REJECTED').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-100">
        <div className="flex gap-2 flex-wrap">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-pink-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status === 'all' ? '전체' : STATUS_LABEL[status]}
            </button>
          ))}
        </div>
      </div>

      <DataTable<Application>
        columns={columns}
        data={filteredApplications}
        rowKey={(row) => row.id}
        emptyMessage="신청이 없습니다"
        onRowClick={(app) => setSelectedApp(app)}
        tableId="kcos-applications"
      />

      <BaseDetailDrawer
        open={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        title={selectedApp?.storeName ?? ''}
        width={480}
        actions={[]}
      >
        {selectedApp && (
          <div className="space-y-1">
            {[
              { label: '대표자', value: selectedApp.ownerName },
              { label: '상태', value: STATUS_LABEL[selectedApp.status] ?? selectedApp.status },
              { label: '사업자번호', value: selectedApp.businessNumber },
              { label: '연락처', value: selectedApp.contactPhone || '-' },
              { label: '주소', value: selectedApp.address || '-' },
              { label: '지역', value: selectedApp.region || '-' },
              { label: '신청일', value: new Date(selectedApp.createdAt).toLocaleDateString('ko-KR') },
              ...(selectedApp.reviewedAt ? [{ label: '검토일', value: new Date(selectedApp.reviewedAt).toLocaleDateString('ko-KR') }] : []),
              ...(selectedApp.rejectionReason ? [{ label: '반려 사유', value: selectedApp.rejectionReason }] : []),
              ...(selectedApp.note ? [{ label: '메모', value: selectedApp.note }] : []),
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: '#64748b', minWidth: 80, flexShrink: 0 }}>{item.label}</span>
                <span style={{ color: '#1e293b' }}>{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}
