/**
 * Neture 공급자 서비스 이용 상태 해석기 (단일 출처)
 *
 * WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1
 * WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1:
 *   파트너 서비스 상태(`neture.neture_partners` · membership role='partner' fallback)는 은퇴했다.
 *   응답 계약은 `{ supplier }` 뿐이며 `partner` 필드는 더 이상 존재하지 않는다.
 *
 * O4O 계정(Neture 로그인) 은 신원 + 대표 홈이고, **공급자는 독립된 서비스**다.
 * 신청 · 승인 · 이용 상태는 아래 기존 테이블에서만 읽는다 — role 문자열이나
 * `service_memberships(neture).status='active'` 만으로 상태를 추론하지 않는다.
 *
 *   공급자: `neture_suppliers.status`        (PENDING · ACTIVE · REJECTED · INACTIVE)
 *
 * (제거) legacy fallback — 과거에는 서비스 행이 없을 때 `service_memberships(neture).role='supplier'`
 * 의 가입 상태를 공급자 상태로 보였다. Neture 가입 승인이 공급자를 만들지 않게 된 뒤로는(§10 E4)
 * 그 fallback 이 "Neture 가입 승인 = 공급자 이용 중" 으로 잘못 보이게 하므로 없앴다
 * (CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 D). 공급자 상태 = neture_suppliers 뿐.
 *
 * `netureMain` = Neture 가입(메인 AI 이용 · 연결 서비스 신청 자격) 상태. `service_memberships(neture).status`
 * 를 그대로 보인다 — 공급자 상태와 섞지 않는다.
 *
 * WO-O4O-SUPPLIER-CANONICAL-RUNTIME-AND-PRODUCTION-FINAL-CLOSURE-V1:
 *   공급자 행은 API guard(neture-identity.middleware) 와 **같은** canonical resolver 로 찾는다
 *   (organization_members(owner) → organizations(supplier) → neture_suppliers.organization_id ·
 *   legacy user_id 는 그 resolver 안의 관측 가능한 fallback). 과거 `WHERE user_id = $1 LIMIT 1`
 *   은 guard 가 공급자로 인정한 사용자를 홈에서 'none' 으로 판정하는 모순을 만들었다.
 *   후보가 N 개면 임의 1건을 고르지 않는다 — 후보 상태를 우선순위(active > pending > suspended >
 *   rejected)로 합친 값을 돌려준다. 실제 작업 조직 선택은 guard 의 409 SUPPLIER_CONTEXT_REQUIRED
 *   계약이 맡는다(전용 UX 신설 없음).
 *
 * 여기서 데이터를 바꾸지 않는다(읽기 전용).
 */
import type { DataSource } from 'typeorm';
import { resolveSupplierForUser } from '../middleware/supplier-context.resolver.js';

/** 서비스별 이용 상태 — 미가입 · 신청 중 · 승인·이용 중 · 반려 · 정지 · 탈퇴 */
export type NetureServiceUsageStatus = 'none' | 'pending' | 'active' | 'rejected' | 'suspended' | 'withdrawn';
export type NetureServiceStateSource = 'neture_suppliers' | 'service_memberships' | 'none';

export interface NetureServiceState {
  status: NetureServiceUsageStatus;
  /** 상태의 출처 테이블 — 화면 표시용이 아니라 진단 · 테스트 근거 */
  source: NetureServiceStateSource;
}

export interface NetureServiceStates {
  supplier: NetureServiceState;
  /** Neture 가입 승인 상태 (메인 AI · 연결 서비스 신청 자격) — 연결 서비스 상태와 별개 */
  netureMain: NetureServiceState;
}

const NONE: NetureServiceState = { status: 'none', source: 'none' };

/** neture_suppliers.status (대문자 enum) → 이용 상태 */
export function mapSupplierRowStatus(raw: string | null | undefined): NetureServiceUsageStatus {
  switch (String(raw ?? '').toUpperCase()) {
    case 'ACTIVE':
      return 'active';
    case 'PENDING':
      return 'pending';
    case 'REJECTED':
      return 'rejected';
    case 'INACTIVE':
    case 'SUSPENDED':
      return 'suspended';
    default:
      return 'none';
  }
}

/** service_memberships.status → 이용 상태 (Neture 가입 상태) */
function mapMembershipStatus(raw: string | null | undefined): NetureServiceUsageStatus {
  switch (String(raw ?? '').toLowerCase()) {
    case 'active':
      return 'active';
    case 'pending':
      return 'pending';
    case 'rejected':
      return 'rejected';
    case 'suspended':
      return 'suspended';
    case 'withdrawn':
      return 'withdrawn';
    default:
      return 'none';
  }
}

/** N 개 후보 → 하나의 이용 상태 (임의 선택이 아니라 결정적 합성) */
const STATUS_PRIORITY: NetureServiceUsageStatus[] = ['active', 'pending', 'suspended', 'rejected'];
export function mergeCandidateStatuses(raw: string[]): NetureServiceUsageStatus {
  const mapped = raw.map(mapSupplierRowStatus);
  return STATUS_PRIORITY.find((s) => mapped.includes(s)) ?? 'none';
}

/**
 * 요청자 본인의 공급자 서비스 상태를 해석한다.
 * 조회 실패는 삼키지 않고 던진다 — 호출부가 "미가입" 으로 오인하지 않도록.
 */
export async function resolveNetureServiceStates(
  dataSource: DataSource,
  userId: string,
): Promise<NetureServiceStates> {
  if (!userId) return { supplier: NONE, netureMain: NONE };

  const [resolution, membershipRows] = await Promise.all([
    resolveSupplierForUser(dataSource, userId, null),
    dataSource.query(
      `SELECT status FROM service_memberships WHERE user_id = $1 AND service_key = 'neture' LIMIT 1`,
      [userId],
    ) as Promise<Array<{ status: string }>>,
  ]);

  const membership = membershipRows[0];
  const netureMain: NetureServiceState = membership
    ? { status: mapMembershipStatus(membership.status), source: 'service_memberships' }
    : NONE;

  let supplier: NetureServiceState = NONE;
  if (resolution.kind === 'resolved') {
    supplier = { status: mapSupplierRowStatus(resolution.status), source: 'neture_suppliers' };
  } else if (resolution.kind === 'context_required') {
    supplier = { status: mergeCandidateStatuses(resolution.candidates.map((c) => c.status)), source: 'neture_suppliers' };
  }

  return { supplier, netureMain };
}
