/**
 * AdminPartnerMonitoringPage — 파트너 모니터링 대시보드
 *
 * WO-O4O-ADMIN-PARTNER-MONITORING-V1
 * WO-O4O-NETURE-ADMIN-PARTNER-MONITORING-DATATABLE-ALIGN-V1 — raw table → canonical DataTable
 *
 * 파트너별 종합 통계: 주문 수, 총 커미션, 지급 대기, 지급 완료
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Clock, CheckCircle, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import {
  adminPartnerMonitoringApi,
  type PartnerMonitoringItem,
  type PartnerMonitoringKpi,
} from '../../lib/api/admin';

function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

export default function AdminPartnerMonitoringPage() {
  const navigate = useNavigate();

  const [partners, setPartners] = useState<PartnerMonitoringItem[]>([]);
  const [kpi, setKpi] = useState<PartnerMonitoringKpi>({ total_partners: 0, total_commission: 0, total_payable: 0, total_paid: 0 });
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true);
    const result = await adminPartnerMonitoringApi.getPartners({ page, limit: 20, search: searchTerm || undefined });
    setPartners(result.data);
    setMeta(result.meta);
    setKpi(result.kpi);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(meta.page, search);
  }, [meta.page, search, fetchData]);

  const handleSearch = () => {
    setSearch(searchInput);
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  const goPage = (p: number) => setMeta((prev) => ({ ...prev, page: p }));

  const kpiCards = [
    { label: '총 파트너', value: fmt(kpi.total_partners), icon: Users, color: '#2563eb', bg: '#eff6ff' },
    { label: '총 커미션', value: `${fmt(kpi.total_commission)}원`, icon: TrendingUp, color: '#059669', bg: '#ecfdf5' },
    { label: '지급 대기', value: `${fmt(kpi.total_payable)}원`, icon: Clock, color: '#d97706', bg: '#fffbeb' },
    { label: '지급 완료', value: `${fmt(kpi.total_paid)}원`, icon: CheckCircle, color: '#7c3aed', bg: '#f5f3ff' },
  ];

  const columns: ListColumnDef<PartnerMonitoringItem>[] = [
    {
      key: 'name',
      header: '파트너',
      sortable: true,
      sortAccessor: (row) => row.name || '',
      render: (_v, row) => <span className="text-slate-900">{row.name || '—'}</span>,
    },
    {
      key: 'email',
      header: '이메일',
      sortable: true,
      sortAccessor: (row) => row.email,
      render: (_v, row) => (
        <span className="text-slate-500" title={row.email}>{row.email}</span>
      ),
    },
    {
      key: 'orders',
      header: '주문 수',
      align: 'right',
      sortable: true,
      sortAccessor: (row) => row.orders,
      render: (_v, row) => <span className="text-slate-900">{fmt(row.orders)}</span>,
    },
    {
      key: 'commission',
      header: '총 커미션',
      align: 'right',
      sortable: true,
      sortAccessor: (row) => row.commission,
      render: (_v, row) => (
        <span className="text-slate-900 font-semibold">{fmt(row.commission)}원</span>
      ),
    },
    {
      key: 'payable',
      header: '지급 대기',
      align: 'right',
      sortable: true,
      sortAccessor: (row) => row.payable,
      render: (_v, row) => (
        <span style={{ color: '#d97706' }}>{fmt(row.payable)}원</span>
      ),
    },
    {
      key: 'paid',
      header: '지급 완료',
      align: 'right',
      sortable: true,
      sortAccessor: (row) => row.paid,
      render: (_v, row) => (
        <span style={{ color: '#059669' }}>{fmt(row.paid)}원</span>
      ),
    },
    {
      key: '_actions',
      header: '상세',
      system: true,
      align: 'center',
      width: '60px',
      onCellClick: () => {},
      render: (_v, row) => (
        <button
          type="button"
          onClick={() => navigate(`/operator/partners/${row.partner_id}`)}
          aria-label="파트너 상세 보기"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        >
          <Eye size={16} color="#2563eb" />
        </button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginBottom: '20px' }}>파트너 모니터링</h1>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {kpiCards.map((c) => (
          <div key={c.label} style={{ backgroundColor: c.bg, borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <c.icon size={20} color={c.color} />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{c.label}</p>
              <p style={{ fontSize: '18px', fontWeight: 700, color: c.color, margin: '2px 0 0' }}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="파트너 이름 또는 이메일 검색"
            style={{
              width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px',
              border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <button
          onClick={handleSearch}
          style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none',
            backgroundColor: '#2563eb', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          검색
        </button>
      </div>

      {/* DataTable */}
      <DataTable<PartnerMonitoringItem>
        columns={columns}
        data={partners}
        rowKey="partner_id"
        loading={loading}
        emptyMessage="파트너가 없습니다"
        tableId="neture-admin-partner-monitoring"
      />

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
          <button
            onClick={() => goPage(meta.page - 1)}
            disabled={meta.page <= 1}
            style={paginationBtnStyle(meta.page <= 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '14px', color: '#64748b' }}>
            {meta.page} / {meta.totalPages}
          </span>
          <button
            onClick={() => goPage(meta.page + 1)}
            disabled={meta.page >= meta.totalPages}
            style={paginationBtnStyle(meta.page >= meta.totalPages)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #e2e8f0',
    backgroundColor: disabled ? '#f8fafc' : '#fff', cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: disabled ? '#cbd5e1' : '#475569',
  };
}
