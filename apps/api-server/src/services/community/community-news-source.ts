import axios from "axios";
import { parse, type HTMLElement } from "node-html-parser";
import { setTimeout as pause } from "node:timers/promises";
import { parseStringPromise } from "xml2js";
import { NEWS_SOURCES, newsKey, newsSource } from "./community-news-policy.js";

export type NewsSourceId = (typeof NEWS_SOURCES)[number]["id"];
export const SOURCE_PAGES: Record<NewsSourceId, string> = {
  kpanews: "https://www.kpanews.co.kr/",
  dailypharm: "https://dailypharm.com/",
  medipana: "https://www.medipana.com/",
};
const USER_AGENT = "O4O-Community-News/1.0 (+https://community.neture.co.kr)";
export interface CollectedNews {
  title: string;
  summary: string;
  linkUrl: string;
}
const text = (node: HTMLElement | null | undefined, max: number) =>
  (node?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function articleLink(sourceId: NewsSourceId, raw: string | undefined) {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim(), SOURCE_PAGES[sourceId]);
    const article =
      sourceId === "dailypharm"
        ? /^\/user\/news\/\d+$/.test(url.pathname)
        : url.pathname === "/news/articleView.html" &&
          /^\d+$/.test(url.searchParams.get("idxno") ?? "");
    return article && newsSource(url.href)?.id === sourceId
      ? newsKey(url.href)
      : null;
  } catch {
    return null;
  }
}
function headline(
  sourceId: NewsSourceId,
  node: HTMLElement,
): CollectedNews | null {
  const anchor =
    node.tagName === "A"
      ? node
      : (node.querySelector("a") ?? node.closest("a"));
  const linkUrl = articleLink(sourceId, anchor?.getAttribute("href"));
  const title = text(node, 160);
  if (!linkUrl || title.length < 8) return null;
  const summaryNode =
    sourceId === "dailypharm"
      ? node.closest(".adverL")?.querySelector(".main_banner_sub_t")
      : node.closest(".auto-content")?.querySelector(".auto-subtitles");
  return { title, summary: text(summaryNode, 240), linkUrl };
}
/** Read only publisher-selected headline elements, never article bodies or ad links. */
export function parseNewsPage(
  sourceId: NewsSourceId,
  html: string,
): CollectedNews[] {
  const root = parse(html);
  const nodes =
    sourceId === "dailypharm"
      ? root.querySelectorAll('.news_area[data-content-type="title"]')
      : root.querySelectorAll(".auto-titles");
  const seen = new Set<string>(),
    items: CollectedNews[] = [];
  for (const node of nodes) {
    const item = headline(sourceId, node);
    if (!item || seen.has(item.linkUrl)) continue;
    seen.add(item.linkUrl);
    items.push(item);
    if (items.length === 2) break;
  }
  if (!items.length) throw new Error("SOURCE_LAYOUT_CHANGED");
  return items;
}
interface RobotsGroup {
  agents: string[];
  rules: { allow: boolean; path: string }[];
  delay: number;
}
function robotDirective(group: RobotsGroup, key: string, value: string) {
  if (key === "allow" || key === "disallow") {
    if (value) group.rules.push({ allow: key === "allow", path: value });
    return true;
  }
  if (key === "crawl-delay") {
    const delay = Number(value);
    if (!Number.isFinite(delay) || delay < 0 || delay > 60)
      throw new Error("ROBOTS_DELAY_UNSUPPORTED");
    group.delay = delay;
    return true;
  }
  return false;
}
function robotsGroups(content: string) {
  const groups: RobotsGroup[] = [];
  let group: RobotsGroup | undefined;
  let hasRules = false;
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const index = line.indexOf(":");
    if (index < 0) throw new Error("ROBOTS_INVALID");
    const key = line.slice(0, index).trim().toLowerCase(),
      value = line.slice(index + 1).trim();
    if (key === "user-agent") {
      if (!value) throw new Error("ROBOTS_INVALID");
      if (!group || hasRules) {
        group = { agents: [], rules: [], delay: 0 };
        groups.push(group);
        hasRules = false;
      }
      group.agents.push(value.toLowerCase());
    } else if (group) {
      hasRules = robotDirective(group, key, value) || hasRules;
    }
  }
  return groups;
}
/** Only the applicable named agent / wildcard group is considered; unknown robots syntax fails closed. */
export function robotsPolicy(content: string, path = "/") {
  const groups = robotsGroups(content);
  const rank = (group: RobotsGroup) =>
    Math.max(
      0,
      ...group.agents
        .filter(
          (agent) =>
            agent !== "*" && USER_AGENT.toLowerCase().startsWith(agent),
        )
        .map((agent) => agent.length),
    );
  const specific = Math.max(0, ...groups.map(rank));
  const applicable =
    specific > 0
      ? groups.filter((group) => rank(group) === specific)
      : groups.filter((group) => group.agents.includes("*"));
  if (!applicable.length) throw new Error("ROBOTS_INVALID");
  const rules = applicable
    .flatMap((g) => g.rules)
    .filter((r) => {
      const pattern = r.path
        .split("*")
        .map((part) => part.replace(/[.+?^{}()|[\]\\]/g, "\\$&"))
        .join(".*");
      return new RegExp("^" + pattern).test(path);
    })
    .sort(
      (a, b) =>
        b.path.length - a.path.length || Number(b.allow) - Number(a.allow),
    );
  return {
    allowed: rules[0]?.allow ?? true,
    delayMs: Math.max(0, ...applicable.map((g) => g.delay)) * 1000,
  };
}

