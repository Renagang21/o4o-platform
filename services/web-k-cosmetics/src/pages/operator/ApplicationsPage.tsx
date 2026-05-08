/**
 * ApplicationsPage - K-Cosmetics 신청 관리
 *
 * Spike: WO-COSMETICS-TABLE-UI-SPIKE-V1
 * 축약 Table UI 적합성 테스트 (7→4 컬럼)
 */

import { useState } from 'react';
import { BaseDetailDrawer } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';

interface Application {
  id: number;
  storeName: string;
  owner: string;
  phone: string;
  type: string;
  status: string;
  appliedDate: string;
}

const applications: Application[] = [
  { id: 1, storeName: '뷰티마트 잠실점', owner: '김미영', phone: '010-1234-5678', type: '신규입점', status: '검토중', appliedDate: '2024-01-15' },
  { id: 2, storeName: '코스메 선릉점', owner: '이정은', phone: '010-2345-6789', type: '신규입점', status: '승인대기', appliedDate: '2024-01-14' },
  { id: 3, storeName: '스킨랩 역삼점', owner: '박수진', phone: '010-3456-7890', type: '브랜드추가', status: '승인완료', appliedDate: '2024-01-13' },
  { id: 4, storeName: '메이크업샵 강남점', owner: '최혜원', phone: '010-4567-8901', type: '신규입점', status: '반려', appliedDate: '2024-01-12' },
  { id: 5, storeName: '뷰티센터 홍대점', owner: '정다은', phone: '010-5678-9012', type: '계약갱신', status: '검토중', appliedDate: '2024-01-11' },
];

const statusColors: Record<string, string> = {
  '검토중': 'bg-blue-100 text-blue-700',
  '승인대기': 'bg-yellow-100 text-yellow-700',
  '승인완료': 'bg-green-100 text-green-700',
  '반려': 'bg-red-100 text-red-700',
};

const typeColors: Record<string, string> = {
  '신규입점': 'bg-pink-100 text-pink-700',
  '브랜드추가': 'bg-purple-100 text-purple-700',
  '계약갱신': 'bg-indigo-100 text-indigo-700',
};

export default function ApplicationsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const statuses = ['all', '검토중', '승인대기', '승인완료', '반려'];

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
          <p className="text-sm text-slate-600 mt-1">{app.owner}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: '신청 내용',
      render: (_v, app) => (
        <div>
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${typeColors[app.type] ?? 'bg-slate-100 text-slate-600'}`}>
            {app.type}
          </span>
          <p className="text-sm text-slate-500 mt-1">{app.appliedDate}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: '연락처',
      width: '150px',
      render: (_v, app) => <p className="text-sm text-slate-600">{app.phone}</p>,
    },
    {
      key: 'status',
      header: '상태',
      width: '120px',
      align: 'center',
      render: (_v, app) => (
        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColors[app.status] ?? 'bg-slate-100 text-slate-600'}`}>
          {app.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">신청 관리</h1>
          <p className="text-slate-500 mt-1">매장 입점 및 변경 신청을 관리합니다</p>
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
          <p className="text-2xl font-bold text-blue-600">{applications.filter(a => a.status === '검토중').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">승인대기</p>
          <p className="text-2xl font-bold text-yellow-600">{applications.filter(a => a.status === '승인대기').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">승인완료</p>
          <p className="text-2xl font-bold text-green-600">{applications.filter(a => a.status === '승인완료').length}</p>
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
              {status === 'all' ? '전체' : status}
            </button>
          ))}
        </div>
      </div>

      <DataTable<Application>
        columns={columns}
        data={filteredApplications}
        rowKey={(row) => String(row.id)}
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
              { label: '신청자', value: selectedApp.owner },
              { label: '신청 유형', value: selectedApp.type },
              { label: '상태', value: selectedApp.status },
              { label: '연락처', value: selectedApp.phone },
              { label: '신청일', value: selectedApp.appliedDate },
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
