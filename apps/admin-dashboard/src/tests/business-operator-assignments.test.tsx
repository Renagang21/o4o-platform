import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import Panel from "../pages/operators/BusinessOperatorAssignments";
const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@o4o/auth-client", () => ({ authClient: { api } }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
it("keeps old individual assignments revocable without changing the account or role assignments", async () => {
  let assigned = true;
  api.get.mockImplementation(async () => ({
    data: {
      success: true,
      data: [
        {
          key: "carepharm",
          name: "합성 사업",
          status: "active",
          operators: assigned ? [{ userId: "user", name: "합성 담당자" }] : [],
        },
      ],
    },
  }));
  api.delete.mockImplementation(async () => {
    assigned = false;
    return {};
  });
  render(<Panel />);
  await screen.findByText("합성 담당자");
  fireEvent.click(screen.getByText("사업별 개별 담당 지정"));
  fireEvent.click(screen.getByRole("button", { name: "개별 지정 해제" }));
  await screen.findByText("개별 담당 지정을 해제했습니다.");
  expect(api.delete).toHaveBeenCalledWith(
    "/neture/admin/semi-franchises/carepharm/operators/user",
  );
  expect(api.post).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("기타 사업")).not.toBeInTheDocument();
});
it("assigns an existing custom-business operator by search and selection, never typed UUID", async () => {
  api.get.mockImplementation(async (path: string) => ({
    data: {
      success: true,
      data: path.includes("/candidates")
        ? {
            candidates: [
              {
                userId: "candidate",
                name: "합성 후보",
                email: "candidate@example.invalid",
                hasGoogleLink: true,
              },
            ],
          }
        : [
            {
              key: "custom-business",
              name: "합성 기타 사업",
              status: "active",
              operators: [],
            },
          ],
    },
  }));
  api.post.mockResolvedValue({});
  render(<Panel />);
  await screen.findByLabelText("기타 사업");
  fireEvent.click(screen.getByText("사업별 개별 담당 지정"));
  fireEvent.change(screen.getByLabelText("기타 사업"), {
    target: { value: "custom-business" },
  });
  fireEvent.change(screen.getByLabelText("개별 담당자 검색"), {
    target: { value: "합성" },
  });
  fireEvent.click(screen.getByRole("button", { name: "담당자 검색" }));
  await screen.findByRole("option", { name: /합성 후보/ });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "담당자 검색" }),
    ).not.toBeDisabled(),
  );
  fireEvent.change(screen.getByLabelText("지정할 사용자"), {
    target: { value: "candidate" },
  });
  fireEvent.click(screen.getByRole("button", { name: "개별 담당 지정" }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      "/neture/admin/semi-franchises/custom-business/operators",
      { userId: "candidate" },
    ),
  );
});
