/**
 * MarketTrialDetailPage — Neture 시범판매 상세
 *
 * WO-NETURE-MARKET-TRIAL-PARTICIPANT-PAGES-V1
 * KPA-Society MarketTrialDetailPage.tsx → Neture canonical 이식
 *
 * 역할:
 * - Trial 운영 정보 요약 (제목/상태/공급자/목적/보상/일정/펀딩)
 * - 참여 신청 UI (모집중일 때 보상 선택 + 신청 버튼)
 * - 비로그인 시 로그인 유도, 로그인 후 redirect
 * - 허브(/market-trial)로 복귀
 */

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getTrial,
  getParticipation,
  joinTrial,
  type Trial,
  type ParticipationInfo,
} from '../../api/trial';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: '초안', bg: '#F3F4F6', color: '#6B7280' },
  submitted: { label: '검토 중', bg: '#FEF3C7', color: '#92400E' },
  approved: { label: '승인됨', bg: '#DBEAFE', color: '#1E40AF' },
  recruiting: { label: '모집중', bg: '#DCFCE7', color: '#166534' },
  development: { label: '진행중', bg: '#DBEAFE', color: '#1E40AF' },
  outcome_confirming: { label: '결과 확인중', bg: '#DBEAFE', color: '#1E40AF' },
  fulfilled: { label: '종료 (완료)', bg: '#F3F4F6', color: '#6B7280' },
  closed: { label: '종료', bg: '#F3F4F6', color: '#6B7280' },
};

const SERVICE_KEY_LABELS: Record<string, string> = {
  glycopharm: 'GlycoPharm',
  'k-cosmetics': 'K-Cosmetics',
  'kpa-society': 'KPA-a',
  neture: 'Neture',
};

const REWARD_LABELS: Record<string, string> = {
  product: '제품 보상',
  cash: '현금 보상',
};

