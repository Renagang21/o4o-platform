/**
 * Drug OTC COMBO Store Description — GROUNDING CHECK 문서 마크다운 → content_json ETL (순수)
 *
 * WO-O4O-DRUG-OTC-DESCRIPTION-COMBO-NONCOLD-NONNUTRITION-DRAFT-DB-APPLY-V1
 *
 * GROUNDING-DRAFT-V1 §5.x 계열 초안(요약표 + inline **효능·효과** / **복용 안내** / **주의 대상**
 * / **성분 기준 선택**)을 파싱한다. SINGLE 파서와 달리 bold 라벨과 본문이 **같은 줄**에 온다.
 * DB 무관 순수 함수. 헤더 `### 5.1 [drafted] 라벨 (계열)` → `[drafted]`/섹션번호/후행괄호 제거한 정규화 라벨.
 */

export interface ParsedComboDraft {
  label: string;
  summaryTable: Record<string, string>;
  efficacy: string | null;
  usage: string | null;
  usageLabel: '복용 안내' | '사용 안내' | null;
  caution: string | null;
  ingredientSelection: string | null;
  bodyMarkdown: string;
}

const INLINE_SECTIONS = ['효능·효과', '복용 안내', '사용 안내', '주의 대상', '성분 기준 선택'] as const;

/** `### 5.1 [drafted] 변비약 — 자극성 완하제 복합 정/캡슐 (A06AB52 · 14행)` → `변비약 — 자극성 완하제 복합 정/캡슐` */
export function normalizeComboHeaderLabel(line: string): string | null {
  const m = line.match(/^#{2,4}\s+(.*\S)\s*$/);
  if (!m) return null;
  let t = m[1].trim();
  t = t.replace(/^\d+(?:\.\d+)*\s+/, ''); // 선행 섹션번호
  t = t.replace(/^\[[^\]]+\]\s*/, ''); // [drafted] / [needs_review] prefix
  t = t.replace(/\s*\([^()]*\)\s*$/, ''); // 후행 (계열) 괄호
  return t.trim();
}

/** inline `**효능·효과** 본문…` 한 줄 → {라벨, 본문}. */
function parseInlineSection(line: string): { label: string; text: string } | null {
  const m = line.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  if (!m) return null;
  return { label: m[1].trim(), text: m[2].trim() };
}

function parseBody(bodyLines: string[]): Omit<ParsedComboDraft, 'label' | 'bodyMarkdown'> {
  const summaryTable: Record<string, string> = {};
  const sections: Record<string, string> = {};
  for (const raw of bodyLines) {
    const line = raw.replace(/\s+$/, '');
    const inline = parseInlineSection(line);
    if (inline && (INLINE_SECTIONS as readonly string[]).includes(inline.label)) {
      // §6 축약 "(§6 공통 문구)" 도 그대로 보존
      sections[inline.label] = inline.text;
      continue;
    }
    const tbl = line.match(/^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|\s*$/);
    if (tbl) {
      const k = tbl[1].trim();
      const v = tbl[2].trim();
      if (k && v && k !== '항목' && !/^:?-+:?$/.test(k) && !/^:?-+:?$/.test(v)) summaryTable[k] = v;
    }
  }
  const usageLabel = sections['복용 안내'] ? '복용 안내' : sections['사용 안내'] ? '사용 안내' : null;
  return {
    summaryTable,
    efficacy: sections['효능·효과'] ?? null,
    usage: usageLabel ? sections[usageLabel] : null,
    usageLabel,
    caution: sections['주의 대상'] ?? null,
    ingredientSelection: sections['성분 기준 선택'] ?? null,
  };
}

/** 문서 텍스트 → label → ParsedComboDraft. **효능·효과** inline 포함 섹션만 draft 로 인정. */
export function extractComboDraftsFromDoc(docText: string): Map<string, ParsedComboDraft> {
  const lines = docText.split(/\r?\n/);
  const out = new Map<string, ParsedComboDraft>();
  let i = 0;
  while (i < lines.length) {
    const label = normalizeComboHeaderLabel(lines[i]);
    if (label == null) {
      i += 1;
      continue;
    }
    const start = i + 1;
    let j = start;
    while (j < lines.length && !/^#{2,4}\s/.test(lines[j])) j += 1;
    const bodyLines = lines.slice(start, j);
    const bodyText = bodyLines.join('\n');
    if (/^\*\*효능·효과\*\*/m.test(bodyText)) {
      const parsed = parseBody(bodyLines);
      out.set(label, { label, bodyMarkdown: bodyText.trim(), ...parsed });
    }
    i = j;
  }
  return out;
}
