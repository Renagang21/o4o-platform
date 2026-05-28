/**
 * CommonEditUserModal — Shared operator member edit modal
 *
 * WO-O4O-OPERATOR-EDITUSER-MODAL-PHASE1-NETURE-GP-KCOS-V1
 *
 * Parameterized for Neture / GlycoPharm / K-Cosmetics.
 * KPA is excluded (MemberManagementPage Drawer structure — separate WO).
 *
 * Props:
 *   userId  — member to edit
 *   config  — service-specific options (makeRequest, role options, labels, profileClassification)
 */

import { useState, useEffect } from 'react';
import {
  Loader2,
  AlertCircle,
  X,
  Building2,
  Mail,
} from 'lucide-react';
import { AddressSearch } from '@o4o/ui';

// WO-O4O-GLYCOPHARM-OPERATOR-MEMBER-EDIT-INVALID-USERID-GUARD-V1:
// userId prop 가 undefined / null / 빈 문자열 / 잘못된 UUID 형식일 때
// `/operator/members/undefined` 같은 요청을 발생시켜 백엔드 500 을 유발하지 않도록 차단한다.
const USER_ID_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Types ───────────────────────────────────────────────────

export interface EditUserModalOption {
  value: string;
  label: string;
}

export interface ProfileClassificationConfig {
  /** Section label e.g. "매장 역할" */
  label: string;
  options: EditUserModalOption[];
  /** Returns path to GET current classification e.g. (id) => `/cosmetics/members/${id}` */
  fetchPath: (userId: string) => string;
  /** Returns path to PATCH classification e.g. (id) => `/cosmetics/members/${id}` */
  patchPath: (userId: string) => string;
  /** Key in GET response data object. e.g. 'subRole' */
  responseField: string;
}

export type ApiRequestFn = (
  method: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH',
  path: string,
  data?: unknown,
) => Promise<unknown>;

export interface EditUserModalConfig {
  /** Canonical service key. e.g. 'neture' | 'glycopharm' | 'k-cosmetics' */
  serviceKey: string;
  /** Injected API adapter. Paths are WITHOUT /api/v1 prefix. */
  makeRequest: ApiRequestFn;
  /** service_memberships.role dropdown options */
  membershipRoleOptions: EditUserModalOption[];
  /** role_assignments dropdown options (first value '' = 일반 회원) */
  adminRoleOptions: EditUserModalOption[];
  /** Section header for business info. Default: "사업자 정보" */
  businessInfoLabel?: string;
  /** Field label for business name. Default: "사업자명" */
  businessNameLabel?: string;
  /** Optional service-specific profile classification (sub_role). */
  profileClassification?: ProfileClassificationConfig;
}

