import { ExternalAiToolService } from "../tools/tool.service.js";
import {
  ExternalAiError,
  defaultSettings,
  type ToolName,
} from "../contracts.js";
import { assertEnabled } from "../settings/settings.service.js";
import { loadConnection } from "../auth/oauth-provider.js";

// Exercise the real dispatcher/transaction/idempotency logic. Domain adapter
// bodies are deliberately outside this unit test; they require separate checks.
jest.mock("../adapters/registry.js", () => ({
  AdapterRegistry: class {
    workspaces = jest.fn();
    authorize = jest.fn();
    resolve = jest.fn();
  },
}));
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
jest.mock("../../personal-mail/tool.service.js", () => ({
  PersonalMailToolService: class {
    execute() {
      throw new Error("Content must not dispatch to mail");
    }
  },
}));

const uuid = "00000000-0000-4000-8000-000000000001";
const workspaceId = `store:${uuid}`;
const connectionId = "verified-connection";
const result = { id: uuid, revision: "r1", editable: true };
const draft = {
  workspaceId,
  destination: "store_document",
  title: "Fixture",
  content: "<p>Supplied draft</p>",
  requestId: uuid,
};
const productDraft = {
  workspaceId,
  productId: uuid,
  productSource: "listing",
  title: "Fixture",
  content: "<p>Supplied draft</p>",
  requestId: uuid,
};
const cases: Array<[ToolName, Record<string, unknown>, string]> = [
  ["search_products", { workspaceId }, "products"],
  ["get_product_context", { workspaceId, productId: uuid }, "productContext"],
  ["list_materials", { workspaceId }, "materials"],
  ["get_material", { workspaceId, materialId: uuid }, "material"],
  [
    "get_content_draft",
    { workspaceId, destination: "store_document", contentId: uuid },
    "content",
  ],
  ["get_product_content", { workspaceId, contentId: uuid }, "content"],
  ["save_content_draft", draft, "save"],
  [
    "update_content_draft",
    { ...draft, contentId: uuid, expectedRevision: "r1" },
    "save",
  ],
  ["save_product_content_draft", productDraft, "save"],
  [
    "update_product_content_draft",
    {
      workspaceId,
      contentId: uuid,
      title: "Fixture",
      content: "<p>Updated</p>",
      requestId: uuid,
      expectedRevision: "r1",
    },
    "save",
  ],
];

