import { createHash, randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type {
  ProductCorrectionEvidence,
  ProductCorrectionBatch,
  ProductCorrectionContext,
  ProductCorrectionField,
  ProductCorrectionProposal,
  ProductCorrectionValue,
} from '@o4o/types';
import { batchKey, BATCH_TYPE, CorrectionError } from './contracts.js';
import { read, insert, replace, type Db } from './records.js';
import {
  applySchema,
  proposalSchema,
  reviewSchema,
  proposalKey,
  PROPOSAL_TYPE,
  PROPOSAL_VERSION_TYPE,
} from './proposal.contracts.js';
import { enqueueDescriptionRenewals } from './renewal.service.js';
import { sanitizeDescriptionHtml } from '../utils/sanitize-description-html.util.js';

const columns = {
  name: 'name',
  brandName: 'brand_name',
  specification: 'specification',
  originCountry: 'origin_country',
  tags: 'tags',
} as const;
function unique(values: string[]) {
  return new Set(values).size === values.length;
}
function conflict(condition: boolean, code = 'PROPOSAL_CHANGED') {
  if (condition) throw new CorrectionError(code, 409);
}
export class ProductCorrectionProposalService {
  constructor(private db: DataSource) {}
  private async scope(batchId: string, taskId: string, db: Db = this.db) {
    const batch = await read<ProductCorrectionBatch>(db, batchKey(batchId), BATCH_TYPE);
    const task = batch.items.find((i) => i.id === taskId);
    if (!task) throw new CorrectionError('TASK_NOT_FOUND', 404);
    return { batch, task };
  }
  private async source(
    batch: ProductCorrectionBatch,
    taskId: string,
    db: Db,
    lock = false,
  ): Promise<ProductCorrectionContext> {
    await db.query("SET LOCAL statement_timeout='30s'");
    const task = batch.items.find((i) => i.id === taskId)!;
    const masters = await db.query(
      `SELECT to_jsonb(m) AS source FROM product_masters m WHERE id=$1${lock ? ' FOR UPDATE' : ''}`,
      [task.product.id],
    );
    if (!masters[0]) throw new CorrectionError('MASTER_NOT_FOUND', 404);
    const master = masters[0].source;
    if (master.status !== 'ACTIVE') throw new CorrectionError('PRODUCT_NOT_ACTIVE', 409);
    const descriptions = await db.query(
      `SELECT to_jsonb(d) AS source FROM shared_product_descriptions d
      WHERE master_id=$1 AND description_type=$2 AND COALESCE(language,'ko')=$3 AND status='canonical' AND deleted_at IS NULL
      ORDER BY updated_at DESC,id LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
      [task.product.id, batch.ruleSnapshot.descriptionType, batch.ruleSnapshot.language],
    );
    const description = descriptions[0]?.source ?? null;
    return {
      fingerprint: createHash('sha256')
        .update(JSON.stringify({ master, description }))
        .digest('hex'),
      descriptionId: description?.id ?? null,
      descriptionSummary: description?.summary ?? null,
      values: {
        name: master.name,
        brandName: master.brand_name,
        specification: master.specification,
        originCountry: master.origin_country,
        tags: master.tags,
        descriptionContent: description?.content ?? '',
      },
    };
  }
  async context(batchId: string, taskId: string) {
    return this.db.transaction(async (db) => {
      const { batch } = await this.scope(batchId, taskId, db);
      return this.source(batch, taskId, db, true);
    });
  }
  async list(batchId: string, taskId: string) {
    await this.scope(batchId, taskId);
    const rows = await this.db.query(
      `SELECT value FROM settings WHERE type=$1 AND value->>'batchId'=$2 AND value->>'taskId'=$3 ORDER BY value->>'createdAt' DESC,key DESC LIMIT 30`,
      [PROPOSAL_TYPE, batchId, taskId],
    );
    return rows.map((r: { value: ProductCorrectionProposal }) => r.value);
  }
  async queue(filter: 'all' | 'pending' | 'reviewed' | 'applied' | 'failed', page: number) {
    const condition = {
      all: 'true',
      pending: "value->>'reviewedAt' IS NULL AND value->>'appliedAt' IS NULL",
      reviewed: "value->>'reviewedAt' IS NOT NULL AND value->>'appliedAt' IS NULL",
      applied: "value->>'appliedAt' IS NOT NULL",
      failed:
        "value->>'appliedAt' IS NULL AND EXISTS (SELECT 1 FROM settings a WHERE a.type='product_correction_apply_attempt' AND a.value->>'proposalId'=settings.value->>'id')",
    }[filter];
    const where = `FROM settings WHERE type=$1 AND ${condition}`;
    const counts = await this.db.query(`SELECT COUNT(*)::int AS total ${where}`, [PROPOSAL_TYPE]);
    const rows = await this.db.query(
      `SELECT value->>'id' AS id,value->>'batchId' AS "batchId",value->>'taskId' AS "taskId",
      value->'baseline'->'values'->>'name' AS "productName",value->>'createdAt' AS "createdAt",
      value->>'reviewedAt' AS "reviewedAt",value->>'appliedAt' AS "appliedAt" ${where}
      ORDER BY value->>'createdAt' DESC,key DESC LIMIT 10 OFFSET $2`,
      [PROPOSAL_TYPE, (page - 1) * 10],
    );
    return {
      items: rows,
      total: counts[0].total as number,
      page,
      pageSize: 10,
    };
  }
  async proposal(id: string) {
    const proposal = await read<ProductCorrectionProposal>(this.db, proposalKey(id), PROPOSAL_TYPE);
    await this.scope(proposal.batchId, proposal.taskId);
    return proposal;
  }
  async versions(id: string) {
    await read(this.db, proposalKey(id), PROPOSAL_TYPE);
    const rows = await this.db.query(
      `SELECT value FROM settings WHERE type=$1 AND value->>'id'=$2 ORDER BY (value->>'revision')::int DESC LIMIT 50`,
      [PROPOSAL_VERSION_TYPE, id],
    );
    return rows.map((r: { value: ProductCorrectionProposal }) => r.value);
  }
  private async save(db: Db, proposal: ProductCorrectionProposal, fresh = false) {
    if (fresh) await insert(db, proposalKey(proposal.id), PROPOSAL_TYPE, proposal);
    else await replace(db, proposalKey(proposal.id), PROPOSAL_TYPE, proposal);
    await insert(
      db,
      `${proposalKey(proposal.id)}:version:${proposal.revision}`,
      PROPOSAL_VERSION_TYPE,
      proposal,
    );
    return proposal;
  }
  async create(batchId: string, taskId: string, input: unknown, actor: string) {
    const data = proposalSchema.parse(input) as {
      fingerprint: string;
      evidence: ProductCorrectionEvidence[];
      changes: Array<{
        field: ProductCorrectionField;
        after: ProductCorrectionValue;
        reason: string;
        evidenceIds: string[];
      }>;
    };
    if (!unique(data.evidence.map((e) => e.id)) || !unique(data.changes.map((c) => c.field)))
      throw new CorrectionError('DUPLICATE_FIELD_OR_EVIDENCE');
    return this.db.transaction(async (db) => {
      const { batch, task } = await this.scope(batchId, taskId, db);
      const baseline = await this.source(batch, taskId, db, true);
      conflict(baseline.fingerprint !== data.fingerprint, 'PRODUCT_SOURCE_CHANGED');
      const changes = data.changes.map((change) => {
        let after: ProductCorrectionValue = change.after;
        if (change.field === 'tags') {
          if (!Array.isArray(after) || !unique(after))
            throw new CorrectionError('INVALID_FIELD_VALUE');
        } else {
          if (after !== null && typeof after !== 'string')
            throw new CorrectionError('INVALID_FIELD_VALUE');
          if (typeof after === 'string') after = after.trim();
          const max = {
            name: 255,
            brandName: 255,
            specification: 8000,
            originCountry: 100,
            descriptionContent: 200000,
          }[change.field];
          if (typeof after === 'string' && after.length > max)
            throw new CorrectionError('INVALID_FIELD_VALUE');
          if (['name', 'descriptionContent'].includes(change.field) && !after)
            throw new CorrectionError('INVALID_FIELD_VALUE');
          if (change.field === 'descriptionContent') {
            after = sanitizeDescriptionHtml(after as string);
            if (!after) throw new CorrectionError('INVALID_FIELD_VALUE');
          }
        }
        if (JSON.stringify(baseline.values[change.field]) === JSON.stringify(after))
          throw new CorrectionError('UNCHANGED_FIELD');
        if (
          !unique(change.evidenceIds) ||
          change.evidenceIds.some(
            (id) => !data.evidence.some((e) => e.id === id && e.fields.includes(change.field)),
          )
        )
          throw new CorrectionError('INVALID_EVIDENCE_LINK');
        return {
          ...change,
          after,
          before: baseline.values[change.field],
          decision: 'pending' as const,
        };
      });
      return this.save(
        db,
        {
          id: randomUUID(),
          batchId,
          taskId,
          productId: task.product.id,
          revision: 1,
          ruleSnapshot: batch.ruleSnapshot,
          baseline,
          evidence: data.evidence,
          changes,
          createdAt: new Date().toISOString(),
          createdBy: actor,
        },
        true,
      );
    });
  }
  private checkEvidence(proposal: ProductCorrectionProposal, fields: ProductCorrectionField[]) {
    for (const change of proposal.changes.filter((c) => fields.includes(c.field))) {
      if (
        !change.evidenceIds.some((id) =>
          proposal.evidence.some(
            (e) =>
              e.id === id &&
              e.status === 'confirmed' &&
              e.fields.includes(change.field) &&
              (change.field === 'descriptionContent' || e.kind === 'product-fact'),
          ),
        )
      )
        throw new CorrectionError('CONFIRMED_EVIDENCE_REQUIRED');
    }
  }
  async review(id: string, input: unknown, actor: string) {
    const data = reviewSchema.parse(input);
    return this.db.transaction(async (db) => {
      const proposal = await read<ProductCorrectionProposal>(
        db,
        proposalKey(id),
        PROPOSAL_TYPE,
        true,
      );
      conflict(proposal.revision !== data.revision);
      conflict(Boolean(proposal.appliedAt), 'ALREADY_APPLIED');
      if (
        !unique(data.decisions.map((d) => d.field)) ||
        data.decisions.length !== proposal.changes.length ||
        data.decisions.some((d) => !proposal.changes.some((c) => c.field === d.field))
      )
        throw new CorrectionError('INVALID_REVIEW_SELECTION');
      this.checkEvidence(
        proposal,
        data.decisions.filter((d) => d.decision === 'approved').map((d) => d.field),
      );
      proposal.changes.forEach((c) => {
        c.decision = data.decisions.find((d) => d.field === c.field)!.decision;
      });
      Object.assign(proposal, {
        revision: proposal.revision + 1,
        reviewedBy: actor,
        reviewedAt: new Date().toISOString(),
        reviewNote: data.note,
      });
      return this.save(db, proposal);
    });
  }
  async attempts(id: string) {
    await read(this.db, proposalKey(id), PROPOSAL_TYPE);
    const rows = await this.db.query(
      "SELECT value FROM settings WHERE type='product_correction_apply_attempt' AND value->>'proposalId'=$1 ORDER BY value->>'at' DESC,key DESC LIMIT 20",
      [id],
    );
    return rows.map((r: { value: unknown }) => r.value);
  }
  async apply(id: string, input: unknown, actor: string) {
    const data = applySchema.parse(input);
    if (!unique(data.fields)) throw new CorrectionError('DUPLICATE_FIELD_OR_EVIDENCE');
    try {
      return await this.db.transaction(async (db) => {
        await db.query("SET LOCAL statement_timeout='30s'");
        const proposal = await read<ProductCorrectionProposal>(
          db,
          proposalKey(id),
          PROPOSAL_TYPE,
          true,
        );
        if (proposal.appliedAt) {
          conflict(
            proposal.revision !== data.revision + 1 ||
              JSON.stringify([...proposal.appliedFields!].sort()) !==
                JSON.stringify([...data.fields].sort()),
            'ALREADY_APPLIED',
          );
          return proposal;
        }
        conflict(proposal.revision !== data.revision);
        if (
          !proposal.reviewedAt ||
          data.fields.some(
            (field) =>
              !proposal.changes.some((c) => c.field === field && c.decision === 'approved'),
          )
        )
          throw new CorrectionError('APPROVAL_REQUIRED');
        this.checkEvidence(proposal, data.fields);
        const { batch } = await this.scope(proposal.batchId, proposal.taskId, db);
        const current = await this.source(batch, proposal.taskId, db, true);
        conflict(current.fingerprint !== proposal.baseline.fingerprint, 'PRODUCT_SOURCE_CHANGED');
        const selected = proposal.changes.filter((c) => data.fields.includes(c.field));
        const basic = selected.filter((c) => c.field !== 'descriptionContent');
        if (basic.length) {
          const args: unknown[] = [proposal.productId];
          const sets = basic.map((c) => {
            args.push(c.field === 'tags' ? JSON.stringify(c.after) : c.after);
            return `${columns[c.field as keyof typeof columns]}=$${args.length}${c.field === 'tags' ? '::jsonb' : ''}`;
          });
          await db.query(
            `UPDATE product_masters SET ${sets.join(',')},updated_at=NOW() WHERE id=$1`,
            args,
          );
        }
        let descriptionId = current.descriptionId;
        const description = selected.find((c) => c.field === 'descriptionContent');
        if (description) {
          // Demote only the locked, checked canonical. A newly promoted candidate must cause a unique conflict, never be silently replaced.
          if (current.descriptionId)
            await db.query(
              `UPDATE shared_product_descriptions SET status='candidate',updated_by=$4,updated_at=NOW()
          WHERE master_id=$1 AND description_type=$2 AND COALESCE(language,'ko')=$3 AND status='canonical' AND deleted_at IS NULL AND id=$5`,
              [
                proposal.productId,
                proposal.ruleSnapshot.descriptionType,
                proposal.ruleSnapshot.language,
                actor,
                current.descriptionId,
              ],
            );
          descriptionId = randomUUID();
          await db.query(
            `INSERT INTO shared_product_descriptions
          (id,master_id,description_type,language,content,summary,source_type,source_ref_id,status,created_by,updated_by,curated_by,curated_at)
          VALUES($1,$2,$3,$4,$5,$8,'manual',$6,'canonical',$7,$7,$7,NOW())`,
            [
              descriptionId,
              proposal.productId,
              proposal.ruleSnapshot.descriptionType,
              proposal.ruleSnapshot.language,
              description.after,
              proposal.id,
              actor,
              current.descriptionSummary ?? null,
            ],
          );
        }
        Object.assign(proposal, {
          revision: proposal.revision + 1,
          appliedAt: new Date().toISOString(),
          appliedBy: actor,
          appliedFields: data.fields,
          resultingDescriptionId: descriptionId,
        });
        await enqueueDescriptionRenewals(db, proposal);
        return this.save(db, proposal);
      });
    } catch (error) {
      const databaseCode = (error as { code?: string })?.code;
      const reported = ['23505', '40001', '40P01'].includes(databaseCode ?? '')
        ? new CorrectionError('PRODUCT_SOURCE_CHANGED', 409)
        : error;
      // The failed product transaction has already rolled back. Persist a separate bounded attempt record.
      try {
        await read(this.db, proposalKey(id), PROPOSAL_TYPE);
        await insert(
          this.db,
          `product-correction:apply-attempt:${randomUUID()}`,
          'product_correction_apply_attempt',
          {
            proposalId: id,
            at: new Date().toISOString(),
            actor,
            revision: data.revision,
            fields: data.fields,
            code: reported instanceof CorrectionError ? reported.code : 'APPLY_FAILED',
          },
        );
      } catch {
        /* A database outage must not hide the original error or imply success. */
      }
      throw reported;
    }
  }
}
