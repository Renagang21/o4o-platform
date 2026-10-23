import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
const api = vi.hoisted(() => ({ collection: vi.fn(), collect: vi.fn() }));
vi.mock("../communityHomeApi", () => ({ homeApi: api }));
import { CommunityNewsCollectionPanel } from "../CommunityNewsCollectionPanel";
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  api.collection.mockResolvedValue(null);
});
it("reads stored state without triggering collection or AI and refreshes the list after explicit collection", async () => {
  const changed = vi.fn();
  api.collect.mockResolvedValue({
    day: "2026-10-23",
    state: "partial",
    sources: [
      { id: "kpanews", added: 2, status: "ok" },
      { id: "dailypharm", added: 0, status: "ROBOTS_BLOCKED" },
    ],
  });
  render(<CommunityNewsCollectionPanel onCollected={changed} />);
  await waitFor(() =>
    expect(screen.getByText("오늘의 기사 수집").hasAttribute("disabled")).toBe(
      false,
    ),
  );
  expect(api.collect).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("오늘의 기사 수집"));
  await screen.findByText("약사공론: 신규 2개");
  expect(changed).toHaveBeenCalledTimes(1);
  expect(
    screen.getByText("데일리팜: 수집 확인 필요 · 직접 기사 등록 가능"),
  ).toBeTruthy();
  expect(screen.getByText("오늘의 기사 수집").hasAttribute("disabled")).toBe(
    true,
  );
  fireEvent.click(screen.getByText("수집 결과 다시 확인"));
  await waitFor(() => expect(api.collection).toHaveBeenCalledTimes(2));
  expect(api.collect).toHaveBeenCalledTimes(1);
});
it("shows an explicit fetch error without claiming there are no articles", async () => {
  api.collection.mockRejectedValue(Error());
  render(<CommunityNewsCollectionPanel onCollected={vi.fn()} />);
  await screen.findByRole("alert");
  expect(screen.queryByText("신규 0개")).toBeNull();
  expect(api.collect).not.toHaveBeenCalled();
});
