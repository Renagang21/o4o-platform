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
  // 2) 블록/행 구분자
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n');
  s = s.replace(/<\/\s*(paragraph|article|tr|caption|p|li)\s*>/gi, '\n');
  s = s.replace(/<\/\s*td\s*>/gi, '\t');
  // 3) 나머지 태그 제거 (IMG 포함 — 존재는 flags 로 별도 기록)
  s = s.replace(/<[^>]+>/g, '');
  // 4) 엔티티 디코드
  s = decodeEntities(s);
  // 5) 공백 정리
  s = s
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
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
