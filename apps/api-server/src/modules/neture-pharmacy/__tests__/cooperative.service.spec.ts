import { AccountErasureService } from "../../../services/privacy/account-erasure.service.js";
import { cooperativeAdminTransferRequired } from "../../../services/privacy/cooperative-erasure-review.js";
import { DataSource } from "typeorm";
import { randomUUID } from "node:crypto";
import { CooperativeService } from "../services/cooperative.service.js";
import {
  CooperativeManagementService,
  cooperativeRole,
  federationRole,
} from "../services/cooperative-management.service.js";
import { hasBusinessOperatorAccess } from "../services/business-operator-access.js";
import { resolveSemiFranchiseBusinessAccess } from "../services/semi-franchise-community-access.js";
import { provisionTestCooperative } from "../services/provision-test-cooperative.js";

// Explicit opt-in, loopback throwaway DB; never reads DATABASE_URL or production credential.
const integration =
  process.env.O4O_COOP_ROLES_IT === "1" ? describe : describe.skip;
integration(
  "cooperative federation and personal management on isolated PostgreSQL",
  () => {
    let db: DataSource, service: CooperativeManagementService;
    let erasureOperation: string | undefined;
    const fed = randomUUID(),
      fedOp = randomUUID(),
      admin = randomUUID(),
      operator = randomUUID(),
      member = randomUUID(),
      other = randomUUID();
    const users = [fed, fedOp, admin, operator, member, other];
    let coop: string, business: string, second: string, secondBusiness: string;
    const emails = Object.fromEntries(
      users.map((u) => [u, `${u}@example.invalid`]),
    );
    beforeAll(async () => {
      db = new DataSource({
        type: "postgres",
        host: "127.0.0.1",
        port: 55438,
        username: "postgres",
        database: "o4o_coop_roles",
        entities: [],
        synchronize: false,
      });
      await db.initialize();
      service = new CooperativeManagementService(db);
      for (const id of users)
        await db.query(
          `INSERT INTO users(id,email,name,status,"isActive","isEmailVerified") VALUES($1,$2,'Scoped test','active',true,true)`,
          [id, emails[id]],
        );
      for (const [id, role] of [
        [fed, "neture:pharmcoop_admin"],
        [fedOp, "neture:pharmcoop_operator"],
      ])
        await db.query(
          "INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,$2,true)",
          [id, role],
        );
      const a = await service.applyAffiliation(other, {
        slug: "test",
        name: "테스트 협동조합",
        introduction: "소개",
        eligibilityDescription: "개인",
      });
      coop = a.id;
      const b = await service.applyAffiliation(other, {
        slug: "other-cooperative",
        name: "Other",
        introduction: "소개",
        eligibilityDescription: "개인",
      });
      second = b.id;
      [business, secondBusiness] = await Promise.all(
        [coop, second].map(
          async (id) =>
            (
              await db.query(
                "SELECT semi_franchise_id FROM cooperatives WHERE id=$1",
                [id],
              )
            )[0].semi_franchise_id,
        ),
      );
    });
    afterAll(async () => {
      if (!db?.isInitialized) return;
      if (erasureOperation)
        await db.query("DELETE FROM account_erasure_operations WHERE id=$1", [
          erasureOperation,
        ]);
      const rows = await db.query(
        "SELECT organization_id FROM semi_franchises WHERE id=ANY($1::uuid[])",
        [[business, secondBusiness]],
      );
      await db.query("DELETE FROM cooperatives WHERE id=ANY($1::uuid[])", [
        [coop, second],
      ]);
      await db.query("DELETE FROM semi_franchises WHERE id=ANY($1::uuid[])", [
        [business, secondBusiness],
      ]);
      await db.query("DELETE FROM organizations WHERE id=ANY($1::uuid[])", [
        rows.map((r: { organization_id: string }) => r.organization_id),
      ]);
      await db.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [users]);
      await db.destroy();
    });
    it("does not publish pending affiliations; applicant can see own status and supplement", async () => {
      expect(await new CooperativeService(db).directory()).toEqual([]);
      expect(await service.myAffiliations(other)).toHaveLength(2);
      expect(await service.myAffiliations(member)).toEqual([]);
      await service.supplementAffiliation(other, coop, "보완 설명");
      expect(await service.myHistory(member, coop)).toEqual([]);
      await expect(
        service.supplementAffiliation(member, coop, "타인 보완"),
      ).rejects.toMatchObject({ httpStatus: 403 });
    });
    it("federation operator reviews but cannot decide or assign admin", async () => {
      expect(await service.federationList(fedOp)).toHaveLength(2);
      await service.affiliationAction(fedOp, coop, "review", "접수 검토");
      await service.affiliationAction(
        fedOp,
        coop,
        "request_changes",
        "추가 설명 요청",
      );
      await expect(
        service.affiliationAction(fedOp, coop, "approve", "승인"),
      ).rejects.toMatchObject({ httpStatus: 403 });
      await expect(
        service.assignRole(fedOp, coop, emails[admin], "admin", "지정"),
      ).rejects.toMatchObject({ httpStatus: 403 });
    });
    it("federation admin approves affiliation and appoints only local admins", async () => {
      await service.affiliationAction(fed, coop, "approve", "조합 승인");
      await service.affiliationAction(fed, second, "approve", "조합 승인");
      await service.assignRole(
        fed,
        coop,
        emails[admin],
        "admin",
        "최초 관리자 지정",
      );
      await service.assignRole(
        fed,
        second,
        emails[other],
        "admin",
        "다른 조합 관리자 지정",
      );
      expect(await cooperativeRole(db, admin, coop)).toBe("admin");
      expect(await cooperativeRole(db, admin, second)).toBeNull();
      expect(
        await db.query("SELECT role FROM role_assignments WHERE user_id=$1", [
          admin,
        ]),
      ).toEqual([]);
      await expect(
        service.assignRole(
          fed,
          coop,
          emails[operator],
          "operator",
          "직접 지정",
        ),
      ).rejects.toMatchObject({ httpStatus: 403 });
    });
    it("federation/global roles and legacy assignments do not inherit individual cooperative business access", async () => {
      await db.query(
        "INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'neture:admin',true)",
        [fed],
      );
      await db.query(
        "INSERT INTO semi_franchise_operators(semi_franchise_id,user_id,assigned_by) VALUES($1,$2,$2)",
        [business, fed],
      );
      expect(await hasBusinessOperatorAccess(db, fed, business)).toBe(false);
      expect(
        (await new CooperativeService(db).session(fed)).cooperativeOperators,
      ).toEqual([]);
      await expect(service.members(fed, coop)).rejects.toMatchObject({
        httpStatus: 403,
      });
      expect(await federationRole(db, admin)).toBeNull();
    });
    it("local admin assigns operator, never another admin; unverified targets and duplicate roles rejected", async () => {
      await service.assignRole(
        admin,
        coop,
        emails[operator],
        "operator",
        "일상 담당 지정",
      );
      await expect(
        service.assignRole(admin, coop, emails[member], "admin", "승격"),
      ).rejects.toMatchObject({ httpStatus: 403 });
      await expect(
        service.assignRole(admin, coop, emails[operator], "operator", "중복"),
      ).rejects.toMatchObject({ httpStatus: 409 });
      await db.query('UPDATE users SET "isEmailVerified"=false WHERE id=$1', [
        member,
      ]);
      await expect(
        service.assignRole(admin, coop, emails[member], "operator", "지정"),
      ).rejects.toMatchObject({ code: "COOPERATIVE_TARGET_UNAVAILABLE" });
      await db.query('UPDATE users SET "isEmailVerified"=true WHERE id=$1', [
        member,
      ]);
    });
    it("joins independently in multiple cooperatives without pharmacy organization or global roles", async () => {
      await service.applyMembership(member, coop, "개인 자격");
      await service.applyMembership(member, second, "다른 조합 자격");
      expect(
        (await new CooperativeService(db).session(member)).memberships,
      ).toHaveLength(2);
      expect(
        await db.query("SELECT 1 FROM organization_members WHERE user_id=$1", [
          member,
        ]),
      ).toEqual([]);
      expect(
        await db.query("SELECT 1 FROM role_assignments WHERE user_id=$1", [
          member,
        ]),
      ).toEqual([]);
      expect(
        await resolveSemiFranchiseBusinessAccess(db, member, "coop-test"),
      ).toMatchObject({ allowed: false });
    });
    it("lets only the scoped admin update free-form eligibility with an audit reason", async () => {
      const description =
        "약사와 비약사 경영자 및 일반 개인은 정관에 따른 자격 자료를 제출합니다.";
      for (const actor of [operator, fed, fedOp, member, other]) {
        await expect(
          service.updateEligibility(actor, coop, {
            eligibilityDescription: description,
            reason: "기준 정비",
          }),
        ).rejects.toMatchObject({ httpStatus: 403 });
      }
      await expect(
        service.updateEligibility(admin, coop, {
          eligibilityDescription: description,
          reason: " ",
        }),
      ).rejects.toMatchObject({ httpStatus: 400 });
      await expect(
        service.updateEligibility(admin, coop, {
          eligibilityDescription: "x".repeat(2001),
          reason: "사유",
        }),
      ).rejects.toMatchObject({ httpStatus: 400 });
      const before = await db.query(
        "SELECT user_id,status FROM cooperative_memberships WHERE cooperative_id=$1 ORDER BY user_id",
        [coop],
      );
      await service.updateEligibility(admin, coop, {
        eligibilityDescription: description,
        reason: "기준 정비",
      });
      await service.updateEligibility(admin, coop, {
        eligibilityDescription: description,
        reason: "중복 저장",
      });
      expect(
        (await new CooperativeService(db).directory()).find(
          (c: any) => c.id === coop,
        ).eligibilityDescription,
      ).toBe(description);
      expect(
        await db.query(
          "SELECT user_id,status FROM cooperative_memberships WHERE cooperative_id=$1 ORDER BY user_id",
          [coop],
        ),
      ).toEqual(before);
      expect(
        (await service.history(admin, coop, false)).filter(
          (e: any) => e.action === "eligibility_update",
        ),
      ).toEqual([
        expect.objectContaining({
          reason: "기준 정비",
          actorId: admin,
          previousState: null,
          nextState: null,
        }),
      ]);
    });
    it("lists only the authenticated person's memberships and roles, keeping them separate", async () => {
      expect(await service.myCooperatives(member)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: coop,
            membershipStatus: "pending",
            role: null,
          }),
          expect.objectContaining({
            id: second,
            membershipStatus: "pending",
            role: null,
          }),
        ]),
      );
      expect(await service.myCooperatives(admin)).toEqual([
        expect.objectContaining({
          id: coop,
          membershipStatus: null,
          role: "admin",
        }),
      ]);
      expect(await service.myCooperatives(fed)).toEqual([]);
    });
    it("shows personal results without another member's notes or federation-wide access", async () => {
      const updates = await service.myUpdates(member);
      expect(updates).toHaveLength(2);
      expect(updates.every((e: any) => e.action === "membership_apply")).toBe(
        true,
      );
      expect(await service.myUpdates(fed)).toEqual([]);
      const adminUpdates = await service.myUpdates(admin);
      expect(adminUpdates.every((e: any) => e.action === "role_assign")).toBe(
        true,
      );
      expect(adminUpdates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ nextState: "admin" }),
        ]),
      );
      await db.query('UPDATE users SET "isEmailVerified"=false WHERE id=$1', [
        member,
      ]);
      try {
        await expect(service.myUpdates(member)).rejects.toMatchObject({
          httpStatus: 403,
        });
      } finally {
        await db.query('UPDATE users SET "isEmailVerified"=true WHERE id=$1', [
          member,
        ]);
      }
    });
    it("operator reviews and requests approval but direct final decisions are denied", async () => {
      const [m] = await service.members(operator, coop);
      await service.memberAction(operator, coop, m.id, "review", "서류 확인");
      await service.memberAction(
        operator,
        coop,
        m.id,
        "request_changes",
        "보완 요청",
      );
      await service.applyMembership(member, coop, "보완 제출");
      await service.memberAction(
        operator,
        coop,
        m.id,
        "request_approve",
        "승인 요청",
      );
      for (const action of ["approve", "reject"])
        await expect(
          service.memberAction(operator, coop, m.id, action, "직접 처리"),
        ).rejects.toMatchObject({ httpStatus: 403 });
      await service.memberAction(
        admin,
        coop,
        m.id,
        "approve",
        "자격 확인 완료",
      );
      expect(
        await resolveSemiFranchiseBusinessAccess(db, member, "coop-test"),
      ).toMatchObject({ allowed: true });
    });
    it("cross-cooperative ids, membership ids and histories are scoped", async () => {
      const [m] = await service.members(admin, coop);
      await expect(
        service.memberAction(other, second, m.id, "approve", "잘못된 조합"),
      ).rejects.toMatchObject({ httpStatus: 404 });
      await expect(service.members(operator, second)).rejects.toMatchObject({
        httpStatus: 403,
      });
      await expect(service.history(fed, coop, false)).rejects.toMatchObject({
        httpStatus: 403,
      });
      const history = await service.history(fed, coop, true);
      expect(
        history.some((e: { action: string }) => e.action.startsWith("member_")),
      ).toBe(false);
      expect(await service.listRoles(fed, coop, true)).toHaveLength(1);
    });
    it("operator cannot suspend/restore/terminate; admin changes take effect immediately and preserve other membership", async () => {
      const [m] = await service.members(admin, coop);
      for (const action of ["suspend", "withdraw", "expel"])
        await expect(
          service.memberAction(operator, coop, m.id, action, "직접 처리"),
        ).rejects.toMatchObject({ httpStatus: 403 });
      await service.memberAction(admin, coop, m.id, "suspend", "자격 정지");
      expect(
        await resolveSemiFranchiseBusinessAccess(db, member, "coop-test"),
      ).toMatchObject({ allowed: false });
      await service.memberAction(admin, coop, m.id, "restore", "자격 복구");
      await service.requestWithdrawal(member, coop, "본인 탈퇴 요청");
      await service.memberAction(
        admin,
        coop,
        m.id,
        "withdraw",
        "본인 요청 확인",
      );
      expect(
        await resolveSemiFranchiseBusinessAccess(db, member, "coop-test"),
      ).toMatchObject({ allowed: false });
      expect(
        (await new CooperativeService(db).session(member)).memberships.find(
          (r: { cooperativeId: string }) => r.cooperativeId === second,
        ).status,
      ).toBe("pending");
      await service.applyMembership(member, coop, "재가입");
      await service.memberAction(admin, coop, m.id, "approve", "재심사");
      await service.memberAction(
        admin,
        coop,
        m.id,
        "expel",
        "정관상 제명 의결 결과 반영",
      );
      expect(
        await resolveSemiFranchiseBusinessAccess(db, member, "coop-test"),
      ).toMatchObject({ allowed: false });
    });
    it("rejects missing reason and invalid transitions without changing state", async () => {
      const [m] = await service.members(admin, coop);
      await expect(
        service.memberAction(admin, coop, m.id, "restore", "복구"),
      ).rejects.toMatchObject({ httpStatus: 400 });
      await expect(
        service.memberAction(admin, coop, m.id, "approve", " "),
      ).rejects.toMatchObject({ httpStatus: 400 });
    });
    it("protects self-removal and the last usable admin, then permits replacement", async () => {
      let roles = await service.listRoles(fed, coop, true);
      await expect(
        service.revokeRole(fed, coop, roles[0].id, "마지막 해제"),
      ).rejects.toMatchObject({ code: "COOPERATIVE_LAST_ADMIN" });
      const op = (await service.listRoles(admin, coop, false)).find(
        (r: { role: string }) => r.role === "operator",
      );
      await expect(
        service.revokeRole(operator, coop, op.id, "자기 해제"),
      ).rejects.toMatchObject({ httpStatus: 403 });
      await service.assignRole(fed, coop, emails[fed], "admin", "관리자 추가");
      roles = await service.listRoles(fed, coop, true);
      await expect(
        service.revokeRole(
          fed,
          coop,
          roles.find((r: { userId: string }) => r.userId === fed).id,
          "본인 해제",
        ),
      ).rejects.toMatchObject({ code: "COOPERATIVE_SELF_REVOKE" });
      await service.revokeRole(
        fed,
        coop,
        roles.find((r: { userId: string }) => r.userId === admin).id,
        "관리자 교체",
      );
      expect(await cooperativeRole(db, admin, coop)).toBeNull();
      expect(await hasBusinessOperatorAccess(db, admin, business)).toBe(false);
      await service.revokeRole(fed, coop, op.id, "운영 담당 해제");
      expect(await hasBusinessOperatorAccess(db, operator, business)).toBe(
        false,
      );
    });
    it("serializes simultaneous last-admin revocations", async () => {
      await service.assignRole(
        fed,
        coop,
        emails[admin],
        "admin",
        "관리자 재지정",
      );
      const roles = await service.listRoles(fed, coop, true);
      const results = await Promise.allSettled(
        roles.map((r: { id: string }) =>
          service.revokeRole(fedOp, coop, r.id, "권한 없는 동시 요청"),
        ),
      );
      expect(results.every((r) => r.status === "rejected")).toBe(true);
      // A third federation administrator attempts both removals concurrently: at most one succeeds.
      await db.query(
        "INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'neture:pharmcoop_admin',true)",
        [fedOp],
      );
      const attempts = await Promise.allSettled(
        roles.map((r: { id: string }) =>
          service.revokeRole(fedOp, coop, r.id, "동시 교체"),
        ),
      );
      expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(await service.listRoles(fedOp, coop, true)).toHaveLength(1);
    });
    it("federation role validity, main suspension and account state deny current access", async () => {
      await db.query(
        "UPDATE role_assignments SET valid_until=now()-interval '1 hour' WHERE user_id=$1",
        [fed],
      );
      expect(await federationRole(db, fed)).toBeNull();
      await db.query(
        "UPDATE role_assignments SET valid_until=NULL WHERE user_id=$1",
        [fed],
      );
      await db.query(
        "INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'neture','suspended')",
        [fed],
      );
      expect(await federationRole(db, fed)).toBeNull();
      await db.query("DELETE FROM service_memberships WHERE user_id=$1", [fed]);
      await db.query('UPDATE users SET "isActive"=false WHERE id=$1', [fed]);
      await expect(service.federationList(fed)).rejects.toMatchObject({
        httpStatus: 403,
      });
      await db.query('UPDATE users SET "isActive"=true WHERE id=$1', [fed]);
    });
    it("affiliation suspension blocks local service and personal access until restoration", async () => {
      await service.affiliationAction(fed, second, "suspend", "조합 운영 정지");
      expect(await cooperativeRole(db, other, second)).toBeNull();
      expect(await service.myCooperatives(member)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: second,
            cooperativeStatus: "suspended",
            businessStatus: "closed",
          }),
        ]),
      );
      await expect(
        service.updateEligibility(other, second, {
          eligibilityDescription: "수정",
          reason: "정지 중",
        }),
      ).rejects.toMatchObject({ httpStatus: 403 });
      expect(
        (await new CooperativeService(db).directory()).some(
          (r: { id: string }) => r.id === second,
        ),
      ).toBe(false);
      await expect(
        service.applyMembership(member, second, "가입"),
      ).rejects.toMatchObject({ httpStatus: 403 });
      await service.affiliationAction(fed, second, "restore", "운영 복구");
      expect(await cooperativeRole(db, other, second)).toBe("admin");
    });
    it("provisions an explicit local admin without global roles, dry-run writes nothing and conflicts fail closed", async () => {
      await db.query(
        "UPDATE cooperative_memberships SET status='active' WHERE cooperative_id=$1 AND user_id=$2",
        [coop, member],
      );
      await db.query(
        "UPDATE cooperative_roles SET revoked_at=now() WHERE cooperative_id=$1",
        [coop],
      );
      const accounts = {
        operatorEmail: emails[operator],
        memberEmail: emails[other],
      };
      const before = await db.query("SELECT count(*) FROM cooperative_roles");
      expect(await provisionTestCooperative(db, accounts)).toMatchObject({
        mode: "dry-run",
        ready: true,
      });
      expect(await db.query("SELECT count(*) FROM cooperative_roles")).toEqual(
        before,
      );
      await provisionTestCooperative(db, accounts, true);
      await provisionTestCooperative(db, accounts, true);
      expect(await cooperativeRole(db, operator, coop)).toBe("admin");
      expect(
        await db.query(
          "SELECT 1 FROM cooperative_management_events WHERE cooperative_id=$1 AND subject_id=$2 AND action='member_approve'",
          [coop, other],
        ),
      ).toHaveLength(1);
      expect(
        await db.query("SELECT 1 FROM role_assignments WHERE user_id=$1", [
          operator,
        ]),
      ).toEqual([]);
      expect(
        await db.query(
          "SELECT 1 FROM organization_members WHERE user_id=ANY($1::uuid[])",
          [[operator, member]],
        ),
      ).toEqual([]);
      expect(
        (await new CooperativeService(db).session(operator))
          .federationOperators,
      ).toEqual([]);
      await db.query('UPDATE users SET "isEmailVerified"=false WHERE id=$1', [
        operator,
      ]);
      await expect(
        provisionTestCooperative(db, accounts, true),
      ).rejects.toThrow("ACTIVE_ACCOUNTS_REQUIRED");
      await db.query('UPDATE users SET "isEmailVerified"=true WHERE id=$1', [
        operator,
      ]);
    });
    it("requires cooperative admin transfer and preserves independent erasure review holds", async () => {
      expect(await cooperativeAdminTransferRequired(db, operator)).toBe(true);
      await db.query(
        "INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'platform:super_admin',true)",
        [fed],
      );
      await db.query(
        "INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'neture','suspended')",
        [operator],
      );
      const erasure = new AccountErasureService(db, {
        enabled: true,
        inventoryReviewed: true,
        systemYears: 1,
        systemBasis: "cooperative-transfer-fixture",
        personalBuckets: [],
      });
      const pending = await erasure.request(operator, fed);
      erasureOperation = pending.operationId;
      expect(pending.state).toBe("review_required");
      expect(pending.reviewCodes).toContain(
        "COOPERATIVE_MANAGEMENT_TRANSFER_REQUIRED",
      );
      expect(
        await db.query(
          "SELECT 1 FROM cooperative_roles WHERE cooperative_id=$1 AND user_id=$2 AND role='admin' AND revoked_at IS NULL",
          [coop, operator],
        ),
      ).toHaveLength(1);
      await service.assignRole(
        fed,
        coop,
        emails[admin],
        "admin",
        "삭제 전 관리자 이관",
      );
      expect(await cooperativeAdminTransferRequired(db, operator)).toBe(false);
      await db.query('UPDATE users SET "isEmailVerified"=false WHERE id=$1', [
        admin,
      ]);
      expect(await cooperativeAdminTransferRequired(db, operator)).toBe(true);
      await db.query('UPDATE users SET "isEmailVerified"=true WHERE id=$1', [
        admin,
      ]);
      const resumed = await erasure.resume(pending.operationId, fed);
      expect(resumed.reviewCodes).not.toContain(
        "COOPERATIVE_MANAGEMENT_TRANSFER_REQUIRED",
      );
      // The canonical fixture has pre-existing writer-manifest gaps outside this change.
      // A cooperative transfer must not bypass that independent privacy review or erase early.
      expect(resumed.state).toBe("review_required");
      expect(resumed.reviewCodes).toContain("WRITER_MANIFEST_REQUIRES_REFRESH");
      expect(
        await db.query(
          "SELECT 1 FROM cooperative_roles WHERE user_id=$1 AND revoked_at IS NULL",
          [operator],
        ),
      ).toHaveLength(1);
      expect(await cooperativeRole(db, admin, coop)).toBe("admin");
    });
    it("fences new cooperative roles and audit references during account erasure", async () => {
      const erased = randomUUID();
      await db.query(
        `INSERT INTO users(id,email,status,"isActive","isEmailVerified") VALUES($1,$2,'active',true,true)`,
        [erased, `${erased}@example.invalid`],
      );
      const [operation] = await db.query(
        `INSERT INTO account_erasure_operations(subject_id,subject_hash,requested_by_key,state)
      VALUES($1::uuid,encode(digest(($1::uuid)::text,'sha256'),'hex'),$2,'processing') RETURNING id`,
        [erased, fed],
      );
      try {
        await expect(
          db.query(
            `INSERT INTO cooperative_roles(cooperative_id,user_id,role) VALUES($1,$2,'operator')`,
            [coop, erased],
          ),
        ).rejects.toThrow();
        await expect(
          db.query(
            `INSERT INTO cooperative_management_events(cooperative_id,actor_id,subject_id,action,reason)
        VALUES($1,$2,$3,'member_review','검토')`,
            [coop, fed, erased],
          ),
        ).rejects.toThrow();
        expect(
          await db.query(
            "SELECT 1 FROM cooperative_roles WHERE user_id=$1 AND revoked_at IS NULL",
            [erased],
          ),
        ).toEqual([]);
      } finally {
        await db.query("DELETE FROM account_erasure_operations WHERE id=$1", [
          operation.id,
        ]);
        await db.query("DELETE FROM users WHERE id=$1", [erased]);
      }
    });
    it.each([
      "invalid",
      "member@@example.invalid",
      "m".repeat(1000) + "@example.invalid",
    ])("rejects malformed provisioning account %s", async (email) => {
      await expect(
        provisionTestCooperative(
          db,
          { operatorEmail: emails[operator], memberEmail: email },
          true,
        ),
      ).rejects.toThrow("DISTINCT_ACCOUNTS_REQUIRED");
    });
  },
);
