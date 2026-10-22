import {
  defaultSettings,
  saveInput,
  updateInput,
  searchInput,
  settingsSchema,
  workspaceIdSchema,
} from "../contracts.js";
import {
  readSettings,
  assertEnabled,
  changeSettings,
} from "../settings/settings.service.js";

const id = "6a1d6827-55a5-4f17-9f5f-a1546729aafe";
describe("external AI authority and persistence inputs", () => {
  it("never enables delegation without a stored setting", async () => {
    const db = { query: jest.fn().mockResolvedValue([]) };
    expect((await readSettings(db as never)).settings.enabled).toBe(false);
    await expect(assertEnabled(db as never)).rejects.toMatchObject({
      code: "EXTERNAL_AI_DISABLED",
    });
  });
  it("rejects user/owner/publication fields from an external writer", () => {
    const draft = {
      workspaceId: id,
      destination: "library_document",
      title: "Fixture",
      content: "content",
      requestId: id,
    };
    for (const field of [
      "userId",
      "supplierId",
      "isPublic",
      "submit",
      "status",
    ]) {
      expect(
        saveInput.safeParse({
          ...draft,
          [field]: field === "isPublic" ? true : id,
        }).success,
      ).toBe(false);
    }
  });
  it("requires an optimistic revision for updates", () => {
    expect(
      updateInput.safeParse({
        workspaceId: id,
        destination: "library_document",
        contentId: id,
        content: "replacement",
        requestId: id,
      }).success,
    ).toBe(false);
  });
  it("bounds searches and content rather than allowing unbounded extraction", () => {
    expect(searchInput.safeParse({ workspaceId: id, limit: 51 }).success).toBe(
      false,
    );
    expect(searchInput.safeParse({ workspaceId: id, page: -1 }).success).toBe(
      false,
    );
    expect(
      saveInput.safeParse({
        workspaceId: id,
        destination: "library_document",
        content: "a".repeat(200001),
        requestId: id,
      }).success,
    ).toBe(false);
  });
  it("does not accept model, provider key, token or billing settings", () => {
    for (const field of ["model", "apiKey", "tokenLimit", "billing"])
      expect(
        settingsSchema.safeParse({ ...defaultSettings, [field]: "fixture" })
          .success,
      ).toBe(false);
  });
  it("namespaces non-supplier spaces and rejects authority hidden in identifiers", () => {
    for (const kind of ["store", "organization", "community"])
      expect(workspaceIdSchema.safeParse(`${kind}:${id}`).success).toBe(true);
    expect(workspaceIdSchema.safeParse(id).success).toBe(true);
    for (const value of [
      "platform:super_admin",
      `supplier:${id}`,
      "community:any",
      `${id}:store`,
    ])
      expect(workspaceIdSchema.safeParse(value).success).toBe(false);
  });
  it("does not enable writing without reading", async () => {
    for (const kind of [
      "supplier",
      "store",
      "organization",
      "community",
    ] as const) {
      const settings = structuredClone(defaultSettings);
      settings.targets[kind].write = true;
      await expect(
        changeSettings({} as never, 0, settings),
      ).rejects.toMatchObject({ code: "READ_REQUIRED_FOR_WRITE" });
    }
  });
  it("requires the write setting again for a delegated write", async () => {
    const settings = structuredClone(defaultSettings);
    settings.enabled = true;
    settings.chatgptEnabled = true;
    settings.targets.supplier.read = true;
    const db = {
      query: jest.fn().mockResolvedValue([{ revision: 1, settings }]),
    };
    await expect(assertEnabled(db as never, false)).resolves.toMatchObject({
      enabled: true,
    });
    await expect(assertEnabled(db as never, true)).rejects.toMatchObject({
      code: "EXTERNAL_AI_DISABLED",
    });
  });
});
