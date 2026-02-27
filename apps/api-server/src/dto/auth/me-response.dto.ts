/**
 * R-4-1: /me Endpoint Response DTO
 *
 * Standard response structure for user identity endpoint.
 * Frontend MUST use only this structure (specifically `assignments` array)
 * for role-based logic.
 *
 * Legacy fields (role, roles, dbRoles, activeRole, permissions, businessInfo)
 * are intentionally excluded from this response.
 */

/**
 * Role Assignment DTO for /me response
 */
export interface RoleAssignmentDto {
  /** Assignment ID */
  id: string;

  /** Role name */
  role: 'super_admin' | 'admin' | 'operator' | 'manager' | 'vendor' | 'seller' | 'supplier' | 'partner' | 'affiliate' | 'business' | 'user' | 'customer';

  /** Whether this assignment is currently active */
  isActive: boolean;

  /** When this assignment becomes valid (ISO timestamp) */
  validFrom: string | null;

  /** When this assignment expires (ISO timestamp, null = indefinite) */
  validUntil: string | null;

  /** When this assignment was created (ISO timestamp) */
  assignedAt?: string;
}

/**
 * Standard /me response structure
 *
 * @example
 * {
 *   "id": "user-uuid",
 *   "email": "user@example.com",
 *   "name": "홍길동",
 *   "status": "active",
 *   "assignments": [
 *     {
 *       "id": "assign-uuid",
 *       "role": "customer",
 *       "isActive": true,
 *       "validFrom": null,
 *       "validUntil": null
 *     }
 *   ]
 * }
 */
export interface MeResponseDto {
  /** User ID (UUID) */
  id: string;

  /** User email */
  email: string;

  /** User display name */
  name: string | null;

  /** Account status */
  status: 'pending' | 'active' | 'approved' | 'rejected' | 'suspended' | 'inactive';

  /**
   * Active role assignments
   *
   * Frontend should use ONLY this array for role-based logic.
   * Check `isActive: true` entries to determine user's current roles.
   */
  assignments: RoleAssignmentDto[];

  /** Avatar URL (optional) */
  avatar?: string | null;

  /** Account creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;

  /**
   * Optional metadata for future extensibility
   *
   * Can include: phone, address, preferences, etc.
   * Keep this minimal to avoid bloating the response.
   */
  metadata?: Record<string, any>;
}

/**
 * Map User entity and RoleAssignment entities to MeResponseDto
 *
 * This is the single source of truth for /me response serialization.
 * When User entity is refactored (R-4-2), only this function needs to change.
 *
 * @param user - User entity from database
 * @param assignments - RoleAssignment entities for this user
 * @returns Standardized /me response
 */
export function mapUserToMeResponse(
  user: {
    id: string;
    email: string;
    name?: string | null;
    status: string;
    avatar?: string | null;
    createdAt?: Date | null;
    updatedAt?: Date | null;
  },
  assignments: Array<{
    id: string;
    role: string;
    isActive: boolean;
    validFrom?: Date | null;
    validUntil?: Date | null;
    assignedAt?: Date | null;
  }>
): MeResponseDto {
  const now = new Date().toISOString();
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    status: user.status as any,
    assignments: assignments.map(a => ({
      id: a.id,
      role: a.role as any,
      isActive: a.isActive,
      validFrom: a.validFrom?.toISOString() ?? null,
      validUntil: a.validUntil?.toISOString() ?? null,
      assignedAt: a.assignedAt?.toISOString(),
    })),
    avatar: user.avatar ?? null,
    createdAt: user.createdAt?.toISOString() ?? now,
    updatedAt: user.updatedAt?.toISOString() ?? now,
  };
}
