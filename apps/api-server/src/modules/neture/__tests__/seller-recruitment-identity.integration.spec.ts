import { randomUUID } from 'node:crypto';
import { DataSource, type QueryRunner } from 'typeorm';
import { AlignSellerRecruitmentApplicationIdentity1791477914134 } from '../../../database/migrations/1791477914134-AlignSellerRecruitmentApplicationIdentity.js';
import { AppDataSource } from '../../../database/connection.js';
import { SellerRecruitmentService } from '../services/seller-recruitment.service.js';

jest.mock('../../../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn() } }));
jest.mock('../entities/index.js', () => ({
  SellerRecruitment: class {}, SellerRecruitmentApplication: class {},
  RecruitmentStatus: { RECRUITING: 'recruiting' }, ExposureStatus: { APPROVED: 'approved' },
  ApplicationStatus: { PENDING: 'pending', CANCELLED: 'cancelled' },
  SELLER_RECRUITMENT_TABLE: 'seller_recruitments', SELLER_RECRUITMENT_APPLICATION_TABLE: 'seller_recruitment_applications',
}));
jest.mock('../services/service-audience.service.js', () => ({}));
jest.mock('../../../services/NotificationService.js', () => ({ notificationService: {} }));
jest.mock('../middleware/supplier-context.resolver.js', () => ({}));

const url = process.env.NETURE_PHARMACY_IT_DATABASE_URL;
const databaseTests = url ? describe : describe.skip;
let database: DataSource;
databaseTests('Recruitment application identity — isolated PostgreSQL', () => {
  beforeAll(async () => {
    if (!['127.0.0.1', 'localhost'].includes(new URL(url!).hostname)) throw new Error('Use an isolated local test database');
    database = new DataSource({ type: 'postgres', url, entities: [], synchronize: false, logging: false });
    await database.initialize();
  });
  afterAll(async () => { if (database?.isInitialized) await database.destroy(); });

  it('retains organization uniqueness, permits independent applications and blocks unsafe rollback without deleting data', async () => {
    await database.transaction(async manager => {
      await manager.query(`CREATE TEMP TABLE seller_recruitment_applications (
        id uuid PRIMARY KEY, recruitment_id uuid, applicant_id uuid, applicant_organization_id uuid,
        CONSTRAINT "UQ_seller_recruitment_applications_recruitment_applicant" UNIQUE(recruitment_id,applicant_id)
      ) ON COMMIT DROP`);
      await manager.query(`CREATE UNIQUE INDEX uq_seller_recruitment_applications_org
        ON seller_recruitment_applications(recruitment_id,applicant_organization_id) WHERE applicant_organization_id IS NOT NULL`);
      const migration = new AlignSellerRecruitmentApplicationIdentity1791477914134();
      const runner = manager as unknown as QueryRunner;
      await migration.up(runner);
      const recruitment = randomUUID(); const actor = randomUUID(); const orgA = randomUUID(); const orgB = randomUUID();
      const insert = (user: string, org: string | null) => manager.query('INSERT INTO seller_recruitment_applications VALUES($1,$2,$3,$4)', [randomUUID(),recruitment,user,org]);
      await insert(actor,orgA); await insert(actor,orgB);
      async function rejectsDuplicate(user: string, org: string | null, constraint: string) {
        await manager.query('SAVEPOINT identity_conflict');
        await expect(insert(user,org)).rejects.toMatchObject({ driverError: { code: '23505', constraint } });
        await manager.query('ROLLBACK TO SAVEPOINT identity_conflict');
        await manager.query('RELEASE SAVEPOINT identity_conflict');
      }
      await rejectsDuplicate(randomUUID(),orgA,'uq_seller_recruitment_applications_org');
      const legacy = randomUUID(); await insert(legacy,null);
      await rejectsDuplicate(legacy,null,'uq_seller_recruitment_applications_legacy_applicant');
      await expect(migration.down(runner)).rejects.toThrow('Rollback blocked');
      expect(Number((await manager.query('SELECT COUNT(*) AS count FROM seller_recruitment_applications'))[0].count)).toBe(3);
      // Only temporary fixture rows are cleared to exercise a safe down/up cycle.
      await manager.query('DELETE FROM seller_recruitment_applications');
      await migration.down(runner); await migration.up(runner);
      await insert(actor,orgA); await insert(actor,orgB);
    });
  });

  it('the service lists only the selected store and separates organization-less user history', async () => {
    await database.transaction(async manager => {
      await manager.query(`CREATE TEMP TABLE seller_recruitments(id uuid PRIMARY KEY, product_id uuid,
        product_name text, seller_name text, service_id text, seller_id uuid) ON COMMIT DROP;
        CREATE TEMP TABLE seller_recruitment_applications(id uuid PRIMARY KEY, recruitment_id uuid,
        applicant_id uuid, applicant_organization_id uuid, status text, applied_at timestamptz,
        decided_at timestamptz, decided_by uuid, reason text) ON COMMIT DROP;`);
      const actor = randomUUID(); const colleague = randomUUID(); const orgA = randomUUID(); const orgB = randomUUID();
      const records = [];
      for (const [user, organization] of [[actor,orgA],[colleague,orgA],[actor,orgB],[actor,null],[colleague,null]]) {
        const recruitment = randomUUID(); const application = randomUUID(); records.push(application);
        await manager.query(`INSERT INTO seller_recruitments VALUES($1,$2,'LOCAL PRODUCT','LOCAL SUPPLIER','kpa-society',$3)`,[recruitment,randomUUID(),randomUUID()]);
        await manager.query(`INSERT INTO seller_recruitment_applications VALUES($1,$2,$3,$4,'pending',NOW(),NULL,NULL,NULL)`,[application,recruitment,user,organization]);
      }
      const query = jest.spyOn(AppDataSource,'query').mockImplementation((sql: string, params?: any[]) => manager.query(sql,params));
      try {
        const service = new SellerRecruitmentService();
        expect((await service.getApplicationsForApplicant(actor,orgA)).map(row=>row.applicationId).sort()).toEqual(records.slice(0,2).sort());
        expect((await service.getApplicationsForApplicant(actor,orgB)).map(row=>row.applicationId)).toEqual([records[2]]);
        expect((await service.getApplicationsForApplicant(actor)).map(row=>row.applicationId)).toEqual([records[3]]);
      } finally { query.mockRestore(); }
    });
  });

  it('supplier review names the application organization instead of the operator’s first membership', async () => {
    await database.transaction(async manager => {
      await manager.query(`CREATE TEMP TABLE seller_recruitment_applications(id uuid PRIMARY KEY, recruitment_id uuid,
        applicant_id uuid, applicant_organization_id uuid, applicant_name text, status text, applied_at timestamptz,
        decided_at timestamptz, decided_by uuid, reason text) ON COMMIT DROP;
        CREATE TEMP TABLE users(id uuid PRIMARY KEY, name text, email text) ON COMMIT DROP;
        CREATE TEMP TABLE organizations(id uuid PRIMARY KEY, name text) ON COMMIT DROP;
        CREATE TEMP TABLE organization_members(user_id uuid, organization_id uuid, left_at timestamptz) ON COMMIT DROP;`);
      const actor=randomUUID(); const recruitment=randomUUID(); const supplier=randomUUID(); const first=randomUUID(); const selected=randomUUID();
      await manager.query("INSERT INTO users VALUES($1,'LOCAL OPERATOR','local-review@example.test')",[actor]);
      await manager.query("INSERT INTO organizations VALUES($1,'FIRST STORE'),($2,'SELECTED STORE')",[first,selected]);
      await manager.query('INSERT INTO organization_members VALUES($1,$2,NULL)',[actor,first]);
      const application=randomUUID(); const legacy=randomUUID();
      for (const [id,org] of [[application,selected],[legacy,null]]) {
        await manager.query("INSERT INTO seller_recruitment_applications VALUES($1,$2,$3,$4,'LOCAL OPERATOR','pending',NOW(),NULL,NULL,NULL)",[id,recruitment,actor,org]);
      }
      const query=jest.spyOn(AppDataSource,'query').mockImplementation((sql: string,params?: any[])=>manager.query(sql,params));
      try {
        const service=new SellerRecruitmentService();
        (service as any)._recruitmentRepo={ findOne: jest.fn().mockResolvedValue({ id: recruitment, sellerId: supplier }) };
        const review=await service.getRecruitmentApplications(recruitment,supplier);
        expect(review?.applications.find(row=>row.id===application)?.organizationName).toBe('SELECTED STORE');
        expect(review?.applications.find(row=>row.id===legacy)?.organizationName).toBe('FIRST STORE');
      } finally { query.mockRestore(); }
    });
  });
});
