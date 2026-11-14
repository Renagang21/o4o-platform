import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TransactionLedgerPage from "./TransactionLedgerPage";
import { useAuth } from "../contexts";
import * as ledger from "../api/transactionLedger";
vi.mock("../contexts", () => ({ useAuth: vi.fn() }));
vi.mock("../contexts/LoginModalContext", () => ({
  useLoginModal: () => ({ openLoginModal: vi.fn() }),
}));
vi.mock("../api/transactionLedger", () => ({
  ledgerGet: vi.fn(),
  ledgerList: vi.fn(),
  ledgerWorkspaces: vi.fn(),
  ledgerEnableServer: vi.fn(),
  ledgerSave: vi.fn(),
  ledgerConfirm: vi.fn(),
  ledgerImage: vi.fn(),
}));
const organizationId = "00000000-0000-4000-8000-000000000001",
  id = "00000000-0000-4000-8000-000000000002";
function fixture(): ledger.LedgerInvoice {
  return {
    id,
    organization_id: organizationId,
    state: "draft",
    version: 1,
    revision: "a".repeat(64),
    sources: [],
    issues: [],
    warnings: [],
    lineTotal: "3600",
    knownLineSubtotal: "3600",
    openUrl: "/work/ledger/" + id,
    invoice: {
      documentType: "purchase",
      sellerName: "합성 거래처",
      sellerBusinessNumber: null,
      buyerBusinessNumber: null,
      documentNumber: null,
      issuedOn: "2026-11-14",
      currency: "KRW",
      taxTreatment: "unknown",
      statedLineTotal: "3600",
      unresolved: [],
      rows: [
        {
          id: "r1",
          rawText: "합성 품목 3갑 3600원",
          productName: "합성 품목",
          supplierProductCode: "000123",
          barcode: null,
          manufacturer: null,
          packageText: null,
          quantity: "3",
          unit: "갑",
          unitPrice: "1200",
          amount: "3600",
          lotNumber: null,
          expiresOn: null,
          amountAdjustment: "0",
          adjustmentReason: null,
        },
      ],
    },
  };
}
function mount() {
  return render(
    <MemoryRouter
      initialEntries={[`/work/ledger/${id}?organizationId=${organizationId}`]}
    >
      <Routes>
        <Route path="/work/ledger/:id" element={<TransactionLedgerPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    user: { id: "synthetic-user" },
  } as ReturnType<typeof useAuth>);
  vi.mocked(ledger.ledgerWorkspaces).mockResolvedValue({
    items: [{ id: "store:" + organizationId, name: "합성 매장" }],
  });
  vi.mocked(ledger.ledgerGet).mockResolvedValue(fixture());
});
afterEach(cleanup);
it("requires review and truthful missing-photo acknowledgement before confirmation", async () => {
  vi.mocked(ledger.ledgerConfirm).mockResolvedValue({
    ...fixture(),
    state: "confirmed",
  });
  mount();
  await screen.findByDisplayValue("합성 거래처");
  const button = screen.getByRole("button", {
    name: "거래장에 반영",
  }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.click(
    screen.getByLabelText("수량·단위·금액과 원본을 확인했습니다."),
  );
  expect(button.disabled).toBe(true);
  fireEvent.click(
    screen.getByLabelText("원본 사진이 O4O에 보관되지 않는 점을 확인했습니다."),
  );
  fireEvent.click(button);
  await screen.findByText(
    "거래장에 반영했습니다. 상품 정보는 관리자 정기 검토 대상으로 전달했습니다.",
  );
  expect(ledger.ledgerConfirm).toHaveBeenCalledWith(
    expect.objectContaining({ id }),
    expect.any(String),
    true,
    undefined,
    undefined,
    "unknown",
  );
});
it("blocks confirmation of unsaved changes and saves the corrected value first", async () => {
  vi.mocked(ledger.ledgerSave).mockResolvedValue({ ...fixture(), version: 2 });
  mount();
  await screen.findByDisplayValue("합성 거래처");
  fireEvent.change(screen.getByLabelText("수량"), { target: { value: "4" } });
  expect(
    (screen.getByRole("button", { name: "거래장에 반영" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "수정 저장" }));
  await waitFor(() =>
    expect(ledger.ledgerSave).toHaveBeenCalledWith(
      expect.objectContaining({ id }),
      expect.objectContaining({
        rows: [expect.objectContaining({ quantity: "4" })],
      }),
      [],
    ),
  );
  expect(ledger.ledgerConfirm).not.toHaveBeenCalled();
});
it("keeps a failed correction in the editor for recovery", async () => {
  vi.mocked(ledger.ledgerSave).mockRejectedValue(new Error("LEDGER_CONFLICT"));
  mount();
  await screen.findByDisplayValue("합성 거래처");
  fireEvent.change(screen.getByLabelText("상품명"), {
    target: { value: "정정한 합성 품목" },
  });
  fireEvent.click(screen.getByRole("button", { name: "수정 저장" }));
  await screen.findByText(/다른 곳에서 내용이 바뀌었습니다/);
  expect(screen.getByDisplayValue("정정한 합성 품목")).toBeTruthy();
});
it("does not render or fetch ledger data for a logged-out user", () => {
  vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as ReturnType<
    typeof useAuth
  >);
  mount();
  expect(screen.getByRole("button", { name: "O4O 로그인" })).toBeTruthy();
  expect(ledger.ledgerGet).not.toHaveBeenCalled();
});
it("keeps unresolved financial issues from being confirmed", async () => {
  vi.mocked(ledger.ledgerGet).mockResolvedValue({
    ...fixture(),
    issues: [{ path: "rows.r1.amount", code: "LINE_AMOUNT_MISMATCH" }],
  });
  mount();
  await screen.findByDisplayValue("합성 거래처");
  expect(screen.getByText("금액: 금액이 일치하지 않음")).toBeTruthy();
  fireEvent.click(
    screen.getByLabelText("수량·단위·금액과 원본을 확인했습니다."),
  );
  fireEvent.click(
    screen.getByLabelText("원본 사진이 O4O에 보관되지 않는 점을 확인했습니다."),
  );
  expect(
    (screen.getByRole("button", { name: "거래장에 반영" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
});
