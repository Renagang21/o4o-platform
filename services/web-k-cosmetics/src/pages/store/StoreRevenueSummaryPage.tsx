/**
 * StoreRevenueSummaryPage — K-Cosmetics 내 매장 매출 요약
 *
 * WO-O4O-KCOSMETICS-STORE-REVENUE-SUMMARY-FRONTEND-V1
 *
 * ⚠️ 이 화면은 /cosmetics/orders 주문 데이터를 기반으로 한 참고용 매출 요약입니다.
 * ⚠️ 실제 정산 확정 금액, 지급 금액, 인보이스 발행 내역이 아닙니다.
 * ⚠️ 실제 정산/인보이스 구현은 IR-O4O-SETTLEMENT-INVOICE-DATA-MODEL-DESIGN-V1에서 설계 예정.
 *
 * K-Cosmetics 사용자-facing 문구: "내 매장", "매출 요약", "매장 매출"
 * 금지 표현: "정산 완료", "지급 완료", "인보이스 발행", "확정 정산 금액"
 */

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import {
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Loader2,
  ShoppingCart,
  XCircle,
  RotateCcw,
  BarChart3,
} from 'lucide-react';
import { getStoreOrders, type StoreOrder } from '@/api/storeOrders';

const FETCH_LIMIT = 100; // 최대 100건 조회하여 집계

interface RevenueSummary {
  paidCount: number;
  paidAmount: number;
  cancelledCount: number;
  cancelledAmount: number;
  refundedCount: number;
  refundedAmount: number;
  pendingCount: number;
  totalCount: number;
  byChannel: Record<string, { count: number; amount: number }>;
  recentOrders: StoreOrder[];
}

function buildSummary(orders: StoreOrder[]): RevenueSummary {
  const summary: RevenueSummary = {
    paidCount: 0,
    paidAmount: 0,
    cancelledCount: 0,
    cancelledAmount: 0,
    refundedCount: 0,
    refundedAmount: 0,
    pendingCount: 0,
    totalCount: orders.length,
    byChannel: {},
    recentOrders: orders.slice(0, 10),
  };

  for (const o of orders) {
    if (o.status === 'paid') {
      summary.paidCount++;
      summary.paidAmount += o.totalAmount;
    } else if (o.status === 'cancelled') {
      summary.cancelledCount++;
      summary.cancelledAmount += o.totalAmount;
    } else if (o.status === 'refunded') {
      summary.refundedCount++;
      summary.refundedAmount += o.totalAmount;
    } else if (o.status === 'pending_payment') {
      summary.pendingCount++;
    }

    if (o.channel) {
      const ch = o.channel;
      if (!summary.byChannel[ch]) summary.byChannel[ch] = { count: 0, amount: 0 };
      if (o.status === 'paid') {
        summary.byChannel[ch].count++;
        summary.byChannel[ch].amount += o.totalAmount;
      }
    }
  }

  return summary;
}

