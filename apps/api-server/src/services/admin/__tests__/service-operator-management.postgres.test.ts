const mockTokens:string[]=[];
jest.mock('../../email.service.js',()=>({emailService:{sendEmail:jest.fn(async(o:any)=>{const token=String(o.text).match(/#token=([a-f0-9]{64})/)?.[1];if(token)mockTokens.push(token);return {success:true};})}}));
import { ServiceOperatorInvitationService } from '../service-operator-invitation.service.js';
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { createCarePharmReviewDb } from "../../../__tests__/support/carepharm-review-db.js";
// Exercise the real authorization SQL + transaction rollback; RBAC writer invocation is asserted here.
// The canonical writer's entity behavior has its existing independent tests.
jest.mock("../../../modules/auth/services/role-assignment.service.js", () => ({
  roleAssignmentService: {
    assignRole: jest.fn(async (i: any, m: any) =>
      m.query(
        `INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,$2,true)`,
        [i.userId, i.role],
      ),
    ),
    removeRole: jest.fn(async (u: string, r: string, m: any) => {
      const rows = await m.query(
        `UPDATE role_assignments SET is_active=false WHERE user_id=$1 AND role=$2 AND is_active RETURNING id`,
        [u, r],
      );
      return rows[0].length > 0;
    }),
  },
}));
import { roleAssignmentService } from "../../../modules/auth/services/role-assignment.service.js";
import {
  ServiceOperatorManagementService,
  delegationScope,
  OPERATOR_DELEGATION_SCOPES,
} from "../service-operator-management.service.js";
const suite = process.env.CAREPHARM_REVIEW_DATABASE_URL
  ? describe
  : describe.skip;
suite("service-admin delegation — isolated PostgreSQL", () => {
  let db: Awaited<ReturnType<typeof createCarePharmReviewDb>>,
    s: ServiceOperatorManagementService;
  const actor = randomUUID(),
    target = randomUUID();
  beforeAll(async () => {
    db = await createCarePharmReviewDb();
    s = new ServiceOperatorManagementService(db.ds);
    await db.ds
      .query(`CREATE TABLE users(id uuid PRIMARY KEY,name text,email text,status text,"isActive" boolean DEFAULT true,"isEmailVerified" boolean DEFAULT true);
   CREATE TABLE service_memberships(user_id uuid,service_key text,status text,UNIQUE(user_id,service_key));
   CREATE TABLE role_assignments(id uuid DEFAULT gen_random_uuid(),user_id uuid,role text,is_active boolean,valid_from timestamp,valid_until timestamp,assigned_at timestamp DEFAULT now());
   CREATE UNIQUE INDEX one_active_role ON role_assignments(user_id,role) WHERE is_active;
   CREATE TABLE linked_accounts(id uuid DEFAULT gen_random_uuid(),"userId" uuid,provider text);
   CREATE TABLE demo_accounts(user_id uuid,is_active boolean);
   CREATE TABLE semi_franchises(id uuid DEFAULT gen_random_uuid(),key text,status text);
   CREATE TABLE cooperatives(semi_franchise_id uuid);
   CREATE TABLE action_logs(service_key text,user_id uuid,action_key text,source text,status text,meta jsonb);
   CREATE TABLE service_operator_invitations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),invited_email text,service_key text,role text,
     target_user_id uuid,purpose text,status text DEFAULT 'pending',expires_at timestamptz,accepted_user_id uuid,invited_by_user_id uuid,
     created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),accepted_at timestamptz,token_hash text,
     scope_type text DEFAULT 'platform',scope_key text DEFAULT '');
   CREATE UNIQUE INDEX pending_invite ON service_operator_invitations(lower(invited_email),service_key,role,scope_type,scope_key) WHERE status='pending';`);
  });
  afterAll(async () => {
    if (db) await db.close();
  });
  beforeEach(async () => {
    jest.clearAllMocks();mockTokens.length=0;
    await db.ds.query(
      "TRUNCATE service_operator_invitations,users,service_memberships,role_assignments,linked_accounts,demo_accounts,semi_franchises,cooperatives,action_logs",
    );
    await db.ds.query(
      `INSERT INTO users(id,name,email,status) VALUES($1,'Admin','admin@example.invalid','active'),($2,'Candidate','candidate@example.invalid','active')`,
      [actor, target],
    );
    await db.ds.query(
      `INSERT INTO linked_accounts("userId",provider) VALUES($1,'google')`,
      [target],
    );
  });
  async function setup(key = "funding", role?: string) {
    const c = delegationScope(key);
    await db.ds.query(
      `INSERT INTO service_memberships VALUES($1,$3,'active'),($2,$3,'active')`,
      [actor, target, c.membershipKey],
    );
    await db.ds.query(
      `INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,$2,true)`,
      [actor, role ?? c.adminRole],
    );
    if (["pharmacy", "carepharm", "megapharm"].includes(key))
      await db.ds.query(
        `INSERT INTO semi_franchises(key,status) VALUES($1,'active')`,
        [key],
      );
  }
  async function inviteAndAccept(a:string,key:string,u:string) {
    const pending=await s.change(a,key,u,true);
    expect(pending).toMatchObject({invited:true,assigned:false});
    expect(await db.ds.query('SELECT id FROM role_assignments WHERE user_id=$1 AND role=$2 AND is_active',[u,delegationScope(key).operatorRole])).toHaveLength(0);
    await new ServiceOperatorInvitationService(db.ds).accept(mockTokens[mockTokens.length-1],u);
    return pending;
  }
  it.each(Object.keys(OPERATOR_DELEGATION_SCOPES))(
    "%s admin assigns and revokes only its own operator",
    async (key) => {
      await setup(key);
      const c = delegationScope(key);
      expect(
        (await s.list(actor, key, "Candidate")).candidates.map(
          (p: any) => p.userId,
        ),
      ).toEqual([target]);
      const out = await inviteAndAccept(actor,key,target);
      expect(out.role).toBe(c.operatorRole);
      expect(roleAssignmentService.assignRole).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: target,
          role: c.operatorRole,
          assignedBy: actor,
        }),
        expect.anything(),
      );
      expect((await s.list(actor, key)).operators).toHaveLength(1);
      await s.change(actor, key, target, false);
      expect((await s.list(actor, key)).operators).toHaveLength(0);
      expect(
        (await db.ds.query("SELECT * FROM action_logs")).map(
          (a: any) => a.meta.scope,
        ),
      ).toEqual([key, key]);
    },
  );
  it.each([
    "funding:operator",
    "supplier:admin",
    "neture:admin",
    "platform:super_admin",
  ])("role %s cannot administer funding", async (role) => {
    await setup("funding", role);
    await expect(
      s.change(actor, "funding", target, true),
    ).rejects.toMatchObject({ status: 403 });
    expect(roleAssignmentService.assignRole).not.toHaveBeenCalled();
  });
  it("business admin cannot delegate another business or Neture-wide roles", async () => {
    await setup("carepharm");
    await expect(s.list(actor, "neture")).rejects.toMatchObject({
      status: 403,
    });
    await expect(s.list(actor, "megapharm")).rejects.toMatchObject({
      status: 403,
    });
  });
  it.each(["pending", "suspended", "withdrawn"])(
    "actor %s membership invalidates authority immediately",
    async (status) => {
      await setup();
      await db.ds.query(
        "UPDATE service_memberships SET status=$1 WHERE user_id=$2",
        [status, actor],
      );
      await expect(s.list(actor, "funding")).rejects.toMatchObject({
        status: 403,
      });
    },
  );
  it.each(["pending", "suspended", "withdrawn"])(
    "target %s membership is never auto-approved",
    async (status) => {
      await setup();
      await db.ds.query(
        "UPDATE service_memberships SET status=$1 WHERE user_id=$2",
        [status, target],
      );
      await expect(
        s.change(actor, "funding", target, true),
      ).rejects.toMatchObject({ code: "ACTIVE_SERVICE_MEMBER_REQUIRED" });
      expect(roleAssignmentService.assignRole).not.toHaveBeenCalled();
    },
  );
  it("an email-only verified active member can accept a service-admin invitation", async () => {
    await setup();await db.ds.query("DELETE FROM linked_accounts");
    await inviteAndAccept(actor,"funding",target);
    expect(roleAssignmentService.assignRole).toHaveBeenCalledTimes(1);
  });
  it("protects fixed Demo target roles", async () => {
    await setup();
    await db.ds.query("INSERT INTO demo_accounts VALUES($1,true)", [target]);
    await expect(
      s.change(actor, "funding", target, true),
    ).rejects.toMatchObject({ code: "DEMO_ACCOUNT_FORBIDDEN" });
  });
  it("preserves Admin and foreign-service roles when revoking an operator", async () => {
    await setup();
    await inviteAndAccept(actor,"funding",target);
    await db.ds.query(
      `INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'funding:admin',true),($1,'supplier:operator',true)`,
      [target],
    );
    await s.change(actor, "funding", target, false);
    expect(
      (
        await db.ds.query(
          "SELECT role FROM role_assignments WHERE user_id=$1 AND is_active ORDER BY role",
          [target],
        )
      ).map((r: any) => r.role),
    ).toEqual(["funding:admin", "supplier:operator"]);
  });
  it("permits removal after a target service suspension", async () => {
    await setup();
    await inviteAndAccept(actor,"funding",target);
    await db.ds.query(
      `UPDATE service_memberships SET status='suspended' WHERE user_id=$1`,
      [target],
    );
    await s.change(actor, "funding", target, false);
    expect((await s.list(actor, "funding")).operators).toHaveLength(0);
  });
  it('existing operators are not asked to reaccept and their audit stays intact',async()=>{
    await setup();await inviteAndAccept(actor,'funding',target);
    await expect(s.change(actor,'funding',target,true)).rejects.toMatchObject({code:'OPERATOR_ALREADY_ACTIVE'});
    expect(roleAssignmentService.assignRole).toHaveBeenCalledTimes(1);
    expect(await db.ds.query('SELECT * FROM action_logs')).toHaveLength(1);
  });
  it("expired admin has no authority; scheduled operator requires explicit review", async () => {
    await setup();
    await db.ds.query(
      `UPDATE role_assignments SET valid_until=now()-interval '1 day' WHERE user_id=$1`,
      [actor],
    );
    await expect(s.list(actor, "funding")).rejects.toMatchObject({
      status: 403,
    });
    await db.ds.query("UPDATE role_assignments SET valid_until=NULL");
    await db.ds.query(
      `INSERT INTO role_assignments(user_id,role,is_active,valid_until) VALUES($1,'funding:operator',false,now()-interval '1 day')`,
      [target],
    );
    await expect(
      s.change(actor, "funding", target, true),
    ).rejects.toMatchObject({ code: "OPERATOR_ROLE_SCHEDULE_REVIEW_REQUIRED" });
  });
  it("does not replace individual cooperative authority with global business roles", async () => {
    await setup("pharmacy");
    await db.ds.query(
      "INSERT INTO cooperatives SELECT id FROM semi_franchises",
    );
    await expect(s.list(actor, "pharmacy")).rejects.toMatchObject({
      code: "BUSINESS_OPERATOR_SCOPE_UNAVAILABLE",
    });
  });
  it("audit failure rolls back the role write", async () => {
    await setup();
    await db.ds.query(
      `ALTER TABLE action_logs ADD CONSTRAINT deny_audit CHECK(false)`,
    );
    try {
      await expect(inviteAndAccept(actor,"funding",target)).rejects.toThrow();
      expect(
        await db.ds.query("SELECT * FROM role_assignments WHERE user_id=$1", [
          target,
        ]),
      ).toHaveLength(0);
    } finally {
      await db.ds.query("ALTER TABLE action_logs DROP CONSTRAINT deny_audit");
    }
  });
  it("search filters both current operators and candidates, escaping wildcards", async () => {
    await setup();
    await inviteAndAccept(actor,"funding",target);
    expect((await s.list(actor, "funding", "no-match")).operators).toHaveLength(
      0,
    );
    expect((await s.list(actor, "funding", "%%")).candidates).toHaveLength(0);
  });
  const netureScopes = [
    "neture",
    "pharmacy",
    "carepharm",
    "megapharm",
    "pharmcoop",
  ];
  it.each(
    netureScopes.flatMap((key) =>
      ["none", "pending", "rejected", "active"].map((status) => [key, status]),
    ),
  )(
    "%s keeps canonical main eligibility with %s membership",
    async (key, status) => {
      await setup(key);
      if (status === "none")
        await db.ds.query("DELETE FROM service_memberships");
      else
        await db.ds.query("UPDATE service_memberships SET status=$1", [status]);
      expect((await s.list(actor, key, "Candidate")).candidates).toHaveLength(
        1,
      );
      await inviteAndAccept(actor,key,target);
      expect((await s.list(actor, key)).operators).toHaveLength(1);
      expect((await s.list(actor, key)).operators[0].membershipStatus).toBe(
        "active",
      );
      const memberships = await db.ds.query(
        "SELECT status FROM service_memberships",
      );
      expect(memberships.map((r: any) => r.status)).toEqual(
        status === "none" ? [] : [status, status],
      );
    },
  );
  it.each(
    netureScopes.flatMap((key) =>
      ["suspended", "withdrawn"].map((status) => [key, status]),
    ),
  )(
    "%s rejects explicit actor and target %s membership",
    async (key, status) => {
      await setup(key);
      await db.ds.query(
        "UPDATE service_memberships SET status=$1 WHERE user_id=$2",
        [status, actor],
      );
      await expect(s.list(actor, key)).rejects.toMatchObject({
        code: "SERVICE_ADMIN_REQUIRED",
      });
      await db.ds.query(
        "UPDATE service_memberships SET status=$1 WHERE user_id=$2",
        ["active", actor],
      );
      await db.ds.query(
        "UPDATE service_memberships SET status=$1 WHERE user_id=$2",
        [status, target],
      );
      expect((await s.list(actor, key, "Candidate")).candidates).toHaveLength(
        0,
      );
      await expect(s.change(actor, key, target, true)).rejects.toMatchObject({
        code: "ACTIVE_SERVICE_MEMBER_REQUIRED",
      });
    },
  );
  it.each(
    ["neture", "funding"].flatMap((key) =>
      ["inactive", "unverified", "pending", "rejected", "suspended"].map(
        (state) => [key, state],
      ),
    ),
  )(
    "%s shows %s account operator unavailable but allows role removal",
    async (key, state) => {
      await setup(key);
      await inviteAndAccept(actor,key,target);
      if (state === "inactive")
        await db.ds.query('UPDATE users SET "isActive"=false WHERE id=$1', [
          target,
        ]);
      else if (state === "unverified")
        await db.ds.query(
          'UPDATE users SET "isEmailVerified"=false WHERE id=$1',
          [target],
        );
      else
        await db.ds.query("UPDATE users SET status=$1 WHERE id=$2", [
          state,
          target,
        ]);
      expect((await s.list(actor, key)).operators[0].membershipStatus).toBe(
        "unavailable",
      );
      await s.change(actor, key, target, false);
      expect((await s.list(actor, key)).operators).toHaveLength(0);
    },
  );
  it('self-change protection uses canonical UUID casing',async()=>{
    await setup();await expect(s.change(actor,'funding',actor.toUpperCase(),true)).rejects.toMatchObject({code:'SELF_OPERATOR_CHANGE_FORBIDDEN'});
  });
  it('parallel invitations yield one pending request and one accepted grant',async()=>{
    await setup();const results=await Promise.allSettled([s.change(actor,'funding',target,true),s.change(actor,'funding',target,true)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(await db.ds.query('SELECT * FROM role_assignments WHERE user_id=$1',[target])).toHaveLength(0);
    await new ServiceOperatorInvitationService(db.ds).accept(mockTokens[0],target);
    expect(await db.ds.query('SELECT * FROM role_assignments WHERE user_id=$1 AND is_active',[target])).toHaveLength(1);
    expect(await db.ds.query('SELECT * FROM action_logs')).toHaveLength(1);
  });
});
