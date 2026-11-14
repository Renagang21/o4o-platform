import { BUSINESS_DOCUMENT } from "./account-personal-data.js";
import {
  supplierErasureProjection,
  reviewSupplierErasure,
  detachSupplierAccount,
} from "../../modules/neture/services/supplier-account-erasure.js";
import type { EntityManager } from "typeorm";

type Db = Pick<EntityManager, "query">;
export type ErasureTable = {
  schema_name: string;
  table_name: string;
  columns: string[];
};
const quote = (value: string) => '"' + value.replace(/"/g, '""') + '"';

// Business records stay with the business. Only typed account links and the
// departing supplier's contact/payment profile are removed, never product rows.

// Only typed attribution is detached. Business body/free text and peer ownership
// remain in the residual scan; this is never an uploader-based deletion list.
const BUSINESS_ATTRIBUTION: Readonly<
  Record<string, { scope: string; fields: readonly string[] }>
> = {
  photo_transaction_invoices: {
    scope: "r.organization_id IS NOT NULL",
    fields: ["created_by", "confirmed_by"],
  },
  photo_transaction_revisions: { scope: "true", fields: ["actor_id"] },
  semi_franchise_memberships: { scope: "r.organization_id IS NOT NULL", fields: ["applied_by", "decided_by"] },
  store_products: {
    scope: "r.organization_id IS NOT NULL",
    fields: ["created_by"],
  },
  store_pop_documents: {
    scope: "r.organization_id IS NOT NULL",
    fields: ["created_by"],
  },
  store_asset_derivations: {
    scope: "r.organization_id IS NOT NULL",
    fields: ["created_by"],
  },
  o4o_asset_snapshots: {
    scope: "r.organization_id IS NOT NULL",
    fields: ["created_by"],
  },
  kpa_store_contents: {
    scope: "r.organization_id IS NOT NULL",
    fields: ["updated_by"],
  },
  store_multilingual_product_content_groups: {
    scope: "r.organization_id IS NOT NULL",
    fields: ["created_by_user_id"],
  },
  store_tablet_screen_sets: {
    scope: "r.organization_id IS NOT NULL",
    fields: ["created_by_user_id"],
  },
  store_tablet_operator_idle_selections: {
    scope: "r.organization_id IS NOT NULL",
    fields: ["selected_by_user_id"],
  },
  store_consultation_stations: {
    scope: "r.organization_id IS NOT NULL",
    fields: ["operator_user_id"],
  },
  signage_media: {
    scope: 'r."organizationId" IS NOT NULL',
    fields: ["createdByUserId"],
  },
  signage_playlists: {
    scope: 'r."organizationId" IS NOT NULL',
    fields: ["createdByUserId"],
  },
  signage_templates: {
    scope: 'r."organizationId" IS NOT NULL',
    fields: ["createdByUserId"],
  },
  signage_content_blocks: {
    scope: 'r."organizationId" IS NOT NULL',
    fields: ["createdByUserId"],
  },
  assistant_tasks: {
    scope: "r.ownership_scope='ORGANIZATION'",
    fields: ["requested_by_user_id"],
  },
  forum_post: { scope: "true", fields: ["author_id", "last_comment_by"] },
  forum_comment: { scope: "true", fields: ["author_id", "deletedBy"] },
  forum_category_requests: { scope: "true", fields: ["reviewer_id"] },
  lms_courses: { scope: "true", fields: ["instructorId"] },
  lms_events: { scope: "true", fields: ["instructorId"] },
  lms_submissions: { scope: "true", fields: ["gradedBy"] },
  media_assets: { scope: "true", fields: ["uploaded_by", "updated_by"] },
};

/** Scan the post-cleanup view. Unclassified text/JSON/files remain visible. */
export function businessErasureProjection(
  table: ErasureTable,
  alias = "r",
): string {
  const row = `to_jsonb(${alias})`;
  if (table.schema_name !== "public") return row;
  if (
    table.table_name === "organizations" &&
    table.columns.includes("created_by_user_id")
  ) {
    return `${supplierErasureProjection(table,alias)} - 'created_by_user_id'`;
  }
  if (table.table_name === "store_owner_termination_cases")
    return `${row} - 'requested_by'`;
  let projected = supplierErasureProjection(table, alias);
  const rule = BUSINESS_ATTRIBUTION[table.table_name];
  if (rule)
    for (const column of rule.fields.filter((field) =>
      table.columns.includes(field),
    )) {
      projected = `(CASE WHEN ${rule.scope.replaceAll("r.", alias + ".")} AND ${alias}.${quote(column)}::text=$1 THEN ${projected} - '${column}' ELSE ${projected} END)`;
    }
  if (table.table_name === "kyc_documents")
    projected = `(CASE WHEN ${BUSINESS_DOCUMENT.replaceAll("r.", alias + ".")} THEN ${row} - ARRAY['user_id','verified_by','fileUrl'] ELSE ${row} END)`;
  if (table.table_name === "forum_category_requests")
    projected = `(CASE WHEN ${alias}.reviewer_id::text=$1 THEN ${projected} - 'reviewer_name' ELSE ${projected} END)`;
  if (table.table_name === "forum_category_requests")
    projected = `(CASE WHEN ${alias}.requester_id::text=$1 THEN ${projected} - ARRAY['requester_id','requester_name','requester_email'] ELSE ${projected} END)`;
  return projected;
}

export async function businessErasureReviews(
  db: Db,
  userId: string,
  tables: ErasureTable[],
): Promise<string[]> {
  const has = (name: string) =>
    tables.some(
      (table) => table.schema_name === "public" && table.table_name === name,
    );
  const codes: string[] = [];
  const closurePending = has("store_owner_termination_cases")
    ? `(o."isActive"=true OR NOT EXISTS(SELECT 1 FROM store_owner_termination_cases c
        WHERE c.organization_id=o.id AND c.user_id=$1 AND c.status='purge_completed'))`
    : "true";
  // A former owner is not an owner after a sale. An employee's authorship of
  // business documents never makes the employee the owner of those documents.
  if (has("organizations") && has("organization_members")) {
    const rows = await db.query(
      `SELECT 1 FROM organization_members om JOIN organizations o ON o.id=om.organization_id
      WHERE om.user_id=$1 AND om.role='owner' AND om.left_at IS NULL AND o.type IN ('store','pharmacy') AND ${closurePending} LIMIT 1`,
      [userId],
    );
    if (rows.length) codes.push("PHARMACY_TRANSFER_OR_CLOSURE_REQUIRED");
  }
  if (has("neture_pharmacy_memberships")) {
    const rows = await db.query(
      `SELECT 1 FROM neture_pharmacy_memberships p JOIN organizations o ON o.id=p.organization_id
      WHERE p.applicant_user_id=$1 AND p.status IN ('active','suspended','terminated') AND ${closurePending} LIMIT 1`,
      [userId],
    );
    if (rows.length && !codes.includes("PHARMACY_TRANSFER_OR_CLOSURE_REQUIRED"))
      codes.push("PHARMACY_TRANSFER_OR_CLOSURE_REQUIRED");
  }
  if (has("store_owner_termination_cases")) {
    const rows = await db.query(
      `SELECT 1 FROM store_owner_termination_cases WHERE user_id=$1 AND status NOT IN ('purge_completed','cancelled') LIMIT 1`,
      [userId],
    );
    if (rows.length) codes.push("PHARMACY_CLOSURE_INCOMPLETE");
  }
  codes.push(...(await reviewSupplierErasure(db, userId, tables)));
  return codes;
}

/** Must run inside the final account-erasure transaction, after business reviews. */
export async function removeBusinessAccountLinks(
  db: Db,
  userId: string,
  tables: ErasureTable[],
) {
  await detachSupplierAccount(db, userId, tables);
  await db.query(
    `UPDATE kyc_documents r SET user_id=NULL WHERE user_id=$1 AND ${BUSINESS_DOCUMENT}`,
    [userId],
  );
  await db.query(
    `UPDATE kyc_documents SET verified_by=NULL WHERE verified_by=$1`,
    [userId],
  );
  await db.query(
    `UPDATE forum_category_requests SET reviewer_id=NULL,reviewer_name=NULL WHERE reviewer_id=$1`,
    [userId],
  );
  await db.query(
    `UPDATE forum_category_requests SET requester_id=NULL,requester_name='',requester_email='' WHERE requester_id=$1`,
    [userId],
  );
  for (const [name, rule] of Object.entries(BUSINESS_ATTRIBUTION)) {
    const table = tables.find(
      (t) => t.schema_name === "public" && t.table_name === name,
    );
    if (!table) continue;
    for (const field of rule.fields.filter((field) =>
      table.columns.includes(field),
    ))
      await db.query(
        `UPDATE public.${quote(name)} r SET ${quote(field)}=NULL WHERE ${rule.scope} AND r.${quote(field)}::text=$1`,
        [userId],
      );
  }
  for (const table of tables.filter(
    (table) => table.schema_name === "public",
  )) {
    if (
      table.table_name === "organizations" &&
      table.columns.includes("created_by_user_id")
    ) {
      await db.query(
        "UPDATE organizations SET created_by_user_id=NULL WHERE created_by_user_id=$1",
        [userId],
      );
    }
    if (table.table_name === "store_owner_termination_cases")
      await db.query(
        "UPDATE store_owner_termination_cases SET requested_by=NULL WHERE requested_by=$1",
        [userId],
      );
  }
}
