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
import { AddressSearch } from '@o4o/ui';
import { LoadingSpinner, EmptyState, Card } from '../../components/common';
import { MyPageLayout } from '../../layouts/MyPageLayout';
import { mypageApi, type ProfileResponse } from '../../api';
import { pharmacyRequestApi, type PharmacyRequest } from '../../api/pharmacyRequestApi';
import { useAuth, ACTIVITY_TYPE_LABELS } from '../../contexts';
import { colors, typography } from '../../styles/theme';

// WO-O4O-KPA-PROFILE-AND-STOREOWNER-UX-ALIGN-V1:
//   직역(profile metadata) 과 매장 운영 권한(kpa:store_owner capability) 의 사용자 인식 정렬용 상태.
//   - unknown: 로딩 / API 실패 (UI 미표시)
//   - unsubmitted: 한 번도 신청한 적 없음
//   - pending: 가장 최근 신청이 검토 중
//   - approved: 가장 최근 신청이 승인 완료
//   - rejected: 가장 최근 신청이 반려 (재신청 가능)
type StoreOwnerCapStatus = 'unknown' | 'unsubmitted' | 'pending' | 'approved' | 'rejected';

const STORE_OWNER_STATUS_LABELS: Record<Exclude<StoreOwnerCapStatus, 'unknown'>, string> = {
  unsubmitted: '미신청',
  pending: '승인 대기',
  approved: '승인 완료',
  rejected: '반려',
};

/** 가장 최근(updated_at 기준) 신청의 status 로 capability 상태 도출 */
function deriveStoreOwnerStatus(items: PharmacyRequest[], hasStoreOwnerRole: boolean): StoreOwnerCapStatus {
  // role 이 이미 부여돼 있으면 신청 여부와 무관하게 '승인 완료' (캐시/조회 실패 안전망)
  if (hasStoreOwnerRole) return 'approved';
  if (!items || items.length === 0) return 'unsubmitted';
  const latest = [...items].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0];
  if (latest.status === 'approved') return 'approved';
  if (latest.status === 'pending') return 'pending';
  if (latest.status === 'rejected') return 'rejected';
  return 'unsubmitted';
}

