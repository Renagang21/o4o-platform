/**
 * OTC KO 절단 판정 — **회귀시험**
 *
 * 판정 규칙이 바뀌면 이 시험 없이는 선정기가 기동하지 않는다(otc-zh-unit-select 가 startup 에서 호출).
 * 사례는 전부 실측 원장(otc-ko-truncated-unit-audit.ga.json)과 KO canonical 에서 가져온 것이다.
 *
 * 단독 실행:  tsx src/scripts/otc-ko-truncation-policy.spec.ga.ts
 */
import { judgeSlot, judgeDoc, stripTrailingParenthetical, balancedDelimiters, BLOCKING } from './otc-ko-truncation-policy.ga.js';
import { slots } from './otc-zh-slots.ga.js';
import { deriveCardSummary, verifyDerivedCard } from './otc-card-summary.ga.js';
import type { ReasonCode } from './otc-ko-truncation-policy.ga.js';

type Case = { name: string; kind: string; text: string; blocked: boolean; reason?: ReasonCode };

/* ── 반드시 정상으로 판정 ─────────────────────────────────────────────────── */
const PASS: Case[] = [
  { name: '카드 명사구 열거 (위산과다…위부팽만감)', kind: 'tile', blocked: false, reason: 'DISPLAY_SUMMARY_ALLOWED',
    text: '위산과다, 속쓰림, 위부불쾌감, 위부팽만감, 식체(위체), 구역, 구토, 위통, 신트림, 소화불량, 식욕감퇴(식욕부진), 과식, 체함, 소화촉진, 소화불량으로 인한 위부팽만감' },
  { name: '카드 명사구 열거 (임신 6개월 이상 임부)', kind: 'tile', blocked: false, reason: 'DISPLAY_SUMMARY_ALLOWED',
    text: '아세트아미노펜 과량 복용 시 간손상 위험요인 보유자, 매일 세 잔 이상 정기적 음주자, 임신 6개월 이상 임부' },
  { name: '뱃지 명사구 열거 (연조직손상)', kind: 'badge', blocked: false, reason: 'DISPLAY_SUMMARY_ALLOWED',
    text: '두통·치통·생리통·근육통·신경통, 류마티양·골관절염 등 관절질환, 급성통풍, 연조직손상' },
  { name: '종결어미 완결 — …에 사용합니다 (마침표 없음)', kind: 'intro', blocked: false, reason: 'KOREAN_TERMINATOR_COMPLETE',
    text: '갱년기 시 어깨 및 목결림, 수족저림 및 수족냉증 증상의 완화에 사용합니다' },
  { name: '종결어미 완결 — …복용하지 마십시오 (부정·금기 보존)', kind: 'warn', blocked: false, reason: 'KOREAN_TERMINATOR_COMPLETE',
    text: '이 약은 칼슘염, 경구용 테트라사이클린계 제제, 제산제와 함께 복용하지 마십시오' },
  { name: '종결어미 완결 — …상의하십시오', kind: 'warn', blocked: false, reason: 'KOREAN_TERMINATOR_COMPLETE',
    text: '여러 차례 복용하여도 증상의 개선이 없을 경우 복용을 즉각 중지하고 의사 또는 약사와 상의하십시오' },
  { name: '종결부호 뒤 괄호 주석 — …중단하십시오. (야간용)', kind: 'warn', blocked: false, reason: 'TERMINATED',
    text: '임부 또는 수유 중인 사람은 이 약을 복용하지 않거나 수유를 중단하십시오. (야간용)' },
  { name: '종결어미 뒤 괄호 주석 — …마세요(비타민 A결핍증 환자는 제외)', kind: 'warn', blocked: false, reason: 'KOREAN_TERMINATOR_COMPLETE',
    text: '임부 또는 임신하고 있을 가능성이 있는 여성은 비타민 A를 5,000 IU/일 이상 투여하지 마세요(비타민 A결핍증 환자는 제외)' },
  { name: '전체가 괄호 주석 — (…5-10배입니다)', kind: 'intake', blocked: false, reason: 'KOREAN_TERMINATOR_COMPLETE',
    text: '(위장세척을 하는 경우에는, 약용탄의 추천용량은 통상 섭취된 중독 물질의 5-10배입니다)' },
  { name: '라벨 슬롯은 판정 대상 아님', kind: 'h2', blocked: false, reason: 'NOT_APPLICABLE',
    text: '이런 증상에 사용합니다 — 효능·효과 상세 안내 및 복용 전 확인 사항 목록' },
  { name: '짧은 표현은 판정 대상 아님', kind: 'warn', blocked: false, reason: 'NOT_APPLICABLE',
    text: '정해진 용법과 용량을 지키십시오' },
];

