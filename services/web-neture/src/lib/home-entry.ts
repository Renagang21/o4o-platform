/**
 * O4O 대표 홈 진입 모델 — WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1
 *
 * 로그인 사용자의 **접근 가능 기능 · 이용 중 서비스 · 가입/이용 상태 · 가입 가능 서비스** 를
 * 기존 데이터만으로 계산한다. 새 권한 판정을 만들지 않는다 — 여기서 만든 버튼은 "안내"이고,
 * 실제 접근은 각 서비스의 서버 guard 가 최종 판정한다.
 *
 * WO-O4O-HOME-ROLE-WORKSPACE-ENTRY-REALIGNMENT-V1 — "내 업무 공간" 은 **4대 Role Workspace 카드**
 * (커뮤니티 · 매장 · 공급자 · 서비스 운영, `O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`) 로 고정한다.
 *   - 매장 카드: 서비스별 "매장 HUB / 내 매장" 반복 나열 없음. 버튼 = **매장 하나**(매장 이름) →
 *     그 매장의 Store Workspace Home (`<basePath>/workspace`). Home / My Store / Store Hub / My Services
 *     선택은 Store Workspace 안에서 한다. 서비스 이름은 매장이 여럿일 때만 보조 정보.
 *   - 공급자 카드: 공급자 서비스 이용 상태 active 만. 관리자 bypass 로 개인 업무 공간처럼 노출하지 않는다.
 *   - 서비스 운영 카드: `GET /work-scope/operator-services` 목록만 (platformBypass 는 목록에 없다).
 *   - Platform Admin(`platform:super_admin`) 은 4 업무 공간과 섞지 않고 `platformAdmin`(플랫폼 관리) 로 분리한다.
 *
 * 데이터 소스 (전부 기존 API):
 *   - `GET /auth/services`           서비스 카탈로그 + 내 가입 상태 (nameKo · basePath 는 이번 WO 에서 추가)
 *   - `GET /neture/home/entry`       내 매장(복수 나열) · 내 분회(slug)  — 이번 WO 의 홈 전용 read API
 *   - `user.roles` (from /auth/me)   platform:super_admin · 관리자 판정 (Neture RoleGuard 와 같은 상수)
 *   - `GET /communities`             Community Catalog + 참여 가능 여부 — **커뮤니티 진입의 유일한 출처**
 *                                    (WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1: Community Identity ≠
 *                                    Service Identity. 약사 커뮤니티 = kpa-society OR pharmacy-hub, 화장품 = k-cosmetics,
 *                                    O4O 공통 = 모든 로그인 사용자. 프런트에서 membership 으로 커뮤니티를 추론하지 않는다.)
 *   - `GET /work-scope/operator-services`  운영자로 참여하는 서비스 목록 — **서비스 운영자 화면 진입의 유일한 출처**
 *                                    (WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1: role 문자열을 프런트에서
 *                                    파싱해 서비스를 추측하지 않는다. 서버가 role_assignments + service_memberships
 *                                    active 로 확정한 목록만 쓴다. 1개면 바로 진입, 여러 개면 선택.)
 *   - `entry.serviceStates`          공급자 **서비스 이용 상태** (WO-O4O-NETURE-MAIN-ACCOUNT-AND-
 *                                    SUPPLIER-PARTNER-SERVICE-SEPARATION-V1 — role 문자열 · neture 회원
 *                                    active 만으로 상태를 추론하지 않는다. 출처: neture_suppliers,
 *                                    승인 전에는 service_memberships role fallback)
 *                                    Legacy Partner 축(`partner`)은 WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-
 *                                    AND-SELLER-RECRUITMENT-EXTRACTION-V1 로 은퇴 — EntryGroup 'partner' 없음.
 *
 * 원칙:
 *   - 조회 실패는 **미가입으로 취급하지 않는다** → `error` 로 노출하고 재시도만 제공한다.
 *   - `joinEnabled=true` 만으로 "가입 가능" 이라 하지 않는다 → membership row 없음 + 가입 경로가 확인된
 *     서비스만 `joinable`, 그 외는 목록에서 제외한다.
 *   - 복수 매장은 자동 선택하지 않는다 → 매장 이름을 전부 나열하고 이동은 서비스 화면에 맡긴다.
 *   - 비활성 상태(신청 중 · 정지 · 반려 · 탈퇴)는 handoff 대상이 아니다 → 공개 안내 링크만.
 *   - UI 문구에 membership · role · handoff 같은 구현 용어를 쓰지 않는다.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from './apiClient';
import { PLATFORM_ROLES } from './role-constants';
import type { User } from '../contexts/AuthContext';

// ─── API 응답 타입 ────────────────────────────────────────────────────────────

export type ServiceMembershipStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'withdrawn';

export interface EntryService {
  key: string;
  name: string;
  nameKo: string;
  domain: string;
  basePath: string;
  description: string;
  joinEnabled: boolean;
  membership: { status: ServiceMembershipStatus | string } | null;
}

export interface EntryStore {
  serviceKey: string;
  organizationId: string;
  name: string | null;
  memberRole: string;
}

export interface EntryBranch {
  organizationId: string;
  slug: string | null;
  name: string;
}

/** 공급자 서비스 이용 상태 — 서버 `resolveNetureServiceStates` 와 같은 값 */
export type NetureServiceUsageStatus = 'none' | 'pending' | 'active' | 'rejected' | 'suspended' | 'withdrawn';

