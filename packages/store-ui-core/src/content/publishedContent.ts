export interface ContentBlock {
  type: "text" | "image" | "link";
  value: string;
  label?: string;
}

export interface UsageSettings {
  displayMode: "default" | "banner" | "landing";
  cta: {
    enabled: boolean;
    label: string;
    url: string;
    target: "_blank" | "_self";
  };
  qr: { enabled: boolean };
  print: { enabled: boolean };
}

export function parseUsage(json: Record<string, unknown>): UsageSettings {
  const raw = (json.usage || {}) as Partial<UsageSettings>;
  return {
    displayMode: raw.displayMode || "default",
    cta: {
      enabled: raw.cta?.enabled || false,
      label: raw.cta?.label || "",
      url: raw.cta?.url || "",
      target: raw.cta?.target || "_blank",
    },
    qr: { enabled: raw.qr?.enabled || false },
    print: { enabled: raw.print?.enabled || false },
  };
}

export function parseBlocks(json: Record<string, unknown>): ContentBlock[] {
  if (Array.isArray(json.blocks)) {
    return (json.blocks as ContentBlock[]).map((b) => ({
      type: b.type || "text",
      value: b.value || "",
      label: b.label,
    }));
  }
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
  return blocks;
}

export function qrImageUrl(data: string, size: number): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}
