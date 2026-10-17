import { DataSource } from "typeorm";
import { randomUUID } from "node:crypto";
import { CooperativeService } from "../services/cooperative.service.js";
import { provisionTestCooperative } from "../services/provision-test-cooperative.js";

const integration =
  process.env.O4O_COOP_APPROVAL_IT === "1" ? describe : describe.skip;
integration("individual cooperative identity on isolated PostgreSQL", () => {
  let db: DataSource;
  let created:
    | { cooperative: string; business: string; organization: string }
    | undefined;
  const accounts = {
    operatorEmail: "operator@example.invalid",
    memberEmail: "member@example.invalid",
  };
  const member = randomUUID(),
    operator = randomUUID(),
    outsider = randomUUID();
  const business = randomUUID(),
    org = randomUUID(),
    otherBusiness = randomUUID(),
    otherOrg = randomUUID();
  const coop = randomUUID(),
    otherCoop = randomUUID();
  beforeAll(async () => {
    db = new DataSource({
      type: "postgres",
      host: "127.0.0.1",
      port: 55437,
      username: "postgres",
      database: "o4o_coop_approval",
      entities: [],
      synchronize: false,
    });
    await db.initialize();
    for (const [id, email] of [
      [member, "member@example.invalid"],
      [operator, "operator@example.invalid"],
      [outsider, `${outsider}@example.invalid`],
    ]) {
      await db.query(
        `INSERT INTO users(id,email,status,"isActive") VALUES ($1,$2,'active',true)`,
        [id, email],
      );
    }
    for (const [id, key] of [
      [org, "coop-test"],
      [otherOrg, otherOrg],
    ])
      await db.query(
        `INSERT INTO organizations(id,name,code,type) VALUES ($1,'Cooperative test',$2,'semi_franchise')`,
        [id, key],
      );
    await db.query(
      `INSERT INTO semi_franchises(id,key,name,organization_id) VALUES ($1,'coop-test','테스트 협동조합',$2),($3,$4,'Other',$5)`,
      [business, org, otherBusiness, otherBusiness, otherOrg],
    );
    await db.query(
      `INSERT INTO cooperatives(id,slug,name,semi_franchise_id) VALUES ($1,'test','테스트 협동조합',$2),($3,$4,'Other',$5)`,
      [coop, business, otherCoop, otherCoop, otherBusiness],
    );
    await db.query(
      `INSERT INTO cooperative_memberships(cooperative_id,user_id,status) VALUES ($1,$2,'active'),($3,$2,'suspended')`,
      [coop, member, otherCoop],
    );
    await db.query(
      `INSERT INTO semi_franchise_operators(semi_franchise_id,user_id,assigned_by) VALUES ($1,$2,$2)`,
      [business, operator],
    );
  });
  afterAll(async () => {
    if (created) {
      await db.query("DELETE FROM cooperatives WHERE id=$1", [
        created.cooperative,
      ]);
      await db.query("DELETE FROM semi_franchises WHERE id=$1", [
        created.business,
      ]);
      await db.query("DELETE FROM organizations WHERE id=$1", [
        created.organization,
      ]);
    }
    await db.query("DELETE FROM cooperatives WHERE id = ANY($1::uuid[])", [
      [coop, otherCoop],
    ]);
    await db.query("DELETE FROM semi_franchises WHERE id = ANY($1::uuid[])", [
      [business, otherBusiness],
    ]);
    await db.query("DELETE FROM organizations WHERE id = ANY($1::uuid[])", [
      [org, otherOrg],
    ]);
    await db.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [
      [member, operator, outsider],
    ]);
    await db.destroy();
  });
  it("keeps independent personal memberships without a pharmacy organization or operator grant", async () => {
    const result = await new CooperativeService(db).session(member);
    expect(result.memberships).toEqual(
      expect.arrayContaining([
        { cooperativeId: coop, userId: member, status: "active" },
        { cooperativeId: otherCoop, userId: member, status: "suspended" },
      ]),
    );
    expect(result.cooperativeOperators).toEqual([]);
    expect(result.federationOperators).toEqual([]);
    expect(
      (await new CooperativeService(db).session(outsider)).memberships,
    ).toEqual([]);
  });
  it("requires both the business assignment and an existing active operator role", async () => {
    expect(
      (await new CooperativeService(db).session(operator)).cooperativeOperators,
    ).toEqual([]);
    await expect(provisionTestCooperative(db, accounts, true)).rejects.toThrow(
      "EXISTING_OPERATOR_ROLE_REQUIRED",
    );
    await db.query(
      `INSERT INTO role_assignments(user_id,role,is_active) VALUES ($1,'neture:operator',true)`,
      [operator],
    );
    expect(
      (await new CooperativeService(db).session(operator)).cooperativeOperators,
    ).toEqual([{ cooperativeId: coop, userId: operator }]);
    await db.query(
      `UPDATE semi_franchise_operators SET revoked_at=now() WHERE semi_franchise_id=$1 AND user_id=$2`,
      [business, operator],
    );
    expect(
      (await new CooperativeService(db).session(operator)).cooperativeOperators,
    ).toEqual([]);
  });
  it("provisions only the approved fixture idempotently and never issues pharmacy membership", async () => {
    expect(await provisionTestCooperative(db, accounts)).toMatchObject({
      mode: "dry-run",
      ready: true,
    });
    await provisionTestCooperative(db, accounts, true);
    await provisionTestCooperative(db, accounts, true);
    const [{ count }] = await db.query(
      "SELECT count(*) FROM cooperative_memberships WHERE cooperative_id=$1 AND user_id=$2",
      [coop, member],
    );
    expect(count).toBe("1");
    expect(
      await db.query(
        "SELECT 1 FROM semi_franchise_memberships WHERE semi_franchise_id=$1",
        [business],
      ),
    ).toEqual([]);
    expect(
      (await new CooperativeService(db).session(member)).cooperativeOperators,
    ).toEqual([]);
  });
  it("hides suspended cooperatives and refuses to silently reactivate a suspended personal member", async () => {
    await db.query(
      `UPDATE cooperative_memberships SET status='suspended' WHERE cooperative_id=$1 AND user_id=$2`,
      [coop, member],
    );
    await expect(provisionTestCooperative(db, accounts, true)).rejects.toThrow(
      "MEMBERSHIP_CONFLICT",
    );
    await db.query(`UPDATE cooperatives SET status='suspended' WHERE id=$1`, [
      coop,
    ]);
    expect(
      (await new CooperativeService(db).directory()).some(
        (c: { id: string }) => c.id === coop,
      ),
    ).toBe(false);
    expect(
      (await new CooperativeService(db).session(member)).memberships,
    ).toHaveLength(1);
    expect(
      (await new CooperativeService(db).session(operator)).cooperativeOperators,
    ).toEqual([]);
  });
  it("creates the approved business, cooperative and personal member on an empty target", async () => {
    await db.query("DELETE FROM cooperatives WHERE id=$1", [coop]);
    await db.query("DELETE FROM semi_franchises WHERE id=$1", [business]);
    expect(await provisionTestCooperative(db, accounts)).toMatchObject({
      businessExists: false,
      cooperativeExists: false,
    });
    await provisionTestCooperative(db, accounts, true);
    [created] =
      await db.query(`SELECT c.id AS cooperative, sf.id AS business, sf.organization_id AS organization
      FROM cooperatives c JOIN semi_franchises sf ON sf.id=c.semi_franchise_id WHERE c.slug='test'`);
    expect(
      (await new CooperativeService(db).session(member)).memberships,
    ).toEqual(
      expect.arrayContaining([
        {
          cooperativeId: created!.cooperative,
          userId: member,
          status: "active",
        },
      ]),
    );
    expect(
      (await new CooperativeService(db).session(operator)).cooperativeOperators,
    ).toEqual([{ cooperativeId: created!.cooperative, userId: operator }]);
  });
});