// WO-O4O-KPA-PHARMACY-OWNER-DIRECT-CHANGE-GUARD-V1:
//   pharmacy_owner 는 직역 select 에서 직접 선택 불가 (자동 부여 / pharmacy_request 승인 경로로만 진입).
//   현재 직역이 이미 pharmacy_owner 인 사용자는 아래 select 렌더 시 별도 옵션으로 현재 값만 표시.
//   근거: docs/investigations/IR-O4O-KPA-ACTIVITY-TYPE-CHANGE-FLOW-AUDIT-V1.md
const EDITABLE_ACTIVITY_TYPES = [
  'pharmacy_employee', 'hospital',
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
  // WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1:
  //   pharmacy_owner 의 사업자 정보를 본인이 직접 수정 가능 (businessInfo cache edit).
  //   organization canonical edit 은 PharmacyInfoPage 에서 계속 처리.
  const [isRoleEdit, setIsRoleEdit] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleForm, setRoleForm] = useState({
    activityType: '',
    university: '',
    workplace: '',
    // 사업자 정보 (pharmacy_owner 만 사용)
    businessName: '',
    ceoName: '',
    taxInvoiceEmail: '',
    businessPhone: '',
    managerPhone: '',
    storeZipCode: '',
    storeBaseAddress: '',
    storeDetailAddress: '',
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

  // WO-O4O-KPA-PROFILE-AND-STOREOWNER-UX-ALIGN-V1: 매장 운영 권한 capability 상태
  const [storeOwnerStatus, setStoreOwnerStatus] = useState<StoreOwnerCapStatus>('unknown');
  const [storeOwnerStatusLoading, setStoreOwnerStatusLoading] = useState(false);

  // WO-O4O-KPA-MYPAGE-CAPABILITY-CARD-AUTO-ALIGN-V1:
  //   자동 store_owner 부여 정책 도입 후, role 보유 사용자에게는 capability 신청 UI 미표시.
  //   fallback (다른 직역 / 자동 부여 실패) 경로는 role 미보유 사용자에게만 노출됨.
  const hasStoreOwnerRole = Array.isArray((user as any)?.roles)
    && (user as any).roles.includes('kpa:store_owner');

  // WO-O4O-KPA-MYPROFILE-AUTH-REFRESH-ON-MOUNT-V1:
  //   profile 진입 시 1 회 auth context refresh — operator 가 activity_type / roles 변경한 경우의
  //   user.activityType / user.roles stale 보정. graceful fail (네트워크 실패 시 기존 캐시 유지).
  //   visibility/focus refresh 는 본 WO 범위 외 (필요 시 후속 WO).
  //   근거: docs/investigations/IR-O4O-KPA-PROFILE-OPERATOR-CONSISTENCY-AUDIT-V1.md (M1)
  useEffect(() => {
    void checkAuth().catch(() => { /* graceful — 실패해도 기존 화면 흐름 유지 */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  // WO-O4O-KPA-PROFILE-AND-STOREOWNER-UX-ALIGN-V1:
  //   매장 운영 권한 상태 fetch — pharmacist info 가 있는 사용자(직역 탭이 노출되는 사용자)에 한해.
  //   /pharmacy-requests/my 엔드포인트는 인증된 모든 사용자에게 본인 신청을 반환.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setStoreOwnerStatusLoading(true);
    pharmacyRequestApi.getMyRequests()
      .then((res) => {
        if (cancelled) return;
        const items = res?.data?.items || [];
        setStoreOwnerStatus(deriveStoreOwnerStatus(items, hasStoreOwnerRole));
      })
      .catch(() => {
        if (cancelled) return;
        // 조회 실패 시 role 기반으로만 판단 (네트워크/권한 문제 graceful)
        setStoreOwnerStatus(hasStoreOwnerRole ? 'approved' : 'unknown');
      })
      .finally(() => {
        if (!cancelled) setStoreOwnerStatusLoading(false);
      });
    return () => { cancelled = true; };
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
    const biz = data.businessInfo || {};
    const storeAddr = biz.storeAddress || null;
    setRoleForm({
      activityType: user?.activityType || '',
      university: data.pharmacist?.university || '',
      workplace: data.pharmacist?.workplace || '',
      // WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1:
      //   canonical (ceoName / taxInvoiceEmail) read with legacy fallback.
      businessName: biz.businessName || '',
      ceoName: biz.ceoName || biz.representativeName || '',
      taxInvoiceEmail: biz.taxInvoiceEmail || biz.taxEmail || '',
      businessPhone: biz.phone || '',
      managerPhone: biz.managerPhone || '',
      storeZipCode: storeAddr?.zipCode || biz.zipCode || '',
      storeBaseAddress: storeAddr?.baseAddress || biz.address || '',
      storeDetailAddress: storeAddr?.detailAddress || biz.address2 || '',
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
      // Save activityType + businessInfo via auth API (PATCH /auth/me/profile)
      // WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1:
      //   pharmacy_owner 의 사업자 정보 cache edit. canonical key 로만 전송 (representativeName/taxEmail 재저장 금지).
      //   organizations sync 는 backend (auth-account.controller) 가 처리.
      const isPharmacyOwnerEdit = (roleForm.activityType === 'pharmacy_owner');
      const businessInfoPayload: Record<string, any> = {};
      if (isPharmacyOwnerEdit) {
        if (roleForm.businessName) businessInfoPayload.businessName = roleForm.businessName;
        if (roleForm.ceoName) businessInfoPayload.ceoName = roleForm.ceoName;
        if (roleForm.taxInvoiceEmail) businessInfoPayload.taxInvoiceEmail = roleForm.taxInvoiceEmail;
        if (roleForm.businessPhone) businessInfoPayload.phone = roleForm.businessPhone;
        if (roleForm.managerPhone) businessInfoPayload.managerPhone = roleForm.managerPhone;
        if (roleForm.storeBaseAddress || roleForm.storeZipCode || roleForm.storeDetailAddress) {
          businessInfoPayload.storeAddress = {
            ...(roleForm.storeZipCode ? { zipCode: roleForm.storeZipCode } : {}),
            baseAddress: roleForm.storeBaseAddress || '',
            ...(roleForm.storeDetailAddress ? { detailAddress: roleForm.storeDetailAddress } : {}),
          };
        }
      }
      if (roleForm.activityType) {
        await setActivityType(
          roleForm.activityType,
          Object.keys(businessInfoPayload).length > 0 ? businessInfoPayload : undefined,
        );
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

  // WO-O4O-KPA-ACTIVITY-TYPE-SSOT-ROLE-CANONICAL-ALIGN-V1 (Phase 3):
  //   자동 활성화 prerequisite (사업자번호, 약국명) 부족으로 store_owner role 부여가 보류된
  //   상태를 사용자에게 신호. 조건 (backend member.controller.ts L1086-1099 skip 조건과 정렬):
  //     - profile 로드 완료
  //     - 직역 = pharmacy_owner (자기소개)
  //     - kpa:store_owner role 미보유
  //     - businessNumber 누락, 또는 (pharmacy_name AND businessName) 모두 누락
  //   해소: 직역 탭의 사업자 정보 섹션에서 입력 후 저장 → operator 재저장 또는 자동 부여 재시도 가능.
  const hasActivationBusinessNumber = !!profile?.businessInfo?.businessNumber;
  const hasActivationPharmacyName = !!(profile?.pharmacy?.name || profile?.businessInfo?.businessName);
  const isMissingActivationBusinessData = !!profile
    && isPharmacyOwner
    && !hasStoreOwnerRole
    && (!hasActivationBusinessNumber || !hasActivationPharmacyName);

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
    <MyPageLayout
      title="프로필"
      breadcrumb={[
        { label: '홈', href: '/' },
        { label: '마이페이지', href: `/mypage` },
        { label: '프로필' },
      ]}
      width="form"
    >
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
                  {/* WO-O4O-KPA-PHARMACY-OWNER-DIRECT-CHANGE-GUARD-V1:
                      현재 값이 pharmacy_owner 인 기존 사용자만 별도 옵션으로 현재 값 표시.
                      일반 사용자에겐 옵션 자체가 노출되지 않음. */}
                  {roleForm.activityType === 'pharmacy_owner' && (
                    <option value="pharmacy_owner">{ACTIVITY_TYPE_LABELS['pharmacy_owner']}</option>
                  )}
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

              {/* 약국 정보 — pharmacy_owner 본인 편집 가능 (businessInfo cache edit).
                  WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1:
                    canonical key (ceoName / taxInvoiceEmail / storeAddress) 로 write.
                    organization canonical edit 은 PharmacyInfoPage 에서. */}
              {isPharmacyOwner && (
                <div style={styles.bizSection}>
                  <h4 style={styles.bizSectionTitle}>약국 정보</h4>
                  <div style={styles.field}>
                    <label style={styles.label}>약국명 (사업장명)</label>
                    <input type="text" style={styles.input} value={roleForm.businessName}
                      onChange={e => setRoleForm({ ...roleForm, businessName: e.target.value })}
                      placeholder="예: ○○약국" maxLength={200} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>대표자명</label>
                    <input type="text" style={styles.input} value={roleForm.ceoName}
                      onChange={e => setRoleForm({ ...roleForm, ceoName: e.target.value })}
                      placeholder="사업자등록증 대표자명" maxLength={50} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>세금계산서 이메일</label>
                    <input type="email" style={styles.input} value={roleForm.taxInvoiceEmail}
                      onChange={e => setRoleForm({ ...roleForm, taxInvoiceEmail: e.target.value })}
                      placeholder="세금계산서 수신 이메일 (선택)" />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>약국 전화</label>
                    <input type="tel" style={styles.input} value={roleForm.businessPhone}
                      onChange={e => setRoleForm({ ...roleForm, businessPhone: e.target.value.replace(/\D/g, '') })}
                      placeholder="숫자만 입력 (선택)" maxLength={11} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>담당자 전화</label>
                    <input type="tel" style={styles.input} value={roleForm.managerPhone}
                      onChange={e => setRoleForm({ ...roleForm, managerPhone: e.target.value.replace(/\D/g, '') })}
                      placeholder="숫자만 입력 (선택)" maxLength={11} />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>약국 주소</label>
                    <AddressSearch
                      zipCode={roleForm.storeZipCode}
                      address={roleForm.storeBaseAddress}
                      addressDetail={roleForm.storeDetailAddress}
                      onChange={({ zipCode, address, addressDetail }) =>
                        setRoleForm({
                          ...roleForm,
                          storeZipCode: zipCode,
                          storeBaseAddress: address,
                          storeDetailAddress: addressDetail,
                        })
                      }
                    />
                  </div>
                  <p style={styles.hint}>
                    여기서 수정한 정보는 본인 사업자 정보 (cache) 에 저장됩니다.
                    채널 운영 / 정산 등 매장 canonical 정보는{' '}
                    <Link to="/store/info" style={{ color: colors.primary }}>약국 정보 페이지</Link>
                    에서 수정해 주세요.
                  </p>
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
                <div style={{ textAlign: 'right' }}>
                  <span style={styles.infoValue}>{activityType ? ACTIVITY_TYPE_LABELS[activityType] : '-'}</span>
                  {/* WO-O4O-KPA-PROFILE-AND-STOREOWNER-UX-ALIGN-V1:
                      pharmacy_owner 직역은 capability 가 아니라 자기소개. 분리 안내. */}
                  {isPharmacyOwner && (
                    <p style={styles.hint}>회원 본인 소개 정보입니다. 매장 운영은 아래 별도 항목에서 확인하세요.</p>
                  )}
                </div>
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

              {/* WO-O4O-KPA-MYPAGE-CAPABILITY-CARD-AUTO-ALIGN-V1:
                  자동 store_owner 부여 정책 도입 후, role 보유 사용자에게는 본 카드를 미표시.
                  role 미보유 + 다른 직역 / 자동 부여 실패 fallback 경로에만 신청 UI 노출.
                  근거: docs/investigations/IR-O4O-STORE-OWNER-AUTO-CAPABILITY-AUDIT-V1.md */}
              {!hasStoreOwnerRole && (
                <>
                  <div style={styles.bizDivider} />
                  <div style={styles.capabilitySection}>
                    <div style={styles.capabilityHeader}>
                      <h4 style={styles.capabilityTitle}>매장 운영</h4>
                      {storeOwnerStatus !== 'unknown' && (
                        <span
                          style={{
                            ...styles.capabilityBadge,
                            ...(storeOwnerStatus === 'approved' ? styles.capabilityBadgeApproved
                              : storeOwnerStatus === 'pending' ? styles.capabilityBadgePending
                              : storeOwnerStatus === 'rejected' ? styles.capabilityBadgeRejected
                              : styles.capabilityBadgeUnsubmitted),
                          }}
                        >
                          {STORE_OWNER_STATUS_LABELS[storeOwnerStatus]}
                        </span>
                      )}
                      {storeOwnerStatusLoading && storeOwnerStatus === 'unknown' && (
                        <span style={styles.capabilityBadgeLoading}>확인 중...</span>
                      )}
                    </div>
                    <p style={styles.capabilityDesc}>
                      내 매장 / Store HUB 이용은 별도의 매장 운영 승인 절차가 필요합니다.
                      위 직역(활동 유형)은 회원 본인 소개 정보이며, 매장 운영과는 다릅니다.
                    </p>
                    {/* WO-O4O-KPA-ACTIVITY-TYPE-SSOT-ROLE-CANONICAL-ALIGN-V1 (Phase 3):
                        자동 활성화 prerequisite 부족 안내 — 사용자가 운영자의 silent skip 을 인지할 수 있도록. */}
                    {isMissingActivationBusinessData && (
                      <div style={styles.activationWarning}>
                        ⚠ 매장 운영 활성화에 필요한 정보(사업자번호, 약국명)가 부족합니다.
                        위 직역 정보 섹션에서 사업자 정보를 입력해 주세요.
                      </div>
                    )}
                    {storeOwnerStatus === 'unsubmitted' && (
                      <Link to="/pharmacy" style={styles.capabilityCtaPrimary}>매장 운영 신청 →</Link>
                    )}
                    {storeOwnerStatus === 'pending' && (
                      <Link to="/pharmacy" style={styles.capabilityCtaSecondary}>내 신청 보기</Link>
                    )}
                    {storeOwnerStatus === 'approved' && (
                      <Link to="/store" style={styles.capabilityCtaPrimary}>내 매장으로 이동 →</Link>
                    )}
                    {storeOwnerStatus === 'rejected' && (
                      <Link to="/pharmacy" style={styles.capabilityCtaPrimary}>다시 신청하기 →</Link>
                    )}
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
    </MyPageLayout>
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
  // WO-O4O-KPA-PROFILE-AND-STOREOWNER-UX-ALIGN-V1:
  //   매장 운영 권한 카드 — 직역(profile) 과 시각적으로 분리되도록 background + border 강조.
  capabilitySection: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '10px',
    border: `1px solid ${colors.neutral200}`,
  },
  capabilityHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '8px',
  },
  capabilityTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  capabilityBadge: {
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '999px',
    whiteSpace: 'nowrap' as const,
  },
  capabilityBadgeUnsubmitted: {
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
  },
  capabilityBadgePending: {
    backgroundColor: '#FFFBEB',
    color: '#B45309',
    border: '1px solid #FCD34D',
  },
  capabilityBadgeApproved: {
    backgroundColor: '#ECFDF5',
    color: '#047857',
    border: '1px solid #6EE7B7',
  },
  capabilityBadgeRejected: {
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
    border: '1px solid #FCA5A5',
  },
  capabilityBadgeLoading: {
    fontSize: '12px',
    color: colors.neutral400,
    fontStyle: 'italic',
  },
  capabilityDesc: {
    fontSize: '13px',
    lineHeight: 1.6,
    color: colors.neutral600,
    margin: '0 0 12px 0',
  },
  activationWarning: {
    padding: '10px 12px',
    margin: '0 0 12px 0',
    backgroundColor: '#FFFBEB',
    color: '#92400E',
    border: '1px solid #FCD34D',
    borderRadius: '6px',
    fontSize: '13px',
    lineHeight: 1.55,
  },
  capabilityCtaPrimary: {
    display: 'inline-block',
    padding: '8px 16px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    textDecoration: 'none',
  },
  capabilityCtaSecondary: {
    display: 'inline-block',
    padding: '8px 16px',
    backgroundColor: colors.white,
    color: colors.primary,
    border: `1px solid ${colors.primary}`,
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    textDecoration: 'none',
  },
};
