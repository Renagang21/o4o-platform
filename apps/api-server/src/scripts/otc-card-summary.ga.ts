/**
 * OTC 카드 요약 파생 — **언어 무관** (zh·ja 공용)
 *
 * 문제: badge/tile 카드는 저작기가 intro 를 고정 길이로 잘라 `…` 를 붙여 만든다(실측 190 유닛,
 *   186건이 정확히 59자). 그 결과 KO 카드가 어절 중간에서 끊겨 **번역 원문으로 부적합**하다.
 *
 * 해법: KO 카드를 긴 intro 전문으로 치환하지 **않는다**(카드 UI 요약 설계 보존).
 *   대신 번역 근거만 같은 문서의 완결본으로 바꾸고, 번역문에 **같은 요약 규칙**을 다시 적용한다.
 *   → KO canonical 무변경 · 카드 길이와 역할 유지 · 어절 중간 절단 없음.
 *
 * 길이 규칙: 고정 글자 수가 아니라 **원문 소비 비율**을 보존한다. 중국어는 같은 내용이 한국어보다
 *   짧으므로 58자를 그대로 쓰면 카드가 훨씬 많은 내용을 담게 되어 요약 역할이 깨진다.
 *
 * 경계 규칙: 잘린 자리가 수치·단위를 쪼개면 안 된다. 항상 **구분자 경계**까지 물러나고,
 *   물러날 구분자가 없으면 파생을 포기한다(임의 문구를 만들지 않는다).
 */
const ELLIPSIS_RE = /(…|\.\.\.)\s*$/;
/** 열거 구분자 — 여기까지만 물러난다. 수치·단위 내부에서는 절대 자르지 않는다. */
const BOUNDARY = /[，、,;；。．.·・/]/;

export const isEllipsisCard = (s: string): boolean => ELLIPSIS_RE.test(s.trim());
export const stripEllipsis = (s: string): string => s.trim().replace(ELLIPSIS_RE, '').trim();

export type DeriveResult = { ok: true; text: string; ratio: number; cutAt: number } | { ok: false; reason: string };

/**
 * @param koCard  KO 카드 요약 원문(말줄임표 포함)
 * @param koFull  같은 문서의 완결본 KO(보통 intro)
 * @param fullZh  완결본의 검증된 번역문
 */
export function deriveCardSummary(koCard: string, koFull: string, fullZh: string): DeriveResult {
  const base = stripEllipsis(koCard);
  const full = koFull.trim();
  if (!base || !full || !fullZh.trim()) return { ok: false, reason: 'EMPTY_INPUT' };
  const nb = base.replace(/\s+/g, ''), nf = full.replace(/\s+/g, '');
  if (!nf.startsWith(nb)) return { ok: false, reason: 'NOT_A_PREFIX' };   // 파생 근거 없음
  if (nf.length <= nb.length) return { ok: false, reason: 'FULL_NOT_LONGER' };

  const ratio = nb.length / nf.length;
  const zh = fullZh.trim();
  const target = Math.max(1, Math.round(zh.length * ratio));

  /* 목표 지점 이하에서 가장 뒤쪽 구분자까지 물러난다. */
  let cut = -1;
  for (let i = Math.min(target, zh.length) - 1; i > 0; i--) if (BOUNDARY.test(zh[i])) { cut = i; break; }
  if (cut < 0) return { ok: false, reason: 'NO_SAFE_BOUNDARY' };

  const text = zh.slice(0, cut).trim();
  if (!text) return { ok: false, reason: 'EMPTY_RESULT' };
  /* 잘라낸 결과가 완결본과 같아지면 요약이 아니다. */
  if (text.length >= zh.length) return { ok: false, reason: 'NOT_SHORTER' };
  return { ok: true, text: text + '…', ratio, cutAt: cut };
}

/**
 * 파생 카드 검증(G3 대체). 파생 카드는 KO 카드와 수치 지문을 맞출 수 없다 —
 * 잘리는 지점이 언어마다 다르기 때문이다. 대신 **완결본 번역의 엄격한 접두**임을 확인한다.
 * 접두가 보장되면 없던 수치가 새로 생길 수 없고, 수치 검증은 완결본 슬롯에서 이미 끝났다.
 */
export function verifyDerivedCard(cardZh: string, fullZh: string): string | null {
  const c = stripEllipsis(cardZh);
  if (!c) return 'DERIVED_EMPTY';
  if (!ELLIPSIS_RE.test(cardZh.trim())) return 'DERIVED_NO_ELLIPSIS';
  if (!fullZh.trim().startsWith(c)) return 'DERIVED_NOT_PREFIX_OF_FULL';
  if (c.length >= fullZh.trim().length) return 'DERIVED_NOT_SHORTER';
  return null;
}
