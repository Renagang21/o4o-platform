import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MemberLifecycleActions from "./MemberLifecycleActions";
import type { MemberDetail } from "./member-workspace-model";
const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock("@o4o/auth-client", () => ({ authClient: { api } }));
const detail = {
  member: { userId: "target", version: "synthetic-version", serviceStatus: "active" },
  permissions: { edit: true, manageAccount: true },
  pharmacies: [
    { organizationId: "organization", name: "합성 약국", status: "active" },
  ],
} as MemberDetail;
beforeEach(() => {
  api.get.mockResolvedValue({
    data: { data: { deleteRows: 3, reviewRows: 0, businessDocuments: 0 } },
  });
  api.post.mockReset();
  api.post.mockResolvedValue({ data: { success: true } });
});
afterEach(cleanup);
const renderActions = (data = detail) =>
  render(
    <MemberLifecycleActions
      adminMode
      detail={data}
      actorId="admin"
      busy={false}
      perform={async (work) => {
        await work();
      }}
    />,
  );
const confirmReason = () =>
  fireEvent.change(screen.getByLabelText("이용 관리 사유"), {
    target: { value: "합성 확인 사유" },
  });
it('terminates member access without a staff command or employee confirmation',async()=>{
 renderActions();expect(screen.queryByText('이용 정지')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'회원 해지',exact:true}));
 confirmReason();expect(screen.queryByRole('checkbox')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'회원 해지 실행'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/qualifications/pharmacist/members/target/terminate-access',{reason:'합성 확인 사유',version:'synthetic-version'}));
});
it('restores a withdrawn member through the dedicated member restore command',async()=>{
 renderActions({...detail,member:{...detail.member,serviceStatus:'withdrawn'}});expect(screen.queryByRole('button',{name:'회원 해지',exact:true})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'이용 복구',exact:true}));confirmReason();fireEvent.click(screen.getByRole('button',{name:'이용 복구 실행'}));
 await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/qualifications/pharmacist/members/target/restore-access',{reason:'합성 확인 사유',version:'synthetic-version'}));
});
it("sale requires both-party confirmation and sends the selected organization and new owner email", async () => {
  renderActions();
  fireEvent.click(screen.getByText("약국 매도·경영자 이전"));
  confirmReason();
  fireEvent.change(screen.getByLabelText("새 경영자 가입 이메일"), {
    target: { value: "next@fixture.invalid" },
  });
  expect(
    screen.getByRole("button", { name: "경영자 이전 실행" }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByLabelText(
      "약국 매도와 자료 이전에 대해 양측의 확인을 받았습니다.",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "경영자 이전 실행" }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      "/qualifications/pharmacist/members/target/pharmacies/organization/transfer",
      {
        reason: "합성 확인 사유",
        nextOwnerEmail: "next@fixture.invalid",
        transferConfirmed: true,
      },
    ),
  );
});
it("closure has a separate irreversible confirmation and never sends the sale request", async () => {
  renderActions();
  fireEvent.click(screen.getByText("약국 완전폐업·자료삭제"));
  await screen.findByText(/현재 삭제 대상 매장 자료/);
  confirmReason();
  expect(
    screen.getByRole("button", { name: "완전폐업·자료삭제 실행" }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByLabelText(
      "매도가 아닌 완전폐업이며 약국 자료 삭제를 확인했습니다.",
    ),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "완전폐업·자료삭제 실행" }),
  );
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      "/qualifications/pharmacist/members/target/pharmacies/organization/close",
      { reason: "합성 확인 사유", closureConfirmed: true },
    ),
  );
});
it("operators cannot see sale or closure controls and own-account actions stay hidden", () => {
  const view = renderActions({
    ...detail,
    permissions: { ...detail.permissions, manageAccount: false },
  });
  expect(screen.queryByText("약국 매도·경영자 이전")).toBeNull();
  expect(screen.queryByText("약국 완전폐업·자료삭제")).toBeNull();
  view.rerender(
    <MemberLifecycleActions
      detail={detail}
      actorId="target"
      busy={false}
      perform={async () => {}}
    />,
  );
  expect(screen.queryByRole("region")).toBeNull();
  expect(screen.queryByText("이용 정지")).toBeNull();
});
it.each(["pending", "rejected"])(
  "does not open the termination form for a %s member even when the panel asks for it",
  (serviceStatus) => {
    render(
      <MemberLifecycleActions
        initialAction="terminate"
        detail={{ ...detail, member: { ...detail.member, serviceStatus } } as MemberDetail}
        actorId="operator"
        busy={false}
        perform={async () => {}}
      />,
    );
    expect(screen.queryByText("회원 해지 실행")).toBeNull();
    expect(screen.queryByRole("button", { name: "회원 해지" })).toBeNull();
    expect(screen.getByText(/가입 대기 · 반려 회원은 이용 해지 대상이 아닙니다/)).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
  },
);
it("still opens the termination form for an active member", () => {
  render(
    <MemberLifecycleActions
      initialAction="terminate"
      detail={detail}
      actorId="operator"
      busy={false}
      perform={async () => {}}
    />,
  );
  expect(screen.getByText("회원 이용을 해지합니다. 이후 이용 복구가 가능합니다.")).toBeTruthy();
  expect(screen.queryByText(/이용 해지 대상이 아닙니다/)).toBeNull();
});
