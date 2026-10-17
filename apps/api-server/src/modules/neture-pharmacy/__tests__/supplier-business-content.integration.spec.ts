import { randomUUID } from 'crypto';
import { createCarePharmReviewDb } from '../../../__tests__/support/carepharm-review-db.js';
import { AddSupplierBusinessContentRequests1792215000000 } from '../../../database/migrations/1792215000000-AddSupplierBusinessContentRequests.js';
import { SupplierBusinessContentService, libraryBlocksText } from '../services/supplier-business-content.service.js';
import { SemiFranchiseContentService } from '../services/semi-franchise-content.service.js';
import type { SemiFranchiseRow } from '../services/semi-franchise.service.js';

const local = process.env.CAREPHARM_REVIEW_DATABASE_URL ? describe : describe.skip;
local('supplier originals → business review copies (isolated PostgreSQL)', () => {
  let fixture: Awaited<ReturnType<typeof createCarePharmReviewDb>>;
  let requests: SupplierBusinessContentService;
  let contents: SemiFranchiseContentService;
  const supplier = randomUUID(), other = randomUUID(), user = randomUUID(), item = randomUUID();
  const sf = { id: randomUUID(), key: 'carepharm' } as SemiFranchiseRow;
  const foreign = { id: randomUUID(), key: 'coop' } as SemiFranchiseRow;
  const member = randomUUID(), outsider = randomUUID();
  let requestId: string;
  beforeAll(async () => {
    fixture = await createCarePharmReviewDb();
    await fixture.ds.query(`
      CREATE TABLE semi_franchises (id uuid PRIMARY KEY, key text, name text, status text);
      CREATE TABLE semi_franchise_memberships (semi_franchise_id uuid, organization_id uuid, status text);
      CREATE TABLE neture_supplier_library_items (id uuid PRIMARY KEY, supplier_id uuid, title text,
        description text, blocks jsonb, file_url text, file_name text, mime_type text, is_public boolean DEFAULT false);
      CREATE TABLE semi_franchise_contents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), semi_franchise_id uuid,
        title text, summary text, body text, thumbnail_url text, attachments jsonb DEFAULT '[]', tags jsonb DEFAULT '[]',
        status text DEFAULT 'draft' CONSTRAINT semi_franchise_contents_status_check CHECK (status IN ('draft','published','archived')),
        created_by uuid, updated_by uuid, published_at timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
    `);
    const runner = fixture.ds.createQueryRunner();
    await new AddSupplierBusinessContentRequests1792215000000().up(runner);
    await runner.release();
    await fixture.ds.query(`INSERT INTO semi_franchises VALUES ($1,'carepharm','Business A','active'),($2,'coop','Business B','active'),($3,'closed','Closed','closed')`, [sf.id, foreign.id, randomUUID()]);
    await fixture.ds.query(`INSERT INTO neture_supplier_library_items (id,supplier_id,title,description,blocks,file_url,file_name,mime_type)
      VALUES ($1,$2,'Original','Private summary',$3::jsonb,'https://example.test/manual.pdf','manual.pdf','application/pdf')`, [item, supplier, JSON.stringify([{ type: 'html', content: '<p>Member manual</p>' }])]);
    requests = new SupplierBusinessContentService(fixture.ds);
    contents = new SemiFranchiseContentService(fixture.ds, async () => ({ snapshotId: randomUUID() }));
  });
  afterAll(async () => { if (fixture) await fixture.close(); });

  it('offers active businesses from data, excluding closed businesses', async () => {
    expect((await requests.targets()).map(r => r.key).sort()).toEqual(['carepharm', 'coop']);
  });
  it('rejects foreign originals and unavailable businesses without creating copies', async () => {
    await expect(requests.request(other, user, item, sf.key)).rejects.toMatchObject({ httpStatus: 404 });
    await expect(requests.request(supplier, user, item, 'closed')).rejects.toMatchObject({ httpStatus: 404 });
    expect(await requests.list(supplier)).toEqual([]);
  });
  it('serializes concurrent requests; leaves source private and pending copy invisible', async () => {
    const result = await Promise.all(Array.from({ length: 5 }, () => requests.request(supplier, user, item, sf.key)));
    expect(result.filter(r => !r.reused)).toHaveLength(1);
    expect(new Set(result.map(r => r.id)).size).toBe(1);
    requestId = result[0].id;
    expect(await requests.list(other)).toEqual([]);
    expect(await requests.list(supplier)).toMatchObject([{ sourceItemId: item, status: 'pending', businessKey: sf.key }]);
    expect((await fixture.ds.query(`SELECT is_public FROM neture_supplier_library_items WHERE id=$1`, [item]))[0].is_public).toBe(false);
    await expect(contents.pharmacyGet(member, requestId)).rejects.toMatchObject({ httpStatus: 404 });
    expect((await contents.operatorGet(sf, requestId)).body).toBe('Member manual');
  });
  it('does not allow another business to review this request', async () => {
    await expect(contents.operatorGet(foreign, requestId)).rejects.toMatchObject({ httpStatus: 404 });
    await expect(contents.operatorSetStatus(foreign, user, requestId, 'publish')).rejects.toMatchObject({ httpStatus: 409 });
  });
  it('requires rejection reason; permits a fresh request with updated source without changing the old copy', async () => {
    await expect(contents.operatorSetStatus(sf, user, requestId, 'reject')).rejects.toMatchObject({ code: 'REASON_REQUIRED' });
    await contents.operatorSetStatus(sf, user, requestId, 'reject', 'Please revise');
    await fixture.ds.query(`UPDATE neture_supplier_library_items SET description='Revised summary' WHERE id=$1`, [item]);
    const next = await requests.request(supplier, user, item, sf.key);
    expect(next.reused).toBe(false);
    expect((await contents.operatorGet(sf, requestId)).summary).toBe('Private summary');
    expect((await contents.operatorGet(sf, next.id)).summary).toBe('Revised summary');
    requestId = next.id;
  });
  it('only exposes published copies to active members of the receiving business', async () => {
    await fixture.ds.query(`INSERT INTO semi_franchise_memberships VALUES ($1,$2,'active'),($3,$4,'active')`, [sf.id, member, foreign.id, outsider]);
    await contents.operatorSetStatus(sf, user, requestId, 'publish');
    expect((await contents.pharmacyGet(member, requestId)).id).toBe(requestId);
    await expect(contents.pharmacyGet(outsider, requestId)).rejects.toMatchObject({ httpStatus: 404 });
    await fixture.ds.query(`UPDATE semi_franchise_memberships SET status='suspended' WHERE organization_id=$1`, [member]);
    await expect(contents.pharmacyCopy(member, user, requestId)).rejects.toMatchObject({ httpStatus: 404 });
    expect((await requests.request(supplier, user, item, sf.key)).reused).toBe(true);
  });
  it('allows independent requests to another business and a new request after archive', async () => {
    expect((await requests.request(supplier, user, item, foreign.key)).reused).toBe(false);
    await contents.operatorSetStatus(sf, user, requestId, 'archive');
    expect((await requests.request(supplier, user, item, sf.key)).reused).toBe(false);
    await expect(contents.operatorSetStatus(sf, user, requestId, 'publish')).rejects.toMatchObject({ httpStatus: 409 });
  });
  it('refuses rollback with request copies and reverses schema after isolated cleanup', async () => {
    const runner = fixture.ds.createQueryRunner();
    const migration = new AddSupplierBusinessContentRequests1792215000000();
    await expect(migration.down(runner)).rejects.toThrow('before rollback');
    await fixture.ds.query('DELETE FROM semi_franchise_contents');
    await migration.down(runner);
    await runner.release();
  });
});

it('extracts nested document text without executing HTML', () => {
  expect(libraryBlocksText([{ content: [{ text: 'A' }, { text: 'B' }] }, { data: { text: 'C' } }])).toBe('A\nB\nC');
});
