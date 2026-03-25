/**
 * AdminPartnerDetailPage — 파트너 상세 + 최근 커미션
 *
 * WO-O4O-ADMIN-PARTNER-MONITORING-V1
 *
 * 경로: /workspace/admin/partners/:id
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, ShoppingCart, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { adminPartnerMonitoringApi, type PartnerMonitoringDetail } from '../../lib/api/admin';

function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

const statusLabels: Record<string, { text: string; color: string; bg: string }> = {
  pending: { text: '대기', color: '#d97706', bg: '#fffbeb' },
  approved: { text: '승인', color: '#2563eb', bg: '#eff6ff' },
  paid: { text: '지급완료', color: '#059669', bg: '#ecfdf5' },
  rejected: { text: '반려', color: '#dc2626', bg: '#fef2f2' },
};

export default function AdminPartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<PartnerMonitoringDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const data = await adminPartnerMonitoringApi.getDetail(id);
      setDetail(data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '60px' }}>로딩 중...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <button onClick={() => navigate('/operator/partners')} style={backBtnStyle}>
          <ArrowLeft size={16} /> 목록으로
        </button>
        <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '60px' }}>파트너를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const summaryCards = [
    { label: '총 주문', value: fmt(detail.orders), icon: ShoppingCart, color: '#2563eb', bg: '#eff6ff' },
    { label: '총 커미션', value: `${fmt(detail.commission)}원`, icon: TrendingUp, color: '#059669', bg: '#ecfdf5' },
    { label: '지급 대기', value: `${fmt(detail.payable)}원`, icon: Clock, color: '#d97706', bg: '#fffbeb' },
    { label: '지급 완료', value: `${fmt(detail.paid)}원`, icon: CheckCircle, color: '#7c3aed', bg: '#f5f3ff' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Back + Title */}
      <button onClick={() => navigate('/operator/partners')} style={backBtnStyle}>
        <ArrowLeft size={16} /> 목록으로
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', marginBottom: '20px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={22} color="#2563eb" />
        </div>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{detail.name || '이름 없음'}</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '2px 0 0' }}>{detail.email}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {summaryCards.map((c) => (
          <div key={c.label} style={{ backgroundColor: c.bg, borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <c.icon size={18} color={c.color} />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{c.label}</p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: c.color, margin: '2px 0 0' }}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Commissions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>최근 커미션 (최대 20건)</h2>
        <button
          onClick={() => navigate('/operator/partner-settlements')}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
            backgroundColor: '#fff', color: '#475569', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          정산 관리 →
        </button>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={thStyle}>주문번호</th>
              <th style={thStyle}>상품</th>
              <th style={thStyle}>매장</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>커미션</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>상태</th>
              <th style={thStyle}>날짜</th>
            </tr>
          </thead>
          <tbody>
            {detail.commissions.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>커미션 내역이 없습니다</td></tr>
            ) : (
              detail.commissions.map((c) => {
                const st = statusLabels[c.status] || { text: c.status, color: '#64748b', bg: '#f8fafc' };
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>{c.order_number || '—'}</td>
                    <td style={tdStyle}>{c.product_name || '—'}</td>
                    <td style={tdStyle}>{c.store_name || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(c.commission_amount)}원</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
                        fontSize: '12px', fontWeight: 600, color: st.color, backgroundColor: st.bg,
                      }}>
                        {st.text}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: '#64748b' }}>{fmtDate(c.created_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#475569', fontSize: '14px', fontWeight: 500, padding: 0,
};

const thStyle: React.CSSProperties = {
  padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px', color: '#0f172a',
};
