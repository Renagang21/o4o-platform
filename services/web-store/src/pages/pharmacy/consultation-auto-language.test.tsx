import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../api/client', () => ({ coreApiClient: api }));
vi.mock('../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ organizationId: 'store' }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'actor' } }) }));
import Page from './StoreMultilingualConsultationPage';
beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ success: true, data: { organizationId: 'store', supportAllowed: true,
    runtime: { recognition: 'browser', synthesis: 'browser', translation: 'policy', detectLanguage: true, speechLanguages: ['ko', 'en', 'ja'] },
    languages: [{ key: 'ko', label: '한국어' }, { key: 'en', label: 'English' }, { key: 'ja', label: '日本語' }], phrases: [],
    modes: [{ key: 'floor-pharmacist', label: '매장 약사 상담', entitled: true, allowed: true, professional: true }] } });
  api.post.mockImplementation(async (_path, body) => ({ success: true, data: { ...body, organizationId: 'store', source: body.text, translation: '한국어로 확인할 질문', detectedLanguage: 'ja' } }));
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('detects a customer text language, preserves the result and uses it for the current conversation', async () => {
  render(<MemoryRouter><Page /></MemoryRouter>);
  await screen.findByRole('button', { name: '고객 → 직원' });
  fireEvent.click(screen.getByRole('button', { name: '고객 → 직원' }));
  const panel = within(screen.getByRole('region', { name: '문장 번역' }));
  fireEvent.change(panel.getByRole('textbox'), { target: { value: '日本語の質問です' } });
  fireEvent.click(screen.getByRole('button', { name: '번역하기' }));
  await screen.findByText(/감지한 고객 언어: 日本語/);
  expect(api.post.mock.calls[0][1]).toMatchObject({ detectLanguage: true, direction: 'to-staff' });
  expect((screen.getByLabelText('고객 언어') as HTMLSelectElement).value).toBe('ja');
  expect(screen.getAllByText('한국어로 확인할 질문').length).toBeGreaterThan(0);
  fireEvent.change(panel.getByRole('combobox', { name: '고객 문장 언어' }), { target: { value: 'en' } });
  await waitFor(() => expect((panel.getByRole('checkbox') as HTMLInputElement).checked).toBe(false));
});
it('clears detected language, text, candidates and pending results for the next customer', async () => {
  render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: '고객 → 직원' }));
  const panel = within(screen.getByRole('region', { name: '문장 번역' }));
  fireEvent.change(panel.getByRole('textbox'), { target: { value: '日本語の質問です' } });
  fireEvent.click(screen.getByRole('button', { name: '번역하기' }));
  await screen.findByText(/감지한 고객 언어: 日本語/);
  fireEvent.click(screen.getByRole('button', { name: '새 상담 · 내용 지우기' }));
  expect((screen.getByLabelText('고객 언어') as HTMLSelectElement).value).toBe('ko');
  expect((panel.getByRole('textbox') as HTMLTextAreaElement).value).toBe('');
  expect(screen.queryByText(/감지한 고객 언어:/)).toBeNull();
  expect((panel.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
});
it('carries the reviewed source through translation and rechecks it before showing a customer draft', async () => {
  let changed = false;
  const proof = { mode: 'floor-pharmacist', productKind: 'listing', productId: 'product', sourceVersion: 'fixture-version' };
  HTMLDialogElement.prototype.showModal = vi.fn();
  api.post.mockImplementation(async (path, body) => {
    if (path.endsWith('/consultation-products/prepare')) return { success: true, data: { organizationId: 'store', mode: body.mode, state: 'candidates', message: '현재 매장 후보', candidates: [{ id: 'product', kind: 'listing', name: '합성 상품', location: '' }] } };
    if (path.endsWith('/consultation-support')) {
      if (changed) throw Object.assign(new Error('현재 근거가 변경되었습니다'), { status: 409, code: 'GUIDANCE_SOURCE_CHANGED' });
      return { success: true, data: { organizationId: 'store', mode: body.mode, productKind: body.productKind, productId: body.productId,
        state: body.verifyOnly ? 'verified' : 'ready', sourceVersion: proof.sourceVersion, sources: [], brief: { productFacts: [], professionalNotes: [], nextQuestion: null, customerDraft: { text: '합성 고객 설명', sourceIds: ['p1'] } } } };
    }
    return { success: true, data: { ...body, organizationId: 'store', source: body.text, translation: '합성 번역' } };
  });
  render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.click(await screen.findByText('약사 판단 지원', { exact: true }));
  fireEvent.change(screen.getByLabelText('약사 판단 지원 질문'), { target: { value: '합성 상품 자료를 확인합니다' } });
  fireEvent.click(screen.getByRole('button', { name: '상담 맥락으로 매장 상품 찾기' }));
  fireEvent.click(await screen.findByRole('button', { name: '합성 상품 · 상품 확인' }));
  fireEvent.click(screen.getByRole('button', { name: '근거로 판단 지원 준비' }));
  fireEvent.click(await screen.findByRole('button', { name: '검토한 고객 설명 사용' }));
  await waitFor(() => expect((screen.getByLabelText('고객에게 전달할 한국어 문장') as HTMLTextAreaElement).value).toBe('합성 고객 설명'));
  fireEvent.click(screen.getByRole('button', { name: '안내 준비' }));
  await screen.findAllByText('합성 번역');
  expect(api.post.mock.calls.find(([path]) => path.endsWith('/translate'))?.[1].supportSource).toEqual(proof);
  changed = true;
  fireEvent.click(screen.getByRole('button', { name: '고객에게 크게 보여주기' }));
  await screen.findByText('현재 근거가 변경되었습니다');
  expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
  expect(screen.queryAllByText('합성 번역')).toHaveLength(0);
});
