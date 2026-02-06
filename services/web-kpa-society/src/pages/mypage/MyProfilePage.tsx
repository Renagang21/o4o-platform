/**
 * MyProfilePage - 프로필 관리 페이지
 *
 * API 응답 기반 역할별 프로필 필드 분기:
 * - Super Operator: 기본정보만 (성/이름, 연락처, 이메일)
 * - 일반 약사: + 약사면허, 직역, 출신교, 근무처
 * - 약국개설자: + 약국명, 약국주소
 * - 지부/분회 임원: + 직책, 소속조직
 *
 * WO-KPA-PROFILE-ROLE-BASED-V1: API 데이터 구조 기반 역할별 프로필
 */

import { useState, useEffect } from 'react';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { mypageApi } from '../../api';
import { useAuth, type PharmacistRole } from '../../contexts';
import { colors, typography } from '../../styles/theme';

const PHARMACIST_ROLE_LABELS: Record<PharmacistRole, string> = {
  general: '일반 약사',
  pharmacy_owner: '약국 개설자',
  hospital: '병원 약사',
  other: '기타',
};

const ORGANIZATION_ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  manager: '매니저',
  chair: '위원장',
  officer: '위원',
  member: '회원',
};

/**
 * API 응답 타입 정의
 */
interface ProfileResponse {
  id: string;
  name: string;
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  roles: string[];
  userType: {
    isSuperOperator: boolean;
    isPharmacyOwner: boolean;
    isOfficer: boolean;
  };
  pharmacist: {
    licenseNumber: string | null;
    university: string | null;
    workplace: string | null;
  } | null;
  pharmacy: {
    name: string | null;
    address: string | null;
  } | null;
  organizations: Array<{
    id: string;
    name: string;
    type: string;
    role: string;
    position: string | null;
  }>;
}

