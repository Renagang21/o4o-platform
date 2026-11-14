import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { StoreAdapter } from "../adapters/store.adapter.js";
import { ExternalAiToolService } from "../tools/tool.service.js";
import { defaultSettings } from "../contracts.js";
import { assertEnabled } from "../settings/settings.service.js";
import { loadConnection } from "../auth/oauth-provider.js";

jest.mock("../settings/settings.service.js", () => ({
  assertEnabled: jest.fn(),
}));
jest.mock("../auth/oauth-provider.js", () => ({
  loadConnection: jest.fn(),
  tokenHash: (value: string) =>
    jest
      .requireActual("node:crypto")
      .createHash("sha256")
      .update(value)
      .digest("hex"),
}));
jest.mock("../adapters/community.adapter.js", () => ({
  CommunityAdapter: class {},
}));
jest.mock("../../personal-mail/tool.service.js", () => ({
  PersonalMailToolService: class {},
}));

const store = "00000000-0000-4000-8000-000000000001";
const document = "00000000-0000-4000-8000-000000000002";
const requestId = "00000000-0000-4000-8000-000000000003";
const html = readFileSync(
  resolve(__dirname, "fixtures/chatgpt-invoice-trial/reviewed-draft.html"),
  "utf8",
);

/** Actual dispatcher + store adapter + library validation, isolated repository double.
 * No production database, provider or OCR. Authorization resolvers have their own suites.
 */
function fixture() {
  let saved: Record<string, unknown> | undefined;
  const journal = new Map<
    string,
    { fingerprint: string; result: { id: string } }
  >();
  const repo = {
    create: jest.fn((value: Record<string, unknown>) => value),
    save: jest.fn(async (value: Record<string, unknown>) => {
      saved = { ...value, id: document };
      return saved;
    }),
  };
  const query = jest.fn(async (sql: string, args: unknown[]) => {
    if (sql.includes("pg_advisory_xact_lock")) return [];
    if (sql.includes("SELECT fingerprint,result")) {
      const row = journal.get(String(args[1]));
      return row ? [row] : [];
    }
    if (sql.includes("count(*)::int AS total"))
      return [{ total: journal.size, connection: journal.size }];
    if (sql.includes("INSERT INTO external_ai_requests")) {
      journal.set(String(args[1]), {
        fingerprint: String(args[2]),
        result: args[3] as { id: string },
      });
      return [];
    }
    if (sql.includes("FROM store_execution_assets"))
      return saved
        ? [
            {
              id: document,
              title: saved.title,
              content: saved.htmlContent,
              source: saved.sourceType,
              type: saved.assetType,
              usage: null,
              active: saved.isActive,
              updatedAt: "2026-11-14T00:00:00Z",
            },
          ]
        : [];
    if (sql.includes("FROM store_qr_codes")) return [];
    throw new Error("Unexpected persistence path");
  });
  const manager = {
    query,
    getRepository: jest.fn(() => repo),
    transaction: async <T>(run: (db: unknown) => Promise<T>): Promise<T> =>
      run(manager),
  };
  const db = {
    ...manager,
    isInitialized: false,
    transaction: async <T>(run: (db: typeof manager) => Promise<T>) =>
      run(manager),
  };
  const adapter = new StoreAdapter(db as never);
  const service = new ExternalAiToolService(
    db as never,
    new URL("https://neture.example.invalid"),
  );
  jest
    .spyOn(service.registry, "authorize")
    .mockResolvedValue({ adapter, id: store, kind: "store" } as never);
  const connection = {
    userId: "actor",
    scopes: ["o4o:read", "o4o:draft:write"],
    workspaces: [`store:${store}`],
  };
  jest.mocked(loadConnection).mockResolvedValue(connection as never);
  jest
    .mocked(assertEnabled)
    .mockResolvedValue({
      ...defaultSettings,
      enabled: true,
      chatgptEnabled: true,
      targets: {
        ...defaultSettings.targets,
        store: { read: true, write: true },
      },
    });
  return { service, repo, query, connection };
}
beforeEach(() => jest.clearAllMocks());
const input = {
  workspaceId: `store:${store}`,
  destination: "store_document",
  title: "합성 거래명세서 확인 초안",
  content: html,
  requestId,
};
it("stores and reads the reviewed table as a private document, preserving amounts and uncertainty", async () => {
  const f = fixture();
  const result = (await f.service.execute(
    "save_content_draft",
    input,
    "verified-connection",
  )) as { id: string; revision: string; openUrl: string };
  const read = (await f.service.execute(
    "get_content_draft",
    {
      workspaceId: input.workspaceId,
      destination: input.destination,
      contentId: result.id,
    },
    "verified-connection",
  )) as { content: string; status: string; revision: string };
  expect(read.content).toContain("<table>");
  for (const value of [
    "11400",
    "2800",
    "부가세 포함 여부: 확인 필요",
    "실제 사용자 승인을 받은 자료가 아님",
  ])
    expect(read.content).toContain(value);
  expect(read.status).toBe("private_material");
  expect(read.revision).toBe(result.revision);
  expect(result.openUrl).toContain("/external-ai/drafts/");
  expect(f.repo.save).toHaveBeenCalledTimes(1);
  expect(f.repo.create).toHaveBeenCalledWith(
    expect.objectContaining({
      organizationId: store,
      assetType: "content",
      sourceType: "generated",
      isActive: true,
    }),
  );
  expect(
    f.query.mock.calls.every(
      ([sql]) =>
        !/(assistant_work_data_records|store_cart_items|checkout_orders)/.test(
          sql,
        ),
    ),
  ).toBe(true);
});
it("retries the same save without creating another document", async () => {
  const f = fixture();
  const first = await f.service.execute(
    "save_content_draft",
    input,
    "verified-connection",
  );
  expect(
    await f.service.execute("save_content_draft", input, "verified-connection"),
  ).toEqual(first);
  expect(f.repo.save).toHaveBeenCalledTimes(1);
});
it("rejects attachment input instead of treating this persistence tool as an image reader", async () => {
  const f = fixture();
  await expect(
    f.service.execute(
      "save_content_draft",
      { ...input, attachment: "image/png" },
      "verified-connection",
    ),
  ).rejects.toMatchObject({ code: "INVALID_TOOL_INPUT" });
  expect(f.repo.save).not.toHaveBeenCalled();
});
it("does not save a confirmed document without the existing draft-write permission", async () => {
  const f = fixture();
  f.connection.scopes = ["o4o:read"];
  await expect(
    f.service.execute("save_content_draft", input, "verified-connection"),
  ).rejects.toMatchObject({ code: "SCOPE_FORBIDDEN" });
  expect(f.repo.save).not.toHaveBeenCalled();
});
