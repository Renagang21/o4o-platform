import type { DataSource } from 'typeorm';
import type { ProductCorrectionTask, ProductCorrectionProposal, ProductDescriptionRenewal } from '@o4o/types';
import type { ProductEditEvent } from './edit-renewal.service.js';
import { BATCH_TYPE, CorrectionError } from './contracts.js';
import { PROPOSAL_TYPE } from './proposal.contracts.js';
import { RENEWAL } from './periodic.contracts.js';

export type ProductWorkspaceSection = 'descriptions' | 'tasks' | 'proposals' | 'renewals' | 'edits';
const maintenance = '/admin/o4o-product-db/maintenance';
const link = (productId: string, args: Record<string, string>) =>
  `${maintenance}?${new URLSearchParams({ product: productId, ...args }).toString()}`;

/** Product-scoped, bounded, read-only projection of existing records; no new source of truth. */
export class ProductCorrectionProductWorkspace {
  constructor(private readonly db: DataSource) {}

  async detail(productId: string, section: ProductWorkspaceSection, page: number) {
    return this.db.transaction(async (db) => {
      await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
      await db.query("SET LOCAL statement_timeout='15s'");
      const products = await db.query(
        `SELECT id,name,barcode,manufacturer_name AS "manufacturerName",specification,
          regulatory_type AS "regulatoryType",status FROM product_masters WHERE id=$1`, [productId],
      );
      if (!products[0]) throw new CorrectionError('MASTER_NOT_FOUND', 404);
      let from: string;
      let order: string;
      let projection = 'value AS source';
      const params: unknown[] = [productId];
      switch (section) {
        case 'descriptions':
          from = `FROM shared_product_descriptions d WHERE master_id=$1 AND status='canonical' AND deleted_at IS NULL`;
          order = 'description_type,COALESCE(language,\'ko\'),id';
          projection = `jsonb_build_object('id',id,'descriptionType',description_type,'language',COALESCE(language,'ko'),
            'content',left(content,20000),'summary',left(summary,8000),'truncated',length(content)>20000,
            'sourceType',source_type,'sourceRefId',source_ref_id,'at',updated_at) AS source`;
          break;
        case 'tasks':
          from = `FROM settings b CROSS JOIN LATERAL jsonb_array_elements(b.value->'items') t
            WHERE b.type=$2 AND t->'product'->>'id'=$1`;
          params.push(BATCH_TYPE);
          projection = `jsonb_build_object('batchId',b.value->>'id','ruleTitle',b.value->'ruleSnapshot'->>'title',
            'ruleRevision',b.value->'ruleSnapshot'->'revision','task',t) AS source`;
          order = `t->>'updatedAt' DESC,b.key,t->>'id'`;
          break;
        default:
          from = `FROM settings WHERE type=$2 AND value->>'productId'=$1`;
          params.push({ proposals: PROPOSAL_TYPE, renewals: RENEWAL, edits: 'product_correction_edit_event' }[section]);
          order = section === 'edits' ? `value->>'at' DESC,key` : section === 'proposals'
            ? `COALESCE(value->>'appliedAt',value->>'reviewedAt',value->>'createdAt') DESC,key`
            : `value->>'updatedAt' DESC,key`;
      }
      const count = await db.query(`SELECT COUNT(*)::int AS total ${from}`, params);
      const rows = await db.query(`SELECT ${projection} ${from} ORDER BY ${order} LIMIT 10 OFFSET $${params.length + 1}`,
        [...params, (page - 1) * 10]);
      const items = rows.map(({ source }: { source: any }) => {
        if (section === 'descriptions') return {
          ...source, title: `${source.descriptionType} / ${source.language}`, state: 'canonical',
          href: `/admin/o4o-product-db/masters/${productId}`,
        };
        if (section === 'tasks') {
          const task = source.task as ProductCorrectionTask;
          return { id: task.id, title: `${source.ruleTitle} v${source.ruleRevision}`, state: task.state,
            at: task.updatedAt, notes: task.notes, sources: task.sources, nextReviewAt: task.nextReviewAt,
            followUpAt: task.followUpAt, href: link(productId, { batch: source.batchId, task: task.id }) };
        }
        if (section === 'proposals') {
          const proposal = source as ProductCorrectionProposal;
          return { id: proposal.id, title: `${proposal.ruleSnapshot.title} · 변경안 v${proposal.revision}`,
            state: proposal.appliedAt ? 'applied' : proposal.reviewedAt ? 'reviewed' : 'pending',
            at: proposal.appliedAt ?? proposal.reviewedAt ?? proposal.createdAt, notes: proposal.reviewNote,
            evidence: proposal.evidence, changes: proposal.changes,
            href: link(productId, { batch: proposal.batchId, task: proposal.taskId, proposal: proposal.id }) };
        }
        if (section === 'renewals') {
          const renewal = source as ProductDescriptionRenewal;
          return { id: renewal.id, title: `${renewal.descriptionType} / ${renewal.language} 갱신`, state: renewal.state,
            at: renewal.updatedAt, notes: renewal.notes, purposes: renewal.purposes,
            href: link(productId, { renewal: renewal.id }) };
        }
        const event = source as ProductEditEvent;
        return { id: event.id, title: event.origin === 'catalog-edit' ? '일반 상품 편집' : '관리자 설명서 저장',
          state: 'saved', at: event.at, actorId: event.actorId, changes: event.changes,
          href: `/admin/o4o-product-db/masters/${productId}` };
      });
      return { product: products[0], section, items, total: count[0].total, page, pageSize: 10 };
    });
  }
}
