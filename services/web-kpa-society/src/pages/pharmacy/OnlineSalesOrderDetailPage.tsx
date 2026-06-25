/**
 * OnlineSalesOrderDetailPage — 온라인 판매 주문 상세 (읽기 전용)
 *
 * WO-O4O-KPA-ONLINE-SALES-ORDER-DETAIL-V1
 *
 * seller checkout_orders 상세를 읽기 전용으로 표시한다.
 * - 기존 백엔드 재사용: GET /checkout/store-orders/:orderId
 *   (kpa-checkout.controller — requireStoreOwner + sellerOrganizationId 스코프 + serviceKey + 404). backend/DB 무변경.
 * - 개인정보(주문자명/연락처/주소)는 프론트에서 마스킹 표시(서버는 email만 부분 마스킹).
 * - 상태 변경/취소/환불/배송 처리는 범위 외(읽기 전용).
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { getStoreOrderDetail, type StoreOrderDetail } from '../../api/checkout';
import { BuyerOrderStatusBadge } from '@o4o/store-ui-core';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

// ── 개인정보 마스킹 (로컬 helper — 공용 유틸 부재) ──
function maskName(name?: string | null): string {
  const n = (name || '').trim();
  if (!n || n === '—') return '—';
  if (n.length <= 1) return n;
  if (n.length === 2) return `${n[0]}*`;
  return `${n[0]}${'*'.repeat(n.length - 2)}${n[n.length - 1]}`;
}
function maskPhone(phone?: string | null): string {
  const p = (phone || '').trim();
  if (!p) return '—';
  const digits = p.replace(/\D/g, '');
  if (digits.length < 7) return p.replace(/\d/g, '*');
  // 가운데 블록 마스킹, 앞 3 + 뒤 4 유지
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}
function maskAddressDetail(addr?: string | null): string {
  const a = (addr || '').trim();
  if (!a) return '';
  if (a.length <= 2) return '**';
  return `${a.slice(0, 2)}${'*'.repeat(Math.min(a.length - 2, 6))}`;
}

function paymentLabel(p: string): string {
  const s = (p || '').toLowerCase();
  if (s === 'paid') return '결제완료';
  if (s === 'pending') return '결제대기';
  if (s === 'refunded') return '환불';
  if (s === 'failed') return '결제실패';
  return p || '—';
}

function won(n?: number | null): string {
  return `${Number(n || 0).toLocaleString('ko-KR')}원`;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: StoreOrderDetail }
  | { kind: 'notfound' }
  | { kind: 'forbidden' }
  | { kind: 'error' };

export function OnlineSalesOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    if (!orderId) {
      setState({ kind: 'notfound' });
      return;
    }
    setState({ kind: 'loading' });
    try {
      const res = await getStoreOrderDetail(orderId);
      if (res.success && res.data) setState({ kind: 'ok', data: res.data });
      else setState({ kind: 'error' });
    } catch (e: any) {
      const status = e?.status;
      if (status === 404 || e?.code === 'ORDER_NOT_FOUND') setState({ kind: 'notfound' });
      else if (status === 403) setState({ kind: 'forbidden' });
      else setState({ kind: 'error' });
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const backLink = (
    <Link to="/store/online-sales/orders" style={S.backLink}>
      <ArrowLeft size={15} /> 주문 목록으로
    </Link>
  );

  if (state.kind === 'loading') {
    return (
      <div style={S.container}>
        {backLink}
        <div style={S.stateCenter}>
          <RefreshCw size={24} style={{ color: colors.neutral300 }} />
          <p style={{ color: colors.neutral500, fontSize: '14px', marginTop: '12px' }}>주문 상세를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (state.kind !== 'ok') {
    const msg =
      state.kind === 'notfound' ? '주문 정보를 찾을 수 없습니다.'
      : state.kind === 'forbidden' ? '이 주문을 확인할 권한이 없습니다.'
      : '주문 상세 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
    return (
      <div style={S.container}>
        {backLink}
        <div style={S.stateCenter}>
          <AlertCircle size={28} style={{ color: '#ef4444' }} />
          <p style={{ color: colors.neutral700, fontSize: '14px', marginTop: '12px' }}>{msg}</p>
          {state.kind === 'error' && (
            <button onClick={load} style={S.retryBtn}>다시 시도</button>
          )}
        </div>
      </div>
    );
  }

  const o = state.data;
  const ship = o.shippingAddress;

  return (
    <div style={S.container}>
      {backLink}

      {/* 헤더 */}
      <div style={S.headerRow}>
        <div>
          <h1 style={S.title}>주문 {o.orderNumber}</h1>
          <p style={S.subtitle}>온라인 스토어 주문 상세 (읽기 전용)</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
          <span style={{ fontSize: '12px', color: colors.neutral500 }}>{paymentLabel(o.paymentStatus)}</span>
          <BuyerOrderStatusBadge status={o.status} />
        </div>
      </div>

      {/* 주문 정보 */}
      <Section title="주문 정보">
        <Row label="주문번호" value={o.orderNumber} />
        <Row label="주문일시" value={new Date(o.createdAt).toLocaleString('ko-KR')} />
        <Row label="주문 경로" value="온라인 스토어 주문" />
        <Row label="주문상태" value={<BuyerOrderStatusBadge status={o.status} />} />
        <Row label="결제상태" value={paymentLabel(o.paymentStatus)} />
        {o.paidAt && <Row label="결제일시" value={new Date(o.paidAt).toLocaleString('ko-KR')} />}
      </Section>

      {/* 주문자 정보 (마스킹) */}
      <Section title="주문자 정보">
        <Row label="주문자명" value={maskName(o.buyerName)} />
        <Row label="이메일" value={o.buyerEmail || '—'} />
        <p style={S.privacyNote}>개인정보 보호를 위해 일부만 표시합니다.</p>
      </Section>

      {/* 상품 정보 */}
      <Section title="주문 상품">
        <div style={S.itemTable}>
          <div style={{ ...S.itemRow, ...S.itemHead }}>
            <span style={{ flex: 1 }}>상품명</span>
            <span style={S.itemQty}>수량</span>
            <span style={S.itemAmt}>단가</span>
            <span style={S.itemAmt}>금액</span>
          </div>
          {(o.items || []).map((it, i) => (
            <div key={`${it.productId}-${i}`} style={S.itemRow}>
              <span style={{ flex: 1, fontWeight: 500 }}>{it.productName}</span>
              <span style={S.itemQty}>{it.quantity}</span>
              <span style={S.itemAmt}>{won(it.unitPrice)}</span>
              <span style={S.itemAmt}>{won(it.subtotal)}</span>
            </div>
          ))}
        </div>
        <div style={S.amountBox}>
          <AmountLine label="상품 합계" value={won(o.subtotal)} />
          {o.shippingFee > 0 && <AmountLine label="배송비" value={won(o.shippingFee)} />}
          {o.discount > 0 && <AmountLine label="할인" value={`- ${won(o.discount)}`} />}
          <AmountLine label="결제 금액" value={won(o.totalAmount)} emphasize />
        </div>
      </Section>

      {/* 수령/배송 정보 (있을 때만) */}
      {ship && (ship.recipientName || ship.address1) && (
        <Section title="수령/배송 정보">
          <Row label="수령인" value={maskName(ship.recipientName)} />
          <Row label="연락처" value={maskPhone(ship.phone)} />
          <Row
            label="주소"
            value={
              [ship.zipCode ? `(${ship.zipCode})` : '', ship.address1 || '', maskAddressDetail(ship.address2)]
                .filter(Boolean)
                .join(' ') || '정보 없음'
            }
          />
          {ship.memo && <Row label="요청사항" value={ship.memo} />}
        </Section>
      )}

      {/* 결제 내역 (있을 때만) */}
      {o.payments && o.payments.length > 0 && (
        <Section title="결제 내역">
          {o.payments.map((p) => (
            <div key={p.id} style={S.payRow}>
              <span style={{ fontSize: '13px' }}>
                {p.method || '결제'} · {paymentLabel(p.status)}
              </span>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>{won(p.amount)}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

// ── presentational helpers ──
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={S.section}>
      <h2 style={S.sectionTitle}>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={S.row}>
      <span style={S.rowLabel}>{label}</span>
      <span style={S.rowValue}>{value}</span>
    </div>
  );
}
function AmountLine({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div style={{ ...S.amountLine, ...(emphasize ? S.amountLineEmph : {}) }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/* ── Styles ── */
const S: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: spacing.lg },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  title: { ...typography.headingL, margin: 0, color: colors.neutral900 },
  subtitle: { margin: `${spacing.xs} 0 0`, fontSize: '0.875rem', color: colors.neutral500 },
  section: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: spacing.lg,
  },
  sectionTitle: { margin: `0 0 ${spacing.md}`, fontSize: '0.95rem', fontWeight: 700, color: colors.neutral800 },
  row: { display: 'flex', gap: spacing.md, padding: '6px 0', fontSize: '13px' },
  rowLabel: { width: '90px', flexShrink: 0, color: colors.neutral500 },
  rowValue: { color: colors.neutral800, flex: 1 },
  privacyNote: { margin: `${spacing.sm} 0 0`, fontSize: '11px', color: colors.neutral400 },
  itemTable: { border: `1px solid ${colors.neutral200}`, borderRadius: borderRadius.md, overflow: 'hidden' },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    padding: '10px 12px',
    fontSize: '13px',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  itemHead: { backgroundColor: colors.neutral50, color: colors.neutral500, fontSize: '12px', fontWeight: 600 },
  itemQty: { width: '48px', textAlign: 'center' as const },
  itemAmt: { width: '90px', textAlign: 'right' as const },
  amountBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTop: `1px solid ${colors.neutral100}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  amountLine: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: colors.neutral600 },
  amountLineEmph: { fontSize: '15px', fontWeight: 700, color: colors.neutral900, marginTop: '4px' },
  payRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  stateCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
  } as React.CSSProperties,
  retryBtn: {
    marginTop: '16px',
    padding: '8px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },
};

export default OnlineSalesOrderDetailPage;