async function read(
  url: string,
  maxBytes: number,
  accept = "text/html,text/plain;q=0.9",
) {
  const response = await axios.get<string>(url, {
    timeout: 15000,
    maxRedirects: 0,
    maxContentLength: maxBytes,
    responseType: "text",
    headers: { "User-Agent": USER_AGENT, Accept: accept },
  });
  if (typeof response.data !== "string")
    throw new Error("SOURCE_INVALID_RESPONSE");
  return response.data;
}
export async function collectSource(
  sourceId: NewsSourceId,
): Promise<CollectedNews[]> {
  const page = SOURCE_PAGES[sourceId];
  const robots = robotsPolicy(
    await read(new URL("/robots.txt", page).href, 100000),
  );
  if (!robots.allowed) throw new Error("ROBOTS_BLOCKED");
  if (robots.delayMs) await pause(robots.delayMs);
  return parseNewsPage(sourceId, await read(page, 2000000));
}

/** Verified feed addresses (2026-11-07). A publisher moving its feed fails closed as unavailable. */
export const FEED_URLS: Record<NewsSourceId, string> = {
  kpanews: "https://www.kpanews.co.kr/rss/allArticle.xml",
  dailypharm: "https://www.dailypharm.com/rss/news.xml",
  medipana: "https://www.medipana.com/rss/allArticle.xml",
};
const MAX_FEED_BYTES = 5000000;
const MAX_FEED_ITEMS = 200;
export interface FeedArticle {
  url: string;
  title: string;
  lead: string;
  section: string | null;
  publishedAt: Date;
}
/** Bare `YYYY-MM-DD HH:mm:ss` from these publishers is KST, never UTC. RFC 822 carries its own zone. */
export function parseFeedDate(raw: unknown): Date | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  const bare = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/.exec(value);
  let parsed: Date | null = null;
  if (bare) parsed = new Date(`${bare[1]}T${bare[2]}+09:00`);
  else if (
    /^[A-Za-z]{3}, \d{1,2} [A-Za-z]{3} \d{4} \d{2}:\d{2}(:\d{2})? ([+-]\d{4}|GMT|UTC|KST)$/.test(
      value,
    )
  )
    parsed = new Date(value.replace(/KST$/, "+0900"));
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}
/** Canonical address keeping only the article identifier, so tracking variations cannot create a new article. */
function feedArticleUrl(sourceId: NewsSourceId, raw: unknown) {
  if (typeof raw !== "string") return null;
  const key = articleLink(sourceId, raw.trim().replace(/^http:\/\//i, "https://"));
  if (!key) return null;
  const url = new URL(key);
  url.search =
    sourceId === "dailypharm" ? "" : `?idxno=${url.searchParams.get("idxno")}`;
  return url.href.length <= 500 ? url.href : null;
}
/** xml2js yields a string, or an object with `_` when the element also has attributes. */
function feedText(value: unknown): string {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first === "string") return first;
  const inner = (first as { _?: unknown } | undefined)?._;
  return typeof inner === "string" ? inner : "";
}
/** Descriptions may carry escaped markup; only the visible text is kept. */
function feedPlain(value: unknown, max: number) {
  return parse(feedText(value))
    .textContent.replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}
/**
 * Feed XML is untrusted. Document type declarations are refused outright, so no external or custom
 * entity can be defined; the input size is capped by read() and the item count here.
 */
export async function parseNewsFeed(
  sourceId: NewsSourceId,
  xml: string,
): Promise<FeedArticle[]> {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("SOURCE_INVALID_RESPONSE");
  let document: any;
  try {
    document = await parseStringPromise(xml, { strict: true, explicitArray: true });
  } catch {
    throw new Error("SOURCE_INVALID_RESPONSE");
  }
  const entries: any[] = document?.rss?.channel?.[0]?.item ?? [];
  const seen = new Set<string>(),
    items: FeedArticle[] = [];
  for (const entry of entries.slice(0, MAX_FEED_ITEMS)) {
    const url = feedArticleUrl(sourceId, feedText(entry.link));
    const title = feedPlain(entry.title, 160);
    const publishedAt = parseFeedDate(feedText(entry.pubDate));
    if (!url || !title || !publishedAt || seen.has(url)) continue;
    seen.add(url);
    items.push({
      url,
      title,
      lead: feedPlain(entry.description, 240),
      section: feedPlain(entry.category, 100) || null,
      publishedAt,
    });
  }
  if (!items.length) throw new Error("SOURCE_LAYOUT_CHANGED");
  return items;
}
/** robots and the feed only: title, lead, section and time. Article pages are never requested. */
export async function collectFeed(
  sourceId: NewsSourceId,
): Promise<FeedArticle[]> {
  const feed = new URL(FEED_URLS[sourceId]);
  const robots = robotsPolicy(
    await read(new URL("/robots.txt", feed).href, 100000),
    feed.pathname,
  );
  if (!robots.allowed) throw new Error("ROBOTS_BLOCKED");
  if (robots.delayMs) await pause(robots.delayMs);
  return parseNewsFeed(
    sourceId,
    await read(
      feed.href,
      MAX_FEED_BYTES,
      "application/rss+xml,application/xml;q=0.9,text/xml;q=0.8",
    ),
  );
}
