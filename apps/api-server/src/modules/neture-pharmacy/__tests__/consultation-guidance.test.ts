import {
  ConsultationGuidanceService,
  consultationIntent,
} from "../services/consultation-guidance.js";
import { pickFallbackPage } from "../../../routes/o4o-store/utils/multilingual-locale.js";
import { NeturePharmacyError } from "../constants.js";
const productId = "55555555-5555-4555-8555-555555555555";
let pages: any[],
  published: boolean,
  product: any,
  authorize: jest.Mock,
  select: jest.Mock,
  translate: jest.Mock,
  service: ConsultationGuidanceService;
beforeEach(() => {
  published = true;
  product = {
    id: productId,
    kind: "local",
    name: "Fixture product",
    location: "A-1",
    publicKey: "fixture-key",
  };
  pages = [
    {
      id: "page-ko",
      locale: "ko",
      title: "게시된 설명",
      summary: "첫 번째 공개 설명입니다.",
      contentFormat: "html",
      content: {
        html: "<p>두 번째 공개 문단입니다.</p><p>주의 문단입니다.</p>",
      },
      status: "published",
      updatedAt: "v1",
    },
  ];
  authorize = jest.fn(async (actor, org) => {
    if (actor !== "staff" || org !== "store")
      throw new NeturePharmacyError(403, "STORE_ACCESS_REQUIRED", "denied");
  });
  select = jest.fn(async () => [2]);
  translate = jest.fn(async () => ({ translation: "Translated source" }));
  const query = jest.fn(async (sql: string, args: unknown[]) => {
    if (sql.includes("WITH products"))
      return args[0] === "store" && product ? [product] : [];
    if (sql.includes("FROM store_multilingual_product_content_groups"))
      return published
        ? [
            {
              id: "group",
              title: "Fixture source",
              defaultLocale: "ko",
              publicKey: "fixture-key",
              updatedAt: "v1",
            },
          ]
        : [];
    if (sql.includes("FROM store_multilingual_product_content_pages"))
      return pages;
    throw new Error("Unexpected fixture SQL");
  });
  service = new ConsultationGuidanceService(
    { query } as any,
    authorize,
    async () => {},
    select,
    translate,
  );
});
const input = (patch = {}) => ({
  mode: "floor-pharmacist",
  language: "ko",
  intent: "product-details",
  question: "이 상품을 설명해 주세요.",
  productKind: "local",
  productId,
  ...patch,
});
it("preserves existing published-only fallback order", () => {
  const p = [
    { locale: "ko", status: "published" },
    { locale: "en", status: "published" },
    { locale: "ja", status: "draft" },
  ];
  expect(pickFallbackPage(p, "ja", "ko")?.locale).toBe("en");
  expect(pickFallbackPage(p, "ko", "en")?.fallbackReason).toBeNull();
  expect(
    pickFallbackPage([{ locale: "ja", status: "draft" }], "ja", "ja"),
  ).toBeNull();
});
it("asks only for the missing product or task without invoking AI", async () => {
  const result = await service.prepare(
    "staff",
    "store",
    input({ productId: undefined }),
  );
  expect(result).toMatchObject({ state: "clarify", intent: "product-details" });
  expect(
    await service.prepare(
      "staff",
      "store",
      input({ intent: "help", question: "안녕하세요" }),
    ),
  ).toMatchObject({ state: "clarify", intent: null });
  expect(select).not.toHaveBeenCalled();
  expect(translate).not.toHaveBeenCalled();
});
it("distinguishes location, explanation and pharmacist guidance with native language and no call claim", async () => {
  const result = await service.prepare(
    "staff",
    "store",
    input({ intent: "location", language: "ja" }),
  );
  expect(result.card).toMatchObject({
    text: "商品の場所: A-1",
    language: "ja",
  });
  expect(
    await service.prepare(
      "staff",
      "store",
      input({
        intent: "help",
        question: "복용 상담을 하고 싶어요",
        language: "en",
      }),
    ),
  ).toMatchObject({
    intent: "pharmacist",
    card: { text: expect.stringContaining("ask a pharmacist") },
  });
  expect(select).not.toHaveBeenCalled();
  expect(consultationIntent("wrong", "설명")).toBeNull();
});
it("shows published excerpts in the requested locale or explicitly marked fallback", async () => {
  const ko = await service.prepare("staff", "store", input());
  expect(ko.card?.text).toBe("첫 번째 공개 설명입니다.");
  const ja = await service.prepare("staff", "store", input({ language: "ja" }));
  expect(ja.card).toMatchObject({
    language: "ko",
    requestedLanguage: "ja",
    fallbackUsed: true,
  });
  pages.push({
    ...pages[0],
    id: "page-ja",
    locale: "ja",
    summary: "公開された説明",
    content: { html: "<p>日本語の情報</p>" },
  });
  expect(
    (await service.prepare("staff", "store", input({ language: "ja" }))).card,
  ).toMatchObject({ language: "ja", fallbackUsed: false });
});
it("AI only selects supplied passages; no new answer text can reach the card", async () => {
  const result = await service.prepare(
    "staff",
    "store",
    input({ useAi: true }),
  );
  expect(result.card?.text).toBe("두 번째 공개 문단입니다.");
  expect(result.aiSelected).toBe(true);
  select.mockResolvedValueOnce([999]);
  await expect(
    service.prepare("staff", "store", input({ useAi: true })),
  ).rejects.toMatchObject({ code: "GUIDANCE_AI_UNAVAILABLE" });
});
it("distinguishes empty source from lookup failure and never falls back to drafts", async () => {
  pages = pages.map((p) => ({ ...p, status: "draft" }));
  expect(await service.prepare("staff", "store", input())).toMatchObject({
    state: "empty",
  });
  product = null;
  await expect(
    service.prepare("staff", "store", input()),
  ).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
});
it("rechecks access and source versions after model/translation completion", async () => {
  select.mockImplementationOnce(async () => {
    published = false;
    return [1];
  });
  await expect(
    service.prepare("staff", "store", input({ useAi: true })),
  ).rejects.toMatchObject({ code: "GUIDANCE_SOURCE_CHANGED" });
  published = true;
  select.mockImplementationOnce(async () => {
    authorize.mockRejectedValue(
      new NeturePharmacyError(403, "STORE_ACCESS_REQUIRED", "denied"),
    );
    return [1];
  });
  await expect(
    service.prepare("staff", "store", input({ useAi: true })),
  ).rejects.toMatchObject({ code: "STORE_ACCESS_REQUIRED" });
});
it("verifies current resource before sharing and rejects another store", async () => {
  const result = await service.prepare("staff", "store", input());
  await service.verify("staff", "store", result.proof!);
  pages[0].content = { html: "<p>수정된 설명</p>" };
  await expect(
    service.verify("staff", "store", result.proof!),
  ).rejects.toMatchObject({ code: "GUIDANCE_SOURCE_CHANGED" });
  await expect(
    service.prepare("staff", "other", input()),
  ).rejects.toMatchObject({ code: "STORE_ACCESS_REQUIRED" });
});
it("translates only on explicit request, retaining source identity and checking source afterwards", async () => {
  const result = await service.prepare(
    "staff",
    "store",
    input({ language: "en", translateMaterial: true }),
  );
  expect(result.card).toMatchObject({
    text: "Translated source",
    language: "en",
    translated: true,
    source: { language: "ko" },
  });
  expect(translate.mock.calls[0][0]).toMatchObject({
    source: "ko",
    target: "en",
  });
  translate.mockImplementationOnce(async () => {
    pages[0].status = "draft";
    return { translation: "Late" };
  });
  await expect(
    service.prepare(
      "staff",
      "store",
      input({ language: "en", translateMaterial: true }),
    ),
  ).rejects.toMatchObject({ code: "GUIDANCE_SOURCE_CHANGED" });
});

