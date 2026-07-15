/**
 * WO-O4O-OTC-TRANSLATOR-NOTE-DERIVATION-V1
 *
 * CR-021 "소비자 노출 제외 ≠ 번역자 입력에서 제거" 를 잠근다.
 * 회귀 시 ① 주석이 소비자에 노출되거나 ② 오역을 막을 근거가 번역자에게서 사라진다.
 */
import { describe, it, expect } from 'vitest';
import {
  deriveTranslatorNote,
  buildDrugOtcTranslationInput,
} from '../../drug-import/drug-otc-translation-input.js';
import { buildDrugOtcConsumerHtml } from '../../drug-import/drug-otc-description-consumer-html.js';

/** P3 — 주석에만 "550mg = 전문의약품" 이 있다. */
const P3 = {
  summaryTable: { 분류: '일반의약품', 성분: '나프록센나트륨 275mg' },
  efficacy: '골관절염·류마티양 관절염에 사용합니다.',
  usage: '통증에는 처음 2정(550mg)을 복용하고 6~8시간 간격으로 1정(275mg)씩 복용합니다.',
  usageLabel: '복용 안내',
  caution: '소화성궤양, 2세 이하는 복용하지 않습니다.',
  bodyMarkdown:
    '> 같은 성분 550mg 정은 전문의약품이다(§6). 이 설명서는 275mg OTC 그룹에 한정한다.\n\n| 항목 | 내용 |\n|---|---|\n| 성분 | 나프록센나트륨 275mg |\n\n**효능·효과**\n골관절염에 사용합니다.',
};

/** P4 — 주석에만 "질정, 내복 금지" 가 있다(doseForm='정'). */
const P4 = {
  summaryTable: { 분류: '일반의약품', 성분: '클로트리마졸 100mg (질정)' },
  efficacy: '칸디다성 질염에 사용합니다.',
  usage: '성인은 1회 1정을 1일 1회 취침 시 질 내 깊숙이 삽입합니다.',
  usageLabel: '사용 안내',
  caution: '생리 기간 중에는 사용하지 않습니다.',
  bodyMarkdown:
    "> 이름은 '정'이지만 **질 내 삽입 질정**이다(내복 금지). §3.6에 따라 \"사용 안내\"로 표기하며 수동 큐레이션 대상.\n\n**효능·효과**\n칸디다성 질염에 사용합니다.",
};

/** P2 — 주석 없이 표로 시작(오탐 대상). */
const P2_NO_NOTE = {
  summaryTable: { 분류: '일반의약품', 성분: '니자티딘 75mg' },
  efficacy: '위산과다, 속쓰림에 사용합니다.',
  usage: '성인(15~79세)은 1일 1회 1정(75mg)을 복용합니다.',
  usageLabel: '복용 안내',
  caution: '15세 미만, 80세 이상은 복용하지 않습니다.',
  bodyMarkdown: '| 항목 | 내용 |\n|---|---|\n| 성분 | 니자티딘 75mg |\n\n**효능·효과**\n위산과다에 사용합니다.',
};

