import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const api = vi.hoisted(() => ({ review: vi.fn(), runReview: vi.fn() }));
vi.mock("../communityHomeApi", () => ({ homeApi: api }));
import { CommunityNewsReviewPanel } from "../CommunityNewsReviewPanel";
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  api.review.mockResolvedValue(null);
});
const result = {
  id: "review",
  day: "2026-10-21",
  state: "done",
  items: [
    {
      id: "article",
      title: "실무 해설",
      summary: "제공된 요약",
      linkUrl: "https://dailypharm.com/user/news/1",
      sourceName: "데일리팜",
      recommended: true,
      reason: "실무 참고",
    },
  ],
};
describe("operator news draft review", () => {
  it("loads saved results without invoking AI, and only fills the draft on explicit action", async () => {
    api.review.mockResolvedValue(result);
    const apply = vi.fn();
    render(<CommunityNewsReviewPanel onApply={apply} />);
    await screen.findByText("실무 해설 ↗");
    expect(api.runReview).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("편집 초안에 적용"));
    expect(apply).toHaveBeenCalledWith(result.items[0], "review");
    expect(screen.getByText("오늘의 초안 정리").hasAttribute("disabled")).toBe(
      true,
    );
    fireEvent.click(screen.getByText("저장된 결과 다시 확인"));
    await waitFor(() => expect(api.review).toHaveBeenCalledTimes(2));
    expect(api.runReview).not.toHaveBeenCalled();
  });
  it("requires explicit AI action and shows failure with no automatic retry", async () => {
    api.runReview.mockResolvedValue({ ...result, state: "failed", items: [] });
    render(<CommunityNewsReviewPanel onApply={vi.fn()} />);
    await waitFor(() => expect(api.review).toHaveBeenCalled());
    fireEvent.click(screen.getByText("오늘의 초안 정리"));
    await screen.findByRole("alert");
    expect(api.runReview).toHaveBeenCalledTimes(1);
    expect(screen.getByText("오늘의 초안 정리").hasAttribute("disabled")).toBe(
      true,
    );
  });
});
