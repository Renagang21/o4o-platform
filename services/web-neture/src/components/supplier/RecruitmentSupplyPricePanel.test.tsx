import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import RecruitmentSupplyPricePanel from "./RecruitmentSupplyPricePanel";
import RecruitmentCreateModal from "./RecruitmentCreateModal";
const api = vi.hoisted(() => ({
  confirmSupplyPrice: vi.fn(),
  create: vi.fn(),
}));
vi.mock("../../lib/api/supplier", () => ({ supplierRecruitmentApi: api }));
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());
const row = {
  id: "rec-a",
  productName: "Fixture",
  serviceId: "neture",
  recruitmentKind: "public" as const,
  status: "recruiting",
  supplyUnitPrice: null,
} as any;
describe("supplier recruitment explicit price", () => {
  it("preserves input after an uncertain response and retries the exact price", async () => {
    api.confirmSupplyPrice
      .mockResolvedValueOnce({ success: false, message: "결과 확인 필요" })
      .mockResolvedValueOnce({
        success: true,
        data: { id: "rec-a", supplyUnitPrice: 3200, idempotent: true },
      });
    const saved = vi.fn();
    render(
      <RecruitmentSupplyPricePanel recruitment={row} onConfirmed={saved} />,
    );
    fireEvent.change(screen.getByLabelText("확정할 공급가 (원)"), {
      target: { value: "3200" },
    });
    fireEvent.click(screen.getByText("공급가 확정"));
    await screen.findByText("결과 확인 필요");
    expect(
      (screen.getByLabelText("확정할 공급가 (원)") as HTMLInputElement).value,
    ).toBe("3200");
    fireEvent.click(screen.getByText("공급가 확정"));
    await waitFor(() => expect(saved).toHaveBeenCalledWith(3200));
    expect(api.confirmSupplyPrice.mock.calls).toEqual([
      ["rec-a", 3200],
      ["rec-a", 3200],
    ]);
  });
  it("keeps a conflicting price visible and does not report a save", async () => {
    api.confirmSupplyPrice.mockResolvedValue({
      success: false,
      error: "SUPPLY_PRICE_ALREADY_CONFIRMED",
      message: "최신 모집 정보를 확인해 주세요.",
    });
    const saved = vi.fn();
    const reload=vi.fn();
    render(
      <RecruitmentSupplyPricePanel recruitment={row} onConfirmed={saved} onReload={reload} />,
    );
    fireEvent.change(screen.getByLabelText("확정할 공급가 (원)"), {
      target: { value: "2500" },
    });
    fireEvent.click(screen.getByText("공급가 확정"));
    await screen.findByText("최신 모집 정보를 확인해 주세요.");
    expect(saved).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("최신 모집 정보 확인"));expect(reload).toHaveBeenCalledTimes(1);
  });
  it.each([
    { ...row, supplyUnitPrice: 4000 },
    { ...row, status: "closed" },
    { ...row, serviceId: "kpa-society" },
    { ...row, recruitmentKind: "semi-franchise" },
  ])("does not offer an unsafe confirmation for %j", (r) => {
    render(
      <RecruitmentSupplyPricePanel recruitment={r} onConfirmed={vi.fn()} />,
    );
    expect(screen.queryByText("공급가 확정")).toBeNull();
  });
  it("discards a late save after changing the selected recruitment", async () => {
    let resolve!: (v: any) => void;
    api.confirmSupplyPrice.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const saved = vi.fn();
    const view = render(
      <RecruitmentSupplyPricePanel
        key="rec-a"
        recruitment={row}
        onConfirmed={saved}
      />,
    );
    fireEvent.change(screen.getByLabelText("확정할 공급가 (원)"), {
      target: { value: "3000" },
    });
    fireEvent.click(screen.getByText("공급가 확정"));
    view.rerender(
      <RecruitmentSupplyPricePanel
        key="rec-b"
        recruitment={{ ...row, id: "rec-b" }}
        onConfirmed={saved}
      />,
    );
    resolve({ success: true, data: { id: "rec-a", supplyUnitPrice: 3000 } });
    await waitFor(() =>
      expect(screen.getByLabelText("확정할 공급가 (원)")).toBeTruthy(),
    );
    expect(saved).not.toHaveBeenCalled();
  });
  it("requires a bounded integer and preserves the form on creation failure", async () => {
    api.create.mockResolvedValue({ success: false, message: "접수 확인 필요" });
    render(
      <RecruitmentCreateModal
        product={{
          masterId: "master",
          name: "Fixture",
          distributionType: "PRIVATE",
          regulatoryType: "DRUG",
        }}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText("Neture"));
    fireEvent.click(screen.getByText("모집 생성"));
    await screen.findByText(/공급가는 1~/);
    expect(api.create).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("모집 공급가 (원)"), {
      target: { value: "1200.5" },
    });
    fireEvent.click(screen.getByText("모집 생성"));
    expect(api.create).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("모집 공급가 (원)"), {
      target: { value: "1200" },
    });
    fireEvent.click(screen.getByText("모집 생성"));
    await screen.findByText("접수 확인 필요");
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceKeys: ["neture"],
        supplyUnitPrice: 1200,
      }),
    );
    expect(
      (screen.getByLabelText("모집 공급가 (원)") as HTMLInputElement).value,
    ).toBe("1200");
  });
  it('blocks duplicate creation and close while pending, and ignores completion after leaving',async()=>{
    let resolve!:(v:any)=>void;api.create.mockReturnValue(new Promise(r=>{resolve=r;}));const close=vi.fn(),created=vi.fn();
    const view=render(<RecruitmentCreateModal product={{masterId:'fixture',name:'Fixture',distributionType:'PRIVATE'}} onClose={close} onCreated={created}/>);
    fireEvent.click(screen.getByLabelText('Neture'));fireEvent.change(screen.getByLabelText('모집 공급가 (원)'),{target:{value:'1500'}});
    fireEvent.click(screen.getByText('모집 생성'));fireEvent.click(screen.getByText('모집 생성'));fireEvent.click(screen.getByLabelText('모집 작성 닫기'));
    expect(api.create).toHaveBeenCalledTimes(1);expect(close).not.toHaveBeenCalled();
    view.unmount();await act(async()=>{resolve({success:true,data:{id:'created'}});});expect(close).not.toHaveBeenCalled();expect(created).not.toHaveBeenCalled();
  });

});
