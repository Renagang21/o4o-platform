import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import SupplierProposalDrafts from "../SupplierProposalDrafts";
import type { SupplierPharmacyOptions } from "../../../components/neture-pharmacy/useSupplierPharmacyOptions";
import type { SupplyProposal } from "../../../lib/api/neturePharmacy";
const mocks = vi.hoisted(() => ({ createProposal: vi.fn() }));
vi.mock("../../../lib/api/neturePharmacy", () => ({
  neturePharmacySupplierApi: mocks,
}));
const options = {
  products: [
    { id: "offer-a", name: "제품 A", approvalStatus: "APPROVED" },
    { id: "offer-b", name: "제품 B", approvalStatus: "APPROVED" },
  ],
  semiFranchises: [
    { key: "a", name: "협업체 A" },
    { key: "b", name: "협업체 B" },
  ],
  loading: false,
  error: null,
} as SupplierPharmacyOptions;
const original = {
  id: "proposal-a",
  offerId: "offer-a",
  productName: "제품 A",
  semiFranchiseName: "협업체 A",
  unitPrice: 1200,
  note: "복사 조건",
  targetOrganizationId: "outside-pharmacy",
  termsSnapshot: {
    version: 1,
    baseShippingFee: 4000,
    freeShippingThreshold: null,
    minOrderAmount: 10000,
  },
} as SupplyProposal;
function mount(proposals: SupplyProposal[] = [], storageScope?: string) {
  const onSubmitted = vi.fn().mockResolvedValue(undefined);
  render(
    <SupplierProposalDrafts
      storageScope={storageScope}
      options={options}
      requestedProduct="offer-a"
      proposals={proposals}
      onSubmitted={onSubmitted}
    />,
  );
  return onSubmitted;
}
function create() {
  fireEvent.change(screen.getByLabelText("공통 공급 가격 (원)"), {
    target: { value: "1000" },
  });
  fireEvent.change(screen.getByLabelText("공통 기본 배송비 (원)"), {
    target: { value: "3000" },
  });
  fireEvent.change(screen.getByLabelText("공통 무료배송 기준 (원, 선택)"), {
    target: { value: "50000" },
  });
  fireEvent.change(screen.getByLabelText("공통 메모 (선택)"), {
    target: { value: "공통 조건" },
  });
  fireEvent.click(screen.getByLabelText("협업체 A"));
  fireEvent.click(screen.getByLabelText("협업체 B"));
  fireEvent.click(screen.getByRole("button", { name: "협업체별 초안 만들기" }));
}
const a = () => within(screen.getByRole("group", { name: "협업체 A 초안" }));
const b = () => within(screen.getByRole("group", { name: "협업체 B 초안" }));
beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  mocks.createProposal.mockResolvedValue({ id: "new", status: "pending" });
});
afterEach(cleanup);
describe("independent business proposal drafts", () => {
  it("copies explicit selections without submitting and edits each draft independently", () => {
    mount();
    create();
    expect(mocks.createProposal).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("모든 협업체")).toBeNull();
    fireEvent.change(a().getByLabelText("공급 가격 (원)"), {
      target: { value: "900" },
    });
    fireEvent.change(a().getByLabelText("메모 (선택)"), {
      target: { value: "A 조건" },
    });
    fireEvent.change(screen.getByLabelText("공통 공급 가격 (원)"), {
      target: { value: "800" },
    });
    expect(
      (a().getByLabelText("공급 가격 (원)") as HTMLInputElement).value,
    ).toBe("900");
    expect(
      (b().getByLabelText("공급 가격 (원)") as HTMLInputElement).value,
    ).toBe("1000");
    expect((b().getByLabelText("메모 (선택)") as HTMLInputElement).value).toBe(
      "공통 조건",
    );
  });
  it("submits independent payloads only after confirmation and never resends success", async () => {
    const refreshed = mount();
    create();
    fireEvent.change(a().getByLabelText("공급 가격 (원)"), {
      target: { value: "900" },
    });
    fireEvent.change(a().getByLabelText("대상 약국 조직 ID (선택)"), {
      target: { value: "pharmacy-a" },
    });
    fireEvent.click(a().getByRole("button", { name: "협업체 A 승인 요청" }));
    await waitFor(() => expect(refreshed).toHaveBeenCalledTimes(1));
    fireEvent.click(
      screen.getByRole("button", { name: "미제출 초안 승인 요청" }),
    );
    await waitFor(() => expect(refreshed).toHaveBeenCalledTimes(2));
    expect(mocks.createProposal.mock.calls.map(([payload]) => payload)).toEqual(
      [
        {
          requestId: expect.any(String),
          offerId: "offer-a",
          semiFranchiseKey: "a",
          unitPrice: 900,
          targetOrganizationId: "pharmacy-a",
          note: "공통 조건",
          terms: {
            baseShippingFee: 3000,
            freeShippingThreshold: 50000,
            minOrderAmount: 0,
          },
        },
        {
          requestId: expect.any(String),
          offerId: "offer-a",
          semiFranchiseKey: "b",
          unitPrice: 1000,
          targetOrganizationId: undefined,
          note: "공통 조건",
          terms: {
            baseShippingFee: 3000,
            freeShippingThreshold: 50000,
            minOrderAmount: 0,
          },
        },
      ],
    );
    expect(
      (
        screen.getByRole("button", {
          name: "미제출 초안 승인 요청",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      screen.queryByRole("button", { name: "협업체 A 승인 요청" }),
    ).toBeNull();
  });
  it("preserves partial failure and only retries the failed business explicitly", async () => {
    mocks.createProposal
      .mockRejectedValueOnce(new Error("통신 오류"))
      .mockResolvedValue({ id: "new", status: "pending" });
    const refreshed = mount();
    create();
    fireEvent.click(
      screen.getByRole("button", { name: "미제출 초안 승인 요청" }),
    );
    await waitFor(() => expect(refreshed).toHaveBeenCalled());
    expect(a().getByRole("alert").textContent).toContain(
      "접수됐을 수 있습니다",
    );
    expect(
      (a().getByLabelText("공급 가격 (원)") as HTMLInputElement).value,
    ).toBe("1000");
    expect(
      a().getByLabelText("공급 가격 (원)").closest("fieldset")?.disabled,
    ).toBe(true);
    expect(a().getByRole("alert").textContent).toContain(
      "접수됐을 수 있습니다",
    );
    expect(
      (
        screen.getByRole("button", {
          name: "미제출 초안 승인 요청",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(
      a().getByRole("button", { name: "같은 요청으로 접수 확인" }),
    );
    await waitFor(() => expect(refreshed).toHaveBeenCalledTimes(2));
    expect(
      mocks.createProposal.mock.calls.map(
        ([payload]) => payload.semiFranchiseKey,
      ),
    ).toEqual(["a", "b", "a"]);
    expect(mocks.createProposal.mock.calls[2][0]).toEqual(
      mocks.createProposal.mock.calls[0][0],
    );
  });
  it("imports existing terms without copying a pharmacy target or overwriting drafts", () => {
    mount([original]);
    create();
    fireEvent.change(screen.getByLabelText("기존 제안에서 조건 가져오기"), {
      target: { value: "proposal-a" },
    });
    expect(
      (screen.getByLabelText("공통 공급 가격 (원)") as HTMLInputElement).value,
    ).toBe("1200");
    expect(
      (a().getByLabelText("공급 가격 (원)") as HTMLInputElement).value,
    ).toBe("1000");
    fireEvent.click(a().getByRole("button", { name: "초안 삭제" }));
    fireEvent.click(b().getByRole("button", { name: "초안 삭제" }));
    fireEvent.click(screen.getByLabelText("협업체 B"));
    fireEvent.click(
      screen.getByRole("button", { name: "협업체별 초안 만들기" }),
    );
    expect(
      (b().getByLabelText("공급 가격 (원)") as HTMLInputElement).value,
    ).toBe("1200");
    expect((b().getByLabelText("메모 (선택)") as HTMLInputElement).value).toBe(
      "복사 조건",
    );
    expect(
      (b().getByLabelText("기본 배송비 (원)") as HTMLInputElement).value,
    ).toBe("4000");
    expect(
      (b().getByLabelText("최소 주문금액 (원)") as HTMLInputElement).value,
    ).toBe("10000");
    expect(
      (b().getByLabelText("대상 약국 조직 ID (선택)") as HTMLInputElement)
        .value,
    ).toBe("");
  });
  it("blocks empty selections and invalid draft prices before any request", () => {
    mount();
    fireEvent.click(
      screen.getByRole("button", { name: "협업체별 초안 만들기" }),
    );
    expect(screen.queryByRole("group", { name: "협업체 A 초안" })).toBeNull();
    create();
    fireEvent.change(b().getByLabelText("공급 가격 (원)"), {
      target: { value: "0" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "미제출 초안 승인 요청" }),
    );
    expect(mocks.createProposal).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain("각 초안");
  });
  it("locks edits and duplicate submission while a request is in flight", async () => {
    let finish!: (result: unknown) => void;
    mocks.createProposal.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const refreshed = mount();
    create();
    fireEvent.click(a().getByRole("button", { name: "협업체 A 승인 요청" }));
    fireEvent.click(
      screen.getByRole("button", { name: "미제출 초안 승인 요청" }),
    );
    expect(mocks.createProposal).toHaveBeenCalledTimes(1);
    expect(
      (
        screen.getByRole("group", {
          name: "협업체 B 초안",
        }) as HTMLFieldSetElement
      ).disabled,
    ).toBe(true);
    finish({ id: "new", status: "pending" });
    await waitFor(() => expect(refreshed).toHaveBeenCalledTimes(1));
  });
  it("restores per-account/supplier tab drafts and keeps request IDs stable after a lost response", async () => {
    mocks.createProposal
      .mockRejectedValueOnce(new Error("응답 유실"))
      .mockResolvedValue({ id: "new", status: "pending" });
    mount([], "user-a:supplier-a");
    create();
    fireEvent.click(a().getByRole("button", { name: "협업체 A 승인 요청" }));
    await a().findByRole("alert");
    const first = mocks.createProposal.mock.calls[0][0];
    cleanup();
    mount([], "user-b:supplier-b");
    expect(screen.queryByRole("group", { name: "협업체 A 초안" })).toBeNull();
    cleanup();
    mount([], "user-a:supplier-a");
    expect(
      (a().getByLabelText("공급 가격 (원)") as HTMLInputElement).value,
    ).toBe("1000");
    fireEvent.click(
      a().getByRole("button", { name: "같은 요청으로 접수 확인" }),
    );
    await waitFor(() => expect(mocks.createProposal).toHaveBeenCalledTimes(2));
    expect(mocks.createProposal.mock.calls[1][0]).toEqual(first);
  });
  it("offers a deliberately new request only after checking ambiguous receipt", async () => {
    mocks.createProposal
      .mockRejectedValueOnce(new Error("응답 유실"))
      .mockResolvedValue({ id: "new", status: "pending" });
    mount();
    create();
    fireEvent.click(a().getByRole("button", { name: "협업체 A 승인 요청" }));
    await a().findByRole("alert");
    const first = mocks.createProposal.mock.calls[0][0];
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(
      a().getByRole("button", { name: "접수 목록 확인 후 새 초안으로 변경" }),
    );
    expect(confirm).toHaveBeenCalled();
    confirm.mockRestore();
    fireEvent.change(a().getByLabelText("공급 가격 (원)"), {
      target: { value: "950" },
    });
    fireEvent.click(a().getByRole("button", { name: "협업체 A 승인 요청" }));
    await waitFor(() => expect(mocks.createProposal).toHaveBeenCalledTimes(2));
    expect(mocks.createProposal.mock.calls[1][0].requestId).not.toBe(
      first.requestId,
    );
    expect(mocks.createProposal.mock.calls[1][0].unitPrice).toBe(950);
  });
  it("selects a target by name from owned proposal history without copying it to other drafts", () => {
    mount([{ ...original, targetOrganizationName: "검증 약국 A" }]);
    create();
    fireEvent.change(screen.getByLabelText("기존 제안 대상 약국 이름 검색"), {
      target: { value: "약국 A" },
    });
    fireEvent.change(a().getByLabelText("기존 대상 약국 선택"), {
      target: { value: "outside-pharmacy" },
    });
    expect(
      (a().getByLabelText("대상 약국 조직 ID (선택)") as HTMLInputElement)
        .value,
    ).toBe("outside-pharmacy");
    expect(
      (b().getByLabelText("대상 약국 조직 ID (선택)") as HTMLInputElement)
        .value,
    ).toBe("");
  });
  it("does not resend a successful request when refreshing the list fails", async () => {
    const onSubmitted = vi.fn().mockRejectedValue(new Error("목록 조회 실패"));
    render(
      <SupplierProposalDrafts
        options={options}
        requestedProduct="offer-a"
        proposals={[]}
        onSubmitted={onSubmitted}
      />,
    );
    create();
    fireEvent.click(a().getByRole("button", { name: "협업체 A 승인 요청" }));
    await screen.findByText(/접수 처리는 끝났지만/);
    expect(
      a().queryByRole("button", { name: "협업체 A 승인 요청" }),
    ).toBeNull();
    expect(mocks.createProposal).toHaveBeenCalledTimes(1);
  });
  it('clears the tab copy explicitly even when a receipt is unresolved, without ending any proposal',async()=>{
    mocks.createProposal.mockRejectedValueOnce(new Error('응답 유실'));
    mount([], 'user-a:supplier-a');create();
    fireEvent.click(a().getByRole('button',{name:'협업체 A 승인 요청'}));
    await a().findByRole('alert');
    const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button',{name:'작성 초안 모두 지우기'}));
    expect(screen.getByRole('group',{name:'협업체 A 초안'})).toBeTruthy();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button',{name:'작성 초안 모두 지우기'}));
    expect(screen.queryByRole('group',{name:'협업체 A 초안'})).toBeNull();
    expect(sessionStorage.getItem('neture:supply-proposals:v1:user-a:supplier-a')).toBeNull();
    expect(mocks.createProposal).toHaveBeenCalledTimes(1);confirm.mockRestore();
  });

});
