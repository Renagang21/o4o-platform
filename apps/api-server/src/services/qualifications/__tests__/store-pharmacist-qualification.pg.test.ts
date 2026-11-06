import { Client } from "pg";
import { hasApprovedStorePharmacist } from "../store-pharmacist-qualification";
const port = process.env.STORE_DEMO_LOCAL_PG_PORT;
const local = port === "55443" ? describe : describe.skip;
local(
  "synthetic Demo qualification on disposable loopback PostgreSQL only",
  () => {
    const client = new Client({
      host: "127.0.0.1",
      port: 55443,
      user: "postgres",
      database: "postgres",
    });
    const db = {
      query: async (sql: string, values?: any[]) =>
        (await client.query(sql, values)).rows,
    };
    beforeAll(async () => {
      await client.connect();
      await client.query(`CREATE TEMP TABLE users(id text,status text,"isActive" boolean,"isEmailVerified" boolean);
      CREATE TEMP TABLE demo_accounts(user_id text,is_active boolean,demo_type text);
      CREATE TEMP TABLE organizations(id text,type text);
      CREATE TEMP TABLE organization_members(user_id text,organization_id text,role text,left_at timestamptz);
      CREATE TEMP TABLE neture_pharmacy_memberships(organization_id text,applicant_user_id text,status text);
      CREATE TEMP TABLE service_memberships(user_id text,service_key text,status text);
      CREATE TEMP TABLE kpa_pharmacist_profiles(user_id text,qualification_status text,license_verified boolean,license_number text,verified_at timestamptz,verified_by text);`);
    });
    afterAll(async () => {
      await client.end();
    });
    beforeEach(async () => {
      await client.query(`TRUNCATE users,demo_accounts,organizations,organization_members,neture_pharmacy_memberships,service_memberships,kpa_pharmacist_profiles;
    INSERT INTO users VALUES('owner','active',true,true);
    INSERT INTO demo_accounts VALUES('owner',true,'STORE_OWNER');
    INSERT INTO organizations VALUES('pharmacy','pharmacy'),('other','pharmacy');
    INSERT INTO organization_members VALUES('owner','pharmacy','owner',NULL);
    INSERT INTO neture_pharmacy_memberships VALUES('pharmacy','owner','active');
    INSERT INTO service_memberships VALUES('owner','neture','active');`);
    });
    it("permits only the resolved synthetic pharmacy and does not create a real profile", async () => {
      expect(await hasApprovedStorePharmacist(db, "owner", "pharmacy")).toBe(
        true,
      );
      expect(await hasApprovedStorePharmacist(db, "owner", "other")).toBe(
        false,
      );
      expect(
        (
          await client.query(
            "SELECT count(*)::int AS n FROM kpa_pharmacist_profiles",
          )
        ).rows[0].n,
      ).toBe(0);
    });
    it.each([
      `DELETE FROM demo_accounts`,
      `UPDATE demo_accounts SET is_active=false`,
      `UPDATE demo_accounts SET demo_type='STORE_STAFF'`,
      `UPDATE users SET "isActive"=false`,
      `UPDATE users SET "isEmailVerified"=false`,
      `UPDATE users SET status='suspended'`,
      `UPDATE organizations SET type='supplier'`,
      `UPDATE organization_members SET role='staff'`,
      `UPDATE organization_members SET left_at=now()`,
      `UPDATE neture_pharmacy_memberships SET applicant_user_id='another'`,
      `UPDATE neture_pharmacy_memberships SET status='pending'`,
      `UPDATE service_memberships SET status='suspended'`,
      `INSERT INTO kpa_pharmacist_profiles VALUES('owner','pending',false,NULL,NULL,NULL)`,
      `INSERT INTO kpa_pharmacist_profiles VALUES('owner','revoked',false,NULL,NULL,NULL)`,
      `INSERT INTO kpa_pharmacist_profiles VALUES('owner','rejected',false,NULL,NULL,NULL)`,
    ])("fails closed after %s", async (sql) => {
      await client.query(sql);
      expect(await hasApprovedStorePharmacist(db, "owner", "pharmacy")).toBe(
        false,
      );
    });
  },
);