export function MarketTrialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [trial, setTrial] = useState<Trial | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [participation, setParticipation] = useState<ParticipationInfo | null>(null);
  const [selectedReward, setSelectedReward] = useState<'cash' | 'product' | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    const fetchData = async () => {
      try {
        const trialData = await getTrial(id);
        if (!active) return;
        setTrial(trialData);
        if (trialData.rewardOptions?.length === 1) {
          setSelectedReward(trialData.rewardOptions[0] as 'cash' | 'product');
        }

        if (isAuthenticated) {
          const partData = await getParticipation(id).catch(() => null);
          if (active && partData) setParticipation(partData);
        }
      } catch {
        if (active) setError('시범판매를 찾을 수 없습니다.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      active = false;
    };
  }, [id, isAuthenticated]);

  const handleJoin = async () => {
    if (!id || !selectedReward || joinLoading) return;
    if (!isAuthenticated) {
      navigate(`/login?redirect=/market-trial/${id}`);
      return;
    }
    setJoinLoading(true);
    setJoinError(null);
    try {
      const res = await joinTrial(id, selectedReward);
      if (res?.id) {
        setParticipation({
          id: res.id,
          trialId: res.trialId,
          participantId: res.userId,
          role: '',
          rewardType: res.rewardType,
          rewardStatus: res.rewardStatus,
          joinedAt: res.createdAt,
        });
        setJoinSuccess(true);
        if (trial) {
          setTrial({ ...trial, currentParticipants: trial.currentParticipants + 1 });
        }
      } else {
        setJoinError('참여 신청에 실패했습니다.');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string }; status?: number } };
      const msg = e?.response?.data?.message || '';
      const status = e?.response?.status;
      if (status === 401) {
        navigate(`/login?redirect=/market-trial/${id}`);
        return;
      }
      if (msg.includes('Already participated')) {
        setJoinError('이미 참여 신청한 시범판매입니다.');
      } else if (msg.includes('not accepting')) {
        setJoinError('현재 참여 신청을 받고 있지 않습니다.');
      } else if (msg.includes('maximum participants')) {
        setJoinError('참여 정원이 마감되었습니다.');
      } else if (msg.includes('not available')) {
        setJoinError('선택한 보상 방식을 사용할 수 없습니다.');
      } else if (msg) {
        setJoinError(msg);
      } else {
        setJoinError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setJoinLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={s.centered}>
        <p style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>불러오는 중...</p>
      </div>
    );
  }

  if (error || !trial) {
    return (
      <div style={s.centered}>
        <p style={{ color: '#6B7280', fontSize: '1rem', marginBottom: '16px' }}>
          {error || '시범판매를 찾을 수 없습니다.'}
        </p>
        <Link to="/market-trial" style={{ color: '#10B981', fontSize: '0.875rem', textDecoration: 'none' }}>
          ← 시범판매 허브로 돌아가기
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[trial.status] || { label: trial.status, bg: '#F3F4F6', color: '#6B7280' };
  const serviceLabels = (trial.visibleServiceKeys || [])
    .map((k) => SERVICE_KEY_LABELS[k] || k)
    .filter(Boolean);
  const rewardOptions = trial.rewardOptions || [];
  const rewardLabels = rewardOptions.map((r) => REWARD_LABELS[r] || r).filter(Boolean);

  const isRecruiting = trial.status === 'recruiting';
  const isFull = trial.maxParticipants != null && trial.currentParticipants >= trial.maxParticipants;
  const hasJoined = participation != null || joinSuccess;

  return (
    <div style={s.container}>
      {/* 상단 네비게이션 */}
      <nav style={{ marginBottom: '24px' }}>
        <Link to="/market-trial" style={s.breadcrumb}>
          ← 시범판매 허브
        </Link>
      </nav>

      {/* 헤더 */}
      <header style={{ marginBottom: '28px' }}>
        <div style={s.headerTopRow}>
          <span
            style={{
              padding: '3px 12px',
              backgroundColor: statusInfo.bg,
              color: statusInfo.color,
              borderRadius: '14px',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            {statusInfo.label}
          </span>
          {trial.supplierName && (
            <span style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>{trial.supplierName}</span>
          )}
          {serviceLabels.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
              {serviceLabels.map((label) => (
                <span key={label} style={s.serviceTag}>{label}</span>
              ))}
            </div>
          )}
        </div>
        <h1 style={s.title}>{trial.title}</h1>
      </header>

      {/* 설명 */}
      {trial.description && (
        <section style={s.descBox}>
          <p style={{ fontSize: '0.9375rem', color: '#4B5563', lineHeight: 1.7, margin: 0 }}>
            {trial.description}
          </p>
        </section>
      )}

      {/* 참여 목적 */}
      {trial.outcomeSnapshot?.description && (
        <section style={s.outcomeBox}>
          <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>
            참여 목적
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#15803D', lineHeight: 1.6, margin: 0 }}>
            {trial.outcomeSnapshot.description}
          </p>
          {trial.outcomeSnapshot.note && (
            <p style={{ fontSize: '0.8125rem', color: '#166534', margin: '8px 0 0 0', opacity: 0.8 }}>
              {trial.outcomeSnapshot.note}
            </p>
          )}
        </section>
      )}

      {/* 운영 정보 */}
      <section style={s.cardBox}>
        <div style={s.cardHeader}>
          <h3 style={s.cardHeaderText}>운영 정보</h3>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <InfoGrid>
            <InfoItem label="상태" value={statusInfo.label} />
            {trial.supplierName && <InfoItem label="공급자" value={trial.supplierName} />}
            <InfoItem
              label="참여 현황"
              value={`${trial.currentParticipants}${trial.maxParticipants ? ` / ${trial.maxParticipants}` : ''}명`}
            />
            {trial.startDate && (
              <InfoItem label="모집 시작" value={new Date(trial.startDate).toLocaleDateString('ko-KR')} />
            )}
            {trial.endDate && (
              <InfoItem label="모집 마감" value={new Date(trial.endDate).toLocaleDateString('ko-KR')} />
            )}
            {trial.trialPeriodDays != null && (
              <InfoItem label="체험 기간" value={`${trial.trialPeriodDays}일`} />
            )}
            {rewardLabels.length > 0 && (
              <InfoItem label="보상 방식" value={rewardLabels.join(', ')} />
            )}
            {serviceLabels.length > 0 && (
              <InfoItem label="참여 서비스" value={serviceLabels.join(', ')} />
            )}
          </InfoGrid>
        </div>
      </section>

      {/* 펀딩 구조 */}
      {(trial.targetAmount || (trial.rewardRate != null && trial.rewardRate > 0)) && (
        <section style={s.fundingBox}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#5B21B6', marginBottom: '12px' }}>
            펀딩 구조
          </h3>
          <InfoGrid>
            {trial.targetAmount != null && trial.targetAmount > 0 && (
              <InfoItem label="목표 금액" value={`${trial.targetAmount.toLocaleString()}원`} />
            )}
            {trial.currentAmount != null && trial.currentAmount > 0 && (
              <InfoItem label="현재 모집" value={`${trial.currentAmount.toLocaleString()}원`} />
            )}
            {trial.amountRate != null && (
              <InfoItem label="달성률" value={`${trial.amountRate}%`} />
            )}
            {trial.trialUnitPrice != null && trial.trialUnitPrice > 0 && (
              <InfoItem label="제품 단가" value={`${trial.trialUnitPrice.toLocaleString()}원`} />
            )}
            {trial.rewardRate != null && trial.rewardRate > 0 && (
              <InfoItem label="리워드" value={`+${trial.rewardRate}%`} />
            )}
          </InfoGrid>
          {trial.trialUnitPrice != null &&
            trial.trialUnitPrice > 0 &&
            trial.rewardRate != null &&
            trial.rewardRate > 0 &&
            (() => {
              const unit = trial.trialUnitPrice;
              const rate = trial.rewardRate;
              const total = Math.round(unit * (1 + rate / 100));
              const qty = Math.floor(total / unit);
              const rem = total - qty * unit;
              return (
                <div style={s.exampleBox}>
                  <strong>정산 예시</strong>: 단가 {unit.toLocaleString()}원 참여 시
                  → 총 {total.toLocaleString()}원 환원
                  {qty > 0 && ` → 약 ${qty}개${rem > 0 ? ` + 잔액 ${rem.toLocaleString()}원` : ''}`}
                </div>
              );
            })()}
        </section>
      )}

      {/* 참여 신청 */}
      <section
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: `1px solid ${hasJoined ? '#BBF7D0' : '#E5E7EB'}`,
          padding: '20px 24px',
          marginBottom: '20px',
        }}
      >
        <h3 style={s.cardHeaderText}>참여 신청</h3>

        {hasJoined && (
          <div>
            <div style={s.joinedBox}>
              <span style={{ fontSize: '1.125rem', color: '#166534' }}>✓</span>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534', margin: 0 }}>
                  참여 신청 완료
                </p>
                <p style={{ fontSize: '0.8125rem', color: '#15803D', margin: '2px 0 0 0' }}>
                  보상 방식: {REWARD_LABELS[participation?.rewardType || selectedReward || ''] || '선택됨'}
                  {participation?.joinedAt && (
                    <> · 참여일: {new Date(participation.joinedAt).toLocaleDateString('ko-KR')}</>
                  )}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <Link to="/market-trial/my" style={s.detailCta}>
                내 참여 내역으로 →
              </Link>
            </div>
          </div>
        )}

        {!hasJoined && isRecruiting && !isFull && (
          <div>
            <p style={{ fontSize: '0.8125rem', color: '#6B7280', lineHeight: 1.5, marginBottom: '14px' }}>
              {isAuthenticated
                ? '이 시범판매에 참여하시겠습니까? 보상 방식을 선택한 후 신청해 주세요.'
                : '참여 신청은 로그인이 필요합니다. 신청 버튼을 누르면 로그인 화면으로 이동합니다.'}
            </p>

            {rewardOptions.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                {rewardOptions.map((opt) => {
                  const isSelected = selectedReward === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelectedReward(opt as 'cash' | 'product')}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: `2px solid ${isSelected ? '#10B981' : '#E5E7EB'}`,
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#ECFDF5' : '#FFFFFF',
                        color: isSelected ? '#047857' : '#4B5563',
                        fontSize: '0.8125rem',
                        fontWeight: isSelected ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {REWARD_LABELS[opt] || opt}
                    </button>
                  );
                })}
              </div>
            )}

            {joinError && (
              <p style={s.joinError}>{joinError}</p>
            )}

            <button
              type="button"
              onClick={handleJoin}
              disabled={!selectedReward || joinLoading}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: !selectedReward || joinLoading ? '#D1D5DB' : '#10B981',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: 'none',
                cursor: !selectedReward || joinLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              {joinLoading
                ? '신청 중...'
                : !isAuthenticated
                ? '로그인하고 참여하기'
                : selectedReward
                ? '시범판매 참여 신청'
                : '보상 방식을 선택해 주세요'}
            </button>
          </div>
        )}

        {!hasJoined && isRecruiting && isFull && (
          <div style={s.warnBox}>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#92400E', margin: 0 }}>
              참여 정원이 마감되었습니다. ({trial.currentParticipants} / {trial.maxParticipants}명)
            </p>
          </div>
        )}

        {!hasJoined && !isRecruiting && (
          <div style={s.infoBox}>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>
              현재는 참여 신청을 받고 있지 않습니다. (상태: {statusInfo.label})
            </p>
          </div>
        )}
      </section>

      {/* 하단: 허브 복귀 */}
      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <Link to="/market-trial" style={{ fontSize: '0.8125rem', color: '#9CA3AF', textDecoration: 'none' }}>
          ← 시범판매 허브로 돌아가기
        </Link>
      </div>
    </div>
  );
}

