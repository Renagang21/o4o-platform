/**
 * MarketTrialHubPage - 시범판매 운영 허브
 *
 * WO-MARKET-TRIAL-SERVICE-ENTRY-BANNER-AND-GATEWAY-V1: 초기 구현
 * WO-MARKET-TRIAL-KPA-TRIAL-HUB-REFINE-V1: 운영형 허브로 정비
 * WO-MARKET-TRIAL-KPA-DETAIL-AND-FORUM-DEEP-LINK-V1: 상세/포럼 액션 분리
 * WO-MARKET-TRIAL-MY-PARTICIPATION-STATUS-V1: 내 참여 상태 표시
 *
 * 구조:
 * 1. 헤더 + 허브 설명
 * 2. 참여 안내 (3단 흐름)
 * 3. 내가 참여한 시범판매 섹션 (로그인 시)
 * 4. 모집 중 Trial 섹션 (주요)
 * 5. 진행 중 / 종료 Trial 섹션 (보조)
 * 6. 포럼 연결 안내
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getTrials,
  getMyParticipations,
  type TrialSummary,
  type ParticipationInfo,
} from '../../api/marketTrial';
import { colors, borderRadius } from '../../styles/theme';

// ── 상태 분류 ──

type DisplayGroup = 'recruiting' | 'active' | 'ended';

function getDisplayGroup(status: string): DisplayGroup {
  switch (status) {
    case 'recruiting':
      return 'recruiting';
    case 'development':
    case 'outcome_confirming':
      return 'active';
    case 'fulfilled':
    case 'closed':
      return 'ended';
    default:
      return 'active';
  }
}

const SERVICE_KEY_LABELS: Record<string, string> = {
  glycopharm: 'GlycoPharm',
  'k-cosmetics': 'K-Cosmetics',
  'kpa-society': 'KPA-a',
};

// ── 메인 컴포넌트 ──

const REWARD_LABELS: Record<string, string> = {
  product: '제품 보상',
  cash: '현금 보상',
};

export function MarketTrialHubPage() {
  const [trials, setTrials] = useState<TrialSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // 내 참여 상태 (trialId → ParticipationInfo)
  const [participationMap, setParticipationMap] = useState<Map<string, ParticipationInfo>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trialsRes, partRes] = await Promise.all([
          getTrials(),
          getMyParticipations().catch(() => ({ success: true as const, data: [] })),
        ]);
        if (trialsRes.success) {
          setTrials(trialsRes.data);
        }
        if (partRes.success && partRes.data.length > 0) {
          const map = new Map<string, ParticipationInfo>();
          for (const p of partRes.data) {
            map.set(p.trialId, p);
          }
          setParticipationMap(map);
        }
      } catch {
        setTrials([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const recruiting = trials.filter((t) => getDisplayGroup(t.status) === 'recruiting');
  const active = trials.filter((t) => getDisplayGroup(t.status) === 'active');
  const ended = trials.filter((t) => getDisplayGroup(t.status) === 'ended');

  // 내가 참여한 Trial 목록
  const myTrials = trials.filter((t) => participationMap.has(t.id));

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', padding: '32px 16px 64px' }}>

      {/* ── 1. 헤더 ── */}
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: colors.neutral900, marginBottom: '12px' }}>
          시범판매 (Market Trial)
        </h1>
        <p style={{ fontSize: '0.9375rem', color: colors.neutral600, lineHeight: 1.7, maxWidth: '680px' }}>
          공급자가 제안한 신제품을 약국에서 먼저 체험하고, 약사로서 제품에 대한
          의견을 공유하는 참여형 프로그램입니다. 모집부터 포럼 토론까지
          이 공간에서 확인할 수 있습니다.
        </p>
      </header>

      {/* ── 2. 참여 안내 (3단 흐름) ── */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {[
          { step: '1', label: '공급자 제안', desc: '공급자가 신제품 시범판매를 제안하고, 운영자 검토를 거쳐 모집이 오픈됩니다.' },
          { step: '2', label: '약국 참여', desc: '모집 중인 시범판매에 참여 신청하고, 제품을 직접 체험합니다.' },
          { step: '3', label: '포럼 토론', desc: '체험 후기와 의견을 포럼에서 공유하고, 공급자에게 피드백을 전달합니다.' },
        ].map((item) => (
          <div key={item.step} style={{
            padding: '20px',
            backgroundColor: colors.neutral50,
            borderRadius: borderRadius.lg,
            border: `1px solid ${colors.neutral200}`,
          }}>
            <div style={{
              width: '28px', height: '28px',
              borderRadius: '50%',
              backgroundColor: colors.primary,
              color: colors.white,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8125rem', fontWeight: 700,
              marginBottom: '10px',
            }}>
              {item.step}
            </div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.neutral800, marginBottom: '4px' }}>
              {item.label}
            </p>
            <p style={{ fontSize: '0.8125rem', color: colors.neutral500, lineHeight: 1.5, margin: 0 }}>
              {item.desc}
            </p>
          </div>
        ))}
      </section>

      {/* ── 3. 내가 참여한 시범판매 ── */}
      {myTrials.length > 0 && (
        <Section title="내가 참여한 시범판매" count={myTrials.length} accentColor="#7C3AED">
          {myTrials.map((trial) => (
            <TrialCard key={`my-${trial.id}`} trial={trial} group={getDisplayGroup(trial.status)} participation={participationMap.get(trial.id)} />
          ))}
          {/* WO-MARKET-TRIAL-PHASE2: 내 참여 전체 보기 링크 */}
          <div style={{ textAlign: 'right', marginTop: '4px' }}>
            <Link to="/market-trial/my" style={{ fontSize: '0.875rem', color: '#7C3AED', fontWeight: 600, textDecoration: 'none' }}>
              내 참여 내역 전체 보기 →
            </Link>
          </div>
        </Section>
      )}

      {/* ── 4. 모집 중 (Recruiting) ── */}
      <Section
        title="모집 중"
        count={recruiting.length}
        accentColor="#059669"
        isLoading={isLoading}
      >
        {recruiting.length > 0 ? (
          recruiting.map((trial) => (
            <TrialCard key={trial.id} trial={trial} group="recruiting" participation={participationMap.get(trial.id)} />
          ))
        ) : (
          <EmptySection />
        )}
      </Section>

      {/* ── 5. 진행 중 ── */}
      {active.length > 0 && (
        <Section title="진행 중" count={active.length} accentColor="#2563EB">
          {active.map((trial) => (
            <TrialCard key={trial.id} trial={trial} group="active" participation={participationMap.get(trial.id)} />
          ))}
        </Section>
      )}

      {/* ── 6. 종료 ── */}
      {ended.length > 0 && (
        <Section title="종료" count={ended.length} accentColor={colors.neutral400}>
          {ended.map((trial) => (
            <TrialCard key={trial.id} trial={trial} group="ended" participation={participationMap.get(trial.id)} />
          ))}
        </Section>
      )}

      {/* ── 6. 포럼 연결 안내 ── */}
      <footer style={{
        marginTop: '40px',
        padding: '20px 24px',
        backgroundColor: colors.neutral50,
        borderRadius: borderRadius.lg,
        border: `1px solid ${colors.neutral200}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: colors.neutral700, marginBottom: '4px' }}>
              시범판매 포럼
            </p>
            <p style={{ fontSize: '0.8125rem', color: colors.neutral500, margin: 0 }}>
              참여 후기, 제품 의견, 운영 공지를 포럼에서 확인하세요.
              개별 시범판매의 토론과 공지는 포럼에서 진행됩니다.
            </p>
          </div>
          <Link
            to="/forum?category=kpa-a-market-trial"
            style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '10px 20px',
              backgroundColor: colors.primary,
              color: colors.white,
              borderRadius: borderRadius.md,
              fontSize: '0.8125rem', fontWeight: 600,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            포럼 바로가기 →
          </Link>
        </div>
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: `1px solid ${colors.neutral200}`,
        }}>
          <p style={{ fontSize: '0.75rem', color: colors.neutral400, margin: 0, lineHeight: 1.5 }}>
            이 공간은 KPA-a(대한약사회) 내에서 운영되는 시범판매 허브입니다.
            다른 서비스(GlycoPharm, K-Cosmetics 등)에서 연결되어 왔다면,
            시범판매 참여와 토론은 이곳에서 통합 진행됩니다.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── 섹션 컴포넌트 ──

function Section({
  title,
  count,
  accentColor,
  isLoading,
  children,
}: {
  title: string;
  count: number;
  accentColor: string;
  isLoading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          width: '4px', height: '20px',
          borderRadius: '2px',
          backgroundColor: accentColor,
        }} />
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: colors.neutral800, margin: 0 }}>
          {title}
        </h2>
        <span style={{
          fontSize: '0.75rem', fontWeight: 600,
          color: accentColor,
          backgroundColor: `${accentColor}18`,
          padding: '2px 8px',
          borderRadius: '10px',
        }}>
          {count}
        </span>
      </div>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: colors.neutral400, fontSize: '0.875rem' }}>
          불러오는 중...
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {children}
        </div>
      )}
    </section>
  );
}

// ── Trial 카드 ──

function TrialCard({ trial, group, participation }: { trial: TrialSummary; group: DisplayGroup; participation?: ParticipationInfo }) {
  const isEnded = group === 'ended';
  const hasJoined = !!participation;

  const statusBadge = (() => {
    switch (group) {
      case 'recruiting':
        return { label: '모집중', bg: '#DCFCE7', color: '#166534' };
      case 'active':
        return { label: '진행중', bg: '#DBEAFE', color: '#1E40AF' };
      case 'ended':
        return { label: '종료', bg: colors.neutral100, color: colors.neutral500 };
    }
  })();

  const serviceLabels = (trial.visibleServiceKeys || [])
    .map((k) => SERVICE_KEY_LABELS[k] || k)
    .filter(Boolean);

  return (
    <div style={{
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      border: `1px solid ${hasJoined ? '#C4B5FD' : colors.neutral200}`,
      opacity: isEnded ? 0.65 : 1,
      overflow: 'hidden',
    }}>
      {/* 카드 본문 */}
      <div style={{ padding: '20px 24px' }}>
        {/* 상단: 상태 + 참여 배지 + 공급자 + 서비스 태그 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span style={{
            padding: '2px 10px',
            backgroundColor: statusBadge.bg,
            color: statusBadge.color,
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}>
            {statusBadge.label}
          </span>
          {hasJoined && (
            <span style={{
              padding: '2px 10px',
              backgroundColor: '#EDE9FE',
              color: '#6D28D9',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}>
              내 참여 · {REWARD_LABELS[participation.rewardType] || participation.rewardType}
            </span>
          )}
          {trial.supplierName && (
            <span style={{ fontSize: '0.8125rem', color: colors.neutral400 }}>
              {trial.supplierName}
            </span>
          )}
          {serviceLabels.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
              {serviceLabels.map((label) => (
                <span key={label} style={{
                  padding: '1px 6px',
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

        {/* 제목 + 설명 */}
        <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: colors.neutral900, margin: '0 0 6px 0' }}>
          {trial.title}
        </h3>
        {trial.description && (
          <p style={{
            fontSize: '0.875rem',
            color: colors.neutral500,
            margin: '0 0 12px 0',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {trial.description}
          </p>
        )}

        {/* 결과물/목적 */}
        {trial.outcomeSnapshot?.description && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: '#F0FDF4',
            borderRadius: borderRadius.md,
            marginBottom: '4px',
          }}>
            <p style={{ fontSize: '0.8125rem', color: '#166534', margin: 0, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600 }}>참여 목적: </span>
              {trial.outcomeSnapshot.description}
            </p>
          </div>
        )}
      </div>

      {/* 펀딩 정보 — WO-MARKET-TRIAL-CROWDFUNDING-CORE-ALIGNMENT-V1 */}
      {(trial.targetAmount || (trial.rewardRate != null && trial.rewardRate > 0)) && (
        <div style={{
          padding: '10px 24px',
          borderTop: `1px solid ${colors.neutral100}`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          fontSize: '0.8125rem',
          alignItems: 'center',
        }}>
          {trial.targetAmount && trial.targetAmount > 0 && (
            <span style={{ color: colors.neutral600 }}>
              목표 <strong style={{ color: colors.neutral800 }}>{trial.targetAmount.toLocaleString()}원</strong>
              {trial.currentAmount != null && trial.currentAmount > 0 && (
                <> · 현재 {trial.currentAmount.toLocaleString()}원</>
              )}
            </span>
          )}
          {trial.amountRate != null && (
            <span style={{
              padding: '1px 8px',
              backgroundColor: trial.amountRate >= 100 ? '#DCFCE7' : '#EFF6FF',
              color: trial.amountRate >= 100 ? '#166534' : '#1D4ED8',
              borderRadius: '10px',
              fontWeight: 600,
            }}>
              {trial.amountRate}% 달성
            </span>
          )}
          {trial.rewardRate != null && trial.rewardRate > 0 && (
            <span style={{ color: '#7C3AED', fontWeight: 600 }}>
              리워드 +{trial.rewardRate}%
            </span>
          )}
          {trial.trialUnitPrice && trial.trialUnitPrice > 0 && (
            <span style={{ color: colors.neutral500 }}>
              단가 {trial.trialUnitPrice.toLocaleString()}원
            </span>
          )}
        </div>
      )}

      {/* 하단: 메타 정보 + 액션 */}
      <div style={{
        padding: '12px 24px',
        borderTop: `1px solid ${colors.neutral100}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
      }}>
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8125rem', color: colors.neutral500 }}>
          <span>
            참여 {trial.currentParticipants}{trial.maxParticipants ? ` / ${trial.maxParticipants}` : ''}명
          </span>
          {trial.recruitRate != null && (
            <span style={{
              padding: '1px 6px',
              backgroundColor: colors.neutral100,
              borderRadius: '8px',
              color: colors.neutral600,
              fontWeight: 500,
            }}>
              모집 {trial.recruitRate}%
            </span>
          )}
          {trial.endDate && (
            <span>
              마감 {new Date(trial.endDate).toLocaleDateString()}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link
            to={`/market-trial/${trial.id}`}
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: colors.primary,
              textDecoration: 'none',
            }}
          >
            상세 보기
          </Link>
          {trial.forumPostId && (
            <Link
              to={`/forum/post/${trial.forumPostId}`}
              style={{
                fontSize: '0.8125rem',
                fontWeight: 500,
                color: colors.neutral500,
                textDecoration: 'none',
              }}
            >
              포럼 →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty State ──

function EmptySection() {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 20px',
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      border: `1px solid ${colors.neutral200}`,
    }}>
      <div style={{
        width: '48px', height: '48px',
        borderRadius: '50%',
        backgroundColor: colors.neutral100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
        fontSize: '24px',
      }}>
        🧪
      </div>
      <p style={{ fontSize: '1rem', fontWeight: 500, color: colors.neutral600, marginBottom: '8px' }}>
        현재 모집 중인 시범판매가 없습니다
      </p>
      <p style={{ fontSize: '0.875rem', color: colors.neutral400, lineHeight: 1.6, maxWidth: '400px', margin: '0 auto 16px' }}>
        공급자의 새로운 시범판매가 등록되면 이곳에 표시됩니다.
        시범판매는 운영자 검토를 거쳐 오픈되며, 모집 기간 동안 참여할 수 있습니다.
      </p>
      <Link
        to="/forum?category=kpa-a-market-trial"
        style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '8px 16px',
          backgroundColor: colors.neutral100,
          color: colors.neutral600,
          borderRadius: borderRadius.md,
          fontSize: '0.8125rem', fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        시범판매 포럼 둘러보기 →
      </Link>
    </div>
  );
}
