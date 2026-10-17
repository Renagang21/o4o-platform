import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import Panel from "./CertificateHistoryPanel";
const history = vi.hoisted(() => vi.fn());
vi.mock("../../api/lecture", () => ({
  operatorApi: { certificateHistory: history },
  errorMessage: () => "조회 실패",
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const id = "10000000-0000-4000-8000-000000000001";
const entry = {
  id: "event",
  action: "lecture.certificate.revoked",
  at: "2026-10-17T00:00:00Z",
  actorId: "operator",
  source: "manual",
  certificateId: id,
  courseId: "course",
  subjectId: "learner",
  before: { isValid: true, expiresAt: null },
  after: { isValid: false, expiresAt: null },
  reason: "오발급 확인",
  months: null,
};
it("shows private operation evidence and reloads after a saved command", async () => {
  history.mockResolvedValue({
    success: true,
    data: { items: [entry], page: 1, hasMore: false },
  });
  const view = render(<Panel id={id} revision={0} busy={false} />);
  expect(await screen.findByText("폐기 사유: 오발급 확인")).toBeTruthy();
  expect(screen.getByText("처리자 operator")).toBeTruthy();
  history.mockRejectedValueOnce(new Error("read failed"));
  view.rerender(<Panel id={id} revision={1} busy={false} />);
  expect((await screen.findByRole("alert")).textContent).toContain(
    "이력 조회만",
  );
  fireEvent.click(screen.getByText("이력 다시 조회"));
  expect(await screen.findByText("폐기 사유: 오발급 확인")).toBeTruthy();
  expect(history).toHaveBeenCalledTimes(3);
});
it("discards an earlier target response and distinguishes empty history", async () => {
  let finish!: (v: unknown) => void;
  history
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce({
      success: true,
      data: { items: [], hasMore: false, page: 1 },
    });
  const view = render(<Panel id={id} revision={0} busy={false} />);
  view.rerender(
    <Panel
      id="10000000-0000-4000-8000-000000000002"
      revision={0}
      busy={false}
    />,
  );
  await screen.findByText(/과거 처리 여부를 의미하지는/);
  await act(async () => {
    finish({
      success: true,
      data: { items: [entry], page: 1, hasMore: false },
    });
  });
  expect(screen.queryByText("폐기 사유: 오발급 확인")).toBeNull();
});
it("does not query while the target UUID is incomplete", () => {
  render(<Panel id="partial" revision={0} busy={false} />);
  expect(history).not.toHaveBeenCalled();
});
