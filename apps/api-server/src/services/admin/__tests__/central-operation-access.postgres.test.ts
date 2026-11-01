import { CreateCentralOperationMenuGrants1793186241009 } from '../../../database/migrations/1793186241009-CreateCentralOperationMenuGrants.js';
import { CentralOperationMenuGrantService, centralOperationMenuKeys, assertCentralOperationMenu, assertCentralOperationRequest,validateCentralMenuKeys } from '../central-operation-menu-grants.js';
import { AddPharmacistQualificationDecisions1793165158540 } from "../../../database/migrations/1793165158540-AddPharmacistQualificationDecisions.js";
import {
  PharmacistQualificationService,
  hasApprovedPharmacist,
} from "../../qualifications/pharmacist-qualification.service.js";
import { AllowCentralOperatingDelegation1793164501481 } from "../../../database/migrations/1793164501481-AllowCentralOperatingDelegation.js";
const mockProfileDb = {
  transaction: jest.fn(),
  getRepository: jest.fn(() => ({})),
};
jest.mock("../../../database/connection.js", () => ({
  AppDataSource: mockProfileDb,
}));
import { PharmacistProfilePromotionService } from "../../kpa-branch/PharmacistProfilePromotionService.js";
import { DataSource, Entity, PrimaryColumn } from "typeorm";
import { RoleAssignment } from "../../../modules/auth/entities/RoleAssignment.js";
import { MembershipApprovalService } from "../../approval/MembershipApprovalService.js";
import { RoleAssignmentService } from "../../../modules/auth/services/role-assignment.service.js";
@Entity("users")
class User {
  @PrimaryColumn("uuid") id!: string;
}
import { randomUUID } from "node:crypto";
import { centralOperationRoles } from "../central-operation-access.js";
import express from 'express';
import request from 'supertest';
import {centralScopedNetureRequest,centralOperationRequest} from '../../../middleware/central-operation-menu.middleware.js';
import { consultationProfessionalConfirmed } from "../../../modules/neture-pharmacy/services/consultation-professional.js";

