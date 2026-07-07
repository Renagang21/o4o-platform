/**
 * Quasi-Drug Permit Official Text Parser — 의약외품 EE/UD/NB XML → 평문 추출 (PURE, DB 무관)
 *
 * WO-O4O-QUASI-DRUG-PUBLIC-XML-DESCRIPTION-PARSER-DRYRUN-V1
 * 선행: WO-O4O-QUASI-DRUG-PUBLIC-CANDIDATE-IMPORT-MAPPER-AND-SERVICE-V1(§9 apply 완료)
 *
 * 대상: ProductCandidate.raw_payload.officialRegulatoryText.{efficacyXml,dosageXml,cautionXml}
 *   구조(실측): <DOC type="EE|UD|NB"><SECTION><ARTICLE><PARAGRAPH ...><![CDATA[본문]]></PARAGRAPH></ARTICLE></SECTION></DOC>
 *   - CDATA 99.9% / 일부 <TABLE><TR><TD>, <BR>, <IMG>, HTML entity(~13%) 포함.
 *
 * 정책:
 *   - 파싱만 한다(순수 함수). DB/네트워크/파일 미접근.
 *   - CDATA 본문을 언랩, PARAGRAPH/ARTICLE/TR 은 줄바꿈, TD 는 탭, BR 은 줄바꿈으로 평문화.
 *   - IMG 는 텍스트에서 제거하되 hasImg 플래그로 존재를 표시(이미지는 Gate C 별도).
 *   - HTML entity 디코드. 원문 XML 은 호출측이 raw_payload 에 계속 보존(무손실).
 *
 * title 속성 편입 (WO-O4O-QUASI-DRUG-OFFICIAL-TEXT-PARSER-TITLE-ATTR-REFINEMENT-V1):
 *   - 실 데이터의 상당수(특히 NB)는 본문이 ARTICLE title 속성에 저장됨(<ARTICLE title="본문..."></ARTICLE>).
 *   - ARTICLE/SECTION/PARAGRAPH 의 title 텍스트를 여는 태그 위치에 본문으로 편입한다.
 *   - DOC 의 title 은 섹션 라벨(효능효과/용법용량/사용상주의사항)이므로 편입하지 않는다.
 *   - title==본문 중복은 연속 중복 줄 제거로 정리한다.
 */

export interface QuasiDrugOfficialText {
  efficacyText: string; // 효능효과 (EE)
  dosageText: string; // 용법용량 (UD)
  cautionText: string; // 사용상주의사항 (NB)
  isEmpty: boolean; // 세 섹션 모두 빈 경우
  flags: {
    hadCdata: boolean;
    hasTable: boolean;
    hasImg: boolean;
    hadEntities: boolean;
  };
}

/**
 * 연속 중복 줄 제거 — title 속성 텍스트가 본문과 동일할 때 과도한 반복을 막는다.
 * 직전에 출력한 non-empty 줄과 (trim 비교) 같은 줄만 제거한다(비연속 중복은 보존).
 */
function dedupeConsecutiveLines(s: string): string {
  const out: string[] = [];
  let prev = '';
  for (const raw of s.split('\n')) {
    const line = raw.trim();
    if (line !== '' && line === prev) continue;
    out.push(raw);
    if (line !== '') prev = line;
  }
  return out.join('\n');
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&'); // amp 마지막 (이중 디코드 방지)
}

/** 단일 DOC XML → 평문. null/빈문자 → ''. */
export function xmlDocToPlainText(xml: string | null | undefined): string {
  if (xml == null) return '';
  let s = String(xml);
  if (s.trim() === '') return '';
  // 1) CDATA 언랩 (내용 보존)
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  // 2) title 속성 본문 편입 — ARTICLE/SECTION/PARAGRAPH 의 title 텍스트를 여는 태그 위치에 삽입.
  //    실 데이터의 상당수(특히 NB 사용상주의사항)는 본문이 아니라 ARTICLE title 속성에 저장된다.
  //    DOC 의 title 은 섹션 라벨(효능효과/용법용량/사용상주의사항)이므로 제외한다(본문 아님).
  s = s.replace(
    /<(?:ARTICLE|SECTION|PARAGRAPH)\b[^>]*?\btitle\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi,
    (_m, dq: string | undefined, sq: string | undefined) => {
      const t = (dq ?? sq ?? '').trim();
      return t === '' ? '\n' : `\n${t}\n`;
    },
  );
  // 3) 블록/행 구분자
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n');
  s = s.replace(/<\/\s*(paragraph|article|tr|caption|p|li)\s*>/gi, '\n');
  s = s.replace(/<\/\s*td\s*>/gi, '\t');
  // 4) 나머지 태그 제거 (IMG 포함 — 존재는 flags 로 별도 기록)
  s = s.replace(/<[^>]+>/g, '');
  // 5) 엔티티 디코드
  s = decodeEntities(s);
  // 6) 연속 중복 줄 제거 (title==body 반복 방지)
  s = dedupeConsecutiveLines(s);
  // 7) 공백 정리 (빈 줄 없이 단일 줄바꿈으로 — title 편입 seam 정리 포함)
  s = s
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ');
  return s.trim();
}

/**
 * EE/UD/NB 3개 XML → 구조화 평문 + 플래그.
 * @param ee 효능효과 XML  @param ud 용법용량 XML  @param nb 사용상주의사항 XML
 */
export function parseQuasiDrugOfficialText(
  ee: string | null | undefined,
  ud: string | null | undefined,
  nb: string | null | undefined,
): QuasiDrugOfficialText {
  const blob = [ee, ud, nb].filter((v) => v != null && String(v).trim() !== '').join('');
  const efficacyText = xmlDocToPlainText(ee);
  const dosageText = xmlDocToPlainText(ud);
  const cautionText = xmlDocToPlainText(nb);
  return {
    efficacyText,
    dosageText,
    cautionText,
    isEmpty: efficacyText === '' && dosageText === '' && cautionText === '',
    flags: {
      hadCdata: /<!\[CDATA\[/i.test(blob),
      hasTable: /<\s*table[\s>]/i.test(blob),
      hasImg: /<\s*img[\s>]/i.test(blob),
      hadEntities: /&(?:lt|gt|amp|nbsp|quot|apos|#\d+|#x[0-9a-fA-F]+);/i.test(blob),
    },
  };
}
