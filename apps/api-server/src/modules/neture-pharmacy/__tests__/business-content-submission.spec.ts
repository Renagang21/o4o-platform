import { DataSource } from "typeorm";
import { randomUUID } from "node:crypto";
import {
  BusinessContentSubmissionService,
  librarySnapshot,
} from "../services/business-content-submission.service.js";
import {
  SemiFranchiseService,
  type SemiFranchiseRow,
} from "../services/semi-franchise.service.js";
import { SemiFranchiseContentService } from "../services/semi-franchise-content.service.js";
import { SupplyProposalService } from "../services/supply-proposal.service.js";

describe("supplier document snapshot validation", () => {
  it("keeps submitted HTML and file metadata without publishing the source library item", () => {
    expect(
      librarySnapshot({
        title: "Document",
        content_type: "document",
        blocks: [{ type: "html", content: "<p>Version A</p>" }],
      }),
    ).toMatchObject({ body: "<p>Version A</p>", attachments: [] });
    expect(
      librarySnapshot({
        title: "File",
        content_type: "media",
        file_url: "https://example.invalid/a.pdf",
        file_name: "a.pdf",
      }).attachments,
    ).toHaveLength(1);
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "https://synthetic-user@example.invalid/a",
  ])("rejects unsafe file address %s", (file_url) => {
    expect(() =>
      librarySnapshot({ title: "File", content_type: "media", file_url }),
    ).toThrow();
  });
  it("does not silently submit an unsupported/empty document", () => {
    expect(() =>
      librarySnapshot({ title: "Doc", content_type: "document", blocks: [] }),
    ).toThrow();
    expect(() =>
      librarySnapshot({
        title: "Doc",
        content_type: "document",
        blocks: [{ type: "unknown" }],
      }),
    ).toThrow();
  });
});

// Fixed loopback-only disposable fixture. Never point this test at a shared/development/production DB.
const integration =
  process.env.O4O_COOP_APPROVAL_IT === "1" ? describe : describe.skip;