export function MyProfilePage() {
  const { user, setPharmacistRole, checkAuth } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    email: '',
    university: '',
    workplace: '',
    pharmacistRole: '' as PharmacistRole | '',
  });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await mypageApi.getProfile();
      const data = res.data as ProfileResponse;
      setProfile(data);
      setFormData({
        lastName: data.lastName || '',
        firstName: data.firstName || '',
        phone: data.phone || '',
        email: data.email || '',
        university: data.pharmacist?.university || '',
        workplace: data.pharmacist?.workplace || '',
        pharmacistRole: user?.pharmacistRole || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        lastName: profile.lastName || '',
        firstName: profile.firstName || '',
        phone: profile.phone || '',
        email: profile.email || '',
        university: profile.pharmacist?.university || '',
        workplace: profile.pharmacist?.workplace || '',
        pharmacistRole: user?.pharmacistRole || '',
      });
    }
    setIsEditMode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      const { pharmacistRole: roleValue, ...apiFormData } = formData;
      await mypageApi.updateProfile(apiFormData);
      if (roleValue) {
        setPharmacistRole(roleValue as PharmacistRole);
      }

      // AuthContext user 갱신
      await checkAuth();
      await loadData();

      setIsEditMode(false);
      alert('프로필이 저장되었습니다.');
    } catch (err) {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="프로필을 확인하려면 로그인해주세요."
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="프로필을 불러오는 중..." />;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="오류가 발생했습니다"
          description={error}
          action={{ label: '다시 시도', onClick: loadData }}
        />
      </div>
    );
  }

  // API 응답 기반 사용자 유형 판단
  const isSuperOperator = profile?.userType?.isSuperOperator ?? false;
  const isPharmacyOwner = profile?.userType?.isPharmacyOwner ?? false;
  const isOfficer = profile?.userType?.isOfficer ?? false;
  const hasPharmacistInfo = profile?.pharmacist !== null;
  const hasPharmacyInfo = profile?.pharmacy !== null;
  const hasOrganizations = (profile?.organizations?.length ?? 0) > 0;

  return (
    <div style={styles.container}>
      <PageHeader
        title="프로필"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '마이페이지', href: '/mypage' },
          { label: '프로필' },
        ]}
      />

      <Card padding="large">
        {/* 프로필 사진 영역 */}
        <div style={styles.avatarSection}>
          <div style={styles.avatar}>
            <span style={styles.avatarIcon}>👤</span>
          </div>
          {isEditMode && (
            <button type="button" style={styles.avatarButton}>
              사진 변경
            </button>
          )}
        </div>

        {isEditMode ? (
          /* 수정 모드 */
          <form onSubmit={handleSubmit}>
            {/* 기본 정보 - 모든 사용자 */}
            <div style={styles.nameRow}>
              <div style={styles.nameField}>
                <label style={styles.label}>성</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="성"
                />
              </div>
              <div style={styles.nameField}>
                <label style={styles.label}>이름</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formData.firstName}
                  onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="이름"
                />
              </div>
            </div>

            {/* 약사 정보 - API에서 pharmacist 데이터가 있는 경우에만 */}
            {hasPharmacistInfo && (
              <>
                <div style={styles.field}>
                  <label style={styles.label}>약사면허</label>
                  <input
                    type="text"
                    style={{ ...styles.input, ...styles.inputReadonly }}
                    value={profile?.pharmacist?.licenseNumber || '-'}
                    disabled
                  />
                  <p style={styles.hint}>약사면허는 수정할 수 없습니다.</p>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>직역</label>
                  <select
                    style={styles.input}
                    value={formData.pharmacistRole}
                    onChange={e => setFormData({ ...formData, pharmacistRole: e.target.value as PharmacistRole })}
                  >
                    <option value="">선택하세요</option>
                    {(Object.entries(PHARMACIST_ROLE_LABELS) as [PharmacistRole, string][]).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>출신교 (대학)</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.university}
                    onChange={e => setFormData({ ...formData, university: e.target.value })}
                    placeholder="출신 대학을 입력하세요"
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>근무처</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.workplace}
                    onChange={e => setFormData({ ...formData, workplace: e.target.value })}
                    placeholder="근무처를 입력하세요"
                  />
                </div>
              </>
            )}

            {/* 약국 정보 - API에서 pharmacy 데이터가 있는 경우에만 */}
            {hasPharmacyInfo && (
              <>
                <div style={styles.field}>
                  <label style={styles.label}>약국명</label>
                  <input
                    type="text"
                    style={{ ...styles.input, ...styles.inputReadonly }}
                    value={profile?.pharmacy?.name || '-'}
                    disabled
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>약국주소</label>
                  <input
                    type="text"
                    style={{ ...styles.input, ...styles.inputReadonly }}
                    value={profile?.pharmacy?.address || '-'}
                    disabled
                  />
                </div>
              </>
            )}

            {/* 조직/임원 정보 - API에서 organizations 데이터가 있는 경우에만 */}
            {hasOrganizations && (
              <div style={styles.field}>
                <label style={styles.label}>소속 조직</label>
                {profile?.organizations.map((org, idx) => (
                  <div key={org.id || idx} style={styles.orgItem}>
                    <span>{org.name}</span>
                    <span style={styles.orgRole}>
                      {org.position || ORGANIZATION_ROLE_LABELS[org.role] || org.role}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>핸드폰</label>
              <input
                type="tel"
                style={styles.input}
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="연락처를 입력하세요"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>이메일</label>
              <input
                type="email"
                style={styles.input}
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="이메일을 입력하세요"
              />
            </div>

            <div style={styles.actions}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={handleCancel}
                disabled={saving}
              >
                취소
              </button>
              <button
                type="submit"
                style={styles.submitButton}
                disabled={saving}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        ) : (
          /* 조회 모드 */
          <div style={styles.profileView}>
            {/* 기본 정보 - 모든 사용자 */}
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>이름</span>
              <span style={styles.infoValue}>{profile?.name || '-'}</span>
            </div>

            {/* 약사 정보 - API에서 pharmacist 데이터가 있는 경우에만 */}
            {hasPharmacistInfo && (
              <>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>약사면허</span>
                  <span style={styles.infoValue}>{profile?.pharmacist?.licenseNumber || '-'}</span>
                </div>

                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>직역</span>
                  <span style={styles.infoValue}>
                    {user?.pharmacistRole ? PHARMACIST_ROLE_LABELS[user.pharmacistRole] : '-'}
                  </span>
                </div>

                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>출신교 (대학)</span>
                  <span style={styles.infoValue}>{profile?.pharmacist?.university || '-'}</span>
                </div>

                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>근무처</span>
                  <span style={styles.infoValue}>{profile?.pharmacist?.workplace || '-'}</span>
                </div>
              </>
            )}

            {/* 약국 정보 - API에서 pharmacy 데이터가 있는 경우에만 */}
            {hasPharmacyInfo && (
              <>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>약국명</span>
                  <span style={styles.infoValue}>{profile?.pharmacy?.name || '-'}</span>
                </div>

                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>약국주소</span>
                  <span style={styles.infoValue}>{profile?.pharmacy?.address || '-'}</span>
                </div>
              </>
            )}

            {/* 조직/임원 정보 - API에서 organizations 데이터가 있는 경우에만 */}
            {hasOrganizations && (
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>소속 조직</span>
                <div style={styles.orgList}>
                  {profile?.organizations.map((org, idx) => (
                    <div key={org.id || idx} style={styles.orgItem}>
                      <span>{org.name}</span>
                      <span style={styles.orgRole}>
                        {org.position || ORGANIZATION_ROLE_LABELS[org.role] || org.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>핸드폰</span>
              <span style={styles.infoValue}>{profile?.phone || '-'}</span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>이메일</span>
              <span style={styles.infoValue}>{profile?.email || '-'}</span>
            </div>

            <div style={styles.editButtonWrapper}>
              <button
                type="button"
                style={styles.editButton}
                onClick={handleEdit}
              >
                수정
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* 비밀번호 변경 */}
      <Card padding="large" style={{ marginTop: '24px' }}>
        <h3 style={styles.sectionTitle}>비밀번호 변경</h3>
        <p style={styles.sectionDesc}>
          비밀번호를 변경하려면 아래 버튼을 클릭하세요.
        </p>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => alert('비밀번호 변경 기능은 준비 중입니다.')}
        >
          비밀번호 변경
        </button>
      </Card>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '32px',
  },
  avatar: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: colors.neutral100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  avatarIcon: {
    fontSize: '48px',
  },
  avatarButton: {
    padding: '8px 16px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  profileView: {
    display: 'flex',
    flexDirection: 'column',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '16px 0',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  infoLabel: {
    ...typography.bodyM,
    color: colors.neutral500,
    fontWeight: 500,
    minWidth: '120px',
  },
  infoValue: {
    ...typography.bodyM,
    color: colors.neutral900,
    textAlign: 'right',
  },
  editButtonWrapper: {
    marginTop: '24px',
    display: 'flex',
    justifyContent: 'center',
  },
  editButton: {
    padding: '12px 48px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  field: {
    marginBottom: '20px',
  },
  nameRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '20px',
  },
  nameField: {
    flex: 1,
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 500,
    color: colors.neutral700,
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  inputReadonly: {
    backgroundColor: colors.neutral50,
    color: colors.neutral500,
  },
  hint: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginTop: '4px',
  },
  actions: {
    marginTop: '32px',
    display: 'flex',
    gap: '12px',
  },
  cancelButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  submitButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '8px',
  },
  sectionDesc: {
    ...typography.bodyM,
    color: colors.neutral500,
    marginBottom: '16px',
  },
  secondaryButton: {
    padding: '12px 24px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  orgList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  orgItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: colors.neutral50,
    borderRadius: '6px',
  },
  orgRole: {
    fontSize: '12px',
    color: colors.primary,
    fontWeight: 500,
  },
};
