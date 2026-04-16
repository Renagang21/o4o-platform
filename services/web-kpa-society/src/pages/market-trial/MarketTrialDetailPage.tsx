/**
 * MarketTrialDetailPage - 시범판매 개별 상세
 *
 * WO-MARKET-TRIAL-KPA-DETAIL-AND-FORUM-DEEP-LINK-V1
 * WO-MARKET-TRIAL-PARTICIPATION-REQUEST-UI-V1
 *
 * 역할:
 * - Trial 운영 정보 요약 (제목, 상태, 공급자, 참여 목적, 대상, 보상, 일정, 참여현황)
 * - 참여 신청 UI (모집중 상태일 때 보상 선택 + 신청 버튼)
 * - 해당 Trial에 연결된 포럼 게시글로 직접 이동 (deep link)
 * - 허브(/market-trial)로 복귀
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getTrialDetail,
  getParticipation,
  joinTrial,
  type TrialSummary,
  type ParticipationInfo,
} from '../../api/marketTrial';
import { colors, borderRadius } from '../../styles/theme';

// ── 상태 라벨 ──

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  recruiting: { label: '모집중', bg: '#DCFCE7', color: '#166534' },
  development: { label: '진행중', bg: '#DBEAFE', color: '#1E40AF' },
  outcome_confirming: { label: '결과 확인중', bg: '#DBEAFE', color: '#1E40AF' },
  fulfilled: { label: '종료 (완료)', bg: '#F1F5F9', color: '#64748B' },
  closed: { label: '종료', bg: '#F1F5F9', color: '#64748B' },
};

const SERVICE_KEY_LABELS: Record<string, string> = {
  glycopharm: 'GlycoPharm',
  'k-cosmetics': 'K-Cosmetics',
  'kpa-society': 'KPA-a',
};

const REWARD_LABELS: Record<string, string> = {
  product: '제품 보상',
  cash: '현금 보상',
};

export function MarketTrialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [trial, setTrial] = useState<TrialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── 참여 상태 ──
  const [participation, setParticipation] = useState<ParticipationInfo | null>(null);
  const [selectedReward, setSelectedReward] = useState<'cash' | 'product' | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const [trialRes, partRes] = await Promise.all([
          getTrialDetail(id),
          getParticipation(id),
        ]);
        if (trialRes.success) {
          setTrial(trialRes.data);
          // 기본 보상 선택: rewardOptions가 하나뿐이면 자동 선택
          if (trialRes.data.rewardOptions?.length === 1) {
            setSelectedReward(trialRes.data.rewardOptions[0] as 'cash' | 'product');
          }
        } else {
          setError('시범판매를 찾을 수 없습니다.');
        }
        if (partRes.success && partRes.data) {
          setParticipation(partRes.data);
        }
      } catch {
        setError('정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ── 참여 신청 핸들러 ──
  const handleJoin = async () => {
    if (!id || !selectedReward || joinLoading) return;
    setJoinLoading(true);
    setJoinError(null);

    try {
      const res = await joinTrial(id, selectedReward);
      if (res.success && res.data) {
        setParticipation(res.data);
        setJoinSuccess(true);
        // 참여자 수 즉시 반영
        if (trial) {
          setTrial({ ...trial, currentParticipants: trial.currentParticipants + 1 });
        }
      } else {
        // 서버 에러 메시지 → 사용자 친화적 변환
        const msg = res.message || '참여 신청에 실패했습니다.';
        if (msg.includes('Already participated')) {
          setJoinError('이미 참여 신청한 시범판매입니다.');
        } else if (msg.includes('not accepting')) {
          setJoinError('현재 참여 신청을 받고 있지 않습니다.');
        } else if (msg.includes('maximum participants')) {
          setJoinError('참여 정원이 마감되었습니다.');
        } else if (msg.includes('Authentication')) {
          setJoinError('로그인이 필요합니다. 다시 로그인 후 시도해 주세요.');
        } else if (msg.includes('not available')) {
          setJoinError('선택한 보상 방식을 사용할 수 없습니다.');
        } else {
          setJoinError(msg);
        }
      }
    } catch {
      setJoinError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setJoinLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ color: colors.neutral400, fontSize: '0.875rem' }}>불러오는 중...</p>
      </div>
    );
  }

  if (error || !trial) {
    return (
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 16px', textAlign: 'center' }}>
        <p style={{ color: colors.neutral500, fontSize: '1rem', marginBottom: '16px' }}>
          {error || '시범판매를 찾을 수 없습니다.'}
        </p>
        <Link to="/market-trial" style={{ color: colors.primary, fontSize: '0.875rem', textDecoration: 'none' }}>
          ← 시범판매 허브로 돌아가기
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[trial.status] || { label: trial.status, bg: '#F1F5F9', color: '#64748B' };
  const serviceLabels = (trial.visibleServiceKeys || [])
    .map((k) => SERVICE_KEY_LABELS[k] || k)
    .filter(Boolean);
  const rewardLabels = (trial.rewardOptions || [])
    .map((r) => REWARD_LABELS[r] || r)
    .filter(Boolean);

  const isRecruiting = trial.status === 'recruiting';
  const isFull = trial.maxParticipants != null && trial.currentParticipants >= trial.maxParticipants;
  const hasJoined = participation != null || joinSuccess;

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 16px 64px' }}>

      {/* ── 상단 네비게이션 ── */}
      <nav style={{ marginBottom: '24px' }}>
        <Link
          to="/market-trial"
          style={{ fontSize: '0.8125rem', color: colors.neutral400, textDecoration: 'none' }}
        >
          ← 시범판매 허브
        </Link>
      </nav>

      {/* ── 헤더: 상태 + 제목 ── */}
      <header style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <span style={{
            padding: '3px 12px',
            backgroundColor: statusInfo.bg,
            color: statusInfo.color,
            borderRadius: '14px',
            fontSize: '0.8125rem',
            fontWeight: 600,
          }}>
            {statusInfo.label}
          </span>
          {trial.supplierName && (
            <span style={{ fontSize: '0.8125rem', color: colors.neutral400 }}>
              {trial.supplierName}
            </span>
          )}
          {serviceLabels.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
              {serviceLabels.map((label) => (
                <span key={label} style={{
                  padding: '2px 8px',
                  backgroundColor: colors.neutral100,
                  color: colors.neutral500,
                  borderRadius: '4px',
                  fontSize: '0.6875rem',
                  fontWeight: 500,
                }}>
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: colors.neutral900, margin: 0 }}>
          {trial.title}
        </h1>
      </header>

      {/* ── 설명 ── */}
      {trial.description && (
        <section style={{
          padding: '16px 20px',
          backgroundColor: colors.white,
          borderRadius: borderRadius.lg,
          border: `1px solid ${colors.neutral200}`,
          marginBottom: '20px',
        }}>
          <p style={{ fontSize: '0.9375rem', color: colors.neutral600, lineHeight: 1.7, margin: 0 }}>
            {trial.description}
          </p>
        </section>
      )}

      {/* ── 참여 목적 (outcomeSnapshot) ── */}
      {trial.outcomeSnapshot?.description && (
        <section style={{
          padding: '16px 20px',
          backgroundColor: '#F0FDF4',
          borderRadius: borderRadius.lg,
          border: '1px solid #BBF7D0',
          marginBottom: '20px',
        }}>
          <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>
            참여 목적
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#15803D', lineHeight: 1.6, margin: 0 }}>
            {trial.outcomeSnapshot.description}
          </p>
          {trial.outcomeSnapshot.note && (
            <p style={{ fontSize: '0.8125rem', color: '#166534', marginTop: '8px', margin: '8px 0 0 0', opacity: 0.8 }}>
              {trial.outcomeSnapshot.note}
            </p>
          )}
        </section>
      )}

      {/* ── 운영 정보 카드 ── */}
      <section style={{
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        border: `1px solid ${colors.neutral200}`,
        marginBottom: '20px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px',
          backgroundColor: colors.neutral50,
          borderBottom: `1px solid ${colors.neutral200}`,
        }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.neutral700, margin: 0 }}>
            운영 정보
          </h3>
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
              <InfoItem label="모집 시작" value={new Date(trial.startDate).toLocaleDateString()} />
            )}
            {trial.endDate && (
              <InfoItem label="모집 마감" value={new Date(trial.endDate).toLocaleDateString()} />
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

      {/* ── 펀딩 구조 — WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1 ── */}
      {(trial.targetAmount || (trial.rewardRate != null && trial.rewardRate > 0)) && (
        <section style={{
          backgroundColor: '#F5F3FF',
          borderRadius: borderRadius.lg,
          border: '1px solid #DDD6FE',
          padding: '16px 20px',
          marginBottom: '20px',
        }}>
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
          {trial.trialUnitPrice != null && trial.trialUnitPrice > 0 && trial.rewardRate != null && trial.rewardRate > 0 && (() => {
            const total = Math.round(trial.trialUnitPrice * (1 + trial.rewardRate / 100));
            const qty = Math.floor(total / trial.trialUnitPrice);
            const rem = total - qty * trial.trialUnitPrice;
            return (
              <div style={{
                marginTop: '12px',
                padding: '10px 14px',
                backgroundColor: '#EDE9FE',
                borderRadius: borderRadius.md,
                fontSize: '0.8125rem',
                color: '#4C1D95',
              }}>
                <strong>정산 예시</strong>: 단가 {trial.trialUnitPrice.toLocaleString()}원 참여 시
                → 총 {total.toLocaleString()}원 환원
                {qty > 0 && ` → 약 ${qty}개${rem > 0 ? ` + 잔액 ${rem.toLocaleString()}원` : ''}`}
              </div>
            );
          })()}
        </section>
      )}

      {/* ── 참여 신청 섹션 ── */}
      <section style={{
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        border: `1px solid ${hasJoined ? '#BBF7D0' : colors.neutral200}`,
        padding: '20px 24px',
        marginBottom: '20px',
      }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.neutral700, marginBottom: '12px' }}>
          참여 신청
        </h3>

        {/* A. 이미 참여함 */}
        {hasJoined && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              backgroundColor: '#F0FDF4',
              borderRadius: borderRadius.md,
              marginBottom: '12px',
            }}>
              <span style={{ fontSize: '1.125rem', color: '#166534' }}>&#10003;</span>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#166534', margin: 0 }}>
                  참여 신청 완료
                </p>
                <p style={{ fontSize: '0.8125rem', color: '#15803D', margin: '2px 0 0 0' }}>
                  보상 방식: {REWARD_LABELS[participation?.rewardType || selectedReward || ''] || '선택됨'}
                  {participation?.joinedAt && (
                    <> · 참여일: {new Date(participation.joinedAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>
            </div>
            {joinSuccess && (
              <p style={{ fontSize: '0.8125rem', color: colors.neutral500, lineHeight: 1.5, margin: 0 }}>
                참여 신청이 완료되었습니다. 포럼에서 다른 참여자들과 의견을 나눌 수 있습니다.
              </p>
            )}
          </div>
        )}

        {/* B. 모집중 — 신청 가능 */}
        {!hasJoined && isRecruiting && !isFull && (
          <div>
            <p style={{ fontSize: '0.8125rem', color: colors.neutral500, lineHeight: 1.5, marginBottom: '14px' }}>
              이 시범판매에 참여하시겠습니까? 보상 방식을 선택한 후 신청해 주세요.
            </p>

            {/* 보상 선택 */}
            {trial.rewardOptions.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                {trial.rewardOptions.map((opt) => {
                  const isSelected = selectedReward === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setSelectedReward(opt as 'cash' | 'product')}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: `2px solid ${isSelected ? colors.primary : colors.neutral200}`,
                        borderRadius: borderRadius.md,
                        backgroundColor: isSelected ? `${colors.primary}0D` : colors.white,
                        color: isSelected ? colors.primary : colors.neutral600,
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

            {/* 에러 메시지 */}
            {joinError && (
              <p style={{
                fontSize: '0.8125rem',
                color: '#DC2626',
                backgroundColor: '#FEF2F2',
                padding: '8px 12px',
                borderRadius: borderRadius.md,
                marginBottom: '12px',
              }}>
                {joinError}
              </p>
            )}

            {/* 신청 버튼 */}
            <button
              onClick={handleJoin}
              disabled={!selectedReward || joinLoading}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: !selectedReward || joinLoading ? colors.neutral300 : '#16A34A',
                color: colors.white,
                borderRadius: borderRadius.md,
                fontSize: '0.875rem',
                fontWeight: 600,
                border: 'none',
                cursor: !selectedReward || joinLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              {joinLoading ? '신청 중...' : selectedReward ? '시범판매 참여 신청' : '보상 방식을 선택해 주세요'}
            </button>
          </div>
        )}

        {/* C. 정원 마감 */}
        {!hasJoined && isRecruiting && isFull && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#FEF3C7',
            borderRadius: borderRadius.md,
          }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#92400E', margin: 0 }}>
              참여 정원이 마감되었습니다. ({trial.currentParticipants} / {trial.maxParticipants}명)
            </p>
          </div>
        )}

        {/* D. 모집중이 아님 */}
        {!hasJoined && !isRecruiting && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: colors.neutral50,
            borderRadius: borderRadius.md,
          }}>
            <p style={{ fontSize: '0.875rem', color: colors.neutral500, margin: 0 }}>
              현재는 참여 신청을 받고 있지 않습니다. (상태: {statusInfo.label})
            </p>
          </div>
        )}
      </section>

      {/* ── 포럼 연결 ── */}
      <section style={{
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        border: `1px solid ${colors.neutral200}`,
        padding: '20px 24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.neutral700, marginBottom: '8px' }}>
          시범판매 포럼
        </h3>
        {trial.forumPostId ? (
          <>
            <p style={{ fontSize: '0.8125rem', color: colors.neutral500, lineHeight: 1.5, marginBottom: '14px' }}>
              이 시범판매에 대한 토론, 후기, 운영 공지는 포럼 게시글에서 확인할 수 있습니다.
            </p>
            <Link
              to={`/forum/post/${trial.forumPostId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '10px 20px',
                backgroundColor: colors.primary,
                color: colors.white,
                borderRadius: borderRadius.md,
                fontSize: '0.8125rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              포럼에서 의견 보기 →
            </Link>
          </>
        ) : (
          <>
            <p style={{ fontSize: '0.8125rem', color: colors.neutral400, lineHeight: 1.5, marginBottom: '14px' }}>
              포럼 게시글이 아직 연결되지 않았습니다. 운영자 승인 후 자동으로 생성됩니다.
            </p>
            <Link
              to="/forum?category=kpa-a-market-trial"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '10px 20px',
                backgroundColor: colors.neutral100,
                color: colors.neutral600,
                borderRadius: borderRadius.md,
                fontSize: '0.8125rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              시범판매 포럼 카테고리 →
            </Link>
          </>
        )}
      </section>

      {/* ── 하단: 허브 복귀 ── */}
      <div style={{ textAlign: 'center' }}>
        <Link
          to="/market-trial"
          style={{
            fontSize: '0.8125rem',
            color: colors.neutral400,
            textDecoration: 'none',
          }}
        >
          ← 시범판매 허브로 돌아가기
        </Link>
      </div>
    </div>
  );
}

// ── 유틸 컴포넌트 ──

function InfoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px 24px',
    }}>
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ fontSize: '0.75rem', color: colors.neutral400, marginBottom: '2px' }}>{label}</dt>
      <dd style={{ fontSize: '0.875rem', color: colors.neutral800, fontWeight: 500, margin: 0 }}>{value}</dd>
    </div>
  );
}
