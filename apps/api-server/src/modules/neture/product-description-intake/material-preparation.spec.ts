import {
  readMaterialPreparation,
  materialPreparationRequest,
} from "./material-preparation.js";
import { ruleSchema } from "../product-correction/contracts.js";
import { previewQuery } from "../product-correction/preview.js";

const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const master = (n: number) => ({
  id: uuid(n),
  name: `합성 상품 ${n}`,
  barcode: null,
  manufacturer: "합성 제조사",
  specification: null,
  storeCount: 2,
});
function knowledge(id: string) {
  return {
    master_id: id,
    id: uuid(999),
    description_type: "CONSULTATION",
    content: "<p>근거 본문</p>",
    entry: {
      key: "fixture",
      name: "합성 상품",
      descriptionType: "CONSULTATION",
      language: "ko",
      content: "<p>근거 본문</p>",
      source: {
        kind: "manufacturer",
        currentness: "retrieved",
        references: [{ url: "https://example.org/product" }],
      },
      aiSections: [
        {
          key: "fact",
          title: "성분",
          kind: "product-fact",
          text: "합성 성분",
          referenceUrls: ["https://example.org/product"],
        },
      ],
    },
  };
}
function fixture() {
  const state = {
    masters: [master(1), master(2)],
    consultation: [knowledge(uuid(1))],
    qr: [{ master_id: uuid(1), id: uuid(888), content: "<p>QR</p>" }],
  };
  const query = jest.fn(async (sql: string) => {
    if (sql.includes("FROM product_masters m")) return state.masters;
    if (sql.includes("FROM shared_product_descriptions d"))
      return state.consultation;
    if (sql.includes("description_type='STORE'")) return state.qr;
    throw new Error("Unexpected query");
  });
  return { state, query };
}
it("separates two resource states and includes only products that still need preparation", async () => {
  const f = fixture(),
    result = await readMaterialPreparation(f, {});
  expect(result.items.map((r) => r.id)).toEqual([uuid(2)]);
  expect(result.items[0]).toMatchObject({
    consultation: "missing",
    standardDescription: "missing",
    storeCount: 2,
  });
  expect(result.nextCursor).toBeNull();
  expect(result.scanned).toBe(2);
  const all = await readMaterialPreparation(f, { state: "all" });
  expect(all.items[0]).toMatchObject({
    consultation: "structured",
    standardDescription: "ready",
  });
  expect(
    f.query.mock.calls.every(
      ([sql]) => !/\b(INSERT|UPDATE|DELETE)\b/.test(sql),
    ),
  ).toBe(true);
  expect(f.query.mock.calls[0][0]).toContain(
    "COUNT(DISTINCT l.organization_id)",
  );
  expect(f.query.mock.calls[0][0]).toContain(
    "EXISTS(SELECT 1 FROM organization_product_listings",
  );
});
it("treats changed source and empty QR HTML as needing review", async () => {
  const f = fixture();
  f.state.consultation[0].content = "<p>편집 후 본문</p>";
  f.state.qr[0].content = "<p>&nbsp;</p>";
  expect((await readMaterialPreparation(f, {})).items[0]).toMatchObject({
    consultation: "missing",
    standardDescription: "missing",
  });
});
it("returns a continuation for a sparse bounded scan instead of claiming all materials are ready", async () => {
  let page = 0;
  const query = jest.fn(async (sql: string, params: unknown[]) => {
    if (sql.includes("FROM product_masters m"))
      return Array.from({ length: 25 }, () => master(++page));
    const ids = params[0] as string[];
    if (sql.includes("FROM shared_product_descriptions d"))
      return ids.map(knowledge);
    return ids.map((id) => ({ master_id: id, id, content: "<p>QR</p>" }));
  });
  const result = await readMaterialPreparation({ query }, {});
  expect(result.items).toEqual([]);
  expect(result.scanned).toBe(250);
  expect(result.nextCursor).toBe(uuid(250));
});
it("rechecks selected demand and excludes prepared resources from an external research request", async () => {
  const f = fixture();
  Object.assign(f.state.masters[1], {
    privateStoreName: "PRIVATE-STORE",
    price: "PRIVATE-PRICE",
  });
  const result = await materialPreparationRequest(f, {
    ids: [uuid(1), uuid(2), uuid(2)],
    language: "ko",
    purpose: "CONSULTATION",
  });
  expect(result.products.map((p) => p.id)).toEqual([uuid(2)]);
  expect(result.alreadyPreparedCount).toBe(1);
  expect(result.requestText).toContain("aiSections");
  expect(result.requestText).not.toContain("PRIVATE-");
  expect(f.query.mock.calls[0][1]).toEqual([[uuid(1), uuid(2)]]);
});
it("does not produce a new research workload for an already prepared selection", async () => {
  const f = fixture();
  f.state.masters = [master(1)];
  const result = await materialPreparationRequest(f, {
    ids: [uuid(1)],
    language: "ko",
    purpose: "STORE",
  });
  expect(result.products).toEqual([]);
  expect(result.requestText).toContain("이미 준비");
});
it("fails a withdrawn selection and rejects injected fields before exporting", async () => {
  const f = fixture();
  f.state.masters = [];
  await expect(
    materialPreparationRequest(f, {
      ids: [uuid(1)],
      language: "ko",
      purpose: "STORE",
    }),
  ).rejects.toMatchObject({ code: "PREPARATION_TARGET_CHANGED" });
  f.query.mockClear();
  await expect(
    materialPreparationRequest(f, {
      ids: [uuid(1)],
      language: "ko",
      purpose: "STORE",
      model: "injected",
    }),
  ).rejects.toThrow();
  expect(f.query).not.toHaveBeenCalled();
});
it("supports opt-in recurring consultation checks only for handled common products", () => {
  const rule = ruleSchema.parse({
    title: "점검",
    instructions: "검토",
    purpose: "ai-support",
    descriptionType: "CONSULTATION",
    regulatoryTypes: [],
    language: "ko",
    cadenceDays: 30,
    enabled: false,
    check: { kind: "manual" },
    handledOnly: true,
  });
  const sql = previewQuery({ ...rule, enabled: true } as never, {
    search: "",
    page: 1,
  });
  expect(sql.params).toEqual(["CONSULTATION", "ko"]);
  expect(sql.from).toContain(
    "EXISTS (SELECT 1 FROM organization_product_listings",
  );
  expect(
    previewQuery({ ...rule, handledOnly: undefined } as never, {
      search: "",
      page: 1,
    }).from,
  ).not.toContain("organization_product_listings");
});
