/**
 * StoreOrderDetailDrawer - 주문 상세 Drawer
 * WO-STORE-ORDER-MANAGEMENT-FULL-IMPLEMENTATION-V1
 *
 * 주문 목록에서 행 클릭 → 우측 Drawer로 상세 정보 표시
 * 상태에 따라 취소/환불 액션 제공
 */

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, X, AlertCircle } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { getStoreOrderDetail, updateStoreOrderStatus } from '../../api/checkout';
import type { StoreOrderDetail } from '../../api/checkout';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

// ── Status config ──

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  created: { label: '접수', color: colors.primary, bg: '#DBEAFE' },
  pending_payment: { label: '결제대기', color: colors.accentYellow, bg: '#FEF3C7' },
  paid: { label: '결제완료', color: colors.accentGreen, bg: '#D1FAE5' },
  refunded: { label: '환불', color: colors.neutral500, bg: colors.neutral100 },
  cancelled: { label: '취소', color: '#ef4444', bg: '#FEE2E2' },
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  paid: '완료',
  failed: '실패',
  refunded: '환불',
  success: '성공',
};

const LOG_ACTION_LABEL: Record<string, string> = {
  created: '주문 생성',
  payment_initiated: '결제 시작',
  payment_success: '결제 완료',
  payment_failed: '결제 실패',
  refund_requested: '환불 요청',
  refunded: '환불 완료',
  cancelled: '주문 취소',
  status_changed: '상태 변경',
};

// ── Helper components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={S.section}>
      <h3 style={S.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={S.infoRow}>
      <span style={S.infoLabel}>{label}</span>
      <span style={S.infoValue}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const badge = STATUS_BADGE[status] || { label: status, color: colors.neutral500, bg: colors.neutral100 };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 500,
      color: badge.color,
      backgroundColor: badge.bg,
    }}>
      {badge.label}
    </span>
  );
}

// ── Main component ──

interface Props {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: () => void;
}

