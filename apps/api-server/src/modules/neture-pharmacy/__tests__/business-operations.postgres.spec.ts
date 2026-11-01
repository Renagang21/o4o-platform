import express from "express";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { ActionLog } from "@o4o/action-log-core";
import { ServiceLegalProfile } from "../../service-legal/entities/ServiceLegalProfile.entity.js";
import { ServicePolicyDocument } from "../../service-legal/entities/ServicePolicyDocument.entity.js";
import { businessOperationsRoutes } from "../business-operations.routes.js";
import { businessPolicyScope } from "../services/business-policy-scope.js";
import { SemiFranchiseService } from "../services/semi-franchise.service.js";
import { consultationProfessionalConfirmed } from "../services/consultation-professional.js";
import { StoreStaffSupportService } from "../services/store-staff-support.js";
import { CooperativeManagementService } from "../services/cooperative-management.service.js";
import { computePolicyContentHash } from "../../policy-acceptance/policy-acceptance.service.js";

jest.mock("../../../middleware/auth.middleware.js", () => ({
  requireAuth: (req: any, res: any, next: any) =>
    req.user ? next() : res.sendStatus(401),
  authenticate: (req: any, res: any, next: any) =>
    req.user ? next() : res.sendStatus(401),
}));

// Fresh canonical bootstrap required. Fixed owned loopback DB; no production URL accepted.
const suite =
  process.env.O4O_DRUGSTORE_COMPLETION_IT === "1" ? describe : describe.skip;
