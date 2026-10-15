import { beforeEach, expect, it, vi } from "vitest";
import {
  createOrUpdateDirect,
  emptySnapshotDraft,
  loadDirect,
  loadMaterial,
  loadSnapshot,
  materialDraftFromRecord,
  removeDirect,
  saveDirect,
  saveMaterial,
  saveSnapshot,
  snapshotDraftFromRecord,
  textDraftFromRecord,
  validateNewContent,
} from "../contentAuthoringAdapters";
import type {
  DirectContentItem,
  StoreContentData,
} from "../../../../api/assetSnapshot";
import type { StoreExecutionAsset } from "../../../../api/storeExecutionAssets";
const api = vi.hoisted(() => ({
  getSnapshot: vi.fn(),
  saveSnapshot: vi.fn(),
  getDirect: vi.fn(),
  saveDirect: vi.fn(),
  remove: vi.fn(),
  getAsset: vi.fn(),
  createAsset: vi.fn(),
  saveAsset: vi.fn(),
  create: vi.fn(),
}));
vi.mock("../../../../api/assetSnapshot", () => ({
  storeContentApi: { get: api.getSnapshot, save: api.saveSnapshot },
  directContentApi: {
    get: api.getDirect,
    update: api.saveDirect,
    remove: api.remove,
  },
}));
vi.mock("../../../../api/storeExecutionAssets", () => ({
  getStoreExecutionAsset: api.getAsset,
  createStoreExecutionAsset: api.createAsset,
  updateStoreExecutionAsset: api.saveAsset,
}));
vi.mock("../../../../api/client", () => ({ apiClient: { post: api.create } }));
const snapshot = {
  snapshotId: "snapshot",
  organizationId: "A",
  title: "Fixture",
  source: "snapshot",
  updatedAt: "2026-10-14T00:00:00Z",
  updatedBy: null,
  contentJson: {
    body: "<p>Saved body</p>",
    html: "<p>Old html</p>",
    summary: "Keep",
    tags: ["Keep"],
    usage: {
      displayMode: "banner",
      cta: { enabled: true, label: "CTA", url: "/fixture", target: "_self" },
      qr: { enabled: true },
      print: { enabled: true },
    },
  },
} satisfies StoreContentData;
const direct = {
  id: "direct",
  sourceType: "direct",
  title: "Fixture",
  updatedAt: "2026-10-14T00:00:00Z",
  updatedBy: null,
  tags: ["Tag"],
  contentJson: {
    html: "<p>Saved html</p>",
    blocks: [{ type: "text", value: "Old" }],
    generatedBy: "manual-direct",
    custom: { keep: true },
  },
} satisfies DirectContentItem;
const asset = {
  id: "asset",
  organizationId: "A",
  title: "Fixture",
  assetType: "content",
  htmlContent: "<p>Material</p>",
  category: "blog",
  description: null,
  fileUrl: null,
  fileName: null,
  fileSize: null,
  mimeType: null,
  usageType: null,
  url: null,
  sourceType: "generated",
  isActive: true,
  createdAt: "2026-10-14T00:00:00Z",
  updatedAt: "2026-10-14T00:00:00Z",
} satisfies StoreExecutionAsset;
beforeEach(() => {
  vi.resetAllMocks();
  api.getSnapshot.mockResolvedValue({ success: true, data: snapshot });
  api.saveSnapshot.mockResolvedValue({
    success: true,
    data: { ...snapshot, source: "store" },
  });
  api.getDirect.mockResolvedValue({ success: true, data: direct });
  api.saveDirect.mockResolvedValue({ success: true, data: direct });
  api.remove.mockResolvedValue({
    success: true,
    data: { deleted: true, id: "direct" },
  });
  api.getAsset.mockResolvedValue({ success: true, data: asset });
  api.createAsset.mockResolvedValue({ success: true, data: asset });
  api.saveAsset.mockResolvedValue({ success: true, data: asset });
  api.create.mockResolvedValue({ success: true, data: { id: "created" } });
});
it("snapshot seeding uses authoritative body, preserving CTA/QR/print settings", () => {
  const draft = snapshotDraftFromRecord(snapshot);
  expect(draft.html).toBe("<p>Saved body</p>");
  expect(draft.usage).toMatchObject({
    displayMode: "banner",
    cta: { enabled: true, label: "CTA", url: "/fixture", target: "_self" },
    qr: { enabled: true },
    print: { enabled: true },
  });
});
it("an intentionally empty snapshot body never revives stale html", () => {
  expect(
    snapshotDraftFromRecord({
      ...snapshot,
      contentJson: { body: "", html: "<p>Old</p>" },
    }).html,
  ).toBe("");
});
it("snapshot save preserves metadata and the existing body/blocks/usage contract", async () => {
  const draft = {
    ...emptySnapshotDraft,
    title: "Updated",
    html: "<p>New</p>",
    usage: snapshotDraftFromRecord(snapshot).usage,
  };
  await saveSnapshot("snapshot", draft, snapshot);
  expect(api.saveSnapshot).toHaveBeenCalledWith("snapshot", {
    title: "Updated",
    contentJson: expect.objectContaining({
      summary: "Keep",
      tags: ["Keep"],
      body: "<p>New</p>",
      blocks: [],
      usage: draft.usage,
    }),
  });
  expect(snapshot.contentJson.body).toBe("<p>Saved body</p>");
});
it("snapshot load/save reject wrong document or store replies", async () => {
  api.getSnapshot.mockResolvedValueOnce({
    success: true,
    data: { ...snapshot, organizationId: "B" },
  });
  await expect(loadSnapshot("snapshot", "A")).rejects.toThrow();
  api.saveSnapshot.mockResolvedValueOnce({
    success: true,
    data: { ...snapshot, snapshotId: "other" },
  });
  await expect(
    saveSnapshot("snapshot", emptySnapshotDraft, snapshot),
  ).rejects.toThrow();
});
it("direct save preserves html authority, tags and unrelated metadata without mutating the original", async () => {
  const draft = { title: "New", html: "<p>New direct</p>", tags: ["Edited"] };
  await saveDirect("direct", draft, direct);
  expect(api.saveDirect.mock.calls[0][1]).toEqual({
    title: "New",
    tags: ["Edited"],
    contentJson: {
      html: "<p>New direct</p>",
      generatedBy: "manual-direct",
      custom: { keep: true },
    },
  });
  expect(direct.contentJson.blocks).toBeTruthy();
  expect(textDraftFromRecord(direct).tags).toEqual(["Tag"]);
});
it("legacy direct blocks and snapshot list blocks remain editable", () => {
  const d = textDraftFromRecord({
    ...direct,
    contentJson: {
      blocks: [
        { type: "list", items: ["one", "two"] },
        { type: "text", value: "Legacy" },
      ],
    },
  });
  expect(d.html).toContain("<li>one</li>");
  expect(d.html).toContain("<p>Legacy</p>");
  expect(
    snapshotDraftFromRecord({
      ...snapshot,
      contentJson: { blocks: [{ type: "list", items: ["legacy"] }] },
    }).html,
  ).toContain("<li>legacy</li>");
});
it("direct load and delete reject success=false or mismatched replies", async () => {
  api.getDirect.mockResolvedValueOnce({ success: false, data: direct });
  await expect(loadDirect("direct")).rejects.toThrow();
  api.remove.mockResolvedValueOnce({
    success: true,
    data: { deleted: true, id: "other" },
  });
  await expect(removeDirect(direct)).rejects.toThrow();
});
it("material loading rejects files and foreign-store content assets", async () => {
  api.getAsset.mockResolvedValueOnce({
    success: true,
    data: { ...asset, assetType: "file" },
  });
  await expect(loadMaterial("asset", "A")).rejects.toThrow();
  api.getAsset.mockResolvedValueOnce({
    success: true,
    data: { ...asset, organizationId: "B" },
  });
  await expect(loadMaterial("asset", "A")).rejects.toThrow();
});
it("material updates preserve the asset identity used by QR references", async () => {
  await saveMaterial(
    { title: " New ", html: "<p>Updated</p>", category: "blog" },
    asset,
    "A",
  );
  expect(api.saveAsset).toHaveBeenCalledWith("asset", {
    title: "New",
    htmlContent: "<p>Updated</p>",
    category: "blog",
  });
  expect(api.createAsset).not.toHaveBeenCalled();
});
it("material creation preserves generated content and source description fields", async () => {
  await saveMaterial(
    {
      title: "New",
      html: "<p>New</p>",
      category: null,
      description: "Fixture source",
    },
    null,
    "A",
  );
  expect(api.createAsset).toHaveBeenCalledWith({
    title: "New",
    htmlContent: "<p>New</p>",
    assetType: "content",
    sourceType: "generated",
    description: "Fixture source",
  });
});
it("unknown material category is left untouched rather than overwritten", async () => {
  const legacyAsset = { ...asset, category: "legacy-category" };
  const draft = materialDraftFromRecord(legacyAsset);
  expect(draft.category).toBeNull();
  await saveMaterial(draft, legacyAsset, "A");
  expect(api.saveAsset.mock.calls[0][1]).not.toHaveProperty("category");
});
it("manual creation preserves tags, empty resources and the original product reference", async () => {
  const draft = { title: " New ", html: " <p>Manual</p> ", tags: ["Tag"] };
  const created = await createOrUpdateDirect(draft, null, {
    sourceType: "local",
    sourceId: "product-A",
  });
  expect(created.id).toBe("created");
  expect(api.create).toHaveBeenCalledWith("/store-contents", {
    title: "New",
    tags: ["Tag"],
    contentJson: {
      html: "<p>Manual</p>",
      sourceResources: [],
      generatedBy: "manual-direct",
    },
    productRef: { sourceType: "local", sourceId: "product-A" },
  });
});
it("saving follow-up edits after a successful creation updates that same id instead of creating again", async () => {
  const draft = { title: "New", html: "<p>Manual</p>", tags: [] };
  const created = await createOrUpdateDirect(draft, null);
  api.saveDirect.mockResolvedValueOnce({
    success: true,
    data: { ...direct, id: "created" },
  });
  await createOrUpdateDirect({ ...draft, title: "Follow-up" }, created);
  expect(api.create).toHaveBeenCalledOnce();
  expect(api.saveDirect.mock.calls[0][0]).toBe("created");
  expect(api.saveDirect.mock.calls[0][1].contentJson.generatedBy).toBe(
    "manual-direct",
  );
});
it("malformed creation success does not claim a persisted document", async () => {
  api.create.mockResolvedValueOnce({ success: true, data: {} });
  await expect(
    createOrUpdateDirect({ title: "New", html: "<p>New</p>", tags: [] }, null),
  ).rejects.toThrow();
});
it("new drafts retain title/body validation without adding an AI prerequisite", () => {
  expect(validateNewContent({ title: "", html: "<p>Body</p>" })).toBeTruthy();
  expect(validateNewContent({ title: "Title", html: "<p></p>" })).toBeTruthy();
  expect(
    validateNewContent({ title: "Title", html: "<p>Manual</p>" }),
  ).toBeNull();
});

it('server-returned creation metadata is preserved when follow-up edits are saved', async () => {
 api.create.mockResolvedValueOnce({success:true,data:{id:'created',contentJson:{html:'<p>Saved</p>',serverMetadata:'Preserve'}}});
 const draft={title:'New',html:'<p>Manual</p>',tags:[]};const record=await createOrUpdateDirect(draft,null);
 api.saveDirect.mockResolvedValueOnce({success:true,data:{...direct,id:'created'}});
 await createOrUpdateDirect({...draft,html:'<p>Edited</p>'},record);
 expect(api.saveDirect.mock.calls[0][1].contentJson).toMatchObject({html:'<p>Edited</p>',serverMetadata:'Preserve'});
});

it("clearing an existing material category sends null to the update API", async () => {
  await saveMaterial({ title: "Fixture", html: "<p>Material</p>", category: null }, asset, "A");
  expect(api.saveAsset).toHaveBeenCalledWith("asset", expect.objectContaining({ category: null }));
});
