/**
 * Drug OTC Store Description — 오프라인 CHECK 문서 마크다운 → content_json ETL (순수)
 *
 * WO-O4O-DRUG-OTC-DESCRIPTION-DRAFT-DB-APPLY-V1
 *
 * pilot/5/20/50 그룹 CHECK 문서의 설명서 본문 섹션을 파싱해 구조화 content 로 추출한다.
 * DB 무관 순수 함수(문자열 in → 파싱 결과 out). 헤더는 `##`(pilot) / `###`(5·20·50) 혼용,
 * 라벨(섹션번호·약효군 괄호 제거)로 fixture 와 매칭한다.
 */

export interface ParsedDrugOtcDraft {
  /** 정규화 라벨(성분 함량 제형) */
  label: string;
  /** 요약표(성분/분류/작용/주요 증상/선택 포인트/주의 대상 …) */
  summaryTable: Record<string, string>;
  efficacy: string | null;
  /** 복용 안내 또는 사용 안내(질정 등) */
  usage: string | null;
  usageLabel: '복용 안내' | '사용 안내' | null;
  caution: string | null;
  ingredientSelection: string | null;
  /** 원문 섹션 마크다운(무손실 보존) */
  bodyMarkdown: string;
}

/** `## 13.1 라벨 (약효군)` / `## 라벨` → 정규화 라벨. draft 헤더가 아니면 null. */
export function normalizeDraftHeaderLabel(line: string): string | null {
  const m = line.match(/^#{2,3}\s+(.*\S)\s*$/);
  if (!m) return null;
  let t = m[1].trim();
  t = t.replace(/^\d+(?:\.\d+)*\s+/, ''); // 선행 섹션번호 제거
  t = t.replace(/\s*\([^()]*\)\s*$/, ''); // 후행 약효군 괄호 제거
  return t.trim();
}

const BOLD_SECTIONS = ['효능·효과', '복용 안내', '사용 안내', '주의 대상', '성분 기준 선택'] as const;

/** 본문 섹션(bodyMarkdown) → {요약표, bold 섹션들}. */
function parseBody(bodyLines: string[]): Omit<ParsedDrugOtcDraft, 'label' | 'bodyMarkdown'> {
  const summaryTable: Record<string, string> = {};
  const sections: Record<string, string> = {};
  let currentBold: string | null = null;
  let buf: string[] = [];
  const flush = () => {
    if (currentBold) sections[currentBold] = buf.join('\n').trim();
    buf = [];
  };
  for (const raw of bodyLines) {
    const line = raw.replace(/\s+$/, '');
    const bold = line.match(/^\*\*(.+?)\*\*\s*$/);
    if (bold) {
      flush();
      currentBold = bold[1].trim();
      continue;
    }
    // 요약표 행: | key | value |  (구분선 |---| 제외)
    const tbl = line.match(/^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|\s*$/);
    if (tbl && !/^-+$/.test(tbl[1].replace(/[-\s]/g, '')) && tbl[1] !== '항목' && !/^-+$/.test(tbl[1])) {
      const k = tbl[1].trim();
      const v = tbl[2].trim();
      if (k && v && !/^-+$/.test(k) && !/^:?-+:?$/.test(v)) summaryTable[k] = v;
      continue;
    }
    if (currentBold) buf.push(line);
  }
  flush();
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

/**
 * 단일 문서 텍스트에서 draft 섹션들을 추출. label → ParsedDrugOtcDraft.
 * draft 헤더는 요약표(성분 행) 또는 **효능·효과** 를 포함하는 섹션만 인정(조사 섹션 오탐 방지).
 */
export function extractDraftsFromDoc(docText: string): Map<string, ParsedDrugOtcDraft> {
  const lines = docText.split(/\r?\n/);
  const out = new Map<string, ParsedDrugOtcDraft>();
  let i = 0;
  while (i < lines.length) {
    const label = normalizeDraftHeaderLabel(lines[i]);
    if (label == null) {
      i += 1;
      continue;
    }
    // body 수집: 다음 ## / ### 헤더 전까지
    const start = i + 1;
    let j = start;
    while (j < lines.length && !/^#{2,3}\s/.test(lines[j])) j += 1;
    const bodyLines = lines.slice(start, j);
    const bodyText = bodyLines.join('\n');
    // draft 섹션 판정: 효능·효과 bold 포함해야 draft 로 인정
    if (/^\*\*효능·효과\*\*/m.test(bodyText)) {
      const parsed = parseBody(bodyLines);
      out.set(label, { label, bodyMarkdown: bodyText.trim(), ...parsed });
    }
    i = j;
  }
  return out;
}

/** 문서군(pilot/5g/20g/50g) 텍스트 → label 통합 맵. */
export function extractAllDrafts(docTexts: string[]): Map<string, ParsedDrugOtcDraft> {
  const merged = new Map<string, ParsedDrugOtcDraft>();
  for (const t of docTexts) {
    for (const [k, v] of extractDraftsFromDoc(t)) merged.set(k, v);
  }
  return merged;
}