export interface NetureServiceState {
  status: NetureServiceUsageStatus;
  source: string;
}

export interface NetureServiceStates {
  supplier: NetureServiceState;
}

export const NONE_SERVICE_STATES: NetureServiceStates = {
  supplier: { status: 'none', source: 'none' },
};

/** `GET /work-scope/operator-services` 응답 1건 (apps/api-server/src/utils/service-tenant.resolver.ts OperatorServiceMembership) */
export interface EntryOperatorService {
  serviceKey: string;
  serviceName: string;
  scope: 'admin' | 'operator';
  workspaceMode: 'standard' | 'special' | 'none' | 'undecided';
  workspaceAvailable: boolean;
}

/** `GET /communities` 응답 1건 (apps/api-server/src/utils/community-access.resolver.ts CommunityListItem) */
export interface EntryCommunity {
  communityKey: string;
  name: string;
  canParticipate: boolean;
  reason: string | null;
  /** 진입 surface — Community 하나에 여러 URL 이 있을 수 있다 (같은 Community 데이터) */
  entries: { serviceKey: string; path: string }[];
}

export interface HomeEntryData {
  services: EntryService[];
  stores: EntryStore[];
  branches: EntryBranch[];
  serviceStates: NetureServiceStates;
  /** 운영자로 참여하는 서비스 (서버 확정 목록). 없으면 빈 배열로 취급한다 */
  operatorServices?: EntryOperatorService[];
  /** Community Catalog + 참여 판정 (서버 확정). 없으면 빈 배열로 취급한다 */
  communities?: EntryCommunity[];
}

// ─── 진입 액션 ────────────────────────────────────────────────────────────────

/**
 * - internal : Neture 자체 route (react-router Link)
 * - handoff  : 다른 서비스로 로그인 세션을 넘겨 이동 (POST /auth/handoff → targetUrl)
 * - public   : 로그인 없이 볼 수 있는 공개 안내 링크 (일반 <a>, handoff 강제 없음)
 */
export type EntryAction =
  | { kind: 'internal'; to: string }
  | { kind: 'handoff'; serviceKey: string; returnPath?: string }
  | { kind: 'public'; href: string };

export interface EntryItem {
  id: string;
  /** 버튼 라벨 — 같은 기능이 여러 서비스에 있으면 서비스 이름으로 구분한다 */
  label: string;
  /** 보조 설명 (매장 이름 나열 등) */
  note?: string;
  action: EntryAction;
}

/** 4대 Role Workspace — 순서 · 제목 · 설명은 고정이고 항목만 사용자별로 달라진다 */
export type WorkspaceKey = 'community' | 'store' | 'supplier' | 'operator';

export interface EntryGroup {
  id: WorkspaceKey;
  title: string;
  /** 카드의 짧은 설명 (한 줄) */
  description: string;
  /** 실제 사용 가능한 진입만. 비어 있으면 카드는 "이용 중인 항목 없음" 으로 표시한다 */
  items: EntryItem[];
}

