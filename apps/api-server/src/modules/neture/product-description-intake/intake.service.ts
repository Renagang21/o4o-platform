import type { DataSource, EntityManager } from 'typeorm';
import { ProductCandidate } from '../entities/ProductCandidate.entity.js';
import { SharedProductDescriptionService } from '../services/shared-product-description.service.js';
import { DescriptionIntakeError, compareDescriptionKeys, descriptionFingerprint, prepareDescriptionEntries, type DescriptionEntry } from './contracts.js';
import { findDescriptionTargets } from './lookup.service.js';

import { DESCRIPTION_INTAKE_LABEL } from './namespace.js';
export { DESCRIPTION_INTAKE_LABEL } from './namespace.js';
interface Resource {
  entry: DescriptionEntry; fingerprint: string;
  origin?: { organizationId: string; contentId: string; revision: string; actor: string };
  authorContext?: { facts: string; factSource: string; reference: string; referenceSource: string; factsReviewed: boolean; reviewed: boolean };
  applied?: Array<{ masterId: string; descriptionId: string }>;
}
export const resourceOf = (row: ProductCandidate) => row.rawPayload?.descriptionResource as Resource;
export const candidateRevision = (row: ProductCandidate) => descriptionFingerprint({ id: row.id, resource: resourceOf(row), status: row.candidateStatus, updated: row.updatedAt.toISOString() });
const fail = (code: string, status = 409): never => { throw new DescriptionIntakeError(code, status); };

