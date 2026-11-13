import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import KioskConsultationPage, { KIOSK_IDLE_MS } from './KioskConsultationPage';

const credential = { id: '22222222-2222-4222-8222-222222222222', name: '입구 키오스크', token: 'a'.repeat(64) };
const context = { name: '입구 키오스크', languages: [{ key: 'ko', label: '한국어' }, { key: 'en', label: 'English · 영어' }], runtime: { detectLanguage: false } };
let calls: Array<{ action: string; body: Record<string, unknown> }>;
let respond: (action: string, body: Record<string, unknown>) => { status?: number; body: unknown };
const ok = (data: unknown) => ({ body: { success: true, data } });
beforeEach(() => {
  calls = [];
  localStorage.clear();
  respond = (action, body) => {
    if (action === 'claim') return ok(credential);
    if (action === 'context') return ok(context);
    if (action === 'search') return ok({ state: 'products', language: body.language, products: [{ kind: 'listing', id: 'p1', name: '비타민C' }] });
    if (action === 'answer') return ok({ state: 'ready', intent: body.intent, language: 'en', card: { kind: 'product', title: '비타민C', text: 'Product location: Shelf A-1', language: 'en', requestedLanguage: 'en', publicKey: null, fallbackUsed: false, translated: true } });
    if (action === 'pharmacist') return ok({ state: 'ready', intent: 'pharmacist', language: body.language, card: { kind: 'notice', title: 'Ask a pharmacist', text: 'Please ask a pharmacist about choosing or taking medicines.', language: 'en', requestedLanguage: 'en', publicKey: null, fallbackUsed: false, translated: false } });
    return { status: 404, body: { success: false } };
  };
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    const action = url.split('/consultation-kiosk/')[1];
    const body = JSON.parse(String(init.body));
    calls.push({ action, body });
    const result = respond(action, body);
    return { ok: (result.status ?? 200) < 400, status: result.status ?? 200, json: async () => result.body };
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it('connects with a code without any staff login and keeps only a device credential', async () => {
  render(<KioskConsultationPage />);
  fireEvent.change(screen.getByLabelText('연결 코드'), { target: { value: 'abcde-12345' } });
  fireEvent.click(screen.getByRole('button', { name: '연결하기' }));
  await screen.findByRole('heading', { name: '상품 안내' });
  expect(calls[0]).toEqual({ action: 'claim', body: { code: 'ABCDE-12345' } });
  expect(JSON.parse(localStorage.getItem('o4o:consultation-kiosk-device:v1')!)).toEqual(credential);
  const fetchMock = vi.mocked(fetch);
  expect(fetchMock.mock.calls.every(([, init]) => (init as RequestInit).credentials === 'omit')).toBe(true);
});

it('lets a customer pick a language, find a product and read its location in that language', async () => {
  localStorage.setItem('o4o:consultation-kiosk-device:v1', JSON.stringify(credential));
  render(<KioskConsultationPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'English · 영어' }));
  expect(screen.getByRole('heading', { name: 'Product help' })).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Product you are looking for'), { target: { value: 'vitamin' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find product' }));
  fireEvent.click(await screen.findByRole('button', { name: '비타민C' }));
  expect(calls.find(call => call.action === 'search')!.body).toEqual({ ...{ id: credential.id, token: credential.token }, text: 'vitamin', language: 'en' });
  fireEvent.click(screen.getByRole('button', { name: 'Show location' }));
  const card = await screen.findByRole('region', { name: '비타민C', hidden: false });
  expect(await within(document.body).findByText('Product location: Shelf A-1')).toBeTruthy();
  expect(card).toBeTruthy();
  expect(calls.find(call => call.action === 'answer')!.body).toMatchObject({ intent: 'location', productKind: 'listing', productId: 'p1', language: 'en' });
});

it('sends an optional product question for AI-picked published paragraphs and offers the pharmacist notice', async () => {
  localStorage.setItem('o4o:consultation-kiosk-device:v1', JSON.stringify(credential));
  render(<KioskConsultationPage />);
  fireEvent.change(await screen.findByLabelText('찾으시는 상품'), { target: { value: '비타민' } });
  fireEvent.click(screen.getByRole('button', { name: '상품 찾기' }));
  fireEvent.click(await screen.findByRole('button', { name: '비타민C' }));
  fireEvent.change(screen.getByLabelText('이 상품에 대해 궁금한 점(선택)'), { target: { value: '성분이 뭐예요?' } });
  fireEvent.click(screen.getByRole('button', { name: '질문하기' }));
  await screen.findByText('Product location: Shelf A-1');
  const answers = calls.filter(call => call.action === 'answer');
  expect(answers[answers.length - 1].body).toMatchObject({ intent: 'product-details', question: '성분이 뭐예요?', language: 'ko' });
  fireEvent.click(screen.getByRole('button', { name: 'Ask a pharmacist about medicines' }));
  expect(await screen.findByText('Please ask a pharmacist about choosing or taking medicines.')).toBeTruthy();
});

it('clears the previous customer after idle time and forgets a revoked device', async () => {
  localStorage.setItem('o4o:consultation-kiosk-device:v1', JSON.stringify(credential));
  vi.useFakeTimers({ shouldAdvanceTime: true });
  render(<KioskConsultationPage />);
  const input = await screen.findByLabelText('찾으시는 상품');
  fireEvent.change(input, { target: { value: '비타민' } });
  await act(async () => { await vi.advanceTimersByTimeAsync(KIOSK_IDLE_MS + 10); });
  expect((screen.getByLabelText('찾으시는 상품') as HTMLInputElement).value).toBe('');
  vi.useRealTimers();
  respond = (action) => action === 'search' ? { status: 404, body: { success: false, code: 'KIOSK_NOT_REGISTERED', error: '등록된 소비자 태블릿을 확인해 주세요.' } } : ok(context);
  fireEvent.change(screen.getByLabelText('찾으시는 상품'), { target: { value: '비타민' } });
  fireEvent.click(screen.getByRole('button', { name: '상품 찾기' }));
  await screen.findByRole('button', { name: '연결하기' });
  expect(localStorage.getItem('o4o:consultation-kiosk-device:v1')).toBeNull();
});

it('puts this kiosk\'s speech auto-detect languages first', async () => {
  localStorage.setItem('o4o:consultation-kiosk-device:v1', JSON.stringify(credential));
  respond = (action) => action === 'context' ? ok({ ...context, languages: [...context.languages, { key: 'vi', label: 'Tiếng Việt · 베트남어' }],
    runtime: { detectLanguage: false, speechLanguages: ['vi', 'en'] } }) : ok({});
  render(<KioskConsultationPage />);
  const group = await screen.findByRole('group', { name: '언어' });
  expect(within(group).getAllByRole('button').map(button => button.textContent)).toEqual(['Tiếng Việt · 베트남어', 'English · 영어', '한국어']);
});
