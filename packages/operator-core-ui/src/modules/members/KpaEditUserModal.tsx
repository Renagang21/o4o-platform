/**
 * KpaEditUserModal — KPA 회원 도메인 편집 모달
 *
 * WO-O4O-OPERATOR-EDITUSER-MODAL-KPA-INTEGRATION-V1
 *
 * MemberManagementPage Drawer 인라인 편집 로직을 독립 모달로 추출.
 * CommonEditUserModal 과 병렬 구조 (같은 members module 내 배치).
 *
 * ─── CommonEditUserModal 통합 금지 원칙 ───────────────────────
 * KPA 는 아래 구조 차이로 인해 CommonEditUserModal 적용 대상이 아니다.
 * 해당 이유가 해소되지 않는 한 이 파일을 CommonEditUserModal 로 대체하지 말 것.
 *
 *   1. ID 해석: 현재 wrapper는 users.id, KPA 서버가 km/sm ID도 해석
 *   2. 분리 API: /info (기본 정보) vs /status (상태) — CommonEditUserModal 은 단일 PUT
 *   3. KPA 전용 비즈니스 로직: activity_type → store_owner 자동 부여/회수 + warnings[]
 *   4. makeRequest 경로 기준: /api/v1/kpa 상대경로 (/members/...)
 * ────────────────────────────────────────────────────────────────
 *
 * KPA 특수 사항:
 *   - ID: 현재 wrapper는 users.id (서버는 kpa_members/service_memberships ID도 허용)
 *   - PATCH /members/:id/info  — 기본 정보 + 약국 정보 + activity_type
 *   - PATCH /members/:id/status — 상태 변경 (별도 엔드포인트)
 *   - activity_type → pharmacy_owner: backend store_owner 자동 부여/회수 + warnings[]
 *   - makeRequest paths: /api/v1/kpa 기준 상대경로 (/members/... )
 */

