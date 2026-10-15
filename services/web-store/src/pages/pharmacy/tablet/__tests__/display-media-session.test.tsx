import { StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TabletProductListQuickEditor } from "../../../tablet/TabletProductListQuickEditor";
import { StoreSignageMediaEditor } from "../../StoreSignageMediaEditor";
import { createScreenSetSession } from "../screenSetSession";
import { videoPreviewUrl } from "../../signage/videoPreview";
import type { ProductListEditorData } from "../../../../api/tabletDisplays";
import type { ScreenSetBuilderApi } from "@o4o/tablet-screen-set-editor";
import type { SignageEditTarget } from "../../signage/signageMediaDraft";
const data = (name = "Screen A"): ProductListEditorData => ({
  screenSetId: "one",
  blockId: "block",
  hasProductListBlock: true,
  screenSetName: name,
  selected: [
    {
      productType: "local",
      productId: "one",
      name: "Product One",
      qrCodeId: null,
    },
  ],
  pool: {
    supplierProducts: [],
    localProducts: [
      { productType: "local", productId: "two", name: "Product Two" },
    ],
  },
});
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("read failure cannot become an empty product save and offers retry", async () => {
  const load = vi
    .fn()
    .mockRejectedValueOnce(new Error("private"))
    .mockResolvedValue(data());
  const save = vi.fn();
  render(
    <TabletProductListQuickEditor load={load} save={save} onClose={vi.fn()} />,
  );
  await screen.findByRole("alert");
  expect(
    (screen.getByTestId("quick-editor-save") as HTMLButtonElement).disabled,
  ).toBe(true);
  expect(
    screen.queryByText("선택된 상품이 없습니다. 오른쪽에서 추가하세요."),
  ).toBeNull();
  fireEvent.click(screen.getByText("다시 시도"));
  await screen.findByText("Product Two");
  expect(load).toHaveBeenCalledTimes(2);
  expect(save).not.toHaveBeenCalled();
});
it("serializes saves, locks input and keeps selection and search after failure", async () => {
  const pending = deferred<void>();
  const load = vi.fn().mockResolvedValue(data());
  const save = vi
    .fn()
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValue(undefined);
  const close = vi.fn();
  render(
    <TabletProductListQuickEditor load={load} save={save} onClose={close} />,
  );
  await screen.findByText("Product Two");
  fireEvent.change(screen.getByLabelText("상품명 검색"), {
    target: { value: "Two" },
  });
  fireEvent.click(screen.getByRole("button", { name: "추가" }));
  const button = screen.getByTestId("quick-editor-save");
  fireEvent.click(button);
  fireEvent.click(button);
  expect(save).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("상품명 검색").matches(":disabled")).toBe(true);
  fireEvent.click(screen.getByText("닫기"));
  expect(close).not.toHaveBeenCalled();
  await act(async () => pending.reject(new Error("private")));
  await screen.findByRole("alert");
  expect((screen.getByLabelText("상품명 검색") as HTMLInputElement).value).toBe(
    "Two",
  );
  expect(
    within(screen.getByTestId("quick-editor-selected")).getAllByRole(
      "listitem",
    ),
  ).toHaveLength(2);
  fireEvent.click(screen.getByTestId("quick-editor-save"));
  await act(async () => {});
  expect(save).toHaveBeenCalledTimes(2);
  expect(close).toHaveBeenCalledTimes(1);
});
it("ignores an old read and clears old selection when the screen changes", async () => {
  const pending = deferred<ProductListEditorData>();
  const a = () => pending.promise,
    b = vi.fn().mockResolvedValue(data("Screen B"));
  const save = vi.fn(),
    close = vi.fn();
  const h = render(
    <TabletProductListQuickEditor load={a} save={save} onClose={close} />,
  );
  h.rerender(
    <TabletProductListQuickEditor load={b} save={save} onClose={close} />,
  );
  await screen.findByText("빠른 상품 수정 — Screen B");
  await act(async () => pending.resolve(data("Screen A")));
  expect(screen.queryByText("빠른 상품 수정 — Screen A")).toBeNull();
});
it.each(["switch", "unmount"] as const)(
  "old save cannot close another screen after %s",
  async (mode) => {
    const pending = deferred<void>();
    const load = vi.fn().mockResolvedValue(data()),
      other = vi.fn().mockResolvedValue(data("Screen B"));
    const close = vi.fn(),
      saved = vi.fn(),
      save = () => pending.promise;
    const h = render(
      <TabletProductListQuickEditor
        load={load}
        save={save}
        onSaved={saved}
        onClose={close}
      />,
    );
    await screen.findByText("Product Two");
    fireEvent.click(screen.getByTestId("quick-editor-save"));
    if (mode === "unmount") h.unmount();
    else
      h.rerender(
        <TabletProductListQuickEditor
          load={other}
          save={save}
          onSaved={saved}
          onClose={close}
        />,
      );
    if (mode === "switch") {
      await screen.findByText("빠른 상품 수정 — Screen B");
      expect(
        (screen.getByTestId("quick-editor-save") as HTMLButtonElement).disabled,
      ).toBe(false);
    }
    await act(async () => pending.resolve());
    expect(close).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
  },
);
it("ignores a save completion when the store changes before React renders", async () => {
  let current = true;
  const pending = deferred<void>();
  const load = vi.fn().mockResolvedValue(data()),
    close = vi.fn();
  render(
    <TabletProductListQuickEditor
      load={load}
      save={() => pending.promise}
      onClose={close}
      isCurrent={() => current}
    />,
  );
  await screen.findByText("Product Two");
  fireEvent.click(screen.getByTestId("quick-editor-save"));
  current = false;
  await act(async () => pending.resolve());
  expect(close).not.toHaveBeenCalled();
});
it("StrictMode still loads an editable selection", async () => {
  render(
    <StrictMode>
      <TabletProductListQuickEditor
        load={async () => data()}
        save={vi.fn()}
        onClose={vi.fn()}
      />
    </StrictMode>,
  );
  await screen.findByText("Product Two");
  expect(
    (screen.getByTestId("quick-editor-save") as HTMLButtonElement).disabled,
  ).toBe(false);
});
function baseApi() {
  return {
    create: vi.fn().mockResolvedValue({ id: "created" }),
    update: vi.fn().mockResolvedValue({ id: "created" }),
    saveBlocks: vi.fn().mockResolvedValue([]),
    preview: vi.fn().mockResolvedValue({ sections: [] }),
    searchO4oDescriptions: vi.fn().mockResolvedValue([]),
    searchStoreContents: vi.fn().mockResolvedValue([]),
  };
}
it("retries a partially saved new set using its created header rather than duplicating it", async () => {
  const base = baseApi();
  base.saveBlocks.mockRejectedValueOnce(new Error("failed blocks"));
  const api = createScreenSetSession(
    base as unknown as ScreenSetBuilderApi,
    () => true,
  );
  const input = { name: "Draft", status: "active" as const };
  expect((await api.create(input)).id).toBe("created");
  await expect(api.saveBlocks("created", [])).rejects.toThrow("failed");
  await api.create({ ...input, name: "Corrected" });
  await api.saveBlocks("created", []);
  expect(base.create).toHaveBeenCalledTimes(1);
  expect(base.update).toHaveBeenCalledWith(
    "created",
    expect.objectContaining({ name: "Corrected" }),
  );
});
it("a failed header creation stays retryable", async () => {
  const base = baseApi();
  base.create.mockRejectedValueOnce(new Error("header"));
  const api = createScreenSetSession(
    base as unknown as ScreenSetBuilderApi,
    () => true,
  );
  await expect(api.create({ name: "Draft" })).rejects.toThrow("header");
  await api.create({ name: "Draft" });
  expect(base.create).toHaveBeenCalledTimes(2);
});
it("a closed builder cannot send subsequent blocks or reads in a new store", async () => {
  let current = true;
  const pending = deferred<{ id: string }>();
  const base = baseApi();
  base.create.mockReturnValue(pending.promise);
  const api = createScreenSetSession(
    base as unknown as ScreenSetBuilderApi,
    () => current,
  );
  const writing = api.create({ name: "Draft" });
  current = false;
  pending.resolve({ id: "created" });
  await expect(writing).rejects.toThrow("변경");
  await expect(api.saveBlocks("created", [])).rejects.toThrow("변경");
  await expect(api.searchStoreContents("q")).rejects.toThrow("변경");
  expect(base.saveBlocks).not.toHaveBeenCalled();
  expect(base.searchStoreContents).not.toHaveBeenCalled();
});
it("duplicate header submissions are rejected synchronously", async () => {
  const pending = deferred<{ id: string }>(),
    base = baseApi();
  base.create.mockReturnValue(pending.promise);
  const api = createScreenSetSession(
    base as unknown as ScreenSetBuilderApi,
    () => true,
  );
  const writing = api.create({ name: "Draft" });
  await expect(api.create({ name: "Draft" })).rejects.toThrow("진행");
  pending.resolve({ id: "created" });
  await writing;
  expect(base.create).toHaveBeenCalledTimes(1);
});
it.each([
  [
    "https://youtu.be/dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  ],
  [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  ],
  [
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  ],
  ["https://vimeo.com/12345", "https://player.vimeo.com/video/12345?dnt=1"],
  [
    "https://player.vimeo.com/video/12345",
    "https://player.vimeo.com/video/12345?dnt=1",
  ],
])("builds a safe supported video preview for %s", (value, url) =>
  expect(videoPreviewUrl(value)).toBe(url),
);
it.each([
  "javascript:alert(1)",
  "https://youtube.com.attacker.test/watch?v=dQw4w9WgXcQ",
  "https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ",
  "https://example.test/movie",
  "https://youtu.be/short",
  "",
])("does not embed unsupported or incomplete URLs: %s", (value) =>
  expect(videoPreviewUrl(value)).toBeNull(),
);
const target: SignageEditTarget = {
  kind: "direct",
  media: {
    id: "one",
    name: "Video",
    sourceUrl: "https://youtu.be/dQw4w9WgXcQ",
    sourceType: "youtube",
    createdAt: "2026-10-15",
    updatedAt: "2026-10-15",
    description: null,
    thumbnailUrl: null,
    embedId: null,
    mediaType: "video",
    source: "store",
    status: "active",
  },
};
function props() {
  return {
    target,
    draft: {
      name: "Video",
      description: "",
      tags: "",
      thumbnailUrl: "",
      sourceUrl: "https://youtu.be/dQw4w9WgXcQ",
    },
    onChange: vi.fn(),
    editSaving: false,
    editError: "",
    handleCloseEditDrawer: vi.fn(),
    handleDeleteFromDrawer: vi.fn(),
    handleSaveEdit: vi.fn(),
  };
}
it("preview is explicit and does not save, and changing the URL hides the old player", () => {
  const p = props(),
    h = render(<StoreSignageMediaEditor {...p} />);
  expect(screen.queryByTitle("입력한 동영상 미리보기")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "입력한 영상 미리보기" }));
  expect(
    screen.getByTitle("입력한 동영상 미리보기").getAttribute("src"),
  ).toContain("youtube-nocookie.com");
  expect(p.handleSaveEdit).not.toHaveBeenCalled();
  h.rerender(
    <StoreSignageMediaEditor
      {...p}
      draft={{ ...p.draft, sourceUrl: "https://vimeo.com/12345" }}
    />,
  );
  expect(screen.queryByTitle("입력한 동영상 미리보기")).toBeNull();
});
it("a saving media drawer locks all fields and close/cancel actions", () => {
  const p = props();
  render(<StoreSignageMediaEditor {...p} editSaving />);
  for (const field of screen.getAllByRole("textbox"))
    expect(field.matches(":disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  expect(p.handleCloseEditDrawer).not.toHaveBeenCalled();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(p.handleCloseEditDrawer).not.toHaveBeenCalled();
});
