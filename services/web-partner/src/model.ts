export const channels = [
  "인스타그램",
  "유튜브",
  "틱톡",
  "페이스북",
  "카카오톡",
  "왓츠앱",
  "라인",
  "기타",
] as const;
export type Channel = (typeof channels)[number];
type RecordBase = { id: string; createdAt: string };
export type Proposal = RecordBase & {
  title: string;
  business: string;
  category: string;
  channel: Channel;
  description: string;
  destination: string;
  contact: string;
};
export type Creator = RecordBase & {
  name: string;
  channel: Channel;
  topic: string;
  portfolio: string;
  channelProfiles?: { channel: Channel; url: string }[];
  language?: string;
  region?: string;
};
export type Asset = RecordBase & {
  title: string;
  business: string;
  channel: Channel;
  content: string;
  url: string;
  usage: string;
  folder?: string;
  tags?: string[];
  isTemplate?: boolean;
};
export type Activity = RecordBase & {
  proposalId: string;
  creatorId: string;
  url: string;
  publishedAt: string;
  views: number | null;
  assetId?: string | null;
  metrics?: {
    likes: number | null;
    comments: number | null;
    shares: number | null;
    source: "manual" | "import";
  };
};
export type Settlement = RecordBase & {
  proposalId: string;
  creatorId: string;
  memo: string;
  amount: number;
  status: "recorded" | "paid";
  paidAt: string | null;
  dueDate?: string | null;
  externalReference?: string;
};
export type Workspace = {
  version: 1;
  proposals: Proposal[];
  creators: Creator[];
  assets: Asset[];
  activities: Activity[];
  settlements: Settlement[];
};
export const STORAGE_KEY = "o4o.partner.workspace.v1";
export const emptyWorkspace = (): Workspace => ({
  version: 1,
  proposals: [],
  creators: [],
  assets: [],
  activities: [],
  settlements: [],
});
export const base = (): RecordBase => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
});

export function webUrl(value: string, required = true): string {
  const input = value.trim();
  if (!input && !required) return "";
  try {
    const url = new URL(input);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error();
    return url.href;
  } catch {
    throw new Error(
      "주소는 http:// 또는 https://로 시작하는 웹 주소를 입력해 주세요.",
    );
  }
}

export function integer(value: string, minimum = 0): number {
  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < minimum
  ) {
    throw new Error(`${minimum.toLocaleString()} 이상의 정수를 입력해 주세요.`);
  }
  return Number(value);
}

export function calendarDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("올바른 날짜를 입력해 주세요.");
  }
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (value > today) throw new Error("활동일은 오늘 이후일 수 없습니다.");
  return value;
}

export function trackingLink(
  destination: string,
  creatorId: string,
  proposalId: string,
  channel: string,
): string {
  if (!creatorId || !proposalId)
    throw new Error("홍보 제안과 홍보자를 선택해 주세요.");
  const url = new URL(webUrl(destination));
  url.searchParams.set("utm_source", channel);
  url.searchParams.set("utm_medium", "creator");
  url.searchParams.set("utm_campaign", proposalId);
  url.searchParams.set("utm_content", creatorId);
  return url.href;
}

