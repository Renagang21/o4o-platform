import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ApprovedProductAiContext } from './ApprovedProductAiContext';
const read = vi.hoisted(() => vi.fn());
vi.mock('../../api/storeProductAi', () => ({ getStoreProductAiContext: read }));
afterEach(cleanup);
it('keeps facts and professional/unclassified material separate until explicit use', async () => {
  read.mockResolvedValue({ state: 'structured', name: '합성 상품', language: 'ko', description: { id: 'description', revision: 'revision', source: { kind: 'manufacturer', currentness: 'retrieved', checkedOn: '2026-10-29', references: [{ url: 'https://example.com/product' }] }, sections: [
    { key: 'fact', kind: 'product-fact', title: '성분', text: '확인된 성분', referenceUrls: [] },
    { key: 'ref', kind: 'professional-reference', title: '전문 자료', text: '전문 판단 참고', referenceUrls: [] },
  ] } });
  const use = vi.fn(); render(<ApprovedProductAiContext listingId="listing" language="ko" disabled={false} isCurrent={() => true} onUse={use} />);
  fireEvent.click(screen.getByText('AI 상담자료 불러오기')); await screen.findByText('확인된 성분'); expect(use).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('확인한 항목을 상담 작성 근거로 사용'));
  expect(use.mock.calls[0][0].facts).toContain('확인된 성분'); expect(use.mock.calls[0][0].facts).not.toContain('전문 판단');
  expect(use.mock.calls[0][0].references).toContain('전문 판단 참고');
});
it('shows missing language evidence without substituting QR content', async () => {
  read.mockResolvedValue({ state: 'missing', description: null });
  render(<ApprovedProductAiContext listingId="listing" language="en" disabled={false} isCurrent={() => true} onUse={vi.fn()} />);
  fireEvent.click(screen.getByText('AI 상담자료 불러오기')); await screen.findByText(/이 언어의 승인된 AI 상담자료가 없습니다/);
  expect(read).toHaveBeenLastCalledWith('listing', 'en'); expect(screen.queryByText('확인한 항목을 상담 작성 근거로 사용')).toBeNull();
});
