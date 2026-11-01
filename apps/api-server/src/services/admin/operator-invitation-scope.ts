import { ADMIN_OPERATIONS_INVITATION_SCOPE } from './admin-operations-operator-contract.js';
import type { EntityManager } from "typeorm";
import {
  CENTRAL_DELEGATION_SCOPE,
  resolvePlatformInvitationRole,
  OperatorRoleContractError,
} from "../../config/operator-role-catalog.js";
import { roleAssignmentService } from "../../modules/auth/services/role-assignment.service.js";
import { ensureServiceMembershipsForRoles } from "./service-membership-ensure.js";
import {
  ServiceOperatorManagementService,
  delegationScope,
} from "./service-operator-management.service.js";
import { CooperativeManagementService } from "../../modules/neture-pharmacy/services/cooperative-management.service.js";
import { BranchOperatorDesignationService } from "../kpa-branch/branch-operator-designation.service.js";

export type InvitationScope = {
  scope_type: "platform" | "service" | "branch" | "cooperative";
  scope_key: string;
  role: string;
  service_key: string;
};
export function invitationScope(
  kind: InvitationScope["scope_type"] = "platform",
  key = "",
  role: string,
  service: string,
): InvitationScope {
  if (kind === "platform") {
    if (key !== '' && key !== CENTRAL_DELEGATION_SCOPE && key !== ADMIN_OPERATIONS_INVITATION_SCOPE) throw new Error('INVALID_INVITATION_SCOPE');
    const r = resolvePlatformInvitationRole(role, service, key);
    return {
      scope_type: kind,
      scope_key: key,
      role: r.role,
      service_key: r.serviceKey,
    };
  }
  if (kind === "service") {
    const s = delegationScope(key);
    if (role !== s.operatorRole || service !== s.membershipKey)
      throw new OperatorRoleContractError(
        "SERVICE_KEY_MISMATCH",
        "서비스와 역할 범위를 확인하세요.",
      );
    return {
      scope_type: kind,
      scope_key: key,
      role: s.operatorRole,
      service_key: s.membershipKey,
    };
  }
  if (!/^[0-9a-f-]{36}$/i.test(key))
    throw new Error("INVALID_INVITATION_SCOPE");
  if (kind === "branch" && role === "kpa-branch:operator")
    return {
      scope_type: kind,
      scope_key: key,
      role,
      service_key: "kpa-branch",
    };
  if (
    kind === "cooperative" &&
    ["cooperative:admin", "cooperative:operator"].includes(role)
  )
    return { scope_type: kind, scope_key: key, role, service_key: "neture" };
  throw new Error("INVALID_INVITATION_SCOPE");
}
export async function authorizeInvitation(
  m: EntityManager,
  scope: InvitationScope,
  actor: string,
  target?: string,
  cancelling = false,
) {
  if (scope.scope_type === "platform") {
    if (!cancelling) resolvePlatformInvitationRole(scope.role, scope.service_key, scope.scope_key);
    const rows = await m.query(
      `SELECT u.id FROM users u JOIN role_assignments ra ON ra.user_id=u.id
      WHERE u.id=$1 AND u."isActive"=true AND u."isEmailVerified"=true AND u.status IN ('active','approved')
      AND ra.role='platform:super_admin' AND ra.is_active=true AND (ra.valid_from IS NULL OR ra.valid_from<=now())
      AND (ra.valid_until IS NULL OR ra.valid_until>=now()) FOR SHARE OF u,ra`,
      [actor],
    );
    if (!rows.length) throw new Error("INVITATION_ACTOR_FORBIDDEN");
  } else if (scope.scope_type === "service") {
    const s = new ServiceOperatorManagementService(m.connection);
    await s.validateInvitationGrant(m, actor, scope.scope_key, target);
  } else if (scope.scope_type === "branch") {
    await new BranchOperatorDesignationService(m).validateInvitationGrant(
      actor,
      scope.scope_key,
      target,
    );
  } else {
    await new CooperativeManagementService(
      m.connection,
    ).validateInvitationGrant(
      m,
      actor,
      scope.scope_key,
      scope.role.slice("cooperative:".length),
      target,
    );
  }
}
export async function activateInvitation(
  m: EntityManager,
  scope: InvitationScope,
  actor: string,
  target: string,
) {
  await authorizeInvitation(m, scope, actor, target);
  if (scope.scope_type === "cooperative") {
    return new CooperativeManagementService(m.connection).activateInvitation(
      m,
      actor,
      scope.scope_key,
      target,
      scope.role.slice("cooperative:".length),
    );
  }
  await roleAssignmentService.assignRole(
    { userId: target, role: scope.role, assignedBy: actor,
      scopeType: scope.scope_type === 'platform' && scope.scope_key === CENTRAL_DELEGATION_SCOPE ? CENTRAL_DELEGATION_SCOPE : 'global' },
    m,
  );
  if (scope.scope_type === "platform")
    return ensureServiceMembershipsForRoles(target, [scope.role], m);
}

export function scopeForInvitationList(
  kind: InvitationScope["scope_type"],
  key: string,
  level: string,
) {
  if (kind === "service") {
    const s = delegationScope(key);
    return invitationScope(kind, key, s.operatorRole, s.membershipKey);
  }
  return invitationScope(
    kind,
    key,
    kind === "branch" ? "kpa-branch:operator" : `cooperative:${level}`,
    kind === "branch" ? "kpa-branch" : "neture",
  );
}