function fmt(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

const CHANNEL_LABEL: Record<string, string> = { local: '매장', travel: '여행' };
const STATUS_LABEL: Record<string, string> = {
  created: '접수', pending_payment: '결제대기', paid: '결제완료',
  cancelled: '취소', refunded: '환불',
};

export default function StoreRevenueSummaryPage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedTotal, setFetchedTotal] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStoreOrders({ page: 1, limit: FETCH_LIMIT });
      const orders = res.data || [];
      setFetchedTotal(res.pagination?.total ?? orders.length);
      setSummary(buildSummary(orders));
    } catch (e: any) {
      setError(e?.message || '매출 데이터를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.breadcrumb}>
            <span>내 매장</span>
            <span style={{ color: '#9CA3AF' }}>/</span>
            <span style={{ color: '#374151' }}>매출 요약</span>
          </div>
          <h1 style={s.title}>
            <BarChart3 size={20} style={{ color: '#0EA5E9' }} />
            매출 요약
          </h1>
          <p style={s.subtitle}>주문 데이터를 기준으로 한 참고용 매출 현황입니다.</p>
        </div>
        <button onClick={loadData} style={s.refreshBtn} disabled={loading}>
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* 면책 배너 — 반드시 항상 표시 */}
      <div style={s.disclaimer}>
        <AlertCircle size={15} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
        <p style={s.disclaimerText}>
          이 화면은 주문 데이터를 기준으로 한 <strong>참고용 매출 요약</strong>입니다.
          실제 정산 확정 금액, 지급 금액, 세금계산서 또는 인보이스 발행 내역이 아닙니다.
          {fetchedTotal > FETCH_LIMIT && (
            <> 전체 {fetchedTotal}건 중 최근 {FETCH_LIMIT}건 기준으로 집계됩니다.</>
          )}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={s.errorBox}>
          <AlertCircle size={15} style={{ color: '#DC2626' }} />
          <span style={{ fontSize: 13, color: '#991B1B', flex: 1 }}>{error}</span>
          <button type="button" onClick={loadData} style={s.retryBtn}>재시도</button>
        </div>
      )}

      {loading ? (
        <div style={s.center}>
          <Loader2 size={28} style={{ color: '#0EA5E9' }} />
          <span style={{ marginLeft: 10, fontSize: 13, color: '#9CA3AF' }}>불러오는 중...</span>
        </div>
      ) : summary ? (
        <>
          {/* KPI 카드 */}
          <div style={s.kpiGrid}>
            <div style={s.kpiCard}>
              <div style={s.kpiIcon}><TrendingUp size={18} style={{ color: '#059669' }} /></div>
              <div style={s.kpiLabel}>결제 완료 금액</div>
              <div style={{ ...s.kpiValue, color: '#059669' }}>{fmt(summary.paidAmount)}</div>
              <div style={s.kpiSub}>{summary.paidCount}건</div>
            </div>
            <div style={s.kpiCard}>
              <div style={s.kpiIcon}><ShoppingCart size={18} style={{ color: '#2563EB' }} /></div>
              <div style={s.kpiLabel}>결제 대기</div>
              <div style={s.kpiValue}>{summary.pendingCount}건</div>
              <div style={s.kpiSub}>미결제</div>
            </div>
            <div style={s.kpiCard}>
              <div style={s.kpiIcon}><XCircle size={18} style={{ color: '#DC2626' }} /></div>
              <div style={s.kpiLabel}>취소 금액</div>
              <div style={{ ...s.kpiValue, color: '#DC2626' }}>{fmt(summary.cancelledAmount)}</div>
              <div style={s.kpiSub}>{summary.cancelledCount}건</div>
            </div>
            <div style={s.kpiCard}>
              <div style={s.kpiIcon}><RotateCcw size={18} style={{ color: '#6B7280' }} /></div>
              <div style={s.kpiLabel}>환불 금액</div>
              <div style={{ ...s.kpiValue, color: '#6B7280' }}>{fmt(summary.refundedAmount)}</div>
              <div style={s.kpiSub}>{summary.refundedCount}건</div>
            </div>
          </div>

          <div style={s.row2}>
            {/* 채널별 요약 */}
            {Object.keys(summary.byChannel).length > 0 && (
              <div style={s.panel}>
                <h2 style={s.panelTitle}>채널별 결제 완료 매출</h2>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>채널</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>주문 수</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(summary.byChannel).map(([ch, v]) => (
                      <tr key={ch}>
                        <td style={s.td}>{CHANNEL_LABEL[ch] ?? ch}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{v.count}건</td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 500 }}>{fmt(v.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 최근 주문 목록 */}
            <div style={{ ...s.panel, flex: 2 }}>
              <h2 style={s.panelTitle}>
                최근 주문 (참고용)
                <span style={s.panelNote}> — 주문 관리에서 전체를 확인하세요.</span>
              </h2>
              {summary.recentOrders.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9CA3AF', padding: '20px 0', textAlign: 'center' as const }}>
                  주문이 없습니다.
                </p>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>주문번호</th>
                      <th style={s.th}>주문일</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>상태</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentOrders.map((o) => (
                      <tr key={o.id} style={s.tr}>
                        <td style={{ ...s.td, fontSize: 12, fontWeight: 500 }}>{o.orderNumber}</td>
                        <td style={{ ...s.td, fontSize: 12, color: '#6B7280' }}>{fmtDate(o.createdAt)}</td>
                        <td style={{ ...s.td, textAlign: 'center' as const }}>
                          <span style={s.statusBadge}>{STATUS_LABEL[o.status] ?? o.status}</span>
                        </td>
                        <td style={{ ...s.td, textAlign: 'right' as const, fontWeight: 500 }}>{fmt(o.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <p style={s.footerNote}>
            조회된 주문 {Math.min(summary.totalCount, FETCH_LIMIT)}건 기준 집계 (전체 {fetchedTotal}건).
            정확한 정산 내역은 별도 정산 시스템을 통해 확인하세요.
          </p>
        </>
      ) : null}
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  container:      { padding: '24px', maxWidth: '1100px', margin: '0 auto' },
  header:         { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16 },
  breadcrumb:     { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9CA3AF', marginBottom: 6 },
  title:          { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 600, color: '#1F2937', margin: 0 },
  subtitle:       { fontSize: 13, color: '#6B7280', margin: '6px 0 0', lineHeight: 1.5 },
  refreshBtn:     { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#fff', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, color: '#374151', cursor: 'pointer' },
  disclaimer:     { display: 'flex', gap: 10, padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, marginBottom: 20, alignItems: 'flex-start' },
  disclaimerText: { fontSize: 13, color: '#92400E', margin: 0, lineHeight: 1.6 },
  errorBox:       { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, marginBottom: 16 },
  retryBtn:       { padding: '4px 10px', fontSize: 12, color: '#DC2626', background: '#fff', border: '1px solid #FECACA', borderRadius: 4, cursor: 'pointer', flexShrink: 0 },
  center:         { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' },
  kpiGrid:        { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  kpiCard:        { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '16px 18px' },
  kpiIcon:        { marginBottom: 8 },
  kpiLabel:       { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  kpiValue:       { fontSize: 22, fontWeight: 700, color: '#1F2937', marginBottom: 4 },
  kpiSub:         { fontSize: 12, color: '#9CA3AF' },
  row2:           { display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 },
  panel:          { flex: 1, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '16px 18px', overflow: 'hidden' },
  panelTitle:     { fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 12px' },
  panelNote:      { fontSize: 12, color: '#9CA3AF', fontWeight: 400 },
  table:          { width: '100%', borderCollapse: 'collapse' as const },
  th:             { padding: '8px 10px', fontSize: 12, fontWeight: 600, color: '#6B7280', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', textAlign: 'left' as const },
  tr:             { borderBottom: '1px solid #F3F4F6' },
  td:             { padding: '10px 10px', fontSize: 13, color: '#374151', verticalAlign: 'middle' as const },
  statusBadge:    { display: 'inline-block', padding: '2px 7px', borderRadius: 10, fontSize: 11, fontWeight: 500, background: '#F3F4F6', color: '#374151' },
  footerNote:     { fontSize: 12, color: '#9CA3AF', textAlign: 'center' as const, marginTop: 8 },
};
