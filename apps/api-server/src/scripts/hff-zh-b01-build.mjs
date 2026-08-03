/**
 * WO-O4O-HFF-ZH-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1  §4 / §5 / §7
 *
 * KO canonical HTML → ZH canonical HTML (슬롯 치환). render 와 offline 측정이 **같은 코드**를 쓴다.
 *   - 구조(태그·class·순서)는 손대지 않는다 → renderer family 승계.
 *   - `<li>` 안에 `<span class="sd-tag">`/`<b>` 라벨이 중첩된 경우, 라벨은 라벨 규칙이 이미 옮겼으므로
 *     남은 텍스트 조각만 옮긴다. 라벨 텍스트를 다시 통째로 치환하지 않는다.
 *   - 슬롯 단위 수치 보존 강제(§5).
 */
import { SLOT_RE, norm, zh, lostNums, KEEP_PROPER } from './hff-zh-b01-translate.mjs';

/* HFF ZH 전용 슬롯 확장 — 기준·규격 항목과 매장 문의 안내는 EN 트랙 슬롯 집합에 없다.
   중국어 설명서에서 이 두 영역이 한국어로 남으면 §7 대응 요건을 만족하지 못한다. */
const ZH_SLOTS = [
  ...SLOT_RE,
  /* `<b>망간</b> 표시량(...)의 80~150%` — 항목명이 `<b>` 로 감싸인 형태가 섞여 있다.
     인라인 태그를 포함해 슬롯을 잡고, 조각 단위 치환은 build 가 처리한다. */
  { kind: 'spec', re: /(<div class="sd-item">)([\s\S]*?)(<\/div>)/g },
  { kind: 'clause', re: /(<div class="sd-cta">\s*<p>)([\s\S]*?)(<\/p>)/g },
  /* `<h1>제품명<small>마그네슘 · 아연 · 칼슘</small></h1>` — 제목 안 부제는 원료 열거다.
     제품명과 달리 고유명사가 아니므로 번역 대상이다. */
  { kind: 'label', re: /(<small>)([\s\S]*?)(<\/small>)/g },
];

export const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
/** 원문 표기를 유지하는 제조사 법인명 구간 제거 — 잔존 한글 검사 전용. */
export const stripKeep = (s) => s.replace(KEEP_PROPER, ' ');
const cnt = (h, re) => (h.match(re) ?? []).length;
export const PARITY = [[/<li[ >]/g, 'li'], [/<h2[ >]/g, 'h2'], [/sd-item/g, 'sd-item'], [/sd-tag/g, 'sd-tag'], [/<b>/g, 'b'], [/<ul[ >]/g, 'ul'], [/<p[ >]/g, 'p']];
export const parityBreak = (ko, out) => { for (const [re, name] of PARITY) if (cnt(ko, re) !== cnt(out, re)) return name; return null; };

export function build(html) {
  const misses = [];
  let out = html;
  for (const { kind, re } of ZH_SLOTS) {
    out = out.replace(re, (whole, open, inner, close) => {
      const t = norm(inner);
      if (!t) return whole;
      /* 인라인 태그가 남아 있는 슬롯: 태그 사이 텍스트 조각만 개별로 옮긴다. */
      if (/<[a-z]/i.test(inner)) {
        let failed = false;
        const parts = inner.split(/(<[^>]+>)/).map((seg) => {
          if (seg.startsWith('<') || !HANGUL.test(seg)) return seg;
          const [, lead, core, tail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(seg);
          const r = zh(kind, core);
          if (!r) { misses.push({ kind, text: norm(core), why: 'UNRESOLVED' }); failed = true; return seg; }
          const lost = lostNums(core, r.zh);
          if (lost.length) { misses.push({ kind, text: norm(core), why: 'NUMBER_DRIFT', lost }); failed = true; return seg; }
          return lead + r.zh + tail;
        });
        if (failed) return whole;
        return open + parts.join('') + close;
      }
      const r = zh(kind, inner);
      if (!r) { misses.push({ kind, text: t, why: 'UNRESOLVED' }); return whole; }
      const lost = lostNums(inner, r.zh);
      if (lost.length) { misses.push({ kind, text: t, why: 'NUMBER_DRIFT', lost }); return whole; }
      return open + r.zh + close;
    });
  }
  let hangul = 0;
  for (const { re } of ZH_SLOTS) for (const m of out.matchAll(re)) if (HANGUL.test(stripKeep(norm(m[2])))) hangul++;
  /* 슬롯 밖 잔존 한글도 실패로 본다 — 슬롯 집합이 좁아 생기는 거짓 PASS 를 막는다(§7).
     `<h1>` 제품명과 제조사 법인명만 원문 표기로 남긴다(EN 트랙과 동일 계약). */
  /* 제품명만 원문 표기로 남긴다 — `<h1>` 안의 `<small>` 부제는 번역 대상이므로 면제하지 않는다. */
  const rest = stripKeep(out.replace(/<h1[^>]*>[\s\S]*?(?=<small|<\/h1>)/g, ' ').replace(/<[^>]+>/g, ' '));
  if (HANGUL.test(rest)) hangul++;
  return { misses, hangul, html: out };
}