export interface CommonEditUserModalProps {
  userId: string;
  config: EditUserModalConfig;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Component ───────────────────────────────────────────────

export function CommonEditUserModal({ userId, config, onClose, onSuccess }: CommonEditUserModalProps) {
  const {
    serviceKey,
    makeRequest,
    membershipRoleOptions,
    adminRoleOptions,
    businessInfoLabel = '사업자 정보',
    businessNameLabel = '사업자명',
    profileClassification,
  } = config;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [hasBusinessInfo, setHasBusinessInfo] = useState(false);

  const [membershipRole, setMembershipRole] = useState('');
  const [originalMembershipRole, setOriginalMembershipRole] = useState('');
  const [currentAdminRole, setCurrentAdminRole] = useState('');
  const [selectedAdminRole, setSelectedAdminRole] = useState('');

  const [profileValue, setProfileValue] = useState('');
  const [originalProfileValue, setOriginalProfileValue] = useState('');

  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    nickname: '',
    phone: '',
    businessName: '',
    businessNumber: '',
    taxEmail: '',
    businessType: '',
    businessCategory: '',
    zipCode: '',
    address1: '',
    address2: '',
  });

  useEffect(() => {
    // WO-O4O-GLYCOPHARM-OPERATOR-MEMBER-EDIT-INVALID-USERID-GUARD-V1:
    // 잘못된 userId 로 fetch 시도 시 `/operator/members/undefined` → 백엔드 500.
    // fetch 자체를 차단하고 안내 메시지 표시.
    if (!userId || !USER_ID_UUID_REGEX.test(userId)) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[CommonEditUserModal] Invalid userId — fetch skipped', { userId });
      }
      setLoading(false);
      setActionError('회원 ID가 없거나 유효하지 않아 정보를 불러올 수 없습니다. 목록을 새로고침 후 다시 시도해 주세요.');
      return;
    }
    (async () => {
      try {
        const data = await makeRequest('GET', `/operator/members/${userId}`) as any;
        const u = data.user;

        // membership role
        const svcMembership = (data.memberships || []).find((m: any) => m.serviceKey === serviceKey);
        setMembershipRole(svcMembership?.role || '');
        setOriginalMembershipRole(svcMembership?.role || '');

        // admin role (role_assignments)
        const activeRoles: string[] = (data.roles || [])
          .filter((r: any) => r.isActive)
          .map((r: any) => r.role);
        const adminRole = activeRoles.find((r: string) =>
          adminRoleOptions.some(opt => opt.value && opt.value === r)
        ) || '';
        setCurrentAdminRole(adminRole);
        setSelectedAdminRole(adminRole);

        // business info
        const biz = u.businessInfo || {};
        setHasBusinessInfo(!!(biz.businessName || u.company));
        setForm({
          lastName: u.lastName || '',
          firstName: u.firstName || '',
          nickname: u.nickname || '',
          phone: u.phone || '',
          businessName: biz.businessName || u.company || '',
          businessNumber: biz.businessNumber || '',
          taxEmail: biz.email || '',
          businessType: biz.businessType || '',
          businessCategory: biz.businessCategory || '',
          zipCode: biz.zipCode || '',
          address1: biz.address || '',
          address2: biz.address2 || '',
        });

        // profile classification (e.g. K-Cosmetics sub_role)
        if (profileClassification) {
          try {
            const pData = await makeRequest('GET', profileClassification.fetchPath(userId)) as any;
            const val = pData?.data?.[profileClassification.responseField] ?? '';
            setProfileValue(val);
            setOriginalProfileValue(val);
          } catch {
            // profile not set yet — leave empty
          }
        }
      } catch (err: any) {
        setActionError(err.message || '데이터를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericFields = ['phone', 'businessNumber'];
    setForm(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? value.replace(/\D/g, '') : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nickname.trim()) { setActionError('닉네임은 필수입니다.'); return; }
    setSaving(true);
    setActionError('');
    try {
      // base payload
      const payload: Record<string, string> = {
        lastName: form.lastName,
        firstName: form.firstName,
        nickname: form.nickname,
        phone: form.phone,
      };
      if (membershipRole !== originalMembershipRole) {
        payload.membershipRole = membershipRole;
        payload.membershipServiceKey = serviceKey;
      }
      if (hasBusinessInfo) {
        payload.businessName = form.businessName;
        payload.businessNumber = form.businessNumber;
        payload.taxEmail = form.taxEmail;
        payload.businessType = form.businessType;
        payload.businessCategory = form.businessCategory;
        payload.zipCode = form.zipCode;
        payload.address1 = form.address1;
        payload.address2 = form.address2;
      }
      await makeRequest('PUT', `/operator/members/${userId}`, payload);

      // admin role change
      if (selectedAdminRole !== currentAdminRole) {
        if (currentAdminRole) {
          await makeRequest('DELETE', `/operator/members/${userId}/roles/${encodeURIComponent(currentAdminRole)}`).catch(() => {});
        }
        if (selectedAdminRole) {
          await makeRequest('POST', `/operator/members/${userId}/roles`, { role: selectedAdminRole });
        }
      }

      // profile classification change (e.g. K-Cosmetics sub_role)
      if (profileClassification && profileValue !== originalProfileValue) {
        await makeRequest('PATCH', profileClassification.patchPath(userId), {
          [profileClassification.responseField]: profileValue || null,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setActionError(err.message || '수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">회원정보 수정</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">불러오는 중...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {actionError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />{actionError}
              </div>
            )}

            {/* 기본 정보 */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">기본 정보</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">성</label>
                    <input type="text" name="lastName" value={form.lastName} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">이름</label>
                    <input type="text" name="firstName" value={form.firstName} onChange={handleChange} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">닉네임 <span className="text-red-500">*</span></label>
                  <input type="text" name="nickname" value={form.nickname} onChange={handleChange} required className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">휴대전화</label>
                  <input type="tel" name="phone" inputMode="numeric" value={form.phone} onChange={handleChange}
                    className={inputCls} placeholder="숫자만 입력" />
                </div>
              </div>
            </div>

            {/* 회원 유형 */}
            <div className="pt-3 border-t">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">회원 유형</h4>
              <select value={membershipRole} onChange={(e) => setMembershipRole(e.target.value)} className={inputCls}>
                {membershipRoleOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {membershipRole !== originalMembershipRole && (
                <p className="text-xs text-amber-600 mt-1">
                  회원 유형이 변경됩니다: {membershipRoleOptions.find(o => o.value === originalMembershipRole)?.label || originalMembershipRole || '미지정'} → {membershipRoleOptions.find(o => o.value === membershipRole)?.label || membershipRole}
                </p>
              )}
            </div>

            {/* 운영 권한 */}
            <div className="pt-3 border-t">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">운영 권한</h4>
              <select value={selectedAdminRole} onChange={(e) => setSelectedAdminRole(e.target.value)} className={inputCls}>
                {adminRoleOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {selectedAdminRole !== currentAdminRole && (
                <p className="text-xs text-amber-600 mt-1">
                  권한이 변경됩니다: {currentAdminRole ? adminRoleOptions.find(o => o.value === currentAdminRole)?.label || currentAdminRole : '일반 회원'} → {selectedAdminRole ? adminRoleOptions.find(o => o.value === selectedAdminRole)?.label || selectedAdminRole : '일반 회원'}
                </p>
              )}
            </div>

            {/* 서비스별 프로필 분류 (e.g. K-Cosmetics sub_role) */}
            {profileClassification && (
              <div className="pt-3 border-t">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">{profileClassification.label}</h4>
                <select value={profileValue} onChange={(e) => setProfileValue(e.target.value)} className={inputCls}>
                  <option value="">미지정</option>
                  {profileClassification.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {profileValue !== originalProfileValue && (
                  <p className="text-xs text-amber-600 mt-1">
                    {profileClassification.label} 변경됩니다: {profileClassification.options.find(o => o.value === originalProfileValue)?.label || originalProfileValue || '미지정'} → {profileClassification.options.find(o => o.value === profileValue)?.label || profileValue || '미지정'}
                  </p>
                )}
              </div>
            )}

            {/* 사업자/약국 정보 */}
            {hasBusinessInfo && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <h4 className="text-sm font-semibold text-slate-700">{businessInfoLabel}</h4>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{businessNameLabel}</label>
                    <input type="text" name="businessName" value={form.businessName} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">사업자등록번호</label>
                    <input type="text" name="businessNumber" inputMode="numeric" value={form.businessNumber}
                      onChange={handleChange} className={inputCls} maxLength={10} placeholder="숫자만 입력" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">세금계산서 이메일</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="email" name="taxEmail" value={form.taxEmail} onChange={handleChange}
                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="tax@example.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">업태</label>
                      <input type="text" name="businessType" value={form.businessType} onChange={handleChange}
                        className={inputCls} placeholder="소매업" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">업종</label>
                      <input type="text" name="businessCategory" value={form.businessCategory} onChange={handleChange}
                        className={inputCls} placeholder="건강식품" />
                    </div>
                  </div>
                  <AddressSearch
                    zipCode={form.zipCode}
                    address={form.address1}
                    addressDetail={form.address2}
                    onChange={({ zipCode, address, addressDetail }) =>
                      setForm(prev => ({ ...prev, zipCode, address1: address, address2: addressDetail }))
                    }
                    inputClassName={inputCls}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">취소</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
