import { notifyQualification } from './pharmacist-qualification-notifications.js';
import { assertCentralOperationMenu } from '../admin/central-operation-menu-grants.js';
import type { DataSource, EntityManager } from "typeorm";
import { getNetureMainMembershipStatus } from "../../modules/neture/services/neture-main-membership.js";
import { centralOperationRoles } from "../admin/central-operation-access.js";
import {
  OperationError,
  operationReason,
  recordOperation,
} from "../operations/operation-audit.js";

type Exec = Pick<EntityManager, "query">;
export const PHARMACIST_QUALIFICATION_STATUSES = [
  "unrequested",
  "pending",
  "approved",
  "rejected",
  "revoked",
] as const;
export async function hasApprovedPharmacist(
  db: { query(sql: string, parameters?: any[]): Promise<any[]> },
  userId: string,
): Promise<boolean> {
  const [row] = await db.query(
    `SELECT EXISTS(SELECT 1 FROM kpa_pharmacist_profiles p JOIN users u ON u.id=p.user_id
   WHERE p.user_id=$1 AND p.qualification_status='approved' AND p.license_verified=true
   AND NULLIF(BTRIM(p.license_number),'') IS NOT NULL AND p.verified_at IS NOT NULL AND p.verified_by IS NOT NULL
   AND u."isActive"=true AND u."isEmailVerified"=true AND u.status IN ('active','approved')
   AND NOT EXISTS (SELECT 1 FROM service_memberships sm WHERE sm.user_id=u.id AND sm.service_key='neture' AND sm.status IN ('suspended','withdrawn'))) AS approved`,
    [userId],
  );
  return row?.approved === true;
}
const columns = `p.user_id AS "userId",p.license_number AS "licenseNumber",p.qualification_status AS status,
 p.qualification_reason AS reason,p.verified_at AS "approvedAt",
 to_char(p.updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US') AS version`;
const denied = () =>
  new OperationError(
    403,
    "QUALIFICATION_REVIEWER_REQUIRED",
    "중앙의 약사 자격 검토 업무 위임이 필요합니다.",
  );
