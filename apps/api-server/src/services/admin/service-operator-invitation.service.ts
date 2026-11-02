import { ADMIN_OPERATIONS_OPERATOR_MENUS, isAdminOperationsInvitation, validateAdminOperationsMenus } from './admin-operations-operator-contract.js';
import { assertOperationsTarget, activateOperationsOperator } from './admin-operations-operators.js';
import { centralMenusForRole } from '@o4o/types';
import { validateCentralMenuKeys } from './central-operation-menu-grants.js';
import { resolvePlatformInvitationRole, CENTRAL_DELEGATION_SCOPE } from "../../config/operator-role-catalog.js";
import { buildOperatorInvitationMail, invitationScopeLabel } from './operator-invitation-mail.js';
import { ServiceOperatorInvitationError } from "./operator-invitation-error.js";
import {
  retainOperatorInvitations,
  invitationReturningRows,
} from "./operator-invitation-retention.js";
import {
  scopeForInvitationList,
  invitationScope,
  authorizeInvitation,
  activateInvitation,
  type InvitationScope,
} from "./operator-invitation-scope.js";
import { lockOperatorAssignments } from "../../modules/auth/services/operator-assignment-lock.js";
import { recordOperation } from "../operations/operation-audit.js";
import { isLoginEmailShapeValid, normalizeLoginEmail } from "@o4o/auth-utils";
import { createHash, randomBytes } from "node:crypto";
import type { DataSource, EntityManager } from "typeorm";
import { AppDataSource } from "../../database/connection.js";
import type { User } from "../../modules/auth/entities/User.js";
import { getServiceOrigin } from "../../config/service-catalog.js";
import { demoAccountService } from "../auth/demo-account.service.js";
import logger from "../../utils/logger.js";
import { invalidateRoles } from "../../modules/auth/utils/role-cache.js";

