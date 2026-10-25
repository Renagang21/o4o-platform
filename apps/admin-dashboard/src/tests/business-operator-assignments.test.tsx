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
  api.post.mockImplementation(async (path: string) => {
    // The server accepts the selected user only as the final route parameter.
    if (path !== "/neture/admin/semi-franchises/custom-business/operators/candidate")
      throw new Error("Unregistered assignment endpoint");
    return { data: { success: true, data: { assigned: true } } };
  });
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
      "/neture/admin/semi-franchises/custom-business/operators/candidate",
    ),
  );
  await screen.findByText("담당자를 지정했습니다.");
});


it("preserves a committed revocation when registry refresh fails and retries only the read", async () => {
  const registry = [{ key: "carepharm", name: "합성 사업", status: "active", operators: [{ userId: "user", name: "합성 담당자" }] }];
  api.get.mockResolvedValueOnce({ data: { success: true, data: registry } })
    .mockRejectedValueOnce(new Error("Temporary registry failure"))
    .mockResolvedValueOnce({ data: { success: true, data: [] } });
  api.delete.mockResolvedValue({ data: { success: true, data: { revoked: true } } });
  render(<Panel />);
  await screen.findByText("합성 담당자");
  fireEvent.click(screen.getByText("사업별 개별 담당 지정"));
  fireEvent.click(screen.getByRole("button", { name: "개별 지정 해제" }));
  await screen.findByText("개별 담당 지정을 해제했습니다.");
  expect(await screen.findByRole("alert")).toHaveTextContent("변경은 완료됐지만 최신 담당 지정을 확인하지 못했습니다.");
  expect(screen.queryByText(/처리하지 못했습니다/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "담당 지정 다시 조회" }));
  await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  await waitFor(() => expect(screen.queryByText("합성 담당자")).not.toBeInTheDocument());
  expect(api.delete).toHaveBeenCalledTimes(1);
  expect(api.get).toHaveBeenCalledTimes(3);
  expect(screen.getByText("개별 담당 지정을 해제했습니다.")).toBeInTheDocument();
});
