/**
 * 간이 설명 칸(서버 consumerShortDescription 500자) 값 선택 — Import 초안
 */
import { describe, expect, it } from 'vitest';
import {
  CANDIDATE_SHORT_DESCRIPTION_MAX_LENGTH,
  pickImportShortDescription,
  shortDescriptionLength,
} from '../product-create/candidateFormHelpers';

describe('pickImportShortDescription', () => {
  it('간이 설명을 상세 설명보다 먼저 쓴다', () => {
    expect(pickImportShortDescription({ consumerShortDesc: '<p>간이</p>', consumerDetailDesc: '<p>상세</p>' }))
      .toEqual({ value: '<p>간이</p>', skipped: false });
  });

  it('간이 설명이 없거나 넘치면 한도 안의 상세 설명을 쓴다', () => {
    expect(pickImportShortDescription({ consumerShortDesc: '', consumerDetailDesc: '<p>상세</p>' }).value).toBe('<p>상세</p>');
    expect(pickImportShortDescription({ consumerShortDesc: '가'.repeat(501), consumerDetailDesc: '<p>상세</p>' }).value)
      .toBe('<p>상세</p>');
  });

  it('한도 안에 드는 값이 없으면 비우고 skipped 로 알린다 · 한도는 trim 후 길이', () => {
    expect(pickImportShortDescription({ consumerShortDesc: '', consumerDetailDesc: '가'.repeat(501) }))
      .toEqual({ value: '', skipped: true });
    expect(pickImportShortDescription({ consumerDetailDesc: `  ${'나'.repeat(CANDIDATE_SHORT_DESCRIPTION_MAX_LENGTH)}  ` }))
      .toEqual({ value: '나'.repeat(CANDIDATE_SHORT_DESCRIPTION_MAX_LENGTH), skipped: false });
  });

  it('설명이 아예 없으면 skipped 가 아니다', () => {
    expect(pickImportShortDescription({ consumerShortDesc: ' ', consumerDetailDesc: null })).toEqual({ value: '', skipped: false });
  });

  it('길이는 서식 HTML 을 포함해 trim 후 센다(서버와 같은 기준)', () => {
    expect(shortDescriptionLength('  <p>abc</p>  ')).toBe(10);
  });
});
