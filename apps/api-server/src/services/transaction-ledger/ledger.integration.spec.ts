import { WorkDataService } from "../work-data/work-data.service.js";
jest.mock("../../modules/neture/services/neture-main-membership.js", () => ({
  getNetureMainMembershipStatus: jest.fn(async () => "active"),
}));
import { CLOSED_STORE_WRITER_GAPS_SQL } from "../store/store-closure-inventory.js";
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PhotoLedgerService } from "./ledger.service.js";
import { StoreAdapter } from "../../modules/external-ai/adapters/store.adapter.js";
jest.mock("../../modules/external-ai/adapters/store.adapter.js", () => ({
  StoreAdapter: jest.fn(),
}));
const testUrl = process.env.O4O_LEDGER_TEST_DATABASE_URL;
const suite = testUrl ? describe : describe.skip;
suite(
  "photo ledger — isolated PostgreSQL transaction/confirmation/candidate integration",
  () => {
    let db: DataSource, service: PhotoLedgerService;
    const user = randomUUID(),
      otherUser = randomUUID(),
      org = randomUUID(),
      otherOrg = randomUUID();
    let revoked = false;
    const invoice = (documentNumber = randomUUID()) => ({
      documentType: "purchase",
      sellerName: "합성 거래처",
      sellerBusinessNumber: "0000000000",
      buyerBusinessNumber: "1111111111",
      documentNumber,
      issuedOn: "2026-11-14",
      currency: "KRW",
      taxTreatment: "unknown",
      statedLineTotal: "3600",
      unresolved: [],
      rows: [
        {
          id: "r1",
          rawText: "합성 품목 A / 3갑 / 1200 / 3600",
          productName: "합성 품목 A",
          supplierProductCode: "000123",
          barcode: null,
          manufacturer: null,
          packageText: "원문 규격 0",
          quantity: "3",
          unit: "갑",
          unitPrice: "1200",
          amount: "3600",
          lotNumber: null,
          expiresOn: null,
        },
      ],
    });
    const raw = (data = invoice(), extra = {}) => ({
      workspaceId: "store:" + org,
      requestId: randomUUID(),
      invoice: data,
      ...extra,
    });
    const confirm = (row: any, extra = {}) => ({
      expectedVersion: row.version,
      expectedRevision: row.revision,
      requestId: randomUUID(),
      acknowledgeMissingOriginal: true,
      programStatus: "unknown",
      ...extra,
    });
    beforeAll(async () => {
      const url = new URL(testUrl!);
      if (
        url.hostname !== "127.0.0.1" ||
        url.port !== "55438" ||
        url.pathname !== "/ledger_test"
      )
        throw Error("Isolated ledger test database required");
      db = new DataSource({
        type: "postgres",
        url: testUrl,
        entities: [],
        synchronize: false,
      });
      await db.initialize();
      jest.mocked(StoreAdapter).mockImplementation(
        () =>
          ({
            authorize: async (uid: string, oid: string) => {
              if (revoked || uid !== user || oid !== org)
                throw Object.assign(new Error("forbidden"), {
                  code: "WORKSPACE_FORBIDDEN",
                  status: 403,
                });
            },
          }) as never,
      );
      await db.query(
        `INSERT INTO users(id,email,status) VALUES($1,$2,'active'),($3,$4,'active')`,
        [
          user,
          "synthetic-" + user + "@example.invalid",
          otherUser,
          "synthetic-" + otherUser + "@example.invalid",
        ],
      );
      await db.query(
        "INSERT INTO organizations(id,name,code) VALUES($1,$2,$3),($4,$5,$6)",
        [
          org,
          "합성 매장 A",
          "synthetic-" + org,
          otherOrg,
          "합성 매장 B",
          "synthetic-" + otherOrg,
        ],
      );
      await db.query(
        `INSERT INTO assistant_work_data_consents(owner_key,organization_id,granted_by,epoch,enabled,storage_mode) VALUES($1,$2,$3,$4,true,'server')`,
        ["organization:" + org, org, user, randomUUID()],
      );
      await db.query('UPDATE users SET "isEmailVerified"=true WHERE id=$1', [
        user,
      ]);
      await db.query(
        "INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')",
        [org, user],
      );
      service = new PhotoLedgerService(
        db,
        new URL("https://neture.example.invalid"),
      );
    }, 30000);
    afterAll(async () => {
      if (!db?.isInitialized) return;
      await db.query(
        "DELETE FROM product_candidates WHERE organization_id IN ($1,$2)",
        [org, otherOrg],
      );
      await db.query(
        "DELETE FROM assistant_work_data_consents WHERE organization_id IN ($1,$2)",
        [org, otherOrg],
      );
      await db.query(
        "DELETE FROM organization_members WHERE organization_id IN ($1,$2)",
        [org, otherOrg],
      );
      await db.query("DELETE FROM organizations WHERE id IN ($1,$2)", [
        org,
        otherOrg,
      ]);
      await db.query("DELETE FROM users WHERE id IN ($1,$2)", [
        user,
        otherUser,
      ]);
      await db.destroy();
    });
    beforeEach(() => {
      revoked = false;
    });
    it("stores, reads and confirms a ChatGPT draft without a product identity; creates only pending product metadata", async () => {
      const request = raw();
      const draft = await service.prepare(user, request, "chatgpt");
      expect(draft.state).toBe("draft");
      expect(draft.sources).toEqual([]);
      expect(await service.prepare(user, request, "chatgpt")).toMatchObject({
        id: draft.id,
        version: 1,
      });
      const command = confirm(draft);
      const confirmed = await service.confirm(user, org, draft.id, command);
      expect(confirmed.state).toBe("confirmed");
      expect(await service.confirm(user, org, draft.id, command)).toMatchObject(
        { id: draft.id, state: "confirmed" },
      );
      const candidates = await db.query(
        "SELECT candidate_status,raw_payload,candidate_price FROM product_candidates WHERE source_id=$1",
        [draft.id],
      );
      expect(candidates).toHaveLength(1);
      expect(candidates[0]).toMatchObject({
        candidate_status: "pending",
        candidate_price: null,
      });
      expect(candidates[0].raw_payload.rawSupplierProductCode).toBe("000123");
      expect(candidates[0].raw_payload).not.toHaveProperty("amount");
    });
    it("blocks requestId reuse with changed preparation/confirmation contents", async () => {
      const request = raw();
      const draft = await service.prepare(user, request, "chatgpt");
      await expect(
        service.prepare(
          user,
          {
            ...request,
            invoice: { ...request.invoice, sellerName: "다른 합성 이름" },
          },
          "chatgpt",
        ),
      ).rejects.toMatchObject({ code: "LEDGER_REQUEST_ID_REUSED" });
      const command = confirm(draft);
      await service.confirm(user, org, draft.id, command);
      await expect(
        service.confirm(user, org, draft.id, {
          ...command,
          programStatus: "recorded_in_program",
        }),
      ).rejects.toMatchObject({ code: "LEDGER_REQUEST_ID_REUSED" });
    });
    it("keeps a correction history and blocks the old version", async () => {
      const draft = await service.prepare(user, raw(), "chatgpt");
      const data = { ...draft.invoice, sellerName: "수정된 합성 거래처" };
      const edited = await service.prepare(
        user,
        raw(data, { invoiceId: draft.id, expectedVersion: 1 }),
        "chatgpt",
      );
      expect(edited.version).toBe(2);
      await expect(
        service.confirm(user, org, draft.id, confirm(draft)),
      ).rejects.toMatchObject({ code: "LEDGER_CONFLICT" });
      const history = await db.query(
        "SELECT invoice FROM photo_transaction_revisions WHERE invoice_id=$1 ORDER BY version",
        [draft.id],
      );
      expect(history).toHaveLength(2);
      expect(history[0].invoice.sellerName).toBe("합성 거래처");
    });
    it("requires explicit original-photo acknowledgement and unresolved financial review", async () => {
      const draft = await service.prepare(user, raw(), "chatgpt");
      await expect(
        service.confirm(
          user,
          org,
          draft.id,
          confirm(draft, { acknowledgeMissingOriginal: false }),
        ),
      ).rejects.toMatchObject({ code: "LEDGER_ORIGINAL_ACK_REQUIRED" });
      const data = invoice();
      data.unresolved.push("rows.r1.amount" as never);
      const unclear = await service.prepare(user, raw(data), "chatgpt");
      await expect(
        service.confirm(user, org, unclear.id, confirm(unclear)),
      ).rejects.toMatchObject({ code: "LEDGER_REVIEW_REQUIRED" });
    });
    it("serializes concurrent identical-document confirmation and suppresses duplicate candidates", async () => {
      const data = invoice(),
        first = await service.prepare(user, raw(data), "chatgpt"),
        second = await service.prepare(user, raw(data), "chatgpt");
      const results = await Promise.allSettled([
        service.confirm(user, org, first.id, confirm(first)),
        service.confirm(user, org, second.id, confirm(second)),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const remaining = results[0].status === "fulfilled" ? second : first;
      const duplicate = await service.confirm(
        user,
        org,
        remaining.id,
        confirm(remaining, {
          duplicateResolution: "same_transaction",
          duplicateReason: "같은 거래의 사진을 다시 제출함",
        }),
      );
      expect(duplicate.state).toBe("duplicate");
      const [count] = await db.query(
        "SELECT count(*)::int AS total FROM product_candidates WHERE source_id=$1",
        [remaining.id],
      );
      expect(count.total).toBe(0);
    });
    it("flags the same extracted transaction even without a photo or document number", async () => {
      const data = invoice();
      data.documentNumber = null as never;
      const first = await service.prepare(user, raw(data), "chatgpt");
      await service.confirm(user, org, first.id, confirm(first));
      const second = await service.prepare(user, raw(data), "chatgpt");
      await expect(
        service.confirm(user, org, second.id, confirm(second)),
      ).rejects.toMatchObject({ code: "LEDGER_DUPLICATE_REVIEW_REQUIRED" });
    });
    it("keeps photo bytes/private hashes across correction and serves only the current source to authorized users", async () => {
      const bytes = readFileSync(
        resolve(
          __dirname,
          "../../modules/external-ai/__tests__/fixtures/chatgpt-invoice-trial/invoice.sample.png",
        ),
      );
      const draft = await service.prepare(user, raw(), "o4o_chat", [
        { mimeType: "image/png", base64: bytes.toString("base64") },
      ]);
      expect(
        (await service.image(user, org, draft.id, 1)).image_bytes.equals(bytes),
      ).toBe(true);
      const next = await service.prepare(
        user,
        raw(draft.invoice, { invoiceId: draft.id, expectedVersion: 1 }),
        "o4o_chat",
      );
      expect(next.sources).toEqual(draft.sources);
      const changedPhoto = Buffer.concat([
        bytes,
        Buffer.from("synthetic-trailing"),
      ]);
      const replaced = await service.prepare(
        user,
        raw(next.invoice, { invoiceId: draft.id, expectedVersion: 2 }),
        "o4o_chat",
        [{ mimeType: "image/png", base64: changedPhoto.toString("base64") }],
      );
      expect(replaced.sources[0].sha256).not.toBe(draft.sources[0].sha256);
      expect(
        (
          await db.query(
            "SELECT count(*)::int AS n FROM photo_transaction_images WHERE invoice_id=$1",
            [draft.id],
          )
        )[0].n,
      ).toBe(2);
      expect(
        (
          await db.query(
            "SELECT sources FROM photo_transaction_revisions WHERE invoice_id=$1 AND version=1",
            [draft.id],
          )
        )[0].sources,
      ).toEqual(draft.sources);

      await expect(service.get(user, otherOrg, draft.id)).rejects.toMatchObject(
        { code: "WORKSPACE_FORBIDDEN" },
      );
      await expect(
        service.image(otherUser, org, draft.id, 1),
      ).rejects.toMatchObject({ code: "WORKSPACE_FORBIDDEN" });
      revoked = true;
      await expect(service.get(user, org, draft.id)).rejects.toMatchObject({
        code: "WORKSPACE_FORBIDDEN",
      });
    });
    it("rolls back confirmation if the candidate delivery fails", async () => {
      const draft = await service.prepare(user, raw(), "chatgpt");
      const original = db.transaction.bind(db);
      const spy = jest.spyOn(db, "transaction").mockImplementation(((
        run: any,
      ) =>
        original(async (manager) => {
          const query = manager.query.bind(manager);
          manager.query = (async (sql: string, args: any[]) => {
            if (sql.startsWith("INSERT INTO product_candidates"))
              throw Error("synthetic candidate failure");
            return query(sql, args);
          }) as never;
          return run(manager);
        })) as never);
      await expect(
        service.confirm(user, org, draft.id, confirm(draft)),
      ).rejects.toThrow("synthetic candidate failure");
      spy.mockRestore();
      expect((await service.get(user, org, draft.id)).state).toBe("draft");
    });
    it("has no missing closed-store writer fences after adding ledger tables", async () => {
      expect(await db.query(CLOSED_STORE_WRITER_GAPS_SQL)).toEqual([]);
    });
    it("fails closed when server authority is revoked", async () => {
      const draft = await service.prepare(user, raw(), "chatgpt");
      await db.query(
        "UPDATE assistant_work_data_consents SET enabled=false WHERE owner_key=$1",
        ["organization:" + org],
      );
      await expect(service.get(user, org, draft.id)).rejects.toMatchObject({
        code: "LEDGER_SERVER_STORAGE_CONSENT_REQUIRED",
      });
      await db.query(
        "UPDATE assistant_work_data_consents SET enabled=true WHERE owner_key=$1",
        ["organization:" + org],
      );
    });
    it("removes the photo ledger, source bytes, history and pending candidates when server storage is stopped", async () => {
      await new WorkDataService(db).setConsent(
        user,
        { key: "organization:" + org, userId: null, organizationId: org },
        false,
      );
      for (const table of [
        "photo_transaction_invoices",
        "photo_transaction_revisions",
        "photo_transaction_images",
        "photo_transaction_requests",
      ])
        expect(
          (await db.query("SELECT count(*)::int AS n FROM " + table))[0].n,
        ).toBe(0);
      expect(
        (
          await db.query(
            "SELECT count(*)::int AS n FROM product_candidates WHERE organization_id=$1 AND candidate_status='pending'",
            [org],
          )
        )[0].n,
      ).toBe(0);
    });
  },
);