it("keeps proof valid when PostgreSQL JSONB reorders card keys", async () => {
  const r = await service.prepare(
    "staff",
    "store",
    input({ intent: "pharmacist", language: "ja" }),
  );
  const proof = JSON.parse(JSON.stringify(r.proof));
  proof.card = Object.fromEntries(Object.entries(proof.card).reverse());
  await expect(
    service.verify("staff", "store", proof),
  ).resolves.toBeUndefined();
});
it("keeps original location text until explicit translation and checks current location afterwards", async () => {
  product.location = "1층 A-1";
  const r = await service.prepare(
    "staff",
    "store",
    input({ intent: "location", language: "ja" }),
  );
  expect(r.canTranslate).toBe(true);
  expect(translate).not.toHaveBeenCalled();
  const translated = await service.prepare(
    "staff",
    "store",
    input({ intent: "location", language: "ja", translateMaterial: true }),
  );
  expect(translated.card).toMatchObject({
    text: "Translated source",
    translated: true,
  });
});

it("translates the selected excerpt without rerunning AI and rejects stale or invented selections", async () => {
  const prepared = await service.prepare(
    "staff",
    "store",
    input({ language: "ja", useAi: true }),
  );
  const r = await service.prepare(
    "staff",
    "store",
    input({
      language: "ja",
      translateMaterial: true,
      selection: prepared.selection,
    }),
  );
  expect(select).toHaveBeenCalledTimes(1);
  expect(translate.mock.calls[0][0].text).toBe("두 번째 공개 문단입니다.");
  expect(r.card?.translated).toBe(true);
  await expect(
    service.prepare(
      "staff",
      "store",
      input({
        language: "ja",
        selection: { ...prepared.selection, passageIds: [999] },
      }),
    ),
  ).rejects.toMatchObject({ code: "INVALID_GUIDANCE_SELECTION" });
  pages[0].updatedAt = "v2";
  await expect(
    service.prepare(
      "staff",
      "store",
      input({ language: "ja", selection: prepared.selection }),
    ),
  ).rejects.toMatchObject({ code: "GUIDANCE_SOURCE_CHANGED" });
});
