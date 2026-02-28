/**
 * BranchMemberApprovalPanel.tsx
 * 분회 회원 승인 워크플로우 패널 (branch:admin 전용)
 *
 * WO-KPA-B-BRANCH-ADMIN-MEMBER-WORKFLOW-V1
 *
 * 단일 화면 내 승인/거절 워크플로우 완결형 UI.
 * API 1 call로 대기 목록 조회 → 인라인 승인/거절 → 즉시 상태 반영.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

interface PendingMember {
  requestId: string;
  userId: string;
  name: string;
  contactEmail: string;
  requestedRole: string;
  requestType: string;
  requestedAt: string;
  activityType: string | null;
}

/** Skeleton 카드 */
function SkeletonRow() {
  return (
    <div style={s.memberCard}>
      <div style={s.memberHeader}>
        <div style={{ ...s.skeletonBox, width: '5rem', height: '1rem' }} />
        <div style={{ ...s.skeletonBox, width: '3.5rem', height: '0.75rem' }} />
      </div>
      <div style={{ ...s.skeletonBox, width: '70%', height: '0.75rem', marginBottom: '6px' }} />
      <div style={{ ...s.skeletonBox, width: '50%', height: '0.75rem' }} />
      <div style={s.actionRow}>
        <div style={{ ...s.skeletonBox, width: '4rem', height: '2rem' }} />
        <div style={{ ...s.skeletonBox, width: '4rem', height: '2rem' }} />
      </div>
    </div>
  );
}

export function BranchMemberApprovalPanel() {
  const { branchId } = useParams<{ branchId: string }>();
  const [members, setMembers] = useState<PendingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const fetchPending = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    apiClient.get<{ data: PendingMember[] }>(`/branches/${branchId}/pending-members`)
      .then((res) => setMembers(res.data || []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    if (!branchId || processingIds.has(requestId)) return;

    // Optimistic UI: 즉시 제거
    setProcessingIds(prev => new Set(prev).add(requestId));
    setMembers(prev => prev.filter(m => m.requestId !== requestId));

    try {
      await apiClient.patch<{ data: { requestId: string; status: string } }>(
        `/branches/${branchId}/pending-members/${requestId}/${action}`,
      );
    } catch {
      // 실패 시 롤백 — 목록 재조회
      fetchPending();
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch { return iso; }
  };

  return (
    <section>
      <style>{skeletonKeyframes}</style>
      <h3 style={s.sectionTitle}>회원 승인 대기</h3>

      {loading ? (
        <div style={s.list}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : members.length === 0 ? (
        <div style={s.emptyBox}>
          <span style={s.emptyText}>대기 중인 신청이 없습니다.</span>
        </div>
      ) : (
        <>
          <div style={s.countBar}>
            <span style={s.countLabel}>{members.length}건 대기 중</span>
          </div>
          <div style={s.list}>
            {members.map((m) => (
              <div key={m.requestId} style={s.memberCard}>
                <div style={s.memberHeader}>
                  <span style={s.memberName}>{m.name || '(이름 없음)'}</span>
                  {m.activityType && (
                    <span style={s.badge}>{m.activityType}</span>
                  )}
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>신청일</span>
                  <span style={s.infoValue}>{formatDate(m.requestedAt)}</span>
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>이메일</span>
                  <span style={s.infoValue}>{m.contactEmail}</span>
                </div>
                <div style={s.actionRow}>
                  <button
                    type="button"
                    style={s.approveBtn}
                    onClick={() => handleAction(m.requestId, 'approve')}
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    style={s.rejectBtn}
                    onClick={() => handleAction(m.requestId, 'reject')}
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ─── Skeleton keyframes ─────────────────────────────
const skeletonKeyframes = `
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
`;

// ─── Styles ──────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  sectionTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: `0 0 ${spacing.md} 0`,
  } as React.CSSProperties,

  countBar: {
    marginBottom: spacing.md,
    padding: `${spacing.sm} ${spacing.md}`,
    background: '#fef2f2',
    borderRadius: borderRadius.md,
    border: '1px solid #fecaca',
  },
  countLabel: {
    ...typography.bodyS,
    color: '#dc2626',
    fontWeight: 600,
  } as React.CSSProperties,

  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },

  memberCard: {
    background: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral200}`,
    boxShadow: shadows.sm,
    padding: spacing.lg,
  },
  memberHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  memberName: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
    fontSize: '0.9375rem',
  } as React.CSSProperties,
  badge: {
    ...typography.bodyS,
    color: '#059669',
    background: '#ecfdf5',
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    fontWeight: 500,
    fontSize: '0.75rem',
  } as React.CSSProperties,

  infoRow: {
    display: 'flex',
    gap: spacing.sm,
    marginBottom: '4px',
  },
  infoLabel: {
    ...typography.bodyS,
    color: colors.neutral400,
    minWidth: '3.5rem',
  } as React.CSSProperties,
  infoValue: {
    ...typography.bodyS,
    color: colors.neutral700,
  } as React.CSSProperties,

  actionRow: {
    display: 'flex',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
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
  rejectBtn: {
    flex: 1,
    padding: `${spacing.sm} ${spacing.md}`,
    background: colors.white,
    color: '#dc2626',
    border: `1px solid #fecaca`,
    borderRadius: borderRadius.md,
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
  } as React.CSSProperties,

  // Skeleton
  skeletonBox: {
    background: colors.neutral200,
    borderRadius: borderRadius.sm,
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  },

  // Empty
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
