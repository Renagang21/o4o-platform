/**
 * EditUserModal — GlycoPharm 회원정보 수정 모달 (thin wrapper)
 *
 * WO-O4O-OPERATOR-EDITUSER-MODAL-PHASE1-NETURE-GP-KCOS-V1
 * 공통 모달: @o4o/operator-core-ui CommonEditUserModal
 */

import { CommonEditUserModal, type EditUserModalConfig } from '@o4o/operator-core-ui';
import { api } from '../../lib/apiClient';

// ─── API adapter ─────────────────────────────────────────────
// GlycoPharm api baseURL includes /api/v1 — strip prefix from full paths.

const makeRequest: EditUserModalConfig['makeRequest'] = async (method, path, data) => {
  const url = path.replace(/^\/api\/v1/, '') || '/';
  const { data: res } = await api.request({ method, url, data });
  return res;
};

// ─── Config ──────────────────────────────────────────────────

const GLYCOPHARM_CONFIG: EditUserModalConfig = {
  serviceKey: 'glycopharm',
  makeRequest,
  membershipRoleOptions: [
    { value: 'pharmacy', label: '약국' },
    { value: 'supplier', label: '공급자' },
  ],
  adminRoleOptions: [
    { value: '', label: '일반 회원' },
    { value: 'glycopharm:operator', label: '운영자' },
    { value: 'glycopharm:admin', label: '관리자' },
  ],
  businessInfoLabel: '약국 정보',
  businessNameLabel: '약국명',
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
      config={GLYCOPHARM_CONFIG}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
