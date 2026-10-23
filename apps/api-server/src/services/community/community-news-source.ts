import axios from "axios";
import { parse, type HTMLElement } from "node-html-parser";
import { setTimeout as pause } from "node:timers/promises";
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

async function read(url: string, maxBytes: number) {
  const response = await axios.get<string>(url, {
    timeout: 15000,
    maxRedirects: 0,
    maxContentLength: maxBytes,
    responseType: "text",
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,text/plain;q=0.9" },
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
