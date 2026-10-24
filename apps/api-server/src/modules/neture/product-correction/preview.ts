import { createHash } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import type {
  ProductCorrectionMatch,
  ProductCorrectionPreview,
  ProductCorrectionRule,
  ProductCorrectionScope,
} from '@o4o/types';
import { CorrectionError } from './contracts.js';

type Reader = Pick<DataSource | EntityManager, 'query'>;
export const PAGE_SIZE = 25;
/** Fixed SQL operators/columns only. Criteria text never becomes executable SQL or a regular expression. */
export function previewQuery(
  rule: ProductCorrectionRule,
  scope: ProductCorrectionScope,
  selectedIds?: string[],
) {
  const params: unknown[] = [rule.descriptionType, rule.language];
  const bind = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const where = ["m.status = 'ACTIVE'"];
  if (rule.regulatoryTypes.length)
    where.push(`m.regulatory_type = ANY(${bind(rule.regulatoryTypes)}::text[])`);
  if (scope.search)
    where.push(
      `(position(lower(${bind(scope.search)}) in lower(m.name)) > 0 OR m.barcode = $${params.length})`,
    );
  if (selectedIds) where.push(`m.id = ANY(${bind(selectedIds)}::uuid[])`);
  const c = rule.check;
  switch (c.kind) {
    case 'missing_field': {
      const column = {
        manufacturer_name: 'manufacturer_name',
        specification: 'specification',
        barcode: 'barcode',
      }[c.field];
      if (!column) throw new CorrectionError('INVALID_FIELD');
      where.push(`NULLIF(trim(m.${column}), '') IS NULL`);
      break;
    }
    case 'missing_description':
      where.push('d.id IS NULL');
      break;
    case 'stale_description':
      where.push(`d.updated_at < NOW() - ${bind(c.days)}::integer * INTERVAL '1 day'`);
      break;
    case 'text': {
      const clauses = c.terms.map((term) => `position(lower(${bind(term)}) in lower(d.content)) > 0`);
      where.push(`(${clauses.join(c.match === 'all' ? ' AND ' : ' OR ')})`);
      break;
    }
    case 'copied_b2b':
      where.push(`EXISTS (SELECT 1 FROM shared_product_descriptions b JOIN shared_product_descriptions s ON s.master_id=b.master_id
        AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL
        AND COALESCE(s.language,'ko')=$2 AND s.content=b.content
        WHERE b.master_id=m.id AND b.description_type='B2B' AND b.status='canonical' AND b.deleted_at IS NULL
        AND COALESCE(b.language,'ko')=$2)`);
      break;
    case 'manual':
      break;
    default:
      throw new CorrectionError('INVALID_CHECK');
  }
  const from = `FROM product_masters m LEFT JOIN LATERAL (
    SELECT id,content,updated_at,source_type,source_ref_id FROM shared_product_descriptions
    WHERE master_id=m.id AND description_type=$1 AND COALESCE(language,'ko')=$2
      AND status='canonical' AND deleted_at IS NULL ORDER BY updated_at DESC,id LIMIT 1
  ) d ON true WHERE ${where.join(' AND ')}`;
  return { from, params };
}
export async function preview(
  db: Reader,
  rule: ProductCorrectionRule,
  scope: ProductCorrectionScope,
  selectedIds?: string[],
): Promise<ProductCorrectionPreview> {
  if (!rule.enabled) throw new CorrectionError('RULE_DISABLED', 409);
  const { from, params } = previewQuery(rule, scope, selectedIds);
  const count = await db.query(`SELECT COUNT(*)::int AS total ${from}`, params);
  const limit = selectedIds ? selectedIds.length : PAGE_SIZE;
  const offset = selectedIds ? 0 : (scope.page - 1) * PAGE_SIZE;
  const rows = await db.query(
    `SELECT m.id,m.name,m.regulatory_type,m.manufacturer_name,m.specification,m.barcode,
    d.id AS description_id,d.updated_at AS description_updated_at,d.source_type,d.source_ref_id,COALESCE(d.content,'') AS content
    ${from} ORDER BY m.name,m.id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );
  const reason = {
    missing_field: '기본 정보 누락',
    missing_description: '해당 유형·언어 설명서 없음',
    stale_description: '재확인 주기 경과',
    text: '기준의 확인 문구 포함',
    copied_b2b: 'STORE·B2B 본문 동일',
    manual: '관리자 수동 검토 대상',
  }[rule.check.kind];
  const items: ProductCorrectionMatch[] = rows.map((r: Record<string, unknown>) => {
    const product = {
      id: String(r.id),
      name: String(r.name),
      regulatoryType: String(r.regulatory_type),
      manufacturerName: r.manufacturer_name as string | null,
      specification: r.specification as string | null,
      barcode: r.barcode as string | null,
      descriptionId: r.description_id as string | null,
      descriptionUpdatedAt: r.description_updated_at
        ? new Date(r.description_updated_at as string).toISOString()
        : null,
      sourceType: r.source_type as string | null,
      sourceRefId: r.source_ref_id as string | null,
    };
    const content = String(r.content ?? '');
    return {
      ...product,
      sourceContent: content.slice(0, 20000),
      sourceTruncated: content.length > 20000,
      fingerprint: createHash('sha256')
        .update(JSON.stringify({ ...product, content }))
        .digest('hex'),
      reason,
    };
  });
  return {
    ruleRevision: rule.revision,
    total: Number(count[0].total),
    page: scope.page,
    pageSize: PAGE_SIZE,
    items,
  };
}