const enabled = process.env.UNIFIED_ACCESS_TEST_PORT === "55432";
(enabled ? describe : describe.skip)(
  "unified access — isolated PostgreSQL only",
  () => {
    const schema = `unified_${randomUUID().replaceAll("-", "")}`;
    const user = randomUUID(),
      store = randomUUID(),
      reviewer = randomUUID();
    let db: DataSource;
    beforeAll(async () => {
      db = new DataSource({
        type: "postgres",
        entities: [RoleAssignment, User],
        host: "127.0.0.1",
        port: 55432,
        username: "agent",
        database: "o4o_unified_fixture",
        extra: { options: `-c search_path=${schema},public` },
      });
      await db.initialize();
      mockProfileDb.transaction.mockImplementation((fn) => db.transaction(fn));
      mockProfileDb.getRepository.mockImplementation(() =>
        db.getRepository(RoleAssignment),
      );
      await db.query(`CREATE SCHEMA ${schema}`);
      await db.query(`CREATE TABLE users(id uuid PRIMARY KEY,status text,"isActive" boolean,"isEmailVerified" boolean,name text DEFAULT 'Synthetic member',email text);
      CREATE TABLE role_assignments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,role text,is_active boolean,scope_type text,valid_from timestamp,valid_until timestamp,scope_id uuid,assigned_at timestamp DEFAULT now(),assigned_by uuid,created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now(),CONSTRAINT chk_org_scope CHECK ((scope_type='global' AND scope_id IS NULL) OR (scope_type='organization' AND scope_id IS NOT NULL) OR scope_type IS NULL));
      CREATE TABLE service_memberships(user_id uuid,service_key text,status text,id uuid DEFAULT gen_random_uuid(),role text DEFAULT 'member',updated_at timestamp DEFAULT now());
      CREATE TABLE service_operator_invitations(id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE notifications(id uuid DEFAULT gen_random_uuid(),"userId" uuid REFERENCES users(id),"serviceKey" text,"organizationId" uuid,type text,title text,message text,metadata jsonb,channel text,"isRead" boolean DEFAULT false,"createdAt" timestamp DEFAULT now());
      CREATE TABLE demo_accounts(user_id uuid,is_active boolean);
      CREATE TABLE kpa_members(user_id uuid,license_number text,status text,identity_status text,organization_id uuid,updated_at timestamp DEFAULT now());
      CREATE TABLE organization_members(user_id uuid,organization_id uuid,left_at timestamp,role text,metadata jsonb);
      CREATE TABLE action_logs(service_key text,user_id uuid,action_key text,source text,status text,meta jsonb);
      CREATE TABLE kpa_pharmacist_profiles(user_id uuid UNIQUE,license_number text,license_verified boolean,verified_at timestamp,verified_by uuid,id uuid DEFAULT gen_random_uuid(),activity_type text,updated_at timestamp DEFAULT now())`);
      await db.transaction((m) =>
        new AllowCentralOperatingDelegation1793164501481().up(m.queryRunner!),
      );
      await db.transaction((m) =>
        new AddPharmacistQualificationDecisions1793165158540().up(
          m.queryRunner!,
        ),
      );
    });
    beforeAll(async () => {
      // This focused RBAC fixture has no erasure ledger. Full canonical fixture checks the real fence.
      await db.query(`CREATE OR REPLACE FUNCTION public.account_erasure_write_fence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$`);
      await db.transaction(m => new CreateCentralOperationMenuGrants1793186241009().up(m.queryRunner!));
    });
    afterAll(async () => {
      if (db?.isInitialized) {
        await db.query(`DROP SCHEMA ${schema} CASCADE`);
        await db.destroy();
      }
    });
    beforeEach(async () => {
      await db.query(
        "TRUNCATE notifications,central_operation_menu_grants,service_operator_invitations,users,role_assignments,service_memberships,organization_members,kpa_pharmacist_profiles,action_logs,kpa_members,demo_accounts",
      );
      await db.query(
        `INSERT INTO users(id,status,"isActive","isEmailVerified") VALUES($1,'active',true,true)`,
        [user],
      );
    });
    async function role(value = "supplier:operator", scope = "o4o-direct") {
      await db.query(
        `INSERT INTO role_assignments(user_id,role,is_active,scope_type,valid_from,valid_until) VALUES($1,$2,true,$3,now()-interval '1 day',NULL)`,
        [user, value, scope],
      );
      await db.query(`INSERT INTO service_memberships VALUES($1,$2,'active')`, [
        user,
        value.startsWith("neture:") ? "neture" : value.split(":")[0],
      ]);
    }
    it('lets directory delegates see all accounts without license/reason or decision authority', async () => {
      await role('neture:operator');
      await db.query(`INSERT INTO kpa_pharmacist_profiles(user_id,license_number,qualification_status,qualification_reason) VALUES($1,'SYNTHETIC-LICENSE','pending','Synthetic private review')`,[user]);
      await db.query(`INSERT INTO central_operation_menu_grants(assignment_id,menu_keys) SELECT id,ARRAY['neture.members'] FROM role_assignments WHERE user_id=$1`,[user]);
      const service = new PharmacistQualificationService(db);
      const directory = await service.list(user,'all',1,user,true);
      expect(directory.items).toHaveLength(1);
      expect(directory.items[0]).toMatchObject({userId:user,licenseNumber:null,reason:null,status:'pending'});
      await expect(service.list(user,'all',1)).rejects.toMatchObject({status:403});
      await expect(service.decide(user,user,{action:'reject',reason:'Synthetic decision',version:directory.items[0].version})).rejects.toMatchObject({status:403});
    });
    it('keeps relationship cleanup and approval revocation as distinct Admin duties',async()=>{
      expect(()=>validateCentralMenuKeys('neture:operator',['neture.membership-cleanup'])).toThrow();
      expect(()=>validateCentralMenuKeys('neture:operator',['neture.service-approval-management'])).toThrow();
      await role('neture:admin');
      await db.query(`INSERT INTO central_operation_menu_grants(assignment_id,menu_keys) SELECT id,ARRAY['neture.membership-cleanup'] FROM role_assignments WHERE user_id=$1`,[user]);
      await expect(assertCentralOperationRequest(db,user,'neture',['neture.membership-cleanup'],'google')).resolves.toBeUndefined();
      await expect(assertCentralOperationRequest(db,user,'neture',['neture.service-members'],'google')).rejects.toMatchObject({status:403});
      await expect(assertCentralOperationRequest(db,user,'neture',['neture.service-approval-management'],'google')).rejects.toMatchObject({status:403});
    });
    it('never skips a central Neture duty check through a query-selected service',async()=>{
      await role('neture:operator');
      await db.query(`INSERT INTO central_operation_menu_grants(assignment_id,menu_keys) SELECT id,ARRAY['neture.members'] FROM role_assignments WHERE user_id=$1`,[user]);
      const handler=jest.fn((_req,res)=>res.json({success:true}));
      const app=express();
      app.use((req,_res,next)=>{Object.assign(req,{user:{id:user},authMethod:req.header('x-method')??'google',serviceScope:{isPlatformAdmin:false,serviceKeys:req.header('x-empty-scope')?[]:['neture','kpa-society'],rolePrefixes:['neture','kpa']}});next();});
      app.use(centralScopedNetureRequest(db));
      app.post('/api/v1/operator/product-candidates/:id/reject',handler);
      for(const query of ['serviceKey=lecture','serviceKey=kpa-society','serviceKey=neture','all=true','serviceKey=all','']) {
        const result=await request(app).post(`/api/v1/operator/product-candidates/fixture/reject?${query}`);
        expect(result.status).toBe(403);
        expect(result.body.code).toBe('CENTRAL_MENU_NOT_DELEGATED');
      }
      expect(handler).not.toHaveBeenCalled();
      expect((await request(app).post('/api/v1/operator/product-candidates/fixture/reject?serviceKey=lecture').set('x-empty-scope','yes')).status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
      await db.query("UPDATE central_operation_menu_grants SET menu_keys=ARRAY['neture.candidates']");
      expect((await request(app).post('/api/v1/operator/product-candidates/fixture/reject?serviceKey=lecture').set('x-method','password')).body.code).toBe('CENTRAL_GOOGLE_REQUIRED');
      expect(handler).not.toHaveBeenCalled();
      expect((await request(app).post('/api/v1/operator/product-candidates/fixture/reject?serviceKey=neture')).status).toBe(200);
      expect(handler).toHaveBeenCalledTimes(1);
    });
    it('lets supplier governance read the funding precondition without granting approval commands',async()=>{
      await role('supplier:admin');
      await db.query(`INSERT INTO central_operation_menu_grants(assignment_id,menu_keys) SELECT id,ARRAY['supplier.governance'] FROM role_assignments WHERE user_id=$1`,[user]);
      const app=express(),read=jest.fn((_req,res)=>res.json({items:[]})),write=jest.fn((_req,res)=>res.sendStatus(200));
      app.use((req,_res,next)=>{Object.assign(req,{user:{id:user},authMethod:'google'});next();});
      app.use(centralOperationRequest('supplier',undefined,db));
      app.get('/api/v1/neture/operator/suppliers/fixture/active-fundings',read);
      app.post('/api/v1/neture/operator/suppliers/fixture/approve',write);
      expect((await request(app).get('/api/v1/neture/operator/suppliers/fixture/active-fundings')).status).toBe(200);
      expect(read).toHaveBeenCalledTimes(1);
      expect((await request(app).post('/api/v1/neture/operator/suppliers/fixture/approve')).status).toBe(403);
      expect(write).not.toHaveBeenCalled();
    });
    it('limits menus per assignment, rejects cross-service grants, and detects concurrent edits', async () => {
      await role('lecture:operator');
      await db.query(`INSERT INTO users(id,status,"isActive","isEmailVerified") VALUES($1,'active',true,true)`, [reviewer]);
      await db.query(`INSERT INTO role_assignments(user_id,role,is_active,scope_type,valid_from) VALUES($1,'platform:super_admin',true,'global',now())`, [reviewer]);
      const grants = new CentralOperationMenuGrantService(db);
      const original = await grants.read(reviewer, user, 'lecture:operator');
      expect(original.menuKeys).toContain('lecture.certificates');
      const saved = await grants.update(reviewer, user, 'lecture:operator', { menuKeys: ['lecture.instructors'], reason: 'Synthetic scoped duty', version: original.version });
      expect(await centralOperationMenuKeys(db, user, await centralOperationRoles(db,user))).toEqual(['lecture.instructors']);
      await expect(assertCentralOperationMenu(db,user,'lecture',['lecture.instructors'])).resolves.toBeUndefined();
      for (const method of ['password','kakao',undefined]) await expect(assertCentralOperationRequest(db,user,'lecture',['lecture.instructors'],method)).rejects.toMatchObject({code:'CENTRAL_GOOGLE_REQUIRED'});
      await expect(assertCentralOperationRequest(db,user,'lecture',['lecture.instructors'],'google')).resolves.toBeUndefined();
      await expect(assertCentralOperationRequest(db,user,'lecture',['lecture.certificates'],'google')).rejects.toMatchObject({code:'CENTRAL_MENU_NOT_DELEGATED'});
      await expect(assertCentralOperationMenu(db,user,'lecture',['lecture.certificates'])).rejects.toMatchObject({status:403});
      await expect(grants.update(reviewer,user,'lecture:operator',{menuKeys:['supplier.suppliers'],reason:'Invalid cross-service',version:saved.version})).rejects.toMatchObject({status:400});
      await expect(grants.update(reviewer,user,'lecture:operator',{menuKeys:[],reason:'Stale edit',version:original.version})).rejects.toMatchObject({status:409});
      await expect(grants.update(user,user,'lecture:operator',{menuKeys:['lecture.courses'],reason:'Self expansion',version:saved.version})).rejects.toMatchObject({status:403});
      await grants.update(reviewer,user,'lecture:operator',{menuKeys:[],reason:'Revoke all menus',version:saved.version});
      expect(await centralOperationMenuKeys(db,user,await centralOperationRoles(db,user))).toEqual([]);
      await db.query("UPDATE role_assignments SET valid_until=now()-interval '1 second' WHERE user_id=$1",[user]);
      await expect(assertCentralOperationMenu(db,user,'lecture',['lecture.instructors'])).rejects.toMatchObject({status:403});
    });
    it.each([
      "supplier:admin",
      "supplier:operator",
      "neture:pharmcoop_admin",
      "neture:pharmcoop_operator",
    ])(
      "persists and revokes central %s through the actual TypeORM canonical writer",
      async (value) => {
        const writer = new RoleAssignmentService();
        const row = await writer.assignRole(
          {
            userId: user,
            role: value,
            assignedBy: reviewer,
            scopeType: "o4o-direct",
          },
          db.manager,
        );
        expect(row.scopeType).toBe("o4o-direct");
        await db.query(
          "INSERT INTO service_memberships VALUES($1,$2,'active')",
          [user, value.startsWith("neture:") ? "neture" : value.split(":")[0]],
        );
        expect(await centralOperationRoles(db, user)).toEqual([value]);
        await writer.removeRole(user, value, db.manager);
        expect(await centralOperationRoles(db, user)).toEqual([]);
        await writer.assignRole(
          { userId: user, role: value, assignedBy: reviewer },
          db.manager,
        );
        expect(await centralOperationRoles(db, user)).toEqual([]);
        expect(
          (
            await db.query(
              "SELECT scope_type FROM role_assignments WHERE user_id=$1",
              [user],
            )
          )[0].scope_type,
        ).toBe("global");
      },
    );
    it("does not convert an existing ordinary service role to central access", async () => {
      await role("supplier:operator", "global");
      expect(await centralOperationRoles(db, user)).toEqual([]);
    });
    it.each([
      "neture:drugstore_operator",
      "neture:carepharm_admin",
      "cooperative:operator",
      "kpa-branch:operator",
    ])("never adopts independent %s", async (value) => {
      await role(value, "global");
      expect(await centralOperationRoles(db, user)).toEqual([]);
    });
    it("supports multiple duties and immediately honors partial role revocation and membership suspension", async () => {
      await role();
      await role("lecture:operator");
      expect((await centralOperationRoles(db, user)).sort()).toEqual([
        "lecture:operator",
        "supplier:operator",
      ]);
      await db.query(
        `UPDATE role_assignments SET is_active=false WHERE role='supplier:operator'`,
      );
      expect(await centralOperationRoles(db, user)).toEqual([
        "lecture:operator",
      ]);
      await db.query(
        `UPDATE service_memberships SET status='suspended' WHERE service_key='lecture'`,
      );
      expect(await centralOperationRoles(db, user)).toEqual([]);
    });
    it("denies expired grants, future grants, and inactive identities", async () => {
      await role();
      await db.query(
        `UPDATE role_assignments SET valid_until=now()-interval '1 second'`,
      );
      expect(await centralOperationRoles(db, user)).toEqual([]);
      await db.query(
        `UPDATE role_assignments SET valid_until=NULL,valid_from=now()+interval '1 day'`,
      );
      expect(await centralOperationRoles(db, user)).toEqual([]);
      await db.query(
        `UPDATE role_assignments SET valid_from=now(); UPDATE users SET "isActive"=false`,
      );
      expect(await centralOperationRoles(db, user)).toEqual([]);
    });
    async function professional() {
      await db.query(
        `INSERT INTO organization_members VALUES($1,$2,NULL,'staff','{"pharmacyPharmacistConfirmed":true}')`,
        [user, store],
      );
      await db.query(
        `INSERT INTO kpa_pharmacist_profiles(user_id,license_number,license_verified,verified_at,verified_by,qualification_status,qualification_reason) VALUES($1,'SYNTHETIC-LICENSE',true,now(),$2,'approved','Synthetic evidence confirmed')`,
        [user, reviewer],
      );
    }
    it("permits a verified pharmacist employee only in their confirmed store; revoke is immediate", async () => {
      await professional();
      expect(await consultationProfessionalConfirmed(db, user, store)).toBe(
        true,
      );
      expect(
        await consultationProfessionalConfirmed(db, user, randomUUID()),
      ).toBe(false);
      await db.query(
        "UPDATE kpa_pharmacist_profiles SET qualification_status='revoked',license_verified=false",
      );
      expect(await consultationProfessionalConfirmed(db, user, store)).toBe(
        false,
      );
    });
    it("does not treat owner confirmation or a self-entered license as verified qualification", async () => {
      await professional();
      await db.query(
        `UPDATE kpa_pharmacist_profiles SET qualification_status='unrequested',verified_by=NULL`,
      );
      expect(await consultationProfessionalConfirmed(db, user, store)).toBe(
        false,
      );
      await db.query("TRUNCATE kpa_pharmacist_profiles");
      expect(await consultationProfessionalConfirmed(db, user, store)).toBe(
        false,
      );
    });
    it("a valid qualification does not replace store permission or active account", async () => {
      await professional();
      await db.query(
        `UPDATE organization_members SET metadata='{"pharmacyPharmacistConfirmed":false}'`,
      );
      expect(await consultationProfessionalConfirmed(db, user, store)).toBe(
        false,
      );
      await db.query(
        `UPDATE organization_members SET metadata='{"pharmacyPharmacistConfirmed":true}'; UPDATE users SET "isEmailVerified"=false`,
      );
      expect(await consultationProfessionalConfirmed(db, user, store)).toBe(
        false,
      );
    });
    it("filling a missing licence through branch signup invalidates an old verification marker", async () => {
      await professional();
      await db.query(
        "UPDATE kpa_pharmacist_profiles SET qualification_status='unrequested',license_number=NULL",
      );
      await PharmacistProfilePromotionService.ensureProfile({
        userId: user,
        licenseNumber: "NEW-SYNTHETIC-LICENSE",
      });
      expect(
        await db.query(
          "SELECT license_verified,verified_at,verified_by FROM kpa_pharmacist_profiles",
        ),
      ).toEqual([
        { license_verified: false, verified_at: null, verified_by: null },
      ]);
      expect(await consultationProfessionalConfirmed(db, user, store)).toBe(
        false,
      );
    });

    it("constraint rejects an independent business marked as central and rollback refuses active central assignments", async () => {
      await expect(
        db.query(
          "INSERT INTO role_assignments(user_id,role,is_active,scope_type) VALUES($1,'neture:drugstore_admin',true,'o4o-direct')",
          [user],
        ),
      ).rejects.toMatchObject({ code: "23514" });
      await role();
      await expect(
        db.transaction((m) =>
          new AllowCentralOperatingDelegation1793164501481().down(
            m.queryRunner!,
          ),
        ),
      ).rejects.toThrow("Central delegations still exist");
      expect(await centralOperationRoles(db, user)).toEqual([
        "supplier:operator",
      ]);
    });

    async function credentialReviewer() {
      await db.query(
        `INSERT INTO users(id,status,"isActive","isEmailVerified") VALUES($1,'active',true,true)`,
        [reviewer],
      );
      await db.query(
        `INSERT INTO role_assignments(user_id,role,is_active,scope_type,valid_from) VALUES($1,'neture:operator',true,'o4o-direct',now())`,
        [reviewer],
      );
      await db.query(
        `INSERT INTO service_memberships VALUES($1,'neture','active')`,
        [reviewer],
      );
    }
    it("lists common accounts without a pharmacist profile and filters status and literal search without changing approval", async () => {
      await credentialReviewer();
      const service = new PharmacistQualificationService(db);
      await db.query('UPDATE users SET name=$2,email=$3 WHERE id=$1', [user, 'Applicant 100%', 'applicant@example.invalid']);
      const all = await service.list(reviewer, 'all', 1);
      expect(all.counts).toMatchObject({ all: 2, unrequested: 2, pending: 0 });
      expect(all.items.find((item: any) => item.userId === user)).toMatchObject({ status: 'unrequested', version: null, licenseNumber: null });
      await service.request(user, 'SYNTHETIC-SEARCH-LICENSE');
      const pending = await service.list(reviewer, 'pending', 1, '100%');
      expect(pending.items).toHaveLength(1);
      expect(pending.items[0].userId).toBe(user);
      expect(pending.counts).toMatchObject({ all: 1, pending: 1, unrequested: 0 });
      expect((await service.list(reviewer, 'all', 1, '100_')).items).toEqual([]);
      expect(await hasApprovedPharmacist(db, user)).toBe(false);
    });
    it("manual qualification review requires evidence and reason, preserves common identity and supports rejection, approval and revocation", async () => {
      await credentialReviewer();
      const service = new PharmacistQualificationService(db);
      const pending = await service.request(user, "SYNTHETIC-LICENSE");
      expect(pending.status).toBe("pending");
      await expect(
        service.decide(reviewer, user, {
          action: "approve",
          reason: "Synthetic review",
          version: pending.version,
        }),
      ).rejects.toMatchObject({ code: "LICENSE_EVIDENCE_REQUIRED" });
      const rejected = await service.decide(reviewer, user, {
        action: "reject",
        reason: "Synthetic missing evidence",
        version: pending.version,
      });
      expect(rejected.status).toBe("rejected");
      expect(
        await db.query('SELECT status,"isActive" FROM users WHERE id=$1', [
          user,
        ]),
      ).toEqual([{ status: "active", isActive: true }]);
      const resubmitted = await service.request(user, "SYNTHETIC-LICENSE");
      const approved = await service.decide(reviewer, user, {
        action: "approve",
        reason: "Synthetic evidence checked",
        version: resubmitted.version,
        licenseEvidenceChecked: true,
      });
      expect(await hasApprovedPharmacist(db, user)).toBe(true);
      await service.decide(reviewer, user, {
        action: "revoke",
        reason: "Synthetic revocation",
        version: approved.version,
      });
      expect(await hasApprovedPharmacist(db, user)).toBe(false);
      expect((await service.mine(user)).status).toBe("revoked");
    });
    it("credential review cannot rely on an ordinary service role or a stale claim version", async () => {
      await credentialReviewer();
      const service = new PharmacistQualificationService(db);
      const old = await service.request(user, "SYNTHETIC-A");
      await service.request(user, "SYNTHETIC-B");
      await expect(
        service.decide(reviewer, user, {
          action: "approve",
          reason: "Synthetic review",
          version: old.version,
          licenseEvidenceChecked: true,
        }),
      ).rejects.toMatchObject({ code: "QUALIFICATION_CHANGED" });
      await db.query(
        "UPDATE role_assignments SET scope_type='global' WHERE user_id=$1",
        [reviewer],
      );
      await expect(service.list(reviewer, "pending", 1)).rejects.toMatchObject({
        code: "QUALIFICATION_REVIEWER_REQUIRED",
      });
      expect(await hasApprovedPharmacist(db, user)).toBe(false);
    });
    it("does not approve the same licence for two people or approve a suspended common account", async () => {
      await credentialReviewer();
      const other = randomUUID();
      await db.query(
        `INSERT INTO users(id,status,"isActive","isEmailVerified") VALUES($1,'active',true,true)`,
        [other],
      );
      const service = new PharmacistQualificationService(db);
      const first = await service.request(user, "SYNTHETIC-SHARED");
      const second = await service.request(other, "SYNTHETIC-SHARED");
      await service.decide(reviewer, user, {
        action: "approve",
        reason: "Synthetic evidence checked",
        version: first.version,
        licenseEvidenceChecked: true,
      });
      await expect(
        service.decide(reviewer, other, {
          action: "approve",
          reason: "Synthetic duplicate review",
          version: second.version,
          licenseEvidenceChecked: true,
        }),
      ).rejects.toMatchObject({ code: "LICENSE_REVIEW_REQUIRED" });
      const changed = await service.request(other, "SYNTHETIC-OTHER");
      await db.query("UPDATE users SET status='suspended' WHERE id=$1", [
        other,
      ]);
      await expect(
        service.decide(reviewer, other, {
          action: "approve",
          reason: "Synthetic review",
          version: changed.version,
          licenseEvidenceChecked: true,
        }),
      ).rejects.toMatchObject({ code: "ACCOUNT_NOT_ACTIVE" });
      expect(
        (
          await service.decide(reviewer, other, {
            action: "reject",
            reason: "Synthetic suspended review",
            version: changed.version,
          })
        ).status,
      ).toBe("rejected");
      expect(
        (await db.query("SELECT status FROM users WHERE id=$1", [other]))[0]
          .status,
      ).toBe("suspended");
    });
    it("honors a common-account service suspension without destroying the approved credential", async () => {
      await professional();
      await db.query(
        "INSERT INTO service_memberships VALUES($1,'neture','suspended')",
        [user],
      );
      expect(await hasApprovedPharmacist(db, user)).toBe(false);
      expect(await consultationProfessionalConfirmed(db, user, store)).toBe(
        false,
      );
      expect(
        (await new PharmacistQualificationService(db).mine(user)).status,
      ).toBe("approved");
    });
    it("can reject an incomplete historical profile without granting or deleting its common identity", async () => {
      await credentialReviewer();
      await db.query(
        "INSERT INTO kpa_pharmacist_profiles(user_id,license_number,license_verified) VALUES($1,NULL,false)",
        [user],
      );
      const service = new PharmacistQualificationService(db),
        old = await service.mine(user);
      expect(
        (
          await service.decide(reviewer, user, {
            action: "reject",
            reason: "Synthetic missing licence",
            version: old.version,
          })
        ).status,
      ).toBe("rejected");
      expect(await hasApprovedPharmacist(db, user)).toBe(false);
      expect(
        (await db.query("SELECT status FROM users WHERE id=$1", [user]))[0]
          .status,
      ).toBe("active");
    });
    it("service withdrawal preserves a manually approved common credential and other memberships under the real CHECK constraints", async () => {
      await professional();
      await db.query(
        "INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'kpa-society','active'),($1,'lecture','active')",
        [user],
      );
      await db.query(
        "INSERT INTO kpa_members(user_id,license_number,status,identity_status) VALUES($1,'synthetic-license','active','active')",
        [user],
      );
      const before = (
        await db.query(
          "SELECT * FROM kpa_pharmacist_profiles WHERE user_id=$1",
          [user],
        )
      )[0];
      const result = await db.transaction((manager) =>
        new MembershipApprovalService().withdrawMembership({
          userId: user,
          withdrawnBy: reviewer,
          isPlatformAdmin: false,
          serviceKeys: ["kpa-society"],
          manager,
        }),
      );
      expect(result?.inactivatedMemberships).toBe(1);
      expect(
        (
          await db.query(
            "SELECT * FROM kpa_pharmacist_profiles WHERE user_id=$1",
            [user],
          )
        )[0],
      ).toEqual(before);
      expect(await hasApprovedPharmacist(db, user)).toBe(true);
      expect(
        await db.query(
          "SELECT service_key,status FROM service_memberships WHERE user_id=$1 ORDER BY service_key",
          [user],
        ),
      ).toEqual([
        { service_key: "kpa-society", status: "withdrawn" },
        { service_key: "lecture", status: "active" },
      ]);
      expect(
        (
          await db.query(
            "SELECT status,license_number FROM kpa_members WHERE user_id=$1",
            [user],
          )
        )[0],
      ).toEqual({ status: "withdrawn", license_number: null });
      expect(
        (await db.query("SELECT status FROM users WHERE id=$1", [user]))[0]
          .status,
      ).toBe("active");
    });
    it("self-entered and historical verified markers are not automatically approved", async () => {
      await credentialReviewer();
      await professional();
      await db.query(
        "UPDATE kpa_pharmacist_profiles SET qualification_status='unrequested'",
      );
      expect(await hasApprovedPharmacist(db, user)).toBe(false);
      const service = new PharmacistQualificationService(db);
      await service.request(reviewer, "SYNTHETIC-REVIEWER");
      const self = await service.mine(reviewer);
      await expect(
        service.decide(reviewer, reviewer, {
          action: "approve",
          reason: "Synthetic self review",
          version: self.version,
          licenseEvidenceChecked: true,
        }),
      ).rejects.toMatchObject({
        code: "SELF_QUALIFICATION_APPROVAL_FORBIDDEN",
      });
    });
  },
);
