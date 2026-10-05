/**
 * Neture 약국 매장 commerce — 운영자 · 관리자 · 공급자 API
 *
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1
 * docs/design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md §3 · §8-4
 * backend: apps/api-server/src/modules/neture-pharmacy/neture-pharmacy.routes.ts (/api/v1/neture/*)
 *
 * 응답: { success: true, data } / { success: false, error, code }.
 * 실패는 서버 메시지(error)를 담은 Error 로 throw 한다 — 화면이 그대로 보여준다.
 */
import { api } from '../apiClient';

export type MembershipAction = 'approve' | 'reject' | 'suspend' | 'reactivate' | 'terminate';
export type ProposalAction = 'approve' | 'reject' | 'end';
export type EventAction = 'approve' | 'reject' | 'cancel';
export type RecruitmentAction = 'approve' | 'reject';

export interface PharmacyMembership {
  id: string;
  organization_id: string;
  status: string;
  pharmacy_name: string;
  business_number: string;
  pharmacist_license_number: string;
  applied_at: string;
  decided_at: string | null;
  reason: string | null;
  organization_name: string | null;
  organization_address: string | null;
}

export interface SemiFranchise {
  id: string;
  key: string;
  name: string;
  organization_id: string;
  status: 'active' | 'closed';
  payment_receiver_key: string | null;
  community_key: string | null;
  activeMemberCount?: number;
  operators?: Array<{ userId: string; assignedAt: string }>;
}

export interface SemiFranchiseMembership {
  id: string;
  status: string;
  appliedAt: string;
  decidedAt: string | null;
  reason: string | null;
  organizationId: string;
  organizationName: string | null;
  organizationAddress: string | null;
  basicMembershipStatus: string | null;
  businessNumber: string | null;
  pharmacistLicenseNumber: string | null;
}

export interface SupplyProposal {
  id: string;
  status: string;
  unitPrice: number;
  note: string | null;
  reason: string | null;
  targetOrganizationId: string | null;
  targetOrganizationName: string | null;
  createdAt: string;
  decidedAt: string | null;
  endedAt: string | null;
  semiFranchiseKey: string;
  semiFranchiseName: string;
  offerId: string;
  priceGeneral: number | null;
  productName: string;
  supplierId: string;
  supplierName: string | null;
}

export interface SemiFranchiseEvent {
  id: string;
  status: string;
  isActive: boolean;
  eventPrice: number;
  priceGeneral: number | null;
  startAt: string;
  endAt: string;
  totalQuantity: number | null;
  perStoreLimit: number | null;
  perOrderLimit: number | null;
  reason: string | null;
  createdAt: string;
  decidedAt: string | null;
  semiFranchiseKey: string;
  semiFranchiseName: string;
  offerId: string;
  productName: string;
  supplierId: string;
  supplierName: string | null;
}

export interface SemiFranchiseRecruitment {
  id: string;
  masterId: string;
  productName: string;
  supplierName: string | null;
  supplyUnitPrice: number | null;
  consumerPrice: number | null;
  status: string;
  exposureStatus: string;
  exposureReviewNote: string | null;
  createdAt: string;
  semiFranchiseKey: string;
  semiFranchiseName: string;
}

function errorOf(err: unknown): Error {
  const e = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
  return new Error(e?.response?.data?.error || e?.response?.data?.message || e?.message || '요청을 처리하지 못했습니다.');
}

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  try {
    const clean: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== '') clean[k] = v;
    const res = await api.get(path, { params: clean });
    return res.data?.data as T;
  } catch (err) {
    throw errorOf(err);
  }
}

async function send<T>(method: 'post' | 'patch' | 'delete', path: string, body?: unknown): Promise<T> {
  try {
    const res = method === 'delete' ? await api.delete(path) : await api[method](path, body ?? {});
    return res.data?.data as T;
  } catch (err) {
    throw errorOf(err);
  }
}

const enc = encodeURIComponent;

// ─── Neture 운영자 ──────────────────────────────────────────────────────────

export const neturePharmacyOperatorApi = {
  listMemberships: (params: { status?: string; q?: string; page?: number; limit?: number }) =>
    get<{ items: PharmacyMembership[]; total: number }>('/neture/operator/pharmacy-memberships', params),
  decideMembership: (id: string, action: MembershipAction, reason?: string) =>
    send<PharmacyMembership>('post', `/neture/operator/pharmacy-memberships/${enc(id)}/${action}`, { reason }),

  listAssignedSemiFranchises: () => get<SemiFranchise[]>('/neture/operator/semi-franchises'),

  listSfMemberships: (key: string, status?: string) =>
    get<SemiFranchiseMembership[]>(`/neture/operator/semi-franchises/${enc(key)}/memberships`, { status }),
  decideSfMembership: (key: string, id: string, action: MembershipAction, reason?: string) =>
    send('post', `/neture/operator/semi-franchises/${enc(key)}/memberships/${enc(id)}/${action}`, { reason }),

  listProposals: (key: string, status?: string) =>
    get<SupplyProposal[]>(`/neture/operator/semi-franchises/${enc(key)}/supply-proposals`, { status }),
  decideProposal: (key: string, id: string, action: ProposalAction, reason?: string) =>
    send('post', `/neture/operator/semi-franchises/${enc(key)}/supply-proposals/${enc(id)}/${action}`, { reason }),

  listEvents: (key: string, status?: string) =>
    get<SemiFranchiseEvent[]>(`/neture/operator/semi-franchises/${enc(key)}/events`, { status }),
  decideEvent: (key: string, id: string, action: EventAction, reason?: string) =>
    send('post', `/neture/operator/semi-franchises/${enc(key)}/events/${enc(id)}/${action}`, { reason }),

  listRecruitments: (key: string, status?: string) =>
    get<SemiFranchiseRecruitment[]>(`/neture/operator/semi-franchises/${enc(key)}/recruitments`, { status }),
  decideRecruitment: (key: string, id: string, action: RecruitmentAction, note?: string) =>
    send('post', `/neture/operator/semi-franchises/${enc(key)}/recruitments/${enc(id)}/${action}`, { note }),
};

