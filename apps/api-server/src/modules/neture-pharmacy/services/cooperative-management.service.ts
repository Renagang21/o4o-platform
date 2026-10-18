import type { DataSource, EntityManager } from "typeorm";
import { NeturePharmacyError } from "../constants.js";
import { getNetureMainMembershipStatus } from "../../neture/services/neture-main-membership.js";

type Exec = Pick<EntityManager, "query">;
export type CooperativeRole = "admin" | "operator";
const denied = () =>
  new NeturePharmacyError(
    403,
    "COOPERATIVE_FORBIDDEN",
    "해당 범위의 관리 권한이 필요합니다.",
  );
const invalid = () =>
  new NeturePharmacyError(
    400,
    "COOPERATIVE_INVALID_INPUT",
    "입력값과 처리 사유를 확인해 주세요.",
  );
export const MEMBER_TRANSITIONS: Readonly<
  Record<string, readonly [readonly string[], string]>
> = {
  approve: [["pending"], "active"],
  reject: [["pending"], "rejected"],
  suspend: [["active"], "suspended"],
  restore: [["suspended"], "active"],
  withdraw: [["active", "suspended"], "withdrawn"],
  expel: [["active", "suspended"], "withdrawn"],
};
const affiliationTransitions: Readonly<
  Record<string, readonly [readonly string[], string]>
> = {
  approve: [["pending"], "active"],
  reject: [["pending"], "rejected"],
  suspend: [["active"], "suspended"],
  restore: [["suspended"], "active"],
};
function reason(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 2000)
    throw invalid();
  return value.trim();
}
async function usable(exec: Exec, id: string) {
  const [u] = await exec.query(
    `SELECT id FROM users WHERE id=$1 AND status IN ('active','approved') AND "isActive"=true AND "isEmailVerified"=true`,
    [id],
  );
  if (!u) throw denied();
}
export async function federationRole(
  exec: Exec,
  id: string,
): Promise<CooperativeRole | null> {
  const rows = await exec.query(
    `SELECT role FROM role_assignments WHERE user_id=$1
    AND role IN ('neture:pharmcoop_admin','neture:pharmcoop_operator') AND is_active=true
    AND (valid_from IS NULL OR valid_from<=CURRENT_TIMESTAMP)
    AND (valid_until IS NULL OR valid_until>=CURRENT_TIMESTAMP)`,
    [id],
  );
  if (
    !rows.length ||
    (await getNetureMainMembershipStatus(exec, id)) !== "active"
  )
    return null;
  return rows.some((r: { role: string }) => r.role === "neture:pharmcoop_admin")
    ? "admin"
    : "operator";
}
export async function cooperativeRole(
  exec: Exec,
  id: string,
  cooperativeId: string,
): Promise<CooperativeRole | null> {
  const [row] = await exec.query(
    `SELECT r.role FROM cooperative_roles r
    JOIN cooperatives c ON c.id=r.cooperative_id JOIN semi_franchises sf ON sf.id=c.semi_franchise_id
    JOIN users u ON u.id=r.user_id
    WHERE r.user_id=$1 AND r.cooperative_id=$2 AND r.revoked_at IS NULL
    AND c.status='active' AND sf.status='active' AND u.status IN ('active','approved')
    AND u."isActive"=true AND u."isEmailVerified"=true`,
    [id, cooperativeId],
  );
  return row?.role ?? null;
}

