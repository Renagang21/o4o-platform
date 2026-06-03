/**
 * CommonEditUserModal — Shared operator member edit modal
 *
 * WO-O4O-OPERATOR-EDITUSER-MODAL-PHASE1-NETURE-GP-KCOS-V1
 *
 * users.id 기반의 Operator Membership Console 공통 편집 모달.
 * 서비스별 차이(API 경로·역할 옵션·라벨·프로필 분류)는 EditUserModalConfig 로 주입한다.
 *
 * 지원 서비스: Neture / GlycoPharm / K-Cosmetics
 *
 * KPA 제외 사유:
 *   - ID 기준: kpa_members.id (users.id 와 다름)
 *   - 분리 API: PATCH /members/:id/info (기본 정보) + PATCH /members/:id/status (상태 변경)
 *   - activity_type → store_owner 자동 연동 로직 등 KPA 전용 비즈니스 규칙 존재
 *   → KpaEditUserModal 로 별도 유지. 통합 금지.
 *
 * Props:
 *   userId  — 편집 대상 users.id (UUID)
 *   config  — 서비스별 주입 설정 (EditUserModalConfig 참조)
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

/**
 * 서비스별 추가 프로필 분류(sub_role) 설정.
 *
 * service_memberships.role / role_assignments 와 별도로 관리되는
 * 도메인 테이블의 서브 역할을 편집할 때 사용한다.
 *
 * 현재 사용 서비스: K-Cosmetics (cosmetics_members.subRole — store_owner / store_staff)
 */
export interface ProfileClassificationConfig {
  /** 섹션 헤더 레이블. e.g. "매장 역할" */
  label: string;
  /** 선택 가능한 서브 역할 옵션 목록 (빈 값 "미지정" 은 컴포넌트가 자동 추가). */
  options: EditUserModalOption[];
  /** 현재 분류 값을 가져올 경로 반환. e.g. (id) => `/cosmetics/members/${id}` */
  fetchPath: (userId: string) => string;
  /** 분류 값을 저장할 PATCH 경로 반환. e.g. (id) => `/cosmetics/members/${id}` */
  patchPath: (userId: string) => string;
  /** GET 응답 data 객체에서 값을 읽을 필드명. e.g. 'subRole' */
  responseField: string;
}

export type ApiRequestFn = (
  method: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH',
  path: string,
  data?: unknown,
) => Promise<unknown>;

/**
 * CommonEditUserModal 에 주입하는 서비스별 설정 객체.
 *
 * 각 서비스(Neture / GlycoPharm / K-Cosmetics)의 thin wrapper 파일에서
 * 정적 상수로 정의하여 컴포넌트에 전달한다.
 * UI · API · 페이로드 구조는 이 config 로만 달라지며, 컴포넌트 로직은 공통이다.
 */
export interface EditUserModalConfig {
  /**
   * 서비스 canonical 키.
   * service_memberships 조회 및 역할 변경 API 경로에 사용된다.
   * e.g. 'neture' | 'glycopharm' | 'k-cosmetics'
   */
  serviceKey: string;
  /**
   * 서비스별 API 어댑터.
   * 각 서비스의 authClient/api 인스턴스를 감싸 메서드·URL 규칙을 흡수한다.
   * 경로는 /api/v1 접두사 없이 전달한다 (어댑터 내부에서 처리).
   */
  makeRequest: ApiRequestFn;
  /**
   * service_memberships.role 드롭다운 옵션.
   * 서비스마다 허용 역할이 다르므로 wrapper 에서 정의한다.
   * e.g. Neture: [supplier, partner] / GP: [pharmacy, supplier] / K-Cos: [seller, consumer, ...]
   */
  membershipRoleOptions: EditUserModalOption[];
  /**
   * role_assignments 표시용 옵션 (label 매핑 + 보유 역할 매칭).
   * WO-O4O-NETURE-OPERATOR-ROLE-ASSIGNMENT-AUTHORITY-LOCK-V1:
   *   operator console 에서 운영 권한은 표시 전용이다(부여·회수는 platform admin 전용).
   *   이 옵션은 보유 role_assignments 를 라벨 배지로 렌더링하는 데만 사용된다.
   * 첫 번째 항목은 반드시 value='' (일반 회원 — 역할 없음)이어야 한다.
   * e.g. ['', 'neture:operator', 'neture:admin']
   */
  adminRoleOptions: EditUserModalOption[];
  /**
   * 사업자/매장 정보 섹션 헤더 레이블.
   * Default: "사업자 정보" (GP 는 "약국 정보" 로 오버라이드)
   */
  businessInfoLabel?: string;
  /**
   * 사업자명 필드 레이블.
   * Default: "사업자명" (GP 는 "약국명" 으로 오버라이드)
   */
  businessNameLabel?: string;
  /**
   * 서비스별 추가 프로필 분류 (도메인 테이블 sub_role).
   * 현재 K-Cosmetics 만 사용 (cosmetics_members.subRole).
   * 미제공 시 해당 섹션 렌더링 생략.
   */
  profileClassification?: ProfileClassificationConfig;
  /**
   * 운영 권한 초기값(selectedAdminRole) 도출 시 bare role(e.g. 'operator')과
   * service_memberships.role 까지 포함해 adminRoleOptions 의 namespaced 값으로 정규화한다.
   * WO-O4O-NETURE-MEMBER-LIST-MODAL-PERMISSION-DISPLAY-CORRECTION-V1:
   *   일부 계정은 운영 권한이 bare 'operator'/'admin' 또는 membership.role 에 들어 있어,
   *   기존 namespaced-only 매칭으로는 "일반 회원"으로 잘못 표시된다(대시보드 접근은 운영자 표시).
   *   opt-in 서비스에 한해 표시 초기값을 대시보드 기준과 일치시킨다(저장 로직은 불변).
   * Default: false (GlycoPharm/K-Cosmetics 무영향).
   */
  normalizeAdminRoleDisplay?: boolean;
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
    normalizeAdminRoleDisplay = false,
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
  // WO-O4O-NETURE-OPERATOR-ROLE-ASSIGNMENT-AUTHORITY-LOCK-V1:
  //   운영 권한(role_assignments)은 operator console 에서 표시 전용이다.
  //   부여·회수는 platform admin (admin.neture.co.kr) 전용 → 변경 상태(selected) 없이 보유 역할만 보관.
  const [displayAdminRoles, setDisplayAdminRoles] = useState<string[]>([]);

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