// ─── Neture 관리자 ──────────────────────────────────────────────────────────

export const neturePharmacyAdminApi = {
  listSemiFranchises: () => get<SemiFranchise[]>('/neture/admin/semi-franchises'),
  createSemiFranchise: (input: { key: string; name: string; communityKey?: string }) =>
    send<SemiFranchise>('post', '/neture/admin/semi-franchises', input),
  updateSemiFranchise: (
    key: string,
    patch: { name?: string; status?: 'active' | 'closed'; communityKey?: string | null; paymentReceiverKey?: string | null },
  ) => send<SemiFranchise>('patch', `/neture/admin/semi-franchises/${enc(key)}`, patch),
  assignOperator: (key: string, userId: string) =>
    send<{ assigned: boolean }>('post', `/neture/admin/semi-franchises/${enc(key)}/operators/${enc(userId)}`),
  revokeOperator: (key: string, userId: string) =>
    send<{ revoked: boolean }>('delete', `/neture/admin/semi-franchises/${enc(key)}/operators/${enc(userId)}`),
};

// ─── 공급자 ─────────────────────────────────────────────────────────────────

export const neturePharmacySupplierApi = {
  listSemiFranchises: () => get<Array<{ key: string; name: string }>>('/neture/supplier/semi-franchises'),

  listProposals: () => get<SupplyProposal[]>('/neture/supplier/supply-proposals'),
  createProposal: (input: {
    offerId: string;
    semiFranchiseKey: string;
    targetOrganizationId?: string;
    unitPrice: number;
    note?: string;
  }) => send<{ id: string; status: string }>('post', '/neture/supplier/supply-proposals', input),
  endProposal: (id: string) => send('post', `/neture/supplier/supply-proposals/${enc(id)}/end`),

  listEvents: () => get<SemiFranchiseEvent[]>('/neture/supplier/semi-franchise-events'),
  createEvent: (input: {
    offerId: string;
    semiFranchiseKey: string;
    eventPrice: number;
    startAt: string;
    endAt: string;
    totalQuantity?: number;
    perStoreLimit?: number;
    perOrderLimit?: number;
  }) => send<{ id: string; status: string }>('post', '/neture/supplier/semi-franchise-events', input),
  cancelEvent: (id: string) => send('post', `/neture/supplier/semi-franchise-events/${enc(id)}/cancel`),

  listRecruitments: () => get<SemiFranchiseRecruitment[]>('/neture/supplier/semi-franchise-recruitments'),
  createRecruitment: (input: { masterId: string; semiFranchiseKey: string; supplyUnitPrice: number; consumerPrice?: number }) =>
    send<{ id: string; status: string; exposureStatus: string }>('post', '/neture/supplier/semi-franchise-recruitments', input),
};

// ─── 공용 표시 ──────────────────────────────────────────────────────────────

/** 가입(기본 · 세미프랜차이즈) 상태별 가능한 처리 — backend constants.ts 전이표와 같다. */
export const MEMBERSHIP_ACTIONS_BY_STATUS: Record<string, Array<{ action: MembershipAction; label: string }>> = {
  pending: [
    { action: 'approve', label: '승인' },
    { action: 'reject', label: '반려' },
  ],
  active: [
    { action: 'suspend', label: '정지' },
    { action: 'terminate', label: '종료' },
  ],
  suspended: [
    { action: 'reactivate', label: '재개' },
    { action: 'terminate', label: '종료' },
  ],
};


export const STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  active: '활성',
  approved: '승인',
  rejected: '반려',
  suspended: '정지',
  terminated: '종료',
  ended: '종료',
  canceled: '취소',
  closed: '마감',
  recruiting: '모집중',
};

export const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  approved: 'bg-green-100 text-green-700',
  recruiting: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-orange-100 text-orange-700',
  terminated: 'bg-slate-100 text-slate-500',
  ended: 'bg-slate-100 text-slate-500',
  canceled: 'bg-slate-100 text-slate-500',
  closed: 'bg-slate-100 text-slate-500',
};

export function formatWon(v: number | null | undefined): string {
  return v === null || v === undefined ? '-' : `${Number(v).toLocaleString('ko-KR')}원`;
}

export function formatDateTime(v: string | null | undefined): string {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}
