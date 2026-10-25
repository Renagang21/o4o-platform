import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../../../api/client', () => ({ coreApiClient: api }));
import { ConsultationSupportPanel } from './ConsultationSupportPanel';
const product = { id: 'product', kind: 'local' as const, name: 'Fixture product', location: 'A' };
const useDraft = vi.fn();
const props = { organizationId: 'store', mode: 'floor-pharmacist', product, room: null, locked: false, onUseDraft: useDraft };
const output = (body: any) => ({ success: true, data: {
  organizationId: 'store', mode: body.mode, productId: body.productId, productKind: body.productKind,
  state: body.verifyOnly ? 'verified' : 'ready', sourceVersion: 'v1', sources: [{ id: 'p1', kind: 'product-fact', title: '게시 상품 원문' }],
  brief: { productFacts: [{ text: '확인할 상품 사실', sourceIds: ['p1'] }], professionalNotes: [{ text: '판단할 사항', sourceIds: ['p1'] }],
    nextQuestion: '추가로 확인할 한 가지', customerDraft: { text: '검토할 고객 설명', sourceIds: ['p1'] } },
} });
beforeEach(() => { vi.clearAllMocks(); api.post.mockImplementation(async (_path, body) => output(body)); });
afterEach(cleanup);
function open() { render(<ConsultationSupportPanel {...props} />); fireEvent.click(screen.getByText('약사 판단 지원')); }
function ask() { fireEvent.change(screen.getByLabelText('약사 판단 지원 질문'), { target: { value: '상품을 어떻게 설명할까요?' } });
  fireEvent.click(screen.getByRole('button', { name: '근거로 판단 지원 준비' })); }
it('makes no initial call, separates evidence/results and waits for review and a free source recheck before using the draft', async () => {
  open(); expect(api.post).not.toHaveBeenCalled(); ask(); await screen.findByText('검토할 고객 설명');
  expect(screen.getByRole('heading', { name: '상품 사실' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: '전문 참고·판단할 사항' })).toBeTruthy();
  expect(useDraft).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '검토한 고객 설명 사용' }));
  await waitFor(() => expect(useDraft).toHaveBeenCalledWith('검토할 고객 설명'));
  expect(api.post.mock.calls[1][1]).toMatchObject({ verifyOnly: true, sourceVersion: 'v1' });
  expect(api.post.mock.calls[1][1]).not.toHaveProperty('question');
});
it('keeps a failed question/reference retryable, requires source confirmation and avoids automatic sharing', async () => {
  open(); fireEvent.click(screen.getByText('전문 참고자료 추가'));
  fireEvent.change(screen.getByLabelText('상담 전문 참고자료'), { target: { value: '참고할 근거' } });
  fireEvent.change(screen.getByLabelText('약사 판단 지원 질문'), { target: { value: '남길 질문' } });
  expect((screen.getByRole('button', { name: '근거로 판단 지원 준비' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('상담 전문 자료 출처'), { target: { value: 'Fixture guideline' } });
  fireEvent.click(screen.getByRole('checkbox'));
  api.post.mockRejectedValueOnce(new Error('temporary failure'));
  fireEvent.click(screen.getByRole('button', { name: '근거로 판단 지원 준비' }));
  await screen.findByText('temporary failure');
  const failed = api.post.mock.calls[0][1];
  fireEvent.click(screen.getByRole('button', { name: '같은 근거로 다시 준비' }));
  await screen.findByText('검토할 고객 설명'); expect(api.post.mock.calls[1][1]).toEqual(failed); expect(useDraft).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('상담 전문 참고자료'), { target: { value: '변경한 근거' } });
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  expect(screen.queryByLabelText('약사 검토 초안')).toBeNull();
});
it('does not use a draft after source withdrawal and discards a previous product response', async () => {
  const view = render(<ConsultationSupportPanel {...props} />); fireEvent.click(screen.getByText('약사 판단 지원')); ask();
  await screen.findByText('검토할 고객 설명');
  api.post.mockRejectedValueOnce(Object.assign(new Error('source changed'), { status: 409 }));
  fireEvent.click(screen.getByRole('button', { name: '검토한 고객 설명 사용' })); await screen.findByText('source changed');
  expect(useDraft).not.toHaveBeenCalled(); expect(screen.queryByLabelText('약사 검토 초안')).toBeNull();
  let finish!: (value: unknown) => void;
  api.post.mockImplementationOnce((_path, body) => new Promise(resolve => { finish = () => resolve(output(body)); }));
  fireEvent.click(screen.getByRole('button', { name: '같은 근거로 다시 준비' }));
  view.rerender(<ConsultationSupportPanel {...props} product={{ ...product, id: 'other' }} />);
  await act(async () => finish({})); expect(screen.queryByLabelText('약사 검토 초안')).toBeNull();
});
