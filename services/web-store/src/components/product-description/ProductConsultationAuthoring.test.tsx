import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProductConsultationAuthoring } from './ProductConsultationAuthoring';
import { newProductConsultation, readProductConsultation } from './productConsultationDraft';
vi.mock('@o4o/content-editor', async importOriginal => ({ ...await importOriginal<typeof import('@o4o/content-editor')>(), LlmAssistPanel: ({ guideText, onApplyHtml }: { guideText: (v: { additionalInstruction: string }) => string; onApplyHtml: (s: string) => void }) => <>
 <output aria-label="작성 요청문">{guideText({ additionalInstruction: '추가 요청' })}</output>
 <button type="button" onClick={() => onApplyHtml('<p>사용자 ChatGPT 결과</p>')}>결과 적용</button>
</> }));
vi.mock('./ProductEvidencePicker', () => ({ ProductEvidencePicker: ({ onLoaded, onInsert }: { onLoaded: (v: unknown) => void; onInsert: (s: string) => void }) => <>
 <button type="button" onClick={() => onLoaded({ html: '<p>제품 고유 함량</p>', title: '원문', source: '제조사 원문·확인일' })}>원문 확인</button>
 <button type="button" onClick={() => onInsert('<p>제품 고유 함량</p>')}>원문 근거로 사용</button>
</> }));
afterEach(cleanup);
const initial = newProductConsultation({ sourceType: 'local', sourceId: '00000000-0000-4000-8000-000000000001', name: '합성 상품' });
function Form({ onApply, current = true }: { onApply: (s: string) => void; current?: boolean }) {
 const [draft, setDraft] = useState(initial);
 return <><ProductConsultationAuthoring value={draft} title="상품 안내" html="" disabled={false} isCurrent={() => current} onChange={setDraft} onApplyHtml={onApply} />
 <output aria-label="저장할 맥락">{JSON.stringify(draft)}</output></>;
}
it('explicitly imports source into the prompt, keeps professional evidence separate and retains purpose/language for save', () => {
 const apply = vi.fn(); render(<Form onApply={apply} />);
 fireEvent.click(screen.getByText('원문 확인'));
 expect(screen.getByLabelText('작성 요청문').textContent).not.toContain('제품 고유 함량');
 fireEvent.click(screen.getByText('원문 근거로 사용'));
 fireEvent.change(screen.getByLabelText('설명서 이용 목적'), { target: { value: 'professional' } });
 fireEvent.change(screen.getByLabelText('상담자료 작성 언어'), { target: { value: 'en' } });
 fireEvent.change(screen.getByLabelText('전문 참고정보'), { target: { value: '전문 참고 지침' } });
 fireEvent.change(screen.getByLabelText('전문 자료 출처·확인일'), { target: { value: '지침 출처' } });
 const prompt = screen.getByLabelText('작성 요청문').textContent;
 expect(prompt).toContain('제품 고유 함량'); expect(prompt).toContain('전문 참고 지침'); expect(prompt).toContain('영어');
 expect(apply).not.toHaveBeenCalled();
 const saved = readProductConsultation(JSON.parse(screen.getByLabelText('저장할 맥락').textContent!));
 expect(saved?.assist.purpose).toBe('professional'); expect(saved?.language).toBe('en'); expect(saved?.assist.factsReviewed).toBe(false);
 fireEvent.click(screen.getByText('결과 적용')); expect(apply).toHaveBeenCalledWith('<p>사용자 ChatGPT 결과</p>');
});
it('a superseded store session cannot apply a delayed result or imported source', () => {
 const apply = vi.fn(); render(<Form onApply={apply} current={false} />);
 fireEvent.click(screen.getByText('원문 확인')); fireEvent.click(screen.getByText('원문 근거로 사용')); fireEvent.click(screen.getByText('결과 적용'));
 expect(apply).not.toHaveBeenCalled();
 expect(JSON.parse(screen.getByLabelText('저장할 맥락').textContent!).assist.facts).toBe('');
});
