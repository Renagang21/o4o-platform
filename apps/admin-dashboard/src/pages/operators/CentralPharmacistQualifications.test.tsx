import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const mock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@o4o/auth-client", () => ({ authClient: { api: mock } }));
import CentralPharmacistQualifications from "./CentralPharmacistQualifications";
const row = {
  userId: "target",
  name: "합성 신청자",
  licenseNumber: "synthetic",
  status: "pending",
  reason: null,
  version: "2026-10-28T00:00:00.123456",
};
const fullDetail = {
 member:{userId:row.userId,name:row.name,nickname:'합성 회원',email:'synthetic@example.test',phone:'01012345678',accountStatus:'active',emailVerified:true,version:row.version,joinedAt:'2026-11-01',hasPassword:false},
 qualification:{...row,approvedAt:null,reviewedBy:null},registration:null,legacyLicense:null,pharmacies:[],history:[],
 permissions:{edit:false,qualifications:true,pharmacies:false},
};
beforeEach(() => {
  mock.get
    .mockReset()
    .mockImplementation(async (path:string) => ({data:{data:path.endsWith("/target")?fullDetail:{items:[row],hasNext:false}}}));
  mock.post
    .mockReset()
    .mockResolvedValue({ data: { data: { status: "approved" } } });
});
afterEach(cleanup);
it("requires evidence confirmation and a reason before sending a versioned approval", async () => {
  render(<CentralPharmacistQualifications actorId="reviewer" />);
  fireEvent.click(await screen.findByRole("button", { name: "승인 검토" }));
  const save = await screen.findByRole("button", { name: "검토 결과 저장" });
  expect(save).toBeDisabled();
  fireEvent.change(screen.getByLabelText("신청자에게 안내할 확인·반려 사유"), {
    target: { value: "면허 근거를 별도로 확인함" },
  });
  expect(save).toBeDisabled();
  fireEvent.click(
    screen.getByLabelText("신청자 본인의 면허 근거를 별도로 확인했습니다."),
  );
  fireEvent.click(save);
  await waitFor(() =>
    expect(mock.post).toHaveBeenCalledWith(
      "/qualifications/pharmacist/review/target",
      {
        action: "approve",
        reason: "면허 근거를 별도로 확인함",
        version: row.version,
        licenseEvidenceChecked: true,
      },
    ),
  );
  expect(await screen.findByRole("status")).toHaveTextContent(
    "공통 계정 상태는 변경하지 않았습니다",
  );
});
it("prevents self approval and sends no request", async () => {
  render(<CentralPharmacistQualifications actorId="target" />);
  expect(
    await screen.findByRole("button", { name: "승인 검토" }),
  ).toBeDisabled();
  expect(mock.post).not.toHaveBeenCalled();
});
it("shows status tabs and reveals the standard action bar only after a member is selected", async () => {
  render(<CentralPharmacistQualifications actorId="reviewer" />);
  expect(screen.getByRole('tab', { name: '전체 회원' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.queryByRole('button', { name: '선택 회원 승인 검토' })).toBeNull();
  await screen.findByText('합성 신청자');
  const checkboxes = screen.getAllByRole('checkbox');
  fireEvent.click(checkboxes[checkboxes.length - 1]);
  fireEvent.click(screen.getByRole('button', { name: '선택 회원 승인 검토' }));
  expect(await screen.findByRole('button', { name: '검토 결과 저장' })).toBeDisabled();
  expect(mock.post).not.toHaveBeenCalled();
});
it("searches common members and clears selection when changing status", async () => {
  render(<CentralPharmacistQualifications actorId="reviewer" />);
  await screen.findByText('합성 신청자');
  fireEvent.change(screen.getByLabelText('회원 이름·이메일 검색'), { target: { value: ' member ' } });
  fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
  await waitFor(() => expect(mock.get).toHaveBeenLastCalledWith('/qualifications/pharmacist/review', { params: { status: 'all', page: 1, q: 'member' } }));
  fireEvent.click(screen.getByRole('tab', { name: '검토 대기' }));
  await waitFor(() => expect(mock.get).toHaveBeenLastCalledWith('/qualifications/pharmacist/review', { params: { status: 'pending', page: 1, q: 'member' } }));
});
it("clears stale data on a rejected review and requires a fresh read", async () => {
  mock.post.mockRejectedValueOnce(new Error("changed"));
  render(<CentralPharmacistQualifications actorId="reviewer" />);
  fireEvent.click(await screen.findByRole("button", { name: "반려" }));
  await screen.findByRole("button", { name: "검토 결과 저장" });
  fireEvent.change(screen.getByLabelText("신청자에게 안내할 확인·반려 사유"), {
    target: { value: "근거 확인 필요" },
  });
  fireEvent.click(screen.getByRole("button", { name: "검토 결과 저장" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("다시 조회");
  expect(screen.queryByText("면허번호: synthetic")).toBeNull();
  expect(mock.post.mock.calls[0][1]).toEqual({
    action: "reject",
    reason: "근거 확인 필요",
    version: row.version,
  });
});

it("keeps platform Admin visible without review actions", async () => {
 mock.get.mockResolvedValue({data:{data:{items:[{...row,operatorReadOnly:true}],hasNext:false}}});
 render(<CentralPharmacistQualifications actorId="reviewer" />);
 expect(await screen.findByText('전체 관리자 — 처리 대상 아님')).toBeVisible();
 expect(screen.queryByRole('button',{name:'승인 검토'})).toBeNull();
 expect(screen.queryByRole('button',{name:'반려',exact:true})).toBeNull();
 expect(mock.post).not.toHaveBeenCalled();
});
it("shows whole-member fields in an explicit drawer before approving", async () => {
 render(<CentralPharmacistQualifications actorId="reviewer" />);
 fireEvent.click(await screen.findByRole('button',{name:'승인 검토'}));
 expect(await screen.findByDisplayValue('synthetic@example.test')).toBeVisible();
 expect(screen.getByDisplayValue('01012345678')).toBeVisible();
 expect(screen.getByRole('button',{name:'검토 결과 저장'})).toBeDisabled();
});
it("cannot approve when full detail fails", async () => {
 mock.get.mockImplementation(async (path:string)=>{if(path.endsWith('/target'))throw new Error('fixture');return {data:{data:{items:[row],hasNext:false}}};});
 render(<CentralPharmacistQualifications actorId="reviewer" />);
 fireEvent.click(await screen.findByRole('button',{name:'승인 검토'}));
 await screen.findAllByText(/회원 전체 정보를 불러오지 못했습니다/);
 expect(screen.queryByRole('button',{name:'검토 결과 저장'})).toBeNull();expect(mock.post).not.toHaveBeenCalled();
});