import type { CSSProperties } from 'react';
import { X, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';
import { useKpaMemberEdit } from './useKpaMemberEdit';
import { KPA_ACTIVITY_LABELS, KPA_MEMBER_STATUS_OPTIONS, canEditKpaMemberStatus } from './kpaMemberEditModel';
import { AddressSearch } from '@o4o/ui';
import type { ApiRequestFn } from './CommonEditUserModal';

// ─── Types ───────────────────────────────────────────────────

export type KpaMemberStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'withdrawn';

export interface KpaMemberBusinessInfo {
  businessNumber?: string | null;
  businessName?: string | null;
  ceoName?: string | null;
  taxInvoiceEmail?: string | null;
  representativeName?: string | null;
  taxEmail?: string | null;
  pharmacy_phone?: string | null;
  contactName?: string | null;
  zipCode?: string | null;
  address?: string | null;
  address2?: string | null;
  ownerPhone?: string | null;
  storeAddress?: {
    zipCode?: string | null;
    baseAddress?: string | null;
    detailAddress?: string | null;
  } | null;
  // WO-O4O-OPERATOR-BUSINESS-REGISTRATION-DISPLAY-ALIGNMENT-V1:
  //   사업자등록증 4 canonical 필드 — 가입 폼에서 users.businessInfo 에 저장된 후
  //   GET /kpa/members 응답에 projection 되어 Drawer 등 operator UI 에서 표시.
  businessType?: string | null;
  businessItem?: string | null;
  businessEntityType?: string | null;
  businessStartDate?: string | null;
}

export interface KpaMemberForEdit {
  /** 현재 서비스 wrapper의 users.id. 서버에서 기존 km/sm ID도 해석한다. */
  id: string;
  user_id?: string;
  user?: { name?: string; email?: string; nickname?: string | null };
  status: KpaMemberStatus;
  membership_type?: string | null;
  license_number?: string | null;
  pharmacy_name?: string | null;
  pharmacy_address?: string | null;
  activity_type?: string | null;
  capabilities?: string[];
  business_info?: KpaMemberBusinessInfo | null;
}

export interface KpaEditUserModalProps {
  canChangeMembershipType?: boolean;
  /** 탈퇴·가입 대기로 되돌림 등 민감한 상태 처리는 서비스 admin 전용. */
  canAdministerMemberStatus?: boolean;
  member: KpaMemberForEdit;
  /** Injected API adapter. Paths are relative to /api/v1/kpa (e.g. /members/:id/info) */
  makeRequest: ApiRequestFn;
  onClose: () => void;
  onSuccess: () => void;
}

/** 대상이 바뀌면 입력과 저장 수명을 함께 새로 시작한다. */
export function KpaEditUserModal(props: Readonly<KpaEditUserModalProps>) {
  return <KpaMemberEditor key={props.member.id} {...props} />;
}

function KpaMemberEditor(props: Readonly<KpaEditUserModalProps>) {
  const { member, canChangeMembershipType = false, canAdministerMemberStatus = false } = props;
  const isSuperAdmin = (member.capabilities ?? []).includes('platform:super_admin');
  const isWithdrawn = member.status === 'withdrawn';
  const { form, setForm, saving, actionError, savedInfo, savedActivity, savedStatus, handleSave, handleClose } = useKpaMemberEdit(props);
  const onClose = () => { void handleClose(); };

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '6px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 14,
    color: '#1e293b',
    background: '#fff',
    boxSizing: 'border-box',
  };
  const labelStyle: CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    marginBottom: 4,
  };
  const fieldStyle: CSSProperties = { marginBottom: 12 };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="회원정보 수정"
        style={{ background: '#fff', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: 0 }}>
            회원정보 수정
            {member.user?.name && (
              <span style={{ fontSize: 14, fontWeight: 400, color: '#64748b', marginLeft: 8 }}>
                {member.user.name}
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            aria-label="닫기"
            disabled={saving}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#94a3b8' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Guard messages */}
        {isSuperAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#94a3b8' }}>
            <ShieldAlert size={15} />
            super_admin 권한을 보유한 회원은 수정할 수 없습니다.
          </div>
        )}
        {isWithdrawn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#94a3b8' }}>
            <ShieldAlert size={15} />
            탈퇴 처리된 회원은 수정할 수 없습니다.
          </div>
        )}

        {savedInfo && (
          <p role="status" style={{ fontSize: 13, color: '#0369a1', marginBottom: 12 }}>
            회원 정보는 저장되었습니다. 남은 변경 사항을 저장하거나 닫을 수 있습니다.
          </p>
        )}
        {/* Error */}
        {actionError && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#fef2f2', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#dc2626' }}>
            <AlertCircle size={14} />
            {actionError}
          </div>
        )}

        {!isSuperAdmin && !isWithdrawn && (
          <>
            {/* 이름 */}
            <div style={fieldStyle}>
              <label style={labelStyle}>이름</label>
              <input
                type="text"
                aria-label="이름"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="이름"
                disabled={saving}
                style={inputStyle}
              />
            </div>

            {/* 닉네임 */}
            <div style={fieldStyle}>
              <label style={labelStyle}>닉네임 <span style={{ fontWeight: 400, color: '#94a3b8' }}>(비우면 해제)</span></label>
              <input
                type="text"
                aria-label="닉네임"
                value={form.nickname}
                onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                placeholder="닉네임 (선택)"
                maxLength={50}
                disabled={saving}
                style={inputStyle}
              />
            </div>

            {/* 유형 */}
            <div style={fieldStyle}>
              <label style={labelStyle}>유형</label>
              <select
                disabled={!canChangeMembershipType || saving}
                aria-label="유형"
                value={form.membership_type}
                onChange={(e) => setForm((f) => ({ ...f, membership_type: e.target.value }))}
                style={inputStyle}
              >
                <option value="pharmacist">약사</option>
                <option value="student">약대생</option>
                {form.membership_type === 'pharmacist_member' && (
                  <option value="pharmacist_member">약사</option>
                )}
                {form.membership_type === 'pharmacy_student_member' && (
                  <option value="pharmacy_student_member">약대생</option>
                )}
              </select>
            </div>

            {/* 상태 */}
            <div style={fieldStyle}>
              <label style={labelStyle}>상태</label>
              <select
                aria-label="상태"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as KpaMemberStatus }))}
                disabled={saving}
                style={inputStyle}
              >
                {KPA_MEMBER_STATUS_OPTIONS
                  .filter(({ value }) => value === form.status || canEditKpaMemberStatus(savedStatus, value, canAdministerMemberStatus))
                  .map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            {/* 면허번호 */}
            <div style={fieldStyle}>
              <label style={labelStyle}>면허번호</label>
              <input
                type="text"
                aria-label="면허번호"
                value={form.license_number}
                onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value }))}
                placeholder="면허번호 (선택)"
                disabled={saving}
                style={inputStyle}
              />
            </div>

            {/* 활동 유형 (activity_type) */}
            <div style={fieldStyle}>
              <label style={labelStyle}>활동 유형</label>
              <select
                aria-label="활동 유형"
                value={form.activity_type}
                onChange={(e) => setForm((f) => ({ ...f, activity_type: e.target.value }))}
                disabled={saving}
                style={inputStyle}
              >
                <option value="">-</option>
                {Object.entries(KPA_ACTIVITY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              {form.activity_type === 'pharmacy_owner'
                && savedActivity !== 'pharmacy_owner' && (
                <p style={{ fontSize: 11, color: '#0369a1', marginTop: 4 }}>
                  약국 개설자로 지정 시, <strong>사업자번호와 약국명</strong>이 입력되어 있으면
                  매장 운영 권한(store_owner)이 자동 부여됩니다.
                  누락 시 경고가 표시되며 권한 부여는 보류됩니다.
                </p>
              )}
              {savedActivity === 'pharmacy_owner'
                && form.activity_type !== 'pharmacy_owner' && (
                <p style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>
                  다른 활동 유형으로 변경하면 매장 운영 권한(store_owner)이 회수됩니다.
                </p>
              )}
            </div>

            {/* 약국 정보 — pharmacy_owner일 때만 */}
            {form.activity_type === 'pharmacy_owner' && (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16, marginTop: 4 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 12 }}>약국 정보</p>

                {/* 약국명 */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>약국명 <span style={{ color: '#dc2626' }}>*</span></label>
                  <input
                    type="text"
                    aria-label="약국명"
                    value={form.pharmacy_name}
                    onChange={(e) => setForm((f) => ({ ...f, pharmacy_name: e.target.value }))}
                    placeholder="약국명 (store_owner 자동 부여 필수)"
                    disabled={saving}
                    style={{
                      ...inputStyle,
                      borderColor: form.pharmacy_name.trim().length === 0 ? '#fca5a5' : '#cbd5e1',
                    }}
                  />
                </div>

                {/* 약국 전화번호 */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>약국 전화번호</label>
                  <input
                    type="text"
                    aria-label="약국 전화번호"
                    value={form.pharmacy_phone}
                    onChange={(e) => setForm((f) => ({ ...f, pharmacy_phone: e.target.value }))}
                    placeholder="예: 02-1234-5678"
                    disabled={saving}
                    style={inputStyle}
                  />
                </div>

                {/* 개설자 연락처 */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>개설자 연락처</label>
                  <input
                    type="text"
                    aria-label="개설자 연락처"
                    value={form.ownerPhone}
                    onChange={(e) => setForm((f) => ({ ...f, ownerPhone: e.target.value }))}
                    placeholder="개설자 본인 연락처 (선택)"
                    disabled={saving}
                    style={inputStyle}
                  />
                </div>

                {/* 대표자명 */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>대표자명</label>
                  <input
                    type="text"
                    aria-label="대표자명"
                    value={form.ceoName}
                    onChange={(e) => setForm((f) => ({ ...f, ceoName: e.target.value }))}
                    placeholder="사업자등록증 대표자명 (선택)"
                    maxLength={50}
                    disabled={saving}
                    style={inputStyle}
                  />
                </div>

                {/* 담당자명 */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>담당자명</label>
                  <input
                    type="text"
                    aria-label="담당자명"
                    value={form.contactName}
                    onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                    placeholder="담당자 이름 (선택)"
                    maxLength={50}
                    disabled={saving}
                    style={inputStyle}
                  />
                </div>

                {/* 사업자등록번호 */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>사업자등록번호 <span style={{ color: '#dc2626' }}>*</span></label>
                  <input
                    type="text"
                    aria-label="사업자등록번호"
                    value={form.business_number}
                    onChange={(e) => setForm((f) => ({ ...f, business_number: e.target.value }))}
                    placeholder="사업자등록번호 (store_owner 자동 부여 필수, 숫자만 추출됨)"
                    disabled={saving}
                    style={{
                      ...inputStyle,
                      borderColor: form.business_number.replace(/[^0-9]/g, '').length === 0 ? '#fca5a5' : '#cbd5e1',
                    }}
                  />
                </div>

                {/* 세금계산서 이메일 */}
                <div style={fieldStyle}>
                  <label style={labelStyle}>세금계산서 이메일</label>
                  <input
                    type="email"
                    aria-label="세금계산서 이메일"
                    value={form.taxInvoiceEmail}
                    onChange={(e) => setForm((f) => ({ ...f, taxInvoiceEmail: e.target.value }))}
                    placeholder="세금계산서 수신 이메일 (선택)"
                    maxLength={254}
                    disabled={saving}
                    style={inputStyle}
                  />
                </div>

                {/* 약국 주소 */}
                <div style={{ ...fieldStyle, marginBottom: 8 }}>
                  <label style={labelStyle}>약국 주소</label>
                  <AddressSearch
                    zipCode={form.zipCode}
                    address={form.address1}
                    addressDetail={form.address2}
                    onChange={({ zipCode, address, addressDetail }) =>
                      setForm((f) => ({ ...f, zipCode, address1: address, address2: addressDetail }))
                    }
                    disabled={saving}
                  />
                </div>

                {/* 필수 필드 누락 경고 */}
                {(form.pharmacy_name.trim().length === 0
                  || form.business_number.replace(/[^0-9]/g, '').length === 0) && (
                  <p style={{ fontSize: 11, color: '#dc2626', marginBottom: 12 }}>
                    ⚠ 약국명과 사업자번호가 모두 있어야 매장 운영 권한(store_owner)이 자동 부여됩니다.
                    누락 상태로 저장 시 권한 부여는 보류되며 경고가 표시됩니다.
                  </p>
                )}

                <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16 }}>
                  ※ 빈 입력으로 저장하면 기존 값이 보존됩니다 (변경 없음 정책).
                </p>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: 14, color: '#64748b', cursor: 'pointer' }}
          >
            취소
          </button>
          {!isSuperAdmin && !isWithdrawn && (
            <button
              type="button"
              onClick={() => { void handleSave(); }}
              disabled={saving}
              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              저장
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
