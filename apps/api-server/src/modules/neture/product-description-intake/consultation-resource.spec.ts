import {
  consultationEntry,
  consultationReadiness,
  readConsultationDescriptions,
  type ConsultationDescriptionRow,
} from "./consultation-resource.js";
import {
  readApprovedProductAiContext,
  readStoreProductAiContext,
} from "./ai-context.service.js";
import { prepareDescriptionEntries } from "./contracts.js";

const source = {
  kind: "manufacturer",
  currentness: "retrieved",
  references: [{ url: "https://example.org/source" }],
};
const section = {
  key: "caution",
  title: "주의사항",
  kind: "product-fact",
  text: "합성 주의사항",
  referenceUrls: [source.references[0].url],
};
const entry = {
  key: "synthetic",
  name: "합성 상품",
  content: "<p>합성 상품 자료</p>",
  descriptionType: "CONSULTATION",
  language: "ko",
  source,
  aiSections: [section],
};
const row = (
  type: "CONSULTATION" | "B2B" = "CONSULTATION",
): ConsultationDescriptionRow => ({
  master_id: "master",
  id: "description",
  description_type: type,
  content: entry.content,
  summary: null,
  updated_at: new Date("2026-11-12T00:00:00Z"),
  entry: { ...entry, descriptionType: type },
});

describe("consultation knowledge is a separate resource purpose", () => {
  it("accepts independent consultation intake while retaining the old default for existing clients", () => {
    expect(
      prepareDescriptionEntries({ entries: [entry] }).entries[0]
        .descriptionType,
    ).toBe("CONSULTATION");
    const legacy = { ...entry, descriptionType: undefined };
    expect(
      prepareDescriptionEntries({ entries: [legacy] }).entries[0]
        .descriptionType,
    ).toBe("B2B");
  });
  it.each(["CONSULTATION", "B2B"] as const)(
    "reads version-matched structured %s without using its HTML as knowledge",
    async (type) => {
      const db = { query: jest.fn().mockResolvedValue([row(type)]) };
      expect(
        await readApprovedProductAiContext(db, "master", "ko"),
      ).toMatchObject({
        state: "structured",
        description: { sections: [section], source },
      });
      expect(db.query.mock.calls[0][1]).toEqual([["master"], "ko"]);
      expect(db.query.mock.calls[0][0]).toContain(
        "CASE WHEN d.description_type='CONSULTATION' THEN 0 ELSE 1 END",
      );
    },
  );
  it("does not substitute generic B2B HTML when no structured resource is available", async () => {
    const generic = { ...row("B2B"), entry: null };
    expect(consultationReadiness(generic, "ko")).toBe("missing");
    expect(
      await readApprovedProductAiContext(
        { query: jest.fn().mockResolvedValue([generic]) },
        "master",
        "ko",
      ),
    ).toMatchObject({ state: "missing", description: null });
  });
  it.each([
    ["changed body", { ...row(), content: "<p>새 관리자 편집</p>" }],
    ["missing source", { ...row(), entry: { ...entry, source: undefined } }],
    [
      "wrong purpose",
      { ...row(), entry: { ...entry, descriptionType: "B2B" } },
    ],
    ["wrong language", { ...row(), entry: { ...entry, language: "en" } }],
    [
      "missing sections",
      { ...row(), entry: { ...entry, aiSections: undefined } },
    ],
    ["empty body", { ...row(), content: "", entry: { ...entry, content: "" } }],
    [
      "undeclared evidence",
      {
        ...row(),
        entry: {
          ...entry,
          aiSections: [
            { ...section, referenceUrls: ["https://other.example/source"] },
          ],
        },
      },
    ],
  ] as const)(
    "invalidates %s rather than promoting stale or unverified facts",
    (_name, resource) => {
      expect(consultationEntry(resource, "ko")).toBeNull();
      expect(consultationReadiness(resource, "ko")).toBe("missing");
    },
  );
  it("keeps unclassified structured material outside readiness completion", () => {
    const unclassified = {
      ...row(),
      entry: {
        ...entry,
        aiSections: [{ ...section, kind: "unclassified", referenceUrls: [] }],
      },
    };
    expect(consultationReadiness(unclassified, "ko")).toBe("unclassified");
  });
  it("does no query for an empty product set and deduplicates a batch", async () => {
    const db = { query: jest.fn().mockResolvedValue([]) };
    expect((await readConsultationDescriptions(db, [], "ko")).size).toBe(0);
    expect(db.query).not.toHaveBeenCalled();
    await readConsultationDescriptions(db, ["master", "master"], "ko");
    expect(db.query.mock.calls[0][1]).toEqual([["master"], "ko"]);
    expect(db.query.mock.calls[0][0]).toContain(
      "d.status='canonical' AND d.deleted_at IS NULL",
    );
  });
  it("rejects a product outside the selected active store before reading knowledge", async () => {
    const db = { query: jest.fn().mockResolvedValue([]) };
    expect(
      await readStoreProductAiContext(db, "other-store", "listing", "ko"),
    ).toBeNull();
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][1]).toEqual(["listing", "other-store"]);
  });
});