        // admin role (role_assignments) — 표시 전용, 다중 역할 손실 없이 전부 수집.
        // WO-O4O-NETURE-OPERATOR-ROLE-ASSIGNMENT-AUTHORITY-LOCK-V1:
        //   기존 단일 select 는 운영자+관리자 동시 보유를 하나로 평면화했다.
        //   부여·회수는 platform admin 전용이므로 여기서는 보유 역할 전체를 배지로 표시한다.
        const activeRoles: string[] = (data.roles || [])
          .filter((r: any) => r.isActive)
          .map((r: any) => r.role);
        let matchedRoleValues: string[];
        if (normalizeAdminRoleDisplay) {
          // WO-O4O-NETURE-MEMBER-LIST-MODAL-PERMISSION-DISPLAY-CORRECTION-V1:
          // 표시를 "대시보드 접근" 기준과 일치시킨다. role_assignments 의 bare role 과
          // service_memberships.role 까지 후보로 포함해 namespaced adminRoleOptions 로 정규화.
          const candidates = [...activeRoles, svcMembership?.role].filter(Boolean) as string[];
          // prefix 무관 매칭: bare 'operator' / 'neture:operator' / 'cosmetics:operator' 등
          // 마지막 세그먼트(suffix)로 adminRoleOptions 와 대조한다. 서비스별 role prefix 가
          // serviceKey 와 불일치(K-Cosmetics: serviceKey 'k-cosmetics' vs role 'cosmetics:*')해도 인식.
          const lastSeg = (r: string): string => (r.includes(':') ? r.slice(r.lastIndexOf(':') + 1) : r);
          const matchValue = (raw: string): string =>
            adminRoleOptions.find((opt) => opt.value && lastSeg(opt.value) === lastSeg(raw))?.value || '';
          matchedRoleValues = candidates.map(matchValue).filter(Boolean);
        } else {
          matchedRoleValues = activeRoles.filter((r: string) =>
            adminRoleOptions.some(opt => opt.value && opt.value === r)
          );
        }
        // dedup + adminRoleOptions 정의 순서(운영자 → 관리자)로 정렬해 표시한다.
        const orderedRoles = adminRoleOptions
          .filter((opt) => opt.value && matchedRoleValues.includes(opt.value))
          .map((opt) => opt.value);
        setDisplayAdminRoles(orderedRoles);

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

      // WO-O4O-NETURE-OPERATOR-ROLE-ASSIGNMENT-AUTHORITY-LOCK-V1:
      //   운영 권한(role_assignments) 변경 로직 제거. 부여·회수는 platform admin 전용.
      //   (기존 DELETE→POST 단일 덮어쓰기는 다중 역할 손실 위험이 있어 함께 폐기)

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

            {/* 운영 권한 — 읽기 전용. 부여·회수는 platform admin(admin.neture.co.kr) 전용. */}
            {/* WO-O4O-NETURE-OPERATOR-ROLE-ASSIGNMENT-AUTHORITY-LOCK-V1 */}
            <div className="pt-3 border-t">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">운영 권한</h4>
              <div className="flex flex-wrap gap-2">
                {displayAdminRoles.length > 0 ? (
                  displayAdminRoles.map((value) => (
                    <span key={value}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
                      {adminRoleOptions.find((o) => o.value === value)?.label || value}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    {adminRoleOptions.find((o) => !o.value)?.label || '일반 회원'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                운영자·관리자 권한 부여·회수는 플랫폼 관리자(admin)에서만 가능합니다.
              </p>
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
