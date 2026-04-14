/**
 * StewardManagementPage - Steward 관리 (운영자 전용)
 *
 * WO-KPA-STEWARDSHIP-AND-ORGANIZATION-UI-IMPLEMENTATION-V1
 *
 * Steward는 RBAC role이 아님 - 서비스 내부 배정(assignment)
 * 배정 단위: organization, forum, education, content
 *
 * 금지 사항:
 * - RoleAssignment 사용 금지
 * - 권한 레벨 수치화 금지
 * - My 화면에서 노출 금지
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@o4o/error-handling';
import { adminApi } from '../../api/admin';
import type { Steward, Organization, Member, StewardScopeType, AssignStewardDto } from '../../api/admin';
import { PageHeader, LoadingSpinner, Card } from '../../components/common';
import { colors } from '../../styles/theme';

// Scope type labels
const SCOPE_TYPE_LABELS: Record<StewardScopeType, string> = {
  organization: '조직 전체',
  forum: '포럼',
  education: '교육',
  content: '콘텐츠',
};

export function StewardManagementPage() {
  const [stewards, setStewards] = useState<Steward[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [formData, setFormData] = useState<AssignStewardDto>({
    organization_id: '',
    member_id: '',
    scope_type: 'organization',
  });
  const [formNote, setFormNote] = useState('');

  // Filter state
  const [filterOrgId, setFilterOrgId] = useState<string>('');
  const [filterScopeType, setFilterScopeType] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | boolean> = { active_only: true };
      if (filterOrgId) params.organization_id = filterOrgId;
      if (filterScopeType) params.scope_type = filterScopeType;

      const [stewardRes, orgRes] = await Promise.all([
        adminApi.getStewards(params),
        adminApi.getOrganizations({ active_only: true }),
      ]);

      setStewards(stewardRes.data || []);
      setOrganizations(orgRes.data || []);
    } catch (err: any) {
      setError(err.message || '데이터를 불러올 수 없습니다.');
      // Demo fallback
      setStewards([]);
      setOrganizations([
        { id: 'org-1', name: '샘플조직', type: 'association', parent_id: null, description: null, address: null, phone: null, is_active: true, created_at: '', updated_at: '' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [filterOrgId, filterScopeType]);

  const loadMembersForOrg = async (_orgId: string) => {
    try {
      const res = await adminApi.getMembers() as any;
      setMembers(res.data?.items || []);
    } catch {
      setMembers([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (formData.organization_id) {
      loadMembersForOrg(formData.organization_id);
    } else {
      setMembers([]);
    }
  }, [formData.organization_id]);

  const handleAssign = async () => {
    if (!formData.organization_id || !formData.member_id || !formData.scope_type) {
      toast.error('필수 항목을 선택해주세요.');
      return;
    }

    setActionLoading('assign');
    try {
      const data: AssignStewardDto = {
        ...formData,
        note: formNote || undefined,
      };
      await adminApi.assignSteward(data);
      setShowAssignForm(false);
      setFormData({ organization_id: '', member_id: '', scope_type: 'organization' });
      setFormNote('');
      await loadData();
      toast.success('Steward가 배정되었습니다.');
    } catch (err: any) {
      toast.error(err.message || '배정에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('이 Steward 배정을 해제하시겠습니까?')) return;

    setActionLoading(id);
    try {
      await adminApi.revokeSteward(id);
      await loadData();
      toast.success('Steward 배정이 해제되었습니다.');
    } catch (err: any) {
      toast.error(err.message || '해제에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const getOrgName = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    return org?.name || orgId.slice(0, 8) + '...';
  };

  if (loading) {
    return <LoadingSpinner message="Steward 목록을 불러오는 중..." />;
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="Steward 관리"
        description="조직/공간 단위 운영 책임을 배정하고 관리합니다."
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '관리자', href: '/admin' },
          { label: 'Steward 관리' },
        ]}
      />

      {/* 필터 및 액션 */}
      <div style={styles.toolbar}>
        <div style={styles.filters}>
          <select
            value={filterOrgId}
            onChange={(e) => setFilterOrgId(e.target.value)}
            style={styles.select}
          >
            <option value="">전체 조직</option>
            {organizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <select
            value={filterScopeType}
            onChange={(e) => setFilterScopeType(e.target.value)}
            style={styles.select}
          >
            <option value="">전체 범위</option>
            {Object.entries(SCOPE_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowAssignForm(true)}
          style={styles.primaryButton}
        >
          + Steward 배정
        </button>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          {error}
          <button onClick={loadData} style={styles.retryButton}>다시 시도</button>
        </div>
      )}

      {/* 배정 폼 */}
      {showAssignForm && (
        <Card>
          <div style={styles.formCard}>
            <h3 style={styles.formTitle}>새 Steward 배정</h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>조직 *</label>
                <select
                  value={formData.organization_id}
                  onChange={(e) => setFormData({ ...formData, organization_id: e.target.value, member_id: '' })}
                  style={styles.input}
                >
                  <option value="">조직 선택</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>회원 *</label>
                <select
                  value={formData.member_id}
                  onChange={(e) => setFormData({ ...formData, member_id: e.target.value })}
                  style={styles.input}
                  disabled={!formData.organization_id}
                >
                  <option value="">회원 선택</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.pharmacy_name || m.license_number || m.id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>운영 범위 *</label>
                <select
                  value={formData.scope_type}
                  onChange={(e) => setFormData({ ...formData, scope_type: e.target.value as StewardScopeType })}
                  style={styles.input}
                >
                  {Object.entries(SCOPE_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>배정 메모</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="배정 사유 입력 (선택)"
                  style={styles.input}
                />
              </div>
            </div>
            <div style={styles.formActions}>
              <button
                onClick={() => setShowAssignForm(false)}
                style={styles.cancelButton}
              >
                취소
              </button>
              <button
                onClick={handleAssign}
                disabled={actionLoading === 'assign'}
                style={{
                  ...styles.primaryButton,
                  opacity: actionLoading === 'assign' ? 0.6 : 1,
                }}
              >
                {actionLoading === 'assign' ? '배정 중...' : '배정'}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Steward 목록 */}
      <div style={styles.summary}>
        활성 Steward <strong>{stewards.length}</strong>명
      </div>

      {stewards.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>👤</div>
          <div style={styles.emptyTitle}>배정된 Steward가 없습니다</div>
          <div style={styles.emptyDesc}>새 Steward를 배정하여 운영 책임을 부여하세요.</div>
        </div>
      ) : (
        <div style={styles.list}>
          {stewards.map(steward => (
            <Card key={steward.id}>
              <div style={styles.stewardCard}>
                <div style={styles.stewardInfo}>
                  <div style={styles.stewardHeader}>
                    <span style={styles.scopeBadge}>
                      {SCOPE_TYPE_LABELS[steward.scope_type]}
                    </span>
                    <span style={styles.orgName}>
                      {getOrgName(steward.organization_id)}
                    </span>
                  </div>
                  <div style={styles.stewardMeta}>
                    <span>회원: {steward.member?.pharmacy_name || steward.member_id.slice(0, 8)}</span>
                    <span>•</span>
                    <span>배정일: {new Date(steward.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                  {steward.note && (
                    <div style={styles.stewardNote}>메모: {steward.note}</div>
                  )}
                </div>
                <div style={styles.stewardActions}>
                  <button
                    onClick={() => handleRevoke(steward.id)}
                    disabled={actionLoading === steward.id}
                    style={{
                      ...styles.revokeButton,
                      opacity: actionLoading === steward.id ? 0.6 : 1,
                    }}
                  >
                    {actionLoading === steward.id ? '해제 중...' : '해제'}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px',
    flexWrap: 'wrap',
  },
  filters: {
    display: 'flex',
    gap: '12px',
  },
  select: {
    padding: '10px 14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: colors.white,
    cursor: 'pointer',
    minWidth: '150px',
  },
  primaryButton: {
    padding: '12px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retryButton: {
    padding: '6px 12px',
    backgroundColor: colors.white,
    border: '1px solid #DC2626',
    borderRadius: '4px',
    color: '#DC2626',
    fontSize: '13px',
    cursor: 'pointer',
  },
  formCard: {
    padding: '8px',
  },
  formTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '16px',
    color: colors.neutral900,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral700,
  },
  input: {
    padding: '10px 12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  summary: {
    fontSize: '14px',
    color: colors.neutral600,
    marginBottom: '16px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  stewardCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px',
    gap: '16px',
  },
  stewardInfo: {
    flex: 1,
  },
  stewardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  scopeBadge: {
    padding: '4px 10px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  orgName: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  stewardMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '13px',
    color: colors.neutral500,
    marginBottom: '4px',
  },
  stewardNote: {
    fontSize: '13px',
    color: colors.neutral600,
    fontStyle: 'italic',
  },
  stewardActions: {
    flexShrink: 0,
  },
  revokeButton: {
    padding: '8px 16px',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    backgroundColor: colors.neutral50,
    borderRadius: '12px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral700,
    marginBottom: '8px',
  },
  emptyDesc: {
    fontSize: '14px',
    color: colors.neutral500,
  },
};