/* ── 반드시 절단으로 판정 ─────────────────────────────────────────────────── */
const BLOCK: Case[] = [
  { name: '어절 중간 — …노년기의 비… (본문 슬롯)', kind: 'intro', blocked: true, reason: 'INCOMPLETE_WORD',
    text: '육체피로, 임신ㆍ수유기, 병중ㆍ병후(병을 앓는 동안이나 회복 후)의 체력 저하 시, 발육기, 노년기의 비…' },
  { name: '어절 중간 — …복용하지 마 (금기 절단)', kind: 'warn', blocked: true, reason: 'INCOMPLETE_WORD',
    text: '이 약을 복용할 때 아세트아미노펜을 함유하는 다른 제품과 함께 복용하지 말고, 아세트아미노펜으로 일일 최대 용량 (4,000 mg)을 초과하여 복용하지 마' },
  { name: '어절 중간 — …있습니 (하드컷 260)', kind: 'warn', blocked: true, reason: 'INCOMPLETE_WORD',
    text: '아세트아미노펜으로 일일 최대 용량 (4,000 mg)을 초과하여 복용하지 마십시오. 간손상을 일으킬 수 있습니' },
  /* 고유명사 중간 절단(`리토나비어`→`리토나비`)은 사전 없이 어절 단위로 식별할 수 없다.
     종결 근거가 없으므로 HARD_CUT_RESIDUE 로 **차단**되는 것이 정상이다 — 차단이 보수적 기본값이다. */
  { name: '어절 중간 — …리토나비 (성분명 절단)', kind: 'warn', blocked: true, reason: 'HARD_CUT_RESIDUE',
    text: '이 약을 복용하는 동안 테오필린,리토나비어,과량의 알코올과 함께 복용하지 마십시오. 이 약을 복용하는 동안 테오필린,리토나비' },
  { name: '열린 괄호 — 닫히지 않은 채 끝남', kind: 'warn', blocked: true, reason: 'OPEN_DELIMITER',
    text: '다음 환자는 이 약을 복용하지 마십시오. 이 약 또는 이 약의 구성 성분에 과민증 환자, 신부전 환자(크레아티닌 청소율 < 10 mL/min' },
  { name: '부사 뒤 종료 — …빈번히', kind: 'warn', blocked: true, reason: 'INCOMPLETE_GRAMMAR',
    text: '다음과 같은 경우 즉시 복용을 중지하고 의사와 상의하십시오. 짧은 호흡과 함께 가슴 또는 어깨 통증을 동반하는 경우,가슴통증이 빈번히' },
  { name: '어미 미완 — …피해야', kind: 'warn', blocked: true, reason: 'INCOMPLETE_GRAMMAR',
    text: '심혈관계 질환 또는 그 위험인자를 가진 환자는 고용량 이부프로펜(1일 2,400 mg) 복용을 피해야' },
  { name: '쉼표 뒤 종료 — 구조 근거 없으면 차단', kind: 'warn', blocked: true, reason: 'INCOMPLETE_GRAMMAR',
    text: '이 약을 복용하는 동안 때때로 복명, 복부팽만감, 복통, 식욕부진, 구역, 구토가 나타나거나,' },
  { name: '괄호 주석 벗겨도 명사 — …베타차단제(…)', kind: 'warn', blocked: true, reason: 'HARD_CUT_RESIDUE',
    text: '이 약을 복용하는 동안 다음 약물과 함께 복용 시 주의하십시오 신경이완제,티록신,페니실라민,베타차단제(아테놀올,메토프로롤,프로프라놀롤)' },
  { name: '표시용 카드라도 근거 없는 말줄임은 차단', kind: 'badge', blocked: true, reason: 'INCOMPLETE_WORD',
    text: '비타민 B1, B2, B6의 보급과 신경통, 근육통, 관절통 증상의 완화, 각기, 눈의 피로…' },
];

