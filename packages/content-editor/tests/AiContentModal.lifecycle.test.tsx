import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiContentModal } from '../src/components/AiContentModal';

function Harness() {
  const [open, setOpen] = useState(true);
  return <>
    <button onClick={() => setOpen(true)}>Reopen fixture</button>
    <AiContentModal open={open} onClose={() => setOpen(false)} editor={null}
      initialText="Fixture input" showStoreSave showProductionMaterialSave />
  </>;
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, html: '<p>Fixture</p>', title: 'Generated title', summary: 'Summary' }),
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function generate() {
  fireEvent.click(screen.getByRole('button', { name: '✨ AI로 생성' }));
  await screen.findByRole('button', { name: '내 매장 저장' });
}

describe('real AiContentModal save-panel lifecycle', () => {
  it('close/reopen clears store draft before a new generated result opens the panel', async () => {
    render(<Harness />);
    await generate();
    fireEvent.click(screen.getByRole('button', { name: '내 매장 저장' }));
    const title = screen.getByPlaceholderText('저장할 콘텐츠 제목을 입력하세요');
    expect((title as HTMLInputElement).value).toBe('Generated title');
    fireEvent.change(title, { target: { value: 'Old draft' } });
    fireEvent.click(screen.getByRole('button', { name: '×' }));
    expect(screen.queryByPlaceholderText('저장할 콘텐츠 제목을 입력하세요')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reopen fixture' }));
    await generate();
    fireEvent.click(screen.getByRole('button', { name: '내 매장 저장' }));
    expect((screen.getByPlaceholderText('저장할 콘텐츠 제목을 입력하세요') as HTMLInputElement).value).toBe('Generated title');
  });

  it('store and material panels keep independent drafts while both are open', async () => {
    render(<Harness />);
    await generate();
    fireEvent.click(screen.getByRole('button', { name: '내 매장 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '제작 자료로 저장' }));
    const store = screen.getByPlaceholderText('저장할 콘텐츠 제목을 입력하세요');
    const material = screen.getByPlaceholderText('저장할 매장 제작 자료 제목을 입력하세요');
    fireEvent.change(store, { target: { value: 'Store draft' } });
    fireEvent.change(material, { target: { value: 'Material draft' } });
    expect((store as HTMLInputElement).value).toBe('Store draft');
    expect((material as HTMLInputElement).value).toBe('Material draft');
  });
});