export { ServiceOperatorInvitationError } from "./operator-invitation-error.js";
export type OperatorInvite = {
  id: string;
  invited_email: string | null;
  service_key: string;
  role: string;
  target_user_id: string | null;
  purpose: "assignment" | "confirmation" | "revocation";
  status: "pending" | "accepted" | "cancelled" | "expired" | "revoked";
  scope_type: InvitationScope["scope_type"];
  scope_key: string;
  expires_at: Date;
  accepted_user_id: string | null;
  invited_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
  accepted_at: Date | null;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const fail = (code: string, status = 409): never => {
  throw new ServiceOperatorInvitationError(code, status);
};
const duplicateScopePredicate = (workspace: boolean) => workspace
  ? 'scope_type=$6 AND scope_key=$7'
  : "(($6 IN ('platform','service') AND scope_type IN ('platform','service')) OR (scope_type=$6 AND scope_key=$7))";
const COLUMNS =
  "id,scope_type,scope_key,invited_email,service_key,role,target_user_id,purpose,status,expires_at,accepted_user_id,invited_by_user_id,created_at,updated_at,accepted_at";
export type InvitationMailer = (
  to: string,
  url: string,
  role: string,
  confirmation: boolean,
  centralDelegation?: boolean,
  adminOperations?: boolean,
) => Promise<boolean>;

async function defaultMailer(
  to: string,
  url: string,
  role: string,
  confirmation: boolean,
  centralDelegation = false,
  adminOperations = false,
): Promise<boolean> {
  const { emailService } = await import("../email.service.js");
  const result = await emailService.sendEmail({
    to,
    ephemeral: true,
    ...buildOperatorInvitationMail(url, role, confirmation, centralDelegation, adminOperations),
  });
  if (result.success) logger.info("[OperatorInvitation] SMTP accepted invitation mail");
  else logger.warn("[OperatorInvitation] Invitation mail delivery not confirmed");
  return result.success;
}

export type InviteInput = {
  menuKeys?: unknown;
  email?: string;
  targetUserId?: string;
  serviceKey: string;
  role: string;
  actorId: string;
  scopeType?: InvitationScope["scope_type"];
  scopeKey?: string;
};
export type PreparedInvitation = { invite: OperatorInvite; url: string };
/** All authority and target eligibility are checked again inside the acceptance transaction. */
export class ServiceOperatorInvitationService {
  constructor(
    private readonly db: Pick<
      DataSource,
      "transaction" | "query"
    > = AppDataSource,
    private readonly sendMail: InvitationMailer = defaultMailer,
    private readonly now = () => new Date(),
  ) {}

  private async expire(tokenHash?: string, id?: string) {
    await this.db.transaction(async (m) => {
      if (tokenHash || id)
        await m.query(
          `UPDATE service_operator_invitations SET status='expired',invited_email=NULL,token_hash=NULL,updated_at=$2
        WHERE ${tokenHash ? "token_hash" : "id"}=$1 AND status='pending' AND expires_at<=$2`,
          [tokenHash ?? id, this.now()],
        );
      await retainOperatorInvitations(m, this.now());
    });
  }
  async list(
    actorId: string,
  ): Promise<Array<OperatorInvite & { expired: boolean }>> {
    return this.db.transaction(async (m) => {
      await this.authority(
        m,
        {
          scope_type: "platform",
          scope_key: "",
          role: "lecture:admin",
          service_key: "lecture",
        },
        actorId,
      );
      const safeColumns = COLUMNS.replace(
        "invited_email",
        "CASE WHEN status='pending' AND expires_at<=now() THEN NULL ELSE invited_email END AS invited_email",
      );
      return m.query(`SELECT ${safeColumns},(status='pending' AND expires_at<=now()) AS expired
        FROM service_operator_invitations ORDER BY created_at DESC LIMIT 200`);
    });
  }
  private scope(invite: OperatorInvite, cancelling = false): InvitationScope {
    // Historical platform roles may be retired. A live root Admin may close the invitation,
    // but accepting/resending still resolves the current role contract.
    if (cancelling && invite.scope_type === 'platform') return {
      scope_type:'platform',scope_key:invite.scope_key,role:invite.role,service_key:invite.service_key,
    };
    const s = invitationScope(
      invite.scope_type ?? "platform",
      invite.scope_key ?? "",
      invite.role,
      invite.service_key,
    );
    if (s.role !== invite.role || s.service_key !== invite.service_key)
      fail("INVITATION_SCOPE_CHANGED");
    return s;
  }
  private async authority(
    m: EntityManager,
    scope: InvitationScope,
    actor: string,
    target?: string,
    cancelling = false,
  ) {
    if (!UUID.test(actor)) fail("FORBIDDEN", 403);
    try {
      await authorizeInvitation(m, scope, actor, target, cancelling);
    } catch (e) {
      if (e instanceof Error && e.message === "INVITATION_ACTOR_FORBIDDEN")
        fail("FORBIDDEN", 403);
      throw e;
    }
  }
  private async target(
    m: EntityManager,
    id: string,
  ): Promise<User> {
    if (!UUID.test(id)) fail("INVALID_USER_ID", 400);
    const [user]: User[] = await m.query(
      'SELECT id,email,status,"isActive","isEmailVerified" FROM users WHERE id=$1 FOR SHARE',
      [id],
    );
    if (!user) fail("USER_NOT_FOUND", 404);
    if (
      !user.isActive ||
      !user.isEmailVerified ||
      !["active", "approved"].includes(user.status)
    )
      fail("ACCOUNT_INACTIVE", 403);
    await demoAccountService.assertNotDemoAccount(id, m);
    return user;
  }
  private async requireUnassignedRole(
    m: EntityManager,
    scope: InvitationScope,
    target: string,
  ) {
    if (scope.scope_type === "cooperative") return; // Cooperative-specific writer validates its own scoped role rows.
    const [prior] = await m.query(
      `SELECT scope_id,scope_type,(valid_until IS NOT NULL) AS scheduled_end,is_active,(valid_from>now()) AS starts_later,(valid_until<now()) AS ended FROM role_assignments
      WHERE user_id=$1 AND role=$2 ORDER BY is_active DESC,assigned_at DESC,id DESC LIMIT 1 FOR SHARE`,
      [target, scope.role],
    );
    if (scope.scope_key === CENTRAL_DELEGATION_SCOPE && prior?.scope_id) fail('OPERATOR_ROLE_SCOPE_REVIEW_REQUIRED');
    if (prior && (prior.starts_later || prior.ended || scope.scope_key === CENTRAL_DELEGATION_SCOPE && prior.scheduled_end))
      fail("OPERATOR_ROLE_SCHEDULE_REVIEW_REQUIRED");
    if (prior?.is_active && !(scope.scope_type === 'platform' && scope.scope_key === CENTRAL_DELEGATION_SCOPE && prior.scope_type !== CENTRAL_DELEGATION_SCOPE)) fail("OPERATOR_ALREADY_ACTIVE");
  }
  async create(input: InviteInput): Promise<OperatorInvite> {
    // Validate the catalog before touching a transaction.
    if (!input.scopeType || input.scopeType === "platform") resolvePlatformInvitationRole(input.role, input.serviceKey, input.scopeKey);
    invitationScope(
      input.scopeType,
      input.scopeKey,
      input.role,
      input.serviceKey,
    );
    await this.expire();
    const p = await this.db.transaction((m) => this.prepare(m, input));
    return this.deliver(p);
  }
  /** For a branch approval's existing transaction. Deliver only after that outer transaction commits. */
  async prepare(
    m: EntityManager,
    input: InviteInput,
  ): Promise<PreparedInvitation> {
    if (!input.scopeType || input.scopeType === "platform") resolvePlatformInvitationRole(input.role, input.serviceKey, input.scopeKey);
    const scope = invitationScope(
      input.scopeType,
      input.scopeKey,
      input.role,
      input.serviceKey,
    );
    const workspace = isAdminOperationsInvitation(scope);
    const central = workspace || scope.scope_type === 'platform' && scope.scope_key === CENTRAL_DELEGATION_SCOPE;
    if (workspace && input.menuKeys !== undefined) fail('OPERATIONS_INVITATION_REFRESH_REQUIRED', 400);
    if (!central && input.menuKeys !== undefined) fail('INVALID_INVITATION_INPUT', 400);
    const menuKeys = workspace ? ADMIN_OPERATIONS_OPERATOR_MENUS.map(menu => menu.key) : central ? validateCentralMenuKeys(scope.role, input.menuKeys ?? centralMenusForRole(scope.role).map(menu => menu.key)) : null;
    // Target lock precedes every role/cooperative mutation, including acceptance and revocation.
    if (input.targetUserId)
      await lockOperatorAssignments(m, input.targetUserId);
    await this.authority(m, scope, input.actorId, input.targetUserId);
    const user = input.targetUserId
      ? await this.target(m, input.targetUserId)
      : null;
    const email = normalizeLoginEmail(user?.email ?? input.email);
    if (!isLoginEmailShapeValid(email)) fail("INVALID_EMAIL", 400);
    if (
      !user &&
      (
        await m.query("SELECT id FROM users WHERE lower(email)=$1 LIMIT 1", [
          email,
        ])
      ).length
    )
      fail("USER_SELECTION_REQUIRED");
    if (user) {
      if (workspace) await assertOperationsTarget(m, user.id);
      else await this.requireUnassignedRole(m, scope, user.id);
    }
    await m.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      hash(
        `${email}:${scope.service_key}:${scope.role}:${scope.scope_type}:${scope.scope_key}`,
      ),
    ]);
    await m.query(
      `UPDATE service_operator_invitations SET status='expired',invited_email=NULL,token_hash=NULL,updated_at=$4
      WHERE lower(invited_email)=$1 AND service_key=$2 AND role=$3 AND status='pending' AND expires_at<=$4 AND scope_type=$5 AND scope_key=$6`,
      [
        email,
        scope.service_key,
        scope.role,
        this.now(),
        scope.scope_type,
        scope.scope_key,
      ],
    );
    const pending = await m.query(
      `SELECT ${COLUMNS} FROM service_operator_invitations WHERE lower(invited_email)=$1
      AND service_key=$2 AND role=$3 AND scope_type=$4 AND scope_key=$5 AND status='pending' FOR UPDATE`,
      [email, scope.service_key, scope.role, scope.scope_type, scope.scope_key],
    );
    if (pending.length) {
      const prior = pending[0] as OperatorInvite;
      // Same permission and same selected account only. Never rebind another pending invitation.
      if ((prior.target_user_id ?? null) !== (user?.id ?? null)) fail("INVITATION_ACCOUNT_MISMATCH", 403);
      const rotated = await this.rotate(m, prior, input.actorId);
      if (menuKeys !== null) await this.saveInvitationMenus(m, prior.id, menuKeys, workspace);
      return rotated;
    }
    const token = randomBytes(32).toString("hex"),
      now = this.now(),
      expires = new Date(now.getTime() + 7 * 86400_000);
    const [invite]: OperatorInvite[] = await m.query(
      `INSERT INTO service_operator_invitations
      (invited_email,service_key,role,target_user_id,purpose,invited_by_user_id,token_hash,expires_at,scope_type,scope_key,created_at,updated_at)
      VALUES($1,$2,$3,$4,'assignment',$5,$6,$7,$8,$9,$10,$10) RETURNING ${COLUMNS}`,
      [
        email,
        scope.service_key,
        scope.role,
        user?.id ?? null,
        input.actorId,
        hash(token),
        expires,
        scope.scope_type,
        scope.scope_key,
        now,
      ],
    );
    if (menuKeys !== null) await this.saveInvitationMenus(m, invite.id, menuKeys, workspace);
    return {
      invite,
      url: `${getServiceOrigin("neture")}/operator-invite#token=${token}`,
    };
  }
  async deliver(p: PreparedInvitation): Promise<OperatorInvite> {
    let sent = false;
    try {
      sent = await this.sendMail(
        p.invite.invited_email!,
        p.url,
        p.invite.role,
        false,
        isAdminOperationsInvitation(p.invite) || p.invite.scope_type === 'platform' && p.invite.scope_key === CENTRAL_DELEGATION_SCOPE,
        ...(isAdminOperationsInvitation(p.invite) ? [true] as [boolean] : []),
      );
    } catch {
      /* Never log recipient/token/transport errors. */
    }
    if (!sent) fail("INVITATION_MAIL_FAILED", 503);
    return p.invite;
  }
  async listScoped(
    actor: string,
    kind: InvitationScope["scope_type"],
    key: string,
    role = "operator",
  ) {
    const dummy = scopeForInvitationList(kind, key, role);
    return this.db.transaction(async (m) => {
      await this.authority(m, dummy, actor);
      return m.query(
        `SELECT ${COLUMNS} FROM service_operator_invitations WHERE scope_type=$1 AND scope_key=$2
        AND status='pending' AND expires_at>$3 AND ($1<>'cooperative' OR role=$4) ORDER BY created_at DESC LIMIT 200`,
        [kind, key, this.now(), dummy.role],
      );
    });
  }
  async manage(
    id: string,
    actor: string,
    action: "resend" | "cancel",
  ): Promise<OperatorInvite> {
    if (!UUID.test(id)) fail("INVALID_INVITATION_ID", 400);
    await this.expire(undefined, id);
    const result = await this.db.transaction(async (m) => {
      const [pre]: OperatorInvite[] = await m.query(
        `SELECT ${COLUMNS} FROM service_operator_invitations WHERE id=$1`,
        [id],
      );
      if (!pre) fail("INVITATION_NOT_FOUND", 404);
      if (pre.target_user_id)
        await lockOperatorAssignments(m, pre.target_user_id);
      await this.authority(m, this.scope(pre, action === 'cancel'), actor, undefined, action === 'cancel');
      const [row]: OperatorInvite[] = await m.query(
        `SELECT ${COLUMNS} FROM service_operator_invitations WHERE id=$1 FOR UPDATE`,
        [id],
      );
      if (!row) fail("INVITATION_NOT_FOUND", 404);
      await this.authority(m, this.scope(row, action === 'cancel'), actor, undefined, action === 'cancel');
      if (row.status !== "pending" || new Date(row.expires_at) <= this.now())
        fail("INVITATION_NOT_PENDING");
      if (action === "cancel") {
        const [closed] = invitationReturningRows<OperatorInvite>(
          await m.query(
            `UPDATE service_operator_invitations SET status='cancelled',invited_email=NULL,token_hash=NULL,updated_at=$2 WHERE id=$1 RETURNING ${COLUMNS}`,
            [id, this.now()],
          ),
        );
        return { invite: closed, url: null };
      }
      if (row.target_user_id) {
        const user = await this.target(m, row.target_user_id);
        if (
          normalizeLoginEmail(user.email) !==
          normalizeLoginEmail(row.invited_email)
        )
          fail("INVITATION_ACCOUNT_MISMATCH", 403);
      }
      if (row.scope_type === "platform") resolvePlatformInvitationRole(row.role, row.service_key, row.scope_key);
      return this.rotate(m, row, actor);
    });
    return result.url
      ? this.deliver(result as PreparedInvitation)
      : result.invite;
  }
  private async rotate(m: EntityManager, row: OperatorInvite, actor: string): Promise<PreparedInvitation> {
    if (this.now().getTime() - new Date(row.updated_at).getTime() < 60_000)
      fail("INVITATION_RESEND_TOO_SOON", 429);
    const token = randomBytes(32).toString("hex");
    const [invite] = invitationReturningRows<OperatorInvite>(await m.query(
      `UPDATE service_operator_invitations SET token_hash=$2,invited_by_user_id=$3,updated_at=$4 WHERE id=$1 RETURNING ${COLUMNS}`,
      [row.id, hash(token), actor, this.now()],
    ));
    return { invite, url: `${getServiceOrigin("neture")}/operator-invite#token=${token}` };
  }
  private async prove(
    m: EntityManager,
    invite: OperatorInvite,
    userId: string,
  ) {
    if (invite.target_user_id && invite.target_user_id !== userId)
      fail("INVITATION_ACCOUNT_MISMATCH", 403);
    this.scope(invite); // Keep current scope validation on inspection as well as acceptance.
    const user = await this.target(m, userId);
    if (
      normalizeLoginEmail(user.email) !==
      normalizeLoginEmail(invite.invited_email)
    )
      fail("INVITATION_ACCOUNT_MISMATCH", 403);
    return user;
  }
  async inspect(
    token: string,
    userId: string,
  ): Promise<{
    serviceKey: string;
    role: string;
    purpose: string;
    scopeName?: string;
    centralDelegation?: boolean;
    adminOperations?: boolean;
    defaultDailyDuties?: boolean;
    menuKeys?: string[];
    menuLabels?: string[];
  }> {
    if (!/^[a-f0-9]{64}$/.test(token))
      fail("INVALID_OR_EXPIRED_INVITATION", 400);
    await this.expire(hash(token));
    return this.db.transaction(async (m) => {
      const [i]: OperatorInvite[] = await m.query(
        `SELECT ${COLUMNS} FROM service_operator_invitations WHERE token_hash=$1`,
        [hash(token)],
      );
      if (!i || i.status !== "pending" || new Date(i.expires_at) <= this.now())
        fail("INVALID_OR_EXPIRED_INVITATION", 400);
      await this.prove(m, i, userId);
      let scopeName: string | undefined = invitationScopeLabel(i.role, i.service_key);
      if (i.scope_type === "branch" || i.scope_type === "cooperative") {
        const table =
          i.scope_type === "branch" ? "kpa_organizations" : "cooperatives";
        const [context] = await m.query(
          `SELECT name FROM ${table} WHERE id=$1`,
          [i.scope_key],
        );
        scopeName = context?.name;
      }
      const workspace = isAdminOperationsInvitation(i);
      const central = workspace || i.scope_type === 'platform' && i.scope_key === CENTRAL_DELEGATION_SCOPE;
      const [grant] = central ? await m.query('SELECT menu_keys,admin_operations FROM central_operation_menu_grants WHERE invitation_id=$1', [i.id]) : [];
      if (workspace) validateAdminOperationsMenus(grant?.menu_keys);
      const menus = central ? (workspace ? ADMIN_OPERATIONS_OPERATOR_MENUS : centralMenusForRole(i.role)).filter(menu => !grant || grant.menu_keys.includes(menu.key)) : [];
      return {
        ...(central ? { menuKeys: menus.map(menu => menu.key), menuLabels: menus.map(menu => menu.label) } : {}),
        serviceKey: i.service_key,
        role: i.role,
        purpose: i.purpose,
        centralDelegation: central,
        ...(workspace ? { adminOperations: true, defaultDailyDuties: grant?.admin_operations === true } : {}),
        ...(scopeName ? { scopeName: workspace ? '관리자 사이트' : scopeName } : {}),
      };
    });
  }
  private async saveInvitationMenus(m: EntityManager, invitationId: string, keys: string[], workspace: boolean) {
    await m.query(`INSERT INTO central_operation_menu_grants(invitation_id,menu_keys,admin_operations) VALUES($1,$2,$3)
      ON CONFLICT(invitation_id) DO UPDATE SET menu_keys=$2,admin_operations=$3,updated_at=clock_timestamp()`, [invitationId, keys, workspace]);
  }
  private async recordAcceptedAssignment(m: EntityManager, invite: OperatorInvite, userId: string, menuKeys?: string[]) {
    if (isAdminOperationsInvitation(invite)) return; // Per-role workspace audit is already recorded by the role activation helper.
    await recordOperation(m, invite.service_key, invite.invited_by_user_id, 'admin.service_operator_assigned',
      { scope: invite.scope_key, targetUserId: userId, role: invite.role, ...(menuKeys ? { menuKeys } : {}) });
  }
  async accept(
    token: string,
    userId: string,
  ): Promise<{
    serviceKey: string;
    role: string;
    purpose: string;
    membershipPolicy?: string;
    membershipStatuses?: Record<string, string>;
  }> {
    if (!/^[a-f0-9]{64}$/.test(token))
      fail("INVALID_OR_EXPIRED_INVITATION", 400);
    await this.expire(hash(token));
    const result = await this.db.transaction(async (m) => {
      // Same ordering as all canonical role writers. No row lock before the target lock.
      await lockOperatorAssignments(m, userId);
      const [pre]: OperatorInvite[] = await m.query(
        `SELECT ${COLUMNS} FROM service_operator_invitations WHERE token_hash=$1`,
        [hash(token)],
      );
      if (
        !pre ||
        pre.status !== "pending" ||
        new Date(pre.expires_at) <= this.now()
      )
        fail("INVALID_OR_EXPIRED_INVITATION", 400);
      if (pre.target_user_id && pre.target_user_id !== userId)
        fail("INVITATION_ACCOUNT_MISMATCH", 403);
      await this.authority(
        m,
        this.scope(pre),
        pre.invited_by_user_id ?? "",
        userId,
      );
      const [i]: OperatorInvite[] = await m.query(
        `SELECT ${COLUMNS} FROM service_operator_invitations WHERE token_hash=$1 FOR UPDATE`,
        [hash(token)],
      );
      if (!i || i.status !== "pending" || new Date(i.expires_at) <= this.now())
        fail("INVALID_OR_EXPIRED_INVITATION", 400);
      if (i.scope_type === "platform") resolvePlatformInvitationRole(i.role, i.service_key, i.scope_key);
      const user = await this.prove(m, i, userId),
        scope = this.scope(i);
      const workspace = isAdminOperationsInvitation(scope);
      let acceptedMenuKeys: string[] | undefined;
      let ensured;
      if (workspace) {
        const [pending] = await m.query('SELECT menu_keys FROM central_operation_menu_grants WHERE invitation_id=$1 FOR UPDATE', [i.id]);
        // A missing bundle definition must never turn into all workspace duties.
        acceptedMenuKeys = validateAdminOperationsMenus(pending?.menu_keys);
        ensured = await activateOperationsOperator(m, i.invited_by_user_id!, user.id, acceptedMenuKeys);
        await m.query('DELETE FROM central_operation_menu_grants WHERE invitation_id=$1', [i.id]);
      } else {
        await this.requireUnassignedRole(m, scope, user.id);
        ensured = await activateInvitation(m, scope, i.invited_by_user_id ?? "", user.id);
      }
      if (!workspace && scope.scope_type === 'platform' && scope.scope_key === CENTRAL_DELEGATION_SCOPE) {
        const [pending] = await m.query('SELECT menu_keys FROM central_operation_menu_grants WHERE invitation_id=$1 FOR UPDATE', [i.id]);
        const menus = validateCentralMenuKeys(i.role, pending?.menu_keys ?? centralMenusForRole(i.role).map(menu => menu.key));
        acceptedMenuKeys = menus;
        const [assignment] = await m.query(`SELECT id FROM role_assignments WHERE user_id=$1 AND role=$2 AND scope_type=$3 AND is_active=true FOR UPDATE`, [user.id, i.role, CENTRAL_DELEGATION_SCOPE]);
        if (!assignment) fail('OPERATOR_ROLE_REVOKED', 409);
        await m.query('DELETE FROM central_operation_menu_grants WHERE invitation_id=$1', [i.id]);
        await m.query(`INSERT INTO central_operation_menu_grants(assignment_id,menu_keys) VALUES($1,$2)
          ON CONFLICT(assignment_id) DO UPDATE SET menu_keys=$2,updated_at=clock_timestamp()`, [assignment.id, menus]);
      }
      await m.query(
        `UPDATE service_operator_invitations SET status='accepted',accepted_user_id=$2,target_user_id=NULL,
        accepted_at=$3,updated_at=$3,invited_email=NULL,token_hash=NULL WHERE id=$1`,
        [i.id, user.id, this.now()],
      );
      // One accepted grant consumes all duplicate pending grants for this exact permission.
      await m.query(
        `UPDATE service_operator_invitations SET status='cancelled',invited_email=NULL,token_hash=NULL,updated_at=$5
        WHERE id<>$1 AND status='pending' AND role=$3 AND (target_user_id=$2 OR lower(invited_email)=$4)
        AND ${duplicateScopePredicate(workspace)}`,
        [
          i.id,
          user.id,
          i.role,
          normalizeLoginEmail(user.email),
          this.now(),
          i.scope_type,
          i.scope_key,
        ],
      );
      await this.recordAcceptedAssignment(m, i, user.id, acceptedMenuKeys);
      return {
        serviceKey: i.service_key,
        role: i.role,
        purpose: i.purpose,
        ...(workspace ? { adminOperations: true } : {}),
        ...(ensured && "policy" in ensured
          ? {
              membershipPolicy: ensured.policy,
              membershipStatuses: ensured.existingStatuses,
            }
          : {}),
      };
    });
    invalidateRoles(userId);
    return result;
  }
}
export const serviceOperatorInvitationService =
  new ServiceOperatorInvitationService();