/** 카드 메타 — 항목이 없어도 4 카드는 항상 같은 순서로 노출된다 */
export const WORKSPACE_CARDS: ReadonlyArray<{ id: WorkspaceKey; title: string; description: string }> = [
  { id: 'community', title: '커뮤니티', description: '정보와 경험을 나눕니다' },
  { id: 'store', title: '매장', description: '내 매장을 운영합니다' },
  { id: 'supplier', title: '공급자', description: '상품 · 주문 · 콘텐츠 업무' },
  { id: 'operator', title: '서비스 운영', description: '서비스를 운영합니다' },
];

export interface StatusItem {
  id: string;
  serviceName: string;
  status: ServiceMembershipStatus | string;
  statusLabel: string;
  /** 허용된 안내 · 재신청 경로만 (없으면 링크 없음) */
  guide?: { label: string; href: string };
}

export interface HomeEntryModel {
  /** 내 업무 공간 — 항상 4개 (WORKSPACE_CARDS 순서) */
  groups: EntryGroup[];
  /** 플랫폼 관리 진입 — platform:super_admin 만. Service Operator 와 별개 (없으면 null) */
  platformAdmin: EntryItem | null;
  myServices: EntryItem[];
  statusItems: StatusItem[];
  joinable: EntryItem[];
}

// ─── 서비스별 고정 경로 (기존 route 만 — 신규 route 없음) ────────────────────────

/** 서비스별 홈(커뮤니티) · Store Workspace Home · 운영자 · 가입 경로. 없는 항목은 노출하지 않는다. */
interface ServicePaths {
  home?: string;
  /** Store Workspace Home — 대표 홈 매장 카드의 유일한 매장 진입 (Store Hub 는 그 안의 탭) */
  myStore?: string;
  operator?: string;
  admin?: string;
  /** 가입 경로가 확인된 서비스만 (joinEnabled 와 별개로 실제 화면이 있어야 한다) */
  join?: string;
  /** 신청 중 · 반려 등 상태 안내 화면 (공개) */
  joinStatus?: string;
}

// WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1 §18:
//   대표 홈 "내 매장" 진입 = 각 서비스 Store Workspace Home (`<basePath>/workspace`) — Home / My Store / Store Hub / My Services 상위 구조로 들어간다.
//   경로 파생 규칙은 @o4o/store-ui-core resolveStoreWorkspacePaths 와 동일 (KPA·KCos `/store`, PH `/store-owner`).
const SERVICE_PATHS: Record<string, ServicePaths> = {
  neture: { home: '/community', operator: '/operator', admin: '/admin', join: '/register' },
  'kpa-society': { home: '/', myStore: '/store/workspace', operator: '/operator', admin: '/admin', join: '/register' },
  'pharmacy-hub': { home: '/', myStore: '/store-owner/workspace', operator: '/operator', admin: '/admin', join: '/join', joinStatus: '/join/status' },
  'k-cosmetics': { myStore: '/store/workspace', operator: '/operator', admin: '/admin', join: '/register' },
  // 분회: 자가 가입 없음 · 운영자 화면은 분회 slug 아래
  'kpa-branch': {},
};

/** role prefix → canonical service key (role_assignments 의 prefix 는 service_key 와 다르다) */
export const STATUS_LABELS: Record<string, string> = {
  active: '이용 중',
  pending: '가입 신청 중',
  suspended: '이용 정지',
  rejected: '가입 반려',
  withdrawn: '탈퇴',
};

/** 공급자 서비스는 "O4O 계정 가입" 이 아니라 "서비스 신청" 이다 — 문구를 구분한다. */
export const SERVICE_STATUS_LABELS: Record<NetureServiceUsageStatus, string> = {
  none: '미신청',
  active: '이용 중',
  pending: '신청 중',
  suspended: '이용 정지',
  rejected: '신청 반려',
  withdrawn: '탈퇴',
};

/** 공급자 서비스 고정 정보 — 안내 · 신청 · 업무 진입은 전부 Neture 내부 route */
export const NETURE_SERVICE_INFO = {
  supplier: { name: '공급자 서비스', landing: '/supplier', work: '/supplier/dashboard', workLabel: '공급자 업무' },
} as const;

export function normalizeServiceStates(raw: unknown): NetureServiceStates {
  const r = (raw ?? {}) as Partial<Record<'supplier', Partial<NetureServiceState>>>;
  const pick = (v?: Partial<NetureServiceState>): NetureServiceState => ({
    status: (v?.status as NetureServiceUsageStatus) ?? 'none',
    source: v?.source ?? 'none',
  });
  return { supplier: pick(r.supplier) };
}

