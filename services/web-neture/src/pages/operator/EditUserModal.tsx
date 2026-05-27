/**
 * EditUserModal — Neture 회원정보 수정 모달 (thin wrapper)
 *
 * WO-O4O-OPERATOR-EDITUSER-MODAL-PHASE1-NETURE-GP-KCOS-V1
 * 공통 모달: @o4o/operator-core-ui CommonEditUserModal
 */

import { CommonEditUserModal, type EditUserModalConfig } from '@o4o/operator-core-ui';
import { api } from '@/lib/apiClient';

// ─── API adapter ─────────────────────────────────────────────
// Neture api baseURL already includes /api/v1 — paths are relative to that.

const makeRequest: EditUserModalConfig['makeRequest'] = async (method, path, data) => {
  const { data: res } = await api.request({ method, url: path, data });
  return res;
};

// ─── Config ──────────────────────────────────────────────────

// WO-O4O-NETURE-ADMIN-OPERATOR-DASHBOARD-AND-MEMBER-TYPE-FIX-V1:
// Neture 회원 유형은 운영자 / 공급자 / 파트너 로 제한.
// "운영자" 는 admin role 영역 (adminRoleOptions), 회원 유형으로 직접 노출하지 않는다.
// "소비자(customer)" 옵션 제거 — Neture 에서는 사용하지 않는 유형.
// "셀러(seller)" 는 store_owner canonical 정렬 진행 중 — 본 작업 범위 외이므로
// 운영자가 선택 가능한 옵션에서도 제외 (기존 데이터의 raw 값 표시는 별도 매핑).
const NETURE_CONFIG: EditUserModalConfig = {
  serviceKey: 'neture',
  makeRequest,
  membershipRoleOptions: [
    { value: 'supplier', label: '공급자' },
    { value: 'partner', label: '파트너' },
  ],
  adminRoleOptions: [
    { value: '', label: '일반 회원' },
    { value: 'neture:operator', label: '운영자' },
    { value: 'neture:admin', label: '관리자' },
  ],
  businessInfoLabel: '사업자 정보',
  businessNameLabel: '사업자명',
};

// ─── Component ───────────────────────────────────────────────

export default function EditUserModal({ userId, onClose, onSuccess }: {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <CommonEditUserModal
      userId={userId}
      config={NETURE_CONFIG}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
