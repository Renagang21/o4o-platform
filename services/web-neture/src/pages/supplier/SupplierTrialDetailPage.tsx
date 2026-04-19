/**
 * Supplier Trial Detail Page (Results & Feedback)
 *
 * WO-MARKET-TRIAL-SUPPLIER-RESULTS-AND-FEEDBACK-V1
 * - 집계 통계 (개인 참여자 정보 미노출)
 * - 포럼 피드백 진입 링크
 * - 상태별 다음 행동 안내
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSupplierTrialResults } from '../../api/trial';
import type { TrialResults } from '../../api/trial';
import { ContentRenderer } from '@o4o/content-editor';

// Conversion status derived from trial.convertedProductId
type ConversionStatus = 'not_eligible' | 'ready' | 'converted';
const CONVERSION_ELIGIBLE = new Set(['fulfilled', 'closed']);

function getConversionStatus(trial: TrialResults['trial'] & { convertedProductId?: string | null }): ConversionStatus {
  if (trial.convertedProductId) return 'converted';
  if (CONVERSION_ELIGIBLE.has(trial.status)) return 'ready';
  return 'not_eligible';
}

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  submitted: '검토 중',
  approved: '서비스 검토 중',
  recruiting: '모집 중',
  development: '체험 진행 중',
  outcome_confirming: '결과 확인 중',
  fulfilled: '이행 완료',
  closed: '종료',
};

const STATUS_COLOR: Record<string, string> = {
  draft: '#9CA3AF',
  submitted: '#F59E0B',
  approved: '#3B82F6',
  recruiting: '#10B981',
  development: '#6366F1',
  outcome_confirming: '#8B5CF6',
  fulfilled: '#059669',
  closed: '#6B7280',
};

/** 상태별 공급자 다음 행동 안내 */
const NEXT_ACTION: Record<string, { title: string; desc: string }> = {
  draft: {
    title: '초안 상태입니다',
    desc: '내용을 완성하고 "제출"하여 Neture 운영자의 검토를 요청하세요.',
  },
  submitted: {
    title: 'Neture 운영자가 검토 중입니다',
    desc: '검토 완료 후 승인되면 바로 모집이 시작됩니다. 별도 조치는 필요 없습니다.',
  },
  recruiting: {
    title: '참여자 모집 중입니다',
    desc: '모집 기간이 끝나거나 정원이 채워지면 체험 진행 단계로 전환됩니다.',
  },
  development: {
    title: '체험이 진행 중입니다',
    desc: '참여자들이 제품을 체험하고 있습니다. 운영자가 결과 확인 단계로 전환할 예정입니다.',
  },
  outcome_confirming: {
    title: '결과 확인 중입니다',
    desc: '참여자들의 후기와 결과를 집계하고 있습니다. 포럼 링크에서 피드백을 확인하세요.',
  },
  fulfilled: {
    title: '이행이 완료되었습니다',
    desc: '모든 보상 지급이 완료되었습니다. 최종 결과를 확인하고 다음 Trial을 준비하세요.',
  },
  closed: {
    title: 'Trial이 종료되었습니다',
    desc: '최종 결과 데이터를 참고하여 향후 제품 개발에 활용하세요.',
  },
};

const CONVERSION_STAGES: { key: string; label: string; color: string }[] = [
  { key: 'interested',  label: '관심 있음',  color: '#3B82F6' },
  { key: 'considering', label: '취급 검토',   color: '#F59E0B' },
  { key: 'adopted',     label: '취급 시작',   color: '#10B981' },
  { key: 'first_order', label: '첫 주문',     color: '#059669' },
];

/** WO-MARKET-TRIAL-VIDEO-FIELD-V1: URL → embed 분기 */
function parseVideoEmbed(url: string): { type: 'youtube' | 'vimeo' | 'external'; embedUrl: string } {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
      let videoId = '';
      if (parsed.hostname.includes('youtu.be')) {
        videoId = parsed.pathname.slice(1);
      } else {
        videoId = parsed.searchParams.get('v') || '';
      }
      if (videoId) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${videoId}` };
    }
    if (parsed.hostname.includes('vimeo.com')) {
      const match = parsed.pathname.match(/\/(\d+)/);
      if (match) return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${match[1]}` };
    }
  } catch { /* invalid URL */ }
  return { type: 'external', embedUrl: url };
}

