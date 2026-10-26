import type { DataSource, EntityManager } from "typeorm";

type Executor = Pick<DataSource | EntityManager, "query">;
export const STORE_PRODUCT_CONTENT_LOCALES = [
  "ko",
  "en",
  "zh",
  "ja",
  "vi",
  "th",
  "id",
] as const;
export const STORE_PRODUCT_TARGET_KINDS = ["local", "listing"] as const;
export type StoreProductTargetKind =
  (typeof STORE_PRODUCT_TARGET_KINDS)[number];

/** Same product ownership boundary as handled-products; listing service_key is not an ownership key. */
export async function storeProductContentTargetExists(
  db: Executor,
  organizationId: string,
  targetKind: StoreProductTargetKind,
  targetId: string,
  lock = false,
): Promise<boolean> {
  const suffix = lock ? " FOR SHARE" : "";
  const rows =
    targetKind === "local"
      ? await db.query(
          `SELECT 1 FROM store_local_products WHERE id=$1 AND organization_id=$2 AND is_active=true LIMIT 1${suffix}`,
          [targetId, organizationId],
        )
      : await db.query(
          `SELECT 1 FROM organization_product_listings WHERE id=$1 AND organization_id=$2 AND is_active=true LIMIT 1${suffix}`,
          [targetId, organizationId],
        );
  return rows.length > 0;
}

export interface StoreProductContentPageInput {
  title: string;
  summary: string | null;
  contentFormat: string;
  content: Record<string, unknown>;
  assets: Array<Record<string, unknown>>;
  buttons: Array<Record<string, unknown>>;
  status: string;
  isDefault: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
}

/** Caller supplies authorized group/locale and the transaction; publication policy stays with the caller. */
export async function upsertStoreProductContentPage(
  db: Executor,
  groupId: string,
  locale: string,
  input: StoreProductContentPageInput,
  userId?: string,
): Promise<void> {
  await db.query(
    `INSERT INTO store_multilingual_product_content_pages
      (group_id,locale,title,summary,content_format,content,assets,buttons,status,is_default,sort_order,metadata,created_by_user_id)
     VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12::jsonb,$13)
     ON CONFLICT(group_id,locale) DO UPDATE SET title=EXCLUDED.title,summary=EXCLUDED.summary,
      content_format=EXCLUDED.content_format,content=EXCLUDED.content,assets=EXCLUDED.assets,buttons=EXCLUDED.buttons,
      status=EXCLUDED.status,is_default=EXCLUDED.is_default,sort_order=EXCLUDED.sort_order,
      metadata=EXCLUDED.metadata,updated_at=now()`,
    [
      groupId,
      locale,
      input.title,
      input.summary,
      input.contentFormat,
      JSON.stringify(input.content),
      JSON.stringify(input.assets),
      JSON.stringify(input.buttons),
      input.status,
      input.isDefault,
      input.sortOrder,
      JSON.stringify(input.metadata),
      userId ?? null,
    ],
  );
}
