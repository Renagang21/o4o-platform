import {
  newsSource,
  newsKey,
  parseNewsSuggestions,
  createCommunityNewsExtension,
  type NewsCandidate,
} from "../community-news-policy";
const input: NewsCandidate[] = [
  {
    id: "a",
    title: "정책 변경",
    summary: "시행 안내",
    linkUrl: "https://www.kpanews.co.kr/article/1",
  },
  {
    id: "b",
    title: "동일 정책 변경",
    summary: "시행 안내",
    linkUrl: "https://dailypharm.com/user/news/2",
  },
  {
    id: "c",
    title: "현장 실무 해설",
    summary: "추가 안내",
    linkUrl: "https://www.medipana.com/article/3",
  },
];
const group = (ids: string[], representativeId = ids[0]) => ({
  articleIds: ids,
  representativeId,
  summary: "제공된 요약",
  recommended: true,
  reason: "약국 실무에 도움",
});
describe("community news editorial policy", () => {
  it("allows exactly three HTTPS publishers and rejects spoofing, credentials and custom ports", () => {
    input.forEach((c) => expect(newsSource(c.linkUrl)).toBeTruthy());
    for (const link of [
      "http://dailypharm.com/a",
      "https://dailypharm.com.evil.test/a",
      "https://evil.test/?dailypharm.com",
      "https://a@dailypharm.com/a",
      "https://dailypharm.com:8443/a",
    ])
      expect(newsSource(link)).toBeUndefined();
  });
  it("deduplicates tracking variations while preserving article identifiers", () => {
    expect(
      newsKey("https://www.dailypharm.com/user/news?id=1&utm_source=x#part"),
    ).toBe(newsKey("https://dailypharm.com/user/news?id=1"));
    expect(newsKey("https://dailypharm.com/user/news?id=2")).not.toBe(
      newsKey("https://dailypharm.com/user/news?id=1"),
    );
  });
  it("overrides model preference with KPA for the same issue and retains recommended exclusive followups", () => {
    const result = parseNewsSuggestions(
      JSON.stringify([group(["a", "b"], "b"), group(["c"])]),
      input,
    );
    expect(result.map((i) => i.id)).toEqual(["a", "c"]);
    expect(result[0].recommended).toBe(false);
    expect(result[1].recommended).toBe(true);
    expect(result[0].linkUrl).toBe(input[0].linkUrl);
  });
  it.each([
    [group(["a", "b"])],
    [group(["a", "b"]), group(["b", "c"])],
    [group(["a", "b", "invented"])],
    [group(["a", "b", "c"], "invented")],
    [{ ...group(["a", "b", "c"]), reason: "" }],
    [{ ...group(["a", "b", "c"]), summary: "x".repeat(241) }],
  ])(
    "rejects incomplete, invented, duplicate or malformed model groups %#",
    (...groups) => {
      expect(() =>
        parseNewsSuggestions(JSON.stringify(groups), input),
      ).toThrow();
    },
  );
  it("bounds prompts and exposes only provided text to the model", () => {
    const extension = createCommunityNewsExtension(input);
    const context = {
      requestId: "test",
      serviceId: "community",
      featureId: "industry-news",
      actorId: "actor",
      audience: "staff",
    } as const;
    const prompt = extension.prepare(undefined, context);
    expect(JSON.stringify(prompt)).not.toContain("https://");
    expect(() =>
      extension.prepare(undefined, { ...context, audience: "public" } as any),
    ).toThrow();
    expect(() =>
      createCommunityNewsExtension([...input, ...input, ...input]).prepare(
        undefined,
        context,
      ),
    ).toThrow();
  });
});
