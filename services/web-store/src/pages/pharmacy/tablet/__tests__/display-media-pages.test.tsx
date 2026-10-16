import { StrictMode } from "react";
import { MemoryRouter } from "react-router-dom";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import TabletScreenSetManager from "../../TabletScreenSetManager";
import TabletPage from "../../StoreTabletDisplaysPage";
import { StoreSignagePage } from "../../StoreSignagePage";
const api = vi.hoisted(() => ({
  store: "A",
  active: "A",
  sets: vi.fn(),
  detail: vi.fn(),
  candidates: vi.fn(),
  displaySave: vi.fn(),
  slug: vi.fn(),
  settings: vi.fn(),
  media: vi.fn(),
  updateMedia: vi.fn(),
  removeMedia: vi.fn(),
  asset: vi.fn(),
  patchAsset: vi.fn(),
}));
vi.mock("../../../../contexts/StoreContext", () => ({
  useUnifiedStore: () => ({ organizationId: api.store, status: "ready" }),
}));
vi.mock("../../../../contexts/AuthContext", () => ({
  getAccessToken: () => null,
  useAuth: () => ({ user: null }),
}));
vi.mock("../../../../lib/apiClient", () => ({
  API_BASE_URL: "",
  api: { interceptors: { request: { use: vi.fn() } } },
}));
vi.mock("../../../../lib/storeOrganizationHeader", () => ({
  getActiveStoreOrganizationId: () => api.active,
  captureStoreOrganizationHeaders: (headers: HeadersInit) => new Headers(headers),
}));
vi.mock("../../../../api/pharmacyInfo", () => ({ getStoreSlug: api.slug }));
vi.mock("../../../../api/tablet", () => ({
  fetchTabletProducts: vi
    .fn()
    .mockResolvedValue({
      data: [],
      meta: { page: 1, total: 0, limit: 20, totalPages: 1 },
    }),
  fetchTabletSettings: api.settings,
  fetchTabletScreen: vi.fn().mockResolvedValue({ sections: [] }),
}));
vi.mock("../../../../api/tabletDisplays", async (original) => ({
  ...(await original<object>()),
  fetchTablets: async () => [
    { id: "corner", name: "Tablet A", location: "Corner A", is_active: true },
  ],
  fetchScreenSets: api.sets,
  fetchScreenSet: api.detail,
  fetchTabletDisplaySettings: async () => ({
    showQr: true,
    showPrice: true,
    autoSlideSeconds: 10,
    idleSlideSeconds: 10,
    showConsultationButton: false,
  }),
  fetchOperatorCommonIdleSelection: async () => null,
  fetchTabletDevices: async () => [],
  fetchProductPool: async () => ({
    supplierProducts: [],
    localProducts: [{ id: "product", name: "Product" }],
  }),
  fetchTabletDisplays: async () => [
    {
      product_type: "local",
      product_id: "product",
      sort_order: 0,
      is_visible: true,
      contentId: "linked",
    },
  ],
  fetchTabletIdlePlaylist: async () => [],
  saveTabletDisplays: api.displaySave,
}));
vi.mock("../../../../api/assetSnapshot", () => ({
  handledProductContentApi: { byProduct: api.candidates },
  storeAssetControlApi: { list: api.asset },
  assetSnapshotApi: { list: api.asset, patch: api.patchAsset },
}));
vi.mock("../../../../api/storePlaylist", () => ({
  fetchStorePlaylists: async () => [],
}));
vi.mock("../../../../api/signageSchedule", () => ({
  fetchSchedules: async () => [],
  fetchSignagePlaylists: async () => [],
}));
vi.mock("../../../../api/signageMedia", () => ({
  fetchSignageMedia: api.media,
  updateSignageMedia: api.updateMedia,
  deleteSignageMedia: api.removeMedia,
  createSignageMedia: vi.fn(),
}));
vi.mock("../../TabletContentLibraryList", () => ({
  default: ({
    sets,
    onEdit,
    onCreate,
  }: {
    sets: { id: string; name: string }[];
    onEdit: (id: string) => void;
    onCreate: () => void;
  }) => (
    <>
      <button onClick={onCreate}>New screen</button>
      {sets.map((s) => (
        <button key={s.id} onClick={() => onEdit(s.id)}>
          Edit {s.name}
        </button>
      ))}
    </>
  ),
}));
vi.mock("@o4o/tablet-screen-set-editor", async (original) => ({
  ...(await original<object>()),
  TabletContentStepBuilder: ({
    initialDetail,
    onCancel,
  }: {
    initialDetail: { name: string } | null;
    onCancel: () => void;
  }) => (
    <>
      <h2>Builder {initialDetail?.name ?? "new"}</h2>
      <button onClick={onCancel}>Close builder</button>
    </>
  ),
}));
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { resolve, reject, promise };
}
const settings = {
  showQr: true,
  showPrice: true,
  autoSlideSeconds: 10,
  idleSlideSeconds: 10,
};
const media = {
  id: "video",
  name: "Fixture video",
  sourceUrl: "https://youtu.be/dQw4w9WgXcQ",
  sourceType: "youtube",
  createdAt: "2026-10-15",
  updatedAt: "2026-10-15",
  thumbnailUrl: null,
  embedId: null,
  description: "",
  mediaType: "video",
  source: "store",
  status: "active",
};
beforeEach(() => {
  vi.clearAllMocks();
  api.store = api.active = "A";
  api.sets
    .mockReset()
    .mockResolvedValue([
      {
        id: "one",
        name: "One",
        templateKey: "corner_information_basic_v1",
        status: "active",
        updatedAt: "2026-10-15",
      },
    ]);
  api.detail
    .mockReset()
    .mockResolvedValue({
      id: "one",
      name: "One",
      blocks: [],
      templateKey: "corner_information_basic_v1",
    });
  api.candidates
    .mockReset()
    .mockResolvedValue({
      data: {
        items: [
          {
            contentId: "linked",
            title: "Linked description",
            status: "draft",
            updatedAt: "2026-10-15",
          },
        ],
      },
    });
  api.displaySave.mockReset().mockResolvedValue(undefined);
  api.slug.mockReset().mockResolvedValue("fixture");
  api.settings.mockReset().mockResolvedValue(settings);
  api.asset
    .mockReset()
    .mockResolvedValue({ success: true, data: { items: [] } });
  api.media.mockReset().mockResolvedValue([media]);
  api.updateMedia.mockReset().mockResolvedValue({ ...media, name: "Updated" });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const wrap = (
  child: React.ReactNode,
  path = "/store/commerce/tablet-displays",
) => <MemoryRouter initialEntries={[path]}>{child}</MemoryRouter>;
it("screen-set list failure has retry rather than a usable empty library", async () => {
  api.sets.mockRejectedValueOnce(new Error("private"));
  render(<TabletScreenSetManager onToast={vi.fn()} />);
  await screen.findByRole("alert");
  expect(screen.queryByText("New screen")).toBeNull();
  fireEvent.click(screen.getByText("다시 시도"));
  await screen.findByText("Edit One");
});
it("new creation invalidates a previously requested edit", async () => {
  const old = deferred<{ id: string; name: string }>();
  api.detail.mockReturnValue(old.promise);
  render(<TabletScreenSetManager onToast={vi.fn()} />);
  fireEvent.click(await screen.findByText("Edit One"));
  fireEvent.click(screen.getByText("New screen"));
  await screen.findByRole("heading", { name: "Builder new" });
  await act(async () => old.resolve({ id: "one", name: "Old" }));
  expect(screen.queryByRole("heading", { name: "Builder Old" })).toBeNull();
});
it("explicitly canceling an edit read prevents a late builder from reopening", async () => {
  const old = deferred<{ id: string; name: string }>();
  api.detail.mockReturnValue(old.promise);
  render(<TabletScreenSetManager onToast={vi.fn()} />);
  fireEvent.click(await screen.findByText("Edit One"));
  fireEvent.click(screen.getByText("불러오기 취소"));
  await act(async () => old.resolve({ id: "one", name: "One" }));
  expect(screen.queryByRole("heading", { name: "Builder One" })).toBeNull();
});
it("StrictMode auto-edit opens after the replayed initial request", async () => {
  render(
    <StrictMode>
      <TabletScreenSetManager onToast={vi.fn()} autoEditId="one" />
    </StrictMode>,
  );
  await screen.findByRole("heading", { name: "Builder One" });
});
it("switching stores closes a builder and ignores the old pending detail", async () => {
  const old = deferred<{ id: string; name: string }>();
  api.detail.mockReturnValue(old.promise);
  const notify = vi.fn();
  const h = render(<TabletScreenSetManager onToast={notify} />);
  fireEvent.click(await screen.findByText("Edit One"));
  api.store = api.active = "B";
  h.rerender(<TabletScreenSetManager onToast={notify} />);
  await act(async () => old.resolve({ id: "one", name: "Old" }));
  expect(screen.queryByRole("heading", { name: "Builder Old" })).toBeNull();
  expect(notify).not.toHaveBeenCalled();
});
async function openAdvanced() {
  render(wrap(<TabletPage />));
  await screen.findByText("Corner A");
  fireEvent.click(screen.getByText("Corner A"));
  fireEvent.click(await screen.findByText(/고급 설정 \(대기화면/));
}
it("a failed description lookup preserves the saved content link until a successful retry", async () => {
  api.candidates.mockRejectedValueOnce(new Error("private"));
  await openAdvanced();
  await screen.findByText(/기존 연결은 유지합니다/);
  fireEvent.click(screen.getByRole("button", { name: "설명 다시 시도" }));
  await screen.findByRole("option", { name: /Linked description/ });
  expect(api.candidates).toHaveBeenCalledTimes(2);
});
it("a canceled public preview cannot reopen after a delayed settings reply", async () => {
  const pending = deferred<typeof settings>();
  api.settings.mockReturnValue(pending.promise);
  render(wrap(<TabletPage />));
  fireEvent.click(await screen.findByRole("button", { name: "미리보기" }));
  await screen.findByText("미리보기 불러오기 취소");
  fireEvent.click(screen.getByText("미리보기 불러오기 취소"));
  await act(async () => pending.resolve(settings));
  expect(screen.queryByText("고객 화면 미리보기")).toBeNull();
});
it("preview settings failure does not silently use defaults", async () => {
  api.settings.mockRejectedValue(new Error("private"));
  render(wrap(<TabletPage />));
  fireEvent.click(await screen.findByRole("button", { name: "미리보기" }));
  await screen.findByText(/저장된 고객 화면을 불러오지 못했습니다/);
  expect(screen.queryByText("고객 화면 미리보기")).toBeNull();
});
it("media read failure differs from no videos and is retryable", async () => {
  api.media.mockRejectedValueOnce(new Error("private"));
  render(wrap(<StoreSignagePage />, "/store/marketing/signage/videos"));
  await screen.findByText("동영상 다시 시도");
  expect(screen.queryByText("동영상이 없습니다.")).toBeNull();
  fireEvent.click(screen.getByText("동영상 다시 시도"));
  await screen.findByText("Fixture video");
});
it("media save keeps a failed draft, serializes submissions and closes only after success", async () => {
  const pending = deferred<typeof media>();
  api.updateMedia.mockReturnValueOnce(pending.promise);
  render(wrap(<StoreSignagePage />, "/store/marketing/signage/videos"));
  fireEvent.click(await screen.findByRole("button", { name: "편집" }));
  const title = screen.getByLabelText(/제목/);
  fireEvent.change(title, { target: { value: "Updated" } });
  const save = screen.getByRole("button", { name: "저장" });
  fireEvent.click(save);
  fireEvent.click(save);
  expect(api.updateMedia).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  expect(screen.getByRole("dialog")).toBeTruthy();
  await act(async () => pending.reject(new Error("synthetic")));
  await screen.findByRole("alert");
  expect((screen.getByLabelText(/제목/) as HTMLInputElement).value).toBe(
    "Updated",
  );
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(screen.queryByLabelText(/제목/)).toBeNull());
});

it.each([
  { type: "video", sourceUrl: "https://fixtures.example.test/clip.mp4" },
  { type: "image", sourceUrl: "https://fixtures.example.test/poster.png" },
  { type: "html", sourceUrl: "", html: "<p>Fixture information</p>" },
])(
  "saves metadata for a $type snapshot without requiring an iframe provider",
  async (content) => {
    const snapshot = {
      id: "snapshot",
      title: "Copied fixture",
      assetType: "signage",
      publishStatus: "draft",
      channelMap: {},
      isForced: false,
      isLocked: false,
      createdAt: "2026-10-15",
      contentJson: content,
    };
    api.media.mockResolvedValue([]);
    api.asset.mockResolvedValue({ success: true, data: { items: [snapshot] } });
    api.patchAsset
      .mockReset()
      .mockResolvedValue({
        success: true,
        data: { ...snapshot, title: "Edited copy" },
      });
    render(wrap(<StoreSignagePage />, "/store/marketing/signage/videos"));
    fireEvent.click(await screen.findByRole("button", { name: "편집" }));
    expect(screen.queryByTitle("입력한 동영상 미리보기")).toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "입력한 영상 미리보기",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.change(screen.getByLabelText(/제목/), {
      target: { value: "Edited copy" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(api.patchAsset).toHaveBeenCalledWith(
        "snapshot",
        expect.objectContaining({
          title: "Edited copy",
          sourceUrl: content.sourceUrl || undefined,
        }),
      ),
    );
    await waitFor(() => expect(screen.queryByLabelText(/제목/)).toBeNull());
    expect(api.updateMedia).not.toHaveBeenCalled();
  },
);
