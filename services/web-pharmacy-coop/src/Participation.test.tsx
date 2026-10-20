import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  EligibilitySettings,
  MyCooperatives,
  MyUpdates,
} from "./Participation";
const coop = {
  id: "c",
  slug: "one",
  name: "첫 조합",
  introduction: "소개",
  eligibilityDescription: "개인",
};
const client = () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
});
afterEach(cleanup);
describe("personal cooperative work", () => {
  it("separates personal status from management roles and keeps suspended cooperatives visible without entry", async () => {
    const api = client();
    api.get.mockResolvedValue({
      data: {
        data: [
          {
            ...coop,
            membershipStatus: "pending",
            role: null,
            cooperativeStatus: "active",
            businessStatus: "active",
          },
          {
            ...coop,
            id: "d",
            slug: "two",
            name: "둘째 조합",
            membershipStatus: null,
            role: "admin",
            cooperativeStatus: "suspended",
            businessStatus: "closed",
          },
        ],
      },
    });
    render(
      <MemoryRouter>
        <MyCooperatives client={api} />
      </MemoryRouter>,
    );
    await screen.findByText("첫 조합");
    expect(screen.getByText("개인 가입: 심사 대기")).toBeTruthy();
    expect(screen.getByText("관리 역할: 조합 관리자")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "조합 운영" })).toBeNull();
    expect(
      screen
        .getByRole("link", { name: "조합 공간으로 이동" })
        .getAttribute("href"),
    ).toBe("/one");
    expect(api.get).toHaveBeenCalledWith(
      "/neture/cooperative-management/my-cooperatives",
    );
  });
  it("shows an error with retry instead of treating a failed list as empty", async () => {
    const api = client();
    api.get
      .mockRejectedValueOnce(new Error())
      .mockResolvedValueOnce({ data: { data: [] } });
    render(
      <MemoryRouter>
        <MyCooperatives client={api} />
      </MemoryRouter>,
    );
    await screen.findByRole("alert");
    expect(
      screen.queryByText(/가입하거나 관리 중인 조합이 없습니다/),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
    expect(
      await screen.findByText(/가입하거나 관리 중인 조합이 없습니다/),
    ).toBeTruthy();
  });
  it("links affiliation results to the applicant page and shows a separate role result", async () => {
    const api = client();
    api.get.mockResolvedValue({
      data: {
        data: [
          {
            id: "1",
            slug: "pending",
            cooperativeName: "신청 조합",
            action: "affiliation_request_changes",
            reason: "추가 안내",
            nextState: "pending",
            createdAt: "2026-10-20T00:00:00Z",
          },
          {
            id: "2",
            slug: "one",
            cooperativeName: "첫 조합",
            action: "role_assign",
            reason: "담당 지정",
            nextState: "operator",
            createdAt: "2026-10-20T00:00:00Z",
            cooperativeStatus: "active",
            businessStatus: "active",
          },
        ],
      },
    });
    render(
      <MemoryRouter>
        <MyUpdates client={api} />
      </MemoryRouter>,
    );
    expect(await screen.findByText("추가 안내")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "내 조합 신청 확인" })
        .getAttribute("href"),
    ).toBe("/about");
    expect(screen.getByText("결과: 조합 운영자")).toBeTruthy();
  });
  it("preserves eligibility input on denial and sends a reason with a successful retry", async () => {
    const api = client();
    api.post
      .mockRejectedValueOnce({
        response: { data: { error: "조합 admin만 수정할 수 있습니다." } },
      })
      .mockResolvedValueOnce({ data: { success: true } });
    const changed = vi.fn();
    render(
      <EligibilitySettings
        client={api}
        cooperative={coop}
        onChanged={changed}
      />,
    );
    fireEvent.change(screen.getByLabelText("가입 자격·제출 정보"), {
      target: { value: "약사 또는 일반 개인" },
    });
    fireEvent.change(screen.getByLabelText("기준 변경 사유"), {
      target: { value: "정관 반영" },
    });
    fireEvent.click(screen.getByRole("button", { name: "가입 기준 저장" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "조합 admin만 수정할 수 있습니다.",
    );
    expect(screen.getByLabelText("가입 자격·제출 정보")).toHaveProperty(
      "value",
      "약사 또는 일반 개인",
    );
    expect(changed).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "가입 기준 저장" }));
    await screen.findByText("가입 기준을 저장했습니다.");
    expect(api.post).toHaveBeenLastCalledWith(
      "/neture/cooperative-management/c/eligibility",
      { eligibilityDescription: "약사 또는 일반 개인", reason: "정관 반영" },
    );
    await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  });
});
