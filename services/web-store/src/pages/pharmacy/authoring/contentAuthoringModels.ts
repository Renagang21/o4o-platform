type ContentBlock = {
  type: "text" | "image" | "link" | "list";
  value: string;
  label?: string;
  items?: string[];
};

export type DisplayMode = "default" | "banner" | "landing";

export interface UsageSettings {
  displayMode: DisplayMode;
  cta: {
    enabled: boolean;
    label: string;
    url: string;
    target: "_blank" | "_self";
  };
  qr: {
    enabled: boolean;
  };
  print: {
    enabled: boolean;
  };
}

export const DEFAULT_USAGE: UsageSettings = {
  displayMode: "default",
  cta: { enabled: false, label: "", url: "", target: "_blank" },
  qr: { enabled: false },
  print: { enabled: false },
};

export function parseSnapshotContentJson(json: Record<string, unknown>): {
  blocks: ContentBlock[];
  usage: UsageSettings;
  raw: Record<string, unknown>;
} {
  // Parse usage settings
  const rawUsage = (json.usage || {}) as Partial<UsageSettings>;
  const usage: UsageSettings = {
    displayMode: rawUsage.displayMode || "default",
    cta: {
      enabled: rawUsage.cta?.enabled || false,
      label: rawUsage.cta?.label || "",
      url: rawUsage.cta?.url || "",
      target: rawUsage.cta?.target || "_blank",
    },
    qr: { enabled: rawUsage.qr?.enabled || false },
    print: { enabled: rawUsage.print?.enabled || false },
  };

  // Try structured blocks format
  if (Array.isArray(json.blocks)) {
    return {
      blocks: (json.blocks as any[]).map((b) => {
        // KPA block format: { type: 'text', content: '...' } or { type: 'image', url: '...' }
        if ("content" in b && !("value" in b)) {
          return {
            type: b.type === "text" ? "text" : b.type,
            value: b.content || "",
            label: b.label,
          } as ContentBlock;
        }
        if ("url" in b && !("value" in b)) {
          return { type: "image", value: b.url || "" } as ContentBlock;
        }
        if (b.type === "list" && Array.isArray(b.items)) {
          return { type: "list" as const, value: "", items: b.items };
        }
        // Standard format: { type, value, label }
        return {
          type: b.type || "text",
          value: b.value || "",
          label: b.label,
          items: b.items,
        } as ContentBlock;
      }),
      usage,
      raw: json,
    };
  }

  // Fallback: convert flat fields to blocks
  const blocks: ContentBlock[] = [];
  if (typeof json.body === "string" || typeof json.content === "string") {
    blocks.push({
      type: "text",
      value: (json.body || json.content || "") as string,
    });
  }
  if (typeof json.imageUrl === "string" && json.imageUrl) {
    blocks.push({ type: "image", value: json.imageUrl as string });
  }
  if (typeof json.linkUrl === "string" && json.linkUrl) {
    blocks.push({
      type: "link",
      value: json.linkUrl as string,
      label: (json.linkLabel || "") as string,
    });
  }

  if (blocks.length === 0) {
    blocks.push({ type: "text", value: JSON.stringify(json, null, 2) });
  }

  return { blocks, usage, raw: json };
}

