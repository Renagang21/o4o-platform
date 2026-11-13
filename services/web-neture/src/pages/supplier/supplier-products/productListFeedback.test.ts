import { describe, expect, it } from 'vitest';
import { APPROVAL_GATE_FALLBACK, APPROVAL_GATE_REASON_DISPLAY } from './productListFeedback';

// 2026-11-12: 공급 예정 품목군은 선택만 받는다 — 승인 요청 실패 안내가 증빙 제출을 요구하지 않는다.
describe('approval gate reason display — supplier category messages', () => {
  const categoryCodes = Object.keys(APPROVAL_GATE_REASON_DISPLAY).filter((code) => code.startsWith('SUPPLIER_CATEGORY_'));

  it('covers every backend category reason code', () => {
    expect(categoryCodes.sort()).toEqual([
      'SUPPLIER_CATEGORY_NEEDS_UPDATE',
      'SUPPLIER_CATEGORY_NOT_APPROVED',
      'SUPPLIER_CATEGORY_NOT_SELECTED',
      'SUPPLIER_CATEGORY_REJECTED',
      'SUPPLIER_CATEGORY_SUSPENDED',
      'SUPPLIER_CATEGORY_UNRESOLVED',
    ]);
  });

  it('never asks the supplier to submit evidence documents', () => {
    for (const code of categoryCodes) {
      const { status, nextAction } = APPROVAL_GATE_REASON_DISPLAY[code];
      expect(`${status} ${nextAction}`, code).not.toMatch(/증빙/);
    }
    expect(`${APPROVAL_GATE_FALLBACK.status} ${APPROVAL_GATE_FALLBACK.nextAction}`).not.toMatch(/증빙/);
  });

  it('uses the profile wording for an operator hold', () => {
    expect(APPROVAL_GATE_REASON_DISPLAY.SUPPLIER_CATEGORY_SUSPENDED.status).toContain('운영자 보류');
  });
});
