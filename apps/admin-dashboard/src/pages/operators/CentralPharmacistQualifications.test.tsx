import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const mock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
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
 member:{userId:row.userId,name:row.name,nickname:'합성 회원',email:'synthetic@example.test',phone:'01012345678',accountStatus:'active',emailVerified:true,version:'member-version-1',joinedAt:'2026-11-01',hasPassword:false},
 qualification:{...row,approvedAt:null,reviewedBy:null},registration:null,legacyLicense:null,pharmacies:[],history:[],
 permissions:{edit:false,qualifications:true,pharmacies:false},
};
const pendingRegistration = {type:'supplier',state:'pending',requestId:'request-1',fields:{businessName:'합성 사업자'}};
const respondWith = (detail:unknown, list:unknown=[row]) => mock.get.mockImplementation(async (path:string) => ({data:{data:path.endsWith("/target")?detail:{items:list,hasNext:false}}}));
const fillReason = (value:string) => fireEvent.change(screen.getByLabelText("신청자에게 안내할 확인·반려 사유"), { target: { value } });
beforeEach(() => {
  mock.get.mockReset();
  respondWith(fullDetail);
  mock.post
    .mockReset()
    .mockResolvedValue({ data: { data: { status: "approved" } } });
  mock.patch.mockReset().mockResolvedValue({ data: { data: {} } });
});
afterEach(cleanup);
it("offers one signup action instead of separate approve and reject reviews", async () => {
  render(<CentralPharmacistQualifications actorId="reviewer" />);
  expect(await screen.findByRole("button", { name: "가입승인" })).toBeVisible();
  for (const name of ["승인 검토", "반려", "선택 회원 승인 검토", "선택 회원 반려 검토"])
    expect(screen.queryByRole("button", { name })).toBeNull();
  const checkboxes = screen.getAllByRole("checkbox");
  fireEvent.click(checkboxes[checkboxes.length - 1]);
  expect(screen.getAllByRole("button", { name: "가입승인" })).toHaveLength(2);
  expect(screen.queryByRole("button", { name: "반려" })).toBeNull();
  expect(screen.queryByRole("button", { name: "승인 취소" })).toBeNull();
});
it("registers the signup approval on the member-registration API with the member version", async () => {
  respondWith({ ...fullDetail, registration: pendingRegistration });
  render(<CentralPharmacistQualifications actorId="reviewer" canManageMembers />);
  fireEvent.click(await screen.findByRole("button", { name: "가입승인" }));
  const approve = await screen.findByRole("button", { name: "승인" });
  expect(approve).toBeDisabled();
  fillReason("제출 정보 확인");
  expect(screen.queryByLabelText("신청자 본인의 면허 근거를 별도로 확인했습니다.")).toBeNull();
  fireEvent.click(approve);
  await waitFor(() =>
    expect(mock.post).toHaveBeenCalledWith("/member-registration/members/target/approve", {
      version: "member-version-1",
      reason: "제출 정보 확인",
    }),
  );
  expect(await screen.findByRole("status")).toHaveTextContent("가입 승인을 저장했습니다.");
  expect(mock.post).toHaveBeenCalledTimes(1);
});
it("registers the signup rejection from the same drawer", async () => {
  respondWith({ ...fullDetail, registration: pendingRegistration });
  render(<CentralPharmacistQualifications actorId="reviewer" canManageMembers />);
  fireEvent.click(await screen.findByRole("button", { name: "가입승인" }));
  const reject = await screen.findByRole("button", { name: "반려" });
  expect(reject).toBeDisabled();
  fillReason("서류 보완 필요");
  fireEvent.click(reject);
  await waitFor(() =>
    expect(mock.post).toHaveBeenCalledWith("/member-registration/members/target/reject", {
      version: "member-version-1",
      reason: "서류 보완 필요",
    }),
  );
  expect(await screen.findByRole("status")).toHaveTextContent("가입 반려를 저장했습니다.");
});
it("decides a legacy qualification without a stored signup on the qualification API", async () => {
  // readRegistrationView() synthesizes this pending view from the qualification ledger (no requestId).
  respondWith({ ...fullDetail, registration: { type: "pharmacist", state: "pending", fields: { licenseNumber: "synthetic" } } });
  render(<CentralPharmacistQualifications actorId="reviewer" canManageMembers />);
  fireEvent.click(await screen.findByRole("button", { name: "가입승인" }));
  const reject = await screen.findByRole("button", { name: "반려" });
  fillReason("근거 부족");
  fireEvent.click(reject);
  await waitFor(() =>
    expect(mock.post).toHaveBeenCalledWith("/qualifications/pharmacist/review/target", {
      action: "reject",
      reason: "근거 부족",
      version: row.version,
    }),
  );
  expect(mock.post.mock.calls.some(([path]) => String(path).includes("registration"))).toBe(false);
});
it("requires license evidence for a licensed signup, but not to reject it", async () => {
  respondWith({ ...fullDetail, registration: { type: "pharmacy_owner", state: "pending", requestId: "request-2", fields: {} } });
  render(<CentralPharmacistQualifications actorId="reviewer" canManageMembers />);
  fireEvent.click(await screen.findByRole("button", { name: "가입승인" }));
  const approve = await screen.findByRole("button", { name: "승인" });
  fillReason("면허 근거 확인");
  expect(approve).toBeDisabled();
  expect(screen.getByRole("button", { name: "반려" })).toBeEnabled();
  fireEvent.click(screen.getByLabelText("신청자 본인의 면허 근거를 별도로 확인했습니다."));
  expect(approve).toBeEnabled();
});
it("edits the member, re-reads the new version, and then approves on that version", async () => {
  const fresh = { ...fullDetail, registration: pendingRegistration, member: { ...fullDetail.member, name: "수정된 신청자", version: "member-version-2" } };
  let saved = false;
  mock.get.mockImplementation(async (path: string) => ({ data: { data: path.endsWith("/target") ? (saved ? fresh : { ...fullDetail, registration: pendingRegistration }) : { items: [row], hasNext: false } } }));
  mock.patch.mockImplementation(async () => { saved = true; return { data: { data: {} } }; });
  render(<CentralPharmacistQualifications actorId="reviewer" canManageMembers />);
  fireEvent.click(await screen.findByRole("button", { name: "가입승인" }));
  fireEvent.click(await screen.findByRole("button", { name: "정보 수정" }));
  expect(screen.queryByRole("button", { name: "승인" })).toBeNull();
  fireEvent.change(screen.getByLabelText("수정 사유"), { target: { value: "오타 정정" } });
  fireEvent.submit(screen.getByRole("form", { name: "회원 정보 수정" }));
  await waitFor(() => expect(mock.patch).toHaveBeenCalledTimes(1));
  expect(mock.patch.mock.calls[0][0]).toBe("/qualifications/pharmacist/members/target");
  expect(mock.patch.mock.calls[0][1]).toMatchObject({ reason: "오타 정정", version: "member-version-1" });
  const approve = await screen.findByRole("button", { name: "승인" });
  expect(screen.getByDisplayValue("수정된 신청자")).toBeVisible();
  fillReason("수정 후 확인");
  fireEvent.click(approve);
  await waitFor(() =>
    expect(mock.post).toHaveBeenCalledWith("/member-registration/members/target/approve", {
      version: "member-version-2",
      reason: "수정 후 확인",
    }),
  );
});
it("keeps the edit form and shows the server message when saving fails", async () => {
  respondWith({ ...fullDetail, registration: pendingRegistration });
  mock.patch.mockRejectedValueOnce({ response: { status: 409, data: { error: "회원 정보가 변경되었습니다." } } });
  render(<CentralPharmacistQualifications actorId="reviewer" canManageMembers />);
  fireEvent.click(await screen.findByRole("button", { name: "가입승인" }));
  fireEvent.click(await screen.findByRole("button", { name: "정보 수정" }));
  fireEvent.change(screen.getByLabelText("수정 사유"), { target: { value: "오타 정정" } });
  fireEvent.submit(screen.getByRole("form", { name: "회원 정보 수정" }));
  await screen.findAllByText("회원 정보가 변경되었습니다.");
  expect(screen.getByLabelText("수정 사유")).toHaveValue("오타 정정");
  expect(mock.post).not.toHaveBeenCalled();
});
it("does not continue on stale data when the re-read after a saved edit fails", async () => {
  let saved = false;
  mock.get.mockImplementation(async (path: string) => {
    if (!path.endsWith("/target")) return { data: { data: { items: [row], hasNext: false } } };
    if (saved) throw new Error("fixture");
    return { data: { data: { ...fullDetail, registration: pendingRegistration } } };
  });
  mock.patch.mockImplementation(async () => { saved = true; return { data: { data: {} } }; });
  render(<CentralPharmacistQualifications actorId="reviewer" canManageMembers />);
  fireEvent.click(await screen.findByRole("button", { name: "가입승인" }));
  fireEvent.click(await screen.findByRole("button", { name: "정보 수정" }));
  fireEvent.change(screen.getByLabelText("수정 사유"), { target: { value: "오타 정정" } });
  fireEvent.submit(screen.getByRole("form", { name: "회원 정보 수정" }));
  await screen.findAllByText(/회원 정보는 저장했지만/);
  expect(screen.queryByRole("button", { name: "승인" })).toBeNull();
});
it("without the member grant hides editing and keeps the qualification-only decision honest", async () => {
  respondWith({ ...fullDetail, registration: pendingRegistration });
  render(<CentralPharmacistQualifications actorId="reviewer" />);
  fireEvent.click(await screen.findByRole("button", { name: "가입승인" }));
  const approve = await screen.findByRole("button", { name: "승인" });
  expect(screen.queryByRole("button", { name: "정보 수정" })).toBeNull();
  expect(screen.getByText("가입 승인은 회원 가입·이용 관리 업무 위임이 필요합니다.")).toBeVisible();
  expect(screen.getByText("이 처리는 약사 자격에만 적용되며 공통 계정·가입 상태는 변경하지 않습니다.")).toBeVisible();
  expect(approve).toBeDisabled();
  fillReason("면허 근거를 별도로 확인함");
  expect(approve).toBeDisabled();
  fireEvent.click(screen.getByLabelText("신청자 본인의 면허 근거를 별도로 확인했습니다."));
  fireEvent.click(approve);
  await waitFor(() =>
    expect(mock.post).toHaveBeenCalledWith("/qualifications/pharmacist/review/target", {
      action: "approve",
      reason: "면허 근거를 별도로 확인함",
      version: row.version,
      licenseEvidenceChecked: true,
    }),
  );
  expect(await screen.findByRole("status")).toHaveTextContent("공통 계정 상태는 변경하지 않았습니다");
});
it("uses the qualification decision when the signup is already approved", async () => {
  respondWith({ ...fullDetail, registration: { ...pendingRegistration, state: "approved" } });
  render(<CentralPharmacistQualifications actorId="reviewer" canManageMembers />);
  fireEvent.click(await screen.findByRole("button", { name: "가입승인" }));
  const reject = await screen.findByRole("button", { name: "반려" });
  fillReason("근거 부족");
  fireEvent.click(reject);
  await waitFor(() =>
    expect(mock.post).toHaveBeenCalledWith("/qualifications/pharmacist/review/target", {
      action: "reject",
      reason: "근거 부족",
      version: row.version,
    }),
  );
});
it("explains when there is nothing to decide and sends no request", async () => {
  const bare = { ...row, licenseNumber: null, status: "unrequested", version: null };
  respondWith({ ...fullDetail, qualification: null }, [bare]);
  render(<CentralPharmacistQualifications actorId="reviewer" canManageMembers />);
  fireEvent.click(await screen.findByRole("button", { name: "가입승인" }));
  expect(await screen.findByText("처리할 가입 신청이 없습니다.")).toBeVisible();
  expect(screen.queryByRole("button", { name: "승인" })).toBeNull();
  expect(screen.queryByRole("button", { name: "반려" })).toBeNull();
  expect(mock.post).not.toHaveBeenCalled();
});
it("keeps revoke as its own action for an approved qualification", async () => {
  const approved = { ...row, status: "approved" };
  respondWith({ ...fullDetail, qualification: { ...fullDetail.qualification, status: "approved" } }, [approved]);
  render(<CentralPharmacistQualifications actorId="reviewer" canManageMembers />);
  fireEvent.click(await screen.findByRole("button", { name: "승인 취소" }));
  expect(screen.queryByRole("button", { name: "가입승인" })).toBeNull();
  const save = await screen.findByRole("button", { name: "승인 취소 저장" });
  fireEvent.change(screen.getByLabelText("승인 취소 사유"), { target: { value: "면허 말소 확인" } });
  fireEvent.click(save);
  await waitFor(() =>
    expect(mock.post).toHaveBeenCalledWith("/qualifications/pharmacist/review/target", {
      action: "revoke",
      reason: "면허 말소 확인",
      version: row.version,
    }),
  );
});
it("prevents self approval and sends no request", async () => {
  render(<CentralPharmacistQualifications actorId="target" canManageMembers />);
  expect(
    await screen.findByRole("button", { name: "가입승인" }),
  ).toBeDisabled();
  expect(mock.post).not.toHaveBeenCalled();
});
it("shows status tabs and reveals the standard action bar only after a member is selected", async () => {
  render(<CentralPharmacistQualifications actorId="reviewer" />);
  expect(screen.getByRole('tab', { name: '전체 회원' })).toHaveAttribute('aria-selected', 'true');
  await screen.findByText('합성 신청자');
  expect(screen.getAllByRole('button', { name: '가입승인' })).toHaveLength(1);
  const checkboxes = screen.getAllByRole('checkbox');
  fireEvent.click(checkboxes[checkboxes.length - 1]);
  fireEvent.click(screen.getAllByRole('button', { name: '가입승인' })[0]);
  expect(await screen.findByRole('button', { name: '승인' })).toBeDisabled();
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
it("clears stale data on a failed decision and requires a fresh read", async () => {
  mock.post.mockRejectedValueOnce(new Error("changed"));
  render(<CentralPharmacistQualifications actorId="reviewer" />);
  fireEvent.click(await screen.findByRole("button", { name: "가입승인" }));
  const reject = await screen.findByRole("button", { name: "반려" });
  fillReason("근거 확인 필요");
  fireEvent.click(reject);
  expect(await screen.findByRole("alert")).toHaveTextContent("다시 조회");
  expect(screen.queryByText("면허번호: synthetic")).toBeNull();
  expect(mock.post.mock.calls[0][1]).toEqual({
    action: "reject",
    reason: "근거 확인 필요",
    version: row.version,
  });
});
it("shows the server's reason when a signup decision is refused", async () => {
  respondWith({ ...fullDetail, registration: pendingRegistration });
  mock.post.mockRejectedValueOnce({ response: { status: 409, data: { error: "회원이 해당 역할의 약관·개인정보 안내를 확인해야 합니다." } } });
  render(<CentralPharmacistQualifications actorId="reviewer" canManageMembers />);
  fireEvent.click(await screen.findByRole("button", { name: "가입승인" }));
  const approve = await screen.findByRole("button", { name: "승인" });
  fillReason("제출 정보 확인");
  fireEvent.click(approve);
  expect(await screen.findByRole("alert")).toHaveTextContent("약관·개인정보 안내");
});

it("keeps platform Admin visible without review actions", async () => {
 mock.get.mockResolvedValue({data:{data:{items:[{...row,operatorReadOnly:true}],hasNext:false}}});
 render(<CentralPharmacistQualifications actorId="reviewer" canManageMembers />);
 expect(await screen.findByText('전체 관리자 — 처리 대상 아님')).toBeVisible();
 expect(screen.queryByRole('button',{name:'가입승인'})).toBeNull();
 expect(screen.queryByRole('button',{name:'반려',exact:true})).toBeNull();
 expect(mock.post).not.toHaveBeenCalled();
});
it("shows whole-member fields in an explicit drawer before approving", async () => {
 render(<CentralPharmacistQualifications actorId="reviewer" />);
 fireEvent.click(await screen.findByRole('button',{name:'가입승인'}));
 expect(await screen.findByDisplayValue('synthetic@example.test')).toBeVisible();
 expect(screen.getByDisplayValue('01012345678')).toBeVisible();
 expect(screen.getByRole('button',{name:'승인'})).toBeDisabled();
});
it("cannot approve when full detail fails", async () => {
 mock.get.mockImplementation(async (path:string)=>{if(path.endsWith('/target'))throw new Error('fixture');return {data:{data:{items:[row],hasNext:false}}};});
 render(<CentralPharmacistQualifications actorId="reviewer" />);
 fireEvent.click(await screen.findByRole('button',{name:'가입승인'}));
 await screen.findAllByText(/회원 전체 정보를 불러오지 못했습니다/);
 expect(screen.queryByRole('button',{name:'승인'})).toBeNull();expect(mock.post).not.toHaveBeenCalled();
});

it.each([false,true])('respects the separate document-read grant without closing the drawer (%s)',async readDocuments=>{
 const detail={...fullDetail,registration:{type:'pharmacy_owner',state:'pending',fields:{licenseNumber:'synthetic',businessRegistrationDocumentId:'synthetic-document'}},permissions:{...fullDetail.permissions,readDocuments}};
 respondWith(detail);
 render(<CentralPharmacistQualifications actorId="reviewer" />);
 fireEvent.click(await screen.findByRole('button',{name:'가입승인'}));
 const documentButton=await screen.findByRole('button',{name:'사업자등록증 보기'});
 expect(documentButton).toHaveProperty('disabled',!readDocuments);
 if(!readDocuments){
  fireEvent.click(documentButton);
  expect(screen.getByRole('button',{name:'승인'})).toBeVisible();
  expect(mock.get.mock.calls.some(([path])=>String(path).includes('/document/'))).toBe(false);
  expect(screen.getByText('사업자 서류 조회 권한이 없어 첨부 여부만 표시합니다.')).toBeVisible();
 }
});