/** All mutations lock the cooperative before checking current roles and writing an audit event. */
export class CooperativeManagementService {
  constructor(private readonly db: DataSource) {}
  async requireFederation(exec: Exec, actor: string, admin = false) {
    await usable(exec, actor);
    const role = await federationRole(exec, actor);
    if (!role || (admin && role !== "admin")) throw denied();
    return role;
  }
  async requireLocal(exec: Exec, actor: string, coop: string, admin = false) {
    const role = await cooperativeRole(exec, actor, coop);
    if (!role || (admin && role !== "admin")) throw denied();
    return role;
  }
  private async lock(exec: Exec, coop: string) {
    const [row] = await exec.query(
      "SELECT * FROM cooperatives WHERE id=$1 FOR UPDATE",
      [coop],
    );
    if (!row)
      throw new NeturePharmacyError(
        404,
        "COOPERATIVE_NOT_FOUND",
        "조합을 찾을 수 없습니다.",
      );
    return row;
  }
  private audit(
    exec: Exec,
    coop: string,
    actor: string,
    subject: string | null,
    action: string,
    note: string,
    previous: string | null = null,
    next: string | null = null,
  ) {
    return exec.query(
      `INSERT INTO cooperative_management_events(cooperative_id,actor_id,subject_id,action,reason,previous_state,next_state)
      VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [coop, actor, subject, action, note, previous, next],
    );
  }
  async federationList(actor: string) {
    await this.requireFederation(this.db, actor);
    return this.db
      .query(`SELECT c.id,c.slug,c.name,c.status,c.introduction,c.eligibility_description AS "eligibilityDescription",sf.key AS "businessKey"
      FROM cooperatives c JOIN semi_franchises sf ON sf.id=c.semi_franchise_id ORDER BY c.created_at DESC,c.id`);
  }
  async applyAffiliation(actor: string, input: Record<string, unknown>) {
    await usable(this.db, actor);
    const slug = input.slug,
      name = input.name;
    if (
      typeof slug !== "string" ||
      slug.length > 58 ||
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ||
      [
        "cooperatives",
        "about",
        "operator",
        "preview",
        "login",
        "assets",
        "api",
      ].includes(slug) ||
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 255
    )
      throw invalid();
    const intro = reason(input.introduction),
      eligibility = reason(input.eligibilityDescription);
    return this.db.transaction(async (m) => {
      await usable(m, actor);
      await m.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        `cooperative:slug:${slug}`,
      ]);
      if (
        (
          await m.query(
            "SELECT 1 FROM cooperatives WHERE slug=$1 UNION ALL SELECT 1 FROM semi_franchises WHERE key=$2",
            [slug, `coop-${slug}`],
          )
        ).length
      )
        throw new NeturePharmacyError(
          409,
          "COOPERATIVE_SLUG_TAKEN",
          "이미 사용 중인 조합 주소입니다.",
        );
      const [org] = await m.query(
        `INSERT INTO organizations(name,code,type) VALUES($1,$2,'semi_franchise') RETURNING id`,
        [name.trim(), `cooperative-${slug}`],
      );
      const [sf] = await m.query(
        `INSERT INTO semi_franchises(key,name,organization_id,status) VALUES($1,$2,$3,'closed') RETURNING id`,
        [`coop-${slug}`, name.trim(), org.id],
      );
      const [coop] = await m.query(
        `INSERT INTO cooperatives(slug,name,introduction,eligibility_description,semi_franchise_id,status)
        VALUES($1,$2,$3,$4,$5,'pending') RETURNING id`,
        [slug, name.trim(), intro, eligibility, sf.id],
      );
      await this.audit(
        m,
        coop.id,
        actor,
        null,
        "affiliation_apply",
        "연합회 가입 신청",
        null,
        "pending",
      );
      return coop;
    });
  }
  async affiliationAction(
    actor: string,
    coop: string,
    action: string,
    note: unknown,
  ) {
    const text = reason(note);
    return this.db.transaction(async (m) => {
      const row = await this.lock(m, coop);
      await this.requireFederation(
        m,
        actor,
        !["review", "request_changes"].includes(action),
      );
      if (["review", "request_changes"].includes(action)) {
        if (row.status !== "pending") throw invalid();
      } else {
        const transition = affiliationTransitions[action];
        if (!transition || !transition[0].includes(row.status)) throw invalid();
        await m.query("UPDATE cooperatives SET status=$2 WHERE id=$1", [
          coop,
          transition[1],
        ]);
        await m.query("UPDATE semi_franchises SET status=$2 WHERE id=$1", [
          row.semi_franchise_id,
          transition[1] === "active" ? "active" : "closed",
        ]);
      }
      await this.audit(
        m,
        coop,
        actor,
        null,
        `affiliation_${action}`,
        text,
        row.status,
        affiliationTransitions[action]?.[1] ?? row.status,
      );
      return { ok: true };
    });
  }
  async listRoles(actor: string, coop: string, federation: boolean) {
    if (federation) await this.requireFederation(this.db, actor);
    else await this.requireLocal(this.db, actor, coop, true);
    return this.db.query(
      `SELECT r.id,r.user_id AS "userId",r.role,u.name,u.email FROM cooperative_roles r
      JOIN users u ON u.id=r.user_id WHERE r.cooperative_id=$1 AND r.revoked_at IS NULL AND ($2::boolean=false OR r.role='admin') ORDER BY r.role,u.name,r.id`,
      [coop, federation],
    );
  }
  async assignRole(
    actor: string,
    coop: string,
    email: unknown,
    role: unknown,
    note: unknown,
  ) {
    if (
      typeof email !== "string" ||
      email.length > 255 ||
      !["admin", "operator"].includes(String(role))
    )
      throw invalid();
    const text = reason(note);
    return this.db.transaction(async (m) => {
      await this.lock(m, coop);
      if (role === "admin") await this.requireFederation(m, actor, true);
      else await this.requireLocal(m, actor, coop, true);
      const [target] = await m.query(
        `SELECT id FROM users WHERE lower(email)=lower($1) AND status IN ('active','approved') AND "isActive"=true AND "isEmailVerified"=true FOR SHARE`,
        [email.trim()],
      );
      if (!target)
        throw new NeturePharmacyError(
          400,
          "COOPERATIVE_TARGET_UNAVAILABLE",
          "가입·이메일 인증이 완료된 활성 계정을 확인해 주세요.",
        );
      if (
        (
          await m.query(
            "SELECT 1 FROM cooperative_roles WHERE cooperative_id=$1 AND user_id=$2 AND revoked_at IS NULL",
            [coop, target.id],
          )
        ).length
      )
        throw new NeturePharmacyError(
          409,
          "COOPERATIVE_ROLE_EXISTS",
          "기존 역할을 해제한 뒤 지정해 주세요.",
        );
      const [row] = await m.query(
        "INSERT INTO cooperative_roles(cooperative_id,user_id,role) VALUES($1,$2,$3) RETURNING id",
        [coop, target.id, role],
      );
      await this.audit(
        m,
        coop,
        actor,
        target.id,
        "role_assign",
        text,
        null,
        String(role),
      );
      return row;
    });
  }
  async revokeRole(actor: string, coop: string, roleId: string, note: unknown) {
    const text = reason(note);
    return this.db.transaction(async (m) => {
      await this.lock(m, coop);
      const [row] = await m.query(
        "SELECT * FROM cooperative_roles WHERE id=$1 AND cooperative_id=$2 AND revoked_at IS NULL FOR UPDATE",
        [roleId, coop],
      );
      if (!row)
        throw new NeturePharmacyError(
          404,
          "COOPERATIVE_ROLE_NOT_FOUND",
          "역할을 찾을 수 없습니다.",
        );
      if (row.role === "admin") await this.requireFederation(m, actor, true);
      else await this.requireLocal(m, actor, coop, true);
      if (row.user_id === actor)
        throw new NeturePharmacyError(
          409,
          "COOPERATIVE_SELF_REVOKE",
          "자기 관리 역할은 해제할 수 없습니다.",
        );
      if (row.role === "admin") {
        const others = await m.query(
          `SELECT 1 FROM cooperative_roles r JOIN users u ON u.id=r.user_id
          WHERE r.cooperative_id=$1 AND r.role='admin' AND r.revoked_at IS NULL AND r.id<>$2
          AND u.status IN ('active','approved') AND u."isActive"=true AND u."isEmailVerified"=true LIMIT 1`,
          [coop, roleId],
        );
        if (!others.length)
          throw new NeturePharmacyError(
            409,
            "COOPERATIVE_LAST_ADMIN",
            "마지막 활성 조합 admin은 해제할 수 없습니다.",
          );
      }
      await m.query(
        "UPDATE cooperative_roles SET revoked_at=now() WHERE id=$1",
        [roleId],
      );
      await this.audit(
        m,
        coop,
        actor,
        row.user_id,
        "role_revoke",
        text,
        row.role,
        null,
      );
      return { ok: true };
    });
  }
  async applyMembership(actor: string, coop: string, note: unknown) {
    const text = reason(note);
    return this.db.transaction(async (m) => {
      const c = await this.lock(m, coop);
      await usable(m, actor);
      const [sf] = await m.query(
        "SELECT 1 FROM semi_franchises WHERE id=$1 AND status='active'",
        [c.semi_franchise_id],
      );
      if (c.status !== "active" || !sf) throw denied();
      const [existing] = await m.query(
        "SELECT status FROM cooperative_memberships WHERE cooperative_id=$1 AND user_id=$2 FOR UPDATE",
        [coop, actor],
      );
      if (
        existing &&
        !["pending", "withdrawn", "rejected"].includes(existing.status)
      )
        throw new NeturePharmacyError(
          409,
          "COOPERATIVE_MEMBERSHIP_EXISTS",
          "이미 가입 또는 심사 중입니다.",
        );
      await m.query(
        `INSERT INTO cooperative_memberships(cooperative_id,user_id,status) VALUES($1,$2,'pending')
        ON CONFLICT(cooperative_id,user_id) DO UPDATE SET status='pending'`,
        [coop, actor],
      );
      await this.audit(
        m,
        coop,
        actor,
        actor,
        existing?.status === "pending"
          ? "member_supplement"
          : "membership_apply",
        text,
        existing?.status ?? null,
        "pending",
      );
      return { ok: true };
    });
  }
  async myAffiliations(actor: string) {
    await usable(this.db, actor);
    return this.db.query(
      `SELECT c.id,c.slug,c.name,c.status,c.introduction,c.eligibility_description AS "eligibilityDescription"
      FROM cooperatives c WHERE EXISTS(SELECT 1 FROM cooperative_management_events e WHERE e.cooperative_id=c.id AND e.actor_id=$1 AND e.action='affiliation_apply')
      ORDER BY c.created_at DESC`,
      [actor],
    );
  }
  async myHistory(actor: string, coop: string) {
    await usable(this.db, actor);
    return this.db.query(
      `SELECT id,action,reason,previous_state AS "previousState",next_state AS "nextState",created_at AS "createdAt"
      FROM cooperative_management_events WHERE cooperative_id=$1 AND (subject_id=$2 OR (action LIKE 'affiliation_%' AND EXISTS(
      SELECT 1 FROM cooperative_management_events a WHERE a.cooperative_id=$1 AND a.actor_id=$2 AND a.action='affiliation_apply')))
      ORDER BY created_at DESC,id DESC LIMIT 100`,
      [coop, actor],
    );
  }
  async supplementAffiliation(actor: string, coop: string, note: unknown) {
    const text = reason(note);
    return this.db.transaction(async (m) => {
      const c = await this.lock(m, coop);
      await usable(m, actor);
      const own = await m.query(
        "SELECT 1 FROM cooperative_management_events WHERE cooperative_id=$1 AND actor_id=$2 AND action='affiliation_apply'",
        [coop, actor],
      );
      if (!own.length || c.status !== "pending") throw denied();
      await this.audit(m, coop, actor, null, "affiliation_supplement", text);
      return { ok: true };
    });
  }
  async requestWithdrawal(actor: string, coop: string, note: unknown) {
    const text = reason(note);
    return this.db.transaction(async (m) => {
      await this.lock(m, coop);
      await usable(m, actor);
      const [member] = await m.query(
        "SELECT status FROM cooperative_memberships WHERE cooperative_id=$1 AND user_id=$2 AND status IN ('active','suspended') FOR UPDATE",
        [coop, actor],
      );
      if (!member) throw denied();
      await this.audit(
        m,
        coop,
        actor,
        actor,
        "member_request_withdraw",
        text,
        member.status,
        member.status,
      );
      return { ok: true };
    });
  }
  async members(actor: string, coop: string) {
    await this.requireLocal(this.db, actor, coop);
    return this.db.query(
      `SELECT m.id,m.user_id AS "userId",m.status,u.name,u.email,m.created_at AS "createdAt"
      FROM cooperative_memberships m JOIN users u ON u.id=m.user_id WHERE m.cooperative_id=$1 ORDER BY m.created_at DESC,m.id`,
      [coop],
    );
  }
  async memberAction(
    actor: string,
    coop: string,
    memberId: string,
    action: string,
    note: unknown,
  ) {
    const text = reason(note);
    return this.db.transaction(async (m) => {
      await this.lock(m, coop);
      const role = await this.requireLocal(m, actor, coop);
      const [member] = await m.query(
        "SELECT * FROM cooperative_memberships WHERE cooperative_id=$1 AND id=$2 FOR UPDATE",
        [coop, memberId],
      );
      if (!member)
        throw new NeturePharmacyError(
          404,
          "COOPERATIVE_MEMBER_NOT_FOUND",
          "조합원을 찾을 수 없습니다.",
        );
      const request = action.startsWith("request_");
      const requestedAction = request ? action.slice(8) : action;
      const transition = MEMBER_TRANSITIONS[requestedAction];
      if (
        !["review", "request_changes"].includes(action) &&
        (!transition || !transition[0].includes(member.status))
      )
        throw invalid();
      if (
        ["review", "request_changes"].includes(action) &&
        member.status !== "pending"
      )
        throw invalid();
      const final = !request && !["review", "request_changes"].includes(action);
      if (final && role !== "admin") throw denied();
      if (final && transition[1] === "active") await usable(m, member.user_id);
      if (final)
        await m.query(
          "UPDATE cooperative_memberships SET status=$2 WHERE id=$1",
          [member.id, transition[1]],
        );
      await this.audit(
        m,
        coop,
        actor,
        member.user_id,
        `member_${action}`,
        text,
        member.status,
        final ? transition[1] : member.status,
      );
      return { ok: true };
    });
  }
  async history(actor: string, coop: string, federation: boolean) {
    if (federation) await this.requireFederation(this.db, actor);
    else await this.requireLocal(this.db, actor, coop);
    // Federation staff see affiliation and admin-assignment events only, never personal member work.
    return this.db.query(
      `SELECT e.id,e.action,e.reason,e.previous_state AS "previousState",e.next_state AS "nextState",e.created_at AS "createdAt",
      e.actor_id AS "actorId",e.subject_id AS "subjectId",a.name AS "actorName",s.name AS "subjectName"
      FROM cooperative_management_events e JOIN users a ON a.id=e.actor_id LEFT JOIN users s ON s.id=e.subject_id
      WHERE e.cooperative_id=$1 AND ($2::boolean=false OR e.action LIKE 'affiliation_%' OR (e.action IN ('role_assign','role_revoke') AND (e.previous_state='admin' OR e.next_state='admin')))
      ORDER BY e.created_at DESC,e.id DESC LIMIT 200`,
      [coop, federation],
    );
  }
}
