import { createHash } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { ProductCorrectionProposal, ProductDescriptionRenewal } from '@o4o/types';
import { CorrectionError } from './contracts.js';
import { read, insert, replace, type Db } from './records.js';
import {
  NOTICE,
  noticeKey,
  RENEWAL,
  renewalKey,
  renewalVersionKey,
  renewalSchema,
} from './periodic.contracts.js';

export async function notice(db: Db, id: string, kind: string, referenceId: string, title: string) {
  await db.query(
    `INSERT INTO settings(key,type,value,description) VALUES($1,$2,$3::jsonb,'상품 관리 화면 알림') ON CONFLICT(key) DO NOTHING`,
    [
      noticeKey(id),
      NOTICE,
      JSON.stringify({ id, kind, referenceId, title, createdAt: new Date().toISOString() }),
    ],
  );
}
/** Called inside the product apply transaction. It never edits descriptions or QR resources. */
export async function enqueueDescriptionRenewals(db: Db, proposal: ProductCorrectionProposal) {
  const targets = await db.query(
    `SELECT id,description_type AS type,COALESCE(language,'ko') AS language FROM shared_product_descriptions
    WHERE master_id=$1 AND status='canonical' AND deleted_at IS NULL ORDER BY description_type,COALESCE(language,'ko'),id`,
    [proposal.productId],
  );
  if (
    !targets.some(
      (d: { type: string; language: string }) =>
        d.type === proposal.ruleSnapshot.descriptionType &&
        d.language === proposal.ruleSnapshot.language,
    )
  )
    targets.push({
      id: null,
      type: proposal.ruleSnapshot.descriptionType,
      language: proposal.ruleSnapshot.language,
    });
  for (const target of targets) {
    const id = `${proposal.id}:${target.type}:${target.language}`;
    const now = new Date().toISOString();
    const record: ProductDescriptionRenewal = {
      id,
      productId: proposal.productId,
      productName: String(
        (proposal.appliedFields?.includes('name')
          ? proposal.changes.find((c) => c.field === 'name')?.after
          : undefined) ?? proposal.baseline.values.name,
      ),
      proposalId: proposal.id,
      batchId: proposal.batchId,
      taskId: proposal.taskId,
      descriptionType: target.type,
      language: target.language,
      descriptionId: target.id,
      changedFields: proposal.appliedFields!,
      purposes: [proposal.ruleSnapshot.purpose],
      state: 'pending',
      revision: 1,
      createdAt: now,
      updatedAt: now,
      notes: '',
    };
    await insert(db, renewalKey(id), RENEWAL, record);
  }
  await notice(
    db,
    `renewal:${proposal.id}`,
    'renewal',
    proposal.id,
    '상품 반영에 따른 설명서 이용 목적·갱신 검토가 필요합니다.',
  );
}
export class ProductDescriptionRenewalService {
  constructor(private db: DataSource) {}
  private async current(db: Db, record: ProductDescriptionRenewal, lock = false) {
    const masters = await db.query(
      `SELECT to_jsonb(m) AS value FROM product_masters m WHERE id=$1${lock ? ' FOR UPDATE' : ''}`,
      [record.productId],
    );
    const rows = await db.query(
      `SELECT id,content,summary,updated_at,status FROM shared_product_descriptions WHERE master_id=$1 AND description_type=$2 AND COALESCE(language,'ko')=$3 AND status='canonical' AND deleted_at IS NULL ORDER BY updated_at DESC,id LIMIT 1${lock ? ' FOR UPDATE' : ''}`,
      [record.productId, record.descriptionType, record.language],
    );
    return {
      fingerprint: createHash('sha256')
        .update(JSON.stringify({ master: masters[0]?.value ?? null, description: rows[0] ?? null }))
        .digest('hex'),
      description: rows[0] ?? null,
      productExists: Boolean(masters[0]),
    };
  }
  async list(state: 'open' | 'all', page = 1) {
    const where = `FROM settings WHERE type=$1 ${state === 'open' ? "AND value->>'state' NOT IN ('done','excluded')" : ''}`;
    const count = await this.db.query(`SELECT COUNT(*)::int AS total ${where}`, [RENEWAL]);
    const rows = await this.db.query(
      `SELECT value ${where} ORDER BY value->>'createdAt' DESC,key LIMIT 10 OFFSET $2`,
      [RENEWAL, (page - 1) * 10],
    );
    return {
      items: rows.map((r: { value: ProductDescriptionRenewal }) => r.value),
      total: count[0].total,
      page,
      pageSize: 10,
    };
  }
  async versions(id: string) {
    await read(this.db, renewalKey(id), RENEWAL);
    const rows = await this.db.query(
      "SELECT value FROM settings WHERE type='product_description_renewal_version' AND value->>'id'=$1 ORDER BY (value->>'revision')::int DESC LIMIT 20",
      [id],
    );
    return rows.map((r: { value: ProductDescriptionRenewal }) => r.value);
  }
  async detail(id: string) {
    return this.db.transaction(async (db) => {
      await db.query("SET LOCAL statement_timeout='30s'");
      const record = await read<ProductDescriptionRenewal>(db, renewalKey(id), RENEWAL);
      return { record, ...(await this.current(db, record, true)) };
    });
  }
  async update(id: string, input: unknown, actor: string) {
    const data = renewalSchema.parse(input);
    return this.db.transaction(async (db) => {
      await db.query("SET LOCAL statement_timeout='30s'");
      const record = await read<ProductDescriptionRenewal>(db, renewalKey(id), RENEWAL, true);
      if (record.revision !== data.revision) throw new CorrectionError('RENEWAL_CHANGED', 409);
      const current = await this.current(db, record, true);
      if (current.fingerprint !== data.fingerprint)
        throw new CorrectionError('PRODUCT_SOURCE_CHANGED', 409);
      if (data.state === 'done' && !current.productExists)
        throw new CorrectionError('MASTER_NOT_FOUND', 404);
      if (new Set(data.purposes).size !== data.purposes.length)
        throw new CorrectionError('INVALID_INPUT');
      const previous = { ...record };
      Object.assign(record, {
        state: data.state,
        purposes: data.purposes,
        notes: data.notes,
        revision: record.revision + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: actor,
        completedBy: ['done', 'excluded'].includes(data.state) ? actor : undefined,
      });
      await insert(
        db,
        renewalVersionKey(id, previous.revision),
        'product_description_renewal_version',
        previous,
      );
      await replace(db, renewalKey(id), RENEWAL, record);
      return record;
    });
  }
}
