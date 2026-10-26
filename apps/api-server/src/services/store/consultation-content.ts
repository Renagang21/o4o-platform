import { createHash } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { z } from 'zod';
import { KpaStoreContent } from '../../routes/kpa/entities/kpa-store-content.entity.js';
import { sanitizeRichDescriptionHtml, isBlankRichDescriptionHtml } from '../../modules/neture/utils/sanitize-description-html.util.js';
import type { ContentResult, DirectContentView, ProductRefPlan } from './store-content.service.js';
const product = z.object({ sourceType: z.enum(['listing', 'local']), sourceId: z.string().uuid(), name: z.string().max(500) }).strict();
const text = z.string().max(20000), source = z.string().max(1000);
export const consultationSchema = z.object({ version: z.literal(1), product,
  language: z.enum(['ko', 'en', 'ja', 'zh']), assist: z.object({
    purpose: z.enum(['professional', 'ai-support', 'consumer-qr']), facts: text, factSource: source,
    factsReviewed: z.boolean(), reference: text, referenceSource: source, reviewed: z.boolean(),
  }).strict(),
}).strict();
function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object' && !(value instanceof Date)) return Object.fromEntries(Object.keys(value).sort((a, b) => a.localeCompare(b, 'en')).map(k => [k, ordered((value as Record<string, unknown>)[k])]));
  return value;
}
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(ordered(v))).digest('hex');
export function directContentRevision(row: KpaStoreContent): string {
  return hash({ title: row.title, content: row.content_json, tags: row.tags, updated: row.updated_at });
}
export const hasConsultation = (json: unknown) => !!json && typeof json === 'object' && Object.hasOwn(json, 'productConsultation');
const fail = (code: string, message: string, status = 409): ContentResult<DirectContentView> => ({ ok: false, code, message, status });
interface Dependencies {
  prepare: (db: EntityManager, org: string, ref: unknown) => Promise<{ ok: boolean; plan?: ProductRefPlan }>;
  link: (db: EntityManager, org: string, id: string, plan: ProductRefPlan) => Promise<void>;
  view: (row: KpaStoreContent) => DirectContentView;
}
/** Uses existing rows/JSON only. Content and its actual product link commit or roll back together. */
export async function saveConsultationContent(db: DataSource, org: string, actor: string, mode: 'create' | 'update', id: string, raw: unknown, deps: Dependencies): Promise<ContentResult<DirectContentView>> {
  const parsed = z.object({ title: z.string().trim().min(1).max(200), tags: z.array(z.string().max(30)).max(20).default([]),
    contentJson: z.object({ html: z.string().max(200000), productConsultation: consultationSchema }).passthrough(),
    productRef: product.omit({ name: true }).optional(), clientContentId: z.string().uuid().optional(), expectedRevision: z.string().length(64).optional(),
  }).strict().safeParse(raw);
  if (!parsed.success || !z.string().uuid().safeParse(id).success) return fail('INVALID_CONSULTATION', '상담자료의 상품·목적·언어·본문을 확인해 주세요.', 400);
  const input = parsed.data, context = input.contentJson.productConsultation;
  if (input.clientContentId && input.clientContentId !== id) return fail('INVALID_CONSULTATION', '자료 식별자가 일치하지 않습니다.', 400);
  const html = sanitizeRichDescriptionHtml(input.contentJson.html);
  if (isBlankRichDescriptionHtml(html)) return fail('EMPTY_CONSULTATION', '저장할 본문을 입력해 주세요.', 400);
  if ((context.assist.factsReviewed && (!context.assist.facts.trim() || !context.assist.factSource.trim())) ||
    (context.assist.reviewed && (!context.assist.reference.trim() || !context.assist.referenceSource.trim()))) return fail('INVALID_CONSULTATION', '검수한 근거의 본문과 출처가 필요합니다.', 400);
  if (input.productRef && (input.productRef.sourceId !== context.product.sourceId || input.productRef.sourceType !== context.product.sourceType)) return fail('INVALID_PRODUCT_REF', '상품 연결과 작성 맥락이 다릅니다.', 400);
  const fingerprint = hash({ title: input.title, tags: input.tags, html, context });
  return await db.transaction(async manager => {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`consultation-content:${id}`]);
    const repo = manager.getRepository(KpaStoreContent);
    const row = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (row && (row.organization_id !== org || row.source_type !== 'direct')) return fail('CONTENT_CONFLICT', '저장 대상을 다시 확인해 주세요.');
    const table = context.product.sourceType === 'local' ? 'store_local_products' : 'organization_product_listings';
    const active = await manager.query(`SELECT id FROM ${table} WHERE id=$1 AND organization_id=$2 AND is_active=true FOR SHARE`, [context.product.sourceId, org]);
    if (!active.length) return fail('INVALID_PRODUCT_REF', '현재 매장의 활성 상품을 선택해 주세요.', 403);
    const prepared = await deps.prepare(manager, org, context.product);
    if (!prepared.ok || prepared.plan?.action !== 'set') return fail('INVALID_PRODUCT_REF', '현재 매장에서 상품을 찾을 수 없습니다.', 403);
    if (mode === 'create' && row) {
      const origin = row.source_metadata?.consultationCreation as { actor?: string; fingerprint?: string } | undefined;
      if (origin?.actor !== actor || origin.fingerprint !== fingerprint) return fail('CONTENT_CONFLICT', '이미 저장된 자료가 있습니다. 최신 내용을 비교해 주세요.');
      return { ok: true, data: deps.view(row) };
    }
    if (mode === 'update') {
      const conflict = await updateConflict(manager, row, org, id, input.expectedRevision, context.product);
      if (conflict) return conflict;
    }
    const contentJson = { ...row?.content_json, ...input.contentJson, html, productConsultation: context };
    delete (contentJson as Record<string, unknown>).blocks;
    const saved = await repo.save(repo.create({ ...row, id, organization_id: org, source_type: 'direct', snapshot_id: null,
      title: input.title, tags: input.tags, content_json: contentJson,
      updated_by: actor, ...(row ? {} : { author_role: 'store' as const, workspace_status: 'draft' as const, source_metadata: { consultationCreation: { actor, fingerprint } } }),
    }));
    await deps.link(manager, org, id, prepared.plan);
    return { ok: true, data: deps.view(saved) };
  });
}

async function updateConflict(manager: EntityManager, row: KpaStoreContent | null, org: string, id: string,
  expected: string | undefined, productRef: z.infer<typeof product>): Promise<ContentResult<DirectContentView> | undefined> {
  if (!row) return fail('NOT_FOUND', '자료를 찾을 수 없습니다.', 404);
  if (!expected || directContentRevision(row) !== expected) return fail('CONTENT_CONFLICT', '다른 화면에서 변경됐습니다. 최신 내용을 비교해 주세요.');
  const links = await manager.query(`SELECT product_source_type,product_source_id FROM kpa_store_content_product_links WHERE organization_id=$1 AND content_id=$2 AND link_type='product_description' FOR UPDATE`, [org, id]);
  if (!links.some((link: { product_source_type: string; product_source_id: string }) => link.product_source_type === productRef.sourceType && link.product_source_id === productRef.sourceId)) return fail('PRODUCT_LINK_CHANGED', '상품 연결이 변경됐습니다. 상품에서 자료를 다시 열어 주세요.');
}
