import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductDescriptionAssist } from './ProductDescriptionAssist';

vi.mock('@o4o/content-editor', () => ({
  LlmAssistPanel: ({ guideText, onApplyHtml }: { guideText: (input: { additionalInstruction: string }) => string; onApplyHtml: (html: string) => void }) => <>
    <output aria-label="작성 요청문">{guideText({ additionalInstruction: '' })}</output>
    <button onClick={() => onApplyHtml('<p>검토할 결과</p>')}>편집기에 적용</button>
  </>,
}));
afterEach(cleanup);

describe('설명서 목적·근거 입력', () => {
  it('전문 자료를 출처·검수 상태와 함께 넘기고 변경 시 재검수를 요구한다', () => {
    const onApplyHtml = vi.fn();
    render(<ProductDescriptionAssist context={{ task: 'qr', productName: '표본 상품' }} onApplyHtml={onApplyHtml} />);
    fireEvent.change(screen.getByLabelText('설명서 이용 목적'), { target: { value: 'ai-support' } });
    fireEvent.change(screen.getByLabelText('전문 참고정보'), { target: { value: '진단 과정과 감별 근거' } });
    fireEvent.change(screen.getByLabelText('전문 자료 출처·확인일'), { target: { value: '전문 지침 2026-10-24' } });
    fireEvent.click(screen.getByLabelText('전문 참고자료의 출처와 내용을 검수했습니다'));
    expect(screen.getByLabelText('작성 요청문').textContent).toContain('AI 판단·상담지원 설명');
    expect(screen.getByLabelText('작성 요청문').textContent).toContain('출처: 전문 지침 2026-10-24');
    expect(screen.getByLabelText('작성 요청문').textContent).toContain('검수: 검수됨');
    fireEvent.change(screen.getByLabelText('전문 참고정보'), { target: { value: '수정한 전문 참고정보' } });
    expect((screen.getByLabelText('전문 참고자료의 출처와 내용을 검수했습니다') as HTMLInputElement).checked).toBe(false);
    expect(screen.getByLabelText('작성 요청문').textContent).toContain('검수: 검수 대기');
    fireEvent.click(screen.getByText('편집기에 적용'));
    expect(onApplyHtml).toHaveBeenCalledWith('<p>검토할 결과</p>');
  });
  it('상품 원문과 전문 참고정보를 구분하고 새 상품 세션에는 입력을 넘기지 않는다', () => {
    const { rerender } = render(<ProductDescriptionAssist key="A" context={{ task: 'product-description', productName: 'A' }} onApplyHtml={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('상품 사실 원문'), { target: { value: '확인할 허가 효능' } });
    fireEvent.change(screen.getByLabelText('상품 원문 출처·확인일'), { target: { value: '허가문서' } });
    expect(screen.getByLabelText('작성 요청문').textContent).toContain('[상품 사실 근거]');
    expect(screen.getByLabelText('작성 요청문').textContent).not.toContain('[전문 참고정보 근거]');
    rerender(<ProductDescriptionAssist key="B" context={{ task: 'product-description', productName: 'B' }} onApplyHtml={vi.fn()} />);
    expect((screen.getByLabelText('상품 사실 원문') as HTMLTextAreaElement).value).toBe('');
    expect(screen.getByLabelText('작성 요청문').textContent).not.toContain('확인할 허가 효능');
  });
});
