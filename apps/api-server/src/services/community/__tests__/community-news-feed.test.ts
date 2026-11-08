import axios from "axios";
import {
  FEED_URLS,
  collectFeed,
  parseFeedDate,
  parseNewsFeed,
} from "../community-news-source";
jest.mock("axios", () => ({ __esModule: true, default: { get: jest.fn() } }));
const get = axios.get as jest.Mock;
const item = (fields: string) => `<item>${fields}</item>`;
const feed = (items: string) =>
  `<?xml version="1.0" encoding="utf-8"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>합성 피드</title>${items}</channel></rss>`;
const kstBare = item(`<title><![CDATA[합성 &amp; 기사]]></title>
  <link>https://www.kpanews.co.kr/news/articleView.html?idxno=7&amp;utm_source=rss</link>
  <description><![CDATA[<p>합성 <b>리드</b>   문장</p>]]></description>
  <author>합성 기자</author><pubDate>2026-11-07 05:53:00</pubDate>`);
beforeEach(() => get.mockReset());
describe("feed dates", () => {
  it("reads the bare publisher format as KST, not UTC", () => {
    expect(parseFeedDate("2026-11-07 05:53:00")?.toISOString()).toBe(
      "2026-11-06T20:53:00.000Z",
    );
  });
  it("reads RFC 822 with its own zone", () => {
    expect(
      parseFeedDate("Sat, 07 Nov 2026 06:00:59 +0900")?.toISOString(),
    ).toBe("2026-11-06T21:00:59.000Z");
    expect(parseFeedDate("Sat, 07 Nov 2026 06:00:59 GMT")?.toISOString()).toBe(
      "2026-11-07T06:00:59.000Z",
    );
    expect(parseFeedDate("Sat, 07 Nov 2026 06:00:59 KST")?.toISOString()).toBe(
      "2026-11-06T21:00:59.000Z",
    );
  });
  it.each(["", "어제", "2026-13-40 99:99:99", "2026-11-07", null, 1234])(
    "rejects %s",
    (raw) => {
      expect(parseFeedDate(raw)).toBeNull();
    },
  );
});
describe("feed parsing", () => {
  it("keeps title, lead and time only, with a canonical address", async () => {
    const [article] = await parseNewsFeed("kpanews", feed(kstBare));
    expect(article).toEqual({
      url: "https://kpanews.co.kr/news/articleView.html?idxno=7",
      title: "합성 & 기사",
      lead: "합성 리드 문장",
      section: null,
      publishedAt: new Date("2026-11-06T20:53:00.000Z"),
    });
    expect(JSON.stringify(article)).not.toContain("기자");
  });
  it("reads the dailypharm shape with guid, creator, category and attributes", async () => {
    const [article] = await parseNewsFeed(
      "dailypharm",
      feed(
        item(`<title>합성 데일리팜 기사</title><link>https://www.dailypharm.com/user/news/42?src=rss</link>
        <guid isPermaLink="true">https://www.dailypharm.com/user/news/42</guid><dc:creator>합성</dc:creator>
        <category domain="x">정책</category><category>둘째</category><description>리드</description>
        <pubDate>Sat, 07 Nov 2026 06:00:59 +0900</pubDate>`),
      ),
    );
    expect(article).toMatchObject({
      url: "https://dailypharm.com/user/news/42",
      section: "정책",
    });
  });
  it("caps title and lead length", async () => {
    const [article] = await parseNewsFeed(
      "medipana",
      feed(
        item(`<title>${"가".repeat(300)}</title>
        <link>https://www.medipana.com/news/articleView.html?idxno=1</link>
        <description>${"나".repeat(600)}</description><pubDate>2026-11-07 05:53:00</pubDate>`),
      ),
    );
    expect(article.title).toHaveLength(160);
    expect(article.lead).toHaveLength(240);
  });
  it("skips foreign links, non-articles, bad dates and repeats", async () => {
    const date = "<pubDate>2026-11-07 05:53:00</pubDate>";
    const good = `<title>합성 정상</title><link>https://www.medipana.com/news/articleView.html?idxno=1</link>${date}`;
    const items = await parseNewsFeed(
      "medipana",
      feed(
        [
          item(good),
          item(good),
          item(`<title>외부</title><link>https://medipana.com.evil.test/news/articleView.html?idxno=2</link>${date}`),
          item(`<title>다른 매체</title><link>https://www.kpanews.co.kr/news/articleView.html?idxno=3</link>${date}`),
          item(`<title>목록</title><link>https://www.medipana.com/news/articleList.html</link>${date}`),
          item(`<title>날짜 오류</title><link>https://www.medipana.com/news/articleView.html?idxno=4</link><pubDate>어제</pubDate>`),
          item(`<title></title><link>https://www.medipana.com/news/articleView.html?idxno=5</link>${date}`),
        ].join(""),
      ),
    );
    expect(items.map((a) => a.url)).toEqual([
      "https://medipana.com/news/articleView.html?idxno=1",
    ]);
  });
  it("treats document types and entities as hostile, without resolving them", async () => {
    const xxe = `<?xml version="1.0"?><!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]>${feed(item("<title>&x;</title>")).replace(/^<\?xml[^>]*\?>/, "")}`;
    await expect(parseNewsFeed("kpanews", xxe)).rejects.toThrow(
      "SOURCE_INVALID_RESPONSE",
    );
    const bomb = `<!DOCTYPE lolz [<!ENTITY a "aaaa"><!ENTITY b "&a;&a;&a;">]><rss><channel><item><title>&b;</title></item></channel></rss>`;
    await expect(parseNewsFeed("kpanews", bomb)).rejects.toThrow(
      "SOURCE_INVALID_RESPONSE",
    );
    await expect(
      parseNewsFeed("kpanews", feed(item("<title>&undefined;</title>"))),
    ).rejects.toThrow("SOURCE_INVALID_RESPONSE");
  });
  it("reports malformed and empty feeds", async () => {
    await expect(parseNewsFeed("kpanews", "<rss><channel>")).rejects.toThrow(
      "SOURCE_INVALID_RESPONSE",
    );
    await expect(parseNewsFeed("kpanews", feed(""))).rejects.toThrow(
      "SOURCE_LAYOUT_CHANGED",
    );
    await expect(parseNewsFeed("kpanews", "<html></html>")).rejects.toThrow(
      "SOURCE_LAYOUT_CHANGED",
    );
  });
  it("does not let a crafted element pollute prototypes", async () => {
    await parseNewsFeed(
      "kpanews",
      feed(
        kstBare +
          item(`<__proto__><polluted>yes</polluted></__proto__><constructor>x</constructor>`),
      ),
    );
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
describe("feed collection", () => {
  it("checks robots for the feed path, keeps the safety limits and requests nothing else", async () => {
    get.mockImplementation(async (url: string) => ({
      data: url.endsWith("robots.txt")
        ? "User-agent: *\nDisallow: /admin/"
        : feed(kstBare),
    }));
    await expect(collectFeed("kpanews")).resolves.toHaveLength(1);
    expect(get.mock.calls.map((c) => c[0])).toEqual([
      "https://www.kpanews.co.kr/robots.txt",
      FEED_URLS.kpanews,
    ]);
    const options = get.mock.calls[1][1];
    expect(options).toMatchObject({
      maxRedirects: 0,
      timeout: 15000,
      maxContentLength: 5000000,
    });
    expect(options.headers.Accept).toContain("application/rss+xml");
  });
  it("fails closed when robots disallow the feed, before requesting it", async () => {
    get.mockResolvedValue({ data: "User-agent: *\nDisallow: /rss/" });
    await expect(collectFeed("medipana")).rejects.toThrow("ROBOTS_BLOCKED");
    expect(get).toHaveBeenCalledTimes(1);
  });
  it("waits the crawl delay before requesting the feed", async () => {
    const started = Date.now();
    let feedRequestedAfter = 0;
    get.mockImplementation(async (url: string) => {
      if (url.endsWith("robots.txt"))
        return { data: "User-agent: *\nCrawl-delay: 1" };
      feedRequestedAfter = Date.now() - started;
      return {
        data: feed(
          item(
            `<title>합성</title><link>https://www.dailypharm.com/user/news/1</link><pubDate>Sat, 07 Nov 2026 06:00:59 +0900</pubDate>`,
          ),
        ),
      };
    });
    await collectFeed("dailypharm");
    expect(feedRequestedAfter).toBeGreaterThanOrEqual(950);
  });
});
