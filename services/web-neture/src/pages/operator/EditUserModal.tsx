/**
 * EditUserModal — 회원정보 수정 모달
 * WO-O4O-OPERATOR-USER-MANAGEMENT-ROLL-OUT-V1
 *
 * 표준 기준: O4O-OPERATOR-USER-MANAGEMENT-STANDARD-V1
 */

import { useState, useEffect } from 'react';
import {
  Loader2,
  AlertCircle,
  X,
  Building2,
  Mail,
} from 'lucide-react';
import { api } from '@/lib/apiClient';
import { toast } from '@o4o/error-handling';
import { AddressSearch } from '@o4o/ui';

// ─── Types ───────────────────────────────────────────────────

export interface BusinessInfoData {
  businessName?: string;
  businessNumber?: string;
  email?: string;
  businessType?: string;
  businessCategory?: string;
  address?: string;
  address2?: string;
  zipCode?: string;
}

// ─── Role Options ───────────────────────────────────────────

// 서비스 역할 (service_memberships.role — 편집 가능)
const NETURE_MEMBERSHIP_OPTIONS = [
  { value: 'supplier', label: '공급자' },
  { value: 'partner', label: '파트너' },
  { value: 'seller', label: '셀러' },
  { value: 'customer', label: '소비자' },
];

// 운영 권한 (role_assignments — 편집 가능)
const NETURE_ADMIN_ROLE_OPTIONS = [
  { value: '', label: '일반 회원' },
  { value: 'neture:operator', label: '운영자' },
  { value: 'neture:admin', label: '관리자' },
];

// ─── Component ───────────────────────────────────────────────

export default function EditUserModal({ userId, onClose, onSuccess }: { userId: string; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasBusinessInfo, setHasBusinessInfo] = useState(false);
  const [membershipRole, setMembershipRole] = useState(''); // service_memberships.role (편집 가능)
  const [originalMembershipRole, setOriginalMembershipRole] = useState('');
  const [currentRole, setCurrentRole] = useState(''); // role_assignments 운영 권한
  const [selectedRole, setSelectedRole] = useState('');

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
    (async () => {
      try {
        const { data } = await api.get(`/operator/members/${userId}`);
        const u = data.user;
        // 회원 유형 (service_memberships.role — 편집 가능)
        const netureMembership = (data.memberships || []).find((m: any) => m.serviceKey === 'neture');
        setMembershipRole(netureMembership?.role || '');
        setOriginalMembershipRole(netureMembership?.role || '');
        // 운영 권한 (role_assignments — 편집 가능)
        const activeRoles: string[] = (data.roles || [])
          .filter((r: any) => r.isActive)
          .map((r: any) => r.role);
        const adminRole = activeRoles.find((r: string) => r === 'neture:admin' || r === 'neture:operator') || '';
        setCurrentRole(adminRole);
        setSelectedRole(adminRole);
        const biz: BusinessInfoData = u.businessInfo || {};
        const hasBiz = !!(biz.businessName || u.company);
        setHasBusinessInfo(hasBiz);
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
      } catch (err: any) {
        setError(err.message || '데이터를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    })();
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
    if (!form.nickname.trim()) { setError('닉네임은 필수입니다.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, string> = {
        lastName: form.lastName,
        firstName: form.firstName,
        nickname: form.nickname,
        phone: form.phone,
      };
      // 회원 유형 변경
      if (membershipRole !== originalMembershipRole) {
        payload.membershipRole = membershipRole;
        payload.membershipServiceKey = 'neture';
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
      await api.put(`/operator/members/${userId}`, payload);

      // 운영 권한 변경 처리 (role_assignments)
      if (selectedRole !== currentRole) {
        // 기존 운영 권한 제거
        if (currentRole) {
          await api.delete(`/operator/members/${userId}/roles/${encodeURIComponent(currentRole)}`).catch(() => {});
        }
        // 새 운영 권한 할당 (일반 회원 = 빈 값이면 제거만)
        if (selectedRole) {
          await api.post(`/operator/members/${userId}/roles`, { role: selectedRole });
        }
      }

      toast.success('회원정보가 수정되었습니다.');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || '수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

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
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            {/* 기본 정보 */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3">기본 정보</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">성</label>
                    <input type="text" name="lastName" value={form.lastName} onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">이름</label>
                    <input type="text" name="firstName" value={form.firstName} onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">닉네임 <span className="text-red-500">*</span></label>
                  <input type="text" name="nickname" value={form.nickname} onChange={handleChange} required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">휴대전화</label>
                  <input type="tel" name="phone" inputMode="numeric" value={form.phone} onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="숫자만 입력" />
                </div>
              </div>
            </div>

            {/* 회원 유형 (편집 가능) */}
            <div className="pt-3 border-t">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">회원 유형</h4>
              <select
                value={membershipRole}
                onChange={(e) => setMembershipRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {NETURE_MEMBERSHIP_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {membershipRole !== originalMembershipRole && (
                <p className="text-xs text-amber-600 mt-1">
                  회원 유형이 변경됩니다: {NETURE_MEMBERSHIP_OPTIONS.find(o => o.value === originalMembershipRole)?.label || originalMembershipRole || '미지정'} → {NETURE_MEMBERSHIP_OPTIONS.find(o => o.value === membershipRole)?.label || membershipRole}
                </p>
              )}
            </div>

            {/* 운영 권한 */}
            <div className="pt-3 border-t">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">운영 권한</h4>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {NETURE_ADMIN_ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {selectedRole !== currentRole && (
                <p className="text-xs text-amber-600 mt-1">
                  권한이 변경됩니다: {currentRole ? NETURE_ADMIN_ROLE_OPTIONS.find(o => o.value === currentRole)?.label || currentRole : '일반 회원'} → {selectedRole ? NETURE_ADMIN_ROLE_OPTIONS.find(o => o.value === selectedRole)?.label || selectedRole : '일반 회원'}
                </p>
              )}
            </div>

            {/* 사업자 정보 */}
            {hasBusinessInfo && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <h4 className="text-sm font-semibold text-slate-700">사업자 정보</h4>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">사업자명</label>
                    <input type="text" name="businessName" value={form.businessName} onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">사업자등록번호</label>
                    <input type="text" name="businessNumber" inputMode="numeric" value={form.businessNumber} onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      maxLength={10} placeholder="숫자만 입력" />
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
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="소매업" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">업종</label>
                      <input type="text" name="businessCategory" value={form.businessCategory} onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="건강식품" />
                    </div>
                  </div>
                  {/* WO-O4O-POSTAL-CODE-ADDRESS-V1 */}
                  <AddressSearch
                    zipCode={form.zipCode}
                    address={form.address1}
                    addressDetail={form.address2}
                    onChange={({ zipCode, address, addressDetail }) =>
                      setForm(prev => ({ ...prev, zipCode, address1: address, address2: addressDetail }))
                    }
                    inputClassName="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
