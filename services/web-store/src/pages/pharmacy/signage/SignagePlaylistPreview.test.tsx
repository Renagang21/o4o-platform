import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SignagePlaylistPreview } from './SignagePlaylistPreview';
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(cleanup);
const row = (id: string, title: string) => ({ id, title, contentJson: { sourceUrl: `https://youtu.be/${id === 'first' ? 'aaaaaaaaaaa' : 'bbbbbbbbbbb'}` }, isForced: false }) as any;
it('keeps the selected saved item through a reorder, falls back after removal and exposes large next/previous controls', () => {
  const first = row('first', 'First'), second = row('second', 'Second');
  const view = render(<SignagePlaylistPreview name="Fixture" items={[first, second]} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: '다음 안내' })); expect(screen.getByTitle('Second 미리보기')).toBeTruthy();
  view.rerender(<SignagePlaylistPreview name="Fixture" items={[second, first]} onClose={vi.fn()} />);
  expect(screen.getByTitle('Second 미리보기')).toBeTruthy(); expect((screen.getByRole('button', { name: '이전 안내' }) as HTMLButtonElement).disabled).toBe(true);
  view.rerender(<SignagePlaylistPreview name="Fixture" items={[first]} onClose={vi.fn()} />);
  expect(screen.getByTitle('First 미리보기')).toBeTruthy(); expect((screen.getByRole('button', { name: '다음 안내' }) as HTMLButtonElement).disabled).toBe(true);
});