export default function SupplierTrialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [results, setResults] = useState<TrialResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getSupplierTrialResults(id)
      .then(setResults)
      .catch((err) => {
        if (err?.response?.status === 403) {
          setError('접근 권한이 없습니다.');
        } else if (err?.response?.status === 404) {
          setError('Trial을 찾을 수 없습니다.');
        } else {
          setError('결과를 불러오지 못했습니다.');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={s.container}>
        <p style={s.muted}>불러오는 중...</p>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div style={s.container}>
        <button style={s.backLink} onClick={() => navigate('/supplier/market-trial')}>← 목록으로</button>
        <p style={{ ...s.muted, color: '#EF4444', marginTop: '24px' }}>{error || '알 수 없는 오류'}</p>
      </div>
    );
  }

  const { trial, summary, forumPostId } = results;
  const nextAction = NEXT_ACTION[trial.status];
  const statusColor = STATUS_COLOR[trial.status] ?? '#9CA3AF';
  const conversionStatus = getConversionStatus(trial as any);

  const isResultPhase = ['outcome_confirming', 'fulfilled', 'closed'].includes(trial.status);

  return (
    <div style={s.container}>
      {/* 상단 네비 */}
      <button style={s.backLink} onClick={() => navigate('/supplier/market-trial')}>
        ← 내 Trial 목록
      </button>

      {/* 헤더 */}
      <div style={s.header}>
        <div style={s.titleRow}>
          <h1 style={s.title}>{trial.title}</h1>
          <span style={{ ...s.statusBadge, backgroundColor: statusColor }}>
            {STATUS_LABEL[trial.status] ?? trial.status}
          </span>
          {/* WO-MARKET-TRIAL-EDIT-FLOW-V1 */}
          {trial.status === 'draft' && (
            <button
              style={{ ...s.primaryBtn, padding: '6px 16px', fontSize: '13px' }}
              onClick={() => navigate(`/supplier/market-trial/${id}/edit`)}
            >
              수정하기
            </button>
          )}
        </div>
        {trial.oneLiner && (
          <p style={{ fontSize: '15px', color: '#4B5563', fontWeight: 500, margin: '4px 0 8px 0', lineHeight: 1.5 }}>
            {trial.oneLiner}
          </p>
        )}
        {trial.description && <p style={s.desc}>{trial.description}</p>}
        <div style={s.meta}>
          <span style={s.metaItem}>등록일: {new Date(trial.createdAt).toLocaleDateString('ko-KR')}</span>
          {trial.endDate && (
            <span style={s.metaItem}>모집 마감: {new Date(trial.endDate).toLocaleDateString('ko-KR')}</span>
          )}
        </div>
      </div>

      {/* 대표 영상 — WO-MARKET-TRIAL-VIDEO-FIELD-V1 */}
      {trial.videoUrl && (() => {
        const video = parseVideoEmbed(trial.videoUrl);
        if (video.type === 'youtube' || video.type === 'vimeo') {
          return (
            <div style={s.section}>
              <h2 style={s.sectionTitle}>대표 영상</h2>
              <div style={{ position: 'relative' as const, paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '8px' }}>
                <iframe
                  src={video.embedUrl}
                  style={{ position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          );
        }
        return (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>대표 영상</h2>
            <div style={{ padding: '20px', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', textAlign: 'center' as const }}>
              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px' }}>이 영상은 외부 사이트에서 재생됩니다</p>
              <a href={trial.videoUrl} target="_blank" rel="noopener noreferrer" style={s.forumLink}>
                영상 보러가기
              </a>
            </div>
          </div>
        );
      })()}

      {/* 매장 활용 방법 — WO-MARKET-TRIAL-SALES-SCENARIO-EDITOR-V1 / WO-MARKET-TRIAL-PROPOSAL-STRUCTURE-V1 */}
      {trial.salesScenarioContent && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}>매장 활용 방법</h2>
          <ContentRenderer html={trial.salesScenarioContent} />
        </div>
      )}

      {/* 다음 행동 안내 */}
      {nextAction && (
        <div style={s.actionBox}>
          <span style={s.actionTitle}>{nextAction.title}</span>
          <p style={s.actionDesc}>{nextAction.desc}</p>
        </div>
      )}

      {/* 참여 현황 요약 */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>참여 현황</h2>
        <div style={s.statsGrid}>
          <StatCard label="전체 참여자" value={`${summary.totalCount}명`} />
          <StatCard label="제품 보상 선택" value={`${summary.productCount}명`} />
          <StatCard label="현금 보상 선택" value={`${summary.cashCount}명`} />
          {trial.maxParticipants != null && summary.recruitRate != null && (
            <StatCard label="모집률" value={`${summary.recruitRate}%`} highlight={summary.recruitRate >= 80} />
          )}
        </div>
      </div>

      {/* 이행 결과 (결과 확인 이후 단계만 표시) */}
      {isResultPhase && summary.totalCount > 0 && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}>이행 현황</h2>
          <div style={s.statsGrid}>
            <StatCard label="이행 완료" value={`${summary.fulfilledCount}명`} highlight={summary.fulfilledCount > 0} />
            <StatCard label="이행 대기" value={`${summary.pendingCount}명`} />
            <StatCard label="이행률" value={`${summary.fulfillmentRate}%`} highlight={summary.fulfillmentRate >= 100} />
          </div>
          {/* 진행 바 */}
          <div style={s.progressBar}>
            <div
              style={{
                ...s.progressFill,
                width: `${summary.fulfillmentRate}%`,
                backgroundColor: summary.fulfillmentRate >= 100 ? '#059669' : '#3B82F6',
              }}
            />
          </div>
          <p style={s.progressLabel}>{summary.fulfillmentRate}% 완료</p>
        </div>
      )}

      {/* 매장 진열 현황 (WO-MARKET-TRIAL-LISTING-AUTOLINK-V1) */}
      {isResultPhase && (summary.listingCount ?? 0) > 0 && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}>매장 진열 현황</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '32px', fontWeight: 700, color: '#059669' }}>
                {summary.listingCount}
              </span>
              <span style={{ ...s.muted, marginLeft: '6px' }}>개 매장 진열 등록</span>
            </div>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>
              ← Trial 참여자 매장에서 이 상품을 실제로 취급 시작
            </span>
          </div>
        </div>
      )}

      {/* 거래선 전환 현황 (WO-MARKET-TRIAL-PARTICIPANT-TO-CUSTOMER-FLOW-V1) */}
      {isResultPhase && summary.conversionDistribution && summary.totalCount > 0 && (() => {
        const dist = summary.conversionDistribution!;
        const total = summary.totalCount;
        const adoptedCount = (dist.adopted ?? 0) + (dist.first_order ?? 0);
        const firstOrderCount = dist.first_order ?? 0;
        const adoptedRate = total > 0 ? Math.round((adoptedCount / total) * 100) : 0;
        const firstOrderRate = total > 0 ? Math.round((firstOrderCount / total) * 100) : 0;
        return (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>거래선 전환 현황</h2>
            {/* Conversion rate summary */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={s.rateCard}>
                <span style={s.rateLabel}>취급 전환율</span>
                <span style={{ ...s.rateValue, color: adoptedRate > 0 ? '#059669' : '#9CA3AF' }}>
                  {adoptedRate}%
                </span>
                <span style={s.rateSub}>참여자 중 취급 시작 이상</span>
              </div>
              <div style={s.rateCard}>
                <span style={s.rateLabel}>첫 주문 전환율</span>
                <span style={{ ...s.rateValue, color: firstOrderRate > 0 ? '#047857' : '#9CA3AF' }}>
                  {firstOrderRate}%
                </span>
                <span style={s.rateSub}>참여자 중 첫 주문 완료</span>
              </div>
              {(summary.listingCount ?? 0) > 0 && (
                <div style={s.rateCard}>
                  <span style={s.rateLabel}>진열 등록률</span>
                  <span style={{ ...s.rateValue, color: '#4F46E5' }}>
                    {Math.round(((summary.listingCount ?? 0) / total) * 100)}%
                  </span>
                  <span style={s.rateSub}>{summary.listingCount}개 매장 진열</span>
                </div>
              )}
            </div>
            <p style={{ ...s.muted, marginBottom: '12px' }}>
              단계별 분포
            </p>
            <div style={s.conversionPipeline}>
              {CONVERSION_STAGES.map(({ key, label, color }) => {
                const count = dist[key as keyof typeof dist] ?? 0;
                return (
                  <div key={key} style={s.conversionStage}>
                    <div style={{ ...s.conversionDot, backgroundColor: color }} />
                    <span style={s.conversionLabel}>{label}</span>
                    <span style={{ ...s.conversionCount, color: count > 0 ? color : '#9CA3AF' }}>
                      {count}명
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 포럼 피드백 */}
      {forumPostId && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}>포럼 피드백</h2>
          <p style={s.muted}>참여자들의 후기와 피드백이 포럼에 등록되어 있습니다.</p>
          <a
            href={`/forum/post/${forumPostId}`}
            style={s.forumLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            포럼에서 피드백 보기 →
          </a>
        </div>
      )}

      {/* 상품 전환 상태 */}
      {conversionStatus !== 'not_eligible' && (
        <div style={s.section}>
          <h2 style={s.sectionTitle}>상품 전환 상태</h2>
          {conversionStatus === 'converted' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ ...s.convBadge, backgroundColor: '#059669' }}>상품 전환 완료</span>
              </div>
              <p style={s.muted}>이 Trial은 정규 상품으로 전환되었습니다.</p>
              {(trial as any).convertedProductName && (
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '4px 0 0 0' }}>
                  연결 상품: {(trial as any).convertedProductName}
                </p>
              )}
              {(trial as any).conversionNote && (
                <p style={{ ...s.muted, marginTop: '8px' }}>운영자 메모: {(trial as any).conversionNote}</p>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ ...s.convBadge, backgroundColor: '#3B82F6' }}>상품 전환 검토 중</span>
              </div>
              <p style={s.muted}>운영자가 이 Trial의 상품 전환 여부를 검토하고 있습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* 초안이면 수정/새 등록 버튼 — WO-MARKET-TRIAL-EDIT-FLOW-V1 */}
      {trial.status === 'draft' && (
        <div style={{ ...s.section, display: 'flex', gap: '12px' }}>
          <button
            style={s.primaryBtn}
            onClick={() => navigate(`/supplier/market-trial/${id}/edit`)}
          >
            이 Trial 수정하기
          </button>
          <button
            style={{ ...s.primaryBtn, backgroundColor: '#6B7280' }}
            onClick={() => navigate(`/supplier/market-trial/new`)}
          >
            새 Trial 등록
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      ...sc.card,
      borderColor: highlight ? '#3B82F6' : '#E5E7EB',
    }}>
      <span style={sc.label}>{label}</span>
      <span style={{ ...sc.value, color: highlight ? '#2563EB' : '#111827' }}>{value}</span>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px 32px',
    maxWidth: '860px',
    margin: '0 auto',
  },
  backLink: {
    background: 'none',
    border: 'none',
    fontSize: '14px',
    color: '#6B7280',
    cursor: 'pointer',
    padding: 0,
    marginBottom: '20px',
    display: 'block',
  },
  header: {
    marginBottom: '24px',
    padding: '24px',
    backgroundColor: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
    borderRadius: '20px',
  },
  desc: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 12px 0',
    lineHeight: 1.6,
  },
  meta: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  metaItem: {
    fontSize: '13px',
    color: '#9CA3AF',
  },
  actionBox: {
    padding: '16px 20px',
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: '10px',
    marginBottom: '20px',
  },
  actionTitle: {
    display: 'block',
    fontSize: '15px',
    fontWeight: 600,
    color: '#1D4ED8',
    marginBottom: '4px',
  },
  actionDesc: {
    margin: 0,
    fontSize: '14px',
    color: '#3B82F6',
    lineHeight: 1.5,
  },
  section: {
    padding: '24px',
    backgroundColor: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px 0',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '12px',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#E5E7EB',
    borderRadius: '4px',
    marginTop: '16px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s',
  },
  progressLabel: {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '6px',
    textAlign: 'right' as const,
  },
  forumLink: {
    display: 'inline-block',
    marginTop: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#2563EB',
    borderRadius: '8px',
    textDecoration: 'none',
  },
  muted: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 8px 0',
  },
  primaryBtn: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#2563EB',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  convBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
    borderRadius: '20px',
  },
  conversionPipeline: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '12px',
  },
  conversionStage: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    gap: '6px',
  },
  conversionDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  conversionLabel: {
    fontSize: '12px',
    color: '#6B7280',
    textAlign: 'center' as const,
  },
  conversionCount: {
    fontSize: '20px',
    fontWeight: 700,
  },
  rateCard: {
    padding: '12px 16px',
    backgroundColor: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    minWidth: '120px',
  },
  rateLabel: {
    fontSize: '11px',
    color: '#9CA3AF',
    fontWeight: 500,
  },
  rateValue: {
    fontSize: '28px',
    fontWeight: 700,
    lineHeight: 1.1,
  },
  rateSub: {
    fontSize: '11px',
    color: '#6B7280',
  },
};

const sc: Record<string, React.CSSProperties> = {
  card: {
    padding: '16px',
    backgroundColor: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    color: '#6B7280',
  },
  value: {
    fontSize: '22px',
    fontWeight: 700,
  },
};