describe('deriveTranslatorNote — 선두 인용 블록 파생', () => {
  it('선두 인용을 추출하고 인용 표기를 정리한다', () => {
    const r = deriveTranslatorNote(P3.bodyMarkdown);
    expect(r.translatorNote).toBe(
      '같은 성분 550mg 정은 전문의약품이다(§6). 이 설명서는 275mg OTC 그룹에 한정한다.',
    );
    expect(r.translatorNote).not.toContain('>');
    expect(r.midBodyQuoteNeedsReview).toBe(false);
  });

  it('인용이 없으면 null — 오탐하지 않는다', () => {
    expect(deriveTranslatorNote(P2_NO_NOTE.bodyMarkdown).translatorNote).toBeNull();
    expect(deriveTranslatorNote('').translatorNote).toBeNull();
    expect(deriveTranslatorNote(null).translatorNote).toBeNull();
    expect(deriveTranslatorNote(undefined).translatorNote).toBeNull();
  });

  it('여러 줄 연속 인용을 한 주석으로 모은다', () => {
    const r = deriveTranslatorNote('> 첫 줄\n> 둘째 줄\n\n본문 시작');
    expect(r.translatorNote).toBe('첫 줄\n둘째 줄');
  });

  it('본문 중간 인용은 추출하지 않고 검토 대상으로 표시한다', () => {
    const r = deriveTranslatorNote('> 선두 주석\n\n본문\n\n> 중간 인용');
    expect(r.translatorNote).toBe('선두 주석');
    expect(r.midBodyQuoteNeedsReview).toBe(true);
  });

  it('선두 인용 없이 중간 인용만 있어도 자동 추출하지 않는다', () => {
    const r = deriveTranslatorNote('본문\n\n> 중간 인용');
    expect(r.translatorNote).toBeNull();
    expect(r.midBodyQuoteNeedsReview).toBe(true);
  });

  it('bodyMarkdown 을 수정하지 않는다', () => {
    const original = P3.bodyMarkdown;
    deriveTranslatorNote(original);
    expect(P3.bodyMarkdown).toBe(original);
  });
});

describe('buildDrugOtcTranslationInput — 소비자 소스 / 번역자 주석 분리', () => {
  it('consumerSource 에 주석이 섞이지 않는다', () => {
    const input = buildDrugOtcTranslationInput(P3, { title: '나프록센나트륨 275mg 정' });
    const consumerText = JSON.stringify(input.consumerSource);
    expect(consumerText).not.toContain('전문의약품이다');
    expect(consumerText).not.toContain('한정한다');
    expect(consumerText).not.toContain('bodyMarkdown');
  });

  it('P3 — 번역자는 "550mg = 전문의약품" 근거를 받는다 (오역 방지)', () => {
    const input = buildDrugOtcTranslationInput(P3, { title: 'T' });
    expect(input.translatorNote).toContain('550mg');
    expect(input.translatorNote).toContain('전문의약품');
    // 동시에 번역 대상 본문의 수치는 그대로다
    expect(input.consumerSource.usage).toContain('2정(550mg)');
  });

  it('P4 — 번역자는 "질정·내복 금지" 근거를 받고, 경로 신호도 함께 온다 (DR-019)', () => {
    const input = buildDrugOtcTranslationInput(P4, { title: 'T' });
    expect(input.translatorNote).toContain('내복 금지');
    expect(input.translatorNote).toContain('질 내 삽입');
    expect(input.consumerSource.usageLabel).toBe('사용 안내');
  });

  it('주석 미보유 초안은 translatorNote=null 이고 consumerSource 는 정상이다', () => {
    const input = buildDrugOtcTranslationInput(P2_NO_NOTE, { title: 'T' });
    expect(input.translatorNote).toBeNull();
    expect(input.consumerSource.efficacy).toContain('위산과다');
    expect(input.consumerSource.caution).toContain('80세 이상');
  });
});

describe('translatorNote 는 소비자 HTML 에 도달하지 않는다', () => {
  it.each([
    ['P3', P3, '나프록센나트륨 275mg 정'],
    ['P4', P4, '클로트리마졸 100mg 질정'],
  ])('%s — 소비자 HTML 에 주석 문구 0', (_name, draft, title) => {
    const { translatorNote } = deriveTranslatorNote(draft.bodyMarkdown);
    const { html } = buildDrugOtcConsumerHtml(draft, { title });
    expect(translatorNote).toBeTruthy();
    // 주석에만 있는 고유 어절이 소비자 HTML 에 없어야 한다
    const structured = [draft.efficacy, draft.usage, draft.caution, JSON.stringify(draft.summaryTable)].join(' ');
    const noteOnlyWords = (translatorNote as string)
      .replace(/[*"]/g, '')
      .split(/[\s,·()]+/)
      .filter((w) => w.length >= 3 && !structured.includes(w));
    expect(noteOnlyWords.length).toBeGreaterThan(0); // 검사가 실제로 의미 있는지 보장
    for (const w of noteOnlyWords) expect(html).not.toContain(w);
  });
});
