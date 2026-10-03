/**
 * Store Membership API Client — 매장 구성원 초대 · 수락 · 해제
 *
 * WO-O4O-STORE-BUSINESS-ENROLLMENT-AND-MEMBER-ACCESS-V1
 * 정책 정본: `docs/baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md`
 *
 * `/api/v1/store/*` 는 서비스 중립 mount 라 `coreApiClient` 를 쓴다(서비스 접두사 없음).
 * 조직은 **요청이 고르지 않는다** — 서버가 세션으로 해석한다. serviceKey 는 업종 경계 힌트일 뿐이다.
 */
import { coreApiClient } from './client';

export type StoreAccessLevel = 'owner' | 'member' | 'none';

/** 자가 가입이 가능한 업종. 서버의 ENROLLABLE_SERVICE_KEYS 와 같은 목록이다. */
export type EnrollableServiceKey = 'kpa' | 'cosmetics' | 'pharmacy-hub';

export interface StoreEnrollmentResult {
  organizationId: string;
  serviceKey: EnrollableServiceKey;
  outcome: 'created' | 'connected' | 'existing';
}

export interface StoreAccess {
  level: StoreAccessLevel;
  organizationId: string | null;
  memberRole: string | null;
}

export interface StoreMember {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  status: 'invited' | 'active';
  joinedAt: string;
}

export interface StoreInvitation {
  organizationId: string;
  organizationName: string;
}

type Envelope<T> = { success: boolean; data: T };

const withService = (serviceKey?: string) => (serviceKey ? { serviceKey } : undefined);

export const storeMembershipApi = {
  /** 사업자 가입 — 조직·역할은 서버가 공용 helper 로 만든다(화면이 만들지 않는다). */
  async enroll(serviceKey: EnrollableServiceKey, businessName: string): Promise<StoreEnrollmentResult> {
    const res = await coreApiClient.post<Envelope<StoreEnrollmentResult>>('/store/enrollment', {
      serviceKey,
      businessName,
    });
    return res.data;
  },

  /** 내 접근 자격 — 화면이 Owner/Member 를 추측하지 않게 서버 판정을 그대로 쓴다. */
  async getMyAccess(serviceKey?: string): Promise<StoreAccess> {
    const res = await coreApiClient.get<Envelope<StoreAccess>>('/store/membership', withService(serviceKey));
    return res.data;
  },

  async listMembers(serviceKey?: string): Promise<{ organizationId: string; members: StoreMember[] }> {
    const res = await coreApiClient.get<Envelope<{ organizationId: string; members: StoreMember[] }>>(
      '/store/members',
      withService(serviceKey),
    );
    return res.data;
  },

  /** 초대 — 이미 가입한 사용자만. 메일은 보내지 않는다(정본 §4). */
  async invite(email: string, serviceKey?: string): Promise<{ organizationId: string; userId: string; role: string }> {
    const q = serviceKey ? `?serviceKey=${encodeURIComponent(serviceKey)}` : '';
    const res = await coreApiClient.post<Envelope<{ organizationId: string; userId: string; role: string }>>(
      `/store/members/invite${q}`,
      { email },
    );
    return res.data;
  },

  async remove(userId: string, serviceKey?: string): Promise<void> {
    const q = serviceKey ? `?serviceKey=${encodeURIComponent(serviceKey)}` : '';
    await coreApiClient.delete<Envelope<unknown>>(`/store/members/${encodeURIComponent(userId)}${q}`);
  },

  async listMyInvitations(): Promise<StoreInvitation[]> {
    const res = await coreApiClient.get<Envelope<StoreInvitation[]>>('/store/invitations');
    return res.data;
  },

  async accept(organizationId: string): Promise<void> {
    await coreApiClient.post<Envelope<unknown>>(`/store/invitations/${encodeURIComponent(organizationId)}/accept`);
  },
};
