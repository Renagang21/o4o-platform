/**
 * InstructorQualificationPanel.tsx
 * 분회 강사 자격 승인 패널 (branch:admin 전용)
 *
 * WO-KPA-B-LMS-GUARD-BYPASS-AUDIT-AND-IMPLEMENTATION-V1
 *
 * API: GET /branches/:branchId/instructor-qualifications/pending
 * Actions: PATCH .../approve, PATCH .../reject
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

interface PendingQualification {
  id: string;
  user_id: string;
  qualification_type: string;
  license_number: string | null;
  specialty_area: string | null;
  teaching_experience_years: number;
  applicant_note: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
}

function SkeletonRow() {
  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
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

export function InstructorQualificationPanel() {
  const { branchId } = useParams<{ branchId: string }>();
  const [items, setItems] = useState<PendingQualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const fetchPending = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    apiClient.get<{ data: PendingQualification[] }>(`/branches/${branchId}/instructor-qualifications/pending`)
      .then((res) => setItems(res.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (!branchId || processingIds.has(id)) return;
    setProcessingIds(prev => new Set(prev).add(id));
    setItems(prev => prev.filter(q => q.id !== id));

    try {
      const body = action === 'reject' ? { rejectionReason: '자격 요건 미충족' } : {};
      await apiClient.patch(`/branches/${branchId}/instructor-qualifications/${id}/${action}`, body);
    } catch {
      fetchPending();
    } finally {
      setProcessingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const typeLabel = (t: string) => t === 'pharmacist_instructor' ? '약사 강사' : '학생 강사';

  const formatDate = (iso: string) => {
    try { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    catch { return iso; }
  };

  return (
    <section>
      <style>{skeletonKeyframes}</style>
      <h3 style={s.sectionTitle}>강사 자격 승인</h3>

      {loading ? (
        <div style={s.list}><SkeletonRow /><SkeletonRow /></div>
      ) : items.length === 0 ? (
        <div style={s.emptyBox}>
          <span style={s.emptyText}>대기 중인 강사 자격 신청이 없습니다.</span>
        </div>
      ) : (
        <>
          <div style={s.countBar}>
            <span style={s.countLabel}>{items.length}건 대기 중</span>
          </div>
          <div style={s.list}>
            {items.map((q) => (
              <div key={q.id} style={s.card}>
                <div style={s.cardHeader}>
                  <span style={s.name}>{q.user_name || '(이름 없음)'}</span>
                  <span style={s.badge}>{typeLabel(q.qualification_type)}</span>
                </div>
                <div style={s.infoRow}>
                  <span style={s.infoLabel}>신청일</span>
                  <span style={s.infoValue}>{formatDate(q.created_at)}</span>
                </div>
                {q.license_number && (
                  <div style={s.infoRow}>
                    <span style={s.infoLabel}>면허번호</span>
                    <span style={s.infoValue}>{q.license_number}</span>
                  </div>
                )}
                {q.specialty_area && (
                  <div style={s.infoRow}>
                    <span style={s.infoLabel}>전문분야</span>
                    <span style={s.infoValue}>{q.specialty_area}</span>
                  </div>
                )}
                {q.teaching_experience_years > 0 && (
                  <div style={s.infoRow}>
                    <span style={s.infoLabel}>경력</span>
                    <span style={s.infoValue}>{q.teaching_experience_years}년</span>
                  </div>
                )}
                <div style={s.actionRow}>
                  <button type="button" style={s.approveBtn} onClick={() => handleAction(q.id, 'approve')}>승인</button>
                  <button type="button" style={s.rejectBtn} onClick={() => handleAction(q.id, 'reject')}>거절</button>
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
    background: '#eff6ff',
    borderRadius: borderRadius.md,
    border: '1px solid #bfdbfe',
  },
  countLabel: {
    ...typography.bodyS,
    color: '#2563eb',
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
  cardHeader: { display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  name: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
    fontSize: '0.9375rem',
  } as React.CSSProperties,
  badge: {
    ...typography.bodyS,
    color: '#2563eb',
    background: '#eff6ff',
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    fontWeight: 500,
    fontSize: '0.75rem',
  } as React.CSSProperties,
  infoRow: { display: 'flex', gap: spacing.sm, marginBottom: '4px' },
  infoLabel: {
    ...typography.bodyS,
    color: colors.neutral400,
    minWidth: '4rem',
  } as React.CSSProperties,
  infoValue: {
    ...typography.bodyS,
    color: colors.neutral700,
  } as React.CSSProperties,
  actionRow: { display: 'flex', gap: spacing.sm, marginTop: spacing.md },
  approveBtn: {
    flex: 1,
    padding: `${spacing.sm} ${spacing.md}`,
    background: '#2563eb',
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