export default MarketTrialDetailPage;

// ── 유틸 컴포넌트 ──

function InfoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px 24px',
      }}
    >
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '2px' }}>{label}</dt>
      <dd style={{ fontSize: '0.875rem', color: '#1F2937', fontWeight: 500, margin: 0 }}>{value}</dd>
    </div>
  );
}

// ── Styles ──

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: '760px', margin: '0 auto', padding: '32px 16px 64px' },
  centered: { maxWidth: '760px', margin: '0 auto', padding: '48px 16px', textAlign: 'center' },
  breadcrumb: { fontSize: '0.8125rem', color: '#9CA3AF', textDecoration: 'none' },
  headerTopRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' },
  serviceTag: {
    padding: '2px 8px',
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
    borderRadius: '4px',
    fontSize: '0.6875rem',
    fontWeight: 500,
  },
  title: { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 },

  descBox: {
    padding: '16px 20px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    marginBottom: '20px',
  },
  outcomeBox: {
    padding: '16px 20px',
    backgroundColor: '#F0FDF4',
    borderRadius: '12px',
    border: '1px solid #BBF7D0',
    marginBottom: '20px',
  },
  cardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    marginBottom: '20px',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '14px 20px',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
  },
  cardHeaderText: { fontSize: '0.875rem', fontWeight: 600, color: '#374151', margin: 0, marginBottom: '12px' },

  fundingBox: {
    backgroundColor: '#F5F3FF',
    borderRadius: '12px',
    border: '1px solid #DDD6FE',
    padding: '16px 20px',
    marginBottom: '20px',
  },
  exampleBox: {
    marginTop: '12px',
    padding: '10px 14px',
    backgroundColor: '#EDE9FE',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    color: '#4C1D95',
  },

  joinedBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#F0FDF4',
    borderRadius: '8px',
  },
  detailCta: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#7C3AED',
    textDecoration: 'none',
  },

  joinError: {
    fontSize: '0.8125rem',
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    padding: '8px 12px',
    borderRadius: '8px',
    marginBottom: '12px',
  },

  warnBox: { padding: '12px 16px', backgroundColor: '#FEF3C7', borderRadius: '8px' },
  infoBox: { padding: '12px 16px', backgroundColor: '#F9FAFB', borderRadius: '8px' },
};
