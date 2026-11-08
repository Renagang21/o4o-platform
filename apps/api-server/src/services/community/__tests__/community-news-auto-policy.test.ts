import {
  NEWS_AUTO_LIMITS,
  chooseRepresentative,
  clusterFinalScore,
  createCommunityNewsClusterExtension,
  newsExpiry,
  newsWindow,
  parseNewsClusters,
  selectAfternoon,
  selectMorning,
  type NewsClusterInput,
} from "../community-news-auto-policy";

const output = (clusters: unknown[]) => JSON.stringify({ clusters });
const ok = { a: [0, 1], s: 80, r: "합성 이유" };
describe("window", () => {
  it.each([
    ["2026-11-06T22:59:00Z", null],
    ["2026-11-06T23:00:00Z", "morning"],
    ["2026-11-07T05:59:00Z", "morning"],
    ["2026-11-07T06:00:00Z", "afternoon"],
    ["2026-11-07T14:59:00Z", "afternoon"],
    ["2026-11-07T15:00:00Z", null],
  ])("%s KST window is %s", (time, expected) => {
    expect(newsWindow(new Date(time))).toBe(expected);
  });
  it("bounds automatic visibility to the end of the following KST day", () => {
    expect(newsExpiry("2026-11-07").toISOString()).toBe(
      "2026-11-08T15:00:00.000Z",
    );
  });
});
describe("cluster output validation", () => {
  it("returns only indexes, score and reason; suggested representatives are ignored", () => {
    expect(
      parseNewsClusters(
        output([{ ...ok, representative: 1, url: "https://evil.invalid" }]),
        2,
      ),
    ).toEqual([{ indexes: [0, 1], score: 80, reason: "합성 이유" }]);
  });
  it("accepts omitted articles and fenced JSON", () => {
    expect(
      parseNewsClusters("```json\n" + output([{ ...ok, a: [2] }]) + "\n```", 5),
    ).toHaveLength(1);
    expect(parseNewsClusters(output([]), 5)).toEqual([]);
  });
  it.each([
    ["index beyond the input", [{ ...ok, a: [2] }]],
    ["negative index", [{ ...ok, a: [-1] }]],
    ["non-integer index", [{ ...ok, a: [0.5] }]],
    ["a UUID-like index", [{ ...ok, a: ["0"] }]],
    ["duplicate in one cluster", [{ ...ok, a: [1, 1] }]],
    ["duplicate across clusters", [ok, { ...ok, a: [1] }]],
    ["empty cluster", [{ ...ok, a: [] }]],
    ["score above 100", [{ ...ok, s: 101 }]],
    ["fractional score", [{ ...ok, s: 1.5 }]],
    ["missing reason", [{ ...ok, r: " " }]],
    [
      "long reason",
      [{ ...ok, r: "가".repeat(NEWS_AUTO_LIMITS.reasonChars + 1) }],
    ],
  ])("rejects %s", (_name, clusters) => {
    expect(() => parseNewsClusters(output(clusters), 2)).toThrow(
      "INVALID_NEWS_CLUSTERS",
    );
  });
  it("rejects wrong shapes, too many clusters and oversized responses", () => {
    expect(() => parseNewsClusters("[]", 2)).toThrow();
    expect(() => parseNewsClusters("null", 2)).toThrow();
    expect(() => parseNewsClusters("not json", 2)).toThrow();
    expect(() =>
      parseNewsClusters(
        output(
          Array.from({ length: NEWS_AUTO_LIMITS.maxClusters + 1 }, (_, i) => ({
            ...ok,
            a: [i],
          })),
        ),
        200,
      ),
    ).toThrow("INVALID_NEWS_CLUSTERS");
    expect(() =>
      parseNewsClusters(
        " ".repeat(NEWS_AUTO_LIMITS.maxResponseChars + 1),
        2,
      ),
    ).toThrow("INVALID_NEWS_CLUSTERS");
  });
});
describe("cost caps on the prompt", () => {
  const context = {
    requestId: "r",
    serviceId: "community",
    featureId: "f",
    actorId: "a",
    audience: "staff",
  } as any;
  const article = (extra: Partial<NewsClusterInput> = {}): NewsClusterInput => ({
    source: "kpanews",
    title: "합성 제목",
    lead: "",
    section: null,
    group: null,
    ...extra,
  });
  const prepare = (articles: NewsClusterInput[], ctx = context) =>
    createCommunityNewsClusterExtension(articles).prepare(undefined, ctx);
  it("sends compact index numbers, never ids or addresses, and allows exactly 400 articles", () => {
    const prompt = prepare(
      Array.from({ length: NEWS_AUTO_LIMITS.maxArticles }, () => article()),
    );
    const sent = JSON.parse(prompt.userPrompt);
    expect(sent).toHaveLength(400);
    expect(sent[399]).toEqual({ i: 399, m: "약사공론", t: "합성 제목" });
    expect(prompt.userPrompt).not.toContain("http");
    expect(
      JSON.parse(prepare([article({ group: 2, lead: "리드" })]).userPrompt)[0],
    ).toEqual({ i: 0, m: "약사공론", t: "합성 제목", l: "리드", g: 2 });
  });
  it("refuses too many articles, oversized text and the wrong context", () => {
    expect(() =>
      prepare(
        Array.from({ length: NEWS_AUTO_LIMITS.maxArticles + 1 }, () =>
          article(),
        ),
      ),
    ).toThrow("INVALID_NEWS_INPUT");
    expect(() => prepare([])).toThrow();
    expect(() => prepare([article({ title: "가".repeat(161) })])).toThrow();
    expect(() => prepare([article({ lead: "가".repeat(241) })])).toThrow();
    expect(() =>
      prepare([article()], { ...context, audience: "consumer" }),
    ).toThrow();
  });
});
describe("representative rule", () => {
  const member = (source: string, url: string, at: string) => ({
    source,
    url,
    publishedAt: new Date(at),
  });
  it("always prefers kpanews, even published later", () => {
    expect(
      chooseRepresentative([
        member("dailypharm", "d", "2026-11-07T00:00:00Z"),
        member("kpanews", "k", "2026-11-07T09:00:00Z"),
        member("medipana", "m", "2026-11-07T01:00:00Z"),
      ]).url,
    ).toBe("k");
  });
  it("takes the earliest otherwise, deterministically", () => {
    expect(
      chooseRepresentative([
        member("medipana", "m", "2026-11-07T01:00:00Z"),
        member("dailypharm", "d", "2026-11-07T00:00:00Z"),
      ]).url,
    ).toBe("d");
    expect(
      chooseRepresentative([
        member("kpanews", "k2", "2026-11-07T01:00:00Z"),
        member("kpanews", "k1", "2026-11-07T01:00:00Z"),
      ]).url,
    ).toBe("k1");
  });
  it("adds weight per extra publisher", () => {
    expect(clusterFinalScore(50, 1)).toBe(50);
    expect(clusterFinalScore(50, 3)).toBe(66);
  });
});
describe("selection", () => {
  const ranked = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
  it("publishes everything when no exploration rank exists", () => {
    expect(selectMorning(ranked(3), "2026-11-07").map((s) => s.item)).toEqual([
      1, 2, 3,
    ]);
    const eight = selectMorning(ranked(8), "2026-11-07");
    expect(eight.map((s) => s.item)).toEqual(ranked(8));
    expect(eight.some((s) => s.exploration)).toBe(false);
  });
  it("publishes top 7 plus one item from ranks 9-20 and rotates daily", () => {
    const seen = new Set<number>();
    for (let d = 1; d <= 24; d++) {
      const day = `2026-12-${String(d).padStart(2, "0")}`;
      const picked = selectMorning(ranked(40), day);
      expect(picked).toHaveLength(8);
      expect(picked.slice(0, 7).map((s) => s.item)).toEqual(ranked(7));
      expect(picked[7].exploration).toBe(true);
      expect(picked[7].item).toBe(picked[7].rank);
      expect(picked[7].rank).toBeGreaterThanOrEqual(9);
      expect(picked[7].rank).toBeLessThanOrEqual(20);
      seen.add(picked[7].rank);
    }
    expect(seen.size).toBe(12);
    expect(selectMorning(ranked(9), "2026-12-02")[7].rank).toBe(9);
  });
  it("adds only important issues within the remaining room in the afternoon", () => {
    const items = [70, 60, 59, 90].map((finalScore) => ({ finalScore }));
    expect(selectAfternoon(items, 2).map((s) => s.item.finalScore)).toEqual([
      70, 60,
    ]);
    expect(selectAfternoon(items, 0)).toEqual([]);
    expect(selectAfternoon(items, -3)).toEqual([]);
  });
});
