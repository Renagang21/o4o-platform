import { useLayoutEffect } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ResourcesFormModal } from '../ResourcesFormModal';
afterEach(cleanup);
it('keeps an edit made immediately after commit through a failed save and retry', async () => {
  const initial = { title: '원본', summary: '', body: '', linkUrl: '', linkText: '' };
  const submit = vi.fn().mockRejectedValueOnce(new Error('합성 저장 장애')).mockResolvedValue(undefined);
  function EditAtCommit() {
    useLayoutEffect(() => {
      const input = screen.getByPlaceholderText('자료 제목');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '수정 제목');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, []);
    return <ResourcesFormModal open initial={initial} config={{ fields: { summary: true, body: false, link: true } }} onClose={vi.fn()} onSubmit={submit} />;
  }
  render(<EditAtCommit />);
  const input = screen.getByPlaceholderText('자료 제목') as HTMLInputElement;
  await waitFor(() => expect(input.value).toBe('수정 제목'));
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await screen.findByText('합성 저장 장애');
  expect(input.value).toBe('수정 제목');
  expect(submit.mock.calls[0][0].title).toBe('수정 제목');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '저장' })); });
  expect(submit.mock.calls[1][0].title).toBe('수정 제목');
});
