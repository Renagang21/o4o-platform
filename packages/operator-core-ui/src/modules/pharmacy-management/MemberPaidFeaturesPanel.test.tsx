// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemberPaidFeaturesPanel } from "./MemberPaidFeaturesPanel";
const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("./api", () => ({ getPharmacyManagementClient: () => api }));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockImplementation(async (path: string) => ({
    data: {
      success: true,
      data: path.endsWith("/access")
        ? {
            paidEligible: false,
            accountStatus: "active",
            accountActive: true,
            pharmacies: [],
          }
        : {
            id: "member",
            email: "fixture@example.test",
            name: "합성 회원",
            active: false,
            endsAt: null,
          },
    },
  }));
  api.put.mockResolvedValue({ data: { success: true } });
});
it("looks up an exact member and saves member status rather than a store subscription", async () => {
  render(<MemberPaidFeaturesPanel />);
  fireEvent.change(screen.getByLabelText("회원 이메일"), {
    target: { value: "fixture@example.test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "회원 조회" }));
  fireEvent.click(await screen.findByLabelText("유료 자격 활성"));
  fireEvent.change(screen.getByLabelText("유료 자격 만료일"), {
    target: { value: "2030-01-01T09:00" },
  });
  fireEvent.click(screen.getByRole("button", { name: "유료 자격 저장" }));
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith(
      "/neture/admin/member-paid-entitlements/member",
      { active: true, endsAt: "2030-01-01T00:00:00.000Z" },
    ),
  );
  fireEvent.change(screen.getByLabelText("회원 이메일"), {
    target: { value: "another@example.test" },
  });
  expect(screen.queryByRole("button", { name: "유료 자격 저장" })).toBeNull();
});
it("preserves selection after a failed write and supports retry and cancellation", async () => {
  api.put.mockRejectedValueOnce(new Error("offline"));
  render(<MemberPaidFeaturesPanel />);
  fireEvent.change(screen.getByLabelText("회원 이메일"), {
    target: { value: "fixture@example.test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "회원 조회" }));
  fireEvent.click(await screen.findByLabelText("유료 자격 활성"));
  fireEvent.click(screen.getByRole("button", { name: "유료 자격 저장" }));
  await screen.findByText("저장하지 못했습니다. 다시 시도해 주세요.");
  expect(
    (screen.getByLabelText("유료 자격 활성") as HTMLInputElement).checked,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "유료 자격 저장" }));
  await screen.findByText("회원 유료 자격을 저장했습니다.");
  fireEvent.click(screen.getByLabelText("유료 자격 활성"));
  fireEvent.click(screen.getByRole("button", { name: "유료 자격 저장" }));
  await waitFor(() =>
    expect(api.put).toHaveBeenLastCalledWith(expect.any(String), {
      active: false,
      endsAt: null,
    }),
  );
});
it("shows paid eligibility, approved memberships and the union sources without offering service approval", async () => {
  api.get.mockImplementation(async (path: string) => ({
    data: {
      success: true,
      data: path.endsWith("/access")
        ? {
            paidEligible: false,
            accountStatus: "active",
            accountActive: true,
            pharmacies: [
              {
                id: "store",
                name: "합성 약국",
                pharmacyStatus: "active",
                memberships: [
                  {
                    key: "carepharm",
                    name: "합성 협력사업",
                    status: "active",
                    businessStatus: "active",
                  },
                ],
                features: [
                  {
                    key: "tablet",
                    label: "태블릿",
                    allowed: true,
                    sources: [
                      {
                        type: "semi-franchise",
                        key: "carepharm",
                        name: "합성 협력사업",
                      },
                      { type: "default", key: "default", name: "기본 제공" },
                    ],
                  },
                  {
                    key: "consultation",
                    label: "약사 상담",
                    allowed: false,
                    requiresProfessional: true,
                    sources: [],
                  },
                ],
              },
            ],
          }
        : {
            id: "member",
            email: "fixture@example.test",
            name: "합성 회원",
            active: true,
            endsAt: "2020-01-01T00:00:00Z",
          },
    },
  }));
  render(<MemberPaidFeaturesPanel />);
  fireEvent.change(screen.getByLabelText("회원 이메일"), {
    target: { value: "fixture@example.test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "회원 조회" }));
  await screen.findByText("유효한 유료 자격: 없음");
  expect(screen.getByText("합성 약국")).toBeTruthy();
  expect(screen.getByText(/합성 협력사업 가입으로 제공/)).toBeTruthy();
  expect(screen.getByText("약사 사용 확인이 별도로 필요합니다.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "승인" })).toBeNull();
  expect(api.put).not.toHaveBeenCalled();
});
it("does not present a failed access lookup as no entitlements and can retry it", async () => {
  let failed = true;
  api.get.mockImplementation(async (path: string) => {
    if (path.endsWith("/access")) {
      if (failed) throw new Error("offline");
      return {
        data: {
          success: true,
          data: {
            paidEligible: true,
            accountActive: true,
            accountStatus: "active",
            pharmacies: [],
          },
        },
      };
    }
    return {
      data: {
        success: true,
        data: {
          id: "member",
          email: "fixture@example.test",
          name: "합성 회원",
          active: true,
          endsAt: null,
        },
      },
    };
  });
  render(<MemberPaidFeaturesPanel />);
  fireEvent.change(screen.getByLabelText("회원 이메일"), {
    target: { value: "fixture@example.test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "회원 조회" }));
  await screen.findByRole("alert");
  expect(screen.queryByText("유효한 유료 자격: 없음")).toBeNull();
  failed = false;
  fireEvent.click(screen.getByRole("button", { name: "이용 자격 다시 조회" }));
  await screen.findByText("유효한 유료 자격: 있음");
});
it("treats malformed nested grants as unavailable instead of crashing or inventing empty access", async () => {
  api.get.mockImplementation(async (path: string) => ({
    data: {
      success: true,
      data: path.endsWith("/access")
        ? {
            paidEligible: true,
            accountStatus: "active",
            accountActive: true,
            pharmacies: [{ id: "store", name: "Synthetic", memberships: null }],
          }
        : {
            id: "member",
            email: "fixture@example.test",
            name: "합성 회원",
            active: true,
            endsAt: null,
          },
    },
  }));
  render(<MemberPaidFeaturesPanel />);
  fireEvent.change(screen.getByLabelText("회원 이메일"), {
    target: { value: "fixture@example.test" },
  });
  fireEvent.click(screen.getByRole("button", { name: "회원 조회" }));
  await screen.findByRole("alert");
  expect(screen.queryByText("유효한 유료 자격: 있음")).toBeNull();
});
