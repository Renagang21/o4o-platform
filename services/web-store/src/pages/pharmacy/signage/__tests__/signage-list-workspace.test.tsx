import { useLocation } from "react-router-dom";
import { MemoryRouter } from "react-router-dom";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StoreSignagePage } from "../../StoreSignagePage";

const api = vi.hoisted(() => ({
  playlists: vi.fn(),
  items: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  media: vi.fn(),
}));
vi.mock("../../../../contexts/StoreContext", () => ({ useUnifiedStore: () => ({ organizationId: "store-a", status: "ready" }) }));
vi.mock("../../../../contexts/AuthContext", () => ({ getAccessToken: () => null, useAuth: () => ({ user: null }) }));
vi.mock("../../../../lib/apiClient", () => ({ API_BASE_URL: "", api: { interceptors: { request: { use: vi.fn() } } } }));
vi.mock("../../../../lib/storeOrganizationHeader", () => ({
  getActiveStoreOrganizationId: () => "store-a",
  captureStoreOrganizationHeaders: (headers: HeadersInit) => new Headers(headers),
}));
vi.mock("../../../../api/assetSnapshot", () => ({
  storeAssetControlApi: { list: async () => ({ success: true, data: { items: [] } }) },
  assetSnapshotApi: { list: async () => ({ success: true, data: { items: [] } }), patch: vi.fn(), remove: vi.fn() },
}));
vi.mock("../../../../api/storePlaylist", () => ({
  fetchStorePlaylists: api.playlists,
  fetchPlaylistItems: api.items,
  fetchRequiredPlaylistVideos: async () => [],
  updateStorePlaylist: api.update,
  deleteStorePlaylist: api.remove,
  createStorePlaylist: vi.fn(),
  addPlaylistItem: vi.fn(),
  addPlaylistItemFromLibrary: vi.fn(),
  addPlaylistItemFromSignage: vi.fn(),
  reorderPlaylistItems: vi.fn(),
  deletePlaylistItem: vi.fn(),
}));
vi.mock("../../../../api/signageMedia", () => ({
  createYoutubeVideoApi: () => ({ list: async () => ({ availability: { ready: false }, items: [] }), enqueue: vi.fn(), retry: vi.fn(), cancel: vi.fn() }),
  fetchSignageMedia: api.media,
  updateSignageMedia: vi.fn(),
  deleteSignageMedia: vi.fn(),
  createSignageMedia: vi.fn(),
  registerSignageVideo: vi.fn(),
}));

const LIST = "/store/marketing/signage/playlist";
const playlist = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id, name, playlistType: "LIST", publishStatus: "published", isActive: true, sourcePlaylistId: null,
  createdAt: "2026-10-01", updatedAt: "2026-10-02", itemCount: 2, forcedCount: 0, totalDurationSec: 125, missingDurationCount: 0, ...extra,
});
function Where() {
  const { pathname } = useLocation();
  return <output data-testid="where">{pathname}</output>;
}
const open = (path: string) => render(<MemoryRouter initialEntries={[path]}><StoreSignagePage /><Where /></MemoryRouter>);
const where = () => screen.getByTestId("where").textContent;

