import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { printQrSelection } from "../pharmacy/qr/printQrSelection";
import {
  readSignageMediaDraft,
  signageMediaMetadata,
  type SignageEditTarget,
} from "../pharmacy/signage/signageMediaDraft";
import { StoreSignageMediaEditor } from "../pharmacy/StoreSignageMediaEditor";
import type { SignageMediaItem } from "../../api/signageMedia";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const baseRequest = {
  apiBase: "/api/v1/kpa",
  qrIds: ["selected"],
  productQrIds: ["product-1", "product-2"],
  headers: {
    Authorization: "Bearer synthetic",
    "X-Store-Organization-Id": "store-A",
  },
};
it("QR sheet request preserves selected ids, authentication and captured store headers", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("pdf"));
  vi.stubGlobal("fetch", fetch);
  const show = vi.fn();
  expect(
    await printQrSelection({ ...baseRequest, template: "sheet" }, show),
  ).toBe(1);
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe("/api/v1/kpa/pharmacy/qr/print");
  expect(JSON.parse(options.body)).toEqual({ qrIds: ["selected"] });
  expect(options.headers.get("x-store-organization-id")).toBe("store-A");
  expect(options.headers.get("authorization")).toBe("Bearer synthetic");
  expect(options.headers.get("content-type")).toBe("application/json");
  expect(show).toHaveBeenCalledTimes(1);
});
it.each([
  ["flyer1", 1],
  ["flyer4", 4],
  ["flyer8", 8],
] as const)(
  "%s keeps the original store throughout a multi-PDF request",
  async (template, number) => {
    const headers = new Headers(baseRequest.headers),
      observed: string[] = [];
    const fetch = vi.fn().mockImplementation(async (_url, options) => {
      observed.push(options.headers.get("x-store-organization-id"));
      headers.set("X-Store-Organization-Id", "store-B");
      return new Response("pdf");
    });
    vi.stubGlobal("fetch", fetch);
    const show = vi.fn();
    expect(
      await printQrSelection({ ...baseRequest, headers, template }, show),
    ).toBe(2);
    expect(observed).toEqual(["store-A", "store-A"]);
    expect(fetch.mock.calls.map((call) => call[0])).toEqual([
      `/api/v1/kpa/pharmacy/qr/product-1/flyer?template=${number}`,
      `/api/v1/kpa/pharmacy/qr/product-2/flyer?template=${number}`,
    ]);
    expect(show).toHaveBeenCalledTimes(2);
  },
);
it("a non-product selection does not call the flyer API", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const show = vi.fn();
  expect(
    await printQrSelection(
      { ...baseRequest, productQrIds: [], template: "flyer1" },
      show,
    ),
  ).toBe(0);
  expect(fetch).not.toHaveBeenCalled();
  expect(show).not.toHaveBeenCalled();
});
it("a partial flyer failure reports failure after already generated PDFs and stops later requests", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response("first"))
    .mockResolvedValueOnce(new Response("failed", { status: 503 }));
  vi.stubGlobal("fetch", fetch);
  const show = vi.fn();
  await expect(
    printQrSelection(
      {
        ...baseRequest,
        productQrIds: ["one", "two", "three"],
        template: "flyer4",
      },
      show,
    ),
  ).rejects.toThrow("Flyer generation failed");
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(show).toHaveBeenCalledTimes(1);
});
it("failed sheet responses never become a PDF preview", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("failed", { status: 503 })),
  );
  const show = vi.fn();
  await expect(
    printQrSelection({ ...baseRequest, template: "sheet" }, show),
  ).rejects.toThrow("Print failed");
  expect(show).not.toHaveBeenCalled();
});
const direct: SignageEditTarget = {
  kind: "direct",
  media: {
    id: "media",
    name: "Original",
    description: null,
    sourceUrl: "https://example.test/video",
    sourceType: "youtube",
    thumbnailUrl: null,
    tags: ["one", "two"],
    createdAt: "2026-10-13T00:00:00Z",
  } as SignageMediaItem,
};
it("direct media draft preserves direct source fields and null defaults", () => {
  expect(readSignageMediaDraft(direct)).toEqual({
    name: "Original",
    description: "",
    tags: "one, two",
    thumbnailUrl: "",
    sourceUrl: "https://example.test/video",
  });
});
it("snapshot draft reads its owned content without merging direct media metadata", () => {
  const target: SignageEditTarget = {
    kind: "snapshot",
    snapshot: {
      id: "snapshot",
      organizationId: "fixture",
      sourceService: "kpa",
      sourceAssetId: "source",
      assetType: "signage",
      createdBy: "fixture",
      createdAt: "2026-10-13T00:00:00Z",
      publishStatus: "draft",
      controlId: null,
      controlUpdatedAt: null,
      channelMap: {},
      isForced: false,
      forcedByAdminId: null,
      forcedStartAt: null,
      forcedEndAt: null,
      isLocked: false,
      snapshotType: "user_copy",
      lifecycleStatus: "active",
      title: "Copy",
      contentJson: {
        description: "Text",
        tags: ["owned"],
        sourceUrl: "https://example.test/copied",
        thumbnailUrl: "https://example.test/thumb",
      },
    },
  };
  expect(readSignageMediaDraft(target)).toEqual({
    name: "Copy",
    description: "Text",
    tags: "owned",
    sourceUrl: "https://example.test/copied",
    thumbnailUrl: "https://example.test/thumb",
  });
});
it("metadata preserves explicit tag clearing and optional URL/description omission", () => {
  expect(
    signageMediaMetadata({
      name: "Name",
      description: " ",
      tags: " , ",
      thumbnailUrl: " ",
      sourceUrl: " ",
    }),
  ).toEqual({
    description: undefined,
    tags: [],
    thumbnailUrl: undefined,
    sourceUrl: undefined,
  });
});
it("editor input emits a single field action without resetting another field", () => {
  const change = vi.fn();
  const draft = readSignageMediaDraft(direct);
  render(
    <StoreSignageMediaEditor
      target={direct}
      draft={draft}
      onChange={change}
      editSaving={false}
      editError=""
      handleCloseEditDrawer={vi.fn()}
      handleDeleteFromDrawer={vi.fn()}
      handleSaveEdit={vi.fn()}
    />,
  );
  expect(screen.getByLabelText("동영상 URL")).toBeTruthy();
  expect(screen.getByLabelText("설명")).toBeTruthy();
  expect(screen.getByLabelText(/태그/)).toBeTruthy();
  expect(screen.getByLabelText("썸네일 URL")).toBeTruthy();
  fireEvent.change(screen.getByLabelText(/제목/), {
    target: { value: "Edited" },
  });
  expect(change).toHaveBeenCalledWith("name", "Edited");
  expect(draft.tags).toBe("one, two");
});
it("editor reports failure and blocks delete/save while the write is pending", () => {
  const remove = vi.fn();
  render(
    <StoreSignageMediaEditor
      target={direct}
      draft={readSignageMediaDraft(direct)}
      onChange={vi.fn()}
      editSaving={true}
      editError="Save failed"
      handleCloseEditDrawer={vi.fn()}
      handleDeleteFromDrawer={remove}
      handleSaveEdit={vi.fn()}
    />,
  );
  expect(screen.getByRole("alert").textContent).toBe("Save failed");
  const button = screen.getByRole("button", {
    name: "삭제",
  }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.click(button);
  expect(remove).not.toHaveBeenCalled();
});
