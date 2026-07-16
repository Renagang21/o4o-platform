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