/** An intake resource is not a new master. Only explicit approval can change canonical descriptions. */
export class DescriptionIntakeService {
  constructor(private readonly db: DataSource) {}
  async preview(raw: unknown) {
    const prepared = prepareDescriptionEntries(raw);
    const targets = await findDescriptionTargets(this.db, prepared.entries);
    return { excludedEmpty: prepared.excludedEmpty, items: prepared.entries.map((entry, i) => ({ entry, targets: targets[i] })) };
  }
  async submit(raw: unknown, actor: string) {
    const prepared = prepareDescriptionEntries(raw);
    const items = [];
    for (const entry of prepared.entries) items.push(await this.db.transaction(manager => insertDescriptionResource(manager, entry, actor)));
    return { excludedEmpty: prepared.excludedEmpty, items };
  }
  async list(page = 1, status = 'pending') {
    const qb = this.db.getRepository(ProductCandidate).createQueryBuilder('c')
      .where('c.sourceLabel=:label', { label: DESCRIPTION_INTAKE_LABEL });
    if (status !== 'all') qb.andWhere('c.candidateStatus=:status', { status });
    const [rows, total] = await qb.orderBy('c.createdAt', 'DESC').skip((page - 1) * 20).take(20).getManyAndCount();
    return { items: rows.map(row => ({ id: row.id, name: row.candidateName, status: row.candidateStatus,
      source: resourceOf(row).entry.source, descriptionType: resourceOf(row).entry.descriptionType, language: resourceOf(row).entry.language })), total, page };
  }
  private async row(manager: EntityManager, id: string, locked = false) {
    const row = await manager.getRepository(ProductCandidate).findOne({ where: { id, sourceLabel: DESCRIPTION_INTAKE_LABEL }, ...(locked ? { lock: { mode: 'pessimistic_write' as const } } : {}) });
    if (!row || !resourceOf(row)?.entry) return fail('DESCRIPTION_RESOURCE_NOT_FOUND', 404);
    return row;
  }
  async detail(id: string) {
    const row = await this.row(this.db.manager, id);
    const resource = resourceOf(row);
    const [targets] = await findDescriptionTargets(this.db, [resource.entry]);
    return { id: row.id, status: row.candidateStatus, revision: candidateRevision(row), entry: resource.entry,
      targets, authorContext: resource.authorContext ?? null, applied: resource.applied ?? [], origin: resource.origin ? { kind: 'store_contribution' } : null, reviewNote: row.reviewNote };
  }
  async edit(id: string, expected: string, content: string, actor: string) {
    await this.db.transaction(async manager => {
      const row = await this.row(manager, id, true);
      if (candidateRevision(row) !== expected) fail('DESCRIPTION_RESOURCE_CHANGED');
      if (!['pending', 'reviewing'].includes(row.candidateStatus)) fail('DESCRIPTION_RESOURCE_CLOSED');
      const resource = resourceOf(row);
      const prepared = prepareDescriptionEntries({ entries: [{ ...resource.entry, content }] });
      if (!prepared.entries.length) fail('DESCRIPTION_CONTENT_EMPTY', 400);
      resource.entry = prepared.entries[0];
      row.rawPayload = { descriptionResource: resource };
      row.candidateStatus = 'reviewing'; row.reviewedBy = actor; row.reviewedAt = new Date();
      await manager.save(ProductCandidate, row);
    });
    return this.detail(id);
  }
  async reject(id: string, expected: string, note: string, actor: string) {
    await this.db.transaction(async manager => {
      const row = await this.row(manager, id, true);
      if (candidateRevision(row) !== expected) fail('DESCRIPTION_RESOURCE_CHANGED');
      if (!['pending', 'reviewing'].includes(row.candidateStatus)) fail('DESCRIPTION_RESOURCE_CLOSED');
      row.candidateStatus = 'rejected'; row.reviewNote = note; row.reviewedBy = actor; row.reviewedAt = new Date();
      await manager.save(ProductCandidate, row);
    });
    return this.detail(id);
  }
  async approve(id: string, input: { expectedRevision: string; acknowledgeArchived: boolean;
    targets: Array<{ masterId: string; expectedCanonicalRevision: string | null }> }, actor: string) {
    await this.db.transaction(async manager => {
      const row = await this.row(manager, id, true);
      if (candidateRevision(row) !== input.expectedRevision) fail('DESCRIPTION_RESOURCE_CHANGED');
      if (!['pending', 'reviewing'].includes(row.candidateStatus)) fail('DESCRIPTION_RESOURCE_CLOSED');
      const resource = resourceOf(row), entry = resource.entry;
      if (entry.source.currentness === 'archived' && !input.acknowledgeArchived) fail('ARCHIVED_SOURCE_ACK_REQUIRED', 400);
      const selected = [...new Set(input.targets.map(t => t.masterId))].sort(compareDescriptionKeys);
      if (!selected.length || selected.length !== input.targets.length) fail('DESCRIPTION_TARGET_REQUIRED', 400);
      // Serialize against ordinary master/description edits before reading optimistic canonical revisions.
      const locked: Array<{ id: string }> = await manager.query("SELECT id FROM product_masters WHERE id=ANY($1::uuid[]) AND status='ACTIVE' ORDER BY id FOR UPDATE", [selected]);
      if (locked.length !== selected.length) fail('DESCRIPTION_TARGET_CHANGED');
      const [targets] = await findDescriptionTargets(manager, [entry]);
      for (const requested of input.targets) {
        const target = targets.find(t => t.id === requested.masterId);
        if (!target) fail('DESCRIPTION_TARGET_NOT_MATCHED', 400);
        if ((target.canonical?.revision ?? null) !== requested.expectedCanonicalRevision) fail('DESCRIPTION_CANONICAL_CHANGED');
      }
      const descriptions = new SharedProductDescriptionService(manager);
      const applied: NonNullable<Resource['applied']> = [];
      for (const masterId of selected) {
        const current = targets.find(t => t.id === masterId)!.canonical;
        if (current?.content === entry.content && (current.summary ?? null) === entry.summary) {
          applied.push({ masterId, descriptionId: current.id }); continue;
        }
        const candidate = await descriptions.createCandidate({ masterId, content: entry.content, summary: entry.summary,
          descriptionType: entry.descriptionType, language: entry.language, sourceType: entry.source.kind === 'user_contribution' ? 'store_contribution' : 'operator',
          sourceRefId: row.id, createdBy: actor });
        const canonical = await descriptions.setCanonical(candidate.id, actor, { trackAdminEdit: true });
        applied.push({ masterId, descriptionId: canonical.id });
      }
      resource.applied = applied;
      row.rawPayload = { descriptionResource: resource }; row.candidateStatus = 'matched';
      row.matchedProductMasterId = applied[0]?.masterId ?? null; row.reviewedBy = actor; row.reviewedAt = new Date();
      await manager.save(ProductCandidate, row);
    });
    return this.detail(id);
  }
}

/** Advisory lock makes replay/concurrent import idempotent without a new schema or master write. */
export async function insertDescriptionResource(manager: EntityManager, entry: DescriptionEntry, actor: string,
  origin?: Resource['origin']) {
  const fingerprint = descriptionFingerprint({ entry: { ...entry, key: undefined }, origin });
  await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`description-resource:${fingerprint}`]);
  const repo = manager.getRepository(ProductCandidate);
  const previous = await repo.createQueryBuilder('c').where('c.sourceLabel=:label', { label: DESCRIPTION_INTAKE_LABEL })
    .andWhere("c.raw_payload->'descriptionResource'->>'fingerprint'=:fingerprint", { fingerprint }).getOne();
  if (previous) return { id: previous.id, replayed: true };
  const row = await repo.save(repo.create({ sourceType: origin ? 'store_web' : 'operator_import', sourceLabel: DESCRIPTION_INTAKE_LABEL,
    submittedBy: actor, organizationId: origin?.organizationId ?? null, sourceId: origin?.contentId ?? null,
    candidateName: entry.name.slice(0, 255), candidateManufacturer: entry.manufacturer, candidateCategory: entry.category,
    candidateStatus: 'pending', rawPayload: { descriptionResource: { entry, fingerprint, ...(origin ? { origin } : {}) } } }));
  return { id: row.id, replayed: false };
}
