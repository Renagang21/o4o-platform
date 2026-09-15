/**
 * O4O 대표 홈 진입 모델 — WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1
 *
 * 로그인 사용자의 **접근 가능 기능 · 이용 중 서비스 · 가입/이용 상태 · 가입 가능 서비스** 를
 * 기존 데이터만으로 계산한다. 새 권한 판정을 만들지 않는다 — 여기서 만든 버튼은 "안내"이고,
 * 실제 접근은 각 서비스의 서버 guard 가 최종 판정한다.
 *
 * 데이터 소스 (전부 기존 API):
 *   - `GET /auth/services`           서비스 카탈로그 + 내 가입 상태 (nameKo · basePath 는 이번 WO 에서 추가)
 *   - `GET /neture/home/entry`       내 매장(복수 나열) · 내 분회(slug)  — 이번 WO 의 홈 전용 read API
 *   - `user.roles` (from /auth/me)   운영자 진입 판정 (Neture RoleGuard 와 같은 상수)
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
import { ADMIN_ROLES, OPERATOR_OR_ABOVE_ROLES, PLATFORM_ROLES } from './role-constants';
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

/** 공급자 · 파트너 서비스 이용 상태 — 서버 `resolveNetureServiceStates` 와 같은 값 */
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

export interface HomeEntryData {
  services: EntryService[];
  stores: EntryStore[];
  branches: EntryBranch[];
  serviceStates: NetureServiceStates;
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

export interface EntryGroup {
  id: 'community' | 'store-hub' | 'my-store' | 'supplier' | 'operator';
  title: string;
  items: EntryItem[];
}

export interface StatusItem {
  id: string;
  serviceName: string;
  status: ServiceMembershipStatus | string;
  statusLabel: string;
  /** 허용된 안내 · 재신청 경로만 (없으면 링크 없음) */
  guide?: { label: string; href: string };
}

export interface HomeEntryModel {
  groups: EntryGroup[];
  myServices: EntryItem[];
  statusItems: StatusItem[];
  joinable: EntryItem[];
}

// ─── 서비스별 고정 경로 (기존 route 만 — 신규 route 없음) ────────────────────────

/** 서비스별 홈(커뮤니티) · 매장 HUB · 내 매장 · 운영자 · 가입 경로. 없는 항목은 노출하지 않는다. */
interface ServicePaths {
  home?: string;
  storeHub?: string;
  myStore?: string;
  operator?: string;
  admin?: string;
  /** 가입 경로가 확인된 서비스만 (joinEnabled 와 별개로 실제 화면이 있어야 한다) */
  join?: string;
  /** 신청 중 · 반려 등 상태 안내 화면 (공개) */
  joinStatus?: string;
}

const SERVICE_PATHS: Record<string, ServicePaths> = {
  neture: { home: '/community', operator: '/operator', admin: '/admin', join: '/register' },
  'kpa-society': { home: '/', storeHub: '/store-hub', myStore: '/store', operator: '/operator', admin: '/admin', join: '/register' },
  'pharmacy-hub': { home: '/', storeHub: '/store-hub', myStore: '/store-owner', operator: '/operator', admin: '/admin', join: '/join', joinStatus: '/join/status' },
  'k-cosmetics': { storeHub: '/store-hub', myStore: '/store', operator: '/operator', admin: '/admin', join: '/register' },
  // 분회: 자가 가입 없음 · 운영자 화면은 분회 slug 아래
  'kpa-branch': {},
};

/** role prefix → canonical service key (role_assignments 의 prefix 는 service_key 와 다르다) */
const ROLE_PREFIX_TO_SERVICE: Record<string, string> = {
  neture: 'neture',
  kpa: 'kpa-society',
  'pharmacy-hub': 'pharmacy-hub',
  cosmetics: 'k-cosmetics',
  'kpa-branch': 'kpa-branch',
};

export const STATUS_LABELS: Record<string, string> = {
  active: '이용 중',
  pending: '가입 신청 중',
  suspended: '이용 정지',
  rejected: '가입 반려',
  withdrawn: '탈퇴',
};

/** 공급자 · 파트너 서비스는 "O4O 계정 가입" 이 아니라 "서비스 신청" 이다 — 문구를 구분한다. */
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
        const [servicesRes, entryRes] = await Promise.all([
          api.get('/auth/services'),
          api.get('/neture/home/entry'),
        ]);
        const services = servicesRes.data?.data?.services;
        const entry = entryRes.data?.data;
        if (!Array.isArray(services) || !entry || !entry.serviceStates) throw new Error('bad response');
        if (cancelled) return;
        setData({
          services,
          stores: Array.isArray(entry.stores) ? entry.stores : [],
          branches: Array.isArray(entry.branches) ? entry.branches : [],
          serviceStates: normalizeServiceStates(entry.serviceStates),
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

  // ── 주요 업무 ──
  const community: EntryItem[] = [
    { id: 'community:neture', label: `${nameOf('neture')} 커뮤니티`, action: { kind: 'internal', to: SERVICE_PATHS.neture.home! } },
  ];
  for (const key of ['kpa-society', 'pharmacy-hub']) {
    if (isActive(key) && SERVICE_PATHS[key]?.home) {
      community.push({
        id: `community:${key}`,
        label: `${nameOf(key)} 커뮤니티`,
        action: { kind: 'handoff', serviceKey: key, returnPath: SERVICE_PATHS[key].home },
      });
    }
  }

  // 매장 HUB · 내 매장 — 서비스별로 묶고 매장 이름은 전부 나열 (자동 선택 없음)
  const storesByService = new Map<string, EntryStore[]>();
  for (const s of data.stores) {
    if (!storesByService.has(s.serviceKey)) storesByService.set(s.serviceKey, []);
    storesByService.get(s.serviceKey)!.push(s);
  }
  const storeHub: EntryItem[] = [];
  const myStore: EntryItem[] = [];
  for (const [key, stores] of storesByService) {
    if (!isActive(key)) continue;
    const paths = SERVICE_PATHS[key];
    const names = stores.map((s) => s.name ?? '이름 없는 매장');
    const note = stores.length > 1 ? `${stores.length}개 매장 — 매장 선택은 서비스 화면에서 합니다: ${names.join(', ')}` : names[0];
    if (paths?.storeHub) {
      storeHub.push({ id: `store-hub:${key}`, label: `${nameOf(key)} 매장 HUB`, note, action: { kind: 'handoff', serviceKey: key, returnPath: paths.storeHub } });
    }
    if (paths?.myStore) {
      myStore.push({ id: `my-store:${key}`, label: `${nameOf(key)} 내 매장`, note, action: { kind: 'handoff', serviceKey: key, returnPath: paths.myStore } });
    }
  }

  // 공급자 — 독립 서비스. 업무 진입은 **그 서비스 이용 상태가 active 일 때만**
  // (관리자는 운영 목적으로 통과 — 서버 guard 와 동일). role 문자열 · neture 회원 여부로 판정하지 않는다.
  const states = data.serviceStates ?? NONE_SERVICE_STATES;
  const isAdmin = isPlatformAdmin || hasAnyRole(roles, ADMIN_ROLES);
  const supplier: EntryItem[] = [];
  if (states.supplier.status === 'active' || isAdmin) {
    supplier.push({ id: 'supplier:neture', label: NETURE_SERVICE_INFO.supplier.workLabel, action: { kind: 'internal', to: NETURE_SERVICE_INFO.supplier.work } });
  }

  // 서비스 운영자 화면 — `{prefix}:operator|admin` + 해당 서비스 이용 중. platform:super_admin 은 Neture /admin.
  const operator: EntryItem[] = [];
  if (isPlatformAdmin) {
    operator.push({ id: 'operator:platform', label: `${nameOf('neture')} 관리자`, action: { kind: 'internal', to: SERVICE_PATHS.neture.admin! } });
  } else if (isActive('neture') && hasAnyRole(roles, OPERATOR_OR_ABOVE_ROLES)) {
    const to = roles.includes('neture:admin') ? SERVICE_PATHS.neture.admin! : SERVICE_PATHS.neture.operator!;
    operator.push({ id: 'operator:neture', label: `${nameOf('neture')} 운영자`, action: { kind: 'internal', to } });
  }
  for (const role of roles) {
    const [prefix, name] = role.split(':');
    if (!prefix || !name || prefix === 'neture' || prefix === 'platform') continue;
    if (name !== 'operator' && name !== 'admin') continue;
    const key = ROLE_PREFIX_TO_SERVICE[prefix];
    if (!key || !isActive(key)) continue;
    if (key === 'kpa-branch') {
      // 분회 운영자 화면은 분회 slug 아래 (index route 없음 → 첫 운영 화면 operator/site) — 내 분회가 확인될 때만
      for (const b of data.branches) {
        if (!b.slug) continue;
        operator.push({ id: `operator:kpa-branch:${b.organizationId}`, label: `${b.name} 운영자`, action: { kind: 'handoff', serviceKey: 'kpa-branch', returnPath: `/${b.slug}/operator/site` } });
      }
      continue;
    }
    const paths = SERVICE_PATHS[key];
    const path = name === 'admin' ? paths?.admin : paths?.operator;
    if (!path) continue;
    const id = `operator:${key}:${name}`;
    if (operator.some((o) => o.id === id)) continue;
    operator.push({ id, label: `${nameOf(key)} ${name === 'admin' ? '관리자' : '운영자'}`, action: { kind: 'handoff', serviceKey: key, returnPath: path } });
  }

  const groups: EntryGroup[] = [
    { id: 'community', title: '커뮤니티', items: community },
    { id: 'store-hub', title: '매장 HUB', items: storeHub },
    { id: 'my-store', title: '내 매장', items: myStore },
    { id: 'supplier', title: '공급자 업무', items: supplier },
    { id: 'operator', title: '서비스 운영자 화면', items: operator },
  ].filter((g) => g.items.length > 0) as EntryGroup[];

  // ── 내가 이용하는 서비스 (active 만) ──
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

  return { groups, myServices, statusItems, joinable };
}
