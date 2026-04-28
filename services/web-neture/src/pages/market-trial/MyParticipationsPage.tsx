/**
 * MyParticipationsPage — Neture 내 유통 참여형 펀딩(Market Trial) 참여 내역
 *
 * WO-NETURE-MARKET-TRIAL-PARTICIPANT-PAGES-V1
 * KPA-Society MyParticipationsPage.tsx → Neture canonical 이식
 *
 * 구조:
 * 1. KPI 요약 (전체 / 선택 대기 / 검토중 / 정산 완료)
 * 2. 참여 목록 (정산 상태 / 선택값 표시)
 * 3. 상세 드로어 (정산 계산 + 제품/현금 선택 UI)
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getMyParticipations,
  getMyParticipationDetail,
  saveSettlementChoice,
  type MyParticipationSummary,
  type ParticipationInfoDetail,
  type SettlementStatus,
} from '../../api/trial';
import { useAuth } from '../../contexts/AuthContext';

const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = {
  pending: '정산 대기',
  choice_pending: '선택 대기',
  choice_completed: '선택 완료',
  offline_review: '운영 확인 중',
  offline_settled: '정산 완료',
};

const SETTLEMENT_STATUS_COLOR: Record<SettlementStatus, { bg: string; text: string }> = {
  pending: { bg: '#F3F4F6', text: '#6B7280' },
  choice_pending: { bg: '#FEF3C7', text: '#92400E' },
  choice_completed: { bg: '#DBEAFE', text: '#1E40AF' },
  offline_review: { bg: '#EDE9FE', text: '#5B21B6' },
  offline_settled: { bg: '#DCFCE7', text: '#166534' },
};

function fmt(n: number | null | undefined) {
  if (n == null) return '–';
  return n.toLocaleString() + '원';
}

function KpiCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: '120px',
        padding: '16px',
        borderRadius: '8px',
        background: highlight ? '#EFF6FF' : '#F9FAFB',
        border: `1px solid ${highlight ? '#BFDBFE' : '#E5E7EB'}`,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: highlight ? '#10B981' : '#1F2937' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function SettlementBadge({ status }: { status: SettlementStatus }) {
  const { bg, text } = SETTLEMENT_STATUS_COLOR[status] ?? { bg: '#F3F4F6', text: '#4B5563' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: bg,
        color: text,
      }}
    >
      {SETTLEMENT_STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ── Detail Drawer ──

interface DetailDrawerProps {
  trialId: string;
  onClose: () => void;
  onChoiceSaved: () => void;
}

function DetailDrawer({ trialId, onClose, onChoiceSaved }: DetailDrawerProps) {
  const [detail, setDetail] = useState<ParticipationInfoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    getMyParticipationDetail(trialId)
      .then((d) => {
        if (active) setDetail(d);
      })
      .catch(() => {
        if (active) setMessage({ kind: 'err', text: '상세 정보를 불러오지 못했습니다.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [trialId]);

  const handleChoice = async (choice: 'product' | 'cash') => {
    if (!detail || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await saveSettlementChoice(trialId, choice);
      setDetail((prev) => (prev ? { ...prev, ...updated } : prev));
      setMessage({ kind: 'ok', text: '선택이 저장되었습니다.' });
      onChoiceSaved();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setMessage({ kind: 'err', text: e?.response?.data?.message || '저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const status = detail?.settlementStatus as SettlementStatus | undefined;
  const canChoose = status === 'choice_pending';
  const trial = (detail as MyParticipationSummary | null)?.trial;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          background: '#FFFFFF',
          borderRadius: '12px 12px 0 0',
          padding: '24px 24px 40px',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>참여 상세</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#9CA3AF' }}
          >
            ✕
          </button>
        </div>

        {loading && <p style={{ color: '#6B7280', textAlign: 'center' }}>불러오는 중...</p>}

        {!loading && detail && (
          <>
            {trial && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontWeight: 600, color: '#1F2937', marginBottom: '4px' }}>
                  {trial.title ?? '–'}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                  상태: {trial.status ?? '–'} &nbsp;|&nbsp; 공급자: {trial.supplierName ?? '–'}
                </div>
              </div>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid #F3F4F6', margin: '16px 0' }} />

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 600, color: '#374151', marginBottom: '12px', fontSize: '0.9375rem' }}>
                정산 계산
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {([
                  ['참여금', fmt(detail.contributionAmount)],
                  ['리워드', detail.rewardRate != null ? `+${detail.rewardRate}%` : '–'],
                  ['총 정산 기준 금액', fmt(detail.totalSettlementAmount)],
                  ['제품 단가', fmt(detail.trialUnitPrice)],
                  ['예상 제품 수량', detail.estimatedProductQty != null ? `${detail.estimatedProductQty}개` : '–'],
                  ['예상 잔액', fmt(detail.estimatedRemainder)],
                ] as Array<[string, string]>).map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      background: '#F9FAFB',
                      borderRadius: '6px',
                      padding: '10px 14px',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{label}</div>
                    <div style={{ fontWeight: 600, color: '#1F2937', marginTop: '2px' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #F3F4F6', margin: '16px 0' }} />

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.9375rem' }}>정산 상태</span>
                {status && <SettlementBadge status={status} />}
              </div>
              {detail.settlementChoice && (
                <div style={{ marginTop: '8px', fontSize: '0.875rem', color: '#4B5563' }}>
                  선택: <strong>{detail.settlementChoice === 'product' ? '제품 수령' : '금액 환급'}</strong>
                </div>
              )}
              {detail.settlementNote && (
                <div style={{ marginTop: '8px', fontSize: '0.8125rem', color: '#6B7280' }}>
                  메모: {detail.settlementNote}
                </div>
              )}
            </div>

            {canChoose && (
              <div
                style={{
                  background: '#FFF7ED',
                  border: '1px solid #FED7AA',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontWeight: 600, color: '#92400E', marginBottom: '12px', fontSize: '0.9375rem' }}>
                  정산 방식을 선택해 주세요
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => handleChoice('product')}
                    disabled={saving}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid #3B82F6',
                      background: '#EFF6FF',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      color: '#1E40AF',
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
                    type="button"
                    onClick={() => handleChoice('cash')}
                    disabled={saving}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid #10B981',
                      background: '#ECFDF5',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      color: '#065F46',
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
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: message.kind === 'ok' ? '#DCFCE7' : '#FEF2F2',
                  color: message.kind === 'ok' ? '#166534' : '#DC2626',
                  fontSize: '0.875rem',
                  marginBottom: '12px',
                }}
              >
                {message.text}
              </div>
            )}

            <div
              style={{
                fontSize: '0.8125rem',
                color: '#9CA3AF',
                lineHeight: 1.6,
                borderTop: '1px solid #F3F4F6',
                paddingTop: '12px',
              }}
            >
              소액 차액은 추후 운영 정책에 따라 처리될 수 있습니다.<br />
              최종 정산 및 공급 관련 마감은 운영자/공급자 절차로 진행됩니다.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──

export function MyParticipationsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [participations, setParticipations] = useState<MyParticipationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyParticipations();
      setParticipations(data);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e?.response?.status === 401) {
        navigate('/login?redirect=/market-trial/my');
        return;
      }
      setError('내 참여 내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login?redirect=/market-trial/my');
      return;
    }
    fetchData();
  }, [isAuthenticated, authLoading, navigate, fetchData]);

  const kpiTotal = participations.length;
  const kpiChoicePending = participations.filter((p) => p.settlementStatus === 'choice_pending').length;
  const kpiReview = participations.filter((p) => p.settlementStatus === 'offline_review').length;
  const kpiSettled = participations.filter((p) => p.settlementStatus === 'offline_settled').length;

  if (authLoading || (loading && !error)) {
    return (
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ color: '#9CA3AF' }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '32px 16px 64px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/market-trial" style={{ fontSize: '0.875rem', color: '#6B7280', textDecoration: 'none' }}>
          ← 유통 참여형 펀딩 허브
        </Link>
        <h1 style={{ margin: '8px 0 4px', fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
          내가 참여한 유통 참여형 펀딩
        </h1>
        <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9375rem' }}>
          참여 내역, 예상 정산 정보, 선택 현황을 확인합니다.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
        <KpiCard label="전체 참여" value={kpiTotal} />
        <KpiCard label="선택 대기" value={kpiChoicePending} highlight={kpiChoicePending > 0} />
        <KpiCard label="운영 확인 중" value={kpiReview} />
        <KpiCard label="정산 완료" value={kpiSettled} />
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: '#FEF2F2',
            color: '#DC2626',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && participations.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: '#F9FAFB',
            borderRadius: '12px',
            color: '#9CA3AF',
          }}
        >
          참여한 유통 참여형 펀딩이 없습니다.
          <div style={{ marginTop: '12px' }}>
            <Link to="/market-trial" style={{ color: '#10B981', fontWeight: 600, textDecoration: 'none' }}>
              유통 참여형 펀딩 허브 →
            </Link>
          </div>
        </div>
      )}

      {!loading && participations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {participations.map((p) => {
            const status = p.settlementStatus as SettlementStatus;
            return (
              <div
                key={p.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  padding: '16px 20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#1F2937', marginBottom: '4px' }}>
                      {p.trial?.title ?? p.trialId}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                      공급자: {p.trial?.supplierName ?? '–'} &nbsp;|&nbsp; 참여일:{' '}
                      {new Date(p.joinedAt).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <SettlementBadge status={status} />
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginTop: '12px',
                    fontSize: '0.875rem',
                  }}
                >
                  <span style={{ color: '#4B5563' }}>
                    참여금 <strong style={{ color: '#1F2937' }}>{fmt(p.contributionAmount)}</strong>
                  </span>
                  {p.rewardRate != null && p.rewardRate > 0 && (
                    <span style={{ color: '#7C3AED', fontWeight: 600 }}>리워드 +{p.rewardRate}%</span>
                  )}
                  {p.totalSettlementAmount != null && p.totalSettlementAmount > 0 && (
                    <span style={{ color: '#4B5563' }}>
                      총 정산 <strong style={{ color: '#1F2937' }}>{fmt(p.totalSettlementAmount)}</strong>
                    </span>
                  )}
                  {p.settlementChoice && (
                    <span style={{ color: '#6B7280' }}>
                      선택: <strong>{p.settlementChoice === 'product' ? '제품' : '금액'}</strong>
                    </span>
                  )}
                </div>

                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedTrialId(p.trialId)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #E5E7EB',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      color: '#374151',
                    }}
                  >
                    상세 보기
                  </button>
                  {status === 'choice_pending' && (
                    <button
                      type="button"
                      onClick={() => setSelectedTrialId(p.trialId)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#FEF3C7',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        color: '#92400E',
                        fontWeight: 600,
                      }}
                    >
                      선택하기
                    </button>
                  )}
                  <Link
                    to={`/market-trial/${p.trialId}`}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.8125rem',
                      color: '#10B981',
                      textDecoration: 'none',
                      fontWeight: 500,
                      alignSelf: 'center',
                    }}
                  >
                    Trial 보기 →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTrialId && (
        <DetailDrawer
          trialId={selectedTrialId}
          onClose={() => setSelectedTrialId(null)}
          onChoiceSaved={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}

export default MyParticipationsPage;
