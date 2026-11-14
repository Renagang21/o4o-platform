import {
  isPhotoLedgerRequest,
  parseInvoiceExtraction,
  runPhotoLedgerChat,
} from "./ledger-chat.js";
import { StoreAdapter } from "../../modules/external-ai/adapters/store.adapter.js";
import { PhotoLedgerService } from "./ledger.service.js";
jest.mock("../../modules/external-ai/adapters/store.adapter.js", () => ({
  StoreAdapter: jest.fn(),
}));
jest.mock("./ledger.service.js", () => ({ PhotoLedgerService: jest.fn() }));
const workspaces = jest.fn(),
  authorize = jest.fn(),
  get = jest.fn(),
  prepare = jest.fn(),
  generate = jest.fn();
const workspace = {
    id: "store:00000000-0000-4000-8000-000000000001",
    name: "합성 매장",
  },
  id = "00000000-0000-4000-8000-000000000002";
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(StoreAdapter).mockImplementation(() => ({ workspaces }) as never);
  jest
    .mocked(PhotoLedgerService)
    .mockImplementation(() => ({ authorize, get, prepare }) as never);
  workspaces.mockResolvedValue([workspace]);
  authorize.mockResolvedValue(undefined);
});
it("recognizes invoice requests while leaving general questions alone", () => {
  expect(isPhotoLedgerRequest("거래명세서 사진을 거래장에 입력해줘")).toBe(
    true,
  );
  expect(isPhotoLedgerRequest("효능효과를 알려줘")).toBe(false);
  expect(isPhotoLedgerRequest("거래명세서 사진 내용을 확인해줘")).toBe(false);
});
it("does not spend a model call when no photo/current draft is supplied", async () => {
  expect(
    (
      await runPhotoLedgerChat(
        {} as never,
        "actor",
        "거래장에 입력",
        [],
        generate,
      )
    ).message,
  ).toContain("사진을 첨부");
  expect(generate).not.toHaveBeenCalled();
});
it("asks for store selection without picking an arbitrary store", async () => {
  workspaces.mockResolvedValue([
    workspace,
    { id: "store:" + id, name: "다른 합성 매장" },
  ]);
  await runPhotoLedgerChat({} as never, "actor", "거래장 입력", [], generate);
  expect(authorize).not.toHaveBeenCalled();
  expect(generate).not.toHaveBeenCalled();
});
it("sends the user to first-party confirmation instead of finalizing from chat", async () => {
  get.mockResolvedValue({
    id,
    state: "draft",
    openUrl: "https://neture.example.invalid/work/ledger/" + id,
  });
  const result = await runPhotoLedgerChat(
    {} as never,
    "actor",
    "거래장 " + id + " 확정해줘",
    [],
    generate,
  );
  expect(result.message).toContain("확인 화면");
  expect(generate).not.toHaveBeenCalled();
  expect(prepare).not.toHaveBeenCalled();
});
it("checks server storage permission before extraction and rejects incomplete JSON", async () => {
  authorize.mockRejectedValueOnce(new Error("consent required"));
  await expect(
    runPhotoLedgerChat({} as never, "actor", "거래장 입력", [], generate),
  ).rejects.toThrow("consent required");
  expect(generate).not.toHaveBeenCalled();
  expect(() => parseInvoiceExtraction('{"rows":[')).toThrow();
});