// WO-O4O-KPA-STORE-LIBRARY-SNAPSHOT-EDITOR-UNIFY-V1:
//   저장된 contentJson 을 o4o 표준 편집기(html)용으로 정규화. snapshot 은 body(html) 가 권위 출처.
//   body 없으면 html/content, 그래도 없으면 레거시 blocks 를 html 로 변환(내용 무손실).
export function snapshotContentJsonToHtml(
  json: Record<string, unknown>,
): string {
  if (typeof json.body === "string") return json.body;
  if (typeof json.html === "string") return json.html;
  if (typeof json.content === "string" && json.content.trim())
    return json.content as string;
  if (Array.isArray(json.blocks) && json.blocks.length > 0) {
    return (json.blocks as any[])
      .map((b) => {
        const type = b?.type || "text";
        const value = b?.value ?? b?.content ?? "";
        const url = b?.url ?? value;
        if (type === "image")
          return url ? `<p><img src="${url}" alt="" /></p>` : "";
        if (type === "link")
          return value || url
            ? `<p><a href="${value || url}">${b?.label || value || url}</a></p>`
            : "";
        if (type === "list" && Array.isArray(b?.items))
          return `<ul>${b.items.map((i: string) => `<li>${i}</li>`).join("")}</ul>`;
        return value ? `<p>${value}</p>` : "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

type DirectContentBlock = {
  type: "text" | "image" | "link" | "list";
  value: string;
  label?: string;
  items?: string[];
};

export function parseDirectBlocks(
  contentJson: Record<string, unknown>,
): DirectContentBlock[] {
  // contentJson이 배열인 경우 (o4o/youtube, o4o/paragraph 등 직접 블록 배열)
  if (Array.isArray(contentJson)) {
    return (contentJson as any[]).map((b) => {
      if (b.type === "o4o/youtube" || b.type === "o4o/video") {
        const url = b.attributes?.url || b.url || "";
        return {
          type: "link" as const,
          value: url,
          label: "▶ YouTube 영상 보기",
        };
      }
      if (b.type === "o4o/image" || b.type === "image") {
        return {
          type: "image" as const,
          value: b.attributes?.url || b.url || "",
        };
      }
      if (b.type === "o4o/list" || b.type === "list") {
        // items는 b.items 또는 b.content.items (htmlToForumBlocks 저장 형식)
        const items = Array.isArray(b.items)
          ? b.items
          : b.content && Array.isArray(b.content.items)
            ? b.content.items
            : [];
        return { type: "list" as const, value: "", items };
      }
      // o4o/paragraph, o4o/heading, text 등 텍스트 계열
      // content가 객체인 경우(content.items 등) 무시하고 빈 문자열
      const textVal =
        typeof b.content === "string" ? b.content : b.text || b.value || "";
      return { type: "text" as const, value: textVal };
    });
  }
  if (Array.isArray(contentJson.blocks)) {
    return (contentJson.blocks as any[]).map((b) => {
      if ("content" in b && !("value" in b))
        return {
          type: b.type === "text" ? "text" : b.type,
          value: b.content || "",
        } as ContentBlock;
      if ("url" in b && !("value" in b))
        return { type: "image", value: b.url || "" } as ContentBlock;
      if (b.type === "list" && Array.isArray(b.items))
        return { type: "list" as const, value: "", items: b.items };
      return {
        type: b.type || "text",
        value: b.value || "",
        label: b.label,
        items: b.items,
      } as ContentBlock;
    });
  }
  if (typeof contentJson.html === "string" && contentJson.html) {
    return [{ type: "text", value: contentJson.html }];
  }
  return [{ type: "text", value: JSON.stringify(contentJson, null, 2) }];
}

// WO-O4O-KPA-STORE-LIBRARY-CONTENTS-DIRECT-EDITOR-UNIFY-V1:
//   저장된 contentJson 을 o4o 표준 편집기(html)용으로 정규화. direct 콘텐츠는 contentJson.html 이 표준.
//   레거시 블록/배열 형태도 html 로 정규화해 표준 편집기에 진입(유형 분기 없이 동일 편집기 사용).
export function directContentJsonToHtml(
  contentJson: Record<string, unknown>,
): string {
  if (typeof contentJson?.html === "string") return contentJson.html;
  const blocks = parseDirectBlocks(contentJson);
  return blocks
    .map((b) => {
      if (b.type === "image" && b.value)
        return `<p><img src="${b.value}" alt="" /></p>`;
      if (b.type === "link" && b.value)
        return `<p><a href="${b.value}">${b.label || b.value}</a></p>`;
      if (b.type === "list" && b.items?.length)
        return `<ul>${b.items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
      return b.value ? `<p>${b.value}</p>` : "";
    })
    .filter(Boolean)
    .join("\n");
}