describe("ChatGPT content dispatch stays inside authorized read/save operations", () => {
  let service: ExternalAiToolService;
  let adapter: Record<string, jest.Mock>;
  let query: jest.Mock;
  let existing: unknown[];
  let connection: { userId: string; scopes: string[]; workspaces: string[] };
  let network: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    existing = [];
    connection = {
      userId: "user-fixture",
      scopes: ["o4o:read", "o4o:draft:write"],
      workspaces: [workspaceId],
    };
    jest
      .mocked(loadConnection)
      .mockImplementation(async () => connection as never);
    jest.mocked(assertEnabled).mockResolvedValue({
      ...defaultSettings,
      enabled: true,
      chatgptEnabled: true,
    } as never);
    query = jest.fn(async (sql: string) => {
      if (sql.includes("SELECT fingerprint,result")) return existing;
      if (sql.includes("count(*)::int")) return [{ total: 0, connection: 0 }];
      if (sql.includes("pg_try_advisory")) return [{ acquired: true }];
      return [];
    });
    const db = {
      query,
      transaction: async (run: (db: unknown) => unknown) => run({ query }),
    };
    service = new ExternalAiToolService(
      db as never,
      new URL("https://example.invalid"),
    );
    adapter = Object.fromEntries(
      [
        "products",
        "productContext",
        "materials",
        "material",
        "content",
        "save",
      ].map((k) => [k, jest.fn(async () => result)]),
    );
    jest
      .mocked(service.registry.authorize)
      .mockResolvedValue({ adapter, id: uuid, kind: "store" } as never);
    jest
      .mocked(service.registry.workspaces)
      .mockResolvedValue([
        { id: workspaceId, kind: "store", writable: true },
      ] as never);
    network = jest.spyOn(globalThis, "fetch").mockImplementation(async () => {
      throw new Error("Unexpected network generation/fallback");
    });
  });
  afterEach(() => {
    expect(network).not.toHaveBeenCalled();
    network.mockRestore();
  });

  it.each(cases)(
    "%s invokes only its authorized adapter operation",
    async (name, input, method) => {
      expect(await service.execute(name, input, connectionId)).toEqual(result);
      expect(loadConnection).toHaveBeenCalledWith(
        expect.anything(),
        connectionId,
        true,
      );
      expect(adapter[method]).toHaveBeenCalledTimes(1);
      for (const [key, fn] of Object.entries(adapter))
        if (key !== method) expect(fn).not.toHaveBeenCalled();
    },
  );
  it("lists only the connected workspaces", async () => {
    jest.mocked(service.registry.workspaces).mockResolvedValue([
      { id: workspaceId, kind: "store", writable: true },
      { id: "store:other", kind: "store", writable: true },
    ] as never);
    const response = (await service.execute(
      "list_workspaces",
      {},
      connectionId,
    )) as { workspaces: unknown[] };
    expect(response.workspaces).toHaveLength(1);
    expect(service.registry.authorize).not.toHaveBeenCalled();
  });
  it("rejects ungranted workspaces before reaching an adapter", async () => {
    connection.workspaces = [];
    await expect(
      service.execute(
        "get_product_context",
        { workspaceId, productId: uuid },
        connectionId,
      ),
    ).rejects.toMatchObject({ code: "WORKSPACE_FORBIDDEN" });
    expect(service.registry.authorize).not.toHaveBeenCalled();
  });
  it("rejects writes when the connection has only read permission", async () => {
    connection.scopes = ["o4o:read"];
    await expect(
      service.execute("save_content_draft", draft, connectionId),
    ).rejects.toMatchObject({ code: "SCOPE_FORBIDDEN" });
    expect(adapter.save).not.toHaveBeenCalled();
  });
  it.each(["origin", "connectionId", "userId", "provider", "model", "apiKey"])(
    "rejects client-supplied %s as authority or billing routing",
    async (field) => {
      await expect(
        service.execute(
          "save_content_draft",
          { ...draft, [field]: "injected" },
          connectionId,
        ),
      ).rejects.toMatchObject({ code: "INVALID_TOOL_INPUT" });
      expect(adapter.save).not.toHaveBeenCalled();
    },
  );
  it("replays the current stored result without saving or generating again", async () => {
    await service.execute("save_content_draft", draft, connectionId);
    const insert = query.mock.calls.find(([sql]) =>
      sql.includes("INSERT INTO external_ai_requests"),
    );
    const fingerprint = (insert![1] as unknown[])[2];
    existing = [{ fingerprint, result: { id: uuid } }];
    expect(
      await service.execute("save_content_draft", draft, connectionId),
    ).toEqual(result);
    expect(adapter.content).toHaveBeenCalledTimes(1);
    expect(adapter.save).toHaveBeenCalledTimes(1);
  });
  it("refuses changed content under a reused request id", async () => {
    existing = [{ fingerprint: "different", result: { id: uuid } }];
    await expect(
      service.execute("save_content_draft", draft, connectionId),
    ).rejects.toMatchObject({ code: "REQUEST_ID_REUSED" });
    expect(adapter.save).not.toHaveBeenCalled();
  });
  it("returns a domain failure without a second adapter call or generation fallback", async () => {
    adapter.save.mockRejectedValue(
      new ExternalAiError("CONTENT_CONFLICT", 409),
    );
    await expect(
      service.execute("save_content_draft", draft, connectionId),
    ).rejects.toMatchObject({ code: "CONTENT_CONFLICT" });
    expect(adapter.save).toHaveBeenCalledTimes(1);
    expect(adapter.content).not.toHaveBeenCalled();
  });
  it("stops on revoked delegation without accessing content", async () => {
    jest
      .mocked(loadConnection)
      .mockRejectedValue(new ExternalAiError("CONNECTION_REVOKED", 401));
    await expect(
      service.execute("save_content_draft", draft, connectionId),
    ).rejects.toMatchObject({ code: "CONNECTION_REVOKED" });
    expect(service.registry.authorize).not.toHaveBeenCalled();
  });
});
