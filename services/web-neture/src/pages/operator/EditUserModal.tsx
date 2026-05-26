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

const NETURE_CONFIG: EditUserModalConfig = {
  serviceKey: 'neture',
  makeRequest,
  membershipRoleOptions: [
    { value: 'supplier', label: '공급자' },
    { value: 'partner', label: '파트너' },
    { value: 'seller', label: '셀러' },
    { value: 'customer', label: '소비자' },
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
