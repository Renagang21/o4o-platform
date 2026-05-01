/**
 * MyProfilePage - 프로필 관리 페이지
 *
 * WO-KPA-PROFILE-ROLE-BASED-V1: API 데이터 구조 기반 역할별 프로필
 * WO-KPA-SOCIETY-PROFILE-TABS-AND-ROLE-DETAILS-V1: 탭 UI (기본 정보 / 직역 정보)
 *
 * Tab 1 (기본 정보): 이름, 연락처, 이메일 + 비밀번호 변경
 * Tab 2 (직역 정보): 약사면허, 직역, 출신교 + 역할별 사업장/근무지 정보 + 소속 조직
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { MyPageNavigation } from '@o4o/account-ui';
import { KPA_MYPAGE_NAV_ITEMS } from './navItems';
import { mypageApi, type ProfileResponse } from '../../api';
import { useAuth, ACTIVITY_TYPE_LABELS } from '../../contexts';
import { colors, typography } from '../../styles/theme';

const EDITABLE_ACTIVITY_TYPES = [
  'pharmacy_owner', 'pharmacy_employee', 'hospital',
  'manufacturer', 'importer', 'wholesaler', 'other_industry',
  'government', 'school', 'other', 'inactive',
] as const;

const ORGANIZATION_ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  manager: '매니저',
  chair: '위원장',
  officer: '위원',
  member: '회원',
};

type TabKey = 'basic' | 'role';

export function MyProfilePage() {
  const { user, setActivityType, checkAuth } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('basic');

  // Basic tab edit
  const [isBasicEdit, setIsBasicEdit] = useState(false);
  const [basicSaving, setBasicSaving] = useState(false);
  const [basicForm, setBasicForm] = useState({
    lastName: '',
    firstName: '',
    nickname: '',
    phone: '',
    email: '',
  });

  // Role tab edit
  const [isRoleEdit, setIsRoleEdit] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleForm, setRoleForm] = useState({
    activityType: '',
    university: '',
    workplace: '',
  });

  // Password
  const [isPasswordMode, setIsPasswordMode] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: '',
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
      resetBasicForm(data);
      resetRoleForm(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const resetBasicForm = (data: ProfileResponse) => {
    setBasicForm({
      lastName: data.lastName || '',
      firstName: data.firstName || '',
      nickname: data.nickname || '',
      phone: data.phone || '',
      email: data.email || '',
    });
  };

  const resetRoleForm = (data: ProfileResponse) => {
    setRoleForm({
      activityType: user?.activityType || '',
      university: data.pharmacist?.university || '',
      workplace: data.pharmacist?.workplace || '',
    });
  };

  // ─── Basic tab handlers ───
  const handleBasicSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBasicSaving(true);
      await mypageApi.updateProfile(basicForm);
      await checkAuth();
      await loadData();
      setIsBasicEdit(false);
      toast.success('기본 정보가 저장되었습니다.');
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setBasicSaving(false);
    }
  };

  const handleBasicCancel = () => {
    if (profile) resetBasicForm(profile);
    setIsBasicEdit(false);
  };

  // ─── Role tab handlers ───
  const handleRoleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setRoleSaving(true);
      // Save university/workplace via mypage API
      await mypageApi.updateProfile({
        university: roleForm.university,
        workplace: roleForm.workplace,
      });
      // Save activityType via auth API
      if (roleForm.activityType) {
        await setActivityType(roleForm.activityType);
      }
      await checkAuth();
      await loadData();
      setIsRoleEdit(false);
      toast.success('직역 정보가 저장되었습니다.');
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setRoleSaving(false);
    }
  };

  const handleRoleCancel = () => {
    if (profile) resetRoleForm(profile);
    setIsRoleEdit(false);
  };

  // ─── Password handlers ───
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (passwordData.newPassword.length < 8) {
      setPasswordError('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (passwordData.newPassword !== passwordData.newPasswordConfirm) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    try {
      setPasswordSaving(true);
      await mypageApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        newPasswordConfirm: passwordData.newPasswordConfirm,
      });
      toast.success('비밀번호가 변경되었습니다.');
      setIsPasswordMode(false);
      setPasswordData({ currentPassword: '', newPassword: '', newPasswordConfirm: '' });
    } catch (err: any) {
      const message = err?.message || '비밀번호 변경에 실패했습니다.';
      if (message.includes('incorrect') || message.includes('Current password')) {
        setPasswordError('현재 비밀번호가 올바르지 않습니다.');
      } else {
        setPasswordError(message);
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const handlePasswordCancel = () => {
    setIsPasswordMode(false);
    setPasswordError(null);
    setPasswordData({ currentPassword: '', newPassword: '', newPasswordConfirm: '' });
  };

  // ─── Tab switch ───
  const handleTabChange = (tab: TabKey) => {
    // Reset edit modes when switching tabs
    if (tab !== activeTab) {
      if (isBasicEdit && profile) { resetBasicForm(profile); setIsBasicEdit(false); }
      if (isRoleEdit && profile) { resetRoleForm(profile); setIsRoleEdit(false); }
    }
    setActiveTab(tab);
  };

  // ─── Guards ───
  if (!user) {
    return (
      <div style={styles.container}>
        <EmptyState icon="🔒" title="로그인이 필요합니다" description="프로필을 확인하려면 로그인해주세요." />
      </div>
    );
  }

  if (loading) return <LoadingSpinner message="프로필을 불러오는 중..." />;

  if (error) {
    return (
      <div style={styles.container}>
        <EmptyState icon="⚠️" title="오류가 발생했습니다" description={error} action={{ label: '다시 시도', onClick: loadData }} />
      </div>
    );
  }

  const hasPharmacistInfo = profile?.pharmacist !== null;
  const hasOrganizations = (profile?.organizations?.length ?? 0) > 0;
  const activityType = user?.activityType || '';
  const isPharmacyOwner = activityType === 'pharmacy_owner';
  const biz = profile?.businessInfo;

  // Derive pharmacy/workplace display info
  const pharmacyName = profile?.pharmacy?.name || biz?.businessName || null;
  const pharmacyAddress = profile?.pharmacy?.address
    || (biz?.storeAddress
      ? [biz.storeAddress.zipCode, biz.storeAddress.baseAddress, biz.storeAddress.detailAddress].filter(Boolean).join(' ')
      : biz?.address || null);
  const pharmacyPhone = biz?.phone || null;
  const workplaceName = biz?.businessName || null;
  const workplacePhone = biz?.phone || null;

  return (
    <div style={styles.container}>
      <PageHeader
        title="프로필"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '마이페이지', href: `/mypage` },
          { label: '프로필' },
        ]}
      />
      <MyPageNavigation items={KPA_MYPAGE_NAV_ITEMS} />

      {/* Tab bar */}
      <div style={styles.tabBar}>
        <button
          type="button"
          style={activeTab === 'basic' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
          onClick={() => handleTabChange('basic')}
        >
          기본 정보
        </button>
        {hasPharmacistInfo && (
          <button
            type="button"
            style={activeTab === 'role' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
            onClick={() => handleTabChange('role')}
          >
            직역 정보
          </button>
        )}
      </div>

      {/* ═══ Tab 1: 기본 정보 ═══ */}
      {activeTab === 'basic' && (
        <>
          <Card padding="large">
            <div style={styles.avatarSection}>
              <div style={styles.avatar}>
                <span style={styles.avatarIcon}>👤</span>
              </div>
            </div>

            {isBasicEdit ? (
              <form onSubmit={handleBasicSave}>
                <div style={styles.nameRow}>
                  <div style={styles.nameField}>
                    <label style={styles.label}>성</label>
                    <input type="text" style={styles.input} value={basicForm.lastName}
                      onChange={e => setBasicForm({ ...basicForm, lastName: e.target.value })} placeholder="성" />
                  </div>
                  <div style={styles.nameField}>
                    <label style={styles.label}>이름</label>
                    <input type="text" style={styles.input} value={basicForm.firstName}
                      onChange={e => setBasicForm({ ...basicForm, firstName: e.target.value })} placeholder="이름" />
                  </div>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>닉네임</label>
                  <input type="text" style={styles.input} value={basicForm.nickname}
                    onChange={e => setBasicForm({ ...basicForm, nickname: e.target.value })} placeholder="활동 시 사용할 이름 입력" maxLength={50} />
                  <p style={styles.hint}>실제 이름과 별도로 공개 화면(포럼, 댓글 등)에 표시됩니다.</p>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>핸드폰</label>
                  <input type="tel" style={styles.input} value={basicForm.phone}
                    onChange={e => setBasicForm({ ...basicForm, phone: e.target.value })} placeholder="연락처를 입력하세요" />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>이메일</label>
                  <input type="email" style={styles.input} value={basicForm.email}
                    onChange={e => setBasicForm({ ...basicForm, email: e.target.value })} placeholder="이메일을 입력하세요" />
                </div>

                <div style={styles.actions}>
                  <button type="button" style={styles.cancelButton} onClick={handleBasicCancel} disabled={basicSaving}>취소</button>
                  <button type="submit" style={styles.submitButton} disabled={basicSaving}>{basicSaving ? '저장 중...' : '저장'}</button>
                </div>
              </form>
            ) : (
              <div style={styles.profileView}>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>이름</span>
                  <span style={styles.infoValue}>{profile?.name || '-'}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>닉네임</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={styles.infoValue}>{profile?.nickname || '-'}</span>
                    <p style={styles.hint}>포럼, 댓글 등 공개 화면에 표시됩니다.</p>
                  </div>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>핸드폰</span>
                  <span style={styles.infoValue}>{profile?.phone || '-'}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>이메일</span>
                  <span style={styles.infoValue}>{profile?.email || '-'}</span>
                </div>
                <div style={styles.editButtonWrapper}>
                  <button type="button" style={styles.editButton} onClick={() => setIsBasicEdit(true)}>수정</button>
                </div>
              </div>
            )}
          </Card>

          {/* 비밀번호 변경 */}
          <Card padding="large" style={{ marginTop: '24px' }}>
            <h3 style={styles.sectionTitle}>비밀번호 변경</h3>
            {isPasswordMode ? (
              <form onSubmit={handlePasswordChange}>
                {passwordError && (
                  <div style={styles.errorBox}><p style={styles.errorText}>{passwordError}</p></div>
                )}
                <div style={styles.field}>
                  <label style={styles.label}>현재 비밀번호</label>
                  <input type="password" style={styles.input} value={passwordData.currentPassword}
                    onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })} placeholder="현재 비밀번호를 입력하세요" required />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>새 비밀번호</label>
                  <input type="password" style={styles.input} value={passwordData.newPassword}
                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })} placeholder="새 비밀번호를 입력하세요 (8자 이상)" required minLength={8} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>새 비밀번호 확인</label>
                  <input type="password" style={styles.input} value={passwordData.newPasswordConfirm}
                    onChange={e => setPasswordData({ ...passwordData, newPasswordConfirm: e.target.value })} placeholder="새 비밀번호를 다시 입력하세요" required />
                </div>
                <div style={styles.actions}>
                  <button type="button" style={styles.cancelButton} onClick={handlePasswordCancel} disabled={passwordSaving}>취소</button>
                  <button type="submit" style={styles.submitButton} disabled={passwordSaving}>{passwordSaving ? '변경 중...' : '변경하기'}</button>
                </div>
              </form>
            ) : (
              <>
                <p style={styles.sectionDesc}>비밀번호를 변경하려면 아래 버튼을 클릭하세요.</p>
                <button type="button" style={styles.secondaryButton} onClick={() => setIsPasswordMode(true)}>비밀번호 변경</button>
              </>
            )}
          </Card>
        </>
      )}

      {/* ═══ Tab 2: 직역 정보 ═══ */}
      {activeTab === 'role' && hasPharmacistInfo && (
        <Card padding="large">
          {isRoleEdit ? (
            <form onSubmit={handleRoleSave}>
              <div style={styles.field}>
                <label style={styles.label}>약사면허</label>
                <input type="text" style={{ ...styles.input, ...styles.inputReadonly }}
                  value={profile?.pharmacist?.licenseNumber || '-'} disabled />
                <p style={styles.hint}>약사면허는 수정할 수 없습니다.</p>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>직역</label>
                <select style={styles.input} value={roleForm.activityType}
                  onChange={e => setRoleForm({ ...roleForm, activityType: e.target.value })}>
                  <option value="">선택하세요</option>
                  {EDITABLE_ACTIVITY_TYPES.map(value => (
                    <option key={value} value={value}>{ACTIVITY_TYPE_LABELS[value]}</option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>출신교 (대학)</label>
                <input type="text" style={styles.input} value={roleForm.university}
                  onChange={e => setRoleForm({ ...roleForm, university: e.target.value })} placeholder="출신 대학을 입력하세요" />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>근무처</label>
                <input type="text" style={styles.input} value={roleForm.workplace}
                  onChange={e => setRoleForm({ ...roleForm, workplace: e.target.value })} placeholder="근무처를 입력하세요" />
              </div>

              {/* 약국/근무지 정보 — read-only (ActivitySetupPage에서 입력) */}
              {isPharmacyOwner && (
                <div style={styles.bizSection}>
                  <h4 style={styles.bizSectionTitle}>약국 정보</h4>
                  <div style={styles.field}>
                    <label style={styles.label}>약국명</label>
                    <input type="text" style={{ ...styles.input, ...styles.inputReadonly }} value={pharmacyName || '-'} disabled />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>약국 주소</label>
                    <input type="text" style={{ ...styles.input, ...styles.inputReadonly }} value={pharmacyAddress || '-'} disabled />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>약국 전화번호</label>
                    <input type="text" style={{ ...styles.input, ...styles.inputReadonly }} value={pharmacyPhone || '-'} disabled />
                  </div>
                  {!pharmacyName && (
                    <p style={styles.hint}>약국 정보가 등록되지 않았습니다. 직역 설정에서 입력할 수 있습니다.</p>
                  )}
                </div>
              )}

              {!isPharmacyOwner && activityType && activityType !== 'inactive' && activityType !== 'other' && (
                <div style={styles.bizSection}>
                  <h4 style={styles.bizSectionTitle}>근무지 정보</h4>
                  <div style={styles.field}>
                    <label style={styles.label}>근무지명</label>
                    <input type="text" style={{ ...styles.input, ...styles.inputReadonly }} value={workplaceName || '-'} disabled />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>근무지 전화번호</label>
                    <input type="text" style={{ ...styles.input, ...styles.inputReadonly }} value={workplacePhone || '-'} disabled />
                  </div>
                  {!workplaceName && (
                    <p style={styles.hint}>근무지 정보가 등록되지 않았습니다. 직역 설정에서 입력할 수 있습니다.</p>
                  )}
                </div>
              )}

              {hasOrganizations && (
                <div style={styles.field}>
                  <label style={styles.label}>소속 조직</label>
                  {profile?.organizations.map((org, idx) => (
                    <div key={org.id || idx} style={styles.orgItem}>
                      <span>{org.name}</span>
                      <span style={styles.orgRole}>{org.position || ORGANIZATION_ROLE_LABELS[org.role] || org.role}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={styles.actions}>
                <button type="button" style={styles.cancelButton} onClick={handleRoleCancel} disabled={roleSaving}>취소</button>
                <button type="submit" style={styles.submitButton} disabled={roleSaving}>{roleSaving ? '저장 중...' : '저장'}</button>
              </div>
            </form>
          ) : (
            <div style={styles.profileView}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>약사면허</span>
                <span style={styles.infoValue}>{profile?.pharmacist?.licenseNumber || '-'}</span>
              </div>

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>직역</span>
                <span style={styles.infoValue}>{activityType ? ACTIVITY_TYPE_LABELS[activityType] : '-'}</span>
              </div>

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>출신교 (대학)</span>
                <span style={styles.infoValue}>{profile?.pharmacist?.university || '-'}</span>
              </div>

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>근무처</span>
                <span style={styles.infoValue}>{profile?.pharmacist?.workplace || '-'}</span>
              </div>

              {/* 약국 개설자: 약국 정보 */}
              {isPharmacyOwner && (
                <>
                  <div style={styles.bizDivider} />
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>약국명</span>
                    <span style={styles.infoValue}>{pharmacyName || <span style={styles.notRegistered}>등록 필요</span>}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>약국 주소</span>
                    <span style={styles.infoValue}>{pharmacyAddress || '-'}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>약국 전화번호</span>
                    <span style={styles.infoValue}>{pharmacyPhone || '-'}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>약국 정보 관리</span>
                    <Link to="/store/info" style={{ color: colors.primary, fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>
                      약국 정보 수정 →
                    </Link>
                  </div>
                </>
              )}

              {/* 비약국 직능: 근무지 정보 */}
              {!isPharmacyOwner && activityType && activityType !== 'inactive' && activityType !== 'other' && (
                <>
                  <div style={styles.bizDivider} />
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>근무지명</span>
                    <span style={styles.infoValue}>{workplaceName || <span style={styles.notRegistered}>등록 필요</span>}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>근무지 전화번호</span>
                    <span style={styles.infoValue}>{workplacePhone || '-'}</span>
                  </div>
                </>
              )}

              {/* 소속 조직 */}
              {hasOrganizations && (
                <>
                  <div style={styles.bizDivider} />
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>소속 조직</span>
                    <div style={styles.orgList}>
                      {profile?.organizations.map((org, idx) => (
                        <div key={org.id || idx} style={styles.orgItem}>
                          <span>{org.name}</span>
                          <span style={styles.orgRole}>{org.position || ORGANIZATION_ROLE_LABELS[org.role] || org.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div style={styles.editButtonWrapper}>
                <button type="button" style={styles.editButton} onClick={() => setIsRoleEdit(true)}>수정</button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  // Tab bar
  tabBar: {
    display: 'flex',
    gap: '0',
    marginBottom: '24px',
    borderBottom: `2px solid ${colors.neutral200}`,
  },
  tab: {
    flex: 1,
    padding: '14px 0',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
    fontSize: '15px',
    fontWeight: 500,
    color: colors.neutral500,
    cursor: 'pointer',
    textAlign: 'center',
  },
  tabActive: {
    color: colors.primary,
    borderBottomColor: colors.primary,
    fontWeight: 600,
  },
  // Avatar
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
  // Profile view
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
  // Form
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
    boxSizing: 'border-box' as const,
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
  // Section
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
  // Biz section
  bizSection: {
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  bizSectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral800,
    marginTop: 0,
    marginBottom: '16px',
  },
  bizDivider: {
    height: '1px',
    backgroundColor: colors.neutral200,
    margin: '8px 0',
  },
  notRegistered: {
    color: colors.neutral400,
    fontStyle: 'italic',
  },
  // Organizations
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
  // Error
  errorBox: {
    padding: '12px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  errorText: {
    color: '#DC2626',
    fontSize: '14px',
    margin: 0,
  },
};
