import { afterEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { ApiError, partnerApi, request } from "./api";
import { emptyWorkspace } from "./model";
import {
  storeTokens,
  clearStoredTokens,
  getAccessToken,
  getRefreshToken,
} from "@o4o/auth-client";

const response = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
afterEach(() => {
  clearStoredTokens();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("Partner cookie API client", () => {
  it("logs out an expired handoff session with its refresh token and without parent-domain cookies", async () => {
    const token = crypto.randomUUID(),
      refresh = crypto.randomUUID();
    storeTokens({ accessToken: token, refreshToken: refresh });
    const fetch = vi
      .fn()
      .mockResolvedValue(response(200, { success: true, data: {} }));
    vi.stubGlobal("fetch", fetch);
    await partnerApi.logout();
    const [, options] = fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ refreshToken: refresh });
    expect(options.credentials).toBe("omit");
    expect(options.headers.Authorization).toBe(`Bearer ${token}`);
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
  it("forgets local handoff credentials even when the server rejects logout", async () => {
    storeTokens({
      accessToken: crypto.randomUUID(),
      refreshToken: crypto.randomUUID(),
    });
    const fetch = vi
      .fn()
      .mockResolvedValue(response(503, { code: "REQUEST_FAILED" }));
    vi.stubGlobal("fetch", fetch);
    await expect(partnerApi.logout()).rejects.toMatchObject({ status: 503 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
  it("keeps the cookie logout transport for a direct email session", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(response(200, { success: true, data: {} }));
    vi.stubGlobal("fetch", fetch);
    await partnerApi.logout();
    expect(fetch.mock.calls[0][1].credentials).toBe("include");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({});
  });

  it("uses the shared handoff session and refreshes that session instead of an unrelated cookie session", async () => {
    const first = crypto.randomUUID(),
      refresh = crypto.randomUUID(),
      next = crypto.randomUUID(),
      nextRefresh = crypto.randomUUID();
    storeTokens({ accessToken: first, refreshToken: refresh });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(401, { code: "UNAUTHENTICATED" }))
      .mockResolvedValueOnce(
        response(200, {
          success: true,
          data: { tokens: { accessToken: next, refreshToken: nextRefresh } },
        }),
      )
      .mockResolvedValueOnce(response(200, { success: true, data: [] }));
    vi.stubGlobal("fetch", fetch);
    expect(await partnerApi.list()).toEqual([]);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe(
      `Bearer ${first}`,
    );
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({
      refreshToken: refresh,
      includeLegacyTokens: true,
    });
    expect(fetch.mock.calls[2][1].headers.Authorization).toBe(`Bearer ${next}`);
    expect(getAccessToken()).toBe(next);
    expect(getRefreshToken()).toBe(nextRefresh);
    expect(fetch.mock.calls[0][1].credentials).toBe("omit");
    expect(fetch.mock.calls[1][1].credentials).toBe("omit");
  });
  it("clears a previous handoff identity only after a successful direct cookie login", async () => {
    storeTokens({
      accessToken: crypto.randomUUID(),
      refreshToken: crypto.randomUUID(),
    });
    const fetch = vi
      .fn()
      .mockResolvedValue(response(200, { success: true, data: {} }));
    vi.stubGlobal("fetch", fetch);
    await partnerApi.login("member@example.invalid", crypto.randomUUID());
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
  it("does not restore handoff tokens if logout cleared storage while refresh was in flight", async () => {
    storeTokens({
      accessToken: crypto.randomUUID(),
      refreshToken: crypto.randomUUID(),
    });
    let resolve: (r: Response) => void = () => {};
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(401, { code: "UNAUTHENTICATED" }))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((r) => {
            resolve = r;
          }),
      )
      .mockResolvedValueOnce(response(200, { success: true, data: [] }));
    vi.stubGlobal("fetch", fetch);
    const result = partnerApi.list();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    clearStoredTokens();
    resolve(
      response(200, {
        success: true,
        data: { tokens: { accessToken: crypto.randomUUID() } },
      }),
    );
    await result;
    expect(getAccessToken()).toBeNull();
  });
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
  it.each([503, 429])(
    "preserves refresh %i failures instead of reporting a session expiry",
    async (status) => {
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(response(401, { code: "INVALID_TOKEN" }))
        .mockResolvedValueOnce(
          response(status, { code: "AUTH_TEMPORARILY_UNAVAILABLE" }),
        );
      vi.stubGlobal("fetch", fetch);
      await expect(partnerApi.list()).rejects.toMatchObject({
        status,
        code: "AUTH_TEMPORARILY_UNAVAILABLE",
      });
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
  it("preserves a refresh network failure without converting it to 401", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(response(401, { code: "INVALID_TOKEN" }))
      .mockRejectedValueOnce(new TypeError("network"));
    vi.stubGlobal("fetch", fetch);
    await expect(partnerApi.list()).rejects.toThrow(
      "서버에 연결하지 못했습니다",
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("still reports actual refresh authentication rejection as session expiry", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(response(401, { code: "INVALID_TOKEN" }))
        .mockResolvedValueOnce(
          response(401, { code: "REFRESH_TOKEN_EXPIRED" }),
        ),
    );
    await expect(partnerApi.list()).rejects.toMatchObject({
      status: 401,
      code: "INVALID_TOKEN",
    });
  });
  it("releases a failed single-flight refresh so a later retry can recover", async () => {
    let refreshed = false,
      retrying = false;
    const fetch = vi.fn(async (url: string) => {
      if (url.includes("/auth/refresh")) {
        if (!retrying)
          return response(503, { code: "AUTH_TEMPORARILY_UNAVAILABLE" });
        refreshed = true;
        return response(200, { success: true, data: {} });
      }
      return refreshed
        ? response(200, { success: true, data: [] })
        : response(401, { code: "INVALID_TOKEN" });
    });
    vi.stubGlobal("fetch", fetch);
    const outcomes = await Promise.allSettled([
      partnerApi.list(),
      partnerApi.list(),
    ]);
    for (const result of outcomes) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected")
        expect(result.reason).toMatchObject({ status: 503 });
    }
    expect(
      fetch.mock.calls.filter(([url]) => url.includes("/auth/refresh")),
    ).toHaveLength(1);
    retrying = true;
    expect(await partnerApi.list()).toEqual([]);
    expect(
      fetch.mock.calls.filter(([url]) => url.includes("/auth/refresh")),
    ).toHaveLength(2);
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
