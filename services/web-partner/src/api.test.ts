import { afterEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { ApiError, partnerApi, request } from "./api";
import { emptyWorkspace } from "./model";

const response = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("Partner cookie API client", () => {
  it("uses cookie credentials and JSON without copying credentials into browser storage", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(response(200, { success: true, data: {} }));
    vi.stubGlobal("fetch", fetch);
    const store = vi.spyOn(Storage.prototype, "setItem");
    const transient = crypto.randomUUID();
    await partnerApi.login("fixture@example.invalid", transient);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain("/auth/email/login");
    expect(options.credentials).toBe("include");
    expect(JSON.parse(options.body)).toMatchObject({
      includeLegacyTokens: false,
      password: transient,
    });
    expect(store).not.toHaveBeenCalled();
  });
  it("coalesces concurrent expired sessions into one refresh and retries once", async () => {
    let refreshed = false,
      finish: () => void = () => {};
    const fetch = vi.fn(async (url: string) => {
      if (url.includes("/auth/refresh")) {
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
        refreshed = true;
        return response(200, { success: true, data: {} });
      }
      return refreshed
        ? response(200, { success: true, data: [] })
        : response(401, { code: "UNAUTHENTICATED" });
    });
    vi.stubGlobal("fetch", fetch);
    const a = partnerApi.list(),
      b = partnerApi.list();
    await waitFor(() =>
      expect(
        fetch.mock.calls.filter(([url]) => url.includes("/auth/refresh")),
      ).toHaveLength(1),
    );
    finish();
    expect(await a).toEqual([]);
    expect(await b).toEqual([]);
    expect(
      fetch.mock.calls.filter(([url]) => url.includes("/auth/refresh")),
    ).toHaveLength(1);
  });
  it.each([503, 429])("preserves refresh %i failures instead of reporting a session expiry", async (status) => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(401, { code: "INVALID_TOKEN" }))
      .mockResolvedValueOnce(response(status, { code: "AUTH_TEMPORARILY_UNAVAILABLE" }));
    vi.stubGlobal("fetch", fetch);
    await expect(partnerApi.list()).rejects.toMatchObject({ status, code: "AUTH_TEMPORARILY_UNAVAILABLE" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("preserves a refresh network failure without converting it to 401", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(401, { code: "INVALID_TOKEN" }))
      .mockRejectedValueOnce(new TypeError("network"));
    vi.stubGlobal("fetch", fetch);
    await expect(partnerApi.list()).rejects.toThrow("서버에 연결하지 못했습니다");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("still reports actual refresh authentication rejection as session expiry", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response(401, { code: "INVALID_TOKEN" }))
      .mockResolvedValueOnce(response(401, { code: "REFRESH_TOKEN_EXPIRED" })));
    await expect(partnerApi.list()).rejects.toMatchObject({ status: 401, code: "INVALID_TOKEN" });
  });
  it("releases a failed single-flight refresh so a later retry can recover", async () => {
    let refreshed = false, retrying = false;
    const fetch = vi.fn(async (url: string) => {
      if (url.includes("/auth/refresh")) {
        if (!retrying) return response(503, { code: "AUTH_TEMPORARILY_UNAVAILABLE" });
        refreshed = true;
        return response(200, { success: true, data: {} });
      }
      return refreshed ? response(200, { success: true, data: [] }) : response(401, { code: "INVALID_TOKEN" });
    });
    vi.stubGlobal("fetch", fetch);
    const outcomes = await Promise.allSettled([partnerApi.list(), partnerApi.list()]);
    for (const result of outcomes) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") expect(result.reason).toMatchObject({ status: 503 });
    }
    expect(fetch.mock.calls.filter(([url]) => url.includes("/auth/refresh"))).toHaveLength(1);
    retrying = true;
    expect(await partnerApi.list()).toEqual([]);
    expect(fetch.mock.calls.filter(([url]) => url.includes("/auth/refresh"))).toHaveLength(2);
  });
  it("does not retry invalid login or expose server error details", async () => {
    const fetch = vi.fn().mockResolvedValue(
      response(401, {
        code: "INVALID_LOGIN",
        error: "private internal details",
      }),
    );
    vi.stubGlobal("fetch", fetch);
    await expect(
      partnerApi.login("fixture@example.invalid", crypto.randomUUID()),
    ).rejects.toThrow("로그인 정보를 확인");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("preserves revision conflicts as actionable errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response(409, { success: false, code: "REVISION_CONFLICT" }),
        ),
    );
    await expect(
      partnerApi.save("space", 4, emptyWorkspace()),
    ).rejects.toMatchObject({ status: 409, code: "REVISION_CONFLICT" });
  });
  it("rejects malformed responses and unsafe workspace links", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response("<html>not an API</html>", { status: 200 }),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(
      request("/api/v1/partner-support/spaces"),
    ).rejects.toBeInstanceOf(ApiError);
    fetch.mockResolvedValue(
      response(200, {
        success: true,
        data: {
          id: "space",
          workspace: {
            ...emptyWorkspace(),
            assets: [
              {
                id: "a",
                createdAt: "2026-01-01T00:00:00Z",
                title: "자료",
                business: "테스트",
                channel: "라인",
                content: "내용",
                url: "javascript:alert(1)",
                usage: "출처",
              },
            ],
          },
        },
      }),
    );
    await expect(partnerApi.load("space")).rejects.toThrow();
  });
  it("reports network failure without claiming a save succeeded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    await expect(partnerApi.save("space", 0, emptyWorkspace())).rejects.toThrow(
      "서버에 연결하지 못했습니다",
    );
  });
});
