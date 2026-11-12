import {
  searchConsultationProducts,
  CONSULTATION_SEARCH_BATCH_SIZE,
  CONSULTATION_SEARCH_MATCH_LIMIT,
} from "../services/consultation-product-search.js";

const url = "https://example.org/product";
const source = {
  kind: "manufacturer",
  currentness: "retrieved",
  references: [{ url }],
};
const section = {
  key: "ingredient",
  title: "성분",
  kind: "product-fact",
  text: "루테인",
  referenceUrls: [url],
};
const entry = {
  key: "fixture",
  name: "합성 제품",
  content: "<p>합성 자료 본문</p>",
  descriptionType: "CONSULTATION",
  language: "ko",
  source,
  aiSections: [section],
};
function product(id: string, input: Record<string, unknown> = {}) {
  return {
    id,
    kind: "listing",
    name: `합성 제품 ${id}`,
    metadata: "합성 제품",
    knowledge: {
      master_id: "master",
      id: `description-${id}`,
      description_type: "CONSULTATION",
      content: entry.content,
      summary: null,
      updated_at: "2026-11-12T00:00:00Z",
      entry,
    },
    ...input,
  };
}
const allowed = async () => true;

it.each([
  ["성분", "루테인"],
  ["용도", "눈 건강 유지"],
  ["주의사항", "항응고제 병용 확인"],
])(
  "finds a product by %s present only in structured knowledge",
  async (title, text) => {
    const row = product("selected");
    row.knowledge.entry = {
      ...entry,
      aiSections: [{ ...section, title, text }],
    };
    const query = jest.fn().mockResolvedValue([row]);
    expect(
      await searchConsultationProducts({ query }, "store", [text], allowed),
    ).toEqual([
      {
        id: "selected",
        kind: "listing",
        name: "합성 제품 selected",
        location: "",
      },
    ]);
  },
);
it.each(["product-fact", "professional-reference", "counseling-support"])(
  "uses sourced %s for retrieval without returning the source body",
  async (kind) => {
    const row = product("a");
    row.knowledge.entry = { ...entry, aiSections: [{ ...section, kind }] };
    const found = await searchConsultationProducts(
      { query: jest.fn().mockResolvedValue([row]) },
      "store",
      ["루테인"],
      allowed,
    );
    expect(found).toHaveLength(1);
    expect(found[0]).not.toHaveProperty("knowledge");
    expect(found[0]).not.toHaveProperty("score");
    expect(JSON.stringify(found)).not.toContain(url);
  },
);
it.each([
  [
    "ordinary B2B body",
    { ...product("a").knowledge, description_type: "B2B", entry: null },
  ],
  [
    "changed body",
    { ...product("a").knowledge, content: "<p>Later generic edit</p>" },
  ],
  [
    "wrong language",
    { ...product("a").knowledge, entry: { ...entry, language: "en" } },
  ],
  [
    "wrong purpose",
    {
      ...product("a").knowledge,
      entry: { ...entry, descriptionType: "STORE" },
    },
  ],
  [
    "unclassified text",
    {
      ...product("a").knowledge,
      entry: {
        ...entry,
        aiSections: [{ ...section, kind: "unclassified", referenceUrls: [] }],
      },
    },
  ],
  [
    "undeclared source",
    {
      ...product("a").knowledge,
      entry: {
        ...entry,
        aiSections: [
          { ...section, referenceUrls: ["https://other.example/source"] },
        ],
      },
    },
  ],
])("does not rank an apparent hit from %s", async (_reason, knowledge) => {
  const query = jest.fn().mockResolvedValue([product("a", { knowledge })]);
  expect(
    await searchConsultationProducts({ query }, "store", ["루테인"], allowed),
  ).toEqual([]);
});
it("keeps a name match even when knowledge is missing, and preserves local name lookup", async () => {
  const query = jest.fn().mockResolvedValue([
    product("a", { metadata: "루테인 제품", knowledge: null }),
    product("b", {
      kind: "local",
      metadata: "루테인 자체 제품",
      knowledge: null,
    }),
  ]);
  expect(
    (
      await searchConsultationProducts({ query }, "store", ["루테인"], allowed)
    ).map((row) => row.id),
  ).toEqual(["a", "b"]);
});
it("does not implicitly attach common knowledge to a local product", async () => {
  const query = jest
    .fn()
    .mockResolvedValue([product("local", { kind: "local" })]);
  expect(
    await searchConsultationProducts({ query }, "store", ["루테인"], allowed),
  ).toEqual([]);
});
it("retains the structured legacy bridge used by final source reading", async () => {
  const row = product("legacy");
  const knowledge = {
    ...row.knowledge,
    description_type: "B2B",
    entry: { ...entry, descriptionType: "B2B" },
  };
  expect(
    await searchConsultationProducts(
      { query: jest.fn().mockResolvedValue([{ ...row, knowledge }]) },
      "store",
      ["루테인"],
      allowed,
    ),
  ).toHaveLength(1);
});
it("does not invent a phrase by joining different structured fields", async () => {
  const row = product("a");
  row.knowledge.entry = {
    ...entry,
    aiSections: [{ ...section, title: "눈", text: "건강" }],
  };
  expect(
    await searchConsultationProducts(
      { query: jest.fn().mockResolvedValue([row]) },
      "store",
      ["눈 건강"],
      allowed,
    ),
  ).toEqual([]);
});
it("does not let an invalid first page hide a later valid product", async () => {
  const page = Array.from({ length: CONSULTATION_SEARCH_BATCH_SIZE }, (_, i) =>
    product(`invalid-${i}`, { knowledge: null }),
  );
  const query = jest
    .fn()
    .mockResolvedValueOnce(page)
    .mockResolvedValueOnce([product("valid")]);
  const authorize = jest.fn(allowed);
  expect(
    (
      await searchConsultationProducts(
        { query },
        "store",
        ["루테인"],
        authorize,
      )
    ).map((row) => row.id),
  ).toEqual(["valid"]);
  expect(query.mock.calls[1][1]).toEqual([
    "store",
    ["루테인"],
    page[page.length - 1].id,
    "listing",
  ]);
  expect(authorize).toHaveBeenCalledTimes(1);
});
it("continues after twelve matches and ranks a later stronger match ahead of them", async () => {
  const page = Array.from({ length: CONSULTATION_SEARCH_BATCH_SIZE }, (_, i) =>
    product(`first-${i}`),
  );
  const best = product("later-best");
  best.knowledge.entry = {
    ...entry,
    aiSections: [{ ...section, text: "루테인 주의" }],
  };
  const query = jest
    .fn()
    .mockResolvedValueOnce(page)
    .mockResolvedValueOnce([best]);
  const found = await searchConsultationProducts(
    { query },
    "store",
    ["루테인", "주의"],
    allowed,
  );
  expect(found).toHaveLength(12);
  expect(found[0].id).toBe("later-best");
});
it("stops a revoked multi-page search before another product read", async () => {
  const page = Array.from({ length: CONSULTATION_SEARCH_BATCH_SIZE }, (_, i) =>
    product(`${i}`),
  );
  const query = jest.fn().mockResolvedValue(page);
  await expect(
    searchConsultationProducts(
      { query },
      "store",
      ["루테인"],
      async () => false,
    ),
  ).rejects.toMatchObject({ httpStatus: 403 });
  expect(query).toHaveBeenCalledTimes(1);
});
it("uses bound literal terms, scopes before matching and suppresses duplicate term weight", async () => {
  const query = jest.fn().mockResolvedValue([]);
  await searchConsultationProducts(
    { query },
    "store",
    ["LUTEIN", "lutein", "%_"],
    allowed,
  );
  expect(query.mock.calls[0][1]).toEqual([
    "store",
    ["lutein", "%_"],
    null,
    null,
  ]);
  const sql = query.mock.calls[0][0];
  expect(sql).toContain("l.organization_id=$1 AND l.is_active=true");
  expect(sql).toContain("m.status='ACTIVE'");
  expect(sql).toContain("d.status='canonical' AND d.deleted_at IS NULL");
  expect(sql).toContain("DISTINCT ON (l.master_id)");
});
it("does not query without terms and propagates DB failure rather than inventing an empty result", async () => {
  const query = jest.fn().mockRejectedValue(new Error("DB unavailable"));
  expect(
    await searchConsultationProducts({ query }, "store", [], allowed),
  ).toEqual([]);
  expect(query).not.toHaveBeenCalled();
  await expect(
    searchConsultationProducts({ query }, "store", ["루테인"], allowed),
  ).rejects.toThrow("DB unavailable");
});
it("asks for a narrower search instead of returning a truncated or false empty result", async () => {
  const page = Array.from({ length: CONSULTATION_SEARCH_BATCH_SIZE }, (_, i) =>
    product(`invalid-${i}`, { knowledge: null }),
  );
  const query = jest.fn().mockResolvedValue(page);
  await expect(
    searchConsultationProducts({ query }, "store", ["루테인"], allowed),
  ).rejects.toMatchObject({
    code: "CONSULTATION_SEARCH_TOO_BROAD",
    httpStatus: 422,
  });
  expect(query).toHaveBeenCalledTimes(
    CONSULTATION_SEARCH_MATCH_LIMIT / CONSULTATION_SEARCH_BATCH_SIZE + 1,
  );
});
it("can finish at the exact match budget without falsely rejecting the request", async () => {
  let batch = 0;
  const query = jest.fn(async () =>
    ++batch <= CONSULTATION_SEARCH_MATCH_LIMIT / CONSULTATION_SEARCH_BATCH_SIZE
      ? Array.from({ length: CONSULTATION_SEARCH_BATCH_SIZE }, (_, i) =>
          product(`${batch}-${i}`),
        )
      : [],
  );
  expect(
    await searchConsultationProducts({ query }, "store", ["루테인"], allowed),
  ).toHaveLength(12);
});
