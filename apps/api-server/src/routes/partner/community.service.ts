import type { DataSource, EntityManager } from "typeorm";
import { PartnerError } from "./partner.service.js";
import {
  recordEnrollmentPolicies,
  recordEnrollmentApplication,
  type EnrollmentPolicyReference,
} from "../../modules/policy-acceptance/service-enrollment-policy.service.js";

const SERVICE = "partner-support";
const fail = (status: number, code: string): never => {
  throw new PartnerError(status, code);
};
export class PartnerCommunityService {
  constructor(private db: DataSource) {}
  boards() {
    return this.db.query(
      "SELECT id,name,description,operator_only,revision FROM partner_community_boards WHERE active=true ORDER BY created_at,id",
    );
  }
  private async identity(
    m: EntityManager,
    user: string,
    member = true,
    operator = false,
  ) {
    const [account] = await m.query(
      `SELECT id FROM users WHERE id=$1 AND "isActive"=true AND "isEmailVerified"=true AND status IN ('active','approved') FOR SHARE`,
      [user],
    );
    if (!account) fail(403, "ACCOUNT_NOT_ACTIVE");
    const [membership] = await m.query(
      "SELECT id,status FROM service_memberships WHERE user_id=$1 AND service_key=$2 FOR SHARE",
      [user, SERVICE],
    );
    const roles =
      membership?.status === "active"
        ? await m.query(
            `SELECT role FROM role_assignments WHERE user_id=$1 AND is_active=true
      AND (valid_from IS NULL OR valid_from<=now()) AND (valid_until IS NULL OR valid_until>=now())
      AND role IN ('partner-support:admin','partner-support:operator') FOR SHARE`,
            [user],
          )
        : [];
    if (member && membership?.status !== "active")
      fail(403, "COMMUNITY_MEMBERSHIP_REQUIRED");
    if (operator && !roles.length) fail(403, "COMMUNITY_OPERATOR_REQUIRED");
    return { status: membership?.status ?? null, operator: roles.length > 0, admin: roles.some((r: { role: string }) => r.role === "partner-support:admin") };
  }
  status(user: string) {
    return this.db.transaction((m) => this.identity(m, user, false));
  }
  join(user: string, references?: EnrollmentPolicyReference[]) {
    return this.db.transaction(async (m) => {
      await m.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user]);
      const current = await this.identity(m, user, false);
      if (current.status === "active") return current;
      if (current.status) fail(403, "COMMUNITY_MEMBERSHIP_MANAGED");
      const policies = await recordEnrollmentPolicies(
        m,
        user,
        SERVICE,
        references,
      );
      const [row] = await m.query(
        `INSERT INTO service_memberships(user_id,service_key,status,role) VALUES($1,$2,'active','member') RETURNING id`,
        [user, SERVICE],
      );
      await recordEnrollmentApplication(
        m,
        user,
        SERVICE,
        {
          type: "service_membership",
          id: row.id,
          conditions: { communityGuidelinesVersion: 1 },
        },
        policies,
      );
      await this.event(
        m,
        user,
        "member_joined",
        user,
        "community-guidelines-v1",
      );
      return { status: "active", operator: false };
    });
  }
  private event(
    m: EntityManager,
    user: string,
    kind: string,
    target: string,
    reason?: string,
  ) {
    return m.query(
      "INSERT INTO partner_community_events(actor_id,kind,target_id,reason) VALUES($1,$2,$3,$4)",
      [user, kind, target, reason ?? null],
    );
  }
  private async board(m: EntityManager, id: string, operator = false) {
    const [board] = await m.query(
      "SELECT * FROM partner_community_boards WHERE id=$1 FOR SHARE",
      [id],
    );
    if (!board || (!board.active && !operator))
      fail(404, "COMMUNITY_NOT_FOUND");
    return board;
  }
  private async post(
    m: EntityManager,
    id: string,
    operator = false,
    lock = false,
  ) {
    const [post] = await m.query(
      `SELECT p.* FROM partner_community_posts p WHERE p.id=$1 ${lock ? "FOR UPDATE" : ""}`,
      [id],
    );
    if (
      !post ||
      post.state === "deleted" ||
      (!operator && post.state !== "published")
    )
      fail(404, "COMMUNITY_NOT_FOUND");
    await this.board(m, post.board_id, operator);
    return post;
  }
  list(user: string, boardId: string, q: string, page: number) {
    return this.db.transaction(async (m) => {
      await this.identity(m, user);
      await this.board(m, boardId);
      const where =
        "p.board_id=$1 AND p.state='published' AND ($2='' OR position(lower($2) in lower(p.title||' '||p.body))>0)";
      const [{ count }] = await m.query(
        `SELECT count(*)::int count FROM partner_community_posts p WHERE ${where}`,
        [boardId, q],
      );
      const items = await m.query(
        `SELECT p.id,p.board_id,p.title,p.author_id,p.pinned,p.revision,p.created_at,p.updated_at,
        COALESCE(NULLIF(u.nickname,''),'파트너 회원') author_name,
        (SELECT count(*)::int FROM partner_community_comments c WHERE c.post_id=p.id AND c.state='published') comment_count
        FROM partner_community_posts p LEFT JOIN users u ON u.id=p.author_id WHERE ${where}
        ORDER BY p.pinned DESC,p.created_at DESC,p.id DESC LIMIT 20 OFFSET $3`,
        [boardId, q, (page - 1) * 20],
      );
      return { items, count, page };
    });
  }
  detail(user: string, id: string, operator = false) {
    return this.db.transaction(async (m) => {
      await this.identity(m, user, true, operator);
      const p = await this.post(m, id, operator);
      const [author] = await m.query(
        "SELECT COALESCE(NULLIF(nickname,''),'파트너 회원') name FROM users WHERE id=$1",
        [p.author_id],
      );
      const comments = await m.query(
        `SELECT c.id,c.post_id,c.author_id,c.state,c.revision,c.created_at,c.updated_at,
        CASE WHEN c.state='published' OR $2 THEN c.body ELSE '' END body,
        COALESCE(NULLIF(u.nickname,''),'파트너 회원') author_name
        FROM partner_community_comments c LEFT JOIN users u ON u.id=c.author_id WHERE c.post_id=$1 ORDER BY c.created_at,c.id LIMIT 300`,
        [id, operator],
      );
      return { ...p, author_name: author?.name ?? "탈퇴 회원", comments };
    });
  }
  writePost(
    user: string,
    input: { boardId: string; title: string; body: string },
  ) {
    return this.db.transaction(async (m) => {
      const access = await this.identity(m, user);
      const b = await this.board(m, input.boardId);
      if (b.operator_only && !access.operator)
        fail(403, "COMMUNITY_OPERATOR_REQUIRED");
      const [p] = await m.query(
        "INSERT INTO partner_community_posts(board_id,author_id,title,body) VALUES($1,$2,$3,$4) RETURNING id",
        [b.id, user, input.title, input.body],
      );
      await this.event(m, user, "post_created", p.id);
      return p;
    });
  }
  editPost(
    user: string,
    id: string,
    input: { revision: number; title: string; body: string },
  ) {
    return this.db.transaction(async (m) => {
      const access = await this.identity(m, user);
      const p = await this.post(m, id, false, true);
      const b = await this.board(m, p.board_id);
      if (p.author_id !== user || (b.operator_only && !access.operator))
        fail(403, "COMMUNITY_AUTHOR_REQUIRED");
      if (p.revision !== input.revision) fail(409, "REVISION_CONFLICT");
      await m.query(
        "UPDATE partner_community_posts SET title=$2,body=$3,revision=revision+1,updated_at=now() WHERE id=$1",
        [id, input.title, input.body],
      );
      await this.event(m, user, "post_edited", id);
      return { id };
    });
  }
  removePost(user: string, id: string, revision: number) {
    return this.db.transaction(async (m) => {
      await this.identity(m, user);
      const p = await this.post(m, id, true, true);
      if (p.author_id !== user) fail(403, "COMMUNITY_AUTHOR_REQUIRED");
      if (p.revision !== revision) fail(409, "REVISION_CONFLICT");
      await m.query(
        "UPDATE partner_community_posts SET state='deleted',title='',body='',pinned=false,revision=revision+1,updated_at=now() WHERE id=$1",
        [id],
      );
      await this.event(m, user, "post_deleted", id);
      return { id };
    });
  }
  comment(user: string, postId: string, body: string) {
    return this.db.transaction(async (m) => {
      await this.identity(m, user);
      await this.post(m, postId, false, true);
      const [{ count }] = await m.query(
        "SELECT count(*)::int count FROM partner_community_comments WHERE post_id=$1",
        [postId],
      );
      if (count >= 300) fail(409, "COMMUNITY_COMMENT_LIMIT");
      const [c] = await m.query(
        "INSERT INTO partner_community_comments(post_id,author_id,body) VALUES($1,$2,$3) RETURNING id",
        [postId, user, body],
      );
      await this.event(m, user, "comment_created", c.id);
      return c;
    });
  }
  editComment(user: string, id: string, revision: number, body: string | null) {
    return this.db.transaction(async (m) => {
      await this.identity(m, user);
      const [c] = await m.query(
        "SELECT * FROM partner_community_comments WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (
        !c ||
        c.state === "deleted" ||
        (body !== null && c.state !== "published")
      )
        fail(404, "COMMUNITY_NOT_FOUND");
      await this.post(m, c.post_id);
      if (c.author_id !== user) fail(403, "COMMUNITY_AUTHOR_REQUIRED");
      if (c.revision !== revision) fail(409, "REVISION_CONFLICT");
      await m.query(
        "UPDATE partner_community_comments SET body=$2,state=$3,revision=revision+1,updated_at=now() WHERE id=$1",
        [id, body ?? "", body === null ? "deleted" : "published"],
      );
      await this.event(
        m,
        user,
        body === null ? "comment_deleted" : "comment_edited",
        id,
      );
      return { id };
    });
  }
  report(
    user: string,
    postId: string,
    commentId: string | undefined,
    reason: string,
  ) {
    return this.db.transaction(async (m) => {
      await this.identity(m, user);
      await this.post(m, postId);
      if (commentId) {
        const [c] = await m.query(
          "SELECT id FROM partner_community_comments WHERE id=$1 AND post_id=$2 AND state='published'",
          [commentId, postId],
        );
        if (!c) fail(404, "COMMUNITY_NOT_FOUND");
      }
      const [report] = await m.query(
        `INSERT INTO partner_community_reports(reporter_id,post_id,comment_id,reason) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`,
        [user, postId, commentId ?? null, reason],
      );
      if (report) await this.event(m, user, "report_created", report.id);
      return { submitted: true };
    });
  }
  operatorOverview(user: string) {
    return this.db.transaction(async (m) => {
      await this.identity(m, user, true, true);
      const boards = await m.query(
        "SELECT * FROM partner_community_boards ORDER BY created_at,id",
      );
      const members = await m.query(
        `SELECT sm.user_id id,sm.status,sm.created_at,sm.updated_at,to_char(sm.updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US') version,COALESCE(NULLIF(u.nickname,''),'파트너 회원') name
        FROM service_memberships sm JOIN users u ON u.id=sm.user_id WHERE sm.service_key=$1 ORDER BY sm.created_at DESC,sm.id LIMIT 100`,
        [SERVICE],
      );
      const posts = await m.query(
        `SELECT p.*,COALESCE(NULLIF(u.nickname,''),'파트너 회원') author_name FROM partner_community_posts p LEFT JOIN users u ON u.id=p.author_id WHERE p.state<>'deleted' ORDER BY p.updated_at DESC,p.id LIMIT 100`,
      );
      const reports = await m.query(
        "SELECT id,post_id,comment_id,reason,status,resolution,revision,created_at FROM partner_community_reports ORDER BY created_at DESC,id LIMIT 100",
      );
      const events = await m.query(
        "SELECT e.id,e.kind,e.target_id,e.reason,e.created_at,COALESCE(NULLIF(u.nickname,''),'탈퇴 회원') actor_name FROM partner_community_events e LEFT JOIN users u ON u.id=e.actor_id ORDER BY e.created_at DESC,e.id LIMIT 100",
      );
      return { boards, members, posts, reports, events };
    });
  }
  moderate(
    user: string,
    kind: "post" | "comment",
    id: string,
    input: {
      revision: number;
      state: "published" | "hidden";
      reason: string;
      pinned?: boolean;
    },
  ) {
    return this.db.transaction(async (m) => {
      await this.identity(m, user, true, true);
      const table =
        kind === "post"
          ? "partner_community_posts"
          : "partner_community_comments";
      const [p] = await m.query(
        `SELECT id,state,revision FROM ${table} WHERE id=$1 FOR UPDATE`,
        [id],
      );
      if (!p || p.state === "deleted") fail(404, "COMMUNITY_NOT_FOUND");
      if (p.revision !== input.revision) fail(409, "REVISION_CONFLICT");
      if (kind === "post")
        await m.query(
          `UPDATE ${table} SET state=$2,pinned=COALESCE($3,pinned),revision=revision+1,updated_at=now() WHERE id=$1`,
          [id, input.state, input.pinned ?? null],
        );
      else
        await m.query(
          `UPDATE ${table} SET state=$2,revision=revision+1,updated_at=now() WHERE id=$1`,
          [id, input.state],
        );
      await this.event(m, user, `${kind}_${input.state}`, id, input.reason);
      return { id };
    });
  }
  setMember(
    user: string,
    id: string,
    status: "active" | "suspended",
    reason: string,
    expected: string,
  ) {
    return this.db.transaction(async (m) => {
      // Same lock order as the membership guard: account, membership, role.
      await m.query(
        "SELECT id FROM users WHERE id=ANY($1::uuid[]) ORDER BY id FOR SHARE",
        [[user, id]],
      );
      await m.query(
        "SELECT user_id FROM service_memberships WHERE user_id=ANY($1::uuid[]) AND service_key=$2 ORDER BY user_id FOR UPDATE",
        [[user, id], SERVICE],
      );
      const [target] = await m.query(
        `SELECT status,to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US') version FROM service_memberships WHERE user_id=$1 AND service_key=$2`,
        [id, SERVICE],
      );
      await this.identity(m, user, true, true);
      if (id === user) fail(403, "COMMUNITY_SELF_ACTION");
      if (!target) fail(404, "COMMUNITY_NOT_FOUND");
      if (target.version !== expected) fail(409, "REVISION_CONFLICT");
      if (!["active", "suspended"].includes(target.status))
        fail(409, "COMMUNITY_MEMBERSHIP_MANAGED");
      await m.query(
        "UPDATE service_memberships SET status=$3,updated_at=now() WHERE user_id=$1 AND service_key=$2",
        [id, SERVICE, status],
      );
      await this.event(m, user, `member_${status}`, id, reason);
      return { id, status };
    });
  }
  saveBoard(
    user: string,
    id: string | undefined,
    input: {
      name: string;
      description: string;
      operatorOnly: boolean;
      active: boolean;
      revision?: number;
      reason: string;
    },
  ) {
    return this.db.transaction(async (m) => {
      await this.identity(m, user, true, true);
      let target = id;
      if (id) {
        const [b] = await m.query(
          "SELECT revision FROM partner_community_boards WHERE id=$1 FOR UPDATE",
          [id],
        );
        if (!b) fail(404, "COMMUNITY_NOT_FOUND");
        if (b.revision !== input.revision) fail(409, "REVISION_CONFLICT");
        await m.query(
          "UPDATE partner_community_boards SET name=$2,description=$3,operator_only=$4,active=$5,revision=revision+1 WHERE id=$1",
          [id, input.name, input.description, input.operatorOnly, input.active],
        );
      } else {
        const [b] = await m.query(
          "INSERT INTO partner_community_boards(name,description,operator_only,active) VALUES($1,$2,$3,$4) RETURNING id",
          [input.name, input.description, input.operatorOnly, input.active],
        );
        target = b.id;
      }
      await this.event(
        m,
        user,
        id ? "board_updated" : "board_created",
        target!,
        input.reason,
      );
      return { id: target };
    });
  }
  resolveReport(
    user: string,
    id: string,
    revision: number,
    resolution: string,
  ) {
    return this.db.transaction(async (m) => {
      await this.identity(m, user, true, true);
      const rows = await m.query(
        "WITH updated AS (UPDATE partner_community_reports SET status='resolved',resolution=$3,revision=revision+1 WHERE id=$1 AND revision=$2 AND status='open' RETURNING id) SELECT id FROM updated",
        [id, revision, resolution],
      );
      if (!rows.length) fail(409, "REVISION_CONFLICT");
      await this.event(m, user, "report_resolved", id, resolution);
      return { id };
    });
  }
}