/* ── 문맥 규칙(문서 단위) ─────────────────────────────────────────────────── */
const DOC_CASES: Array<{ name: string; html: string; expect: Array<[number, boolean, ReasonCode]> }> = [
  {
    name: '표시용 말줄임 카드 — 같은 문서 intro 가 완결본이면 파생 대상',
    html: '<div class="sd-item"><span class="sd-badge">위산과다, 속쓰림, 위부불쾌감, 위부팽만감, 식체(위체), 구역, 구토, 위통, 신트림, 소화불량, 식욕…</span></div>'
        + '<p class="sd-intro">위산과다, 속쓰림, 위부불쾌감, 위부팽만감, 식체(위체), 구역, 구토, 위통, 신트림, 소화불량, 식욕감퇴(식욕부진), 과식, 소화촉진, 소화불량으로 인한 위부팽만감에 사용하는 일반의약품입니다.</p>',
    expect: [[0, false, 'DISPLAY_SUMMARY_ELLIPSIS'], [1, false, 'TERMINATED']],
  },
  {
    name: '표시용 <br> 로만 갈린 한 문장 — 구조 분해로 묶는다',
    html: '<p class="sd-intake">만 15세 이상 및 성인은 1회 1병 1일 3회, 만 11세 이상~만 15세 미만은 1회 2/3병 1일 3회,<br>'
        + '만 8세 이상~만 11세 미만은 1회 1/2병 1일 3회, 만 5세 이상~만 8세 미만은 1회 1/3병 1일 3회 복용합니다.</p>',
    expect: [[0, false, 'STRUCTURAL_SPLIT'], [1, false, 'TERMINATED']],
  },
  {
    name: '독립 <li> 금기 항목은 병합하지 않는다 — 쉼표 종료면 차단 유지',
    html: '<ul class="sd-warn"><li>이 약을 복용하는 동안 때때로 복명, 복부팽만감, 복통, 식욕부진, 구역, 구토가 나타나거나,</li>'
        + '<li>배변 습관에 갑작스런 변화가 있거나 1주 정도 복용하여도 변비의 개선이 없는 경우 복용을 중지하고 의사 또는 약사와 상의하십시오.</li></ul>',
    expect: [[0, true, 'INCOMPLETE_GRAMMAR'], [1, false, 'TERMINATED']],
  },
  {
    name: '명사구 형제 항목이 다수인 금기 목록은 정상 열거로 인정',
    html: '<ul class="sd-warn">'
        + '<li>이 약 또는 이 약의 구성 성분에 과민증이 있는 환자 및 그 병력이 있는 환자, 아스피린 천식 환자</li>'
        + '<li>혈액 이상 및 그 병력이 있는 환자, 심한 혈액 이상, 심한 간장애, 심한 신장애, 심한 심기능부전</li>'
        + '<li>포도당-6-인산탈수소효소 결핍, 소화성궤양, 중증 신장장애(크레아티닌 청소율이< 25 mL/min)</li></ul>',
    expect: [[2, false, 'LIST_ITEM_NOUN_PHRASE']],
  },
];

