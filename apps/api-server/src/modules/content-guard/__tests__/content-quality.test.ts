/**
 * Q. 콘텐츠 품질 규칙 (CP3 잠금)
 *
 * CP2 실화면 검수에서 발견된 4건은 **자동 overflow 검사로 안 잡히는 층**이었다.
 * 레이아웃도 정상이고 허위 사실도 없지만 문장이 깨져 읽히지 않는다.
 * 아래 fixture 는 전부 **CP2 에서 실제로 나왔던 산출물**이다.
 */
import { runGuard } from '../product-description-guard.js';
import { normalizeMidDot, MID_DOT_CLASS } from '../product-description-guard.units.js';
import { OK_VIVA_FULL_BASIS } from './fixtures/known-errors.js';

const withKo = (ko: string) => ({ ...OK_VIVA_FULL_BASIS, drafts: { ko, en: '<p>x</p>' } });
const ids = (r: ReturnType<typeof runGuard>) => r.findings.map((f) => f.ruleId);

describe('Q-1 원문 인용 뒤 조사 결합', () => {
  it('"…섭취하십시오이며" 를 BLOCKED (CP2 실측)', () => {
    const r = runGuard(withKo('<p class="sd-intro">공식 섭취방법은 1일 1회, 1회 1캡슐을 물과 함께 섭취하십시오이며, 1캡슐의 중량은 공식 표기에 없어 단위당 균수는 계산하지 않았습니다.</p>'), { phase: 'post' });
    const f = r.findings.find((x) => x.ruleId === 'Q-JOSA-CONCAT-001')!;
    expect(f).toBeDefined();
    expect(f.status).toBe('BLOCKED');
  });

  it('정상 인용(용법 수치만)은 통과', () => {
    const r = runGuard(withKo('<p class="sd-intro">공식 섭취방법은 1일 1회, 1회 1캡슐이며, 1캡슐의 중량은 공식 표기에 없습니다.</p>'), { phase: 'post' });
    // ok() PASS 소견이 같은 ruleId 를 쓰므로 **status** 로 판정한다
    expect(r.findings.some((f) => f.ruleId === 'Q-JOSA-CONCAT-001' && f.status === 'BLOCKED')).toBe(false);
  });
});

describe('Q-2 원문 절단 — 원문 근거 기반', () => {
  // 실측(CP2): 성상 원문 "…내용물을 함유한 투명한 경질캡슐" 을 40자에서 잘라 "…함유한 투" 가 됐다.
  const SRC_FORM = '고유의 향미가 있고 이미, 이취가 없는 노랑 하양색의 내용물을 함유한 투명한 경질캡슐';
  const withForm = (ko: string) => ({
    ...OK_VIVA_FULL_BASIS,
    source: { ...OK_VIVA_FULL_BASIS.source, dosageForm: SRC_FORM },
    drafts: { ko, en: '<p>x</p>' },
  });

  it('원문의 접두사인데 **단어 중간**에서 끊기면 BLOCKED (CP2 실측)', () => {
    const r = runGuard(withForm('<ul class="sd-why"><li>고유의 향미가 있고 이미, 이취가 없는 노랑 하양색의 내용물을 함유한 투</li></ul>'), { phase: 'post' });
    const f = r.findings.find((x) => x.ruleId === 'Q-TRUNCATED-002')!;
    expect(f).toBeDefined();
    expect(f.status).toBe('BLOCKED');
    expect(f.sourceEvidence).toMatch(/원문은 이어집니다/);
  });

  it('**어절 경계**에서 끝나면 정상 (부분 인용 허용)', () => {
    const r = runGuard(withForm('<ul class="sd-why"><li>고유의 향미가 있고 이미, 이취가 없는 노랑 하양색의 내용물을 함유한</li></ul>'), { phase: 'post' });
    expect(r.findings.some((f) => f.ruleId === 'Q-TRUNCATED-002' && f.status === 'BLOCKED')).toBe(false);
  });

  it('원문 전체를 인용하면 정상', () => {
    const r = runGuard(withForm(`<div class="sd-item"><b>성상</b> ${SRC_FORM}</div>`), { phase: 'post' });
    expect(r.findings.some((f) => f.ruleId === 'Q-TRUNCATED-002' && f.status === 'BLOCKED')).toBe(false);
  });

  // 오탐 방지(A-CP03 에이엠비 실측): 원문이 **전각 닫음괄호 ｝** 로 절을 닫으면(표시량｛…｝ 3) 대장균군)
  //   전각 ｝ 는 셀에서 TRAILING_JUNK 로 제거되고 원문엔 남아 next=｝ 가 되는데, 이는 어절 경계다 → 절단 아님.
  it('전각 닫음괄호 ｝ 로 끝나는 규격 인용을 절단으로 오탐하지 않는다 (A-CP03 실측)', () => {
    const src = '1) 성상 : 흰색 분말 2) 프로바이오틱스 수 : 표시량｛100,000,000 CFU/2,000mg(1포) 이상｝ 3) 대장균군 : 음성';
    const input = {
      ...OK_VIVA_FULL_BASIS,
      source: { ...OK_VIVA_FULL_BASIS.source, baseStandard: src },
      drafts: { ko: '<div class="sd-item"><b>프로바이오틱스 수</b> 표시량｛100,000,000 CFU/2,000mg(1포) 이상｝</div>', en: '<p>x</p>' },
    };
    const r = runGuard(input, { phase: 'post' });
    expect(r.findings.some((f) => f.ruleId === 'Q-TRUNCATED-002' && f.status === 'BLOCKED')).toBe(false);
  });

  it('**정상 한국어(하는 분/있는 것)를 절단으로 오탐하지 않는다** — 93건 전수 오탐의 원인이었다', () => {
    for (const ko of ['<ul class="sd-who"><li>캡슐 형태를 선호하는 분</li></ul>',
      '<ul class="sd-who"><li>하루 한 번으로 관리하고 싶은 분</li></ul>',
      '<ul class="sd-why"><li>물 없이 먹을 수 있는 것</li></ul>']) {
      const r = runGuard(withForm(ko), { phase: 'post' });
      expect(r.findings.some((f) => f.ruleId === 'Q-TRUNCATED-002' && f.status === 'BLOCKED')).toBe(false);
    }
  });
});

