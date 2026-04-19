/**
 * MarketTrialHubPage — Neture 시범판매 허브
 *
 * WO-NETURE-MARKET-TRIAL-PARTICIPANT-PAGES-V1
 * KPA-Society MarketTrialHubPage.tsx → Neture canonical 이식
 *
 * 구조:
 * 1. 헤더 + 허브 설명
 * 2. 참여 안내 (3단 흐름)
 * 3. 내가 참여한 시범판매 (로그인 시)
 * 4. 모집 중 / 진행 중 / 종료 섹션
 * 5. 포럼/안내 풋터
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getTrials,
  getMyParticipations,
  type Trial,
  type MyParticipationSummary,
} from '../../api/trial';
import { useAuth } from '../../contexts/AuthContext';

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

const REWARD_LABELS: Record<string, string> = {
  product: '제품 보상',
  cash: '현금 보상',
};

export function MarketTrialHubPage() {
  const { isAuthenticated } = useAuth();
  const [trials, setTrials] = useState<Trial[]>([]);
  const [participationMap, setParticipationMap] = useState<Map<string, MyParticipationSummary>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const [trialsData, partData] = await Promise.all([
          getTrials(),
          isAuthenticated ? getMyParticipations().catch(() => []) : Promise.resolve([] as MyParticipationSummary[]),
        ]);
        if (!active) return;
        setTrials(Array.isArray(trialsData) ? trialsData : []);
        if (partData.length > 0) {
          const map = new Map<string, MyParticipationSummary>();
          for (const p of partData) {
            map.set(p.trialId, p);
          }
          setParticipationMap(map);
        }
      } catch {
        if (active) setTrials([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const recruiting = trials.filter((t) => getDisplayGroup(t.status) === 'recruiting');
  const activeTrials = trials.filter((t) => getDisplayGroup(t.status) === 'active');
  const ended = trials.filter((t) => getDisplayGroup(t.status) === 'ended');
  const myTrials = trials.filter((t) => participationMap.has(t.id));

  return (
    <div style={s.container}>
      {/* 1. 헤더 */}
      <header style={s.header}>
        <h1 style={s.title}>시범판매 (Market Trial)</h1>
        <p style={s.subtitle}>
          공급자가 제안한 신제품을 매장에서 먼저 체험하고,
          현장 의견을 공유하는 참여형 프로그램입니다. 모집부터 정산까지 이 공간에서 확인할 수 있습니다.
        </p>
      </header>

      {/* 2. 참여 안내 */}
      <section style={s.guideGrid}>
        {[
          { step: '1', label: '공급자 제안', desc: '공급자가 신제품 시범판매를 제안하고, 운영자 검토를 거쳐 모집이 오픈됩니다.' },
          { step: '2', label: '매장 참여', desc: '모집 중인 시범판매에 참여 신청하고, 제품을 직접 체험합니다.' },
          { step: '3', label: '결과/정산', desc: '체험 결과를 정리하고, 제품 또는 현금 보상을 선택하여 정산받습니다.' },
        ].map((item) => (
          <div key={item.step} style={s.guideCard}>
            <div style={s.guideStep}>{item.step}</div>
            <p style={s.guideLabel}>{item.label}</p>
            <p style={s.guideDesc}>{item.desc}</p>
          </div>
        ))}
      </section>

      {/* 3. 내가 참여한 시범판매 */}
      {isAuthenticated && myTrials.length > 0 && (
        <Section title="내가 참여한 시범판매" count={myTrials.length} accentColor="#7C3AED">
          {myTrials.map((trial) => (
            <TrialCard
              key={`my-${trial.id}`}
              trial={trial}
              group={getDisplayGroup(trial.status)}
              participation={participationMap.get(trial.id)}
            />
          ))}
          <div style={{ textAlign: 'right', marginTop: '4px' }}>
            <Link to="/market-trial/my" style={s.myAllLink}>
              내 참여 내역 전체 보기 →
            </Link>
          </div>
        </Section>
      )}

      {/* 4. 모집 중 */}
      <Section title="모집 중" count={recruiting.length} accentColor="#059669" isLoading={isLoading}>
        {recruiting.length > 0 ? (
          recruiting.map((trial) => (
            <TrialCard
              key={trial.id}
              trial={trial}
              group="recruiting"
              participation={participationMap.get(trial.id)}
            />
          ))
        ) : (
          <EmptySection isAuthenticated={isAuthenticated} />
        )}
      </Section>

      {/* 5. 진행 중 */}
      {activeTrials.length > 0 && (
        <Section title="진행 중" count={activeTrials.length} accentColor="#2563EB">
          {activeTrials.map((trial) => (
            <TrialCard
              key={trial.id}
              trial={trial}
              group="active"
              participation={participationMap.get(trial.id)}
            />
          ))}
        </Section>
      )}

      {/* 6. 종료 */}
      {ended.length > 0 && (
        <Section title="종료" count={ended.length} accentColor="#9CA3AF">
          {ended.map((trial) => (
            <TrialCard
              key={trial.id}
              trial={trial}
              group="ended"
              participation={participationMap.get(trial.id)}
            />
          ))}
        </Section>
      )}

      {/* 7. 안내 풋터 */}
      <footer style={s.footer}>
        <div style={s.footerRow}>
          <div>
            <p style={s.footerTitle}>시범판매 안내</p>
            <p style={s.footerDesc}>
              개별 시범판매의 토론과 공지는 각 시범판매 상세 페이지에서 확인할 수 있습니다.
              참여 후 진행 상황과 정산은 "내 참여 내역"에서 추적됩니다.
            </p>
          </div>
          <Link to="/market-trial/my" style={s.footerCta}>
            내 참여 내역 →
          </Link>
        </div>
        <div style={s.footerNote}>
          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
            이 공간은 Neture 통합 시범판매 허브입니다.
            서비스(GlycoPharm / K-Cosmetics / KPA-a 등)에서 노출되는 시범판매도 이곳에서 통합 운영됩니다.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default MarketTrialHubPage;