/* ── 구조 분해기 시험 ─────────────────────────────────────────────────────── */
const STRUCT: Array<{ name: string; html: string; slotCount: number }> = [
  { name: '표시용 <br> 줄바꿈 문장', html: '<p class="sd-intake">가나다라마바사아자차카타파하 가나다라마바사아자차카타파하 1일 3회,<br>가나다라마바사아자차카타파하 1일 2회 복용합니다.</p>', slotCount: 2 },
  { name: '독립된 <li> 항목', html: '<ul class="sd-warn"><li>가나다라마바사아자차카타파하 가나다라마바사아자차카타파하 항목 하나입니다.</li><li>가나다라마바사아자차카타파하 가나다라마바사아자차카타파하 항목 둘입니다.</li></ul>', slotCount: 2 },
  { name: '한 문장이 여러 태그로 나뉜 사례', html: '<p class="sd-foot">이 약은 <strong>아세트아미노펜</strong> 을(를) 함유하므로 가나다라마바사아자차카타파하 주의하십시오.</p>', slotCount: 3 },
  { name: '용법 수치가 태그 경계에 걸린 사례', html: '<p class="sd-intake">1회 <strong>500 mg</strong>, 1일 <strong>3</strong>회 복용합니다. 가나다라마바사아자차카타파하 가나다라.</p>', slotCount: 5 },
  { name: '금기 문장이 목록으로 분리된 사례', html: '<ul class="sd-warn"><li>만 12개월 미만의 영아에게는 투여하지 마십시오. 가나다라마바사아자차카타파하 가나다.</li><li>임부 또는 임신하고 있을 가능성이 있는 여성은 복용하지 마십시오. 가나다라마바사.</li></ul>', slotCount: 2 },
];

/* ── 단위 시험 ────────────────────────────────────────────────────────────── */
const UNIT: Array<[string, boolean]> = [
  ['balanced: (요(허리)통)', balancedDelimiters('관절통(요(허리)통, 어깨결림 등)') === true],
  ['balanced: 열린 괄호', balancedDelimiters('신부전 환자(크레아티닌 청소율 < 10 mL/min') === false],
  ['strip: 종결부호 뒤 주석', stripTrailingParenthetical('중단하십시오. (야간용)') === '중단하십시오.'],
  ['strip: 전체 괄호 펼침', stripTrailingParenthetical('(추천용량은 5-10배입니다)') === '추천용량은 5-10배입니다'],
  ['strip: 명사 + 열거 주석', stripTrailingParenthetical('베타차단제(아테놀올,메토프로롤)') === '베타차단제'],
  ['strip: 괄호 없으면 그대로', stripTrailingParenthetical('복용하지 마십시오') === '복용하지 마십시오'],
];

/* ── 카드 요약 파생 시험 ──────────────────────────────────────────────────────
   KO 카드를 intro 전문으로 치환하지 않는다. 번역 근거만 완결본으로 바꾸고
   같은 요약 규칙을 번역문에 다시 적용해 카드 길이·역할을 유지한다. */
const KO_FULL = '위산과다, 속쓰림, 위부불쾌감, 위부팽만감, 식체(위체), 구역, 구토, 위통, 신트림, 소화불량, 식욕감퇴(식욕부진), 과식, 소화촉진, 소화불량으로 인한 위부팽만감에 사용하는 일반의약품입니다.';
const KO_CARD = '위산과다, 속쓰림, 위부불쾌감, 위부팽만감, 식체(위체), 구역, 구토, 위통, 신트림, 소화불량, 식욕…';
const ZH_FULL = '本品为非处方药，用于胃酸过多、烧心、胃部不适、胃胀、积食、恶心、呕吐、胃痛、反酸、消化不良、食欲减退、暴饮暴食、促进消化以及消化不良引起的胃胀。';

function cardSpec(): string[] {
  const f: string[] = [];
  const d = deriveCardSummary(KO_CARD, KO_FULL, ZH_FULL);
  if (!d.ok) { f.push(`[카드] 파생 실패: ${d.reason}`); return f; }
  if (/[가-힣]/.test(d.text)) f.push('[카드] 파생문에 한글이 남았다');
  if (!/…$/.test(d.text)) f.push('[카드] 파생문이 말줄임표로 끝나지 않는다');
  if (d.text.length >= ZH_FULL.length) f.push('[카드] 파생문이 완결본보다 짧지 않다');
  if (verifyDerivedCard(d.text, ZH_FULL)) f.push(`[카드] 자기 검증 실패: ${verifyDerivedCard(d.text, ZH_FULL)}`);
  /* 수치·단위를 쪼개지 않는다 — 구분자 경계까지만 물러난다. */
  const tail = d.text.replace(/…$/, '').slice(-1);
  if (/\d/.test(tail)) f.push(`[카드] 숫자 경계에서 잘렸다: "${d.text.slice(-8)}"`);
  /* 접두가 아니면 파생하지 않는다. */
  if (deriveCardSummary('전혀 다른 문장입니다…', KO_FULL, ZH_FULL).ok) f.push('[카드] 접두가 아닌데 파생됐다');
  /* 위조 검증 — 완결본에 없는 문자열은 거부돼야 한다. */
  if (!verifyDerivedCard('本品用于完全不同的内容…', ZH_FULL)) f.push('[카드] 접두가 아닌 파생문을 통과시켰다');
  if (!verifyDerivedCard(ZH_FULL + '…', ZH_FULL)) f.push('[카드] 전문 그대로를 요약으로 통과시켰다');
  return f;
}

