/**
 * WO-O4O-HFF-JA-BATCH-01-10000-DIRECT-BULK-PRODUCTION-V1  §5 / §6 / §7
 *
 * KO canonical HTML → JA canonical HTML (슬롯 치환). render 와 offline 측정이 **같은 코드**를 쓴다.
 *   - 구조(태그·class·순서)는 손대지 않는다 → renderer family 승계.
 *   - `<li>` 안에 `<span class="sd-tag">`/`<b>` 라벨이 중첩된 경우 라벨은 라벨 규칙이 이미 옮겼으므로
 *     남은 텍스트 조각만 옮긴다.
 *   - 슬롯 단위 수치 보존 강제(§6). 잔존 한글·간체자 혼입은 실패로 본다.
 */
import { JA_SLOTS, HANGUL, SIMPLIFIED_ONLY, norm, ja, lostNums, KEEP_PROPER } from './hff-ja-b01-translate.mjs';

export { JA_SLOTS, HANGUL, SIMPLIFIED_ONLY };

/** 원문 표기를 유지하는 제조사 법인명 구간 제거 — 잔존 한글 검사 전용. */
export const stripKeep = (s) => s.replace(KEEP_PROPER, ' ');
/* KO 원문이 `1&gt;` 처럼 엔티티로 들고 있는 기호가 번역 슬롯을 거치며 맨 `>` 로 돌아오면
   HTML 상 표기가 원문과 달라진다(렌더 결과는 같지만 raw HTML 검사에 걸린다). */
const esc = (s) => s.replace(/&(?!#?[a-zA-Z0-9]+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cnt = (h, re) => (h.match(re) ?? []).length;
export const PARITY = [[/<li[ >]/g, 'li'], [/<h2[ >]/g, 'h2'], [/sd-item/g, 'sd-item'], [/sd-tag/g, 'sd-tag'], [/<b>/g, 'b'], [/<ul[ >]/g, 'ul'], [/<p[ >]/g, 'p']];
export const parityBreak = (ko, out) => { for (const [re, name] of PARITY) if (cnt(ko, re) !== cnt(out, re)) return name; return null; };

export function build(html) {
  const misses = [];
  let out = html;
  for (const { kind, re } of JA_SLOTS) {
    out = out.replace(re, (whole, open, inner, close) => {
      const t = norm(inner);
      if (!t) return whole;
      /* 인라인 태그가 남아 있는 슬롯: 태그 사이 텍스트 조각만 개별로 옮긴다. */
      if (/<[a-z]/i.test(inner)) {
        let failed = false;
        const parts = inner.split(/(<[^>]+>)/).map((seg) => {
          if (seg.startsWith('<')) return seg;
          /* 태그 사이의 나열 쉼표(`</b>, <b>`)는 번역 대상 문장이 아니지만 표기는 일본어를 따른다. */
          if (!HANGUL.test(seg)) return /^[\s,，]+$/.test(seg) ? seg.replace(/[,，]/g, '、').replace(/\s+/g, '') : seg;
          let [, lead, core, tail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(seg);
          /* 조각 앞뒤의 구분 기호(`</b> · 임산부…`)는 문장이 아니라 구조다. 사전 조회 키에서
             어차피 탈락하므로 여기서 떼어 두고 번역한 뒤 원문 그대로 되붙인다. */
          let ms;
          if ((ms = /^([·•∙]\s*)([\s\S]+)$/.exec(core))) { lead += ms[1]; core = ms[2]; }
          if ((ms = /^([\s\S]+?)(\s*[·•∙])$/.exec(core))) { core = ms[1]; tail = ms[2] + tail; }
          const r = ja(kind, core);
          if (!r) { misses.push({ kind, text: norm(core), why: 'UNRESOLVED' }); failed = true; return seg; }
          const lost = lostNums(core, r.ja);
          if (lost.length) { misses.push({ kind, text: norm(core), why: 'NUMBER_DRIFT', lost }); failed = true; return seg; }
          return lead + esc(r.ja) + tail;
        });
        if (failed) return whole;
        return open + parts.join('') + close;
      }
      const r = ja(kind, inner);
      if (!r) { misses.push({ kind, text: t, why: 'UNRESOLVED' }); return whole; }
      const lost = lostNums(inner, r.ja);
      if (lost.length) { misses.push({ kind, text: t, why: 'NUMBER_DRIFT', lost }); return whole; }
      return open + esc(r.ja) + close;
    });
  }
  let hangul = 0;
  for (const { re } of JA_SLOTS) for (const m of out.matchAll(re)) if (HANGUL.test(stripKeep(norm(m[2])))) hangul++;
  /* 슬롯 밖 잔존 한글도 실패로 본다 — 슬롯 집합이 좁아 생기는 거짓 PASS 를 막는다.
     제품명(`<h1>`)과 제조사 법인명만 원문 표기로 남긴다. `<small>` 부제는 번역 대상이다. */
  const rest = stripKeep(out.replace(/<h1[^>]*>[\s\S]*?(?=<small|<\/h1>)/g, ' ').replace(/<[^>]+>/g, ' '));
  if (HANGUL.test(rest)) hangul++;
  /* ZH 트랙 사전을 우회 참조하는 경로가 생기면 간체자가 섞인다(§6 금지). 슬롯 안만 본다. */
  let simplified = 0;
  for (const { re } of JA_SLOTS) for (const m of out.matchAll(re)) if (SIMPLIFIED_ONLY.test(m[2])) simplified++;
  return { misses, hangul, simplified, html: out };
}
