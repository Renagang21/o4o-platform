/**
 * AdminPartnerMonitoringPage — 파트너 모니터링 대시보드
 *
 * WO-O4O-ADMIN-PARTNER-MONITORING-V1
 *
 * 파트너별 종합 통계: 주문 수, 총 커미션, 지급 대기, 지급 완료
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Clock, CheckCircle, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
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

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={thStyle}>파트너</th>
              <th style={thStyle}>이메일</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>주문 수</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>총 커미션</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>지급 대기</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>지급 완료</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>상세</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>로딩 중...</td></tr>
            ) : partners.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>파트너가 없습니다</td></tr>
            ) : (
              partners.map((p) => (
                <tr key={p.partner_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>{p.name || '—'}</td>
                  <td style={{ ...tdStyle, color: '#64748b' }}>{p.email}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(p.orders)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(p.commission)}원</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#d97706' }}>{fmt(p.payable)}원</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: '#059669' }}>{fmt(p.paid)}원</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button
                      onClick={() => navigate(`/workspace/operator/partners/${p.partner_id}`)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                      <Eye size={16} color="#2563eb" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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

const thStyle: React.CSSProperties = {
  padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px', color: '#0f172a',
};

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #e2e8f0',
    backgroundColor: disabled ? '#f8fafc' : '#fff', cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: disabled ? '#cbd5e1' : '#475569',
  };
}
