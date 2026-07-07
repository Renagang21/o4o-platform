/**
 * Unit tests — WO-O4O-QUASI-DRUG-PUBLIC-XML-DESCRIPTION-PARSER-DRYRUN-V1
 * EE/UD/NB <DOC> XML(CDATA/table/br/img/entity) → 평문 추출. 실 DB 불필요.
 */
import {
  xmlDocToPlainText,
  parseQuasiDrugOfficialText,
} from '../quasi-drug-permit-official-text.parser.js';

const EE = `\n <DOC title="효능효과" type="EE">\n<SECTION title="">\n<ARTICLE title="">\n<PARAGRAPH tagName="p" textIndent="0"><![CDATA[구중청량, 구취제거]]></PARAGRAPH>\n</ARTICLE>\n</SECTION>\n</DOC>`;
const UD = `<DOC title="용법용량" type="UD"><SECTION><ARTICLE><PARAGRAPH tagName="p"><![CDATA[1회 6-10환을 수회 복용]]></PARAGRAPH></ARTICLE></SECTION></DOC>`;
const NB = `<DOC title="사용상주의사항" type="NB"><SECTION><ARTICLE><PARAGRAPH><![CDATA[없음]]></PARAGRAPH></ARTICLE></SECTION></DOC>`;

describe('xmlDocToPlainText', () => {
  it('CDATA 본문을 언랩하고 태그를 제거한다', () => {
    expect(xmlDocToPlainText(EE)).toBe('구중청량, 구취제거');
    expect(xmlDocToPlainText(UD)).toBe('1회 6-10환을 수회 복용');
    expect(xmlDocToPlainText(NB)).toBe('없음');
  });

  it('null/빈문자는 빈 문자열', () => {
    expect(xmlDocToPlainText(null)).toBe('');
    expect(xmlDocToPlainText('')).toBe('');
    expect(xmlDocToPlainText('   ')).toBe('');
  });

  it('여러 PARAGRAPH 는 줄바꿈으로 분리', () => {
    const xml = `<DOC><ARTICLE><PARAGRAPH><![CDATA[첫줄]]></PARAGRAPH><PARAGRAPH><![CDATA[둘째줄]]></PARAGRAPH></ARTICLE></DOC>`;
    expect(xmlDocToPlainText(xml)).toBe('첫줄\n둘째줄');
  });

  it('BR 은 줄바꿈, TABLE/TD 는 셀 텍스트로 평문화', () => {
    const xml = `<DOC><ARTICLE><PARAGRAPH><![CDATA[윗줄]]><BR/><![CDATA[아랫줄]]></PARAGRAPH></ARTICLE></DOC>`;
    expect(xmlDocToPlainText(xml)).toBe('윗줄\n아랫줄');
    const table = `<DOC><TABLE><TR><TD><![CDATA[A]]></TD><TD><![CDATA[B]]></TD></TR></TABLE></DOC>`;
    expect(xmlDocToPlainText(table)).toContain('A');
    expect(xmlDocToPlainText(table)).toContain('B');
  });

  it('HTML entity 를 디코드한다 (amp 이중디코드 없음)', () => {
    const xml = `<DOC><ARTICLE><PARAGRAPH><![CDATA[1&lt;2 &amp;&amp; 3&gt;0 &#48;]]></PARAGRAPH></ARTICLE></DOC>`;
    expect(xmlDocToPlainText(xml)).toBe('1<2 && 3>0 0');
  });

  it('IMG 는 텍스트에서 제거된다', () => {
    const xml = `<DOC><ARTICLE><PARAGRAPH><![CDATA[설명]]><IMG src="x.jpg"/></PARAGRAPH></ARTICLE></DOC>`;
    expect(xmlDocToPlainText(xml)).toBe('설명');
  });
});

