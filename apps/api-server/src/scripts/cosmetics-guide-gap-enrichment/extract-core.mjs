/**
 * 상세 페이지 → **사실값** 추출 core (SSOT).
 *
 * 무신사 상품 페이지에는 전자상거래법상 **상품정보제공고시** 표가 들어 있다.
 * 이 표는 브랜드/책임판매업자가 제출해 판매처가 게시한 법정 표기이므로,
 * 판매명 문자열보다 훨씬 강한 사실 원천이다(WO §3 우선순위 2~3).
 *
 * 원칙 (WO §5 · CLAUDE.md 콘텐츠 불변 원칙)
 *   - 표에 있는 값만 읽는다. 성분에서 효능을 **추론하지 않는다**.
 *   - 값이 없으면 비운다. 채우지 않는다.
 */

/** Next.js flight 페이로드 안에 escape 된 HTML 을 되돌린다. */
export function unescapeFlight(s) {
  return String(s)
    .replace(/\\u003C/gi, '<')
    .replace(/\\u003E/gi, '>')
    .replace(/\\u0026/gi, '&')
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\//g, '/');
}

const stripTags = (s) =>
  String(s)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/**
 * `<th>라벨</th><td>값</td>` 쌍을 전부 뽑는다.
 * 무신사 고시 표는 인라인 style 이 붙어 있어 태그 속성을 허용해야 한다.
 */
export function parseNoticeTable(html) {
  const out = {};
  const re = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
  for (const m of html.matchAll(re)) {
    const k = stripTags(m[1]);
    const v = stripTags(m[2]);
    if (!k || !v) continue;
    if (out[k] === undefined) out[k] = v;
  }
  return out;
}

/** 값이 사실상 비어 있는 표기인가 (`상세페이지 참조`, `-`, `해당없음` …). */
export function isVoidValue(v) {
  if (!v) return true;
  const s = v.replace(/\s+/g, '');
  if (s.length < 2) return true;
  return /^(-+|없음|해당없음|해당사항없음|상세페이지참조|상세페이지참고|상품상세참조|상품상세페이지참조|별도표기|제품별도표기|상세설명참조|본문참조|위내용참조|상기참조|N\/A|na)$/i.test(s);
}

const NOTICE_ALIASES = {
  capacity: ['크기(용량)/무게(중량)', '내용물의 용량 또는 중량', '용량 또는 중량', '내용물의 용량', '용량', '중량', '크기/용량'],
  spec: ['주요사양', '제품 주요 사양', '주요 사양', '제품주요사양'],
  usage: ['사용방법', '사용법', '사용 방법'],
  ingredients: ['전성분', '화장품법에 따라 기재해야 하는 모든 성분', '성분'],
  functional: ['기능성화장품 심사필 여부', '기능성 화장품 심사필 여부', '기능성화장품 여부', '식품의약품안전처 심사필 여부'],
  cautions: ['주의사항', '사용할 때의 주의사항', '사용시 주의사항'],
  maker: ['제조자/수입자', '제조업자', '제조원', '제조자'],
  origin: ['제조국(원산지)', '제조국', '원산지'],
  skinType: ['제품 사용 대상', '사용대상', '피부타입'],
};

/** 라벨 별칭을 정규 필드로 접는다. 정확 일치 우선, 그다음 포함 일치. */
export function foldNotice(table) {
  const out = {};
  const entries = Object.entries(table);
  for (const [field, aliases] of Object.entries(NOTICE_ALIASES)) {
    let hit = null;
    for (const a of aliases) {
      const e = entries.find(([k]) => k.replace(/\s+/g, '') === a.replace(/\s+/g, ''));
      if (e) {
        hit = e[1];
        break;
      }
    }
    if (!hit) {
      for (const a of aliases) {
        const e = entries.find(([k]) => k.replace(/\s+/g, '').includes(a.replace(/\s+/g, '')));
        if (e) {
          hit = e[1];
          break;
        }
      }
    }
    if (hit && !isVoidValue(hit)) out[field] = hit;
  }
  return out;
}

/** 무신사 상품 HTML → 고시 사실값. 표가 없으면 null. */
export function extractMusinsa(html) {
  const un = unescapeFlight(html);
  const table = parseNoticeTable(un);
  if (!Object.keys(table).length) return null;
  const folded = foldNotice(table);
  return Object.keys(folded).length ? { ...folded, _labels: Object.keys(table) } : null;
}