integration("business-specific submissions on isolated PostgreSQL 15", () => {
  let ds: DataSource,
    svc: BusinessContentSubmissionService,
    contents: SemiFranchiseContentService;
  let user: string,
    otherUser: string,
    operator: string,
    supplier: string,
    otherSupplier: string,
    library: string;
  let a: SemiFranchiseRow,
    b: SemiFranchiseRow,
    pharmacy: string,
    outsider: string;
  const tag = randomUUID().slice(0, 8);
  const users: string[] = [],
    orgs: string[] = [],
    contentIds: string[] = [],
    snapshotIds: string[] = [];
  beforeAll(async () => {
    ds = new DataSource({
      type: "postgres",
      host: "127.0.0.1",
      port: 55437,
      username: "postgres",
      database: "o4o_coop_approval",
      synchronize: false,
    });
    await ds.initialize();
    svc = new BusinessContentSubmissionService(ds);
    const mkUser = async () => {
      const [r] = await ds.query(
        `INSERT INTO users(email,status,"isActive","isEmailVerified") VALUES ($1,'active',true,true) RETURNING id`,
        [`${randomUUID()}@example.invalid`],
      );
      users.push(r.id);
      return r.id as string;
    };
    const mkOrg = async () => {
      const [r] = await ds.query(
        `INSERT INTO organizations(name,code,type) VALUES ('Synthetic org',$1,'pharmacy') RETURNING id`,
        [randomUUID()],
      );
      orgs.push(r.id);
      return r.id as string;
    };
    user = await mkUser();
    otherUser = await mkUser();
    operator = await mkUser();
    const [s1] = await ds.query(
      `INSERT INTO neture_suppliers(slug,status,user_id) VALUES ($1,'ACTIVE',$2) RETURNING id`,
      [`supplier-${tag}`, user],
    );
    supplier = s1.id;
    const [s2] = await ds.query(
      `INSERT INTO neture_suppliers(slug,status,user_id) VALUES ($1,'ACTIVE',$2) RETURNING id`,
      [`other-${tag}`, otherUser],
    );
    otherSupplier = s2.id;
    const mkBusiness = async (key: string) => {
      const org = await mkOrg();
      const [r] = await ds.query(
        `INSERT INTO semi_franchises(key,name,organization_id) VALUES ($1,$1,$2) RETURNING *`,
        [key, org],
      );
      return r as SemiFranchiseRow;
    };
    a = await mkBusiness(`coop-${tag}`);
    b = await mkBusiness(`other-${tag}`);
    await ds.query(
      `INSERT INTO semi_franchise_operators(semi_franchise_id,user_id) VALUES ($1,$2)`,
      [a.id, operator],
    );
    await ds.query(
      `INSERT INTO semi_franchise_operators(semi_franchise_id,user_id) VALUES ($1,$2)`,
      [b.id, otherUser],
    );
    pharmacy = await mkOrg();
    outsider = await mkOrg();
    await ds.query(
      `INSERT INTO semi_franchise_memberships(semi_franchise_id,organization_id,status,applied_by) VALUES ($1,$2,'active',$3)`,
      [a.id, pharmacy, user],
    );
    const [l] = await ds.query(
      `INSERT INTO neture_supplier_library_items(supplier_id,title,file_url,file_name,file_size,mime_type,content_type,blocks,is_public)
      VALUES ($1,'Supplier original','','',0,'text/html','document',$2::jsonb,false) RETURNING id`,
      [
        supplier,
        JSON.stringify([{ type: "html", content: "<p>Submitted version</p>" }]),
      ],
    );
    library = l.id;
    contents = new SemiFranchiseContentService(ds, async (input) => {
      const [r] = await ds.query(
        `INSERT INTO o4o_asset_snapshots(organization_id,source_service,source_asset_id,asset_type,title,content_json,created_by)
        VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7) RETURNING id`,
        [
          input.targetOrganizationId,
          input.sourceService,
          input.sourceAssetId,
          input.assetType,
          input.title,
          JSON.stringify(input.contentJson),
          input.createdBy,
        ],
      );
      snapshotIds.push(r.id);
      return { snapshotId: r.id };
    });
  });
  afterAll(async () => {
    if (!ds?.isInitialized) return;
    await ds.query(
      "DELETE FROM o4o_asset_snapshots WHERE id = ANY($1::uuid[])",
      [snapshotIds],
    );
    if (a && b) {
      await ds.query(
        "DELETE FROM semi_franchise_content_submissions WHERE semi_franchise_id = ANY($1::uuid[])",
        [[a.id, b.id]],
      );
      await ds.query(
        "DELETE FROM semi_franchise_contents WHERE semi_franchise_id = ANY($1::uuid[])",
        [[a.id, b.id]],
      );
      await ds.query("DELETE FROM semi_franchises WHERE id = ANY($1::uuid[])", [
        [a.id, b.id],
      ]);
    }
    await ds.query("DELETE FROM neture_suppliers WHERE id = ANY($1::uuid[])", [
      [supplier, otherSupplier].filter(Boolean),
    ]);
    await ds.query("DELETE FROM organizations WHERE id = ANY($1::uuid[])", [
      orgs,
    ]);
    await ds.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [users]);
    await ds.destroy();
  });
  it("requires supplier ownership and active target; isolates operator assignments", async () => {
    await expect(
      svc.submit(otherSupplier, otherUser, library, a.key),
    ).rejects.toMatchObject({ httpStatus: 404 });
    await expect(
      svc.submit(supplier, user, library, "not-a-business"),
    ).rejects.toMatchObject({ httpStatus: 404 });
    await expect(
      new SemiFranchiseService(ds).requireOperatorOf(operator, b.key),
    ).rejects.toMatchObject({ httpStatus: 403 });
    expect(
      (await new SemiFranchiseService(ds).requireOperatorOf(operator, a.key))
        .id,
    ).toBe(a.id);
  });
  it("serializes duplicate submissions; pending content is not in member materials or public CMS", async () => {
    const rows = await Promise.all([
      svc.submit(supplier, user, library, a.key),
      svc.submit(supplier, user, library, a.key),
    ]);
    expect(rows[0].id).toBe(rows[1].id);
    expect(rows.filter((r) => !r.reused)).toHaveLength(1);
    expect(await svc.operatorList(b, "pending")).toHaveLength(0);
    expect((await contents.pharmacyList(pharmacy)).items).toHaveLength(0);
    const [{ count }] = await ds.query(
      `SELECT count(*)::int AS count FROM cms_contents WHERE title='Supplier original'`,
    );
    expect(count).toBe(0);
    await expect(
      svc.decide(b, operator, rows[0].id, "approve"),
    ).rejects.toMatchObject({ httpStatus: 404 });
  });
  it("approves the submitted version into only its business and preserves independent store copies", async () => {
    const [pending] = await svc.operatorList(a, "pending");
    await ds.query(
      `UPDATE neture_supplier_library_items SET blocks = '[{"type":"html","content":"Changed original"}]'::jsonb WHERE id=$1`,
      [library],
    );
    const approved = await svc.decide(a, operator, pending.id, "approve");
    contentIds.push(approved.publishedContentId);
    expect((await contents.pharmacyList(pharmacy)).items[0].body).toBe(
      "<p>Submitted version</p>",
    );
    await expect(
      contents.pharmacyGet(outsider, approved.publishedContentId),
    ).rejects.toMatchObject({ httpStatus: 404 });
    const { snapshotId } = await contents.pharmacyCopy(
      pharmacy,
      user,
      approved.publishedContentId,
    );
    await contents.operatorUpdate(a, operator, approved.publishedContentId, {
      body: "Operator change",
    });
    const [copy] = await ds.query(
      "SELECT content_json FROM o4o_asset_snapshots WHERE id=$1",
      [snapshotId],
    );
    expect(copy.content_json.body).toBe("<p>Submitted version</p>");
    await contents.operatorSetStatus(
      a,
      operator,
      approved.publishedContentId,
      "archive",
    );
    await expect(
      contents.pharmacyGet(pharmacy, approved.publishedContentId),
    ).rejects.toMatchObject({ httpStatus: 404 });
    expect(
      await ds.query("SELECT id FROM o4o_asset_snapshots WHERE id=$1", [
        snapshotId,
      ]),
    ).toHaveLength(1);
    await expect(
      svc.decide(a, operator, pending.id, "approve"),
    ).rejects.toMatchObject({ httpStatus: 409 });
  });
  it("allows a separate submission to another cooperative; rejection publishes nothing and permits resubmission", async () => {
    const pending = await svc.submit(supplier, user, library, b.key);
    await svc.decide(b, otherUser, pending.id, "reject", "needs revision");
    expect((await svc.operatorList(b, "rejected"))[0].reason).toBe(
      "needs revision",
    );
    expect((await svc.submit(supplier, user, library, b.key)).id).not.toBe(
      pending.id,
    );
    expect(await contents.operatorList(b)).toHaveLength(0);
  });
  it("rolls failed publication back and serializes two approval attempts into one published item", async () => {
    const [pending] = await svc.operatorList(b, "pending");
    await expect(
      svc.decide(b, randomUUID(), pending.id, "approve"),
    ).rejects.toThrow();
    expect(await svc.operatorList(b, "pending")).toHaveLength(1);
    expect(await contents.operatorList(b)).toHaveLength(0);
    const results = await Promise.allSettled([
      svc.decide(b, otherUser, pending.id, "approve"),
      svc.decide(b, otherUser, pending.id, "approve"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(await contents.operatorList(b, "published")).toHaveLength(1);
  });
  it("retains the operator-authored create/edit/publish/archive workflow", async () => {
    const own = await contents.operatorCreate(a, operator, {
      title: "Operator original",
      body: "<p>Own material</p>",
    });
    expect((await contents.pharmacyList(pharmacy)).items).toHaveLength(0);
    await contents.operatorUpdate(a, operator, own.id, {
      title: "Edited own material",
    });
    await contents.operatorSetStatus(a, operator, own.id, "publish");
    expect((await contents.pharmacyList(pharmacy)).items[0].title).toBe(
      "Edited own material",
    );
    await contents.operatorSetStatus(a, operator, own.id, "archive");
  });
  it("keeps existing supplier proposal price and decisions independently scoped to each business", async () => {
    const [master] = await ds.query(
      `INSERT INTO product_masters(name,regulatory_name,manufacturer_name) VALUES ('Synthetic product','Synthetic product','Synthetic') RETURNING id`,
    );
    const [offer] = await ds.query(
      `INSERT INTO supplier_product_offers(master_id,supplier_id,slug,price_general,approval_status,is_active) VALUES ($1,$2,$3,10000,'APPROVED',true) RETURNING id`,
      [master.id, supplier, `offer-${tag}`],
    );
    try {
      const proposals = new SupplyProposalService(ds);
      const x = await proposals.supplierCreate(supplier, user, {
        offerId: offer.id,
        semiFranchiseKey: a.key,
        unitPrice: 8000,
      });
      const y = await proposals.supplierCreate(supplier, user, {
        offerId: offer.id,
        semiFranchiseKey: b.key,
        unitPrice: 9000,
      });
      await expect(
        proposals.operatorDecide(b, operator, x.id, "approve"),
      ).rejects.toMatchObject({ httpStatus: 404 });
      await proposals.operatorDecide(a, operator, x.id, "approve");
      expect((await proposals.operatorList(a))[0]).toMatchObject({
        status: "approved",
        unitPrice: 8000,
      });
      expect((await proposals.operatorList(b))[0]).toMatchObject({
        id: y.id,
        status: "pending",
        unitPrice: 9000,
      });
    } finally {
      await ds.query("DELETE FROM supplier_product_offers WHERE id=$1", [
        offer.id,
      ]);
      await ds.query("DELETE FROM product_masters WHERE id=$1", [master.id]);
    }
  });
});