suite("business operations on canonical PostgreSQL schema", () => {
  let db: DataSource, app: express.Express;
  const userIds = Array.from({ length: 5 }, () => randomUUID());
  const [admin, operator, otherAdmin, owner, staff] = userIds;
  const orgIds = Array.from({ length: 5 }, () => randomUUID());
  const [megaOrg, careOrg, store, otherStore, pendingStore] = orgIds;
  const mega = randomUUID(),
    care = randomUUID();
  const keys = ["drugstore", "carepharm"];
  const scope = businessPolicyScope(mega);
  const coop = randomUUID(),
    coopBusiness = randomUUID(),
    coopOrg = randomUUID();
  const route = "/operator/semi-franchises/drugstore";
  const as = (id: string) => ({
    get: (path: string) => request(app).get(path).set("x-fixture-user", id),
    post: (path: string, body: unknown) =>
      request(app).post(path).set("x-fixture-user", id).send(body),
    patch: (path: string, body: unknown) =>
      request(app).patch(path).set("x-fixture-user", id).send(body),
  });
  beforeAll(async () => {
    db = await new DataSource({
      type: "postgres",
      host: "127.0.0.1",
      port: 55439,
      username: "postgres",
      database: "o4o_drugstore_completion_test",
      entities: [ServiceLegalProfile, ServicePolicyDocument, ActionLog],
      synchronize: false,
    }).initialize();
    if (
      (
        await db.query("SELECT id FROM semi_franchises WHERE key=ANY($1)", [
          keys,
        ])
      ).length
    )
      throw new Error("Use a fresh fixture DB");
    for (const id of userIds)
      await db.query(
        `INSERT INTO users(id,email,status,"isActive","isEmailVerified") VALUES($1,$2,'active',true,true)`,
        [id, `${id}@example.test`],
      );
    for (const id of orgIds)
      await db.query(
        `INSERT INTO organizations(id,name,code,type,"isActive") VALUES($1,'Synthetic pharmacy',$2,'pharmacy',true)`,
        [id, id],
      );
    for (const [id, key, org] of [
      [mega, "drugstore", megaOrg],
      [care, "carepharm", careOrg],
    ])
      await db.query(
        `INSERT INTO semi_franchises(id,key,name,organization_id,status) VALUES($1,$2,$2,$3,'active')`,
        [id, key, org],
      );
    await db.query(
      `INSERT INTO role_assignments(user_id,role) VALUES($1,'neture:drugstore_admin'),($2,'neture:drugstore_operator'),($3,'neture:carepharm_admin')`,
      [admin, operator, otherAdmin],
    );
    for (const id of [store, otherStore, pendingStore])
      await db.query(
        `INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,business_number,pharmacy_name,pharmacist_license_number)
      VALUES($1,$2,$3,$4,'Synthetic pharmacy','SYNTHETIC')`,
        [
          id,
          owner,
          id === pendingStore ? "pending" : "active",
          `fixture-${id.slice(0, 8)}`,
        ],
      );
    await db.query(
      `INSERT INTO organization_members(organization_id,user_id,role,is_primary,joined_at,created_at,updated_at)
      VALUES($1,$2,'owner',true,NOW(),NOW(),NOW()),($1,$3,'staff',false,NOW(),NOW(),NOW())`,
      [store, owner, staff],
    );
    await db.query(
      `INSERT INTO semi_franchise_memberships(semi_franchise_id,organization_id,status,applied_by)
      VALUES($1,$3,'active',$6),($2,$3,'active',$6),($2,$4,'active',$6),($1,$5,'active',$6)`,
      [mega, care, store, otherStore, pendingStore, owner],
    );
    await db.query(
      `UPDATE organizations SET metadata=jsonb_build_object('staffSupport',jsonb_build_object('demandCounts',jsonb_build_object('2026-10',jsonb_build_object('not-found',3)))) WHERE id=ANY($1)`,
      [[store, otherStore, pendingStore]],
    );
    app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      const id = req.header("x-fixture-user");
      if (userIds.includes(id)) req.user = { id };
      next();
    });
    app.use(businessOperationsRoutes(db));
    app.use((err: any, _req: any, res: any, _next: any) =>
      res
        .status(err.httpStatus ?? 500)
        .json({ code: err.code, error: err.message }),
    );
  });
  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query("DELETE FROM action_logs WHERE user_id=ANY($1)", [userIds]);
    await db.query(
      "DELETE FROM user_policy_acceptances WHERE user_id=ANY($1)",
      [userIds],
    );
    await db.query(
      "DELETE FROM service_policy_documents WHERE service_key=ANY($1)",
      [[scope, businessPolicyScope(care)]],
    );
    await db.query(
      "DELETE FROM service_legal_profiles WHERE service_key=ANY($1)",
      [[scope, businessPolicyScope(care)]],
    );
    await db.query(
      "DELETE FROM cooperative_management_events WHERE cooperative_id=$1",
      [coop],
    );
    await db.query("DELETE FROM cooperatives WHERE id=$1", [coop]);
    await db.query(
      "DELETE FROM service_policy_documents WHERE service_key=$1",
      [businessPolicyScope(coopBusiness)],
    );
    await db.query("DELETE FROM semi_franchises WHERE id=$1", [coopBusiness]);
    await db.query("DELETE FROM organizations WHERE id=$1", [coopOrg]);
    await db.query(
      "DELETE FROM semi_franchise_contents WHERE semi_franchise_id=ANY($1)",
      [[mega, care]],
    );
    await db.query(
      "DELETE FROM semi_franchise_memberships WHERE semi_franchise_id=ANY($1)",
      [[mega, care]],
    );
    await db.query("DELETE FROM semi_franchises WHERE id=ANY($1)", [
      [mega, care],
    ]);
    await db.query(
      "DELETE FROM neture_pharmacy_memberships WHERE organization_id=ANY($1)",
      [orgIds],
    );
    await db.query("DELETE FROM organization_members WHERE user_id=ANY($1)", [
      userIds,
    ]);
    await db.query("DELETE FROM role_assignments WHERE user_id=ANY($1)", [
      userIds,
    ]);
    await db.query("DELETE FROM organizations WHERE id=ANY($1)", [orgIds]);
    await db.query("DELETE FROM users WHERE id=ANY($1)", [userIds]);
    await db.destroy();
  });
  it("scopes monthly counts to current approved stores and labels duplicate business participation", async () => {
    const response = await as(operator).get(
      `${route}/staff-demands?month=2026-10`,
    );
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      businessKey: "drugstore",
      canManagePolicies: false,
      stores: [{ id: store, counts: { "not-found": 3 } }],
    });
    expect(
      (await as(admin).get(`${route}/staff-demands?month=2026-10`)).body.data
        .canManagePolicies,
    ).toBe(true);
    expect(
      (await as(operator).get(`${route}/staff-demands?month=2026-11`)).body.data
        .stores[0].counts,
    ).toEqual({});
  });
  it("denies unauthenticated, other-business, expired and revoked roles without empty success", async () => {
    expect(
      (await request(app).get(`${route}/staff-demands?month=2026-10`)).status,
    ).toBe(401);
    expect(
      (await as(otherAdmin).get(`${route}/staff-demands?month=2026-10`)).status,
    ).toBe(403);
    for (const change of [
      "is_active=false",
      "is_active=true,valid_until=NOW()-INTERVAL '1 second'",
    ]) {
      await db.query(`UPDATE role_assignments SET ${change} WHERE user_id=$1`, [
        operator,
      ]);
      expect(
        (await as(operator).get(`${route}/staff-demands?month=2026-10`)).status,
      ).toBe(403);
    }
    await db.query(
      "UPDATE role_assignments SET is_active=true,valid_until=NULL WHERE user_id=$1",
      [operator],
    );
  });
  it("keeps a malformed aggregate unavailable instead of returning fabricated zeros", async () => {
    await db.query(
      `UPDATE organizations SET metadata=jsonb_set(metadata,'{staffSupport,demandCounts,2026-10,not-found}','"bad"') WHERE id=$1`,
      [store],
    );
    expect(
      (await as(operator).get(`${route}/staff-demands?month=2026-10`)).status,
    ).toBe(503);
    await db.query(
      `UPDATE organizations SET metadata=jsonb_set(metadata,'{staffSupport,demandCounts,2026-10,not-found}','3') WHERE id=$1`,
      [store],
    );
  });
  it("requires this business admin to write and never falls back to another service policy", async () => {
    expect((await as(operator).get(`${route}/legal/policies`)).status).toBe(
      200,
    );
    expect(
      (
        await as(operator).post(`${route}/legal/policies`, {
          documentType: "terms",
          title: "Forbidden",
        })
      ).status,
    ).toBe(403);
    expect((await as(otherAdmin).get(`${route}/legal/policies`)).status).toBe(
      403,
    );
    expect(
      (
        await request(app).get(
          "/businesses/drugstore/legal/enrollment-policies",
        )
      ).status,
    ).toBe(503);
    expect(
      (await request(app).get("/businesses/drugstore/legal/policies/terms"))
        .status,
    ).toBe(404);
    await expect(
      new SemiFranchiseService(db).apply(store, owner, "drugstore"),
    ).rejects.toHaveProperty("code", "POLICY_UNAVAILABLE");
  });
  const refs: any[] = [];
  it("publishes a version 1 business pair through the real legal controller", async () => {
    for (const documentType of ["terms", "privacy"]) {
      const created = await as(admin).post(`${route}/legal/policies`, {
        documentType,
        title: `Synthetic ${documentType}`,
        content: `Synthetic ${documentType} body`,
        version: 1,
        effectiveDate: "2026-01-01",
        slug: "client-cannot-pick-another-scope",
      });
      expect(created.status).toBe(201);
      expect(created.body.data.slug).toBe(`${scope}-service-${documentType}`);
      const id = created.body.data.id;
      expect(
        (
          await as(admin).patch(`${route}/legal/policies/${id}/publish`, {
            action: "publish",
          })
        ).status,
      ).toBe(200);
      refs.push({ documentType, policyDocumentId: id, version: 1 });
      if (documentType === "terms")
        expect(
          (
            await request(app).get(
              "/businesses/drugstore/legal/enrollment-policies",
            )
          ).status,
        ).toBe(503);
    }
    const policies = await request(app).get(
      "/businesses/drugstore/legal/enrollment-policies",
    );
    expect(policies.status).toBe(200);
    expect(policies.body.data).toHaveLength(2);
    expect(
      policies.body.data.every((doc: any) => doc.serviceKey === scope),
    ).toBe(true);
    expect(
      (await request(app).get("/businesses/carepharm/legal/policies/terms"))
        .status,
    ).toBe(404);
    expect(
      (
        await as(otherAdmin).patch(
          `/operator/semi-franchises/carepharm/legal/policies/${refs[0].policyDocumentId}/publish`,
          { action: "unpublish" },
        )
      ).status,
    ).toBe(404);
  });
  it("records exact business agreements and application together, rejecting stale forms without partial evidence", async () => {
    await db.query(
      "DELETE FROM semi_franchise_memberships WHERE semi_franchise_id=$1 AND organization_id=$2",
      [mega, store],
    );
    await expect(
      new SemiFranchiseService(db).apply(store, owner, "drugstore", {
        policyReferences: [{ ...refs[0], version: 2 }, refs[1]],
      }),
    ).rejects.toHaveProperty("code", "POLICY_VERSION_MISMATCH");
    expect(
      await db.query(
        "SELECT id FROM user_policy_acceptances WHERE user_id=$1",
        [owner],
      ),
    ).toHaveLength(0);
    const application = await new SemiFranchiseService(db).apply(
      store,
      owner,
      "drugstore",
      { policyReferences: refs },
    );
    expect(application.status).toBe("pending");
    const evidence = await db.query(
      "SELECT service_key,content_hash FROM user_policy_acceptances WHERE user_id=$1",
      [owner],
    );
    expect(evidence).toHaveLength(2);
    expect(evidence).toContainEqual({
      service_key: scope,
      content_hash: computePolicyContentHash("Synthetic terms body"),
    });
    const logs = await db.query(
      "SELECT meta FROM action_logs WHERE user_id=$1 AND action_key='service:application_policy'",
      [owner],
    );
    expect(logs[0].meta.application).toMatchObject({
      id: application.id,
      resourceId: mega,
    });
    expect(
      (await as(operator).get(`${route}/staff-demands?month=2026-10`)).body.data
        .stores,
    ).toEqual([]);
  });
  it("shows short guides only for active membership and uses owner confirmation independently of old KPA records", async () => {
    const contentId = randomUUID();
    await db.query(
      `INSERT INTO semi_franchise_contents(id,semi_franchise_id,title,status,tags) VALUES($1,$2,'Short guide','published','["staff-quick-guide"]')`,
      [contentId, mega],
    );
    expect(await new StoreStaffSupportService(db).guides(store)).toEqual([]);
    await db.query(
      `UPDATE semi_franchise_memberships SET status='active' WHERE organization_id=$1 AND semi_franchise_id=$2`,
      [store, mega],
    );
    expect(await new StoreStaffSupportService(db).guides(store)).toHaveLength(
      1,
    );
    expect(await consultationProfessionalConfirmed(db, staff, store)).toBe(
      false,
    );
    await db.query(
      `UPDATE organization_members SET metadata='{"pharmacyPharmacistConfirmed":true}' WHERE organization_id=$1 AND user_id=$2`,
      [store, staff],
    );
    expect(await consultationProfessionalConfirmed(db, staff, store)).toBe(
      true,
    );
    expect(await consultationProfessionalConfirmed(db, staff, otherStore)).toBe(
      false,
    );
  });
  it("supports a dynamic cooperative namespace through local admin authority and personal enrollment", async () => {
    await db.query(
      `INSERT INTO organizations(id,name,code,type) VALUES($1,'Synthetic cooperative','completion-coop','semi_franchise')`,
      [coopOrg],
    );
    await db.query(
      `INSERT INTO semi_franchises(id,key,name,organization_id,status) VALUES($1,'coop-completion','Synthetic cooperative',$2,'active')`,
      [coopBusiness, coopOrg],
    );
    await db.query(
      `INSERT INTO cooperatives(id,slug,name,semi_franchise_id,status) VALUES($1,'completion-coop','Synthetic cooperative',$2,'active')`,
      [coop, coopBusiness],
    );
    await db.query(
      `INSERT INTO cooperative_roles(cooperative_id,user_id,role) VALUES($1,$2,'admin')`,
      [coop, otherAdmin],
    );
    const local = "/operator/semi-franchises/coop-completion/legal";
    expect((await as(admin).get(`${local}/policies`)).status).toBe(403);
    const references = [];
    for (const documentType of ["terms", "privacy"]) {
      const doc = await as(otherAdmin).post(`${local}/policies`, {
        documentType,
        title: `Cooperative ${documentType}`,
        content: "Synthetic cooperative body",
        version: 1,
        effectiveDate: "2026-01-01",
      });
      expect(doc.status).toBe(201);
      expect(
        (
          await as(otherAdmin).patch(
            `${local}/policies/${doc.body.data.id}/publish`,
            { action: "publish" },
          )
        ).status,
      ).toBe(200);
      references.push({
        documentType: documentType as "terms" | "privacy",
        policyDocumentId: doc.body.data.id,
        version: 1,
      });
    }
    await new CooperativeManagementService(db).applyMembership(
      owner,
      coop,
      "Synthetic eligibility",
      references,
    );
    expect(
      await db.query(
        "SELECT status FROM cooperative_memberships WHERE cooperative_id=$1 AND user_id=$2",
        [coop, owner],
      ),
    ).toEqual([{ status: "pending" }]);
    expect(
      await db.query(
        "SELECT id FROM user_policy_acceptances WHERE service_key=$1 AND user_id=$2",
        [businessPolicyScope(coopBusiness), owner],
      ),
    ).toHaveLength(2);
  });
});
