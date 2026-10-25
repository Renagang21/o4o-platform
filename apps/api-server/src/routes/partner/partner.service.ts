import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { DataSource, EntityManager } from "typeorm";
import {
  emptyPartnerWorkspace,
  type PartnerWorkspace,
} from "./partner.schema.js";

export type SpaceRole = "owner" | "editor" | "viewer";
export class PartnerError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
type Space = {
  id: string;
  owner_id: string;
  name: string;
  role: SpaceRole;
  revision: number;
  workspace: PartnerWorkspace;
  updated_at: string;
};
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const same = (a: unknown, b: unknown): boolean => {
  // jsonb key ordering is not the browser's insertion order.
  const stable = (v: unknown): string =>
    v && typeof v === "object"
      ? Array.isArray(v)
        ? `[${v.map(stable).join(",")}]`
        : `{${Object.entries(v)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, val]) => `${JSON.stringify(k)}:${stable(val)}`)
            .join(",")}}`
      : JSON.stringify(v);
  return stable(a) === stable(b);
};
export class PartnerService {
  constructor(private db: DataSource) {}
  private async space(
    q: EntityManager,
    userId: string,
    id: string,
    lock = false,
  ): Promise<Space> {
    const rows = await q.query(
      `SELECT s.*, CASE WHEN s.owner_id=$2 THEN 'owner' ELSE m.role END AS role
      FROM partner_support_spaces s LEFT JOIN partner_support_members m ON m.space_id=s.id AND m.user_id=$2
      WHERE s.id=$1 AND (s.owner_id=$2 OR m.user_id=$2) ${lock ? "FOR UPDATE OF s" : ""}`,
      [id, userId],
    );
    if (!rows[0]) throw new PartnerError(404, "SPACE_NOT_FOUND");
    return rows[0];
  }
  private owner(s: Space) {
    if (s.role !== "owner") throw new PartnerError(403, "OWNER_REQUIRED");
  }
  private async event(
    q: EntityManager,
    s: Space,
    actor: string,
    kind: string,
    changes: unknown,
  ) {
    await q.query(
      "INSERT INTO partner_support_events(id,space_id,actor_id,kind,revision,changes) VALUES($1,$2,$3,$4,$5,$6::jsonb)",
      [randomUUID(), s.id, actor, kind, s.revision, JSON.stringify(changes)],
    );
  }
  async list(userId: string) {
    return this.db.query(
      `SELECT s.id,s.name,s.revision,s.updated_at, CASE WHEN s.owner_id=$1 THEN 'owner' ELSE m.role END AS role
      FROM partner_support_spaces s LEFT JOIN partner_support_members m ON m.space_id=s.id AND m.user_id=$1
      WHERE s.owner_id=$1 OR m.user_id=$1 ORDER BY s.updated_at DESC LIMIT 100`,
      [userId],
    );
  }
  async create(userId: string, name: string) {
    return this.db.transaction(async (q) => {
      await q.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        `partner:${userId}`,
      ]);
      const [{ count }] = await q.query(
        "SELECT count(*)::int AS count FROM partner_support_spaces WHERE owner_id=$1",
        [userId],
      );
      if (count >= 25) throw new PartnerError(409, "SPACE_LIMIT");
      const id = randomUUID();
      await q.query(
        "INSERT INTO partner_support_spaces(id,owner_id,name,workspace) VALUES($1,$2,$3,$4::jsonb)",
        [id, userId, name, JSON.stringify(emptyPartnerWorkspace())],
      );
      const s = await this.space(q, userId, id);
      await this.event(q, s, userId, "space_created", {});
      return s;
    });
  }
  async get(userId: string, id: string) {
    return this.space(this.db.manager, userId, id);
  }
  async save(
    userId: string,
    id: string,
    revision: number,
    workspace: PartnerWorkspace,
  ) {
    return this.db.transaction(async (q) => {
      const s = await this.space(q, userId, id, true);
      if (s.role === "viewer") throw new PartnerError(403, "READ_ONLY");
      if (s.revision !== revision)
        throw new PartnerError(409, "REVISION_CONFLICT");
      if (
        s.role !== "owner" &&
        !same(s.workspace.settlements, workspace.settlements)
      )
        throw new PartnerError(403, "SETTLEMENT_OWNER_REQUIRED");
      const before = new Map(
        s.workspace.settlements.map((row) => [row.id, row]),
      );
      const after = new Map(workspace.settlements.map((row) => [row.id, row]));
      const changes = [...new Set([...before.keys(), ...after.keys()])]
        .filter((key) => !same(before.get(key) ?? null, after.get(key) ?? null))
        .map((key) => ({
          id: key,
          before: before.get(key) ?? null,
          after: after.get(key) ?? null,
        }));
      const [updated] = await q.query(
        `WITH updated AS (UPDATE partner_support_spaces SET workspace=$2::jsonb,revision=revision+1,updated_at=now() WHERE id=$1
        RETURNING *) SELECT * FROM updated`,
        [id, JSON.stringify(workspace)],
      );
      await this.event(
        q,
        { ...s, revision: updated.revision },
        userId,
        "workspace_saved",
        { settlements: changes },
      );
      return { ...updated, role: s.role };
    });
  }
  async members(userId: string, id: string) {
    const s = await this.space(this.db.manager, userId, id);
    return this.db.query(
      `SELECT u.id,COALESCE(NULLIF(u.name,''),'사용자') AS name,'owner' AS role FROM users u WHERE u.id=$2
      UNION ALL SELECT u.id,COALESCE(NULLIF(u.name,''),'사용자') AS name,m.role FROM partner_support_members m JOIN users u ON u.id=m.user_id WHERE m.space_id=$1`,
      [id, s.owner_id],
    );
  }
  async removeMember(userId: string, id: string, memberId: string) {
    return this.db.transaction(async (q) => {
      const s = await this.space(q, userId, id, true);
      this.owner(s);
      if (memberId === s.owner_id)
        throw new PartnerError(400, "CANNOT_REMOVE_OWNER");
      const result = await q.query(
        "WITH removed AS (DELETE FROM partner_support_members WHERE space_id=$1 AND user_id=$2 RETURNING user_id) SELECT * FROM removed",
        [id, memberId],
      );
      if (!result.length) throw new PartnerError(404, "MEMBER_NOT_FOUND");
      await this.event(q, s, userId, "member_removed", { userId: memberId });
    });
  }
  async invite(userId: string, id: string, role: "editor" | "viewer") {
    return this.db.transaction(async (q) => {
      const s = await this.space(q, userId, id, true);
      this.owner(s);
      const [{ count }] = await q.query(
        "SELECT count(*)::int AS count FROM partner_support_invites WHERE space_id=$1 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at>now()",
        [id],
      );
      if (count >= 20) throw new PartnerError(409, "INVITE_LIMIT");
      const token = randomBytes(32).toString("hex"),
        inviteId = randomUUID();
      const [row] = await q.query(
        `INSERT INTO partner_support_invites(id,space_id,token_hash,role,created_by,expires_at)
        VALUES($1,$2,$3,$4,$5,now()+interval '7 days') RETURNING id,role,expires_at`,
        [inviteId, id, hash(token), role, userId],
      );
      await this.event(q, s, userId, "invite_created", { id: inviteId, role });
      return { ...row, token };
    });
  }
  async invites(userId: string, id: string) {
    this.owner(await this.space(this.db.manager, userId, id));
    return this.db.query(
      "SELECT id,role,expires_at,consumed_at,revoked_at FROM partner_support_invites WHERE space_id=$1 ORDER BY created_at DESC LIMIT 100",
      [id],
    );
  }
  async revoke(userId: string, id: string, inviteId: string) {
    return this.db.transaction(async (q) => {
      const s = await this.space(q, userId, id, true);
      this.owner(s);
      const rows = await q.query(
        "WITH revoked AS (UPDATE partner_support_invites SET revoked_at=COALESCE(revoked_at,now()) WHERE id=$1 AND space_id=$2 RETURNING id) SELECT * FROM revoked",
        [inviteId, id],
      );
      if (!rows.length) throw new PartnerError(404, "INVITE_NOT_FOUND");
      await this.event(q, s, userId, "invite_revoked", { id: inviteId });
    });
  }
  async join(userId: string, token: string) {
    return this.db.transaction(async (q) => {
      // Read the space ID first; all membership mutations lock the space before the invite.
      const [lookup] = await q.query(
        "SELECT space_id FROM partner_support_invites WHERE token_hash=$1",
        [hash(token)],
      );
      if (!lookup) throw new PartnerError(404, "INVITE_UNAVAILABLE");
      const [s] = await q.query(
        "SELECT * FROM partner_support_spaces WHERE id=$1 FOR UPDATE",
        [lookup.space_id],
      );
      const [invite] = await q.query(
        `SELECT * FROM partner_support_invites WHERE token_hash=$1 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at>now() FOR UPDATE`,
        [hash(token)],
      );
      if (!s || !invite) throw new PartnerError(404, "INVITE_UNAVAILABLE");
      if (s.owner_id === userId) throw new PartnerError(409, "ALREADY_MEMBER");
      const existing = await q.query(
        "SELECT 1 FROM partner_support_members WHERE space_id=$1 AND user_id=$2",
        [s.id, userId],
      );
      if (existing.length) throw new PartnerError(409, "ALREADY_MEMBER");
      const [{ count }] = await q.query(
        "SELECT count(*)::int AS count FROM partner_support_members WHERE space_id=$1",
        [s.id],
      );
      if (count >= 100) throw new PartnerError(409, "MEMBER_LIMIT");
      await q.query(
        "INSERT INTO partner_support_members(space_id,user_id,role) VALUES($1,$2,$3)",
        [s.id, userId, invite.role],
      );
      await q.query(
        "UPDATE partner_support_invites SET consumed_at=now() WHERE id=$1",
        [invite.id],
      );
      await this.event(q, s, userId, "member_joined", { role: invite.role });
      return { id: s.id, name: s.name, role: invite.role };
    });
  }
  async events(userId: string, id: string) {
    this.owner(await this.space(this.db.manager, userId, id));
    return this.db.query(
      "SELECT id,actor_id,kind,revision,changes,created_at FROM partner_support_events WHERE space_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100",
      [id],
    );
  }
}
