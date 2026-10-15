import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setActiveStoreOrganizationId } from "../../lib/storeOrganizationHeader";
import {
  createSignageMedia,
  updateSignageMedia,
  fetchSignageMedia,
  deleteSignageMedia,
} from "../signageMedia";
const api = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("../../contexts/AuthContext", () => ({
  getAccessToken: () => "synthetic",
}));
vi.mock("../../lib/apiClient", () => ({
  API_BASE_URL: "",
  api: { interceptors: { request: { use: vi.fn() } } },
}));
vi.mock("../token-refresh", () => ({ tryRefreshToken: api.refresh }));
beforeEach(() => {
  setActiveStoreOrganizationId("A");
  api.refresh.mockImplementation(async () => {
    setActiveStoreOrganizationId("B");
    return "refreshed";
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  setActiveStoreOrganizationId(null);
});
it.each([
  () => fetchSignageMedia("A"),
  () =>
    createSignageMedia("A", {
      name: "Video",
      mediaType: "video",
      sourceType: "youtube",
      sourceUrl: "https://youtu.be/dQw4w9WgXcQ",
    }),
  () => updateSignageMedia("A", "media", { name: "Changed" }),
  () => deleteSignageMedia("A", "media"),
])(
  "pins both store headers and the request through authentication refresh %#",
  async (run) => {
    const seen: RequestInit[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, options) => {
        seen.push({ ...options, headers: new Headers(options.headers) });
        return seen.length === 1
          ? new Response("{}", { status: 401 })
          : new Response(
              JSON.stringify({
                success: true,
                data: { id: "media", name: "Video", items: [] },
              }),
            );
      }),
    );
    await run();
    expect(
      seen.map((r) => new Headers(r.headers).get("X-Store-Organization-Id")),
    ).toEqual(["A", "A"]);
    expect(
      seen.map((r) => new Headers(r.headers).get("X-Organization-Id")),
    ).toEqual(["A", "A"]);
    expect(seen[0].method).toBe(seen[1].method);
    expect(seen[0].body).toBe(seen[1].body);
  },
);
it.each([
  { success: false, data: [] },
  { success: true, data: {} },
  { success: true, data: null },
])(
  "rejects malformed media lists instead of showing an empty collection",
  async (data) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(data))),
    );
    await expect(fetchSignageMedia("A")).rejects.toThrow();
  },
);
it("accepts a confirmed empty media list", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: { items: [] } })),
      ),
  );
  expect(await fetchSignageMedia("A")).toEqual([]);
});
it("rejects a malformed update response rather than closing the editor", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false }))),
  );
  await expect(
    updateSignageMedia("A", "media", { name: "Changed" }),
  ).rejects.toThrow("결과");
});
