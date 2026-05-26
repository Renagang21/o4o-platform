/**
 * EditUserModal — K-Cosmetics 회원정보 수정 모달 (thin wrapper)
 *
 * WO-O4O-OPERATOR-EDITUSER-MODAL-PHASE1-NETURE-GP-KCOS-V1
 * 공통 모달: @o4o/operator-core-ui CommonEditUserModal
 *
 * K-Cosmetics specific:
 *   - cosmetics_members.sub_role (store_owner / store_staff)
 *   - GET  /cosmetics/members/:userId  — sub_role 조회
 *   - PATCH /cosmetics/members/:userId — sub_role 저장
 */

import { CommonEditUserModal, type EditUserModalConfig } from '@o4o/operator-core-ui';
import { api } from '../../lib/apiClient';

// ─── API adapter ─────────────────────────────────────────────

const makeRequest: EditUserModalConfig['makeRequest'] = async (method, path, data) => {
  const url = path.replace(/^\/api\/v1/, '') || '/';
  const { data: res } = await api.request({ method, url, data });
  return res;
};

// ─── Config ──────────────────────────────────────────────────

const KCOSMETICS_CONFIG: EditUserModalConfig = {
  serviceKey: 'k-cosmetics',
  makeRequest,
  membershipRoleOptions: [
    { value: 'seller', label: '판매자' },
    { value: 'consumer', label: '소비자' },
    { value: 'pharmacist', label: '약사' },
    { value: 'supplier', label: '공급자' },
    { value: 'partner', label: '파트너' },
  ],
  adminRoleOptions: [
    { value: '', label: '일반 회원' },
    { value: 'cosmetics:operator', label: '운영자' },
    { value: 'cosmetics:admin', label: '관리자' },
  ],
  businessInfoLabel: '사업자 정보',
  businessNameLabel: '사업자명',
  profileClassification: {
    label: '매장 역할',
    options: [
      { value: 'store_owner', label: '매장 경영자' },
      { value: 'store_staff', label: '매장 근무자' },
    ],
    fetchPath: (userId) => `/cosmetics/members/${userId}`,
    patchPath: (userId) => `/cosmetics/members/${userId}`,
    responseField: 'subRole',
  },
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
      config={KCOSMETICS_CONFIG}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
