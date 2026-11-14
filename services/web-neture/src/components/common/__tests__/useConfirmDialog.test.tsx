/**
 * useConfirmDialog — 브라우저 confirm/prompt 대신 공용 확인 대화상자를 Promise 로 쓴다.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useConfirmDialog } from '../useConfirmDialog';

type Api = ReturnType<typeof useConfirmDialog>;
let api: Api;
function Harness() {
  api = useConfirmDialog();
  return <>{api.dialog}</>;
}
afterEach(cleanup);

describe('useConfirmDialog', () => {
  it('confirm: [확인] → true, [취소] → false, 닫히면 대화상자가 사라진다', async () => {
    render(<Harness />);
    let answer: Promise<boolean>;
    act(() => { answer = api.confirm({ title: '모집 마감', message: '마감하시겠습니까?', confirmText: '마감' }); });
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('모집 마감')).toBeTruthy();
    expect(within(dialog).getByText('마감하시겠습니까?')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: '마감' }));
    await expect(answer!).resolves.toBe(true);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    act(() => { answer = api.confirm({ title: '모집 마감', message: '마감하시겠습니까?' }); });
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '취소' }));
    await expect(answer!).resolves.toBe(false);
  });

  it('prompt: 입력값은 앞뒤 공백을 지우고, 비우면 "" · [취소] → null', async () => {
    render(<Harness />);
    let answer: Promise<string | null>;
    act(() => { answer = api.prompt({ title: '반려', message: '반려합니다', reasonPlaceholder: '사유', confirmText: '반려' }); });
    let dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByPlaceholderText('사유'), { target: { value: '  재고 부족  ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '반려' }));
    await expect(answer!).resolves.toBe('재고 부족');

    act(() => { answer = api.prompt({ title: '반려', message: '반려합니다', confirmText: '반려' }); });
    dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: '반려' }));
    await expect(answer!).resolves.toBe('');

    act(() => { answer = api.prompt({ title: '반려', message: '반려합니다' }); });
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '취소' }));
    await expect(answer!).resolves.toBeNull();
  });

  it('prompt required: 비어 있으면 확인 버튼이 비활성', async () => {
    render(<Harness />);
    act(() => { void api.prompt({ title: '사유 필수', message: '사유를 적으세요', reasonPlaceholder: '사유', required: true }); });
    const dialog = await screen.findByRole('dialog');
    expect((within(dialog).getByRole('button', { name: '확인' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(dialog).getByPlaceholderText('사유'), { target: { value: '있음' } });
    expect((within(dialog).getByRole('button', { name: '확인' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('열려 있을 때 다시 부르면 앞의 요청은 취소로 끝난다', async () => {
    render(<Harness />);
    let first: Promise<boolean>;
    let second: Promise<boolean>;
    act(() => { first = api.confirm({ title: '첫째', message: '1' }); });
    await screen.findByText('첫째');
    act(() => { second = api.confirm({ title: '둘째', message: '2' }); });
    await expect(first!).resolves.toBe(false);
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '확인' }));
    await expect(second!).resolves.toBe(true);
  });

  it('keyboard: 열리면 포커스가 대화상자 안으로 가고, Esc 로 취소하면 원래 버튼으로 돌아간다', async () => {
    let answer: Promise<boolean> | undefined;
    function Opener() {
      const local = useConfirmDialog();
      api = local;
      return (
        <>
          <button type="button" onClick={() => { answer = local.confirm({ title: '모집 반려', message: '반려하시겠습니까?', confirmText: '반려' }); }}>반려 열기</button>
          {local.dialog}
        </>
      );
    }
    render(<Opener />);
    const opener = screen.getByRole('button', { name: '반려 열기' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    fireEvent.keyDown(document.activeElement as Element, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement as Element, { key: 'Escape' });
    await expect(answer!).resolves.toBe(false);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it('keyboard: prompt 는 사유 입력칸에 바로 포커스를 준다', async () => {
    render(<Harness />);
    act(() => { void api.prompt({ title: '반려', message: '반려합니다', reasonPlaceholder: '사유' }); });
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByPlaceholderText('사유')));
  });
});
