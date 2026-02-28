/**
 * ForumRequestPanel.tsx
 * 분회 포럼 카테고리 생성 요청 승인 패널 (branch:admin 전용)
 *
 * WO-PLATFORM-FORUM-APPROVAL-CORE-DECOUPLING-V1
 *
 * API: GET /branches/:branchId/forum-requests/pending
 * Actions: PATCH .../approve, PATCH .../reject, PATCH .../request-revision
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

interface PendingForumRequest {
  id: string;
  entity_type: string;
  organization_id: string;
  payload: {
    name: string;
    description: string;
    reason?: string;
    iconEmoji?: string;
  };
  status: string;
  requester_id: string;
  requester_name: string;
  requester_email: string | null;
  submitted_at: string | null;
  created_at: string;
}

function SkeletonRow() {
  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <div style={{ ...s.skeletonBox, width: '8rem', height: '1rem' }} />
      </div>
      <div style={{ ...s.skeletonBox, width: '60%', height: '0.75rem', marginBottom: '6px' }} />
      <div style={{ ...s.skeletonBox, width: '40%', height: '0.75rem' }} />
      <div style={s.actionRow}>
        <div style={{ ...s.skeletonBox, width: '3.5rem', height: '2rem' }} />
        <div style={{ ...s.skeletonBox, width: '3.5rem', height: '2rem' }} />
        <div style={{ ...s.skeletonBox, width: '3.5rem', height: '2rem' }} />
      </div>
    </div>
  );
}

export function ForumRequestPanel() {
  const { branchId } = useParams<{ branchId: string }>();
  const [items, setItems] = useState<PendingForumRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const fetchPending = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    apiClient.get<{ data: PendingForumRequest[] }>(`/branches/${branchId}/forum-requests/pending`)
      .then((res) => setItems(res.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'request-revision') => {
    if (!branchId || processingIds.has(id)) return;
    setProcessingIds(prev => new Set(prev).add(id));
    setItems(prev => prev.filter(r => r.id !== id));

    try {
      let body: Record<string, string> = {};
      if (action === 'reject') body = { review_comment: '검토 결과 보류' };
      if (action === 'request-revision') body = { revision_note: '신청서 보완이 필요합니다' };
      await apiClient.patch(`/branches/${branchId}/forum-requests/${id}/${action}`, body);
    } catch {
      fetchPending();
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const formatDate = (iso: string) => {
    try { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    catch { return iso; }
  };

  return (
    <section>
      <style>{skeletonKeyframes}</style>
      <h3 style={s.sectionTitle}>포럼 카테고리 승인</h3>

      {loading ? (
        <div style={s.list}><SkeletonRow /><SkeletonRow /></div>
      ) : items.length === 0 ? (
        <div style={s.emptyBox}>
          <span style={s.emptyText}>대기 중인 포럼 카테고리 요청이 없습니다.</span>
        </div>
      ) : (
        <>
          <div style={s.countBar}>
            <span style={s.countLabel}>{items.length}건 대기 중</span>
          </div>
          <div style={s.list}>
            {items.map((r) => (
              <div key={r.id} style={s.card}>
                <div style={s.cardHeader}>
                  <span style={s.title}>
                    {r.payload.iconEmoji ? `${r.payload.iconEmoji} ` : ''}{r.payload.name}
                  </span>
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>신청자</span>
                  <span style={s.infoValue}>{r.requester_name || '(이름 없음)'}</span>
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>신청일</span>
                  <span style={s.infoValue}>{formatDate(r.submitted_at || r.created_at)}</span>
                </div>
                {r.payload.description && (
                  <div style={s.descBox}>
                    <span style={s.descText}>
                      {r.payload.description.length > 120 ? r.payload.description.slice(0, 120) + '...' : r.payload.description}
                    </span>
                  </div>
                )}
                {r.payload.reason && (
                  <div style={s.descBox}>
                    <span style={{ ...s.descText, fontStyle: 'italic' }}>
                      사유: {r.payload.reason.length > 80 ? r.payload.reason.slice(0, 80) + '...' : r.payload.reason}
                    </span>
                  </div>
                )}
                <div style={s.actionRow}>
                  <button type="button" style={s.approveBtn} onClick={() => handleAction(r.id, 'approve')}>승인</button>
                  <button type="button" style={s.revisionBtn} onClick={() => handleAction(r.id, 'request-revision')}>보완</button>
                  <button type="button" style={s.rejectBtn} onClick={() => handleAction(r.id, 'reject')}>거절</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

const skeletonKeyframes = `
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
`;

const s: Record<string, React.CSSProperties> = {
  sectionTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: `0 0 ${spacing.md} 0`,
  } as React.CSSProperties,
  countBar: {
    marginBottom: spacing.md,
    padding: `${spacing.sm} ${spacing.md}`,
    background: '#fefce8',
    borderRadius: borderRadius.md,
    border: '1px solid #fde68a',
  },
  countLabel: {
    ...typography.bodyS,
    color: '#d97706',
    fontWeight: 600,
  } as React.CSSProperties,
  list: { display: 'flex', flexDirection: 'column', gap: spacing.md },
  card: {
    background: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral200}`,
    boxShadow: shadows.sm,
    padding: spacing.lg,
  },
  cardHeader: { marginBottom: spacing.sm },
  title: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
    fontSize: '0.9375rem',
  } as React.CSSProperties,
  infoRow: { display: 'flex', gap: spacing.sm, marginBottom: '4px' },
  infoLabel: {
    ...typography.bodyS,
    color: colors.neutral400,
    minWidth: '3.5rem',
  } as React.CSSProperties,
  infoValue: {
    ...typography.bodyS,
    color: colors.neutral700,
  } as React.CSSProperties,
  descBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    background: colors.neutral50,
    borderRadius: borderRadius.sm,
  },
  descText: {
    ...typography.bodyS,
    color: colors.neutral600,
    lineHeight: '1.4',
  } as React.CSSProperties,
  actionRow: { display: 'flex', gap: spacing.sm, marginTop: spacing.md },
  approveBtn: {
    flex: 1,
    padding: `${spacing.sm} ${spacing.md}`,
    background: '#059669',
    color: colors.white,
    border: 'none',
    borderRadius: borderRadius.md,
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
  } as React.CSSProperties,
  revisionBtn: {
    flex: 1,
    padding: `${spacing.sm} ${spacing.md}`,
    background: colors.white,
    color: '#d97706',
    border: '1px solid #fde68a',
    borderRadius: borderRadius.md,
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
  } as React.CSSProperties,
  rejectBtn: {
    flex: 1,
    padding: `${spacing.sm} ${spacing.md}`,
    background: colors.white,
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: borderRadius.md,
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
  } as React.CSSProperties,
  skeletonBox: {
    background: colors.neutral200,
    borderRadius: borderRadius.sm,
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  },
  emptyBox: {
    padding: spacing.xl,
    textAlign: 'center',
    background: colors.neutral50,
    borderRadius: borderRadius.md,
    border: `2px dashed ${colors.neutral300}`,
  },
  emptyText: {
    ...typography.bodyM,
    color: colors.neutral400,
  } as React.CSSProperties,
};
