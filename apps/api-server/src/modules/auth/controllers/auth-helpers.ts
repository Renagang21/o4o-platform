/**
 * Auth Controller Shared Helpers
 *
 * Pure functions extracted from auth.controller.ts for reuse
 * across auth-login, auth-session, and auth-account controllers.
 */
import { Request } from 'express';
import { AppDataSource } from '../../../database/connection.js';
import { isStoreOwner as isStoreOwnerSsot } from '../../../utils/store-owner.utils.js';
/**
 * Check if request is cross-origin.
 * Cross-origin requests need tokens in response body since cookies won't work.
 *
 * Same base domain subdomains (e.g., admin.neture.co.kr + api.neture.co.kr)
 * are NOT considered cross-origin since cookies with domain .neture.co.kr will work.
 */
export function isCrossOriginRequest(req: Request): boolean {
  const origin = req.get('origin');
  if (!origin) return false;

  try {
    const originHost = new URL(origin).hostname;
    const apiHost = req.get('host')?.split(':')[0] || '';

    // Extract base domain (e.g., neture.co.kr from admin.neture.co.kr)
    const getBaseDomain = (hostname: string) => {
      const parts = hostname.split('.');
      // For domains with two-part TLDs like .co.kr, .com.au, etc.
      if (parts.length >= 3 && ['co', 'com', 'net', 'org', 'ac', 'go'].includes(parts[parts.length - 2])) {
        return parts.slice(-3).join('.');
      }
      // For simple TLDs like .com, .kr, .site
      return parts.slice(-2).join('.');
    };

    const originBaseDomain = getBaseDomain(originHost);
    const apiBaseDomain = getBaseDomain(apiHost);

    // Same base domain = NOT cross-origin (cookies with .domain will work)
    // Different base domain = cross-origin (need tokens in body)
    return originBaseDomain !== apiBaseDomain;
  } catch {
    return false;
  }
}

/**
 * WO-ROLE-NORMALIZATION-PHASE3-B-V1
 * organization_members + kpa_pharmacist_profiles에서 약사 자격 derive.
 * users.pharmacist_role / pharmacist_function 컬럼 제거 후 대체 로직.
 */
export async function derivePharmacistQualification(userId: string): Promise<{
  pharmacistRole: string | null;
  pharmacistFunction: string | null;
  isStoreOwner: boolean;
}> {
  // WO-O4O-STORE-OWNER-LEGACY-CLEANUP-V1
  // role_assignments는 store_owner 판단의 단일 소스다.
  //
  // WO-O4O-CROSSSERVICE-IDENTITY-RBAC-MEMBERSHIP-FINAL-AUDIT-AND-CLOSURE-V1:
  //   여기서 role 목록을 직접 나열하던 것을 store-owner SSOT(isStoreOwner)로 위임한다.
  //   직접 나열은 두 가지 결함을 갖고 있었다.
  //     1) membership 을 보지 않았다 — 정지된 회원도 매장 경영자 자격이 계속 참으로 나왔다
  //        (선행 WO ...SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1 §10-1 잔여 3계열 중 마지막).
  //     2) 'pharmacy-hub:store_owner' 가 누락돼 있었다 — 약국 HUB 경영자만 자격이 거짓이었다.
  //   isStoreOwner() 는 active membership 을 DB 로 먼저 확인한 뒤 role 을 보므로 두 결함이
  //   동시에 닫히고, 서비스별 role 목록도 한 곳(STORE_OWNER_ROLES_BY_SERVICE)만 남는다.
  //   serviceKey 미지정(back-compat) 형태를 쓰는 이유: 이 헬퍼는 특정 서비스가 아니라
  //   **계정 전역의 약사 자격**을 계산한다.
  const storeOwnerCheck = await isStoreOwnerSsot(AppDataSource, userId);
  const isStoreOwner = storeOwnerCheck.isOwner;

  const [profile] = await AppDataSource.query(
    `SELECT activity_type FROM kpa_pharmacist_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );

  const pharmacistFunction: string | null = profile?.activity_type || null;

  let pharmacistRole: string | null = null;
  if (isStoreOwner) {
    pharmacistRole = 'pharmacy_owner';
  } else if (profile?.activity_type) {
    pharmacistRole = 'general';
  }

  return { pharmacistRole, pharmacistFunction, isStoreOwner };
}

/**
 * WO-KPA-A-RBAC-PROFILE-NORMALIZATION-V1
 * kpa_student_profiles에서 약대생 자격 derive.
 * kpa_members.university_name / student_year 대체 로직.
 */
export async function deriveStudentQualification(userId: string): Promise<{
  universityName: string | null;
  studentYear: number | null;
  enrollmentStatus: string | null;
}> {
  const [profile] = await AppDataSource.query(
    `SELECT university_name, student_year, enrollment_status
     FROM kpa_student_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );

  if (!profile) {
    return { universityName: null, studentYear: null, enrollmentStatus: null };
  }

  return {
    universityName: profile.university_name || null,
    studentYear: profile.student_year || null,
    enrollmentStatus: profile.enrollment_status || null,
  };
}

/**
 * WO-KPA-B-SERVICE-CONTEXT-UNIFICATION-V1
 * KPA 회원 + 조직 소속 정보를 단일 컨텍스트로 derive.
 * /auth/me 응답에 kpaMembership 필드로 포함.
 */
export interface KpaMembershipContext {
  status: string | null;           // kpa_members.status
  role: string | null;             // kpa_members.role
  membershipType: string | null;   // kpa_members.membership_type (pharmacist | student)
  organizationId: string | null;   // kpa_members.organization_id
  organizationName: string | null;
  organizationType: string | null;
  organizationRole: string | null; // organization_members.role (있는 경우)
  serviceAccess: 'full' | 'community-only' | 'pending' | 'blocked' | null;
}

export async function deriveKpaMembershipContext(userId: string): Promise<KpaMembershipContext | null> {
  // 1. kpa_members 조회
  const [member] = await AppDataSource.query(
    `SELECT m.status, m.role, m.membership_type, m.organization_id,
            o.name AS org_name, o.type AS org_type
     FROM kpa_members m
     LEFT JOIN organizations o ON o.id = m.organization_id
     WHERE m.user_id = $1
     LIMIT 1`,
    [userId]
  );

  if (!member) return null;

  // 2. organization_members 조회 (활성 소속, table may not exist)
  let orgMember = null;
  try {
    const [row] = await AppDataSource.query(
      // WO-O4O-STORE-OWNER-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1:
      // organizationRole 표시값이 요청마다 달라지지 않도록 선택을 결정적으로 고정한다.
      `SELECT role FROM organization_members
       WHERE user_id = $1 AND left_at IS NULL
       ORDER BY is_primary DESC NULLS LAST, joined_at ASC, organization_id ASC
       LIMIT 1`,
      [userId]
    );
    orgMember = row || null;
  } catch { /* table may not exist */ }

  // 3. serviceAccess 매트릭스 계산
  let serviceAccess: KpaMembershipContext['serviceAccess'] = null;
  if (member.status === 'pending') {
    serviceAccess = 'pending';
  } else if (member.status === 'suspended' || member.status === 'withdrawn') {
    serviceAccess = 'blocked';
  } else if (member.status === 'active') {
    serviceAccess = orgMember ? 'full' : 'community-only';
  }

  return {
    status: member.status,
    role: member.role,
    membershipType: member.membership_type || null,
    organizationId: member.organization_id || null,
    organizationName: member.org_name || null,
    organizationType: member.org_type || null,
    organizationRole: orgMember?.role || null,
    serviceAccess,
  };
}