describe('Q-3 비핵심 시험항목 중복', () => {
  it('대장균군이 프로바이오틱스 수 행과 별도 행에 중복되면 REVIEW (CP2 실측)', () => {
    const r = runGuard(withKo(
      '<div class="sd-item"><b>프로바이오틱스 수</b> 표시량(100억 CFU/329mg) 이상 ·대장균군 : 음성 ·붕해 : 20분 이내</div>' +
      '<div class="sd-item"><b>대장균군</b> 음성</div>'), { phase: 'post' });
    const f = r.findings.find((x) => x.ruleId === 'Q-SPEC-DUP-003')!;
    expect(f).toBeDefined();
    expect(f.status).toBe('REVIEW_REQUIRED');
  });

  it('각 항목이 자기 행에만 있으면 통과', () => {
    const r = runGuard(withKo(
      '<div class="sd-item"><b>프로바이오틱스 수</b> 표시량(100억 CFU/329mg) 이상</div>' +
      '<div class="sd-item"><b>대장균군</b> 음성</div>'), { phase: 'post' });
    expect(ids(r)).not.toContain('Q-SPEC-DUP-003');
  });
});

describe('Q-4 유사 구두점 잔존 (SSOT)', () => {
  // CP2 에서 놓친 것은 `·`(U+00B7)가 아니라 `ㆍ`(U+318D, 한글 아래아)였다.
  it.each([
    ['·', 'U+00B7'],
    ['ㆍ', 'U+318D'],
    ['･', 'U+FF65'],
    ['⋅', 'U+22C5'],
  ])('행이 %s (%s) 로 끝나면 REVIEW', (dot) => {
    const r = runGuard(withKo(`<div class="sd-item"><b>프로바이오틱스 수</b> 표시량(100억 CFU/329mg) 이상 ${dot}</div>`), { phase: 'post' });
    expect(ids(r)).toContain('Q-PUNCT-DANGLING-004');
  });

  it('정상 종결은 통과', () => {
    const r = runGuard(withKo('<div class="sd-item"><b>프로바이오틱스 수</b> 표시량(100억 CFU/329mg) 이상</div>'), { phase: 'post' });
    expect(ids(r)).not.toContain('Q-PUNCT-DANGLING-004');
  });

  it('SSOT: normalizeMidDot 이 모든 변종을 표준 · 로 통일', () => {
    expect(normalizeMidDot('가ㆍ나･다⋅라‧마∙바・사')).toBe('가·나·다·라·마·바·사');
    expect(new RegExp(MID_DOT_CLASS).test('ㆍ')).toBe(true);
  });
});