beforeEach(() => {
  vi.resetAllMocks();
  api.playlists.mockResolvedValue([playlist("p1", "아침 안내"), playlist("p2", "저녁 안내", { publishStatus: "draft", itemCount: 0, totalDurationSec: 0, missingDurationCount: 1 })]);
  api.items.mockResolvedValue([]);
  api.media.mockResolvedValue([]);
  api.update.mockResolvedValue({});
  api.remove.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it("shows the playlist list first with the standard columns and no legacy steps", async () => {
  open(LIST);
  await screen.findByRole("link", { name: "아침 안내" });
  for (const label of ["이름", "동영상 수", "총 재생시간", "수정일"]) expect(screen.getByRole("columnheader", { name: label })).toBeTruthy();
  expect(screen.getByRole("heading", { level: 1, name: "재생목록" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "재생목록 만들기" })).toBeTruthy();
  expect(screen.queryByText("상세 관리")).toBeNull();
  expect(screen.queryByText("저장한 재생목록 선택")).toBeNull();
  expect(screen.getByText("2분 5초")).toBeTruthy();
  expect(screen.getByText(/미등록 1개 제외/)).toBeTruthy();
});

it("opens the detail by name link and by checking then editing from the action bar", async () => {
  open(LIST);
  fireEvent.click(await screen.findByLabelText("아침 안내 재생목록 선택"));
  fireEvent.click(screen.getByRole("button", { name: "선택 재생목록 수정" }));
  await waitFor(() => expect(where()).toBe(`${LIST}/p1`));
  await screen.findByRole("heading", { level: 1, name: "아침 안내" });
  await waitFor(() => expect(api.items).toHaveBeenCalledWith("p1"));
  fireEvent.click(screen.getByRole("link", { name: "재생목록 목록으로" }));
  fireEvent.click(await screen.findByRole("link", { name: "저녁 안내" }));
  await waitFor(() => expect(where()).toBe(`${LIST}/p2`));
});

it("restores a detail from its direct address and rejects an id outside this store", async () => {
  open(`${LIST}/p2`);
  await screen.findByRole("heading", { level: 1, name: "저녁 안내" });
  cleanup();
  open(`${LIST}/not-mine`);
  await screen.findByText(/이 매장에서 찾을 수 없는 재생목록입니다/);
  expect(api.items).not.toHaveBeenCalledWith("not-mine");
  expect(screen.getByRole("link", { name: "재생목록 목록으로" })).toBeTruthy();
});

it("deletes after confirmation, keeps the row on failure, and clears selection on search", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  api.remove.mockRejectedValueOnce(new Error("denied"));
  open(LIST);
  fireEvent.click(await screen.findByLabelText("아침 안내 재생목록 선택"));
  fireEvent.click(screen.getByRole("button", { name: "선택 재생목록 삭제" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("link", { name: "아침 안내" })).toBeTruthy();
  api.playlists.mockResolvedValue([playlist("p2", "저녁 안내")]);
  await waitFor(() => expect((screen.getByRole("button", { name: "선택 재생목록 삭제" }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "선택 재생목록 삭제" }));
  await waitFor(() => expect(screen.queryByRole("link", { name: "아침 안내" })).toBeNull());
  expect(api.remove).toHaveBeenCalledTimes(2);

  fireEvent.click(screen.getByLabelText("저녁 안내 재생목록 선택"));
  fireEvent.change(screen.getByLabelText("재생목록 검색어"), { target: { value: "저녁" } });
  fireEvent.click(screen.getByRole("button", { name: "검색" }));
  expect(screen.queryByRole("button", { name: "선택 재생목록 삭제" })).toBeNull();
});

it("returns to the list after deleting from the detail, and stays when deletion fails", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  api.remove.mockRejectedValueOnce(new Error("denied"));
  open(`${LIST}/p1`);
  await screen.findByRole("heading", { level: 1, name: "아침 안내" });
  fireEvent.click(screen.getByRole("button", { name: "재생목록 삭제" }));
  await screen.findByRole("alert");
  expect(where()).toBe(`${LIST}/p1`);
  api.playlists.mockResolvedValue([playlist("p2", "저녁 안내")]);
  await waitFor(() => expect((screen.getByRole("button", { name: "재생목록 삭제" }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "재생목록 삭제" }));
  await waitFor(() => expect(where()).toBe(LIST));
});

it("offers a central create action only on a truly empty list", async () => {
  api.playlists.mockResolvedValue([]);
  open(LIST);
  await screen.findByText("아직 만든 재생목록이 없습니다.");
  expect(screen.getAllByRole("button", { name: "재생목록 만들기" })).toHaveLength(2);
});

it("does not present a failed playlist read as an empty list and can retry", async () => {
  api.playlists.mockRejectedValueOnce(new Error("private"));
  open(LIST);
  await screen.findByRole("button", { name: "다시 시도" });
  expect(screen.queryByText("아직 만든 재생목록이 없습니다.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  await screen.findByRole("link", { name: "아침 안내" });
});
