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
 * legacy fallback (행이 없을 때만): `service_memberships(neture)` 의 `role` 이 supplier 이면
 * 그 가입 신청 상태를 서비스 상태로 본다 — 승인 전(pending · rejected) 회원은 아직 서비스 행이
 * 없기 때문이다. 승인 시점에는 서비스 행이 만들어지므로(operator-registration.service) 이후로는
 * 서비스 행이 우선한다. 서버 guard(neture-identity.middleware) 도 같은 테이블을 본다.
 *
 * 여기서 데이터를 바꾸지 않는다(읽기 전용).
 */
import type { DataSource } from 'typeorm';

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

/** service_memberships.status → 이용 상태 (legacy fallback 전용) */
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

/**
 * 요청자 본인의 공급자 서비스 상태를 해석한다.
 * 조회 실패는 삼키지 않고 던진다 — 호출부가 "미가입" 으로 오인하지 않도록.
 */
export async function resolveNetureServiceStates(
  dataSource: DataSource,
  userId: string,
): Promise<NetureServiceStates> {
  if (!userId) return { supplier: NONE };

  const [supplierRows, membershipRows] = await Promise.all([
    dataSource.query(`SELECT status FROM neture_suppliers WHERE user_id = $1 LIMIT 1`, [userId]) as Promise<
      Array<{ status: string }>
    >,
    dataSource.query(
      `SELECT role, status FROM service_memberships WHERE user_id = $1 AND service_key = 'neture' LIMIT 1`,
      [userId],
    ) as Promise<Array<{ role: string | null; status: string }>>,
  ]);

  const membership = membershipRows[0];
  const membershipRole = String(membership?.role ?? '').toLowerCase();

  let supplier: NetureServiceState = NONE;
  if (supplierRows[0]) {
    supplier = { status: mapSupplierRowStatus(supplierRows[0].status), source: 'neture_suppliers' };
  } else if (membership && membershipRole === 'supplier') {
    supplier = { status: mapMembershipStatus(membership.status), source: 'service_memberships' };
  }

  return { supplier };
}
