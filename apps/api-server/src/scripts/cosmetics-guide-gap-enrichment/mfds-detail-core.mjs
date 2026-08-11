/**
 * 식약처 기능성화장품 보고 **상세** 페이지 파서 (SSOT).
 *
 * 구조: `<p class="text_st3 ...">효능효과</p>` 다음 `<table>` 의 tbody 안 `<td>` 가 본문이다.
 * 기본정보 표는 `<th>제품명</th><td>…</td>` 4열 구조다.
 */
const decode = (s) =>
  String(s)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();

/** `<p class="text_st3…">라벨</p> … <table …>…</table>` 에서 표 본문 텍스트를 뽑는다. */
function sectionAfterLabel(html, label) {
  const li = html.indexOf(`>${label}</p>`);
  if (li < 0) return null;
  const ts = html.indexOf('<table', li);
  if (ts < 0) return null;
  const te = html.indexOf('</table>', ts);
  if (te < 0) return null;
  const table = html.slice(ts, te);
  const tb = table.match(/<tbody[\s\S]*?<\/tbody>/i);
  if (!tb) return null;
  const cells = [...tb[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => decode(m[1])).filter(Boolean);
  const text = cells.join('\n').trim();
  return text || null;
}

/** 기본정보 표(제품명 / 보고완료일자 / 화장품책임판매업자)에서 값을 읽는다. */
function basicField(html, label) {
  const re = new RegExp(`<th[^>]*>\\s*${label}\\s*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`, 'i');
  const m = html.match(re);
  return m ? decode(m[1]) || null : null;
}

const LBL_EFFICACY = '효능효과'; // 효능효과
const LBL_USAGE = '용법용량'; // 용법용량
const LBL_CAUTION = '사용상의주의사항'; // 사용상의주의사항
const LBL_PRODUCT = '제품명'; // 제품명
const LBL_COMPANY = '화장품책임판매업자'; // 화장품책임판매업자

export function parseMfdsDetail(html) {
  if (!html || html.length < 500) return null;
  const productName = basicField(html, LBL_PRODUCT);
  if (!productName) return null;
  return {
    productName,
    companyName: basicField(html, LBL_COMPANY),
    efficacy: sectionAfterLabel(html, LBL_EFFICACY),
    usage: sectionAfterLabel(html, LBL_USAGE),
    cautions: sectionAfterLabel(html, LBL_CAUTION),
  };
}

export const MFDS_DETAIL_URL = (seq) => `https://nedrug.mfds.go.kr/pbp/CCBDC01/getItem?cosmeticReportSeq=${seq}`;