// ─── 조회 ─────────────────────────────────────────────────────────────────────

export interface UseHomeEntryResult {
  data: HomeEntryData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * 로그인 상태에서만 조회한다. 어느 한쪽이라도 실패하면 전체를 error 로 둔다 —
 * 부분 데이터로 "미가입" 처럼 보이는 화면을 만들지 않기 위해서다.
 */
export function useHomeEntry(enabled: boolean): UseHomeEntryResult {
  const [data, setData] = useState<HomeEntryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [servicesRes, entryRes, operatorRes, communitiesRes] = await Promise.all([
          api.get('/auth/services'),
          api.get('/neture/home/entry'),
          // WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1: 운영자 서비스 목록의 유일한 출처
          api.get('/work-scope/operator-services'),
          // WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1: 커뮤니티 목록·참여 판정의 유일한 출처.
          //   배포 간극(web 먼저 · API 나중) 동안 404 면 커뮤니티 그룹만 비운다 — 홈 전체를 error 로 만들지 않는다.
          //   (다른 출처는 종전대로 하나라도 실패하면 전체 error.)
          api.get('/communities').catch(() => null),
        ]);
        const services = servicesRes.data?.data?.services;
        const entry = entryRes.data?.data;
        const operatorServices = operatorRes.data?.data?.services;
        const communitiesRaw = communitiesRes?.data?.data?.communities;
        const communities = Array.isArray(communitiesRaw) ? communitiesRaw : [];
        if (!Array.isArray(services) || !entry || !entry.serviceStates || !Array.isArray(operatorServices)) {
          throw new Error('bad response');
        }
        if (cancelled) return;
        setData({
          services,
          stores: Array.isArray(entry.stores) ? entry.stores : [],
          branches: Array.isArray(entry.branches) ? entry.branches : [],
          serviceStates: normalizeServiceStates(entry.serviceStates),
          operatorServices,
          communities,
        });
      } catch {
        if (cancelled) return;
        setData(null);
        setError('이용 중인 서비스 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, tick]);

  return { data, loading, error, reload };
}

// ─── 서비스 이동 ──────────────────────────────────────────────────────────────

export class ServiceEntryError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'ServiceEntryError';
  }
}

const HANDOFF_ERROR_MESSAGES: Record<string, string> = {
  HANDOFF_TARGET_NO_MEMBERSHIP: '이 서비스에 가입되어 있지 않습니다.',
  HANDOFF_TARGET_WITHDRAWN: '탈퇴한 서비스는 이동할 수 없습니다.',
  HANDOFF_TARGET_NOT_ACTIVE: '이 서비스 이용이 아직 승인되지 않았거나 정지 상태입니다.',
  AUTH_REQUIRED: '로그인이 필요합니다.',
};

/**
 * 다른 서비스 진입 URL 을 발급받는다 — 기존 handoff 계약 재사용(서버 계약 무변경).
 * 이동은 하지 않는다: 호출부가 응답이 아직 유효한지(뒤로가기 복원 이후 늦게 도착한 응답이 아닌지)
 * 판단한 뒤 `window.location.assign` 한다 (WO-O4O-NETURE-HOME-BACK-NAVIGATION-BUSY-STATE-FIX-V1).
 * 실패는 예외로 돌려 호출부가 화면에 표시한다. 토큰 · 개인정보를 로그에 남기지 않는다.
 */
export async function resolveServiceEntryUrl(serviceKey: string, returnPath?: string): Promise<string> {
  let targetUrl: string | undefined;
  try {
    const res = await api.post('/auth/handoff', { targetServiceKey: serviceKey, returnPath });
    targetUrl = res.data?.data?.targetUrl;
  } catch (err: unknown) {
    const body = (err as { response?: { data?: { code?: string; error?: string } } })?.response?.data;
    throw new ServiceEntryError(
      HANDOFF_ERROR_MESSAGES[body?.code ?? ''] ?? '서비스로 이동하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      body?.code,
    );
  }
  if (!targetUrl || !/^https:\/\//.test(targetUrl)) {
    throw new ServiceEntryError('서비스 이동 주소를 확인하지 못했습니다.');
  }
  return targetUrl;
}

