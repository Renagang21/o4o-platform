import { ProductCandidateService } from '../services/product-candidate.service.js';
import { DESCRIPTION_INTAKE_LABEL } from './namespace.js';
import { randomUUID } from 'node:crypto';
import * as XLSX from 'xlsx';
import { readStoreProductAiContext } from './ai-context.service.js';
import { previewStoreExcel } from './store-excel-preview.js';
import { DataSource, Entity, PrimaryColumn, Column } from 'typeorm';
import { Pool } from 'pg';
import { ProductCandidate } from '../entities/ProductCandidate.entity.js';
import { SharedProductDescription } from '../entities/SharedProductDescription.entity.js';
import { KpaStoreContent } from '../../../routes/kpa/entities/kpa-store-content.entity.js';
import { DescriptionIntakeService } from './intake.service.js';
import { findDescriptionTargets } from './lookup.service.js';
import { submitStoreDescriptionContribution } from './store-contribution.service.js';
import { directContentRevision } from '../../../services/store/consultation-content.js';
const integration = process.env.DESCRIPTION_INTAKE_TEST_DATABASE_URL ? describe : describe.skip;
integration('description intake — isolated PostgreSQL', () => {
  const schema = `o4o_description_${randomUUID().replace(/-/g, '')}`, actor = randomUUID(), org = randomUUID(), other = randomUUID();
  let db: DataSource, pool: Pool, service: DescriptionIntakeService;
  const master = randomUUID(), second = randomUUID();
  const entry = (overrides = {}) => ({ key: randomUUID(), name: 'Synthetic reference', content: '<p>진단·성분·용법 참고</p>',
    barcodes: ['8806541001115'], source: { kind: 'government', currentness: 'retrieved', checkedOn: '2026-10-27', references: [{ url: 'https://nedrug.mfds.go.kr/synthetic' }] }, ...overrides });
  beforeAll(async () => {
    const url = new URL(process.env.DESCRIPTION_INTAKE_TEST_DATABASE_URL!);
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/description_intake_review') throw new Error('Dedicated local fixture required');
    pool = new Pool({ connectionString: url.toString() }); await pool.query(`CREATE SCHEMA "${schema}"`);
    // Minimal synthetic master metadata resolves the existing resource FK without loading unrelated domains.
    @Entity('product_masters')
    class ProductMaster {
      @PrimaryColumn('uuid') id: string;
      @Column('text') name: string;
      @Column('text', { nullable: true }) barcode: string;
      @Column('text', { default: 'ACTIVE' }) status: string;
      @Column('text', { nullable: true }) manufacturer_name: string;
      @Column('text', { nullable: true }) regulatory_name: string;
      @Column('text', { nullable: true }) mfds_product_id: string;
      @Column('text', { nullable: true }) mfds_permit_number: string;
    }
    db = new DataSource({ type: 'postgres', url: url.toString(), schema, entities: [ProductMaster, ProductCandidate, SharedProductDescription, KpaStoreContent], synchronize: true, migrationsRun: false, installExtensions: false, uuidExtension: 'pgcrypto', extra: { options: `-c search_path=${schema},public` } });
    await db.initialize(); service = new DescriptionIntakeService(db);
    await db.query(`CREATE TABLE product_identifiers (id uuid PRIMARY KEY,product_master_id uuid,identifier_type text,identifier_value text,normalized_value text,verification_status text,deleted_at timestamp);
      CREATE TABLE settings(key text PRIMARY KEY,type text,value jsonb,description text,"updatedAt" timestamp DEFAULT now());
      CREATE UNIQUE INDEX test_canonical_scope ON shared_product_descriptions(master_id,description_type,COALESCE(language,'ko')) WHERE status='canonical' AND deleted_at IS NULL;
      CREATE TABLE organization_product_listings(id uuid PRIMARY KEY,organization_id uuid,is_active boolean,master_id uuid);
      CREATE TABLE store_local_products(id uuid PRIMARY KEY,organization_id uuid,is_active boolean,name text,barcode text);
      CREATE TABLE kpa_store_content_product_links(id uuid DEFAULT gen_random_uuid(),organization_id uuid,content_id uuid,product_source_type text,product_source_id uuid,link_type text);`);
    await db.query("INSERT INTO product_masters(id,name,barcode,status) VALUES($1,'Synthetic reference','8806541001115','ACTIVE'),($2,'Synthetic reference',NULL,'ACTIVE')", [master, second]);
  }, 30000);
  afterAll(async () => { if (db?.isInitialized) await db.destroy(); if (pool) { await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await pool.end(); } });
  it('excludes empty bodies, performs read-only preview and deduplicates concurrent retries', async () => {
    expect(await service.submit({ entries: [entry({ content: '<p>&nbsp;</p>' })] }, actor)).toEqual({ items: [], excludedEmpty: 1 });
    expect((await db.query('SELECT count(*)::int AS n FROM product_candidates'))[0].n).toBe(0);
    const input = entry(); const preview = await service.preview({ entries: [input] }); expect(preview.items[0].targets.map(t => t.id)).toEqual([master]);
    expect((await db.query('SELECT count(*)::int AS n FROM product_candidates'))[0].n).toBe(0);
    const results = await Promise.all([service.submit({ entries: [input] }, actor), service.submit({ entries: [{ ...input, key: 'renamed-file-key' }] }, actor)]);
    expect(results[0].items[0].id).toBe(results[1].items[0].id); expect(results.flatMap(r => r.items).filter(r => r.replayed)).toHaveLength(1);
  });
  it('requires archived acknowledgement and optimistic revisions; keeps other purposes/languages', async () => {
    const submitted = await service.submit({ entries: [entry({ content: '<p>Archived professional reference</p>', source: { kind: 'government', currentness: 'archived', references: [{ url: 'https://nedrug.mfds.go.kr/archive' }] } })] }, actor);
    const detail = await service.detail(submitted.items[0].id), input = { expectedRevision: detail.revision, acknowledgeArchived: false, targets: [{ masterId: master, expectedCanonicalRevision: null }] };
    await expect(service.approve(detail.id, input, actor)).rejects.toMatchObject({ code: 'ARCHIVED_SOURCE_ACK_REQUIRED' });
    await db.getRepository(SharedProductDescription).save({ masterId: master, descriptionType: 'STORE', language: 'ko', status: 'canonical', content: '<p>Store</p>', sourceType: 'manual' });
    await db.getRepository(SharedProductDescription).save({ masterId: master, descriptionType: 'B2B', language: 'en', status: 'canonical', content: '<p>English</p>', sourceType: 'manual' });
    const saved = await service.approve(detail.id, { ...input, acknowledgeArchived: true }, actor); expect(saved.status).toBe('matched');
    const all = await db.query("SELECT description_type,language FROM shared_product_descriptions WHERE status='canonical'"); expect(all).toHaveLength(3);
    const next = await service.submit({ entries: [entry({ content: '<p>Updated reference</p>' })] }, actor); const fresh = await service.detail(next.items[0].id);
    const token = fresh.targets[0].canonical!.revision;
    await db.query("UPDATE shared_product_descriptions SET content='<p>Other admin edit</p>',updated_at=now() WHERE master_id=$1 AND description_type='B2B' AND language='ko'", [master]);
    await expect(service.approve(fresh.id, { expectedRevision: fresh.revision, acknowledgeArchived: false, targets: [{ masterId: master, expectedCanonicalRevision: token }] }, actor)).rejects.toMatchObject({ code: 'DESCRIPTION_CANONICAL_CHANGED' });
    expect((await service.detail(fresh.id)).status).toBe('pending');
  });
  it('rolls back all selected masters and audit/renewal writes when any canonical write fails', async () => {
    const submitted = await service.submit({ entries: [entry({ barcodes: [], content: '<p>Atomic reference</p>' })] }, actor); const d = await service.detail(submitted.items[0].id);
    expect(d.targets).toHaveLength(2);
    const before = (await db.query('SELECT count(*)::int AS n FROM settings'))[0].n;
    await db.query(`CREATE FUNCTION fail_description() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.master_id='${second}' THEN RAISE EXCEPTION 'synthetic failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER fail_description BEFORE INSERT ON shared_product_descriptions FOR EACH ROW EXECUTE FUNCTION fail_description();`);
    try { await expect(service.approve(d.id, { expectedRevision: d.revision, acknowledgeArchived: false, targets: d.targets.map(t => ({ masterId: t.id, expectedCanonicalRevision: t.canonical?.revision ?? null })) }, actor)).rejects.toThrow('synthetic failure'); }
    finally { await db.query('DROP TRIGGER fail_description ON shared_product_descriptions'); }
    expect((await db.query('SELECT count(*)::int AS n FROM settings'))[0].n).toBe(before);
    expect((await service.detail(d.id)).status).toBe('pending');
    expect(await db.query("SELECT id FROM shared_product_descriptions WHERE content='<p>Atomic reference</p>'")).toHaveLength(0);
  });
  it('normalizes barcode aliases, ignores deprecated identifiers, and reads only requested purpose/language', async () => {
    const [items] = await findDescriptionTargets(db, [{ barcodes: ['8806541001115'], name: '', identifiers: {}, descriptionType: 'B2C', language: 'ko' }]);
    expect(items).toHaveLength(1); expect(items[0].canonical).toBeNull();
    await db.query("INSERT INTO product_identifiers VALUES($1,$2,'EAN13','8806541001115','8806541001115','deprecated',NULL)", [randomUUID(), second]);
    const [aliases] = await findDescriptionTargets(db, [{ barcodes: ['8806541001115'], name: '', identifiers: {}, descriptionType: 'B2B', language: 'ko' }]);
    expect(aliases).toHaveLength(1); expect(aliases[0].canonical?.content).toContain('Other admin edit');
  });
  it('takes contributions from saved content only, rejects other stores/stale content and never changes common canonical', async () => {
    const id = randomUUID(), product = randomUUID();
    await db.query('INSERT INTO store_local_products VALUES($1,$2,true,$3,NULL)', [product, org, 'Synthetic actual product']);
    const row = await db.getRepository(KpaStoreContent).save({ id, organization_id: org, source_type: 'direct', title: 'Synthetic consultation', content_json: { html: '<p>Saved user reference</p>', productConsultation: { version: 1, product: { sourceType: 'local', sourceId: product, name: 'Synthetic reference' }, language: 'ko', assist: { purpose: 'professional', facts: 'Fact', factSource: 'Authored source', factsReviewed: false, reference: '', referenceSource: '', reviewed: false } } } });
    await db.query("INSERT INTO kpa_store_content_product_links(organization_id,content_id,product_source_type,product_source_id,link_type) VALUES($1,$2,'local',$3,'product_description')", [org, id, product]);
    const request = { expectedRevision: directContentRevision(row) };
    await expect(submitStoreDescriptionContribution(db, other, actor, id, request)).rejects.toMatchObject({ code: 'CONTENT_NOT_FOUND' });
    await expect(submitStoreDescriptionContribution(db, org, actor, id, { expectedRevision: 'f'.repeat(64) })).rejects.toMatchObject({ code: 'CONTENT_CHANGED' });
    const before = (await db.query("SELECT count(*)::int AS n FROM shared_product_descriptions"))[0].n;
    const r = await submitStoreDescriptionContribution(db, org, actor, id, request), replay = await submitStoreDescriptionContribution(db, org, actor, id, request);
    expect(replay).toMatchObject({ id: r.id, replayed: true });
    expect((await service.detail(r.id)).entry.source.kind).toBe('user_contribution');
    expect((await service.detail(r.id)).entry.name).toBe('Synthetic actual product');
    expect((await db.query('SELECT count(*)::int AS n FROM shared_product_descriptions'))[0].n).toBe(before);
    await db.query('DELETE FROM kpa_store_content_product_links WHERE content_id=$1', [id]);
    await expect(submitStoreDescriptionContribution(db, org, actor, id, request)).rejects.toMatchObject({ code: 'PRODUCT_LINK_CHANGED' });
  });
  it('uses the actual master name/barcode for linked store proposals rather than the authored label', async () => {
    const id = randomUUID(), listing = randomUUID();
    await db.query('INSERT INTO organization_product_listings VALUES($1,$2,true,$3)', [listing, org, master]);
    const row = await db.getRepository(KpaStoreContent).save({ id, organization_id: org, source_type: 'direct', title: 'Synthetic linked reference', content_json: { html: '<p>Linked reference</p>', productConsultation: { version: 1, product: { sourceType: 'listing', sourceId: listing, name: 'Non-authoritative label' }, language: 'ko', assist: { purpose: 'professional', facts: '', factSource: '', factsReviewed: false, reference: '', referenceSource: '', reviewed: false } } } });
    await db.query("INSERT INTO kpa_store_content_product_links(organization_id,content_id,product_source_type,product_source_id,link_type) VALUES($1,$2,'listing',$3,'product_description')", [org, id, listing]);
    const result = await submitStoreDescriptionContribution(db, org, actor, id, { expectedRevision: directContentRevision(row) });
    const d = await service.detail(result.id); expect(d.entry.name).toBe('Synthetic reference'); expect(d.entry.barcodes).toEqual(['8806541001115']); expect(d.targets.map(t => t.id)).toEqual([master]);
    await db.query("UPDATE product_masters SET status='ARCHIVED' WHERE id=$1", [master]);
    try { await expect(submitStoreDescriptionContribution(db, org, actor, id, { expectedRevision: directContentRevision(row) })).rejects.toMatchObject({ code: 'INVALID_PRODUCT_REF' }); }
    finally { await db.query("UPDATE product_masters SET status='ACTIVE' WHERE id=$1", [master]); }
  });

  it('allows only one of two concurrent approvals using the same canonical revision', async () => {
    const first = await service.submit({ entries: [entry({ content: '<p>Concurrent reference A</p>' })] }, actor);
    const second = await service.submit({ entries: [entry({ content: '<p>Concurrent reference B</p>' })] }, actor);
    const drafts = await Promise.all([service.detail(first.items[0].id), service.detail(second.items[0].id)]);
    const results = await Promise.allSettled(drafts.map(d => service.approve(d.id, {
      expectedRevision: d.revision, acknowledgeArchived: false,
      targets: [{ masterId: master, expectedCanonicalRevision: d.targets[0].canonical!.revision }],
    }, actor)));
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: 'DESCRIPTION_CANONICAL_CHANGED' });
    const canonical = await db.query("SELECT id FROM shared_product_descriptions WHERE master_id=$1 AND description_type='B2B' AND language='ko' AND status='canonical'", [master]);
    expect(canonical).toHaveLength(1);
  });

  it('isolates private description resources from every generic operator candidate read/write path', async () => {
    const generic = new ProductCandidateService(db);
    const submitted = await service.submit({ entries: [entry({ content: '<p>Private review body</p>' })] }, actor);
    const id = submitted.items[0].id, before = await service.detail(id);
    const normal = await generic.createCandidate({ sourceType: 'operator_import', candidateName: 'Synthetic generic candidate' });
    const labeled = await generic.createCandidate({ sourceType: 'external_api', sourceLabel: 'SYNTHETIC_PUBLIC_DATA', candidateName: 'Synthetic labeled candidate' });
    for (const filter of [{ scopeServiceKeys: ['kpa-society'] }, { scopeServiceKeys: null }, { sourceLabel: DESCRIPTION_INTAKE_LABEL }]) {
      const result = await generic.findCandidates(filter);
      expect(result.items.some(row => row.id === id)).toBe(false);
      if ('sourceLabel' in filter) expect(result).toEqual({ items: [], total: 0 });
      else expect(result.items.map(row => row.id)).toEqual(expect.arrayContaining([normal.id, labeled.id]));
    }
    expect(await generic.getCandidate(id)).toBeNull();
    await expect(generic.getConflictInfo(id)).rejects.toThrow('CANDIDATE_NOT_FOUND');
    await expect(generic.rejectCandidate(id, 'Not allowed', actor)).rejects.toThrow('CANDIDATE_NOT_FOUND');
    await expect(generic.archiveCandidate(id, actor)).rejects.toThrow('CANDIDATE_NOT_FOUND');
    for (const action of ['archive', 'ignore', 'manual_review'] as const) {
      const result = await generic.bulkAction([id, normal.id, labeled.id], action, actor);
      expect(result.updated).toBe(2); expect((await service.detail(id)).revision).toBe(before.revision);
    }
    expect(await generic.getCandidate(normal.id)).not.toBeNull();
    await expect(generic.createCandidate({ sourceType: 'operator_import', sourceLabel: DESCRIPTION_INTAKE_LABEL })).rejects.toThrow('INVALID_DESCRIPTION_RESOURCE_NAMESPACE');
    await expect(generic.createCandidate({ sourceType: 'operator_import', rawPayload: { descriptionResource: {} } })).rejects.toThrow('INVALID_DESCRIPTION_RESOURCE_NAMESPACE');
    expect((await service.detail(id)).entry.content).toBe('<p>Private review body</p>');
  });

  it('connects an actual workbook to registered structured B2B evidence without changing STORE/QR', async () => {
    const id = randomUUID(), listing = randomUUID(), code = '8806541001108';
    await db.query("INSERT INTO product_masters(id,name,barcode,status) VALUES($1,'Excel synthetic',$2,'ACTIVE')", [id, code]);
    const source = { kind: 'government', currentness: 'retrieved', checkedOn: '2026-10-29', references: [{ url: 'https://nedrug.mfds.go.kr/synthetic' }] };
    const section = { key: 'ingredients', title: '성분', kind: 'product-fact', text: '확인된 합성 성분', referenceUrls: [source.references[0].url] };
    const input = entry({ name: 'Excel synthetic', barcodes: [code], content: '<p>합성 본문</p>', source, aiSections: [section] });
    const created = await service.submit({ entries: [input] }, actor), detail = await service.detail(created.items[0].id);
    expect((await readStoreProductAiContext(db, org, listing, 'ko'))).toBeNull();
    await service.approve(detail.id, { expectedRevision: detail.revision, acknowledgeArchived: false, targets: [{ masterId: id, expectedCanonicalRevision: null }] }, actor);
    await db.query('INSERT INTO organization_product_listings VALUES($1,$2,true,$3)', [listing, org, id]);
    await db.getRepository(SharedProductDescription).save({ masterId: id, descriptionType: 'STORE', language: 'ko', status: 'canonical', content: '<p>관리자 QR 본문</p>', sourceType: 'manual' });
    const context = await readStoreProductAiContext(db, org, listing, 'ko');
    expect(context).toMatchObject({ state: 'structured', description: { sections: [section], source } });
    expect(await readStoreProductAiContext(db, other, listing, 'ko')).toBeNull();
    expect(await readStoreProductAiContext(db, org, listing, 'en')).toMatchObject({ state: 'missing', description: null });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['바코드', '상품명', '가격'], ['0' + code, 'POS 이름', 'PRIVATE-PRICE'], ['bad-code','Excel synthetic','OTHER-PRIVATE']]));
    const file = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const preview = await previewStoreExcel(db, org, file, { barcodeColumn: 0, nameColumn: 1, language: 'ko' });
    expect(preview.rows[0]).toMatchObject({ candidates: [{ id, name: 'Excel synthetic', hasAiDescription: true, registered: true }] });
    expect(preview.rows[1]).toMatchObject({ state: 'invalid', candidates: [] });
    expect(JSON.stringify(preview)).not.toContain('PRIVATE-PRICE');
    const update = await service.submit({ entries: [{ ...input, key: randomUUID(), aiSections: [{ ...section, text: '수정 성분' }] }] }, actor);
    const change = await service.detail(update.items[0].id);
    await service.approve(change.id, { expectedRevision: change.revision, acknowledgeArchived: false, targets: [{ masterId: id, expectedCanonicalRevision: change.targets[0].canonical!.revision }] }, actor);
    expect(await readStoreProductAiContext(db, org, listing, 'ko')).toMatchObject({ description: { sections: [{ text: '수정 성분' }] } });
    expect(await db.query("SELECT content FROM shared_product_descriptions WHERE master_id=$1 AND description_type='STORE' AND status='canonical'", [id])).toEqual([{ content: '<p>관리자 QR 본문</p>' }]);
    await db.query("UPDATE shared_product_descriptions SET content='<p>일반 편집으로 바뀐 본문</p>' WHERE master_id=$1 AND description_type='B2B' AND status='canonical'", [id]);
    const legacy = await readStoreProductAiContext(db, org, listing, 'ko');
    expect(legacy).toMatchObject({ state: 'legacy', description: { source: null, sections: [{ kind: 'unclassified', text: '일반 편집으로 바뀐 본문' }] } });
    const changedPreview = await previewStoreExcel(db, org, file, { barcodeColumn: 0, nameColumn: 1, language: 'ko' });
    expect(changedPreview.rows[0].candidates[0]).toMatchObject({ hasAiDescription: false, aiState: 'legacy' });
    await db.query('UPDATE organization_product_listings SET is_active=false WHERE id=$1', [listing]);
    expect(await readStoreProductAiContext(db, org, listing, 'ko')).toBeNull();
  });

  it('drops stale structured statements when a pending HTML body is edited', async () => {
    const submitted = await service.submit({ entries: [entry({ aiSections: [{ key: 'one', title: '미분류', kind: 'unclassified', text: '원래 항목', referenceUrls: [] }] })] }, actor);
    const detail = await service.detail(submitted.items[0].id);
    const edited = await service.edit(detail.id, detail.revision, '<p>새로운 본문</p>', actor);
    expect(edited.entry.aiSections).toBeUndefined();
  });
});
