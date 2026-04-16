/**
 * MyParticipationsPage — 내가 참여한 시범판매
 *
 * WO-MARKET-TRIAL-PHASE2-PARTICIPANT-DASHBOARD-AND-SETTLEMENT-STATE-V1
 *
 * 구조:
 * 1. KPI 요약 (전체/선택대기/검토중/정산완료)
 * 2. 참여 목록 (정산 상태·선택값 포함)
 * 3. 참여 상세 드로어 (정산 계산 + 선택 UI)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getMyParticipations,
  getMyParticipationDetail,
  saveSettlementChoice,
  type MyParticipationSummary,
  type ParticipationInfoDetail,
  type TrialSummary,
  type SettlementStatus,
} from '../../api/marketTrial';
import { colors, borderRadius } from '../../styles/theme';

// ── 상태 표시 텍스트 ──
const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = {
  pending:          '정산 대기',
  choice_pending:   '선택 대기',
  choice_completed: '선택 완료',
  offline_review:   '운영 확인 중',
  offline_settled:  '정산 완료',
};

const SETTLEMENT_STATUS_COLOR: Record<SettlementStatus, { bg: string; text: string }> = {
  pending:          { bg: '#F1F5F9', text: '#64748B' },
  choice_pending:   { bg: '#FEF3C7', text: '#92400E' },
  choice_completed: { bg: '#DBEAFE', text: '#1E40AF' },
  offline_review:   { bg: '#EDE9FE', text: '#5B21B6' },
  offline_settled:  { bg: '#DCFCE7', text: '#166534' },
};

// ── KPI 카드 ──
function KpiCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{
      flex: 1,
      minWidth: '120px',
      padding: '16px',
      borderRadius: borderRadius.md,
      background: highlight ? '#EFF6FF' : colors.neutral50,
      border: `1px solid ${highlight ? '#BFDBFE' : colors.neutral200}`,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: highlight ? colors.primary : colors.neutral800 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.8125rem', color: colors.neutral500, marginTop: '4px' }}>{label}</div>
    </div>
  );
}

// ── 정산 상태 배지 ──
function SettlementBadge({ status }: { status: SettlementStatus }) {
  const { bg, text } = SETTLEMENT_STATUS_COLOR[status] ?? { bg: colors.neutral100, text: colors.neutral600 };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: 600,
      background: bg,
      color: text,
    }}>
      {SETTLEMENT_STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ── 금액 포맷 ──
function fmt(n: number | null | undefined) {
  if (n == null) return '–';
  return n.toLocaleString() + '원';
}

// ── 상세 드로어 ──
interface DetailDrawerProps {
  trialId: string;
  onClose: () => void;
  onChoiceSaved: () => void;
}

function DetailDrawer({ trialId, onClose, onChoiceSaved }: DetailDrawerProps) {
  const [detail, setDetail] = useState<(ParticipationInfoDetail & { trial?: TrialSummary }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getMyParticipationDetail(trialId).then((res) => {
      if (res.success) setDetail(res.data);
      setLoading(false);
    });
  }, [trialId]);

  const handleChoice = async (choice: 'product' | 'cash') => {
    if (!detail) return;
    setSaving(true);
    setMessage(null);
    const res = await saveSettlementChoice(trialId, choice);
    if (res.success && res.data) {
      setDetail((prev) => prev ? { ...prev, ...res.data } : prev);
      setMessage('선택이 저장되었습니다.');
      onChoiceSaved();
    } else {
      setMessage(res.message || '저장에 실패했습니다.');
    }
    setSaving(false);
  };

  const status = detail?.settlementStatus as SettlementStatus | undefined;
  const canChoose = status === 'choice_pending';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)',
    }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: '640px',
          background: '#fff',
          borderRadius: `${borderRadius.lg} ${borderRadius.lg} 0 0`,
          padding: '24px 24px 40px',
          maxHeight: '80vh', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: colors.neutral900 }}>
            참여 상세
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: colors.neutral400 }}>✕</button>
        </div>

        {loading && <p style={{ color: colors.neutral500, textAlign: 'center' }}>불러오는 중...</p>}

        {!loading && detail && (
          <>
            {/* Trial 정보 */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 600, color: colors.neutral800, marginBottom: '4px' }}>
                {detail.trial?.title ?? '–'}
              </div>
              <div style={{ fontSize: '0.875rem', color: colors.neutral500 }}>
                상태: {detail.trial?.status ?? '–'} &nbsp;|&nbsp; 공급자: {detail.trial?.supplierName ?? '–'}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: `1px solid ${colors.neutral100}`, margin: '16px 0' }} />

            {/* 정산 계산 */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 600, color: colors.neutral700, marginBottom: '12px', fontSize: '0.9375rem' }}>
                정산 계산
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  ['참여금', fmt(detail.contributionAmount)],
                  ['리워드', detail.rewardRate != null ? `+${detail.rewardRate}%` : '–'],
                  ['총 정산 기준 금액', fmt(detail.totalSettlementAmount)],
                  ['제품 단가', fmt(detail.trialUnitPrice)],
                  ['예상 제품 수량', detail.estimatedProductQty != null ? `${detail.estimatedProductQty}개` : '–'],
                  ['예상 잔액', fmt(detail.estimatedRemainder)],
                ].map(([label, value]) => (
                  <div key={label} style={{
                    background: colors.neutral50,
                    borderRadius: borderRadius.sm,
                    padding: '10px 14px',
                  }}>
                    <div style={{ fontSize: '0.75rem', color: colors.neutral500 }}>{label}</div>
                    <div style={{ fontWeight: 600, color: colors.neutral800, marginTop: '2px' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: `1px solid ${colors.neutral100}`, margin: '16px 0' }} />

            {/* 정산 상태 */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: colors.neutral700, fontSize: '0.9375rem' }}>정산 상태</span>
                {status && <SettlementBadge status={status} />}
              </div>
              {detail.settlementChoice && (
                <div style={{ marginTop: '8px', fontSize: '0.875rem', color: colors.neutral600 }}>
                  선택: <strong>{detail.settlementChoice === 'product' ? '제품 수령' : '금액 환급'}</strong>
                </div>
              )}
              {detail.settlementNote && (
                <div style={{ marginTop: '8px', fontSize: '0.8125rem', color: colors.neutral500 }}>
                  메모: {detail.settlementNote}
                </div>
              )}
            </div>

            {/* 선택 UI */}
            {canChoose && (
              <div style={{
                background: '#FFF7ED',
                border: '1px solid #FED7AA',
                borderRadius: borderRadius.md,
                padding: '16px',
                marginBottom: '16px',
              }}>
                <div style={{ fontWeight: 600, color: '#92400E', marginBottom: '12px', fontSize: '0.9375rem' }}>
                  정산 방식을 선택해 주세요
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => handleChoice('product')}
                    disabled={saving}
                    style={{
                      flex: 1, padding: '12px', borderRadius: borderRadius.md,
                      border: '2px solid #3B82F6', background: '#EFF6FF',
                      cursor: 'pointer', fontWeight: 600, color: '#1E40AF',
                      fontSize: '0.9375rem',
                    }}
                  >
                    제품 수령
                    {detail.estimatedProductQty != null && (
                      <div style={{ fontSize: '0.8125rem', fontWeight: 400, marginTop: '4px' }}>
                        약 {detail.estimatedProductQty}개 + 잔액 {fmt(detail.estimatedRemainder)}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => handleChoice('cash')}
                    disabled={saving}
                    style={{
                      flex: 1, padding: '12px', borderRadius: borderRadius.md,
                      border: '2px solid #10B981', background: '#ECFDF5',
                      cursor: 'pointer', fontWeight: 600, color: '#065F46',
                      fontSize: '0.9375rem',
                    }}
                  >
                    금액 환급
                    {detail.totalSettlementAmount != null && (
                      <div style={{ fontSize: '0.8125rem', fontWeight: 400, marginTop: '4px' }}>
                        총 {fmt(detail.totalSettlementAmount)}
                      </div>
                    )}
                  </button>
                </div>
              </div>
            )}

            {message && (
              <div style={{
                padding: '10px 14px', borderRadius: borderRadius.sm,
                background: '#DCFCE7', color: '#166534',
                fontSize: '0.875rem', marginBottom: '12px',
              }}>
                {message}
              </div>
            )}

            {/* 안내 문구 */}
            <div style={{
              fontSize: '0.8125rem', color: colors.neutral400,
              lineHeight: 1.6, borderTop: `1px solid ${colors.neutral100}`, paddingTop: '12px',
            }}>
              소액 차액은 추후 Neture Credit 또는 운영 정책에 따라 처리될 수 있습니다.<br />
              최종 정산 및 공급 관련 마감은 운영자/공급자 오프라인 절차로 진행됩니다.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── 메인 페이지 ──
export function MyParticipationsPage() {
  const [participations, setParticipations] = useState<MyParticipationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await getMyParticipations();
    if (res.success) setParticipations(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kpiTotal       = participations.length;
  const kpiChoicePending  = participations.filter((p) => p.settlementStatus === 'choice_pending').length;
  const kpiReview      = participations.filter((p) => p.settlementStatus === 'offline_review').length;
  const kpiSettled     = participations.filter((p) => p.settlementStatus === 'offline_settled').length;

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '32px 16px 64px' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/market-trial" style={{ fontSize: '0.875rem', color: colors.neutral500, textDecoration: 'none' }}>
          ← 시범판매 허브
        </Link>
        <h1 style={{ margin: '8px 0 4px', fontSize: '1.5rem', fontWeight: 700, color: colors.neutral900 }}>
          내가 참여한 시범판매
        </h1>
        <p style={{ margin: 0, color: colors.neutral500, fontSize: '0.9375rem' }}>
          참여 내역, 예상 정산 정보, 선택 현황을 확인합니다.
        </p>
      </div>

      {/* KPI */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <KpiCard label="전체 참여" value={kpiTotal} />
        <KpiCard label="선택 대기" value={kpiChoicePending} highlight={kpiChoicePending > 0} />
        <KpiCard label="운영 확인 중" value={kpiReview} />
        <KpiCard label="정산 완료" value={kpiSettled} />
      </div>

      {/* 목록 */}
      {loading && <p style={{ textAlign: 'center', color: colors.neutral400 }}>불러오는 중...</p>}

      {!loading && participations.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          background: colors.neutral50, borderRadius: borderRadius.lg,
          color: colors.neutral400,
        }}>
          참여한 시범판매가 없습니다.
          <div style={{ marginTop: '12px' }}>
            <Link to="/market-trial" style={{ color: colors.primary, fontWeight: 600, textDecoration: 'none' }}>
              시범판매 허브 →
            </Link>
          </div>
        </div>
      )}

      {!loading && participations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {participations.map((p) => {
            const status = p.settlementStatus as SettlementStatus;
            return (
              <div key={p.id} style={{
                background: '#fff',
                border: `1px solid ${colors.neutral200}`,
                borderRadius: borderRadius.md,
                padding: '16px 20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: colors.neutral800, marginBottom: '4px' }}>
                      {p.trial?.title ?? p.trialId}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: colors.neutral500 }}>
                      공급자: {p.trial?.supplierName ?? '–'} &nbsp;|&nbsp; 참여일: {new Date(p.joinedAt).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <SettlementBadge status={status} />
                </div>

                {/* 정산 요약 */}
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '16px',
                  marginTop: '12px', fontSize: '0.875rem',
                }}>
                  <span style={{ color: colors.neutral600 }}>
                    참여금 <strong style={{ color: colors.neutral800 }}>{fmt(p.contributionAmount)}</strong>
                  </span>
                  {p.rewardRate != null && p.rewardRate > 0 && (
                    <span style={{ color: '#7C3AED', fontWeight: 600 }}>리워드 +{p.rewardRate}%</span>
                  )}
                  {p.totalSettlementAmount != null && p.totalSettlementAmount > 0 && (
                    <span style={{ color: colors.neutral600 }}>
                      총 정산 <strong style={{ color: colors.neutral800 }}>{fmt(p.totalSettlementAmount)}</strong>
                    </span>
                  )}
                  {p.settlementChoice && (
                    <span style={{ color: colors.neutral500 }}>
                      선택: <strong>{p.settlementChoice === 'product' ? '제품' : '금액'}</strong>
                    </span>
                  )}
                </div>

                {/* 액션 */}
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedTrialId(p.trialId)}
                    style={{
                      padding: '6px 14px', borderRadius: borderRadius.sm,
                      border: `1px solid ${colors.neutral200}`, background: '#fff',
                      cursor: 'pointer', fontSize: '0.8125rem', color: colors.neutral700,
                    }}
                  >
                    상세 보기
                  </button>
                  {status === 'choice_pending' && (
                    <button
                      onClick={() => setSelectedTrialId(p.trialId)}
                      style={{
                        padding: '6px 14px', borderRadius: borderRadius.sm,
                        border: 'none', background: '#FEF3C7',
                        cursor: 'pointer', fontSize: '0.8125rem', color: '#92400E', fontWeight: 600,
                      }}
                    >
                      선택하기
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 상세 드로어 */}
      {selectedTrialId && (
        <DetailDrawer
          trialId={selectedTrialId}
          onClose={() => setSelectedTrialId(null)}
          onChoiceSaved={() => { fetchData(); }}
        />
      )}
    </div>
  );
}