export function runSpec(): { pass: number; fail: string[] } {
  const fail: string[] = [];
  let pass = 0;
  const cf = cardSpec();
  if (cf.length) fail.push(...cf); else pass += 7;

  for (const c of [...PASS, ...BLOCK]) {
    const v = judgeSlot(c.kind, c.text);
    if (v.blocked !== c.blocked) fail.push(`[판정] ${c.name}: blocked=${v.blocked} (기대 ${c.blocked}) reason=${v.reason}`);
    else if (c.reason && v.reason !== c.reason) fail.push(`[코드] ${c.name}: reason=${v.reason} (기대 ${c.reason})`);
    else pass++;
    if (BLOCKING.has(v.reason) !== v.blocked) fail.push(`[불변식] ${c.name}: BLOCKING 집합과 blocked 불일치 (${v.reason})`);
  }

  for (const d of DOC_CASES) {
    const sl = slots(d.html);
    const vs = judgeDoc(d.html, sl);
    for (const [i, blocked, reason] of d.expect) {
      const v = vs[i];
      if (!v) { fail.push(`[문맥] ${d.name}: 슬롯 ${i} 없음 (총 ${sl.length})`); continue; }
      if (v.blocked !== blocked || v.reason !== reason)
        fail.push(`[문맥] ${d.name} #${i}: ${v.reason}/${v.blocked} (기대 ${reason}/${blocked}) — "${sl[i].text.slice(0, 40)}"`);
      else pass++;
    }
  }

  for (const s of STRUCT) {
    const sl = slots(s.html);
    if (sl.length !== s.slotCount) fail.push(`[구조] ${s.name}: 슬롯 ${sl.length} (기대 ${s.slotCount}) — ${sl.map((x) => x.kind).join(',')}`);
    else pass++;
    /* 슬롯 오프셋으로 원본을 그대로 재구성할 수 있어야 한다(태그 골격 보존 불변식). */
    let re = '', cur = 0;
    for (const x of sl) { re += s.html.slice(cur, x.start) + s.html.slice(x.start, x.end); cur = x.end; }
    re += s.html.slice(cur);
    if (re !== s.html) fail.push(`[구조] ${s.name}: 슬롯 오프셋으로 원본 재구성 실패`);
    else pass++;
  }

  for (const [name, ok] of UNIT) { if (!ok) fail.push(`[단위] ${name}`); else pass++; }
  return { pass, fail };
}

/** 선정기·조립기가 기동 시 호출한다. 회귀시험이 깨지면 생산이 진행되지 않는다. */
export function assertSpec(): void {
  const { pass, fail } = runSpec();
  if (fail.length) {
    console.error(`[otc-ko-truncation-policy] 회귀시험 실패 ${fail.length}건 (통과 ${pass})`);
    for (const f of fail) console.error('  - ' + f);
    throw new Error('otc-ko-truncation-policy 회귀시험 실패 — 판정 규칙 변경 시 반드시 시험을 함께 갱신한다.');
  }
}

if (process.argv[1] && process.argv[1].includes('otc-ko-truncation-policy.spec')) {
  const { pass, fail } = runSpec();
  console.log(`otc-ko-truncation-policy spec: pass=${pass} fail=${fail.length}`);
  for (const f of fail) console.log('  FAIL ' + f);
  process.exit(fail.length ? 1 : 0);
}
