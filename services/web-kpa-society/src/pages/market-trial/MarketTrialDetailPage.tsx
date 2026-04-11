/**
 * MarketTrialDetailPage - 시범판매 개별 상세
 *
 * WO-MARKET-TRIAL-KPA-DETAIL-AND-FORUM-DEEP-LINK-V1
 *
 * 역할:
 * - Trial 운영 정보 요약 (제목, 상태, 공급자, 참여 목적, 대상, 보상, 일정, 참여현황)
 * - 해당 Trial에 연결된 포럼 게시글로 직접 이동 (deep link)
 * - 허브(/market-trial)로 복귀
 *
 * 포럼을 대체하지 않고, 포럼으로 가기 전 trial 이해를 돕는 운영 요약 화면.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTrialDetail, type TrialSummary } from '../../api/marketTrial';
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

  useEffect(() => {
    if (!id) return;
    const fetchTrial = async () => {
      try {
        const response = await getTrialDetail(id);
        if (response.success) {
          setTrial(response.data);
        } else {
          setError('시범판매를 찾을 수 없습니다.');
        }
      } catch {
        setError('정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrial();
  }, [id]);

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
              포럼 게시글 바로가기 →
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
