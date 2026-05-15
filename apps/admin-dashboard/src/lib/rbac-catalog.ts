/**
 * RBAC Catalog (admin-dashboard local)
 *
 * Service / Role 라벨·색상·운영자 판별의 단일 출처.
 * 후속 WO-O4O-ADMIN-RBAC-CATALOG-EXTRACTION-V1 (= W2) 에서 패키지로 추출 예정.
 *
 * SSOT: docs/rbac/RBAC-ROLE-CATALOG-V1.md
 * Related: docs/investigations/IR-O4O-ADMIN-ROLE-LIST-SERVICE-CENTRIC-UX-AUDIT-V1.md
 */

export const SERVICE_KEYS = [
  'platform',
  'kpa',
  'neture',
  'glycopharm',
  'cosmetics',
  'glucoseview',
] as const;

export type ServiceKey = (typeof SERVICE_KEYS)[number];

export interface ServiceMeta {
  key: string;
  label: string;
  badgeClass: string;
}

export const SERVICES: Record<ServiceKey, ServiceMeta> = {
  platform: { key: 'platform', label: 'Platform', badgeClass: 'text-red-700 bg-red-50' },
  kpa: { key: 'kpa', label: 'KPA', badgeClass: 'text-blue-700 bg-blue-50' },
  neture: { key: 'neture', label: 'Neture', badgeClass: 'text-orange-700 bg-orange-50' },
  glycopharm: { key: 'glycopharm', label: 'GlycoPharm', badgeClass: 'text-green-700 bg-green-50' },
  cosmetics: { key: 'cosmetics', label: 'K-Cosmetics', badgeClass: 'text-pink-700 bg-pink-50' },
  glucoseview: { key: 'glucoseview', label: 'GlucoseView', badgeClass: 'text-purple-700 bg-purple-50' },
};

export interface RoleMeta {
  key: string;
  label: string;
  badgeClass: string;
  /** RBAC 관점에서 "운영 권한" 보유 여부 (admin / operator / super_admin) */
  isOperatorRole: boolean;
}

/**
 * Layer A 허용 role suffix 카탈로그
 * 신규 role 추가 시 RBAC-ROLE-CATALOG-V1.md 동시 갱신 필요.
 */
export const ROLES: Record<string, RoleMeta> = {
  super_admin: { key: 'super_admin', label: 'Super Admin', badgeClass: 'text-red-700 bg-red-50', isOperatorRole: true },
  admin: { key: 'admin', label: 'Admin', badgeClass: 'text-orange-700 bg-orange-50', isOperatorRole: true },
  operator: { key: 'operator', label: 'Operator', badgeClass: 'text-blue-700 bg-blue-50', isOperatorRole: true },
  branch_admin: { key: 'branch_admin', label: 'Branch Admin', badgeClass: 'text-orange-700 bg-orange-50', isOperatorRole: true },
  branch_operator: { key: 'branch_operator', label: 'Branch Operator', badgeClass: 'text-blue-700 bg-blue-50', isOperatorRole: true },
  manager: { key: 'manager', label: 'Manager', badgeClass: 'text-indigo-700 bg-indigo-50', isOperatorRole: false },
  moderator: { key: 'moderator', label: 'Moderator', badgeClass: 'text-indigo-700 bg-indigo-50', isOperatorRole: false },
  vendor: { key: 'vendor', label: 'Vendor', badgeClass: 'text-emerald-700 bg-emerald-50', isOperatorRole: false },
  seller: { key: 'seller', label: 'Seller', badgeClass: 'text-emerald-700 bg-emerald-50', isOperatorRole: false },
  supplier: { key: 'supplier', label: 'Supplier', badgeClass: 'text-purple-700 bg-purple-50', isOperatorRole: false },
  partner: { key: 'partner', label: 'Partner', badgeClass: 'text-amber-700 bg-amber-50', isOperatorRole: false },
  affiliate: { key: 'affiliate', label: 'Affiliate', badgeClass: 'text-amber-700 bg-amber-50', isOperatorRole: false },
  pharmacist: { key: 'pharmacist', label: 'Pharmacist', badgeClass: 'text-cyan-700 bg-cyan-50', isOperatorRole: false },
  business: { key: 'business', label: 'Business', badgeClass: 'text-amber-700 bg-amber-50', isOperatorRole: false },
  customer: { key: 'customer', label: 'Customer', badgeClass: 'text-gray-600 bg-gray-50', isOperatorRole: false },
  user: { key: 'user', label: 'User', badgeClass: 'text-gray-500 bg-gray-50', isOperatorRole: false },
};

export interface ParsedRole {
  /** 원본 role 문자열 (e.g. 'kpa:admin' 또는 'admin') */
  raw: string;
  /** 알려진 서비스이면 ServiceKey, 아니면 'unknown' */
  service: ServiceKey | 'unknown';
  /** raw 접두어 그대로 (catalog 외 prefix 도 보존) */
  serviceKey: string;
  /** role suffix */
  roleKey: string;
  /** 접두어 없는 레거시 platform role 인가 */
  isPlatformLegacy: boolean;
}

export function parseRole(raw: string): ParsedRole {
  if (raw.includes(':')) {
    const [svc, rk] = raw.split(':');
    const known = (SERVICE_KEYS as readonly string[]).includes(svc);
    return {
      raw,
      service: known ? (svc as ServiceKey) : 'unknown',
      serviceKey: svc,
      roleKey: rk ?? '',
      isPlatformLegacy: false,
    };
  }
  return {
    raw,
    service: 'platform',
    serviceKey: 'platform',
    roleKey: raw,
    isPlatformLegacy: true,
  };
}

export function getServiceMeta(parsed: ParsedRole): ServiceMeta {
  if (parsed.service !== 'unknown') return SERVICES[parsed.service];
  return {
    key: parsed.serviceKey,
    label: parsed.serviceKey.toUpperCase(),
    badgeClass: 'text-gray-700 bg-gray-100',
  };
}

export function getRoleMeta(parsed: ParsedRole): RoleMeta {
  const known = ROLES[parsed.roleKey];
  if (known) return known;
  return {
    key: parsed.roleKey,
    label: parsed.roleKey
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    badgeClass: 'text-gray-700 bg-gray-100',
    isOperatorRole: false,
  };
}

export function isOperatorRole(raw: string): boolean {
  return getRoleMeta(parseRole(raw)).isOperatorRole;
}

/**
 * facet select 용 옵션 헬퍼
 *
 * WO-O4O-ADMIN-OPERATORS-LEGACY-SERVICE-TABS-CLEANUP-V1:
 *   - Platform 은 super_admin role 의 namespace 로만 의미가 있어 운영자 필터 옵션에서 제외.
 *   - GlucoseView 는 정책상 폐지된 서비스로 옵션에서 제외.
 *   - SERVICES/SERVICE_KEYS/parseRole 등 catalog 본체는 그대로 유지 — 과거 할당된
 *     platform:* / glucoseview:* role 의 표시·badge 색상은 정상 유지.
 *   - canonical 운영 서비스: KPA / Neture / GlycoPharm / K-Cosmetics
 */
const EXCLUDED_FROM_FACET: ReadonlySet<ServiceKey> = new Set(['platform', 'glucoseview']);
export function getServiceOptions(): { value: string; label: string }[] {
  return SERVICE_KEYS
    .filter((k) => !EXCLUDED_FROM_FACET.has(k))
    .map((k) => ({ value: k, label: SERVICES[k].label }));
}

export function getRoleOptions(): { value: string; label: string }[] {
  return Object.values(ROLES).map((r) => ({ value: r.key, label: r.label }));
}