export function StoreOrderDetailDrawer({ orderId, open, onClose, onStatusChange }: Props) {
  const [detail, setDetail] = useState<StoreOrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showActionForm, setShowActionForm] = useState(false);
  const [actionReason, setActionReason] = useState('');

  const loadDetail = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    setShowActionForm(false);
    setActionReason('');
    try {
      const res = await getStoreOrderDetail(orderId);
      if (res.success) {
        setDetail(res.data);
      } else {
        setError('주문 정보를 불러올 수 없습니다.');
      }
    } catch {
      setError('주문 정보를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (open && orderId) {
      loadDetail();
    } else {
      setDetail(null);
      setError(null);
      setShowActionForm(false);
      setActionReason('');
    }
  }, [open, orderId, loadDetail]);

  const handleAction = async (action: 'cancel' | 'refund') => {
    if (!orderId || !actionReason.trim()) {
      toast.error('사유를 입력해주세요.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await updateStoreOrderStatus(orderId, { action, reason: actionReason.trim() });
      if (res.success) {
        toast.success(action === 'cancel' ? '주문이 취소되었습니다.' : '환불 처리되었습니다.');
        onStatusChange();
      } else {
        toast.error('처리에 실패했습니다.');
      }
    } catch {
      toast.error('처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!open) return null;

  // Determine available action
  const canCancel = detail?.status === 'created' || detail?.status === 'pending_payment';
  const canRefund = detail?.status === 'paid';
  const actionType: 'cancel' | 'refund' | null = canCancel ? 'cancel' : canRefund ? 'refund' : null;

  return (
    <>
      {/* Backdrop */}
      <div style={S.backdrop} onClick={onClose} />

      {/* Drawer */}
      <div style={S.drawer}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <h2 style={S.headerTitle}>주문 상세</h2>
            {detail && (
              <p style={S.headerSub}>{detail.orderNumber}</p>
            )}
          </div>
          <button onClick={onClose} style={S.closeBtn} aria-label="닫기">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={S.content}>
          {loading ? (
            <div style={S.stateCenter}>
              <RefreshCw size={24} style={{ color: colors.neutral300 }} />
              <p style={{ color: colors.neutral500, fontSize: '14px', marginTop: '12px' }}>
                불러오는 중...
              </p>
            </div>
          ) : error ? (
            <div style={S.stateCenter}>
              <AlertCircle size={24} style={{ color: '#ef4444' }} />
              <p style={{ color: colors.neutral700, fontSize: '14px', marginTop: '12px' }}>{error}</p>
              <button onClick={loadDetail} style={S.retryBtn}>다시 시도</button>
            </div>
          ) : detail ? (
            <>
              {/* 주문 정보 */}
              <Section title="주문 정보">
                <InfoRow label="주문번호" value={detail.orderNumber} />
                <InfoRow label="상태" value={<StatusBadge status={detail.status} />} />
                <InfoRow label="결제상태" value={PAYMENT_STATUS_LABEL[detail.paymentStatus] || detail.paymentStatus} />
                <InfoRow label="배송방법" value={detail.metadata?.deliveryMethod === 'delivery' ? '배송' : '픽업'} />
                <InfoRow
                  label="생성일"
                  value={new Date(detail.createdAt).toLocaleString('ko-KR')}
                />
                {detail.paidAt && (
                  <InfoRow label="결제일" value={new Date(detail.paidAt).toLocaleString('ko-KR')} />
                )}
                {detail.cancelledAt && (
                  <InfoRow label="취소일" value={new Date(detail.cancelledAt).toLocaleString('ko-KR')} />
                )}
                {detail.refundedAt && (
                  <InfoRow label="환불일" value={new Date(detail.refundedAt).toLocaleString('ko-KR')} />
                )}
              </Section>

              {/* 구매자 정보 */}
              <Section title="구매자 정보">
                <InfoRow label="이름" value={detail.buyerName} />
                <InfoRow label="이메일" value={detail.buyerEmail} />
              </Section>

              {/* 상품 목록 */}
              <Section title="상품 목록">
                {detail.items.map((item, i) => (
                  <div key={i} style={S.itemRow}>
                    <div style={S.itemName}>{item.productName}</div>
                    <div style={S.itemDetail}>
                      <span>{item.quantity}개 x {Number(item.unitPrice).toLocaleString('ko-KR')}원</span>
                      <span style={{ fontWeight: 600 }}>{Number(item.subtotal).toLocaleString('ko-KR')}원</span>
                    </div>
                  </div>
                ))}
                <div style={S.totalArea}>
                  <div style={S.totalRow}>
                    <span>소계</span>
                    <span>{Number(detail.subtotal).toLocaleString('ko-KR')}원</span>
                  </div>
                  {Number(detail.shippingFee) > 0 && (
                    <div style={S.totalRow}>
                      <span>배송비</span>
                      <span>{Number(detail.shippingFee).toLocaleString('ko-KR')}원</span>
                    </div>
                  )}
                  {Number(detail.discount) > 0 && (
                    <div style={S.totalRow}>
                      <span>할인</span>
                      <span>-{Number(detail.discount).toLocaleString('ko-KR')}원</span>
                    </div>
                  )}
                  <div style={{ ...S.totalRow, fontWeight: 700, fontSize: '15px', borderTop: `1px solid ${colors.neutral200}`, paddingTop: spacing.sm }}>
                    <span>총 금액</span>
                    <span style={{ color: colors.primary }}>{Number(detail.totalAmount).toLocaleString('ko-KR')}원</span>
                  </div>
                </div>
              </Section>

              {/* 배송 정보 */}
              {detail.shippingAddress && (
                <Section title="배송 정보">
                  <InfoRow label="수취인" value={detail.shippingAddress.recipientName} />
                  <InfoRow label="연락처" value={detail.shippingAddress.phone} />
                  <InfoRow label="주소" value={`${detail.shippingAddress.address1} ${detail.shippingAddress.address2 || ''}`} />
                  {detail.shippingAddress.memo && (
                    <InfoRow label="메모" value={detail.shippingAddress.memo} />
                  )}
                </Section>
              )}

              {/* 결제 이력 */}
              {detail.payments.length > 0 && (
                <Section title="결제 이력">
                  {detail.payments.map((p) => (
                    <div key={p.id} style={S.paymentCard}>
                      <div style={S.paymentRow}>
                        <span style={S.paymentLabel}>금액</span>
                        <span>{Number(p.amount).toLocaleString('ko-KR')}원</span>
                      </div>
                      <div style={S.paymentRow}>
                        <span style={S.paymentLabel}>상태</span>
                        <span>{PAYMENT_STATUS_LABEL[p.status] || p.status}</span>
                      </div>
                      {p.method && (
                        <div style={S.paymentRow}>
                          <span style={S.paymentLabel}>결제수단</span>
                          <span>{p.method}{p.cardCompany ? ` (${p.cardCompany})` : ''}</span>
                        </div>
                      )}
                      {p.approvedAt && (
                        <div style={S.paymentRow}>
                          <span style={S.paymentLabel}>승인일시</span>
                          <span>{new Date(p.approvedAt).toLocaleString('ko-KR')}</span>
                        </div>
                      )}
                      {Number(p.refundedAmount) > 0 && (
                        <div style={S.paymentRow}>
                          <span style={S.paymentLabel}>환불금액</span>
                          <span>{Number(p.refundedAmount).toLocaleString('ko-KR')}원</span>
                        </div>
                      )}
                      {p.refundReason && (
                        <div style={S.paymentRow}>
                          <span style={S.paymentLabel}>환불사유</span>
                          <span>{p.refundReason}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </Section>
              )}

              {/* 주문 이력 */}
              {detail.logs.length > 0 && (
                <Section title="주문 이력">
                  {detail.logs.map((log) => (
                    <div key={log.id} style={S.logEntry}>
                      <div style={S.logHeader}>
                        <span style={S.logAction}>{LOG_ACTION_LABEL[log.action] || log.action}</span>
                        <span style={S.logDate}>{new Date(log.createdAt).toLocaleString('ko-KR')}</span>
                      </div>
                      {log.message && <p style={S.logMessage}>{log.message}</p>}
                      <p style={S.logPerformer}>{log.performerType === 'operator' ? '운영자' : log.performerType}</p>
                    </div>
                  ))}
                </Section>
              )}
            </>
          ) : null}
        </div>

        {/* Footer / Actions */}
        {detail && actionType && (
          <div style={S.footer}>
            {!showActionForm ? (
              <button
                onClick={() => setShowActionForm(true)}
                style={actionType === 'cancel' ? S.cancelBtn : S.refundBtn}
              >
                {actionType === 'cancel' ? '주문 취소' : '환불 처리'}
              </button>
            ) : (
              <div style={S.actionForm}>
                <p style={S.actionFormLabel}>
                  {actionType === 'cancel' ? '취소 사유' : '환불 사유'}
                </p>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="사유를 입력해주세요"
                  rows={3}
                  style={S.textarea}
                />
                <div style={S.actionFormBtns}>
                  <button
                    onClick={() => { setShowActionForm(false); setActionReason(''); }}
                    style={S.actionCancelBtn}
                    disabled={actionLoading}
                  >
                    닫기
                  </button>
                  <button
                    onClick={() => handleAction(actionType)}
                    style={actionType === 'cancel' ? S.actionConfirmCancelBtn : S.actionConfirmRefundBtn}
                    disabled={actionLoading || !actionReason.trim()}
                  >
                    {actionLoading ? '처리 중...' : '확인'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Terminal status message */}
        {detail && !actionType && (
          <div style={S.footerReadonly}>
            <p style={{ margin: 0, fontSize: '13px', color: colors.neutral500 }}>
              {detail.status === 'cancelled' ? '취소된 주문입니다.' :
               detail.status === 'refunded' ? '환불 완료된 주문입니다.' :
               detail.status === 'paid' ? '' : ''}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Styles ── */
const S: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 999,
  },
  drawer: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: '480px',
    maxWidth: '100vw',
    height: '100vh',
    backgroundColor: colors.white,
    boxShadow: shadows.lg,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,

  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: `${spacing.lg} ${spacing.xl}`,
    borderBottom: `1px solid ${colors.neutral200}`,
    flexShrink: 0,
  } as React.CSSProperties,
  headerTitle: {
    ...typography.headingM,
    margin: 0,
    color: colors.neutral900,
  },
  headerSub: {
    margin: `4px 0 0`,
    fontSize: '13px',
    color: colors.neutral500,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.neutral500,
    padding: '4px',
    borderRadius: borderRadius.sm,
  },

  // Content
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: `${spacing.lg} ${spacing.xl}`,
  } as React.CSSProperties,

  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.headingS,
    margin: `0 0 ${spacing.sm}`,
    color: colors.neutral800,
    paddingBottom: spacing.xs,
    borderBottom: `1px solid ${colors.neutral100}`,
  },

  // InfoRow
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `6px 0`,
    fontSize: '13px',
  },
  infoLabel: {
    color: colors.neutral500,
    flexShrink: 0,
    marginRight: spacing.md,
  } as React.CSSProperties,
  infoValue: {
    color: colors.neutral900,
    textAlign: 'right',
  } as React.CSSProperties,

  // Items
  itemRow: {
    padding: `${spacing.sm} 0`,
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  itemName: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral800,
    marginBottom: '4px',
  },
  itemDetail: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: colors.neutral600,
  },
  totalArea: {
    marginTop: spacing.sm,
    padding: `${spacing.sm} 0`,
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: colors.neutral700,
    padding: '4px 0',
  },

  // Payment
  paymentCard: {
    padding: spacing.sm,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.neutral50,
  },
  paymentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    padding: '3px 0',
  },
  paymentLabel: {
    color: colors.neutral500,
  },

  // Logs
  logEntry: {
    padding: `${spacing.sm} 0`,
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logAction: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral800,
  },
  logDate: {
    fontSize: '12px',
    color: colors.neutral400,
  },
  logMessage: {
    margin: '4px 0 0',
    fontSize: '12px',
    color: colors.neutral600,
  },
  logPerformer: {
    margin: '2px 0 0',
    fontSize: '11px',
    color: colors.neutral400,
  },

  // States
  stateCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  } as React.CSSProperties,
  retryBtn: {
    marginTop: '12px',
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },

  // Footer
  footer: {
    padding: `${spacing.md} ${spacing.xl}`,
    borderTop: `1px solid ${colors.neutral200}`,
    flexShrink: 0,
  } as React.CSSProperties,
  footerReadonly: {
    padding: `${spacing.sm} ${spacing.xl}`,
    borderTop: `1px solid ${colors.neutral200}`,
    flexShrink: 0,
    textAlign: 'center',
  } as React.CSSProperties,

  // Action buttons
  cancelBtn: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ef4444',
    backgroundColor: '#FEE2E2',
    border: `1px solid #FECACA`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },
  refundBtn: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    fontWeight: 600,
    color: colors.accentYellow,
    backgroundColor: '#FEF3C7',
    border: `1px solid #FDE68A`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },

  // Action form
  actionForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.sm,
  } as React.CSSProperties,
  actionFormLabel: {
    margin: 0,
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral700,
  },
  textarea: {
    width: '100%',
    padding: spacing.sm,
    fontSize: '13px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  actionFormBtns: {
    display: 'flex',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  actionCancelBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral600,
    backgroundColor: colors.neutral100,
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },
  actionConfirmCancelBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },
  actionConfirmRefundBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: colors.accentYellow,
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },
};
