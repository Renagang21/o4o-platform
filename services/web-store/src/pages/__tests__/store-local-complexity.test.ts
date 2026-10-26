import { describe, expect, it, vi, afterEach } from "vitest";
import { buildLibraryQrPayload } from "../pharmacy/qr/libraryQrPayload";
import {
  resolveTabletDisplayEntries,
  toTabletDisplayPayload,
  tabletDisplayPayloadsEqual,
  appendSelectedTabletProducts,
  moveTabletDisplayEntry,
  type TabletDisplayEntry,
} from "../pharmacy/tablet/tabletDisplayDraft";
import {
  buildSignageVideoList,
  filterSignageVideos,
  summarizePlaylistDuration,
} from "../pharmacy/signage/signageVideoList";
import type { AssetSelectorResult } from "../../components/store/StoreAssetSelectorModal";
import type { StoreAssetItem } from "../../api/assetSnapshot";
import type { SignageMediaItem } from "../../api/signageMedia";
import type { ProductPool } from "../../api/tabletDisplays";

afterEach(() => vi.useRealTimers());
const library: AssetSelectorResult = {
  id: "source-id",
  title: "Original",
  category: null,
  fileUrl: null,
  assetType: "content",
  url: "https://example.test/public",
  htmlContent: "<p>Text</p>",
};
const draft = {
  library,
  title: "  Edited  ",
  description: "  Description  ",
  slug: "  public-slug  ",
  landingType: "link",
  landingTargetId: "https://example.test/public",
  ctaEnabled: true,
  ctaLabel: "  Consult  ",
};

