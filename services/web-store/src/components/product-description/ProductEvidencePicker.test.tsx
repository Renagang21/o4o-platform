import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
const api = vi.hoisted(() => ({ local: vi.fn(), list: vi.fn() }));
vi.mock('../../api/localProducts', () => ({ getLocalProduct: api.local }));
vi.mock('../../api/assetSnapshot', () => ({ storeDescriptionApi: { list: api.list } }));
import { ProductEvidencePicker } from './ProductEvidencePicker';
const insert = vi.fn(), loaded = vi.fn(), props = { kind: 'local' as const, id: 'product', locale: 'ko', disabled: false, isCurrent: () => true, onLoaded: loaded, onInsert: insert };
beforeEach(() => { vi.clearAllMocks(); api.local.mockReset().mockResolvedValue({ id: 'product', name: 'Fixture', is_active: true, detail_html: '<p>상품 원문</p>' }); api.list.mockReset(); });
afterEach(cleanup);
function start(overrides: Partial<ComponentProps<typeof ProductEvidencePicker>> = {}) { render(<ProductEvidencePicker {...props} {...overrides} />); fireEvent.click(screen.getByText('저장된 상품 원문 확인·가져오기')); fireEvent.click(screen.getByRole('button', { name: '상품 원문 불러오기' })); }
it('accepts the existing snake_case product source and inserts only after an explicit review, once', async () => {
  start(); await screen.findByText('상품 원문'); expect(insert).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '확인한 원문을 본문에 추가' }));
  expect(insert).toHaveBeenCalledWith('<p>상품 원문</p>'); expect(insert).toHaveBeenCalledOnce();
  expect((screen.getByRole('button', { name: '원문을 본문에 추가했습니다' }) as HTMLButtonElement).disabled).toBe(true);
});
it('distinguishes no material from a failed read and retains retry', async () => {
  api.local.mockRejectedValueOnce(new Error('private')); start(); await screen.findByRole('alert');
  api.local.mockResolvedValueOnce({ id: 'product', name: 'Fixture', detailHtml: '' });
  fireEvent.click(screen.getByRole('button', { name: '상품 원문 다시 확인' })); await screen.findByText(/가져올 상품 설명이 없습니다/);
  expect(insert).not.toHaveBeenCalled(); expect(loaded).not.toHaveBeenCalled();
});
it('drops a product read after the editor/store is no longer current', async () => {
  let current = true, finish!: (value: unknown) => void;
  api.local.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  render(<ProductEvidencePicker {...props} isCurrent={() => current} />); fireEvent.click(screen.getByText('저장된 상품 원문 확인·가져오기'));
  fireEvent.click(screen.getByRole('button', { name: '상품 원문 불러오기' })); current = false;
  await act(async () => finish({ id: 'product', detailHtml: '<p>Old source</p>' }));
  expect(loaded).not.toHaveBeenCalled(); expect(screen.queryByText('Old source')).toBeNull();
});

it.each([['en', 'English original'], ['ja', '한국어 원문']] as const)('reads canonical listing descriptions with locale %s and explicit insertion', async (locale, text) => {
  api.list.mockResolvedValue({ success: true, data: { items: [
    { descriptionId: 'draft', title: 'Unconfirmed', language: locale, status: 'draft', contentHtml: '<p>Not canonical</p>' },
    { descriptionId: 'old-status', title: 'Wrong status', language: locale, status: 'published', contentHtml: '<p>Not canonical</p>' },
    { descriptionId: 'ko', title: 'Fixture', language: 'ko', status: 'canonical', contentHtml: '<p>한국어 원문</p>', updatedAt: '2026-10-25' },
    { descriptionId: 'en', title: 'Fixture', language: 'en', status: 'canonical', contentHtml: '<p>English original</p>', updatedAt: '2026-10-25' },
  ] } });
  start({ kind: 'listing', locale }); await screen.findByText(text);
  expect(api.list).toHaveBeenCalledWith('product'); expect(api.local).not.toHaveBeenCalled();
  expect(screen.queryByText('Not canonical')).toBeNull(); expect(insert).not.toHaveBeenCalled();
  expect(loaded).toHaveBeenCalledWith(expect.objectContaining({ html: `<p>${text}</p>` }));
  fireEvent.click(screen.getByRole('button', { name: '확인한 원문을 본문에 추가' }));
  expect(insert).toHaveBeenCalledWith(`<p>${text}</p>`); expect(insert).toHaveBeenCalledOnce();
});
it('distinguishes empty canonical material from listing failures and retries without inserting', async () => {
  api.list.mockResolvedValueOnce({ success: true, data: { items: [
    { status: 'canonical', language: 'ko', contentHtml: null },
    { status: 'draft', language: 'ko', contentHtml: '<p>Draft</p>' },
  ] } });
  start({ kind: 'listing' }); await screen.findByText(/가져올 상품 설명이 없습니다/);
  expect(loaded).not.toHaveBeenCalled();
  api.list.mockRejectedValueOnce(new Error('temporary listing failure'));
  fireEvent.click(screen.getByRole('button', { name: '상품 원문 불러오기' })); await screen.findByRole('alert');
  api.list.mockResolvedValueOnce({ success: true, data: { items: [
    { status: 'canonical', language: 'ko', title: 'Fixture', contentHtml: '<p>Retry original</p>', updatedAt: '' },
  ] } });
  fireEvent.click(screen.getByRole('button', { name: '상품 원문 다시 확인' })); await screen.findByText('Retry original');
  expect(insert).not.toHaveBeenCalled();
});
