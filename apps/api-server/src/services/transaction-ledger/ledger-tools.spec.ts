import { executeLedgerTool } from "./ledger-tools.js";
import { PhotoLedgerService } from "./ledger.service.js";
import { loadConnection } from "../../modules/external-ai/auth/oauth-provider.js";
import { assertEnabled } from "../../modules/external-ai/settings/settings.service.js";
jest.mock("./ledger.service.js", () => ({ PhotoLedgerService: jest.fn() }));
jest.mock("../../modules/external-ai/auth/oauth-provider.js", () => ({
  loadConnection: jest.fn(),
}));
jest.mock("../../modules/external-ai/settings/settings.service.js", () => ({
  assertEnabled: jest.fn(),
}));
const workspaceId = "store:00000000-0000-4000-8000-000000000001",
  invoiceId = "00000000-0000-4000-8000-000000000002";
const db = {
  transaction: async (run: (manager: unknown) => Promise<unknown>) =>
    run({
      query: jest.fn(),
      transaction: async (fn: (manager: unknown) => Promise<unknown>) => fn({}),
    }),
};
const get = jest.fn(),
  list = jest.fn(),
  prepare = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(PhotoLedgerService)
    .mockImplementation(() => ({ get, list, prepare }) as never);
  jest.mocked(assertEnabled).mockResolvedValue({
    targets: { store: { read: true, write: true } },
  } as never);
  jest.mocked(loadConnection).mockResolvedValue({
    userId: "actor",
    scopes: ["o4o:read", "o4o:ledger:read", "o4o:ledger:write"],
    workspaces: [workspaceId],
  } as never);
});
it("uses the authenticated actor and exact granted store without invoking AI", async () => {
  get.mockResolvedValue({ id: invoiceId, state: "draft" });
  expect(
    await executeLedgerTool(
      db as never,
      "get_transaction_invoice",
      { workspaceId, invoiceId },
      "connection",
      new URL("https://neture.example.invalid"),
    ),
  ).toEqual({ id: invoiceId, state: "draft" });
  expect(get).toHaveBeenCalledWith("actor", workspaceId.slice(6), invoiceId);
});
it("does not treat content read/draft grants as ledger grants", async () => {
  jest.mocked(loadConnection).mockResolvedValue({
    userId: "actor",
    scopes: ["o4o:read", "o4o:draft:write"],
    workspaces: [workspaceId],
  } as never);
  await expect(
    executeLedgerTool(
      db as never,
      "get_transaction_invoice",
      { workspaceId, invoiceId },
      "connection",
      new URL("https://neture.example.invalid"),
    ),
  ).rejects.toMatchObject({ code: "LEDGER_SCOPE_FORBIDDEN" });
  expect(get).not.toHaveBeenCalled();
});
it("denies another store before service access", async () => {
  await expect(
    executeLedgerTool(
      db as never,
      "get_transaction_invoice",
      { workspaceId: "store:" + invoiceId, invoiceId },
      "connection",
      new URL("https://neture.example.invalid"),
    ),
  ).rejects.toMatchObject({ code: "LEDGER_WORKSPACE_FORBIDDEN" });
  expect(get).not.toHaveBeenCalled();
});
it("denies unsupported owner/actor fields and has no final-confirmation MCP tool", async () => {
  await expect(
    executeLedgerTool(
      db as never,
      "get_transaction_invoice",
      { workspaceId, invoiceId, actorId: "forged" },
      "connection",
      new URL("https://neture.example.invalid"),
    ),
  ).rejects.toMatchObject({ code: "LEDGER_INPUT_INVALID" });
  const { ledgerToolSchemas } = await import("./contracts.js");
  expect(Object.keys(ledgerToolSchemas)).not.toContain(
    "confirm_transaction_invoice",
  );
});
