/**
 * Auth Context Type
 *
 * WO-O4O-AUTH-CONTEXT-UNIFICATION-V1
 *
 * 통합 인증 컨텍스트. 미들웨어에서 req.authContext에 주입.
 */

export interface AuthContext {
  userId: string;
  organizationId: string;
  memberRole: string;   // organization_members.role (owner/admin/manager)
  roles: string[];      // JWT roles (from role_assignments)
  serviceKey?: string;  // Future: 서비스 키
}
