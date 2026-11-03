import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AdminErasureHistoryPage from "./AdminErasureHistoryPage";
const fixture = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
  actor: { id: "admin-a", roles: ["platform:super_admin"] },
}));
vi.mock("@/api/base", () => ({ api: fixture.api }));
vi.mock("@o4o/auth-context", () => ({
  useAuth: () => ({ user: fixture.actor }),
}));
const pending = {
  operationId: "synthetic-operation",
  state: "retry_required",
  erased: false,
  remainingFileTasks: 1,
  errorCode: "ERASURE_STEP_FAILED",
};
function response(items: unknown[]) {
  return { data: { data: { items, hasNext: false } } };
}
beforeEach(() => {
  fixture.actor = { id: "admin-a", roles: ["platform:super_admin"] };
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fixture.api.get.mockImplementation(async (path: string) =>
    path.endsWith("erasure-readiness")
      ? {
          data: {
            data: {
              enabled: false,
              blockers: ["ACCOUNT_ERASURE_ROLLOUT_REQUIRED"],
            },
          },
        }
      : response([pending]),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
async function openSelected() {
  await screen.findByText(pending.operationId);
  fireEvent.click(
    within(screen.getByRole("table")).getAllByRole("checkbox")[1],
  );
  fireEvent.click(screen.getByRole("button", { name: "상태·실패·재시도" }));
}
it("retains read-only history while execution is OFF and never sends a retry", async () => {
  render(<AdminErasureHistoryPage />);
  await openSelected();
  expect(screen.getByText(/실행이 비활성화돼 있습니다/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "재시도" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "상태 확인" })).toBeEnabled();
  expect(fixture.api.post).not.toHaveBeenCalled();
});
it("reloads rows and selection only after actual completion", async () => {
  let completed = false;
  fixture.api.get.mockImplementation(async (path: string) =>
    path.endsWith("erasure-readiness")
      ? { data: { data: { enabled: true, blockers: [] } } }
      : response([
          {
            ...pending,
            ...(completed
              ? { state: "completed", erased: true, remainingFileTasks: 0 }
              : {}),
          },
        ]),
  );
  fixture.api.post.mockImplementation(async () => {
    completed = true;
    return {
      data: {
        data: {
          ...pending,
          state: "completed",
          erased: true,
          remainingFileTasks: 0,
        },
      },
    };
  });
  render(<AdminErasureHistoryPage />);
  await openSelected();
  fireEvent.click(screen.getByRole("button", { name: "재시도" }));
  await waitFor(() =>
    expect(
      within(screen.getByRole("table")).getByText("삭제 완료"),
    ).toBeTruthy(),
  );
  expect(
    within(screen.getByRole("table")).getAllByRole("checkbox")[1],
  ).not.toBeChecked();
  expect(screen.queryByRole("region", { name: "선택 삭제 처리" })).toBeNull();
});
it("discards the old actor’s late list response after authority changes", async () => {
  let resolveOld: (value: unknown) => void = () => {};
  const old = new Promise((resolve) => {
    resolveOld = resolve;
  });
  fixture.api.get.mockImplementation((path: string) =>
    path.endsWith("erasure-readiness")
      ? Promise.resolve({ data: { data: { enabled: false, blockers: [] } } })
      : fixture.actor.id === "admin-a"
        ? old
        : Promise.reject({ response: { status: 403 } }),
  );
  const view = render(<AdminErasureHistoryPage />);
  fixture.actor = { id: "admin-b", roles: [] };
  view.rerender(<AdminErasureHistoryPage />);
  await screen.findByRole("alert");
  await act(async () => resolveOld(response([pending])));
  expect(screen.queryByText(pending.operationId)).toBeNull();
});
it("clears the previous selection and detail before a filtered response arrives", async () => {
  render(<AdminErasureHistoryPage />);
  await openSelected();
  fixture.api.get.mockImplementation(async (path: string) =>
    path.endsWith("erasure-readiness")
      ? { data: { data: { enabled: false, blockers: [] } } }
      : response([]),
  );
  fireEvent.change(screen.getByLabelText("삭제 상태"), {
    target: { value: "completed" },
  });
  await waitFor(() =>
    expect(screen.queryByText(pending.operationId)).toBeNull(),
  );
  expect(screen.queryByRole("button", { name: "상태·실패·재시도" })).toBeNull();
});
