import { randomUUID } from "node:crypto";
import type { DataSource, EntityManager } from "typeorm";
import { ActionLog } from "@o4o/action-log-core";
import { demoAccountService } from "../../../services/auth/demo-account.service.js";

export const SUPPLIER_REVIEW_ITEMS = [
  "business_profile",
  "business_registration",
  "bank_statement",
  "tax_invoice",
  "mail_order_report",
  "regulated_category",
  "contact",
  "other",
] as const;
export class SupplierReviewError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
const fail = (status: number, code: string, message: string): never => {
  throw new SupplierReviewError(status, code, message);
};
const privateText = (text: string) => ({
  toPostgres: () => text,
  toJSON: () => "[redacted]",
});
export function reviewText(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    [...value.trim()].length > 2000 ||
    value.includes("\0")
  ) {
    return fail(
      400,
      "INVALID_REVIEW_NOTE",
      "내용을 1~2,000자로 입력해 주세요.",
    );
  }
  return value.trim();
}
export function reviewItems(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > SUPPLIER_REVIEW_ITEMS.length ||
    value.some((v) => !SUPPLIER_REVIEW_ITEMS.includes(v))
  )
    return fail(400, "INVALID_REVIEW_ITEMS", "보완 항목을 선택해 주세요.");
  return [...new Set(value)];
}
const uuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

/** Supplier-facing projection shared by read and submit responses. */
export const supplierReviewPublicRow = (row: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(row).filter(
      ([key]) => !["requested_by", "submitted_by", "resolved_by"].includes(key),
    ),
  );

