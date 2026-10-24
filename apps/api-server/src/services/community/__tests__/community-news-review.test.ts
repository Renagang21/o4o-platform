import {
  reviewNews,
  getNewsReview,
  recommendationFor,
} from "../community-news-review.service";
const manager = jest.fn(async (_db: unknown, actor: string) => {
  if (actor !== "manager") throw Error("forbidden");
});
jest.mock("../community-management.service", () => ({
  requireCommunityManager: (...args: unknown[]) =>
    manager(...(args as [unknown, string])),
  CommunityManagementError: class extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));
const id = "11111111-1111-4111-8111-111111111111";
const articles = ["kpanews.co.kr", "dailypharm.com", "medipana.com"].flatMap(
  (host, n) =>
    Array.from({ length: 3 }, (_, i) => ({
      id: `${n}-${i}`,
      title: "제목",
      summary: "요약",
      linkUrl: `https://${host}/article/${i}`,
    })),
);
function fixture() {
  const records: any[] = [];
  let inTransaction = false;
  const query = jest.fn(async (sql: string, args: any[] = []) => {
    if (sql.includes("pg_try_advisory")) return [{ locked: true }];
    if (sql.startsWith("INSERT")) {
      records.push({ id: args[0], metadata: JSON.parse(args[1]) });
      return [];
    }
    if (sql.startsWith("UPDATE")) {
      const row = records.find((r) => r.id === args[0]);
      Object.assign(
        row.metadata,
        sql.includes('"failed"') ? { state: "failed" } : JSON.parse(args[1]),
      );
      return [];
    }
    if (sql.includes("metadata->'inputKeys'"))
      return records
        .filter((r) => r.metadata.state === "done")
        .map((r) => ({ keys: r.metadata.inputKeys }));
    if (sql.includes("SELECT id,title")) return articles;
    if (sql.includes("metadata->>'day'=$1"))
      return records.filter((r) => r.metadata.day === args[0]);
    if (sql.startsWith("SELECT metadata"))
      return records.filter(
        (r) => r.id === args[0] && r.metadata.state === "done",
      );
    throw Error(sql);
  });
  const db = {
    query,
    transaction: async (fn: any) => {
      inTransaction = true;
      try {
        return await fn({ query });
      } finally {
        inTransaction = false;
      }
    },
  } as any;
  return { db, records, query, inTransaction: () => inTransaction };
}
const today = new Date("2026-10-21T14:59:00Z");
beforeEach(() => manager.mockClear());
describe("daily community news reservation", () => {
  it("commits reservation before paid work, balances sources and reuses a shared result", async () => {
    const f = fixture();
    const generate = jest.fn(async (input: any[]) => {
      expect(f.inTransaction()).toBe(false);
      expect(f.records[0].metadata.state).toBe("pending");
      expect(input).toHaveLength(6);
      expect(input.map((c) => c.id)).toEqual([
        "0-0",
        "0-1",
        "1-0",
        "1-1",
        "2-0",
        "2-1",
      ]);
      const cached = await reviewNews(f.db, "manager", generate as any, today);
      expect(cached.state).toBe("pending");
      return input.map((c) => ({
        ...c,
        sourceName: "매체",
        recommended: false,
        reason: "",
        articleIds: [c.id],
      }));
    });
    const done = await reviewNews(f.db, "manager", generate as any, today);
    expect(done.state).toBe("done");
    expect(await getNewsReview(f.db, "manager", today)).toEqual(done);
    expect(await reviewNews(f.db, "manager", generate as any, today)).toEqual(
      done,
    );
    expect(generate).toHaveBeenCalledTimes(1);
    const next = await reviewNews(
      f.db,
      "manager",
      async (rows) =>
        rows.map((c) => ({
          ...c,
          sourceName: "매체",
          recommended: false,
          reason: "",
          articleIds: [c.id],
        })),
      new Date("2026-10-21T15:01:00Z"),
    );
    // The next Korean day only picks the remaining third article from each source.
    expect(next.state).toBe("done");
    expect(f.records[1].metadata.day).toBe("2026-10-22");
    expect(f.records[1].metadata.inputKeys).toHaveLength(3);
  });
  it("consumes the daily attempt on provider failure without publishing anything", async () => {
    const f = fixture();
    const generate = jest.fn().mockRejectedValue(Error("provider unavailable"));
    expect((await reviewNews(f.db, "manager", generate, today)).state).toBe(
      "failed",
    );
    expect((await reviewNews(f.db, "manager", generate, today)).state).toBe(
      "failed",
    );
    expect(generate).toHaveBeenCalledTimes(1);
    expect(
      f.query.mock.calls.filter(([sql]) => sql.startsWith("INSERT"))[0][0],
    ).toContain("'draft'");
  });
  it("denies non-managers before reserving or calling AI and rechecks after generation", async () => {
    const f = fixture();
    const generate = jest.fn();
    await expect(reviewNews(f.db, "member", generate, today)).rejects.toThrow(
      "forbidden",
    );
    expect(f.records).toHaveLength(0);
    expect(generate).not.toHaveBeenCalled();
    const revoked = jest.fn(async () => {
      manager
        .mockRejectedValueOnce(Error("revoked"))
        .mockRejectedValueOnce(Error("revoked"));
      return [];
    });
    await expect(reviewNews(f.db, "manager", revoked, today)).rejects.toThrow(
      "revoked",
    );
    expect(f.records[0].metadata.state).toBe("failed");
  });
  it("only accepts recommendation provenance matching the stored article and URL", async () => {
    const f = fixture();
    f.records.push({
      id,
      metadata: {
        state: "done",
        items: [
          {
            id: "a",
            linkUrl: "https://dailypharm.com/a",
            recommended: true,
            reason: "해설",
          },
        ],
      },
    });
    expect(
      await recommendationFor(f.db, id, "a", "https://dailypharm.com/a"),
    ).toMatchObject({ recommended: true });
    await expect(
      recommendationFor(f.db, id, "a", "https://dailypharm.com/b"),
    ).rejects.toThrow();
    await expect(
      recommendationFor(f.db, "fake", "a", "https://dailypharm.com/a"),
    ).rejects.toThrow();
  });
});
