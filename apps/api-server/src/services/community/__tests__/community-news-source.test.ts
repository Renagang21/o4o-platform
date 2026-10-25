import axios from "axios";
import {
  collectSource,
  parseNewsPage,
  robotsPolicy,
} from "../community-news-source";
jest.mock("axios", () => ({ __esModule: true, default: { get: jest.fn() } }));
const get = axios.get as jest.Mock;
describe("publisher-selected headline collection", () => {
  it("reads headline elements, deduplicates URLs and ignores ads, body excerpts and foreign links", () => {
    const html = `<a href="https://www.kpanews.co.kr/news/articleView.html?idxno=1"><img alt="이미지 제목" /></a>
      <div class="auto-content"><a href="/news/articleView.html?idxno=1&utm_source=a"><h2 class="auto-titles">약국 운영 정책 &amp; 안내</h2></a><a class="auto-subtitles">제공된 짧은 부제</a><div class="auto-sums">수집하면 안 되는 본문 발췌</div></div>
      <a href="/news/articleView.html?idxno=1"><h2 class="auto-titles">같은 원문 중복 제목</h2></a>
      <a href="https://evil.invalid/news/articleView.html?idxno=2"><h2 class="auto-titles">외부 광고 링크 제목</h2></a>
      <a href="/news/articleView.html?idxno=2"><h2 class="auto-titles">두 번째 주요 기사 제목</h2></a>
      <a href="/news/articleView.html?idxno=3"><h2 class="auto-titles">세 번째 주요 기사 제목</h2></a>`;
    const result = parseNewsPage("kpanews", html);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      title: "약국 운영 정책 & 안내",
      summary: "제공된 짧은 부제",
      linkUrl: "https://kpanews.co.kr/news/articleView.html?idxno=1",
    });
    expect(JSON.stringify(result)).not.toContain("본문 발췌");
  });
  it("uses the verified dailypharm headline containers and medipana headline classes", () => {
    expect(
      parseNewsPage(
        "dailypharm",
        '<div class="news_area" data-content-type="title"><a href="https://dailypharm.com/user/news/123">약국 주요 기사 제목입니다</a></div>',
      )[0].linkUrl,
    ).toContain("/123");
    expect(
      parseNewsPage(
        "medipana",
        '<a href="/news/articleView.html?idxno=123"><h2 class="auto-titles">전문지 주요 기사 제목입니다</h2></a>',
      )[0].linkUrl,
    ).toContain("medipana.com");
    expect(() => parseNewsPage("medipana", '<a href="/">광고</a>')).toThrow(
      "SOURCE_LAYOUT_CHANGED",
    );
  });
  it("respects applicable robots groups, longest rules and crawl delay", () => {
    const robots =
      "User-agent: GPTBot\nDisallow: /\nUser-agent: *\nCrawl-delay: 5\nDisallow: /admin\nAllow: /";
    expect(robotsPolicy(robots)).toEqual({ allowed: true, delayMs: 5000 });
    expect(robotsPolicy(robots, "/admin")).toEqual({
      allowed: false,
      delayMs: 5000,
    });
    expect(
      robotsPolicy(
        "User-agent: O4O-Community-News\nDisallow: /\nUser-agent: *\nAllow: /",
      ).allowed,
    ).toBe(false);
    expect(
      robotsPolicy("User-agent: *\nDisallow: /*?*view_mode=", "/?view_mode=x")
        .allowed,
    ).toBe(false);
    expect(
      robotsPolicy(
        "User-agent: O4O\nAllow: /\nUser-agent: O4O-Community-News\nDisallow: /",
      ).allowed,
    ).toBe(false);
    expect(() => robotsPolicy("User-agent:\nAllow: /")).toThrow();
    expect(() => robotsPolicy("<html>failure</html>")).toThrow();
    expect(() => robotsPolicy("User-agent: *\nCrawl-delay: 999")).toThrow();
  });
  it("fetches only robots and homepage with strict response and redirect limits", async () => {
    get
      .mockResolvedValueOnce({ data: "User-agent: *\nDisallow: /admin/" })
      .mockResolvedValueOnce({
        data: '<a href="/news/articleView.html?idxno=123"><h2 class="auto-titles">약국 주요 소식 제목입니다</h2></a>',
      });
    await collectSource("kpanews");
    expect(get.mock.calls.map((c) => c[0])).toEqual([
      "https://www.kpanews.co.kr/robots.txt",
      "https://www.kpanews.co.kr/",
    ]);
    expect(get.mock.calls[1][1]).toMatchObject({
      maxRedirects: 0,
      maxContentLength: 2000000,
      timeout: 15000,
    });
    get.mockClear();
    get.mockResolvedValueOnce({ data: "User-agent: *\nDisallow: /" });
    await expect(collectSource("dailypharm")).rejects.toThrow("ROBOTS_BLOCKED");
    expect(get).toHaveBeenCalledTimes(1);
  });
});