/** Operational requests have their own row; audit logs are not the workflow state store. */
export class SupplierReviewRequestService {
  constructor(private readonly ds: DataSource) {}
  private async lockSupplier(manager: EntityManager, id: string) {
    if (!uuid(id))
      return fail(400, "INVALID_SUPPLIER_ID", "공급자 정보를 확인해 주세요.");
    const [supplier] = await manager.query(
      "SELECT id, status, user_id, organization_id FROM neture_suppliers WHERE id = $1 FOR UPDATE",
      [id],
    );
    if (!supplier)
      return fail(404, "SUPPLIER_NOT_FOUND", "공급자를 찾을 수 없습니다.");
    if (supplier.status === "INACTIVE")
      return fail(
        409,
        "SUPPLIER_INACTIVE",
        "비활성 공급자는 보완 처리할 수 없습니다.",
      );
    if (
      (await demoAccountService.isDemoAccount(supplier.user_id, manager)) ||
      (await demoAccountService.isDemoOrganization(
        supplier.organization_id,
        manager,
      ))
    )
      return fail(
        403,
        "DEMO_ACCOUNT_FORBIDDEN",
        "Demo 공급자는 변경할 수 없습니다.",
      );
    return supplier;
  }
  private async audit(
    manager: EntityManager,
    actorId: string,
    supplierId: string,
    requestId: string,
    action: string,
    version: number,
  ) {
    const meta: NonNullable<ActionLog["meta"]> = {
      supplierId,
      requestId,
      version,
    };
    await manager.getRepository(ActionLog).insert({
      service_key: "neture",
      user_id: actorId,
      organization_id: null,
      action_key: `neture.supplier.review_${action}`,
      source: "manual",
      status: "success",
      meta,
    });
  }
  async create(
    supplierId: string,
    actorId: string,
    input: Record<string, unknown>,
  ) {
    const items = reviewItems(input.items);
    const note = reviewText(input.note);
    return await this.ds.transaction(async (manager) => {
      await this.lockSupplier(manager, supplierId);
      const open = await manager.query(
        "SELECT id FROM neture_supplier_review_requests WHERE supplier_id = $1 AND resolved_at IS NULL",
        [supplierId],
      );
      if (open.length)
        return fail(
          409,
          "REVIEW_REQUEST_OPEN",
          "진행 중인 보완 요청을 먼저 확인해 주세요.",
        );
      const [row] = await manager.query(
        `INSERT INTO neture_supplier_review_requests (id, supplier_id, items, request_note, requested_by)
        VALUES ($1,$2,$3::jsonb,$4,$5) RETURNING *`,
        [
          randomUUID(),
          supplierId,
          JSON.stringify(items),
          privateText(note),
          actorId,
        ],
      );
      await this.audit(
        manager,
        actorId,
        supplierId,
        row.id,
        "requested",
        row.version,
      );
      return row;
    });
  }
  async transition(
    supplierId: string,
    requestId: string,
    actorId: string,
    action: "submit" | "resolve",
    input: Record<string, unknown>,
  ) {
    if (
      !uuid(requestId) ||
      !Number.isSafeInteger(input.version) ||
      (input.version as number) < 1
    )
      return fail(
        400,
        "INVALID_REVIEW_VERSION",
        "보완 요청을 다시 조회해 주세요.",
      );
    const note = reviewText(input.note);
    return await this.ds.transaction(async (manager) => {
      await this.lockSupplier(manager, supplierId);
      const [before] = await manager.query(
        "SELECT * FROM neture_supplier_review_requests WHERE id = $1 AND supplier_id = $2 FOR UPDATE",
        [requestId, supplierId],
      );
      if (!before)
        return fail(
          404,
          "REVIEW_REQUEST_NOT_FOUND",
          "이 공급자의 보완 요청을 찾을 수 없습니다.",
        );
      // Only requested → submitted → resolved; resolution requires the supplier's submission.
      const fromState = action === "submit" ? "requested" : "submitted";
      if (before.version !== input.version || before.state === "resolved")
        return fail(
          409,
          "REVIEW_REQUEST_CHANGED",
          "이미 처리되었거나 변경된 요청입니다. 다시 조회해 주세요.",
        );
      if (before.state !== fromState)
        return action === "resolve"
          ? fail(
              409,
              "REVIEW_REQUEST_NOT_SUBMITTED",
              "공급자가 보완 내용을 제출한 뒤 검토 완료할 수 있습니다.",
            )
          : fail(
              409,
              "REVIEW_REQUEST_CHANGED",
              "이미 처리되었거나 변경된 요청입니다. 다시 조회해 주세요.",
            );
      const columns =
        action === "submit"
          ? "state = 'submitted', response_note = $1, submitted_by = $2, submitted_at = now()"
          : "state = 'resolved', resolution_note = $1, resolved_by = $2, resolved_at = now()";
      const [row] = await manager.query(
        `WITH updated AS (UPDATE neture_supplier_review_requests SET ${columns}, version = version + 1, updated_at = now()
        WHERE id = $3 AND supplier_id = $4 AND state = $5 AND version = $6 RETURNING *) SELECT * FROM updated`,
        [
          privateText(note),
          actorId,
          requestId,
          supplierId,
          fromState,
          before.version,
        ],
      );
      if (!row)
        return fail(
          409,
          "REVIEW_REQUEST_CHANGED",
          "이미 처리되었거나 변경된 요청입니다. 다시 조회해 주세요.",
        );
      await this.audit(
        manager,
        actorId,
        supplierId,
        row.id,
        action === "submit" ? "submitted" : "resolved",
        row.version,
      );
      return row;
    });
  }
  async queue(state: unknown, page: number) {
    if (
      typeof state !== "string" ||
      !["requested", "submitted", "resolved"].includes(state) ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 10000
    )
      return fail(400, "INVALID_REVIEW_QUERY", "조회 조건을 확인해 주세요.");
    const rows = await this.ds.query(
      `SELECT r.id, r.supplier_id, r.state, r.items, r.created_at, r.submitted_at, r.updated_at,
      COALESCE(o.name, s.slug) AS supplier_name FROM neture_supplier_review_requests r JOIN neture_suppliers s ON s.id = r.supplier_id
      LEFT JOIN organizations o ON o.id = s.organization_id WHERE r.state = $1
      ORDER BY r.updated_at ASC, r.id ASC LIMIT 21 OFFSET $2`,
      [state, (page - 1) * 20],
    );
    return { items: rows.slice(0, 20), hasMore: rows.length > 20, page };
  }
  async list(supplierId: string, page: number, operator: boolean) {
    if (
      !uuid(supplierId) ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 10000
    )
      return fail(400, "INVALID_REVIEW_QUERY", "조회 조건을 확인해 주세요.");
    const [supplier] = await this.ds.query(
      "SELECT id FROM neture_suppliers WHERE id = $1",
      [supplierId],
    );
    if (!supplier)
      return fail(404, "SUPPLIER_NOT_FOUND", "공급자를 찾을 수 없습니다.");
    const rows = await this.ds.query(
      `SELECT * FROM neture_supplier_review_requests WHERE supplier_id = $1 ORDER BY created_at DESC, id DESC LIMIT 21 OFFSET $2`,
      [supplierId, (page - 1) * 20],
    );
    const [current] = await this.ds.query(
      "SELECT * FROM neture_supplier_review_requests WHERE supplier_id = $1 AND resolved_at IS NULL",
      [supplierId],
    );
    const safe = (r: Record<string, unknown>) =>
      operator ? r : supplierReviewPublicRow(r);
    // The supplier sees only its request messages, never arbitrary internal audit metadata.
    const actions = operator
      ? await this.ds.query(
          `SELECT id, action_key, user_id, created_at FROM action_logs
      WHERE service_key = 'neture' AND status = 'success' AND meta->>'supplierId' = $1
        AND action_key IN ('neture.operator.supplier_approve','neture.operator.supplier_reject','neture.operator.supplier_basic_info_update','neture.admin.supplier_approve','neture.admin.supplier_reject')
      ORDER BY created_at DESC, id DESC LIMIT 20`,
          [supplierId],
        )
      : [];
    return {
      supplierId,
      current: current ? safe(current) : null,
      requests: rows.slice(0, 20).map(safe),
      hasMore: rows.length > 20,
      page,
      actions,
    };
  }
}
