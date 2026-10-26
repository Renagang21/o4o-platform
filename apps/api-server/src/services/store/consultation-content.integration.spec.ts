import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Pool } from 'pg';
import { KpaStoreContent } from '../../routes/kpa/entities/kpa-store-content.entity.js';
import { createDirectContent, getDirectContent, updateDirectContent } from './store-content.service.js';
const integration = process.env.CONSULTATION_TEST_DATABASE_URL ? describe : describe.skip;
integration('consultation content — actual PostgreSQL atomic save', () => {
 const schema = `o4o_consultation_${randomUUID().replace(/-/g, '')}`;
 let db: DataSource, pool: Pool;
 const org = randomUUID(), other = randomUUID(), actor = randomUUID(), product = randomUUID();
 const draft = (id: string, html = '<p>Product reference</p>') => ({ clientContentId: id, title: 'Synthetic consultation', tags: [],
  productRef: { sourceType: 'local' as const, sourceId: product }, contentJson: { html,
   productConsultation: { version: 1, product: { sourceType: 'local', sourceId: product, name: 'Synthetic product' }, language: 'ko',
    assist: { purpose: 'professional', facts: 'Fact', factSource: 'Source/date', factsReviewed: true, reference: 'Reference', referenceSource: 'Guideline', reviewed: false } } } });
 const read = async (id: string) => { const r = await getDirectContent(db, org, id); if (!r.ok) throw new Error('missing'); return r.data; };
 beforeAll(async () => {
  const url = new URL(process.env.CONSULTATION_TEST_DATABASE_URL!);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/consultation_review') throw new Error('Dedicated local fixture required');
  pool = new Pool({ connectionString: url.toString() }); await pool.query(`CREATE SCHEMA "${schema}"`);
  db = new DataSource({ type: 'postgres', url: url.toString(), schema, entities: [KpaStoreContent], synchronize: true,
   migrationsRun: false, installExtensions: false, uuidExtension: 'pgcrypto', extra: { max: 8, options: `-c search_path=${schema},public` } });
  await db.initialize();
  await db.query(`CREATE TABLE store_local_products(id uuid PRIMARY KEY,organization_id uuid,is_active boolean); CREATE TABLE organization_product_listings(id uuid PRIMARY KEY,organization_id uuid,is_active boolean,master_id uuid);
   CREATE TABLE kpa_store_content_product_links(organization_id uuid,content_id uuid,product_source_type text,product_source_id uuid,master_id uuid,link_type text,UNIQUE(organization_id,content_id,product_source_type,product_source_id,link_type));`);
  await db.query('INSERT INTO store_local_products VALUES($1,$2,true)', [product, org]);
 }, 30000);
 afterAll(async () => { if (db?.isInitialized) await db.destroy(); if (pool) { await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); await pool.end(); } });
 it('replays concurrent and lost-response creates as one body and one link', async () => {
  const id = randomUUID(), input = draft(id);
  const results = await Promise.all(Array.from({ length: 12 }, () => createDirectContent(db, org, actor, input)));
  expect(results.every(r => r.ok)).toBe(true);
  expect((await db.query('SELECT count(*)::int AS n FROM kpa_store_contents WHERE id=$1', [id]))[0].n).toBe(1);
  expect((await db.query('SELECT count(*)::int AS n FROM kpa_store_content_product_links WHERE content_id=$1', [id]))[0].n).toBe(1);
  expect((await createDirectContent(db, org, actor, input)).ok).toBe(true);
 });
 it('allows only one concurrent update from a revision and never silently overwrites it', async () => {
  const id = randomUUID(), input = draft(id); await createDirectContent(db, org, actor, input); const before = await read(id);
  const writes = await Promise.all(['A','B'].map(value => updateDirectContent(db, org, actor, id,
   { ...input, contentJson: { ...input.contentJson, html: `<p>${value}</p>` }, expectedRevision: before.revision })));
  expect(writes.filter(r => r.ok)).toHaveLength(1); expect(writes.filter(r => !r.ok)).toMatchObject([{ code: 'CONTENT_CONFLICT', status: 409 }]);
  const latest = await read(id); expect(latest.revision).not.toBe(before.revision);
  // A delayed retry of the original create returns current data and does not restore the initial body.
  const replay = await createDirectContent(db, org, actor, input); expect(replay.ok && replay.data.revision).toBe(latest.revision);
 });
 it('rolls back a body if product linking fails', async () => {
  const id = randomUUID();
  await db.query(`CREATE FUNCTION reject_test_link() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic link failure'; END $$;
   CREATE TRIGGER reject_test_link BEFORE INSERT ON kpa_store_content_product_links FOR EACH ROW EXECUTE FUNCTION reject_test_link();`);
  try { await expect(createDirectContent(db, org, actor, draft(id))).rejects.toThrow('synthetic link failure'); }
  finally { await db.query('DROP TRIGGER reject_test_link ON kpa_store_content_product_links'); }
  expect((await db.query('SELECT count(*)::int AS n FROM kpa_store_contents WHERE id=$1', [id]))[0].n).toBe(0);
 });
 it('rejects other stores, altered identity, inactive products and unknown payload fields', async () => {
  const id = randomUUID(), input = draft(id); await createDirectContent(db, org, actor, input);
  expect(await createDirectContent(db, other, actor, input)).toMatchObject({ ok: false });
  expect(await createDirectContent(db, org, actor, { ...draft(randomUUID()), productRef: { sourceType: 'local', sourceId: randomUUID() } })).toMatchObject({ ok: false });
  expect(await createDirectContent(db, org, actor, { ...draft(randomUUID()), ownerId: other } as never)).toMatchObject({ ok: false });
  await db.query('UPDATE store_local_products SET is_active=false WHERE id=$1', [product]);
  try { expect(await createDirectContent(db, org, actor, draft(randomUUID()))).toMatchObject({ ok: false, status: 403 }); }
  finally { await db.query('UPDATE store_local_products SET is_active=true WHERE id=$1', [product]); }
 });
 it('sanitizes on the server and refuses metadata removal or changed actual links', async () => {
  const id = randomUUID(), input = draft(id, '<p onclick="evil()">Safe</p><script>evil()</script>');
  await createDirectContent(db, org, actor, input); const saved = await read(id);
  expect(JSON.stringify(saved.contentJson)).not.toContain('onclick'); expect(JSON.stringify(saved.contentJson)).not.toContain('<script');
  expect(await updateDirectContent(db, org, actor, id, { title: 'Attempt', contentJson: { html: 'No context' } })).toMatchObject({ ok: false });
  await db.query('DELETE FROM kpa_store_content_product_links WHERE content_id=$1', [id]);
  expect(await updateDirectContent(db, org, actor, id, { ...input, expectedRevision: saved.revision })).toMatchObject({ ok: false, code: 'PRODUCT_LINK_CHANGED' });
 });
 it('keeps normal direct editing compatible without losing guarded context during adoption', async () => {
  const created = await createDirectContent(db, org, actor, { title: 'Legacy', contentJson: { html: '<p>Before</p>' }, productRef: { sourceType: 'local', sourceId: product } });
  if (!created.ok) throw new Error('Legacy create failed');
  const id = created.data.id;
  expect(await updateDirectContent(db, org, actor, id, { title: 'Normal edit' })).toMatchObject({ ok: true });
  const before = await read(id);
  const result = await Promise.all([
   updateDirectContent(db, org, actor, id, { ...draft(id), expectedRevision: before.revision }),
   updateDirectContent(db, org, actor, id, { contentJson: { html: '<p>Concurrent legacy edit</p>' } }),
  ]);
  const latest = await read(id);
  if (result[0].ok) expect(latest.contentJson).toHaveProperty('productConsultation');
  else expect(result[0]).toMatchObject({ code: 'CONTENT_CONFLICT' });
 });
 it('preserves editor-supported YouTube/Vimeo and structural-only content while removing unsafe embeds', async () => {
  for (const html of ['<iframe src="https://www.youtube.com/embed/synthetic" allowfullscreen></iframe>',
    '<iframe src="https://player.vimeo.com/video/123" allowfullscreen></iframe>', '<hr>', '<table><tbody><tr><td></td></tr></tbody></table>']) {
   const id = randomUUID(); expect(await createDirectContent(db, org, actor, draft(id, html))).toMatchObject({ ok: true });
   const tag = html.slice(1).split(/[ >]/)[0];
   expect(JSON.stringify((await read(id)).contentJson)).toContain(tag);
  }
  const id = randomUUID();
  expect(await createDirectContent(db, org, actor, draft(id, '<p>Text</p><iframe src="https://example.invalid/embed" onload="evil()"></iframe>'))).toMatchObject({ ok: true });
  expect(JSON.stringify((await read(id)).contentJson)).not.toContain('iframe');
  const frameId = randomUUID();
  const frame = '<iframe src="https://www.youtube.com/embed/synthetic" width="640" allowfullscreen="" onload="evil()" srcdoc="bad"></iframe>';
  expect(await createDirectContent(db, org, actor, draft(frameId, frame))).toMatchObject({ ok: true });
  const content = (await read(frameId)).contentJson as { html: string };
  expect(content.html).toBe('<iframe src="https://www.youtube.com/embed/synthetic" width="640" allowfullscreen=""></iframe>');
  const markerId = randomUUID();
  await createDirectContent(db, org, actor, draft(markerId, '<p data-o4o-embed="attacker">Plain marker</p>'));
  expect(JSON.stringify((await read(markerId)).contentJson)).not.toContain('iframe');
 });
 it('preserves inline embed parent and sibling structure through save and update', async () => {
  for (const fallback of ['', '\n', 'Fallback <b>raw text</b>']) {
  const html = `<p>Before<iframe src="https://www.youtube.com/embed/synthetic">${fallback}</iframe>After</p>`;
  const id = randomUUID(), input = draft(id, html);
  expect(await createDirectContent(db, org, actor, input)).toMatchObject({ ok: true });
  const saved = await read(id);
  expect(saved.contentJson).toHaveProperty('html', html);
  expect(await updateDirectContent(db, org, actor, id, { ...input, expectedRevision: saved.revision })).toMatchObject({ ok: true });
  expect((await read(id)).contentJson).toHaveProperty('html', html);
  }
 });
 it('keeps safe image-only content while rejecting an empty sanitized response', async () => {
  expect(await createDirectContent(db, org, actor, draft(randomUUID(), '<img src="https://example.invalid/product.png">'))).toMatchObject({ ok: true });
  expect(await createDirectContent(db, org, actor, draft(randomUUID(), '<script>bad()</script>'))).toMatchObject({ ok: false, code: 'EMPTY_CONSULTATION' });
 });
 it('adopts an existing product-linked draft with the current revision, preserving unrelated metadata', async () => {
  const id = randomUUID(), input = draft(id);
  await db.getRepository(KpaStoreContent).save({ id, organization_id: org, source_type: 'direct', title: 'Old', content_json: { html: '<p>Old</p>', custom: 'keep', blocks: [] }, tags: [] });
  await db.query("INSERT INTO kpa_store_content_product_links VALUES($1,$2,'local',$3,null,'product_description')", [org,id,product]);
  const before = await read(id);
  expect(await updateDirectContent(db, org, actor, id, { ...input, expectedRevision: before.revision })).toMatchObject({ ok: true });
  expect((await read(id)).contentJson).toMatchObject({ custom: 'keep', html: input.contentJson.html });
  expect((await read(id)).contentJson).not.toHaveProperty('blocks');
 });
});
