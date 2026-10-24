import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import {
  FederationManagementPanel,
  MemberManagementPanel,
  RoleManagement,
  MembershipApplication,
} from "./Management";
const coop = {
  id: "c",
  slug: "one",
  name: "첫 조합",
  businessKey: "coop-one",
  introduction: "소개",
  eligibilityDescription: "개인",
};
const member = {
  id: "m",
  userId: "u",
  name: "회원",
  email: "member@example.invalid",
  status: "pending",
};
function client() {
  return {
    get: vi.fn(async (path: string) => ({
      data: {
        data: path.startsWith("/service-operator-management/")
          ? {role:'neture:pharmcoop_operator',operators:[],candidates:[],truncated:false}
          : path.endsWith("/members")
          ? [member]
          : path.endsWith("/federation")
            ? [{ ...coop, status: "pending" }]
            : [],
      },
    })),
    post: vi.fn(async () => ({ data: { data: { ok: true } } })),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
}
afterEach(cleanup);
it('requires the cooperative own policy pair and submits only those current references', async () => {
  const api = client();
  const policyScope = 'business:11111111-1111-4111-8111-111111111111';
  const policies = ['terms', 'privacy'].map((documentType, i) => ({ serviceKey: policyScope, documentType, policyDocumentId: `22222222-2222-4222-8222-22222222222${i}`, version: 1, title: documentType, content: 'Synthetic policy' }));
  api.get.mockResolvedValue({ data: { data: policies } } as any);
  render(<MembershipApplication client={api} coop="c" businessKey="coop-one" policyScope={policyScope} />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '가입 자격 확인' } });
  expect((screen.getByRole('button', { name: '가입·보완 신청' }) as HTMLButtonElement).disabled).toBe(true);
  await screen.findByText('privacy · 버전 1');
  for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box);
  fireEvent.click(screen.getByRole('button', { name: '가입·보완 신청' }));
  await screen.findByText('가입 신청을 접수했습니다.');
  expect(api.post).toHaveBeenCalledWith('/neture/cooperative-management/c/applications', { reason: '가입 자격 확인', policyReferences: policies.map(({ policyDocumentId, version, documentType }) => ({ policyDocumentId, version, documentType })) });
  expect(api.get).toHaveBeenCalledWith('/neture/businesses/coop-one/legal/enrollment-policies');
});
it('keeps an unconfigured cooperative application disabled instead of substituting Neture policies', async () => {
  const api = client();
  render(<MembershipApplication client={api} coop="c" />);
  await screen.findByRole('alert');
  expect(api.get).not.toHaveBeenCalled();
  expect((screen.getByRole('button', { name: '가입·보완 신청' }) as HTMLButtonElement).disabled).toBe(true);
});
describe("scoped administration work", () => {
  it("operator sends a review request without exposing final decisions or role assignment", async () => {
    const api = client();
    render(
      <MemberManagementPanel
        client={api}
        cooperative={coop}
        admin={false}
        userId="op"
      />,
    );
    await screen.findByText("회원");
    expect(screen.queryByRole("button", { name: "가입 승인" })).toBeNull();
    expect(screen.queryByText("조합 operator 지정·해제")).toBeNull();
    fireEvent.change(screen.getByLabelText("검토·처리 사유"), {
      target: { value: "자격 검토 완료" },
    });
    fireEvent.click(screen.getByRole("button", { name: "가입 승인 요청" }));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/neture/cooperative-management/c/members/m/actions/request_approve",
        { reason: "자격 검토 완료" },
      ),
    );
  });
  it("local admin has final decisions and records a server denial without showing success", async () => {
    const api = client();
    api.post.mockRejectedValueOnce({
      response: { data: { error: "권한이 변경됐습니다." } },
    });
    render(
      <MemberManagementPanel
        client={api}
        cooperative={coop}
        admin
        userId="admin"
      />,
    );
    await screen.findByText("회원");
    fireEvent.change(screen.getByLabelText("검토·처리 사유"), {
      target: { value: "승인 심사" },
    });
    fireEvent.click(screen.getByRole("button", { name: "가입 승인" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "권한이 변경됐습니다.",
    );
    expect(screen.queryByText("처리했습니다.")).toBeNull();
    expect(api.post).toHaveBeenCalledWith(
      "/neture/cooperative-management/c/members/m/actions/approve",
      { reason: "승인 심사" },
    );
  });
  it("federation operator sees review controls but cannot decide or appoint admins", async () => {
    const api = client();
    render(<FederationManagementPanel client={api} admin={false} userId="f" />);
    fireEvent.click(await screen.findByRole("button", { name: "관리" }));
    expect(screen.queryByRole("button", { name: "가입 승인" })).toBeNull();
    expect(screen.queryByText("조합 admin 지정·해제")).toBeNull();
    expect(screen.getByRole("button", { name: "보완 요청" })).toBeTruthy();
  });
  it("federation admin assignment uses a local admin grant and requires a reason", async () => {
    const api = client();
    render(<RoleManagement client={api} coop="c" federation userId="f" />);
    const button = screen.getByRole("button", { name: "조합 admin 지정" });
    expect(button).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("기존 계정 이메일"), {
      target: { value: "admin@example.invalid" },
    });
    fireEvent.change(screen.getByLabelText("지정·해제 사유"), {
      target: { value: "조합 관리자 지정" },
    });
    fireEvent.click(button);
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        "/neture/cooperative-management/c/roles",
        {
          email: "admin@example.invalid",
          role: "admin",
          reason: "조합 관리자 지정",
        },
      ),
    );
  });
});

it("federation admin manages federation Operators independently of local cooperative Admin grants", async () => {
  const api = client();
  render(<FederationManagementPanel client={api} admin userId="f" />);
  await screen.findByText("지정된 Operator가 없습니다.");
  expect(api.get).toHaveBeenCalledWith("/service-operator-management/pharmcoop");
  expect(screen.getByRole("heading", {name:"연합회 Operator 지정 · 해제"})).toBeTruthy();
});