export function contentDraft(
  product: string,
  facts: string,
  channel: Channel,
): string {
  if (!product.trim() || !facts.trim())
    throw new Error("제품 이름과 전달할 정보를 입력해 주세요.");
  const intro = `${product.trim()} 소개`;
  const body = facts.trim();
  if (["유튜브", "틱톡", "인스타그램"].includes(channel)) {
    return `[${channel} 숏폼 구성안]\n\n장면 1 · 관심 끌기\n${intro}\n\n장면 2 · 제품 정보\n${body}\n\n장면 3 · 안내\n자세한 정보는 함께 제공된 링크에서 확인해 주세요.\n\n게시 전: 광고·협찬 표시, 사실관계와 자료 사용 범위를 확인하고 자신의 말투로 편집해 주세요.`;
  }
  return `[${channel} 공유 문구]\n\n${intro}\n\n${body}\n\n자세한 정보는 함께 제공된 링크에서 확인해 주세요.\n\n게시 전: 광고·협찬 표시와 자료 사용 범위를 확인해 주세요.`;
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function strings(row: Record<string, unknown>, keys: string[]): boolean {
  return keys.every(
    (k) => typeof row[k] === "string" && (row[k] as string).length <= 20000,
  );
}
function channel(row: Record<string, unknown>): boolean {
  return channels.includes(row.channel as Channel);
}
function validUrl(value: unknown): boolean {
  try {
    return typeof value === "string" && (webUrl(value, false), true);
  } catch {
    return false;
  }
}

export function parseWorkspace(raw: string): Workspace {
  const value: unknown = JSON.parse(raw);
  if (!object(value) || value.version !== 1)
    throw new Error("지원하지 않는 저장 형식입니다.");
  const required: Record<string, string[]> = {
    proposals: [
      "title",
      "business",
      "category",
      "channel",
      "description",
      "destination",
      "contact",
    ],
    creators: ["name", "channel", "topic", "portfolio"],
    assets: ["title", "business", "channel", "content", "url", "usage"],
    activities: ["proposalId", "creatorId", "url", "publishedAt"],
    settlements: ["proposalId", "creatorId", "memo", "status"],
  };
  for (const [key, keys] of Object.entries(required)) {
    const rows = value[key];
    if (!Array.isArray(rows) || rows.length > 10000)
      throw new Error("저장된 목록을 읽을 수 없습니다.");
    const ids = new Set<string>();
    for (const row of rows) {
      if (
        !object(row) ||
        !strings(row, ["id", "createdAt", ...keys]) ||
        !row.id ||
        ids.has(row.id as string) ||
        !Number.isFinite(Date.parse(row.createdAt as string))
      )
        throw new Error("저장된 항목이 올바르지 않습니다.");
      const optional = [
        "contact",
        "portfolio",
        ...(key === "assets" ? ["url"] : []),
      ];
      if (
        !keys
          .filter((k) => !optional.includes(k))
          .every((k) => (row[k] as string).trim().length > 0)
      )
        throw new Error("저장된 필수 항목이 비어 있습니다.");
      ids.add(row.id as string);
      if (key === "creators") {
        if (
          ["language", "region"].some(
            (k) =>
              row[k] !== undefined &&
              (typeof row[k] !== "string" || (row[k] as string).length > 100),
          )
        )
          throw new Error("프로필 지역·언어가 올바르지 않습니다.");
        if (
          row.channelProfiles !== undefined &&
          (!Array.isArray(row.channelProfiles) ||
            row.channelProfiles.length > 12 ||
            row.channelProfiles.some(
              (p) =>
                !object(p) ||
                !channel(p) ||
                typeof p.url !== "string" ||
                !p.url ||
                !validUrl(p.url),
            ))
        )
          throw new Error("추가 채널이 올바르지 않습니다.");
      }
      if (key === "assets") {
        if (
          row.folder !== undefined &&
          (typeof row.folder !== "string" || row.folder.length > 100)
        )
          throw new Error("분류가 올바르지 않습니다.");
        if (
          row.tags !== undefined &&
          (!Array.isArray(row.tags) ||
            row.tags.length > 10 ||
            row.tags.some(
              (t) => typeof t !== "string" || !t.trim() || t.length > 30,
            ))
        )
          throw new Error("태그가 올바르지 않습니다.");
        if (row.isTemplate !== undefined && typeof row.isTemplate !== "boolean")
          throw new Error("템플릿 형식이 올바르지 않습니다.");
      }
      if (key === "activities" && row.metrics !== undefined) {
        if (
          !object(row.metrics) ||
          !["manual", "import"].includes(row.metrics.source as string) ||
          ["likes", "comments", "shares"].some(
            (k) =>
              (row.metrics as Record<string, unknown>)[k] !== null &&
              (!Number.isSafeInteger(
                (row.metrics as Record<string, unknown>)[k],
              ) ||
                Number((row.metrics as Record<string, unknown>)[k]) < 0),
          )
        )
          throw new Error("활동 지표가 올바르지 않습니다.");
      }
      if (key === "settlements") {
        if (
          row.externalReference !== undefined &&
          (typeof row.externalReference !== "string" ||
            row.externalReference.length > 250)
        )
          throw new Error("지급 참조가 올바르지 않습니다.");
        if (row.dueDate != null) validCalendarDate(String(row.dueDate));
      }
      if (["proposals", "creators", "assets"].includes(key) && !channel(row))
        throw new Error("지원하지 않는 채널입니다.");
      const urls =
        key === "proposals"
          ? ["destination", "contact"]
          : key === "creators"
            ? ["portfolio"]
            : key === "assets" || key === "activities"
              ? ["url"]
              : [];
      if (!urls.every((k) => validUrl(row[k])))
        throw new Error("저장된 주소가 올바르지 않습니다.");
      if (
        key === "activities" &&
        row.views !== null &&
        (!Number.isSafeInteger(row.views) || (row.views as number) < 0)
      )
        throw new Error("조회수 형식이 올바르지 않습니다.");
      if (key === "activities") validCalendarDate(row.publishedAt as string);
      if (
        key === "settlements" &&
        (!Number.isSafeInteger(row.amount) ||
          (row.amount as number) <= 0 ||
          !["recorded", "paid"].includes(row.status as string) ||
          (row.status === "recorded"
            ? row.paidAt !== null
            : typeof row.paidAt !== "string" ||
              !Number.isFinite(Date.parse(row.paidAt))))
      )
        throw new Error("정산 형식이 올바르지 않습니다.");
    }
  }
  const workspace = value as unknown as Workspace;
  for (const row of [...workspace.activities, ...workspace.settlements]) {
    if (
      !workspace.proposals.some((p) => p.id === row.proposalId) ||
      !workspace.creators.some((c) => c.id === row.creatorId)
    )
      throw new Error("연결된 제안 또는 홍보자가 없습니다.");
  }
  for (const row of workspace.activities)
    if (
      row.assetId != null &&
      !workspace.assets.some((a) => a.id === row.assetId)
    )
      throw new Error("연결된 콘텐츠가 없습니다.");
  return workspace;
}

export function validCalendarDate(value: string): string {
  const d = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(d.getTime()) ||
    d.toISOString().slice(0, 10) !== value
  )
    throw new Error("올바른 날짜를 입력해 주세요.");
  return value;
}
export function tags(value: string): string[] {
  const result = [
    ...new Set(
      value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
  if (result.length > 10 || result.some((v) => v.length > 30))
    throw new Error("태그는 30자 이내로 최대 10개 입력해 주세요.");
  return result;
}
export function channelProfiles(
  value: string,
): NonNullable<Creator["channelProfiles"]> {
  const rows = value
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
  if (rows.length > 12) throw new Error("추가 채널은 최대 12개입니다.");
  return rows.map((row) => {
    const [c, ...rest] = row.split("|");
    const channel = c.trim() as Channel;
    if (!channels.includes(channel))
      throw new Error("채널명 | https://주소 형식으로 입력해 주세요.");
    return { channel, url: webUrl(rest.join("|").trim()) };
  });
}

export function loadWorkspace(storage: Pick<Storage, "getItem">): {
  data: Workspace;
  error: string;
} {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return { data: raw ? parseWorkspace(raw) : emptyWorkspace(), error: "" };
  } catch {
    return {
      data: emptyWorkspace(),
      error:
        "저장 데이터를 읽지 못했습니다. 기존 데이터를 보호하기 위해 쓰기를 중지했습니다. 원본 백업을 내려받아 주세요.",
    };
  }
}

export function saveWorkspace(
  storage: Pick<Storage, "setItem">,
  data: Workspace,
): void {
  const raw = JSON.stringify(data);
  parseWorkspace(raw);
  storage.setItem(STORAGE_KEY, raw);
}

export function settlementCsv(workspace: Workspace): string {
  const cell = (value: string | number) => {
    const text = String(value);
    return `"${(/^[\s]*[=+@\-\t\r\n]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
  };
  const rows: (string | number)[][] = [
    [
      "settlementId",
      "제안",
      "홍보자",
      "내역",
      "금액(KRW)",
      "상태",
      "등록시각",
      "지급기록시각",
      "dueDate",
      "reference",
    ],
  ];
  for (const s of workspace.settlements)
    rows.push([
      s.id,
      workspace.proposals.find((p) => p.id === s.proposalId)?.title ?? "",
      workspace.creators.find((c) => c.id === s.creatorId)?.name ?? "",
      s.memo,
      s.amount,
      s.status === "paid" ? "외부 지급 기록" : "미지급 기록",
      s.createdAt,
      s.paidAt ?? "",
      s.dueDate ?? "",
      s.externalReference ?? "",
    ]);
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