describe('xmlDocToPlainText — title 속성 편입 (REFINEMENT-V1)', () => {
  it('ARTICLE title-only (본문 없음) → title 텍스트 추출', () => {
    const xml = `<DOC><ARTICLE title="사용 전 다음 사항을 확인하십시오."></ARTICLE></DOC>`;
    expect(xmlDocToPlainText(xml)).toBe('사용 전 다음 사항을 확인하십시오.');
  });

  it('ARTICLE title + body → 둘 다 보존(순서 유지)', () => {
    const xml = `<DOC><ARTICLE title="다음과 같은 경우 사용하지 마십시오."><PARAGRAPH><![CDATA[상처 부위에는 사용하지 마십시오.]]></PARAGRAPH></ARTICLE></DOC>`;
    expect(xmlDocToPlainText(xml)).toBe('다음과 같은 경우 사용하지 마십시오.\n상처 부위에는 사용하지 마십시오.');
  });

  it('nested SECTION/ARTICLE title 추출, DOC title(섹션 라벨)은 제외', () => {
    const xml = `<DOC title="사용상 주의사항"><SECTION title="일반적 주의"><ARTICLE title="눈에 들어가지 않도록 주의하십시오."></ARTICLE></SECTION></DOC>`;
    // DOC title '사용상 주의사항' 은 섹션 라벨이므로 편입하지 않는다(기존 동작·중복 헤더 방지).
    expect(xmlDocToPlainText(xml)).toBe('일반적 주의\n눈에 들어가지 않도록 주의하십시오.');
  });

  it('title == body 중복은 연속 중복 줄 제거로 1회만', () => {
    const xml = `<DOC><ARTICLE title="상처 부위에는 사용하지 마십시오."><PARAGRAPH><![CDATA[상처 부위에는 사용하지 마십시오.]]></PARAGRAPH></ARTICLE></DOC>`;
    expect(xmlDocToPlainText(xml)).toBe('상처 부위에는 사용하지 마십시오.');
  });

  it('작은따옴표 title 도 처리', () => {
    const xml = `<DOC><ARTICLE title='홑따옴표 주의'></ARTICLE></DOC>`;
    expect(xmlDocToPlainText(xml)).toBe('홑따옴표 주의');
  });

  it('DOC title(섹션 라벨) 은 본문에 섞이지 않는다 (회귀 가드)', () => {
    const xml = `<DOC title="효능효과"><ARTICLE><PARAGRAPH><![CDATA[구중청량]]></PARAGRAPH></ARTICLE></DOC>`;
    expect(xmlDocToPlainText(xml)).toBe('구중청량');
  });

  it('title 속성 텍스트의 HTML entity 디코드', () => {
    const xml = `<DOC><ARTICLE title="1&lt;2 &amp; 3"></ARTICLE></DOC>`;
    expect(xmlDocToPlainText(xml)).toBe('1<2 & 3');
  });

  it('NB title-only 사용상주의사항 → cautionText 추출', () => {
    const nb = `<DOC title="사용상주의사항" type="NB"><SECTION><ARTICLE title="본 제품은 멸균된 제품이므로 사용직전에 개봉하여 주십시오."></ARTICLE></SECTION></DOC>`;
    const r = parseQuasiDrugOfficialText(null, null, nb);
    expect(r.cautionText).toBe('본 제품은 멸균된 제품이므로 사용직전에 개봉하여 주십시오.');
    expect(r.isEmpty).toBe(false);
  });
});

describe('parseQuasiDrugOfficialText', () => {
  it('EE/UD/NB 3섹션을 구조화 평문으로 반환', () => {
    const r = parseQuasiDrugOfficialText(EE, UD, NB);
    expect(r.efficacyText).toBe('구중청량, 구취제거');
    expect(r.dosageText).toBe('1회 6-10환을 수회 복용');
    expect(r.cautionText).toBe('없음');
    expect(r.isEmpty).toBe(false);
    expect(r.flags.hadCdata).toBe(true);
  });

  it('세 섹션 모두 결측 → isEmpty=true', () => {
    const r = parseQuasiDrugOfficialText(null, null, '');
    expect(r.isEmpty).toBe(true);
    expect(r.efficacyText).toBe('');
  });

  it('flags: table/img/entities 감지', () => {
    const withTable = `<DOC><TABLE><TR><TD><![CDATA[a]]></TD></TR></TABLE></DOC>`;
    const withImg = `<DOC><PARAGRAPH><![CDATA[b]]><IMG src="y"/></PARAGRAPH></DOC>`;
    const withEnt = `<DOC><PARAGRAPH><![CDATA[c&lt;d]]></PARAGRAPH></DOC>`;
    expect(parseQuasiDrugOfficialText(withTable, null, null).flags.hasTable).toBe(true);
    expect(parseQuasiDrugOfficialText(withImg, null, null).flags.hasImg).toBe(true);
    expect(parseQuasiDrugOfficialText(withEnt, null, null).flags.hadEntities).toBe(true);
  });
});
