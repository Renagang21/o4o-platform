/**
 * WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1 — "ChatGPT로 작업" 패널 계약 테스트
 *
 *   - 내부 AI endpoint 호출 0 (source contract: 패널 + authoring lib + CreatePage 에 AI/generate 경로 없음)
 *   - JSON 오류 → onApplyDraft 미호출(write 0) · 정상 JSON → onApplyDraft 1회 · 금지 키 경고 표시
 *   - 패널 어디에도 제출(submit) 경로가 없다(적용 ≠ 저장)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// vitest.config 에 globals 가 없어 RTL 자동 cleanup 이 동작하지 않는다 → 테스트마다 명시 정리
afterEach(cleanup);
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import SupplierProductLlmAssistPanel from '../SupplierProductLlmAssistPanel';

const ROOT = resolve(__dirname, '../../..');

function readTree(dir: string): string {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && !d.name.endsWith('.test.ts') && !d.name.endsWith('.test.tsx'))
    .map((d) => readFileSync(join(dir, d.name), 'utf8'))
    .join('\n');
}

describe('SupplierProductLlmAssistPanel — source contract', () => {
  it('authoring lib · 패널 · CreatePage 는 내부 AI 생성 endpoint 를 부르지 않는다', () => {
    const sources = [
      readTree(resolve(ROOT, 'lib/supplier-product-authoring')),
      readFileSync(resolve(ROOT, 'components/supplier/SupplierProductLlmAssistPanel.tsx'), 'utf8'),
      readFileSync(resolve(ROOT, 'pages/supplier/SupplierProductCreatePage.tsx'), 'utf8'),
    ].join('\n');
    // 내부 AI 경로 패턴(Store 내부 AI 은퇴 이전에 쓰이던 것들 + 일반적인 생성 API 명명)
    for (const forbidden of ['/ai/', '/llm/', '/generate', 'aiApi', 'llmApi', 'generateProduct', 'analyzeImage', 'vision', 'openai', 'gemini', 'anthropic']) {
      expect(sources.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
    // authoring lib 은 API/React 의존이 없다
    const lib = readTree(resolve(ROOT, 'lib/supplier-product-authoring'));
    expect(lib).not.toMatch(/from ['"]\.\.\/api/);
    expect(lib).not.toMatch(/from ['"]react/);
    expect(lib).not.toContain('fetch(');
    expect(lib).not.toContain('axios');
  });

  it('패널은 Candidate 제출 API 를 직접 부르지 않는다(적용 ≠ 저장)', () => {
    const src = readFileSync(resolve(ROOT, 'components/supplier/SupplierProductLlmAssistPanel.tsx'), 'utf8');
    expect(src).not.toContain('submitProductCandidate');
    expect(src).not.toContain('supplierApi');
    expect(src).not.toContain('product-candidates');
  });
});

describe('SupplierProductLlmAssistPanel — apply 계약', () => {
  const context = { productTypeLabel: '비의약품', regulatoryType: 'GENERAL', currentDraft: null };

  function setup(fromImport = false) {
    const onApplyDraft = vi.fn(() => ['note-from-page']);
    const onNotify = vi.fn();
    render(<SupplierProductLlmAssistPanel context={context} fromImport={fromImport} onApplyDraft={onApplyDraft} onNotify={onNotify} />);
    return { onApplyDraft, onNotify };
  }

  it('CTA 문구는 "ChatGPT로 작업" 이고 기본은 접혀 있다(import 진입은 열림)', () => {
    setup();
    expect(screen.getByText('ChatGPT로 작업')).toBeTruthy();
    expect(screen.queryByText('결과 적용')).toBeNull();
    fireEvent.click(screen.getByText('ChatGPT로 작업'));
    expect(screen.getByText('결과 적용')).toBeTruthy();
  });

  it('JSON 오류 → onApplyDraft 미호출 + 오류 안내("입력란은 변경되지 않았습니다")', () => {
    const { onApplyDraft } = setup(true);
    const ta = screen.getByPlaceholderText(/"name"/) as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: '제품명은 홍삼정입니다' } });
    fireEvent.click(screen.getByText('결과 적용'));
    expect(onApplyDraft).not.toHaveBeenCalled();
    expect(screen.getByText(/입력란은 변경되지 않았습니다/)).toBeTruthy();
  });

  it('정상 JSON → onApplyDraft(draft, mode) 1회 · 금지 키/무시 키 경고와 화면 note 를 표시', () => {
    const { onApplyDraft } = setup(true);
    const ta = screen.getByPlaceholderText(/"name"/) as HTMLTextAreaElement;
    fireEvent.change(ta, {
      target: { value: JSON.stringify({ name: '홍삼정', supplierId: 'x', brandId: 'b-1', offerDraft: { priceGeneral: 1000 } }) },
    });
    fireEvent.click(screen.getByText('결과로 덮어쓰기'));
    fireEvent.click(screen.getByText('결과 적용'));
    expect(onApplyDraft).toHaveBeenCalledTimes(1);
    const [draft, mode] = onApplyDraft.mock.calls[0] as unknown as [Record<string, unknown>, string];
    expect(mode).toBe('overwrite');
    expect(draft.name).toBe('홍삼정');
    expect('supplierId' in draft).toBe(false);
    expect(draft.brandId).toBeNull();
    expect(screen.getByText(/supplierId: 허용되지 않는 항목/)).toBeTruthy();
    expect(screen.getByText(/brandId: AI 값은 사용하지 않습니다/)).toBeTruthy();
    expect(screen.getByText('note-from-page')).toBeTruthy();
  });

  it('요청문 미리보기에 사진/PDF 첨부 안내와 JSON 계약이 들어 있다', () => {
    setup(true);
    fireEvent.click(screen.getByText('소개서 PDF'));
    const pre = document.querySelector('pre');
    expect(pre?.textContent).toContain('PDF');
    expect(pre?.textContent).toContain('"mfdsPermitNumber"');
    expect(pre?.textContent).toContain('등록 제품 구분(사용자 선택): 비의약품');
  });
});
