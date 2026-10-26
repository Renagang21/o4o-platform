import { afterEach, describe, expect, it, vi } from "vitest";
import * as pharmacyTablet from "../../../../../services/web-pharmacy-business/src/api/tablet";
import * as storeTablet from "../../../../../services/web-store/src/api/tablet";
import { createAssetSnapshotClients } from "../assetSnapshot";
import { createLocalProductClient } from "../localProducts";
import { createTabletDisplayClient } from "../tabletDisplays";
import {
  createAuthenticatedJsonRequest,
  type JsonApiClient,
  type JsonRequest,
} from "../transport";

const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
afterEach(() => vi.unstubAllGlobals());

describe("authenticated JSON transport compatibility", () => {
  it("refreshes once and preserves method, body, organization and device headers", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(reply({}, 401))
      .mockResolvedValueOnce(reply({ success: true, data: ["ok"] }));
    vi.stubGlobal("fetch", fetcher);
    const refresh = vi.fn().mockResolvedValue("fresh");
    const request = createAuthenticatedJsonRequest({
      getAccessToken: () => "expired",
      tryRefreshToken: refresh,
    });
    const options = {
      method: "PUT",
      body: '{"products":[]}',
      headers: {
        "X-Organization-Id": "org",
        "X-Tablet-Device-Token": "device",
      },
    };
    await expect(request("/store/tablets", options)).resolves.toEqual({
      success: true,
      data: ["ok"],
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const first = fetcher.mock.calls[0][1];
    const retry = fetcher.mock.calls[1][1];
    expect(first.headers.Authorization).toBe("Bearer expired");
    expect(retry).toMatchObject({
      ...options,
      headers: {
        ...options.headers,
        Authorization: "Bearer fresh",
        "Content-Type": "application/json",
      },
    });
  });
  it("does not refresh or retry a forbidden request", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(reply({ error: "Denied", code: "FORBIDDEN" }, 403));
    vi.stubGlobal("fetch", fetcher);
    const refresh = vi.fn();
    const request = createAuthenticatedJsonRequest({
      getAccessToken: () => "token",
      tryRefreshToken: refresh,
    });
    await expect(request("/store/local-products")).rejects.toMatchObject({
      message: "Denied",
      status: 403,
      code: "FORBIDDEN",
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("does not loop when the refreshed token is also rejected", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(reply({ message: "Expired" }, 401));
    vi.stubGlobal("fetch", fetcher);
    const refresh = vi.fn().mockResolvedValue("still-expired");
    const request = createAuthenticatedJsonRequest({
      getAccessToken: () => null,
      tryRefreshToken: refresh,
    });
    await expect(request("/store/tablets")).rejects.toMatchObject({
      status: 401,
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
  it("propagates network errors without a speculative retry", async () => {
    const error = new TypeError("network");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
    const refresh = vi.fn();
    const request = createAuthenticatedJsonRequest({
      getAccessToken: () => null,
      tryRefreshToken: refresh,
    });
    await expect(request("/store/tablets")).rejects.toBe(error);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("service adapters retain their public kiosk request policy", () => {
  it.each([
    ["pharmacy", pharmacyTablet],
    ["store", storeTablet],
  ] as const)(
    "%s encodes slugs and preserves public local products",
    async (service, api) => {
      const payload = {
        success: true,
        data: [{ id: "supplier" }],
        meta: { total: 1 },
        localProducts: [{ id: "local" }],
      };
      const fetcher = vi.fn().mockResolvedValue(reply(payload));
      vi.stubGlobal("fetch", fetcher);
      const result = await api.fetchTabletProducts("shop /one", {
        tabletId: "corner",
        q: "약",
      });
      expect(result).toEqual({
        data: payload.data,
        meta: payload.meta,
        localProducts: payload.localProducts,
      });
      const [url, init] = fetcher.mock.calls[0];
      expect(url).toContain("/api/v1/stores/shop%20%2Fone/tablet/products?");
      expect(
        new URL(url, "https://example.invalid").searchParams.get("tabletId"),
      ).toBe("corner");
      expect(init?.headers).toBeUndefined();
      if (service === "store")
        expect(init).toMatchObject({ credentials: "omit", cache: "no-store" });
      else expect(init?.credentials).toBeUndefined();
    },
  );
  it.each([
    ["pharmacy", pharmacyTablet],
    ["store", storeTablet],
  ] as const)(
    "%s preserves kiosk token and consultation body",
    async (_service, api) => {
      const fetcher = vi
        .fn()
        .mockResolvedValue(
          reply({ success: true, data: { requestId: "request" } }),
        );
      vi.stubGlobal("fetch", fetcher);
      await api.submitTabletInterest("shop", {
        masterId: "product",
        customerNote: "help",
      });
      expect(fetcher.mock.calls[0][1]).toMatchObject({
        method: "POST",
        body: JSON.stringify({ masterId: "product", customerNote: "help" }),
      });
    },
  );
  it.each([
    ["pharmacy", pharmacyTablet],
    ["store", storeTablet],
  ] as const)(
    "%s propagates public product denial and keeps screen fallback",
    async (_service, api) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            reply({ success: false, error: { message: "unavailable" } }, 404),
          ),
      );
      await expect(api.fetchTabletProducts("shop")).rejects.toThrow(
        "unavailable",
      );
      await expect(api.fetchTabletScreen("shop")).resolves.toBeNull();
    },
  );
});

describe("shared clients use only their injected service context", () => {
  it("resolves the organization/service URL on every call, including after a context switch", async () => {
    let prefix = "/api/v1/kpa/store";
    const calls: Array<[string, RequestInit | undefined]> = [];
    const request: JsonRequest = async <T>(
      url: string,
      options?: RequestInit,
    ) => {
      calls.push([url, options]);
      return { success: true, data: { id: "product" } } as T;
    };
    const api = createLocalProductClient({ BASE: () => prefix, request });
    await api.getLocalProduct("one");
    prefix = "/api/v1/neture/store";
    await api.createLocalProduct({ name: "new" } as Parameters<
      typeof api.createLocalProduct
    >[0]);
    expect(calls.map(([url]) => url)).toEqual([
      "/api/v1/kpa/store/local-products/one",
      "/api/v1/neture/store/local-products",
    ]);
    expect(calls[1][1]).toMatchObject({
      method: "POST",
      body: '{"name":"new"}',
    });
  });
  it("preserves the device token and nullable QR selection on runtime writes", async () => {
    const calls: Array<[string, RequestInit | undefined]> = [];
    const request: JsonRequest = async <T>(
      url: string,
      options?: RequestInit,
    ) => {
      calls.push([url, options]);
      return { success: true, data: [] } as T;
    };
    const api = createTabletDisplayClient({
      BASE: () => "/api/v1/kpa/store",
      request,
    });
    await api.saveRuntimeProductList("device-token", "screen", [
      { productType: "local", productId: "local" },
    ]);
    expect(calls[0][0]).toBe(
      "/api/v1/kpa/store/tablet-runtime/screen-sets/screen/product-list",
    );
    expect(calls[0][1]).toMatchObject({
      method: "PUT",
      headers: { "X-Tablet-Device-Token": "device-token" },
      body: JSON.stringify({
        products: [
          { productType: "local", productId: "local", qrCodeId: null },
        ],
      }),
    });
  });
  it("keeps independent snapshot transports and lets their authorization errors propagate", async () => {
    const denied = new Error("other organization");
    const client = {
      get: vi.fn().mockRejectedValue(denied),
      post: vi.fn(),
    } as unknown as JsonApiClient;
    const api = createAssetSnapshotClients({ apiClient: client });
    await expect(api.assetSnapshotApi.list()).rejects.toBe(denied);
    expect(client.get).toHaveBeenCalledWith("/assets", undefined);
  });
});

// Pure helpers are shared by the renderers without changing legacy content semantics.
import {
  kpaBlockToRendererBlock,
  rendererBlockToKpaBlock,
} from "../../content/legacyBlockAdapter";
import { toVideoEmbed } from "../../../../tablet-kiosk-core/src/videoEmbed";
import { toIdleEmbedUrl } from "../../../../tablet-kiosk-core/src/idleMedia";

describe("shared content conversion compatibility", () => {
  it.each([
    [
      "https://youtu.be/abcdefghijk",
      "https://www.youtube.com/embed/abcdefghijk",
      "youtube",
    ],
    [
      "https://www.youtube.com/watch?v=abcdefghijk",
      "https://www.youtube.com/embed/abcdefghijk",
      "youtube",
    ],
    [
      "https://youtube.com/shorts/abcdefghijk",
      "https://www.youtube.com/embed/abcdefghijk",
      "youtube",
    ],
    [
      "https://vimeo.com/12345678",
      "https://player.vimeo.com/video/12345678",
      "vimeo",
    ],
    [
      "https://example.invalid/video.mp4",
      "https://example.invalid/video.mp4",
      "unknown",
    ],
    ["", "", "unknown"],
  ])("preserves public video conversion for %s", (raw, embedUrl, provider) => {
    expect(toVideoEmbed(raw)).toEqual({ embedUrl, provider });
  });
  it("keeps idle playback flags separate from public embeds", () => {
    const raw = "https://youtu.be/abcdefghijk";
    expect(toVideoEmbed(raw).embedUrl).not.toContain("autoplay");
    const idle = new URL(toIdleEmbedUrl(raw, { autoplay: false })!);
    expect(idle.searchParams.get("autoplay")).toBe("0");
    expect(idle.searchParams.get("mute")).toBe("1");
    expect(idle.searchParams.get("loop")).toBe("1");
    expect(toIdleEmbedUrl("https://example.invalid")).toBeNull();
  });
  it("round-trips text and preserves attributes fallback without changing unknown block types", () => {
    const block = { type: "text", content: "hello", items: ["one"] };
    expect(rendererBlockToKpaBlock(kpaBlockToRendererBlock(block))).toEqual(
      block,
    );
    expect(
      rendererBlockToKpaBlock({
        type: "core/image",
        attributes: { url: "/image.png" },
      }),
    ).toEqual({ type: "image", url: "/image.png" });
    expect(kpaBlockToRendererBlock({ type: "custom", content: "" })).toEqual({
      type: "custom",
      data: { content: "" },
    });
    expect(
      rendererBlockToKpaBlock({
        type: "text",
        data: {},
        attributes: { content: "ignored" },
      }),
    ).toEqual({ type: "text" });
  });
});

it("preserves the Store consultation revision contract through the shared client", async () => {
  const updated = { id: "content", revision: "r2" };
  const put = vi.fn().mockResolvedValue({ success: true, data: updated });
  const api = createAssetSnapshotClients({
    apiClient: { put } as unknown as JsonApiClient,
  });
  const body = { title: "edited", expectedRevision: "r1" };
  await expect(api.directContentApi.update("content", body)).resolves.toEqual({
    success: true,
    data: updated,
  });
  expect(put).toHaveBeenCalledWith("/store-contents/direct/content", body);
});