// ──────────────────────────────────────────────
// Section
// ──────────────────────────────────────────────

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
      <div style={s.sectionHeader}>
        <div style={{ width: '4px', height: '20px', borderRadius: '2px', backgroundColor: accentColor }} />
        <h2 style={s.sectionTitle}>{title}</h2>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: accentColor,
            backgroundColor: `${accentColor}18`,
            padding: '2px 8px',
            borderRadius: '10px',
          }}
        >
          {count}
        </span>
      </div>
      {isLoading ? (
        <div style={s.loading}>불러오는 중...</div>
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>{children}</div>
      )}
    </section>
  );
}

// ──────────────────────────────────────────────
// TrialCard
// ──────────────────────────────────────────────

function TrialCard({
  trial,
  group,
  participation,
}: {
  trial: Trial;
  group: DisplayGroup;
  participation?: MyParticipationSummary;
}) {
  const isEnded = group === 'ended';
  const hasJoined = !!participation;

  const statusBadge = (() => {
    switch (group) {
      case 'recruiting':
        return { label: '모집중', bg: '#DCFCE7', color: '#166534' };
      case 'active':
        return { label: '진행중', bg: '#DBEAFE', color: '#1E40AF' };
      case 'ended':
        return { label: '종료', bg: '#F3F4F6', color: '#6B7280' };
    }
  })();

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: `1px solid ${hasJoined ? '#C4B5FD' : '#E5E7EB'}`,
        opacity: isEnded ? 0.7 : 1,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '20px 24px' }}>
        <div style={s.cardTopRow}>
          <span
            style={{
              padding: '2px 10px',
              backgroundColor: statusBadge.bg,
              color: statusBadge.color,
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {statusBadge.label}
          </span>
          {hasJoined && participation && (
            <span style={s.myBadge}>
              내 참여 · {REWARD_LABELS[participation.rewardType] || participation.rewardType}
            </span>
          )}
          {trial.supplierName && (
            <span style={{ fontSize: '0.8125rem', color: '#9CA3AF' }}>{trial.supplierName}</span>
          )}
        </div>

        <h3 style={s.cardTitle}>{trial.title}</h3>
        {trial.description && (
          <p style={s.cardDesc}>{trial.description}</p>
        )}

        {trial.outcomeSnapshot?.description && (
          <div style={s.outcomeBox}>
            <p style={{ fontSize: '0.8125rem', color: '#166534', margin: 0, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600 }}>참여 목적: </span>
              {trial.outcomeSnapshot.description}
            </p>
          </div>
        )}
      </div>

      {/* 펀딩 라인 */}
      {(trial.targetAmount || (trial.rewardRate != null && trial.rewardRate > 0)) && (
        <div style={s.fundingRow}>
          {trial.targetAmount && trial.targetAmount > 0 && (
            <span style={{ color: '#4B5563' }}>
              목표 <strong style={{ color: '#1F2937' }}>{trial.targetAmount.toLocaleString()}원</strong>
              {trial.currentAmount != null && trial.currentAmount > 0 && (
                <> · 현재 {trial.currentAmount.toLocaleString()}원</>
              )}
            </span>
          )}
          {trial.amountRate != null && (
            <span
              style={{
                padding: '1px 8px',
                backgroundColor: trial.amountRate >= 100 ? '#DCFCE7' : '#EFF6FF',
                color: trial.amountRate >= 100 ? '#166534' : '#1D4ED8',
                borderRadius: '10px',
                fontWeight: 600,
              }}
            >
              {trial.amountRate}% 달성
            </span>
          )}
          {trial.rewardRate != null && trial.rewardRate > 0 && (
            <span style={{ color: '#7C3AED', fontWeight: 600 }}>
              리워드 +{trial.rewardRate}%
            </span>
          )}
          {trial.trialUnitPrice && trial.trialUnitPrice > 0 && (
            <span style={{ color: '#6B7280' }}>단가 {trial.trialUnitPrice.toLocaleString()}원</span>
          )}
        </div>
      )}

      {/* 메타 + 액션 */}
      <div style={s.cardBottomRow}>
        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8125rem', color: '#6B7280' }}>
          <span>
            참여 {trial.currentParticipants}
            {trial.maxParticipants ? ` / ${trial.maxParticipants}` : ''}명
          </span>
          {trial.recruitRate != null && (
            <span style={s.recruitTag}>모집 {trial.recruitRate}%</span>
          )}
          {trial.endDate && <span>마감 {new Date(trial.endDate).toLocaleDateString('ko-KR')}</span>}
        </div>

        <Link to={`/market-trial/${trial.id}`} style={s.detailLink}>
          상세 보기 →
        </Link>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// EmptySection
// ──────────────────────────────────────────────

function EmptySection({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div style={s.emptyBox}>
      <div style={s.emptyIcon}>🧪</div>
      <p style={s.emptyTitle}>현재 모집 중인 시범판매가 없습니다</p>
      <p style={s.emptyDesc}>
        공급자의 새로운 시범판매가 등록되면 이곳에 표시됩니다.
        시범판매는 운영자 검토를 거쳐 오픈되며, 모집 기간 동안 참여할 수 있습니다.
      </p>
      {!isAuthenticated && (
        <Link to="/login?redirect=/market-trial" style={s.emptyCta}>
          로그인하고 참여하기 →
        </Link>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: '920px', margin: '0 auto', padding: '32px 16px 64px' },
  header: { marginBottom: '32px' },
  title: { fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '12px' },
  subtitle: { fontSize: '0.9375rem', color: '#4B5563', lineHeight: 1.7, maxWidth: '680px', margin: 0 },

  guideGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' },
  guideCard: {
    padding: '20px',
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
  },
  guideStep: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8125rem',
    fontWeight: 700,
    marginBottom: '10px',
  },
  guideLabel: { fontSize: '0.875rem', fontWeight: 600, color: '#1F2937', marginBottom: '4px' },
  guideDesc: { fontSize: '0.8125rem', color: '#6B7280', lineHeight: 1.5, margin: 0 },

  myAllLink: { fontSize: '0.875rem', color: '#7C3AED', fontWeight: 600, textDecoration: 'none' },

  sectionHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' },
  sectionTitle: { fontSize: '1.125rem', fontWeight: 600, color: '#1F2937', margin: 0 },
  loading: { textAlign: 'center', padding: '48px 0', color: '#9CA3AF', fontSize: '0.875rem' },

  cardTopRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' },
  myBadge: {
    padding: '2px 10px',
    backgroundColor: '#EDE9FE',
    color: '#6D28D9',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  cardTitle: { fontSize: '1.0625rem', fontWeight: 600, color: '#111827', margin: '0 0 6px 0' },
  cardDesc: {
    fontSize: '0.875rem',
    color: '#6B7280',
    margin: '0 0 12px 0',
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  outcomeBox: {
    padding: '10px 14px',
    backgroundColor: '#F0FDF4',
    borderRadius: '8px',
    marginBottom: '4px',
  },

  fundingRow: {
    padding: '10px 24px',
    borderTop: '1px solid #F3F4F6',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '14px',
    fontSize: '0.8125rem',
    alignItems: 'center',
  },

  cardBottomRow: {
    padding: '12px 24px',
    borderTop: '1px solid #F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '10px',
  },
  recruitTag: {
    padding: '1px 6px',
    backgroundColor: '#F3F4F6',
    borderRadius: '8px',
    color: '#4B5563',
    fontWeight: 500,
  },
  detailLink: { fontSize: '0.8125rem', fontWeight: 600, color: '#10B981', textDecoration: 'none' },

  footer: {
    marginTop: '40px',
    padding: '20px 24px',
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
  },
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
  },
  footerTitle: { fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '4px' },
  footerDesc: { fontSize: '0.8125rem', color: '#6B7280', margin: 0 },
  footerCta: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  footerNote: { marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' },

  emptyBox: {
    textAlign: 'center',
    padding: '48px 20px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
  },
  emptyIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    fontSize: '24px',
  },
  emptyTitle: { fontSize: '1rem', fontWeight: 500, color: '#4B5563', marginBottom: '8px' },
  emptyDesc: {
    fontSize: '0.875rem',
    color: '#9CA3AF',
    lineHeight: 1.6,
    maxWidth: '400px',
    margin: '0 auto 16px',
  },
  emptyCta: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    textDecoration: 'none',
  },
};