/** 발급 + 즉시 이동. 성공하면 현재 탭이 대상 서비스로 바뀐다. */
export async function openServiceEntry(serviceKey: string, returnPath?: string): Promise<void> {
  window.location.assign(await resolveServiceEntryUrl(serviceKey, returnPath));
}

/** 공개 안내 URL (로그인 · handoff 없이 열리는 주소) */
export function publicServiceUrl(svc: Pick<EntryService, 'domain' | 'basePath'>, path = '/'): string {
  const base = `https://${svc.domain}${svc.basePath ?? ''}`;
  return path === '/' ? `${base}/` : `${base}${path}`;
}

// ─── 모델 계산 ────────────────────────────────────────────────────────────────

const hasAnyRole = (roles: string[], set: string[]) => roles.some((r) => set.includes(r));

export function buildHomeEntryModel(user: User, data: HomeEntryData): HomeEntryModel {
  const roles = user.roles ?? [];
  const byKey = new Map(data.services.map((s) => [s.key, s]));
  const nameOf = (key: string) => byKey.get(key)?.nameKo ?? byKey.get(key)?.name ?? key;
  const isActive = (key: string) => byKey.get(key)?.membership?.status === 'active';
  const isPlatformAdmin = hasAnyRole(roles, PLATFORM_ROLES);

  // ── 내 업무 공간 (4대 Role Workspace) ──
  // 커뮤니티 — 출처는 `GET /communities`(Community Catalog + 서버 참여 판정) 하나. Community ≠ Service:
  //   약사 커뮤니티는 KPA/PH 두 진입 surface 를 가진 **하나의** Community 라, 이용 중인 서비스의 surface 로
  //   들어간다(PH 만 가입한 회원 → PH 진입). O4O 공통 커뮤니티는 Neture 내부 경로(로그인만 있으면 참여).
  //   참여 불가 Community 는 진입을 만들지 않는다 (WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1).
  const community: EntryItem[] = [];
  for (const c of data.communities ?? []) {
    if (!c.canParticipate || !Array.isArray(c.entries) || c.entries.length === 0) continue;
    const entry =
      c.entries.find((e) => e.serviceKey === 'neture') ??
      c.entries.find((e) => isActive(e.serviceKey)) ??
      c.entries[0];
    if (entry.serviceKey === 'neture') {
      community.push({ id: `community:${c.communityKey}`, label: c.name, action: { kind: 'internal', to: entry.path } });
    } else {
      community.push({
        id: `community:${c.communityKey}`,
        label: c.name,
        note: c.entries.length > 1 ? `${nameOf(entry.serviceKey)}에서 참여` : undefined,
        action: { kind: 'handoff', serviceKey: entry.serviceKey, returnPath: entry.path },
      });
    }
  }

  // 매장 — 버튼 하나 = 매장 하나 (`GET /neture/home/entry` stores 그대로, 자동 선택 없음).
  //   진입은 그 매장이 속한 서비스의 Store Workspace Home. 같은 매장이 여러 서비스에 등록돼 있으면
  //   (1 Store : N Services) 서비스마다 버튼이 생기고, 매장이 둘 이상일 때만 서비스 이름을 보조 정보로 붙인다.
  //   "매장 HUB" 는 Store Workspace 안의 탭이므로 대표 홈에 별도 진입을 두지 않는다.
  const store: EntryItem[] = [];
  for (const s of data.stores) {
    if (!isActive(s.serviceKey)) continue;
    const path = SERVICE_PATHS[s.serviceKey]?.myStore;
    if (!path) continue; // Store Workspace 경로가 확인된 서비스만 (dead link 0)
    store.push({
      id: `store:${s.organizationId}:${s.serviceKey}`,
      label: s.name ?? '이름 없는 매장',
      action: { kind: 'handoff', serviceKey: s.serviceKey, returnPath: path },
    });
  }
  if (store.length > 1) {
    // 구분 정보는 매장이 여럿일 때만 (§6) — 서비스 이름
    for (const item of store) item.note = nameOf((item.action as { serviceKey: string }).serviceKey);
  }

  // 공급자 — 독립 서비스. 업무 진입은 **공급자 서비스 이용 상태가 active 일 때만**.
  //   관리자(neture:admin · platform:super_admin)의 guard bypass 는 "운영 목적 통과" 이지 공급자 이용 자격이
  //   아니므로 개인 업무 공간으로 노출하지 않는다 (WO-O4O-HOME-ROLE-WORKSPACE-ENTRY-REALIGNMENT-V1 §7).
  //   role 문자열 · neture 회원 여부로 판정하지 않는다. 서버 권한은 그대로다.
  const states = data.serviceStates ?? NONE_SERVICE_STATES;
  const supplier: EntryItem[] = [];
  if (states.supplier.status === 'active') {
    supplier.push({ id: 'supplier:neture', label: NETURE_SERVICE_INFO.supplier.workLabel, action: { kind: 'internal', to: NETURE_SERVICE_INFO.supplier.work } });
  }

  // 서비스 운영 — 출처는 `GET /work-scope/operator-services` 하나 (role_assignments + service_memberships
  // active 를 서버가 결합). 프런트는 role 문자열에서 서비스를 추측하지 않는다. 버튼 라벨 = 서비스 이름
  // (카드 제목이 이미 "서비스 운영"), admin scope 는 "관리자" 보조 정보. 목록이 1개면 그 서비스로 바로,
  // 여러 개면 여기서 선택한다 (WO-O4O-SERVICE-OPERATOR-WORKSPACE-REALIGNMENT-V1).
  // platform:super_admin 은 이 카드에 넣지 않는다 — Platform Admin ≠ Service Operator (`platformAdmin` 별도).
  const operator: EntryItem[] = [];
  for (const svc of data.operatorServices ?? []) {
    if (!svc.workspaceAvailable) continue;
    const key = svc.serviceKey;
    const note = svc.scope === 'admin' ? '관리자' : undefined;
    const label = byKey.has(key) ? nameOf(key) : svc.serviceName;
    if (key === 'neture') {
      const to = svc.scope === 'admin' ? SERVICE_PATHS.neture.admin! : SERVICE_PATHS.neture.operator!;
      operator.push({ id: 'operator:neture', label, note, action: { kind: 'internal', to } });
      continue;
    }
    if (key === 'kpa-branch') {
      // 분회 운영자 화면은 분회 slug 아래 (index route 없음 → 첫 운영 화면 operator/site) — 내 분회가 확인될 때만
      for (const b of data.branches) {
        if (!b.slug) continue;
        operator.push({ id: `operator:kpa-branch:${b.organizationId}`, label: b.name, note: nameOf('kpa-branch'), action: { kind: 'handoff', serviceKey: 'kpa-branch', returnPath: `/${b.slug}/operator/site` } });
      }
      continue;
    }
    const paths = SERVICE_PATHS[key];
    const path = svc.scope === 'admin' ? paths?.admin : paths?.operator;
    if (!path) continue; // canonical route 가 확인된 서비스만 (dead link 0)
    const id = `operator:${key}:${svc.scope}`;
    if (operator.some((o) => o.id === id)) continue;
    operator.push({ id, label, note, action: { kind: 'handoff', serviceKey: key, returnPath: path } });
  }

  const itemsOf: Record<WorkspaceKey, EntryItem[]> = { community, store, supplier, operator };
  const groups: EntryGroup[] = WORKSPACE_CARDS.map((c) => ({ ...c, items: itemsOf[c.id] }));

  // ── 플랫폼 관리 — platform:super_admin 만. 4 업무 공간과 분리된 내부 관리 진입 (Neture /admin) ──
  const platformAdmin: EntryItem | null = isPlatformAdmin
    ? { id: 'platform:admin', label: '플랫폼 관리', action: { kind: 'internal', to: SERVICE_PATHS.neture.admin! } }
    : null;

  // ── 내 서비스 (Service Identity 목록 · active 만 — 업무 공간이 아니다) ──
  const myServices: EntryItem[] = [];
  for (const svcKey of ['supplier'] as const) {
    if (states[svcKey].status !== 'active') continue;
    const info = NETURE_SERVICE_INFO[svcKey];
    myServices.push({ id: `svc:neture-${svcKey}`, label: info.name, action: { kind: 'internal', to: info.work } });
  }
  for (const svc of data.services) {
    if (svc.membership?.status !== 'active') continue;
    if (svc.key === 'neture') {
      myServices.push({ id: 'svc:neture', label: nameOf('neture'), note: '현재 화면', action: { kind: 'internal', to: '/mypage' } });
      continue;
    }
    if (svc.key === 'kpa-branch') {
      // 분회 회원 → 자기 분회로. slug 를 모르면 분회 홈(/me) 으로.
      if (data.branches.length === 0) {
        myServices.push({ id: 'svc:kpa-branch', label: nameOf('kpa-branch'), action: { kind: 'handoff', serviceKey: 'kpa-branch', returnPath: '/me' } });
      }
      for (const b of data.branches) {
        myServices.push({
          id: `svc:kpa-branch:${b.organizationId}`,
          label: `${nameOf('kpa-branch')} · ${b.name}`,
          action: { kind: 'handoff', serviceKey: 'kpa-branch', returnPath: b.slug ? `/${b.slug}` : '/me' },
        });
      }
      continue;
    }
    if (svc.key === 'cafe24-b2b') continue; // O4O 로그인 회원 대상 화면이 아니다
    myServices.push({ id: `svc:${svc.key}`, label: nameOf(svc.key), action: { kind: 'handoff', serviceKey: svc.key, returnPath: '/' } });
  }

  // ── 가입 · 이용 상태 (active 가 아닌 membership 만) ──
  const statusItems: StatusItem[] = [];
  for (const svcKey of ['supplier'] as const) {
    const status = states[svcKey].status;
    if (status === 'none' || status === 'active') continue;
    const info = NETURE_SERVICE_INFO[svcKey];
    // 신청 중 · 반려 · 정지 · 탈퇴 → 안내 화면(랜딩)만. 업무 진입 버튼은 없다.
    const guide =
      status === 'rejected' || status === 'withdrawn'
        ? { label: '다시 신청하기', href: info.landing }
        : { label: '신청 상태 보기', href: info.landing };
    statusItems.push({ id: `status:neture-${svcKey}`, serviceName: info.name, status, statusLabel: SERVICE_STATUS_LABELS[status], guide });
  }
  for (const svc of data.services) {
    const status = svc.membership?.status;
    if (!status || status === 'active') continue;
    const paths = SERVICE_PATHS[svc.key];
    let guide: StatusItem['guide'];
    if (svc.key === 'neture') {
      if (status === 'pending') guide = { label: '신청 상태 보기', href: '/register/pending' };
    } else if (paths?.joinStatus && (status === 'pending' || status === 'rejected')) {
      guide = { label: '신청 상태 보기', href: publicServiceUrl(svc, paths.joinStatus) };
    } else if (paths?.join && status === 'rejected') {
      guide = { label: '다시 신청하기', href: publicServiceUrl(svc, paths.join) };
    }
    // suspended · withdrawn 은 안내 링크 없음 — 서비스 운영자 문의 경로가 별도 정의되지 않았다.
    statusItems.push({ id: `status:${svc.key}`, serviceName: nameOf(svc.key), status, statusLabel: STATUS_LABELS[status] ?? status, guide });
  }

  // ── 가입 가능한 서비스 — membership row 없음 + joinEnabled + 가입 경로 확인된 것만 ──
  const joinable: EntryItem[] = [];
  // 공급자 서비스 미신청 → 서비스 신청 안내 (O4O 계정 가입이 아니다)
  for (const svcKey of ['supplier'] as const) {
    if (states[svcKey].status !== 'none') continue;
    const info = NETURE_SERVICE_INFO[svcKey];
    joinable.push({
      id: `join:neture-${svcKey}`,
      label: `${info.name} 신청`,
      note: '제품을 등록하고 매장에 공급하는 공급자 서비스',
      action: { kind: 'internal', to: info.landing },
    });
  }
  for (const svc of data.services) {
    if (svc.membership) continue;
    if (!svc.joinEnabled) continue;
    const join = SERVICE_PATHS[svc.key]?.join;
    if (!join) continue;
    joinable.push({
      id: `join:${svc.key}`,
      label: nameOf(svc.key),
      note: svc.description,
      action: svc.key === 'neture' ? { kind: 'internal', to: join } : { kind: 'public', href: publicServiceUrl(svc, join) },
    });
  }

  return { groups, platformAdmin, myServices, statusItems, joinable };
}
