/**
 * Auth Controller Shared Helpers
 *
 * Pure functions extracted from auth.controller.ts for reuse
 * across auth-login, auth-session, and auth-account controllers.
 */
import { Request } from 'express';
import { AppDataSource } from '../../../database/connection.js';
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
  // 1. Check organization_members for owner status (table may not exist in production)
  let isStoreOwner = false;
  try {
    const [ownerRecord] = await AppDataSource.query(
      `SELECT 1 FROM organization_members WHERE user_id = $1 AND role = 'owner' AND left_at IS NULL LIMIT 1`,
      [userId]
    );
    isStoreOwner = !!ownerRecord;
  } catch { /* table may not exist */ }

  // 2. Query kpa_pharmacist_profiles for activity_type
  const [profile] = await AppDataSource.query(
    `SELECT activity_type FROM kpa_pharmacist_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );

  // 3. Derive pharmacistRole (backward compatible)
  // WO-O4O-KPA-A-ACTIVITY-TYPE-NORMALIZATION-V1:
  //   isStoreOwner → 'pharmacy_owner', otherwise activityType 기반 단순 분기
  let pharmacistRole: string | null = null;
  if (isStoreOwner) {
    pharmacistRole = 'pharmacy_owner';
  } else if (profile?.activity_type) {
    if (profile.activity_type === 'pharmacy_owner') {
      pharmacistRole = 'pharmacy_owner';
      isStoreOwner = true;
    } else {
      pharmacistRole = 'general';
    }
  }

  // 4. pharmacistFunction = activityType 직통 (SSOT 정합성)
  // WO-O4O-KPA-A-ACTIVITY-TYPE-NORMALIZATION-V1:
  //   기존 lossy mapping 제거 (manufacturer→industry 등 불일치 해소)
  //   activityType이 유일한 기준, pharmacistFunction은 API 호환 필드
  const pharmacistFunction: string | null = profile?.activity_type || null;

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
      `SELECT role FROM organization_members
       WHERE user_id = $1 AND left_at IS NULL
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

