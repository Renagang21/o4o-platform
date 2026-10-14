import { DataSource, type QueryRunner } from 'typeorm';
import { AppDataSource } from '../../../../database/connection.js';
import { NetureOfferService } from '../offer.service.js';

jest.mock('@o4o/ai-prompts/store', () => ({ PRODUCT_CONTENT_PROMPTS: {} }), { virtual: true });

// Only the explicit loopback fixture DB; never load application .env or a production proxy.
const port = Number(process.env.O4O_DEMO_REPAIR_TEST_PORT);
const integration = Number.isInteger(port) && port > 1024 && ![5432, 5442].includes(port) ? describe : describe.skip;
integration('supplier product pagination with legacy JSON tags (isolated PostgreSQL)', () => {
  let ds: DataSource;
  let q: QueryRunner;
  let supplierId: string;
  let querySpy: jest.SpyInstance;
  const service = new NetureOfferService({} as never);

  beforeAll(async () => {
    ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port, username: 'o4o_fixture',
      database: 'o4o_demo_recovery_test', entities: [], synchronize: false });
    await ds.initialize();
  });
  afterAll(async () => { if (ds?.isInitialized) await ds.destroy(); });
  beforeEach(async () => {
    q = ds.createQueryRunner();
    await q.startTransaction();
    querySpy = jest.spyOn(AppDataSource, 'query').mockImplementation((sql, params) => q.query(sql, params));
    supplierId = (await q.query(`INSERT INTO neture_suppliers(slug,status)
      VALUES ('pagination-fixture','ACTIVE') RETURNING id`))[0].id;
  });
  afterEach(async () => {
    querySpy.mockRestore();
    if (q.isTransactionActive) await q.rollbackTransaction();
    await q.release();
  });

  async function offer(tags: unknown) {
    const masterId = (await q.query(`INSERT INTO product_masters(name,regulatory_name,manufacturer_name,tags)
      VALUES ('Pagination fixture','Pagination fixture','Fixture maker',$1::jsonb) RETURNING id`,
    [tags === undefined ? null : JSON.stringify(tags)]))[0].id;
    await q.query(`INSERT INTO supplier_product_offers(master_id,supplier_id,slug,price_general,distribution_type)
      VALUES ($1,$2,$3,100,'PRIVATE')`, [masterId, supplierId, masterId]);
  }

  it.each([
    [{ legacy: ['fixture'] }, 20], ['legacy scalar', 20], [null, 20], [undefined, 20],
    [[], 20], [['fixture'], 30],
  ])('reads a page without failing for tags %j', async (tags, expectedScore) => {
    await offer(tags);
    const result = await service.getSupplierProductsPaginated(supplierId, { page: 1, limit: 20 });
    expect(result.pagination.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].completenessScore).toBe(expectedScore);
  });

  it('also evaluates completeness sorting and filtering safely on mixed historical shapes', async () => {
    await offer({ legacy: true });
    await offer(['fixture']);
    const result = await service.getSupplierProductsPaginated(supplierId,
      { sort: 'completeness', completenessStatus: 'INCOMPLETE', limit: 1 });
    expect(result.pagination).toMatchObject({ total: 2, totalPages: 2 });
    expect(result.data).toHaveLength(1);
    expect([20, 30]).toContain(result.data[0].completenessScore);
  });
});
