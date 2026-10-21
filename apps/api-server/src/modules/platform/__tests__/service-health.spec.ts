import {
  ServiceHealthService,
  SERVICE_HEALTH_TARGETS,
  checkWebTarget,
} from "../service-health.service.js";
const html =
  '<!doctype html><html><script src="https://outside.invalid/x.js"></script><script type="module" src="/assets/index-fixture.js"></script></html>';
function transport() {
  return jest.fn(
    async (url: string | URL | Request) =>
      new Response(
        String(url).includes("/assets/") ? 'console.log("synthetic")' : html,
        {
          headers: {
            "content-type": String(url).includes("/assets/")
              ? "application/javascript"
              : "text/html",
          },
        },
      ),
  );
}
it("covers current business, independent services and common spaces without reviving retired domains or business statistics", async () => {
  expect(SERVICE_HEALTH_TARGETS).toHaveLength(12);
  expect(SERVICE_HEALTH_TARGETS.map((x) => new URL(x.url).hostname)).toEqual(
    expect.arrayContaining([
      "pharmacy.neture.co.kr",
      "carepharm.neture.co.kr",
      "megapharm.neture.co.kr",
      "pharmcoop.neture.co.kr",
      "kpa.neture.co.kr",
      "store.neture.co.kr",
      "admin.neture.co.kr",
    ]),
  );
  expect(JSON.stringify(SERVICE_HEALTH_TARGETS)).not.toMatch(
    /약사회|cosmetics|retail\.|pharmacy-hub|partner\./,
  );
  const db = {
    isInitialized: true,
    query: jest.fn(async () => [{ "?column?": 1 }]),
  };
  const fetcher = transport();
  const result = await new ServiceHealthService(
    db,
    fetcher as typeof fetch,
    () => "READY",
  ).snapshot();
  expect(
    result.services.every((x) => x.checks.every((c) => c.state === "passed")),
  ).toBe(true);
  expect(result.infrastructure.every((x) => x.state === "passed")).toBe(true);
  expect(db.query).toHaveBeenCalledTimes(1);
  expect(db.query).toHaveBeenCalledWith("SELECT 1");
  expect(JSON.stringify(result)).not.toMatch(
    /totalMembers|approvalRate|topActions/,
  );
  expect(fetcher.mock.calls).toHaveLength(24);
});
it("uses no caller URL or credentials, never follows redirects, and does not fetch external scripts", async () => {
  const fetcher = transport();
  await checkWebTarget(SERVICE_HEALTH_TARGETS[0], fetcher as typeof fetch);
  for (const [url, options] of fetcher.mock.calls as unknown as [
    string,
    RequestInit,
  ][]) {
    expect(new URL(url).origin).toBe("https://pharmacy.neture.co.kr");
    expect(options.redirect).toBe("manual");
    expect(options.headers).not.toHaveProperty("Authorization");
    expect(options.headers).not.toHaveProperty("Cookie");
  }
  const redirected = await checkWebTarget(
    SERVICE_HEALTH_TARGETS[0],
    jest.fn(
      async () =>
        new Response("", {
          status: 302,
          headers: { location: "https://outside.invalid/" },
        }),
    ) as any,
  );
  expect(redirected.checks.some((x) => x.state === "unknown")).toBe(true);
});
it.each([
  ["unavailable", 503, "text/html"],
  ["missing", 404, "text/html"],
  ["html-as-js", 200, "text/html"],
])(
  "reports %s as a failed check and never calls it healthy",
  async (_name, status, type) => {
    const fetcher = jest.fn(
      async (url: string) =>
        new Response(html, {
          status: url.includes("/assets/") ? Number(status) : 200,
          headers: {
            "content-type": url.includes("/assets/") ? type : "text/html",
          },
        }),
    );
    expect(
      (
        await checkWebTarget(SERVICE_HEALTH_TARGETS[0], fetcher as any)
      ).checks.some((x) => x.state === "failed"),
    ).toBe(true);
  },
);
it("distinguishes network failure, uninstrumented pages, and unavailable DB from passing checks without leaking raw errors", async () => {
  const fetcher = jest.fn(async () => {
    throw new Error("private-network-details");
  });
  const result = await new ServiceHealthService(
    {
      isInitialized: true,
      query: jest.fn(async () => {
        throw new Error("private-connection");
      }),
    },
    fetcher,
    () => "STARTING",
  ).snapshot();
  expect(
    result.services.every((x) => x.checks.some((c) => c.state === "unknown")),
  ).toBe(true);
  expect(result.infrastructure).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "공통 DB 연결", state: "unknown" }),
      expect.objectContaining({ name: "공통 API 실행 준비", state: "failed" }),
    ]),
  );
  expect(JSON.stringify(result)).not.toContain("private-");
  const page = await checkWebTarget(
    SERVICE_HEALTH_TARGETS[0],
    jest.fn(
      async () =>
        new Response("<html>login</html>", {
          headers: { "content-type": "text/html" },
        }),
    ) as any,
  );
  expect(page.checks.some((x) => x.state === "unknown")).toBe(true);
});
it("coalesces concurrent requests and reuses only recent results, without fabricating a new check time", async () => {
  const fetcher = transport(),
    service = new ServiceHealthService(
      { isInitialized: false, query: jest.fn() },
      fetcher as typeof fetch,
      () => "READY",
    );
  const [a, b] = await Promise.all([service.snapshot(), service.snapshot()]);
  expect(fetcher).toHaveBeenCalledTimes(24);
  expect(a.checkedAt).toBe(b.checkedAt);
  const cached = await service.snapshot();
  expect(cached.cached).toBe(true);
  expect(cached.checkedAt).toBe(a.checkedAt);
  expect(fetcher).toHaveBeenCalledTimes(24);
});
it("bounds HTML reading and rejects empty JavaScript even with successful status headers", async () => {
  const huge = await checkWebTarget(
    SERVICE_HEALTH_TARGETS[0],
    jest.fn(
      async () =>
        new Response("x".repeat(600000), {
          headers: { "content-type": "text/html" },
        }),
    ) as any,
  );
  expect(huge.checks.some((x) => x.state === "unknown")).toBe(true);
  const empty = await checkWebTarget(
    SERVICE_HEALTH_TARGETS[0],
    jest.fn(
      async (url: string) =>
        new Response(url.includes("/assets/") ? "" : html, {
          headers: {
            "content-type": url.includes("/assets/")
              ? "application/javascript"
              : "text/html",
          },
        }),
    ) as any,
  );
  expect(empty.checks.some((x) => x.state === "failed")).toBe(true);
});
