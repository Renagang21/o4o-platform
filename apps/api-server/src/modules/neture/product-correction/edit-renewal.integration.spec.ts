/** Real TypeORM + PostgreSQL services, synthetic dedicated local schema only. */
import { Pool } from 'pg';
import { DataSource, EntitySchema } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { ProductMaster } from '../entities/ProductMaster.entity.js';
import { SharedProductDescription } from '../entities/SharedProductDescription.entity.js';
import { NetureCatalogService } from '../services/catalog.service.js';
import { SharedProductDescriptionService } from '../services/shared-product-description.service.js';
import { enqueueProductEditRenewals } from './edit-renewal.service.js';
import { ProductDescriptionRenewalService } from './renewal.service.js';

const integration = process.env.CORRECTION_TEST_DATABASE_URL ? describe : describe.skip;
integration('일반 편집→갱신 작업 — isolated PostgreSQL + real repositories', () => {
  const schema = `o4o_edit_${randomUUID().replace(/-/g, '')}`;
  const productId = randomUUID(),
    actor = randomUUID();
  let pool: Pool,
    db: DataSource,
    catalog: NetureCatalogService,
    descriptions: SharedProductDescriptionService;
  let created = false,
    failRenewal = false;
  beforeAll(async () => {
    const url = new URL(process.env.CORRECTION_TEST_DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/correction_review')
      throw new Error('Dedicated local correction_review required');
    pool = new Pool({
      connectionString: url.toString(),
      options: `-c search_path=${schema},public`,
    });
    await pool.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await pool.query(`CREATE TABLE settings(key varchar(100) PRIMARY KEY,value jsonb,type varchar(50),description text,"createdAt" timestamp DEFAULT now(),"updatedAt" timestamp DEFAULT now());
      CREATE TABLE product_masters(id uuid PRIMARY KEY,name varchar(255),brand_name varchar(255),category_id uuid,brand_id uuid,specification text,origin_country varchar(100),tags jsonb DEFAULT '[]',drug_category varchar(32),barcode text,manufacturer_name text,regulatory_type text,status text DEFAULT 'ACTIVE',created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now());
      CREATE TABLE shared_product_descriptions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),master_id uuid REFERENCES product_masters(id),content text NOT NULL,summary text,source_type varchar(32) NOT NULL,source_ref_id uuid,description_type varchar(32) DEFAULT 'STORE',language varchar(16) DEFAULT 'ko',status varchar(32) DEFAULT 'candidate',created_by uuid,updated_by uuid,curated_by uuid,curated_at timestamp,created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now(),deleted_at timestamp);
      CREATE UNIQUE INDEX canonical_unique ON shared_product_descriptions(master_id,description_type,COALESCE(language,'ko')) WHERE status='canonical' AND deleted_at IS NULL;`);
    const master = new EntitySchema<ProductMaster>({
      name: 'ProductMaster',
      target: ProductMaster,
      tableName: 'product_masters',
      schema,
      columns: {
        id: { type: 'uuid', primary: true },
        name: { type: String },
        brandName: { name: 'brand_name', type: String, nullable: true },
        categoryId: { name: 'category_id', type: 'uuid', nullable: true },
        brandId: { name: 'brand_id', type: 'uuid', nullable: true },
        specification: { type: String, nullable: true },
        originCountry: { name: 'origin_country', type: String, nullable: true },
        tags: { type: 'jsonb' },
        drugCategory: { name: 'drug_category', type: String, nullable: true },
        barcode: { type: String },
        manufacturerName: { name: 'manufacturer_name', type: String },
        regulatoryType: { name: 'regulatory_type', type: String },
        status: { type: String },
        createdAt: { name: 'created_at', type: Date, createDate: true },
        updatedAt: { name: 'updated_at', type: Date, updateDate: true },
      },
    });
    const description = new EntitySchema<SharedProductDescription>({
      name: 'SharedProductDescription',
      target: SharedProductDescription,
      tableName: 'shared_product_descriptions',
      schema,
      columns: {
        id: { type: 'uuid', primary: true, generated: 'uuid' },
        masterId: { name: 'master_id', type: 'uuid' },
        content: { type: String },
        summary: { type: String, nullable: true },
        sourceType: { name: 'source_type', type: String },
        sourceRefId: { name: 'source_ref_id', type: 'uuid', nullable: true },
        descriptionType: { name: 'description_type', type: String },
        language: { type: String, nullable: true },
        status: { type: String },
        createdBy: { name: 'created_by', type: 'uuid', nullable: true },
        updatedBy: { name: 'updated_by', type: 'uuid', nullable: true },
        curatedBy: { name: 'curated_by', type: 'uuid', nullable: true },
        curatedAt: { name: 'curated_at', type: Date, nullable: true },
        createdAt: { name: 'created_at', type: Date, createDate: true },
        updatedAt: { name: 'updated_at', type: Date, updateDate: true },
        deletedAt: { name: 'deleted_at', type: Date, nullable: true },
      },
    });
    db = new DataSource({
      type: 'postgres',
      url: url.toString(),
      schema,
      entities: [master, description],
      synchronize: false,
      migrationsRun: false,
      installExtensions: false,
      extra: { options: `-c search_path=${schema},public` },
    });
    await db.initialize();
    const makeRunner = db.createQueryRunner.bind(db);
    db.createQueryRunner = (...args) => {
      const runner = makeRunner(...args),
        query = runner.query.bind(runner);
      runner.query = async (sql, params, structured) => {
        if (
          failRenewal &&
          sql.startsWith('INSERT INTO settings') &&
          params?.[2] === 'product_description_renewal'
        )
          throw new Error('synthetic renewal persistence failure');
        return query(sql, params, structured);
      };
      return runner;
    };
    catalog = new NetureCatalogService(db);
    descriptions = new SharedProductDescriptionService(db);
  });
  beforeEach(async () => {
    failRenewal = false;
    await pool.query('TRUNCATE settings,shared_product_descriptions,product_masters');
    await pool.query(
      "INSERT INTO product_masters(id,name,brand_name,specification,tags,barcode,manufacturer_name,regulatory_type) VALUES($1,'원본 상품','원본 브랜드','500mg','[]','SYNTHETIC','합성 제조사','HEALTH_FUNCTIONAL')",
      [productId],
    );
    for (const [type, language] of [
      ['STORE', 'ko'],
      ['B2B', 'ko'],
      ['STORE', 'en'],
    ])
      await pool.query(
        "INSERT INTO shared_product_descriptions(id,master_id,description_type,language,content,summary,source_type,status) VALUES($1,$2,$3,$4,'<p>원본</p>','요약','manual','canonical')",
        [randomUUID(), productId, type, language],
      );
  });
  afterAll(async () => {
    try {
      if (db?.isInitialized) await db.destroy();
    } finally {
      if (pool) {
        try {
          if (created) {
            await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
            expect(
              (await pool.query('SELECT 1 FROM pg_namespace WHERE nspname=$1', [schema])).rowCount,
            ).toBe(0);
          }
        } finally {
          await pool.end();
        }
      }
    }
  });
  const tasks = async () =>
    (
      await pool.query(
        "SELECT value FROM settings WHERE type='product_description_renewal' ORDER BY key",
      )
    ).rows.map((r) => r.value);
  const eventCount = async () =>
    (await pool.query("SELECT * FROM settings WHERE type='product_correction_edit_event'"))
      .rowCount;
  const candidate = (content = '<p>변경 본문</p>', summary = '새 요약') =>
    descriptions.createCandidate({
      masterId: productId,
      content,
      summary,
      sourceType: 'manual',
      descriptionType: 'STORE',
      language: 'ko',
      createdBy: actor,
    });
  it('updates ordinary metadata and creates one event with all current description type/language targets', async () => {
    const result = await catalog.updateProductMaster(
      productId,
      { name: '새 상품명', specification: '600mg' },
      actor,
    );
    expect(result.success).toBe(true);
    expect(await eventCount()).toBe(1);
    const records = await tasks();
    expect(records).toHaveLength(3);
    expect(
      records.every(
        (r) =>
          r.origin === 'catalog-edit' &&
          r.changeActorId === actor &&
          r.productName === '새 상품명' &&
          !r.proposalId &&
          r.purposes.length === 0,
      ),
    ).toBe(true);
    expect(records[0].changedFields).toEqual(['name', 'specification']);
    expect(records[0].sourceChanges).toContainEqual({
      field: 'specification',
      before: '500mg',
      after: '600mg',
    });
    const detail = await new ProductDescriptionRenewalService(db).detail(records[0].id);
    await new ProductDescriptionRenewalService(db).update(
      records[0].id,
      {
        revision: 1,
        fingerprint: detail.fingerprint,
        purposes: ['professional'],
        state: 'done',
        notes: '일반 편집 변경 사항 확인',
      },
      actor,
    );
  });
  it('does not duplicate work or touch updatedAt on same-value saves and concurrent same-value requests', async () => {
    const before = (
      await pool.query('SELECT updated_at FROM product_masters WHERE id=$1', [productId])
    ).rows[0].updated_at;
    await catalog.updateProductMaster(
      productId,
      { specification: '500mg', ignored: 'anything' },
      actor,
    );
    expect(await eventCount()).toBe(0);
    expect(
      (await pool.query('SELECT updated_at FROM product_masters WHERE id=$1', [productId])).rows[0]
        .updated_at,
    ).toEqual(before);
    await Promise.all([
      catalog.updateProductMaster(productId, { specification: '600mg' }, actor),
      catalog.updateProductMaster(productId, { specification: '600mg' }, actor),
    ]);
    expect(await eventCount()).toBe(1);
    expect(await tasks()).toHaveLength(3);
  });
  it('records database-normalized persisted values rather than an input-only representation', async () => {
    const result = await catalog.updateProductMaster(productId, { brandName: 42 }, actor);
    expect(result.data!.brandName).toBe('42');
    expect((await tasks())[0].sourceChanges).toContainEqual({
      field: 'brandName',
      before: '원본 브랜드',
      after: '42',
    });
    await catalog.updateProductMaster(productId, { brandName: 42 }, actor);
    expect(await eventCount()).toBe(1);
  });
  it('preserves the immutable guard and creates a missing-description review when no description exists', async () => {
    expect(
      (await catalog.updateProductMaster(productId, { barcode: 'replace' }, actor)).success,
    ).toBe(false);
    expect(await eventCount()).toBe(0);
    await pool.query('DELETE FROM shared_product_descriptions');
    await catalog.updateProductMaster(productId, { brandName: '변경 브랜드' }, actor);
    expect(await tasks()).toEqual([
      expect.objectContaining({ descriptionType: 'STORE', language: 'ko', descriptionId: null }),
    ]);
  });
  it('rolls back the product edit when renewal persistence fails', async () => {
    failRenewal = true;
    await expect(
      catalog.updateProductMaster(productId, { name: '실패 변경' }, actor),
    ).rejects.toThrow('synthetic renewal persistence failure');
    expect(
      (await pool.query('SELECT name FROM product_masters WHERE id=$1', [productId])).rows[0].name,
    ).toBe('원본 상품');
    expect(await eventCount()).toBe(0);
    expect(await tasks()).toHaveLength(0);
  });
  it('tracks administrator canonical content/summary changes while preserving other languages and types', async () => {
    const row = await candidate('<p>변경 본문</p><script>bad()</script>');
    const saved = await descriptions.setCanonical(row.id, actor, { trackAdminEdit: true });
    expect(saved.content).toBe('<p>변경 본문</p>');
    expect(await eventCount()).toBe(1);
    expect((await tasks())[0]).toMatchObject({
      origin: 'admin-description',
      changeActorId: actor,
      changedFields: ['descriptionContent', 'descriptionSummary'],
    });
    expect(
      (
        await pool.query(
          "SELECT content FROM shared_product_descriptions WHERE status='canonical' AND (description_type='B2B' OR language='en')",
        )
      ).rows.every((r) => r.content === '<p>원본</p>'),
    ).toBe(true);
  });
  it('links the first administrator description in its actual type/language and does not duplicate a replay', async () => {
    await pool.query('DELETE FROM shared_product_descriptions');
    const row = await descriptions.createCandidate({
      masterId: productId,
      content: '<p>최초 설명</p>',
      summary: null,
      sourceType: 'manual',
      descriptionType: 'B2C',
      language: 'ja',
      createdBy: actor,
    });
    const saved = await descriptions.setCanonical(row.id, actor, { trackAdminEdit: true });
    expect(await tasks()).toEqual([
      expect.objectContaining({
        descriptionId: saved.id,
        descriptionType: 'B2C',
        language: 'ja',
        origin: 'admin-description',
        changedFields: ['descriptionContent'],
      }),
    ]);
    await descriptions.setCanonical(row.id, actor, { trackAdminEdit: true });
    expect(await eventCount()).toBe(1);
  });
  it('does not replace canonical or create another review when the same body and summary are saved again', async () => {
    const first = await candidate('<p>원본</p>', '요약');
    const before = (
      await pool.query(
        "SELECT id FROM shared_product_descriptions WHERE status='canonical' AND description_type='STORE' AND language='ko'",
      )
    ).rows[0].id;
    expect((await descriptions.setCanonical(first.id, actor, { trackAdminEdit: true })).id).toBe(
      before,
    );
    expect(await eventCount()).toBe(0);
    const a = await candidate(),
      b = await candidate();
    const result = await Promise.all([
      descriptions.setCanonical(a.id, actor, { trackAdminEdit: true }),
      descriptions.setCanonical(b.id, actor, { trackAdminEdit: true }),
    ]);
    expect(result[0].id).toBe(result[1].id);
    expect(await eventCount()).toBe(1);
  });
  it('rolls back canonical promotion and events when a review cannot be recorded', async () => {
    const row = await candidate();
    failRenewal = true;
    await expect(
      descriptions.setCanonical(row.id, actor, { trackAdminEdit: true }),
    ).rejects.toThrow('synthetic renewal persistence failure');
    expect(
      (await pool.query('SELECT status FROM shared_product_descriptions WHERE id=$1', [row.id]))
        .rows[0].status,
    ).toBe('candidate');
    expect(
      (
        await pool.query(
          "SELECT content FROM shared_product_descriptions WHERE status='canonical' AND description_type='STORE' AND language='ko'",
        )
      ).rows[0].content,
    ).toBe('<p>원본</p>');
    expect(await eventCount()).toBe(0);
  });
  it('does not expand supplier/default candidate promotion workflows without the admin opt-in', async () => {
    const row = await candidate();
    await descriptions.setCanonical(row.id, actor);
    expect(await eventCount()).toBe(0);
    expect(await tasks()).toHaveLength(0);
  });
  it('deduplicates an already-delivered explicit event identity and retains event ordering across reversions', async () => {
    const id = randomUUID();
    const input = {
      id,
      productId,
      productName: '합성 상품',
      origin: 'catalog-edit' as const,
      actorId: actor,
      changes: [{ field: 'name' as const, before: 'A', after: 'B' }],
    };
    await db.transaction((manager) => enqueueProductEditRenewals(manager, input));
    await db.transaction((manager) => enqueueProductEditRenewals(manager, input));
    expect(await eventCount()).toBe(1);
    await catalog.updateProductMaster(productId, { specification: '600mg' }, actor);
    await catalog.updateProductMaster(productId, { specification: '500mg' }, actor);
    expect(await eventCount()).toBe(3);
  });
});