describe("QR authoring payload preserves source contracts", () => {
  it.each(["content-hub", "direct-content"] as const)(
    "%s references its original content without copying a library item",
    (source) => {
      const payload = buildLibraryQrPayload({
        ...draft,
        library: { ...library, source },
      });
      expect(payload).toMatchObject({
        title: "Edited",
        description: "Description",
        slug: "public-slug",
        landingType: "page",
        landingTargetId: "source-id",
        consultationCtaEnabled: true,
        consultationCtaLabel: "Consult",
      });
      expect(payload.libraryItemId).toBeUndefined();
    },
  );
  it.each(["mlc"] as const)(
    "%s keeps the public URL and excludes page-only consultation options",
    (source) => {
      const payload = buildLibraryQrPayload({
        ...draft,
        library: { ...library, source },
      });
      expect(payload.landingType).toBe("link");
      expect(payload.landingTargetId).toBe("https://example.test/public");
      expect(payload.libraryItemId).toBeUndefined();
      expect(payload).not.toHaveProperty("consultationCtaEnabled");
    },
  );
  it("asset and omitted source keep library ownership and optional target omission", () => {
    for (const source of ["asset", undefined] as const) {
      const payload = buildLibraryQrPayload({
        ...draft,
        library: { ...library, source },
        title: " ",
        description: " ",
        landingTargetId: "",
      });
      expect(payload.libraryItemId).toBe("source-id");
      expect(payload.title).toBe("Original");
      expect(payload.description).toBeUndefined();
      expect(payload.landingTargetId).toBeUndefined();
      expect(payload).not.toHaveProperty("consultationCtaEnabled");
    }
  });
  it("disabled page CTA is omitted rather than overwriting existing settings", () => {
    expect(
      buildLibraryQrPayload({
        ...draft,
        library: { ...library, source: "direct-content" },
        ctaEnabled: false,
      }),
    ).not.toHaveProperty("consultationCtaEnabled");
  });
});
const entry: TabletDisplayEntry = {
  productType: "supplier",
  productId: "same-id",
  productName: "Supplier",
  sortOrder: 0,
  isVisible: true,
  contentId: null,
};
describe("tablet display draft behavior", () => {
  it("supplier and local products sharing an id retain their distinct names and ownership", () => {
    const pool = {
      supplierProducts: [{ id: "same-id", product_name: "Supplier" }],
      localProducts: [{ id: "same-id", name: "Local" }],
    } as ProductPool;
    const result = resolveTabletDisplayEntries(
      [
        {
          product_type: "supplier",
          product_id: "same-id",
          sort_order: 0,
          is_visible: true,
        },
        {
          product_type: "local",
          product_id: "same-id",
          sort_order: 1,
          is_visible: false,
          contentId: "chosen",
        },
        {
          product_type: "local",
          product_id: "deleted",
          sort_order: 2,
          is_visible: true,
        },
      ],
      pool,
    );
    expect(result.map((item) => item.productName)).toEqual([
      "Supplier",
      "Local",
      "(삭제된 자체 상품)",
    ]);
    expect(result.map((item) => item.contentId)).toEqual([
      null,
      "chosen",
      null,
    ]);
  });
  it("presentation-only name and legacy order metadata do not create unsaved changes", () => {
    expect(
      tabletDisplayPayloadsEqual(
        toTabletDisplayPayload([entry]),
        toTabletDisplayPayload([
          { ...entry, productName: "Renamed", sortOrder: 90 },
        ]),
      ),
    ).toBe(true);
  });
  it("reordering and restoring the original order returns the draft to clean without mutating input", () => {
    const initial = [entry, { ...entry, productId: "second", sortOrder: 1 }];
    const moved = moveTabletDisplayEntry(initial, 0, 1);
    expect(
      tabletDisplayPayloadsEqual(
        toTabletDisplayPayload(initial),
        toTabletDisplayPayload(moved),
      ),
    ).toBe(false);
    expect(initial.map((item) => item.productId)).toEqual([
      "same-id",
      "second",
    ]);
    expect(
      tabletDisplayPayloadsEqual(
        toTabletDisplayPayload(initial),
        toTabletDisplayPayload(moveTabletDisplayEntry(moved, 1, -1)),
      ),
    ).toBe(true);
    expect(moveTabletDisplayEntry(initial, 0, -1)).toBe(initial);
  });
  it("content and visibility edits affect dirty state and clearing content is explicit null", () => {
    const saved = toTabletDisplayPayload([{ ...entry, contentId: "previous" }]);
    expect(
      tabletDisplayPayloadsEqual(toTabletDisplayPayload([entry]), saved),
    ).toBe(false);
    expect(toTabletDisplayPayload([entry])[0].contentId).toBeNull();
    expect(
      tabletDisplayPayloadsEqual(
        toTabletDisplayPayload([{ ...entry, isVisible: false }]),
        toTabletDisplayPayload([entry]),
      ),
    ).toBe(false);
  });
  it("selected additions preserve prior entries and do not invent linked content", () => {
    const prior = [entry];
    const added = appendSelectedTabletProducts(
      prior,
      [{ id: "local", name: "Local", type: "local" }],
      new Set(["local"]),
    );
    expect(added).toHaveLength(2);
    expect(added[1]).toMatchObject({
      productType: "local",
      productId: "local",
      sortOrder: 1,
      contentId: null,
    });
    expect(prior).toEqual([entry]);
    expect(appendSelectedTabletProducts(prior, [], new Set())).toBe(prior);
  });
});
function snapshot(
  id: string,
  publishStatus: StoreAssetItem["publishStatus"],
  extra: Partial<StoreAssetItem> = {},
): StoreAssetItem {
  return {
    id,
    title: id,
    publishStatus,
    channelMap: {},
    isForced: false,
    isLocked: false,
    createdAt: "2026-10-13T00:00:00Z",
    ...extra,
  } as StoreAssetItem;
}
function media(
  id: string,
  createdAt = "2026-10-13T01:00:00Z",
): SignageMediaItem {
  return {
    id,
    name: id,
    sourceType: "youtube",
    sourceUrl: "https://example.test/video",
    createdAt,
  } as SignageMediaItem;
}
describe("signage list retains source-specific policies", () => {
  it("direct media ids cannot collide with snapshot ids and retain their original source", () => {
    const copied = snapshot("same", "published"),
      direct = media("same");
    const videos = buildSignageVideoList([copied], [direct]);
    expect(videos.map((item) => item.id)).toEqual(["same", "media_same"]);
    expect(videos[0]._snapshot).toBe(copied);
    expect(videos[1]._media).toBe(direct);
  });
  it("status filters exclude direct media; force uses the existing active period contract", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-13T12:00:00Z"));
    const videos = buildSignageVideoList(
      [
        snapshot("active", "published", {
          isForced: true,
          forcedStartAt: "2026-10-12T00:00:00Z",
          forcedEndAt: "2026-10-14T00:00:00Z",
        }),
        snapshot("expired", "published", {
          isForced: true,
          forcedEndAt: "2026-10-12T00:00:00Z",
        }),
        snapshot("draft", "draft"),
      ],
      [media("direct")],
    );
    expect(
      filterSignageVideos(videos, {
        status: "forced",
        sort: "newest",
        keyword: "",
      }).map((item) => item.id),
    ).toEqual(["active"]);
    expect(
      filterSignageVideos(videos, {
        status: "draft",
        sort: "newest",
        keyword: "",
      }).map((item) => item.id),
    ).toEqual(["draft"]);
  });
  it("sorting returns a new list and preserves mixed-source date ordering and case-insensitive search", () => {
    const videos = buildSignageVideoList(
      [snapshot("Alpha", "published")],
      [media("Beta")],
    );
    expect(
      filterSignageVideos(videos, {
        status: "all",
        sort: "forced-first",
        keyword: "",
      }).map((item) => item.id),
    ).toEqual(["media_Beta", "Alpha"]);
    expect(videos.map((item) => item.id)).toEqual(["Alpha", "media_Beta"]);
    expect(
      filterSignageVideos(videos, {
        status: "all",
        sort: "newest",
        keyword: "ALPHA",
      }).map((item) => item.id),
    ).toEqual(["Alpha"]);
  });
  it("published-first retains all statuses without replacing source-specific state", () => {
    const videos = buildSignageVideoList(
      [
        snapshot("hidden", "hidden"),
        snapshot("draft", "draft"),
        snapshot("ready", "published"),
      ],
      [media("direct")],
    );
    expect(
      filterSignageVideos(videos, {
        status: "all",
        sort: "published-first",
        keyword: "",
      }).map((item) => item.id),
    ).toEqual(["ready", "draft", "hidden", "media_direct"]);
  });
  it("duration totals round valid durations and count missing or nonpositive metadata separately", () => {
    const items = [12.6, 0, undefined, -1].map((duration) => ({
      contentJson: { duration },
    }));
    expect(summarizePlaylistDuration(items)).toEqual({
      totalSec: 13,
      missingCount: 3,
    });
  });
});
