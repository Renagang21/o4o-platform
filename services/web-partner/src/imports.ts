import {
  base,
  calendarDate,
  validCalendarDate,
  integer,
  type Activity,
  type Workspace,
} from "./model";

/** Bounded RFC4180 parser. Never evaluates cells or partially imports a bad file. */
export function csv(text: string): Record<string, string>[] {
  if (new TextEncoder().encode(text).length > 1024 * 1024)
    throw new Error("CSV 파일은 1MB 이내로 선택해 주세요.");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
    } else if (c === '"' && !cell && !closed) quoted = true;
    else if (c === "," || c === "\n" || c === "\r") {
      row.push(cell);
      cell = "";
      closed = false;
      if (c !== ",") {
        if (c === "\r" && source[i + 1] === "\n") i++;
        if (row.some((v) => v.trim())) rows.push(row);
        row = [];
      }
    } else {
      if (closed || c === '"')
        throw new Error("CSV 따옴표 형식을 확인해 주세요.");
      cell += c;
    }
    if (cell.length > 20000 || rows.length > 1001)
      throw new Error("CSV는 1,000행 이내로 입력해 주세요.");
  }
  if (quoted) throw new Error("CSV 따옴표가 닫히지 않았습니다.");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  if (rows.length < 2 || rows.length > 1001)
    throw new Error("CSV 제목 행과 1~1,000개 데이터 행이 필요합니다.");
  const header = rows.shift()!.map((v) => v.trim());
  if (
    header.some((v) => !v) ||
    new Set(header).size !== header.length ||
    header.some((v) => ["__proto__", "prototype", "constructor"].includes(v))
  )
    throw new Error("CSV 제목이 비어 있거나 중복되었습니다.");
  return rows.map((r, i) => {
    if (r.length !== header.length)
      throw new Error(`${i + 2}행의 열 개수를 확인해 주세요.`);
    return Object.fromEntries(header.map((h, j) => [h, r[j].trim()]));
  });
}
export function activitiesCsv(
  text: string,
  w: Workspace,
  proposalId: string,
  creatorId: string,
): { records: Activity[]; skipped: number } {
  if (
    !w.proposals.some((p) => p.id === proposalId) ||
    !w.creators.some((c) => c.id === creatorId)
  )
    throw new Error("홍보 제안과 홍보자를 선택해 주세요.");
  const rows = csv(text),
    seen = new Set(
      w.activities.map((a) => `${a.creatorId}|${new URL(a.url).href}`),
    );
  const records: Activity[] = [];
  let skipped = 0;
  for (const [i, row] of rows.entries()) {
    if (
      !row.url ||
      !row.publishedAt ||
      Object.keys(row).some(
        (k) =>
          ![
            "url",
            "publishedAt",
            "views",
            "likes",
            "comments",
            "shares",
          ].includes(k),
      )
    )
      throw new Error(
        `${i + 2}행: url,publishedAt,views,likes,comments,shares 열을 확인해 주세요.`,
      );
    let url: URL;
    try {
      url = new URL(row.url);
    } catch {
      throw new Error(`${i + 2}행: 게시물 주소를 확인해 주세요.`);
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error(`${i + 2}행: 안전한 게시물 주소를 입력해 주세요.`);
    const publishedAt = calendarDate(row.publishedAt);
    const number = (v: string | undefined) => (v ? integer(v) : null);
    const values = {
      views: number(row.views),
      likes: number(row.likes),
      comments: number(row.comments),
      shares: number(row.shares),
    };
    const key = `${creatorId}|${url.href}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    records.push({
      ...base(),
      proposalId,
      creatorId,
      url: url.href,
      publishedAt,
      views: values.views,
      metrics: {
        likes: values.likes,
        comments: values.comments,
        shares: values.shares,
        source: "import",
      },
    });
  }
  return { records, skipped };
}
export function paymentsCsv(
  text: string,
  w: Workspace,
): { workspace: Workspace; updated: number } {
  const rows = csv(text),
    seen = new Set<string>(),
    changes = new Map<string, { paidAt: string; reference: string }>();
  for (const [i, row] of rows.entries()) {
    if (
      !row.settlementId ||
      !row.paidAt ||
      Object.keys(row).some(
        (k) => !["settlementId", "paidAt", "reference"].includes(k),
      ) ||
      seen.has(row.settlementId)
    )
      throw new Error(
        `${i + 2}행: settlementId,paidAt,reference 열과 중복 ID를 확인해 주세요.`,
      );
    seen.add(row.settlementId);
    const entry = w.settlements.find((s) => s.id === row.settlementId);
    if (
      !entry ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        row.paidAt,
      ) ||
      !Number.isFinite(Date.parse(row.paidAt)) ||
      Date.parse(row.paidAt) > Date.now() ||
      (row.reference || "").length > 250
    )
      throw new Error(
        `${i + 2}행: 등록된 정산 ID와 지급 시각·참조를 확인해 주세요.`,
      );
    validCalendarDate(row.paidAt.slice(0, 10));
    const paidAt = new Date(row.paidAt).toISOString(),
      reference = row.reference || "";
    if (entry.status === "paid") {
      if (
        Date.parse(entry.paidAt || "") !== Date.parse(paidAt) ||
        (entry.externalReference || "") !== reference
      )
        throw new Error(
          `${i + 2}행: 기존 지급 기록과 다릅니다. 개별 기록 수정에서 확인해 주세요.`,
        );
      continue;
    }
    changes.set(entry.id, { paidAt, reference });
  }
  return {
    workspace: {
      ...w,
      settlements: w.settlements.map((s) => {
        const c = changes.get(s.id);
        return c
          ? {
              ...s,
              status: "paid",
              paidAt: c.paidAt,
              externalReference: c.reference,
            }
          : s;
      }),
    },
    updated: changes.size,
  };
}