// CP3 실측 — 제품명·원문 인용은 우리 주장이 아니다. 단 **완화가 검출력을 깎으면 안 된다**(쌍으로 고정).
describe('B-SUPERLATIVE — 제품명·원문 인용 제외 (CP3)', () => {
  const base = {
    ...OK_VIVA_FULL_BASIS,
    productName: '프리미엄 유산균 17',
    source: { ...OK_VIVA_FULL_BASIS.source, storage: '개봉 후에는 공기의 노출을 최대한 차단하여 보관하십시오.' },
  };
  const ko = (x: string) => ({ ...base, drafts: { ko: `<p>${x}</p>`, en: '<p>x</p>' } });

  it('제품명 안의 "프리미엄" 은 최상급 주장이 아니다', () => {
    const r = runGuard(ko('프리미엄 유산균 17 은 2g당 5억 CFU 이상입니다.'), { phase: 'post' });
    expect(r.findings.some((f) => f.ruleId === 'B-SUPERLATIVE-001' && f.status === 'BLOCKED')).toBe(false);
  });

  it('원문 보관 조건 인용 안의 "최대한" 은 주장이 아니다', () => {
    const r = runGuard(ko('보관: 개봉 후에는 공기의 노출을 최대한 차단하여 보관하십시오.'), { phase: 'post' });
    expect(r.findings.some((f) => f.ruleId === 'B-SUPERLATIVE-001' && f.status === 'BLOCKED')).toBe(false);
  });

  it('**우리가 만든** 최상급 주장은 여전히 BLOCKED (미탐 방지)', () => {
    const r = runGuard(ko('이 그룹에서 가장 균수가 많은 제품입니다.'), { phase: 'post' });
    expect(r.findings.some((f) => f.ruleId === 'B-SUPERLATIVE-001' && f.status === 'BLOCKED')).toBe(true);
  });

  it('제품명 밖에서 프리미엄을 주장하면 BLOCKED', () => {
    const r = runGuard(ko('타사 대비 프리미엄 원료를 썼습니다.'), { phase: 'post' });
    expect(r.findings.some((f) => f.ruleId === 'B-SUPERLATIVE-001' && f.status === 'BLOCKED')).toBe(true);
  });
});

describe('Q-5 스펙 값 끝 항목번호 파편 (2026-07-17)', () => {
  const spec = (val: string) => withKo(`<div class="sd-spec"><div class="sd-item"><b>프로바이오틱스 수</b> ${val}</div><div class="sd-item"><b>성상</b> 흰색 분말</div></div>`);
  it('검출: "표시량(…CFU/300mg) 이상 3" 의 bare 항목번호 3 → BLOCKED', () => {
    const r = runGuard(spec('표시량(100,000,000 CFU/300mg) 이상 3'), { phase: 'post' });
    expect(r.findings.some((f) => f.ruleId === 'Q-SPEC-ITEMNO-006' && f.status === 'BLOCKED')).toBe(true);
  });
  it('검출: "…이상 3)" 괄호형 파편도 BLOCKED', () => {
    const r = runGuard(spec('표시량(50억/2.2g) 이상 3)'), { phase: 'post' });
    expect(r.findings.some((f) => f.ruleId === 'Q-SPEC-ITEMNO-006' && f.status === 'BLOCKED')).toBe(true);
  });
  it('보존: "…이상" 에서 끝나면 위반 아님', () => {
    const r = runGuard(spec('표시량(100,000,000 CFU/300mg) 이상'), { phase: 'post' });
    expect(r.findings.some((f) => f.ruleId === 'Q-SPEC-ITEMNO-006')).toBe(false);
  });
  it('보존: 단위 있는 숫자로 끝나면(2g)·18개월) 위반 아님', () => {
    const r1 = runGuard(spec('표시량(100,000,000 CFU/2 g)'), { phase: 'post' });
    const r2 = runGuard(spec('표시량(1억 CFU/300mg) 이상, 제조일로부터 18개월'), { phase: 'post' });
    expect(r1.findings.some((f) => f.ruleId === 'Q-SPEC-ITEMNO-006')).toBe(false);
    expect(r2.findings.some((f) => f.ruleId === 'Q-SPEC-ITEMNO-006')).toBe(false);
  });
});
