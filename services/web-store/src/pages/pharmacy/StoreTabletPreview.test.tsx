import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('@o4o/tablet-kiosk-core', () => ({ TabletKioskPage: () => <div>Fixture customer screen</div> }));
import { StoreTabletPreview } from './StoreTabletPreview';
const copy = vi.fn(), show = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { show(); this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(cleanup);
function Preview() {
  const [open, setOpen] = useState(false), [view, setView] = useState<'tablet' | 'mobile'>('tablet');
  return <><button onClick={() => setOpen(true)}>미리보기 열기</button>{open && <StoreTabletPreview previewSlug="fixture" previewView={view}
    previewSettings={undefined} previewApi={{} as any} tabletId="tablet" storeSlug="fixture" publicUrl="https://pharmacy.neture.co.kr/tablet/fixture"
    onCopy={copy} onClose={() => setOpen(false)} onViewChange={setView} />}</>;
}
it('keeps one modal across viewport changes, exposes run/copy actions and restores focus on Escape', () => {
  render(<Preview />); const opener = screen.getByRole('button', { name: '미리보기 열기' }); opener.focus(); fireEvent.click(opener);
  const dialog = screen.getByRole('dialog', { name: '고객 화면 미리보기' });
  fireEvent.click(screen.getByRole('button', { name: '휴대전화' })); expect(show).toHaveBeenCalledOnce();
  const copyButton = screen.getByRole('button', { name: '주소 복사' }); expect(copyButton.className).not.toContain('hidden');
  fireEvent.click(copyButton); expect(copy).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: '새 창에서 열기' }).className).not.toContain('hidden');
  fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
  expect(screen.queryByRole('dialog')).toBeNull(); expect(document.activeElement).toBe(opener);
});
