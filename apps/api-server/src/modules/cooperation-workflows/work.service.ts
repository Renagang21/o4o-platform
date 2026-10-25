import { assertOperator } from "./access.js";
import type { DataSource } from "typeorm";
import { NeturePharmacyError, rowsOf } from "../neture-pharmacy/constants.js";
import { type InboxScope } from "../contact-inquiry/inbox-scope.js";
import { recordOperation } from "../../services/operations/operation-audit.js";
import {
  requireMember,
  scopeParams,
  workScope,
  subjectSource,
  type Subject,
} from "./access.js";
import {
  assertApplicationTransition,
  assertWorkTransition,
  conflict,
  invalid,
  shortText,
  workInput,
} from "./model.js";
const missing = () =>
  new NeturePharmacyError(
    404,
    "COOPERATION_WORK_NOT_FOUND",
    "이 공간에서 이용할 수 있는 업무가 아닙니다.",
  );
export class CooperationWorkService {
  constructor(private readonly ds: DataSource) {}
  async subjects(scope: InboxScope, offset = 0) {
    const source = subjectSource(scope);
    const items = await this.ds.query(
      `SELECT * FROM (${source.sql}) subjects ORDER BY name,id LIMIT 100 OFFSET $2`,
      [...source.params, offset],
    );
    const [total] = await this.ds.query(
      `SELECT count(*)::int AS count FROM (${source.sql}) subjects`,
      source.params,
    );
    return { items, total: total.count, type: source.type };
  }
  async operatorList(scope: InboxScope, offset = 0, filter = "all") {
    const filters: Record<string, string> = {
      all: "true",
      "notice-pending":
        "w.kind='notice' AND w.state='published' AND w.required=true AND EXISTS(SELECT 1 FROM cooperation_notice_recipients r WHERE r.work_id=w.id AND r.version=w.version AND r.acknowledged_at IS NULL)",
      "activity-pending":
        "w.kind='activity' AND EXISTS(SELECT 1 FROM cooperation_activity_applications a WHERE a.work_id=w.id AND a.state='submitted')",
    };
    if (!Object.hasOwn(filters, filter)) throw invalid();
    const where = `${workScope} AND (${filters[filter]})`;
    const items = await this.ds.query(
      `SELECT w.* FROM cooperation_work_items w WHERE ${where} ORDER BY w.due_at NULLS LAST,w.updated_at DESC,w.id LIMIT 20 OFFSET $3`,
      [...scopeParams(scope), offset],
    );
    const [total] = await this.ds.query(
      `SELECT count(*)::int AS count FROM cooperation_work_items w WHERE ${where}`,
      scopeParams(scope),
    );
    return { items, total: total.count };
  }
  async save(
    scope: InboxScope,
    actor: string,
    id: string | undefined,
    body: Record<string, unknown>,
  ) {
    const input = workInput(body);
    return this.ds.transaction(async (manager) => {
      await assertOperator(manager, scope, actor);
      let previous: any;
      if (id) {
        [previous] = await manager.query(
          `SELECT * FROM cooperation_work_items WHERE ${workScope} AND id=$3 FOR UPDATE`,
          [...scopeParams(scope), id],
        );
        if (!previous) throw missing();
        if (previous.version !== body.version || previous.kind !== input.kind)
          throw conflict();
        assertWorkTransition(previous.state, input.state, input.kind);
        if (
          input.kind === "activity" &&
          previous.state !== "draft" &&
          JSON.stringify([...previous.target_ids].sort()) !==
            JSON.stringify(input.targetIds)
        )
          throw invalid(
            "모집을 시작한 활동의 대상은 변경할 수 없습니다. 별도 활동을 작성해 주세요.",
          );
      } else if (input.state !== "draft")
        throw invalid("먼저 초안을 저장한 뒤 게시·모집을 시작해 주세요.");
      const source = subjectSource(scope);
      // Recruitment freezes target identity; later membership changes must not
      // prevent operators from progressing or closing the historical activity.
      const keepsActivityTargets =
        previous?.kind === "activity" && previous.state !== "draft";
      if (input.targetIds.length && !keepsActivityTargets) {
        const [valid] = await manager.query(
          `SELECT count(*)::int AS count FROM (${source.sql}) members WHERE id=ANY($2::uuid[])`,
          [...source.params, input.targetIds],
        );
        if (valid.count !== input.targetIds.length)
          throw invalid("현재 활성 회원인 대상만 선택할 수 있습니다.");
      }
      const values = [
        input.title,
        input.body,
        input.category,
        input.priority,
        input.required,
        input.dueAt,
        input.state,
        JSON.stringify(input.targetIds),
        input.startsAt,
        input.endsAt,
        actor,
      ];
      const [saved] = id
        ? rowsOf(
            await manager.query(
              `UPDATE cooperation_work_items SET title=$4,body=$5,category=$6,priority=$7,required=$8,due_at=$9,state=$10,
        target_ids=$11::jsonb,starts_at=$12,ends_at=$13,updated_by=$14,version=version+1,updated_at=clock_timestamp()
        WHERE ${workScope} AND id=$3 RETURNING *`,
              [...scopeParams(scope), id, ...values],
            ),
          )
        : await manager.query(
            `INSERT INTO cooperation_work_items(business_id,cooperative_id,kind,title,body,category,priority,required,due_at,state,target_ids,starts_at,ends_at,created_by,updated_by)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$14) RETURNING *`,
            [...scopeParams(scope), input.kind, ...values],
          );
      await manager.query(
        `INSERT INTO cooperation_work_revisions(work_id,version,snapshot,actor_id) VALUES($1,$2,$3::jsonb,$4)`,
        [saved.id, saved.version, JSON.stringify(saved), actor],
      );
      if (input.kind === "notice" && input.state === "published") {
        const targets = await manager.query(
          `INSERT INTO cooperation_notice_recipients(work_id,version,subject_type,subject_id)
          SELECT $2,$3,$4,id FROM (${source.sql}) members WHERE cardinality($5::uuid[])=0 OR id=ANY($5::uuid[]) RETURNING subject_id`,
          [
            ...source.params,
            saved.id,
            saved.version,
            source.type,
            input.targetIds,
          ],
        );
        if (!targets.length)
          throw invalid(
            "현재 게시 대상 회원이 없습니다. 초안으로 보관해 주세요.",
          );
      }
      await recordOperation(manager, "neture", actor, "cooperation.work.save", {
        scopeKind: scope.kind,
        scopeKey: scope.key,
        id: saved.id,
        kind: input.kind,
        before: previous?.state ?? null,
        after: saved.state,
        version: saved.version,
      });
      return saved;
    });
  }
  async detail(scope: InboxScope, id: string, offset = 0) {
    const [work] = await this.ds.query(
      `SELECT * FROM cooperation_work_items WHERE ${workScope} AND id=$3`,
      [...scopeParams(scope), id],
    );
    if (!work) throw missing();
    const revisions = await this.ds.query(
      "SELECT v.version,v.snapshot,v.created_at,(SELECT count(*)::int FROM cooperation_notice_recipients r WHERE r.work_id=v.work_id AND r.version=v.version) AS total,(SELECT count(*)::int FROM cooperation_notice_recipients r WHERE r.work_id=v.work_id AND r.version=v.version AND r.acknowledged_at IS NOT NULL) AS completed FROM cooperation_work_revisions v WHERE v.work_id=$1 ORDER BY v.version DESC",
      [id],
    );
    const source = subjectSource(scope);
    const recipients =
      work.kind === "notice"
        ? await this.ds.query(
            `SELECT r.subject_id,r.subject_type,r.acknowledged_at,r.acknowledged_by,m.name FROM cooperation_notice_recipients r
      LEFT JOIN (${source.sql}) m ON m.id=r.subject_id WHERE r.work_id=$2 AND r.version=$3 ORDER BY r.acknowledged_at NULLS FIRST,r.subject_id LIMIT 100 OFFSET $4`,
            [...source.params, id, work.version, offset],
          )
        : [];
    const applications =
      work.kind === "activity"
        ? await this.ds.query(
            `SELECT a.*,m.name FROM cooperation_activity_applications a LEFT JOIN (${source.sql}) m ON m.id=a.subject_id
      WHERE a.work_id=$2 ORDER BY a.created_at DESC LIMIT 100 OFFSET $3`,
            [...source.params, id, offset],
          )
        : [];
    const [counts] = await this.ds.query(
      work.kind === "notice"
        ? `SELECT count(*)::int AS total,count(*) FILTER(WHERE acknowledged_at IS NOT NULL)::int AS completed FROM cooperation_notice_recipients WHERE work_id=$1 AND version=$2`
        : `SELECT count(*)::int AS total,count(*) FILTER(WHERE state='completed')::int AS completed FROM cooperation_activity_applications WHERE work_id=$1`,
      work.kind === "notice" ? [id, work.version] : [id],
    );
    return { work, revisions, recipients, applications, counts };
  }
  async memberList(
    scope: InboxScope,
    subject: Subject,
    noticeOffset = 0,
    activityOffset = 0,
  ) {
    const params = [...scopeParams(scope), subject.type, subject.id];
    const noticesSql = `SELECT w.id,w.kind,w.title,w.body,w.category,w.priority,w.required,w.due_at,w.version,w.updated_at,r.acknowledged_at
      FROM cooperation_work_items w JOIN cooperation_notice_recipients r ON r.work_id=w.id AND r.version=w.version
      WHERE w.${workScope.replace(" AND cooperative_id", " AND w.cooperative_id")} AND w.kind='notice' AND w.state='published'
      AND r.subject_type=$3 AND r.subject_id=$4`;
    const activitiesSql = `SELECT w.id,w.kind,w.title,w.body,w.category,w.state,w.version,w.starts_at,w.ends_at,w.due_at,
      a.id AS application_id,a.state AS application_state,a.version AS application_version,a.note,a.decision_note
      FROM cooperation_work_items w LEFT JOIN cooperation_activity_applications a ON a.work_id=w.id AND a.subject_type=$3 AND a.subject_id=$4
      WHERE w.${workScope.replace(" AND cooperative_id", " AND w.cooperative_id")} AND w.kind='activity' AND w.state<>'draft'
      AND (a.id IS NOT NULL OR (w.state<>'archived' AND (w.target_ids='[]'::jsonb OR w.target_ids ? $4::text)))`;
    const notices = await this.ds.query(
      noticesSql +
        " ORDER BY w.required DESC,w.due_at NULLS LAST,w.updated_at DESC,w.id LIMIT 50 OFFSET $5",
      [...params, noticeOffset],
    );
    const activities = await this.ds.query(
      activitiesSql + " ORDER BY w.updated_at DESC,w.id LIMIT 50 OFFSET $5",
      [...params, activityOffset],
    );
    const [noticeCounts] = await this.ds.query(
      `SELECT count(*)::int AS total,count(*) FILTER(WHERE required=true AND acknowledged_at IS NULL)::int AS pending FROM (${noticesSql}) records`,
      params,
    );
    const [activityCounts] = await this.ds.query(
      `SELECT count(*)::int AS total,count(*) FILTER(WHERE application_state='submitted')::int AS pending FROM (${activitiesSql}) records`,
      params,
    );
    return {
      notices,
      activities,
      totals: { notices: noticeCounts.total, activities: activityCounts.total },
      pending: {
        notices: noticeCounts.pending,
        applications: activityCounts.pending,
      },
    };
  }
  async acknowledge(
    scope: InboxScope,
    user: string,
    organization: string | undefined,
    id: string,
    version: unknown,
  ) {
    return this.ds.transaction(async (manager) => {
      const subject = await requireMember(
        manager,
        scope,
        user,
        organization,
        true,
      );
      const [work] = await manager.query(
        `SELECT id,version FROM cooperation_work_items WHERE ${workScope} AND id=$3 AND kind='notice' AND state='published' FOR SHARE`,
        [...scopeParams(scope), id],
      );
      if (!work) throw missing();
      if (work.version !== version) throw conflict();
      const result = rowsOf(
        await manager.query(
          `UPDATE cooperation_notice_recipients SET acknowledged_by=COALESCE(acknowledged_by,$5),acknowledged_at=COALESCE(acknowledged_at,now())
        WHERE work_id=$1 AND version=$2 AND subject_type=$3 AND subject_id=$4 RETURNING acknowledged_at`,
          [id, version, subject.type, subject.id, user],
        ),
      );
      if (!result.length) throw missing();
      return result[0];
    });
  }
  async apply(
    scope: InboxScope,
    user: string,
    organization: string | undefined,
    id: string,
    body: Record<string, unknown>,
  ) {
    const note = shortText(body.note, 2000);
    return this.ds.transaction(async (manager) => {
      const subject = await requireMember(
        manager,
        scope,
        user,
        organization,
        true,
      );
      const [work] = await manager.query(
        `SELECT * FROM cooperation_work_items WHERE ${workScope} AND id=$3 AND kind='activity' FOR UPDATE`,
        [...scopeParams(scope), id],
      );
      if (!work) throw missing();
      if (work.version !== body.version) throw conflict();
      if (
        work.state !== "recruiting" ||
        (work.due_at && new Date(work.due_at).getTime() <= Date.now()) ||
        (work.target_ids.length && !work.target_ids.includes(subject.id))
      )
        throw invalid(
          "현재 모집 중이고 신청 기한이 남은 대상 활동만 신청할 수 있습니다.",
        );
      const [existing] = await manager.query(
        "SELECT * FROM cooperation_activity_applications WHERE work_id=$1 AND subject_type=$2 AND subject_id=$3 FOR UPDATE",
        [id, subject.type, subject.id],
      );
      if (existing?.state === "submitted") return existing;
      if (
        existing &&
        (!["withdrawn", "rejected"].includes(existing.state) ||
          existing.version !== body.applicationVersion)
      )
        throw conflict();
      const [saved] = existing
        ? rowsOf(
            await manager.query(
              `UPDATE cooperation_activity_applications SET state='submitted',note=$2,decision_note='',version=version+1,submitted_by=$3,handled_by=NULL,updated_at=clock_timestamp() WHERE id=$1 RETURNING *`,
              [existing.id, note, user],
            ),
          )
        : await manager.query(
            `INSERT INTO cooperation_activity_applications(work_id,subject_type,subject_id,note,submitted_by) VALUES($1,$2,$3,$4,$5) RETURNING *`,
            [id, subject.type, subject.id, note, user],
          );
      await recordOperation(
        manager,
        "neture",
        user,
        "cooperation.activity.apply",
        {
          id,
          applicationId: saved.id,
          subjectType: subject.type,
          subjectId: subject.id,
          version: saved.version,
        },
      );
      return saved;
    });
  }
  async decide(
    scope: InboxScope,
    user: string,
    id: string,
    body: Record<string, unknown>,
    organization?: string,
  ) {
    const memberAction = body.state === "withdrawn";
    return this.ds.transaction(async (manager) => {
      if (!memberAction) await assertOperator(manager, scope, user);
      const subject = memberAction
        ? await requireMember(manager, scope, user, organization, true)
        : null;
      const [application] = await manager.query(
        `SELECT a.*,w.state AS work_state FROM cooperation_activity_applications a JOIN cooperation_work_items w ON w.id=a.work_id
        WHERE w.${workScope.replace(" AND cooperative_id", " AND w.cooperative_id")} AND a.id=$3 FOR UPDATE OF a`,
        [...scopeParams(scope), id],
      );
      if (
        !application ||
        (subject &&
          (application.subject_type !== subject.type ||
            application.subject_id !== subject.id))
      )
        throw missing();
      if (application.version !== body.version) throw conflict();
      if (subject) {
        if (application.state !== "submitted")
          throw invalid("승인 전 신청만 직접 철회할 수 있습니다.");
      } else {
        assertApplicationTransition(application.state, String(body.state));
        if (
          body.state === "completed" &&
          !["active", "ended"].includes(application.work_state)
        )
          throw invalid("진행을 시작한 활동만 완료 기록을 남길 수 있습니다.");
        if (
          body.state === "approved" &&
          !["recruiting", "active"].includes(application.work_state)
        )
          throw invalid("모집·진행 중인 활동만 참여를 승인할 수 있습니다.");
      }
      const note = shortText(body.note, 2000, body.state === "rejected");
      const [saved] = rowsOf(
        await manager.query(
          `UPDATE cooperation_activity_applications SET state=$2,decision_note=$3,handled_by=$4,version=version+1,updated_at=clock_timestamp() WHERE id=$1 RETURNING *`,
          [id, body.state, note, user],
        ),
      );
      await recordOperation(
        manager,
        "neture",
        user,
        "cooperation.activity.decide",
        {
          applicationId: id,
          before: application.state,
          after: body.state,
          version: saved.version,
        },
      );
      return saved;
    });
  }
}
