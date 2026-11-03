import type { EntityManager } from "typeorm";
// Full business closure only. Service-contract termination keeps its existing inventory.
const DELETES: Readonly<Record<string, string>> = {
  semi_franchise_memberships: "organization_id",
  notifications: "organizationId",
  store_ai_insights: "organization_id",
  store_ai_product_insights: "organization_id",
  store_ai_product_snapshots: "organization_id",
  store_ai_snapshots: "organization_id",
  store_consultation_stations: "organization_id",
  store_product_description_selections: "organization_id",
  store_product_profiles: "organization_id",
  store_tablet_display_settings: "organization_id",
  store_tablet_operator_idle_selections: "organization_id",
  store_qr_scan_events: "organization_id",
  store_qr_placements: "organization_id",
  store_cart_items: "organization_id",
  store_products: "organization_id",
  store_paid_feature_entitlements: "organization_id",
  store_capabilities: "organization_id",
  store_blog_settings: "store_id",
  platform_store_payment_configs: "store_id",
  platform_store_policies: "store_id",
  platform_store_slug_history: "store_id",
  external_channel_product_links: "organization_id",
  organization_channels: "organization_id",
  tablet_interest_requests: "organization_id",
  mobile_product_drafts: "organization_id",
  assistant_procedural_patterns: "organization_id",
  assistant_tasks: "organization_id",
  assistant_work_data_consents: "organization_id",
};
const EXISTING = new Set([
  "store_pops",
  "store_blog_posts",
  "store_videos",
  "store_pop_documents",
  "organization_product_listings",
  "store_multilingual_product_content_groups",
  "signage_media",
  "signage_playlists",
  "signage_schedules",
  "platform_store_slugs",
  "store_local_products",
  "o4o_asset_snapshots",
  "kpa_store_contents",
  "store_execution_assets",
  "store_qr_codes",
  "store_playlists",
  "store_tablet_devices",
  "store_tablet_screen_sets",
  "store_tablets",
  "store_tablet_corner_contents",
  "store_asset_derivations",
]);
// Supplier/workflow references (sellerOrganizationId, applicant/target organization, service_store_id)
// are inventoried too. Their native domains must classify nonempty rows before full purge.
// A minimal identity shell supports statutory B2B records and the durable closure journal.
// Other domain rows are not presumed retained: nonempty unclassified tables block closure.
const SHELL = new Set([
  "organization_members",
  "organization_service_enrollments",
  "neture_pharmacy_memberships",
  "store_owner_termination_cases",
]);
const q = (s: string) => '"' + s.replace(/"/g, '""') + '"';
type Db = Pick<EntityManager, "query">;
export async function closureInventory(db: Db, organizationId: string) {
  const tables: {
    schema_name: string;
    table_name: string;
    column_name: string;
  }[] =
    await db.query(`SELECT n.nspname AS schema_name,c.relname AS table_name,a.attname AS column_name
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
 WHERE c.relkind='r' AND n.nspname IN ('public','neture','cosmetics') AND a.attnum>0 AND NOT a.attisdropped
 AND a.attname IN ('organization_id','organizationId','store_id','storeId','sellerOrganizationId','applicant_organization_id','target_organization_id','service_store_id') AND a.atttypid='uuid'::regtype ORDER BY n.nspname,c.relname,a.attname`);
  const items = [];
  for (const table of tables) {
    const [row] = await db.query(
      `SELECT count(*)::int AS n FROM ${q(table.schema_name)}.${q(table.table_name)} WHERE ${q(table.column_name)}=$1`,
      [organizationId],
    );
    const classified =
      table.schema_name === "public" &&
      (DELETES[table.table_name] ||
        EXISTING.has(table.table_name) ||
        SHELL.has(table.table_name));
    items.push({
      key: `${table.schema_name}.${table.table_name}`,
      count: row.n,
      classification: classified
        ? SHELL.has(table.table_name)
          ? "LIFECYCLE_SHELL"
          : "STORE_OWNED"
        : "REVIEW_REQUIRED",
    });
  }
  return items;
}
export async function purgeAdditionalClosureRows(
  db: Db,
  organizationId: string,
) {
  for (const [table, column] of Object.entries(DELETES))
    await db.query(`DELETE FROM public.${q(table)} WHERE ${q(column)}=$1`, [
      organizationId,
    ]);
}
export async function assertClosureInventory(
  db: Db,
  organizationId: string,
  final = false,
) {
  const gaps = await db.query(CLOSED_STORE_WRITER_GAPS_SQL);
  if (gaps.length)
    throw Object.assign(new Error("STORE_CLOSURE_WRITER_REVIEW_REQUIRED"), {
      code: "STORE_CLOSURE_WRITER_REVIEW_REQUIRED",
    });
  const items = await closureInventory(db, organizationId);
  const remaining = items.filter(
    (item) =>
      item.count > 0 &&
      (item.classification === "REVIEW_REQUIRED" ||
        (final && item.classification === "STORE_OWNED")),
  );
  if (remaining.length)
    throw Object.assign(new Error("STORE_CLOSURE_INVENTORY_REVIEW_REQUIRED"), {
      code: "STORE_CLOSURE_INVENTORY_REVIEW_REQUIRED",
    });
  return items;
}

/** Every owned storage pointer must have a reviewed domain manifest before rows disappear. */
export async function assertClosureStorageReviewed(
  db: Db,
  organizationId: string,
) {
  const tables: { table_name: string; column_name: string }[] = await db.query(
    `SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND column_name IN ('organization_id','organizationId','store_id','storeId') AND udt_name='uuid'`,
  );
  for (const table of tables.filter(
    (table) => DELETES[table.table_name] || EXISTING.has(table.table_name),
  )) {
    const rows = await db.query(
      `SELECT to_jsonb(r) AS payload FROM public.${q(table.table_name)} r WHERE ${q(table.column_name)}=$1`,
      [organizationId],
    );
    for (const row of rows) {
      const pointers = new Set(
        JSON.stringify(row.payload).match(
          /(?:https:\/\/storage\.googleapis\.com\/|(?:gcs|gs):\/\/)[^\s"<>\\]+/g,
        ) ?? [],
      );
      for (const url of pointers) {
        const parsed = new URL(url);
        const object =
          parsed.protocol === "https:"
            ? parsed.pathname.split("/").slice(2).join("/")
            : parsed.pathname.slice(1);
        const [known] = await db.query(
          `SELECT EXISTS(SELECT 1 FROM media_assets WHERE url=$1 OR gcs_path=$2) OR EXISTS(SELECT 1 FROM kyc_documents d JOIN organizations o ON o.metadata->'businessProfile'->>'businessRegistrationDocumentId'=d.id::text WHERE o.id=$3 AND d."fileUrl"=$1) AS known`,
          [url, object, organizationId],
        );
        if (!known.known)
          throw Object.assign(
            new Error("STORE_CLOSURE_FILE_MANIFEST_REVIEW_REQUIRED"),
            { code: "STORE_CLOSURE_FILE_MANIFEST_REVIEW_REQUIRED" },
          );
      }
    }
  }
}

/** Versioned schema must cover every direct organization writer, including future tables. */
export const CLOSED_STORE_WRITER_GAPS_SQL = `SELECT c.oid,a.attname::text FROM pg_class c
 JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
 WHERE c.relkind='r' AND n.nspname IN ('public','neture','cosmetics') AND a.attnum>0 AND NOT a.attisdropped
 AND a.attname IN ('organization_id','organizationId','store_id','storeId') AND a.atttypid='uuid'::regtype
 AND c.relname NOT IN ('store_owner_termination_cases','action_logs') AND NOT EXISTS(
 SELECT 1 FROM pg_trigger tr WHERE tr.tgrelid=c.oid AND tr.tgname='store_closure_write_fence_'||a.attname
 AND tr.tgenabled='O' AND (tr.tgtype & 23)=23 AND tr.tgnargs=1
 AND tr.tgargs=convert_to(a.attname,'UTF8')||decode('00','hex') AND tr.tgfoid=to_regproc('public.o4o_closed_pharmacy_write_fence'))
 UNION ALL SELECT to_regclass('public.organizations')::oid,'id'::text WHERE NOT EXISTS(
 SELECT 1 FROM pg_trigger tr WHERE tr.tgrelid=to_regclass('public.organizations') AND tr.tgname='store_closure_write_fence'
 AND tr.tgenabled='O' AND (tr.tgtype & 23)=23 AND tr.tgnargs=1 AND tr.tgargs=convert_to('id','UTF8')||decode('00','hex')
 AND tr.tgfoid=to_regproc('public.o4o_closed_pharmacy_write_fence'))`;