async function reviewer(m: Exec, actor: string, lock = false, areas = ['qualifications']) {
  const roles = await centralOperationRoles(m, actor, lock);
  if (
    !roles.some((role) =>
      ["platform:super_admin", "neture:admin", "neture:operator"].includes(
        role,
      ),
    )
  )
    throw denied();
  await assertCentralOperationMenu(m, actor, 'neture', areas.map(area => `neture.${area}`));
}
async function account(m: Exec, user: string) {
  const rows = await m.query(
    `SELECT id FROM users WHERE id=$1 AND "isActive"=true AND "isEmailVerified"=true AND status IN ('active','approved') FOR UPDATE`,
    [user],
  );
  if (
    !rows.length ||
    (await getNetureMainMembershipStatus(m, user)) !== "active"
  )
    throw new OperationError(
      403,
      "ACCOUNT_NOT_ACTIVE",
      "공통 계정의 이메일 확인과 이용 상태를 확인해 주세요.",
    );
}
// node-postgres resolves toPostgres; query error serialization only sees the redacted value.
const privateText = (value: string) => ({
  toPostgres: () => value,
  toJSON: () => "[redacted]",
});
function normalizeLicense(raw: string) {
  const value = raw.trim();
  if (
    !value ||
    value.length > 100 ||
    [...value].some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  )
    throw new OperationError(
      400,
      "INVALID_LICENSE_NUMBER",
      "면허번호를 100자 이내로 입력해 주세요.",
    );
  return value;
}
export class PharmacistQualificationService {
  constructor(private readonly db: DataSource) {}
  async mine(user: string) {
    const [row] = await this.db.query(
      `SELECT ${columns} FROM kpa_pharmacist_profiles p WHERE p.user_id=$1`,
      [user],
    );
    return (
      row ?? {
        userId: user,
        licenseNumber: null,
        status: "unrequested",
        reason: null,
        approvedAt: null,
        version: null,
      }
    );
  }
  async request(user: string, raw: string) {
    const license = normalizeLicense(raw);
    return this.db.transaction(async (m) => {
      await account(m, user);
      await m.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        privateText(`pharmacist-license:${license}`),
      ]);
      const [prior] = await m.query(
        `SELECT ${columns} FROM kpa_pharmacist_profiles p WHERE p.user_id=$1 FOR UPDATE`,
        [user],
      );
      if (
        prior?.licenseNumber === license &&
        ["pending", "approved"].includes(prior.status)
      )
        return prior;
      const [taken] = await m.query(
        `SELECT user_id FROM kpa_pharmacist_profiles WHERE BTRIM(license_number)=$1 AND user_id<>$2 AND qualification_status='approved' AND license_verified=true`,
        [privateText(license), user],
      );
      if (taken)
        throw new OperationError(
          409,
          "LICENSE_REVIEW_REQUIRED",
          "이 면허번호는 담당자 확인이 필요합니다.",
        );
      await m.query(
        `INSERT INTO kpa_pharmacist_profiles(user_id,license_number,license_verified,qualification_status)
    VALUES($1,$2,false,'pending') ON CONFLICT(user_id) DO UPDATE SET license_number=$2,license_verified=false,
    qualification_status='pending',qualification_reason=NULL,verified_at=NULL,verified_by=NULL,updated_at=now()`,
        [user, privateText(license)],
      );
      await recordOperation(
        m,
        "neture",
        user,
        "qualification.pharmacist_requested",
        { targetUserId: user },
      );
      await notifyQualification(m,user,'pending',true);
      const [row] = await m.query(
        `SELECT ${columns} FROM kpa_pharmacist_profiles p WHERE p.user_id=$1`,
        [user],
      );
      return row;
    });
  }
  async list(actor: string, status: string, page: number, search = "", directory = false) {
    await reviewer(this.db, actor, false, directory ? ['members'] : ['qualifications']);
    if (status !== "all" && !PHARMACIST_QUALIFICATION_STATUSES.includes(status as any))
      throw new OperationError(
        400,
        "INVALID_STATUS",
        "검토 상태를 확인해 주세요.",
      );
    const offset =
      (Math.max(1, Math.min(100000, Math.floor(page) || 1)) - 1) * 20;
    const query = search.trim().slice(0, 100);
    const matches = `($1='' OR u.id::text=$1 OR strpos(lower(COALESCE(u.name,'')),lower($1))>0 OR strpos(lower(COALESCE(u.email,'')),lower($1))>0)`;
    const grouped: Array<{ status: string; count: string | number }> = await this.db.query(
      `SELECT COALESCE(p.qualification_status,'unrequested') AS status,COUNT(*) AS count
       FROM users u LEFT JOIN kpa_pharmacist_profiles p ON p.user_id=u.id
       WHERE ${matches} GROUP BY COALESCE(p.qualification_status,'unrequested')`,
      [query],
    );
    const counts: Record<string, number> = { all: 0 };
    for (const key of PHARMACIST_QUALIFICATION_STATUSES) counts[key] = 0;
    for (const group of grouped) {
      const count = Number(group.count);
      counts[group.status] = count;
      counts.all += count;
    }
    const selection = directory ? columns.replace('p.license_number AS "licenseNumber"','NULL::text AS "licenseNumber"').replace('p.qualification_reason AS reason','NULL::text AS reason').replace('p.verified_at AS "approvedAt"','NULL::timestamp AS "approvedAt"') : columns;
    const rows = await this.db.query(
      `SELECT ${selection.replace('p.user_id AS "userId"', 'u.id AS "userId"').replace('p.qualification_status AS status', "COALESCE(p.qualification_status,'unrequested') AS status")},
       COALESCE(NULLIF(u.name,''),'회원') AS name,u.email,u.status AS "accountStatus"
       FROM users u LEFT JOIN kpa_pharmacist_profiles p ON p.user_id=u.id
       WHERE ${matches} AND ($2='all' OR COALESCE(p.qualification_status,'unrequested')=$2)
       ORDER BY p.updated_at DESC NULLS LAST,u.id LIMIT 21 OFFSET $3`,
      [query, status, offset],
    );
    return { items: rows.slice(0, 20), hasNext: rows.length > 20, counts };
  }
  async decide(
    actor: string,
    target: string,
    input: {
      action: "approve" | "reject" | "revoke";
      reason: string;
      version: string;
      licenseEvidenceChecked?: boolean;
    },
  ) {
    const reason = operationReason(input.reason);
    if (actor === target && input.action === "approve")
      throw new OperationError(
        403,
        "SELF_QUALIFICATION_APPROVAL_FORBIDDEN",
        "본인의 자격 승인은 다른 검토 담당자에게 요청해 주세요.",
      );
    return this.db.transaction(async (m) => {
      await reviewer(m, actor, true);
      if (input.action === "approve") await account(m, target);
      else if (
        !(
          await m.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [target])
        ).length
      )
        throw new OperationError(
          404,
          "QUALIFICATION_NOT_FOUND",
          "대상 계정을 찾을 수 없습니다.",
        );
      const [snapshot] = await m.query(
        `SELECT license_number FROM kpa_pharmacist_profiles WHERE user_id=$1`,
        [target],
      );
      if (!snapshot)
        throw new OperationError(
          404,
          "QUALIFICATION_NOT_FOUND",
          "자격 신청을 찾을 수 없습니다.",
        );
      const license =
        input.action === "approve"
          ? normalizeLicense(snapshot.license_number ?? "")
          : (snapshot.license_number ?? "").trim();
      if (license)
        await m.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
          privateText(`pharmacist-license:${license}`),
        ]);
      const [current] = await m.query(
        `SELECT ${columns} FROM kpa_pharmacist_profiles p WHERE p.user_id=$1 FOR UPDATE`,
        [target],
      );
      if (!current || current.version !== input.version)
        throw new OperationError(
          409,
          "QUALIFICATION_CHANGED",
          "신청 정보가 변경되었습니다. 다시 조회한 뒤 검토해 주세요.",
        );
      if (input.action === "approve" && input.licenseEvidenceChecked !== true)
        throw new OperationError(
          400,
          "LICENSE_EVIDENCE_REQUIRED",
          "면허 근거를 별도로 확인한 뒤 승인해 주세요.",
        );
      const transitions = {
        approve: ["pending", "unrequested", "rejected", "revoked"],
        reject: ["pending", "unrequested"],
        revoke: ["approved"],
      };
      if (!transitions[input.action].includes(current.status))
        throw new OperationError(
          409,
          "INVALID_TRANSITION",
          "현재 상태에서 처리할 수 없습니다.",
        );
      if (input.action === "approve") {
        const duplicate = await m.query(
          `SELECT user_id FROM kpa_pharmacist_profiles WHERE user_id<>$1 AND BTRIM(license_number)=$2 AND qualification_status='approved' AND license_verified=true`,
          [target, privateText(license)],
        );
        if (duplicate.length)
          throw new OperationError(
            409,
            "LICENSE_REVIEW_REQUIRED",
            "이 면허번호는 이미 승인되어 담당자 확인이 필요합니다.",
          );
      }
      const approved = input.action === "approve";
      const status = approved
        ? "approved"
        : input.action === "reject"
          ? "rejected"
          : "revoked";
      await m.query(
        `UPDATE kpa_pharmacist_profiles SET qualification_status=$2,qualification_reason=$3,
    license_verified=$4,verified_at=CASE WHEN $4 THEN now() ELSE NULL END,
    verified_by=CASE WHEN $4 THEN $5::uuid ELSE NULL END,updated_at=now() WHERE user_id=$1`,
        [target, status, privateText(reason), approved, actor],
      );
      await recordOperation(
        m,
        "neture",
        actor,
        `qualification.pharmacist_${status}`,
        {
          targetUserId: target,
          previous: current.status,
          next: status,
          reason,
        },
      );
      await notifyQualification(m,target,status);
      const [row] = await m.query(
        `SELECT ${columns} FROM kpa_pharmacist_profiles p WHERE p.user_id=$1`,
        [target],
      );
      return row;
    });
  }
}
