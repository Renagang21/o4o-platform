import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FundingCreatePage from "./FundingCreatePage";
const { update } = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("../../api/trial", () => ({
  updateTrial: update,
  createTrial: vi.fn(),
  submitTrial: vi.fn(),
}));
vi.mock("@o4o/content-editor", () => ({ RichTextEditor: () => null }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  update.mockResolvedValue({ id: "trial" });
});
const initial: any = {
  id: "trial",
  title: "격리 펀딩",
  oneLiner: "격리 환경의 오프라인 펀딩 제안입니다",
  startDate: "2026-10-17T02:34:56.789Z",
  endDate: "2026-10-20T05:46:23.456Z",
  trialPeriodDays: 30,
};
it("keeps exact existing recruitment timestamps when saving an unrelated edit", async () => {
  render(
    <MemoryRouter>
      <FundingCreatePage mode="edit" trialId="trial" initialData={initial} />
    </MemoryRouter>,
  );
  expect(
    (screen.getByLabelText(/모집 시작일/) as HTMLInputElement).value,
  ).toMatch(/^2026-10-17T11:34:56(?:\.000)?$/);
  fireEvent.click(screen.getByRole("button", { name: "수정 완료" }));
  await waitFor(() =>
    expect(update).toHaveBeenCalledWith(
      "trial",
      expect.objectContaining({
        fundingStartAt: initial.startDate,
        fundingEndAt: initial.endDate,
      }),
    ),
  );
});
it("interprets an edited recruitment time as Korea time independently of browser timezone", async () => {
  render(
    <MemoryRouter>
      <FundingCreatePage mode="edit" trialId="trial" initialData={initial} />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText(/모집 종료일/), {
    target: { value: "2026-10-21T12:34:56" },
  });
  fireEvent.click(screen.getByRole("button", { name: "수정 완료" }));
  await waitFor(() =>
    expect(update).toHaveBeenCalledWith(
      "trial",
      expect.objectContaining({
        fundingStartAt: initial.startDate,
        fundingEndAt: "2026-10-21T03:34:56.000Z",
      }),
    ),
  );
});
