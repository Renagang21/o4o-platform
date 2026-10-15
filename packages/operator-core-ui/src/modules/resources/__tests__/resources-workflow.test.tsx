import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import { OperatorResourcesConsolePage } from '../OperatorResourcesConsolePage';
import { CMS_CONTENTS_RESOURCES_LIFECYCLE } from '../lifecycle';
const row = (id = 'fixture', status = 'draft') => ({
  id,
  title: id,
  status,
  summary: null,
  source_type: 'manual',
  source_url: null,
  source_file_name: null,
  usage_type: 'READ',
  created_by: null,
  created_at: '2026-10-15',
  updated_at: '2026-10-15',
});
const list = (id = 'fixture') => ({ items: [row(id)], total: 1 });
const client = () => ({
  operatorList: vi.fn().mockResolvedValue(list()),
  operatorUpdateStatus: vi.fn().mockResolvedValue({ success: true }),
  operatorDelete: vi.fn().mockResolvedValue({ success: true }),
});
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
afterEach(() => {
  cleanup();
  localStorage.clear();
});
describe('resources operator workflow', () => {
  it('ignores an old filter response', async () => {
    const api = client();
    const old = deferred<ReturnType<typeof list>>();
    api.operatorList.mockReturnValueOnce(old.promise);
    render(
      <OperatorResourcesConsolePage serviceKey="kpa-society" client={api} />,
    );
    fireEvent.change(screen.getAllByRole('combobox')[1], {
      target: { value: 'published' },
    });
    await screen.findByText('fixture');
    await act(async () => old.resolve(list('old')));
    expect(screen.queryByText('old')).toBeNull();
    expect(screen.getByText('fixture')).toBeTruthy();
  });
  it('does not disguise a failed envelope as an empty list', async () => {
    const api = client();
    api.operatorList.mockResolvedValueOnce({
      success: false,
      error: '목록 거부',
    });
    render(
      <OperatorResourcesConsolePage serviceKey="kpa-society" client={api} />,
    );
    expect((await screen.findByRole('alert')).textContent).toContain(
      '목록 거부',
    );
    expect(screen.queryByText('등록된 자료가 없습니다')).toBeNull();
  });
  it('keeps a successful transition distinct from read failure and retries only reads', async () => {
    const api = client();
    render(
      <OperatorResourcesConsolePage serviceKey="kpa-society" client={api} />,
    );
    await screen.findByText('fixture');
    api.operatorList.mockRejectedValueOnce(new Error('갱신 장애'));
    fireEvent.click(screen.getByTitle('더보기'));
    fireEvent.click(screen.getByRole('button', { name: '노출' }));
    await screen.findByText(/처리는 완료했지만/);
    expect(screen.getByRole('status').textContent).toContain('노출 처리');
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await screen.findByText('fixture');
    expect(api.operatorUpdateStatus).toHaveBeenCalledTimes(1);
  });
  it('does not replace a reopened editor with an old detail response', async () => {
    const api = {
      ...client(),
      operatorGet: vi.fn(),
      operatorUpdate: vi.fn(),
      operatorCreate: vi.fn(),
    };
    const old = deferred<unknown>();
    api.operatorGet.mockReturnValueOnce(old.promise);
    render(
      <OperatorResourcesConsolePage
        serviceKey="fixture"
        client={api}
        lifecycle={CMS_CONTENTS_RESOURCES_LIFECYCLE}
      />,
    );
    await screen.findByText('fixture');
    fireEvent.click(screen.getByTitle('더보기'));
    fireEvent.click(screen.getByRole('button', { name: '편집' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '자료 편집' })).getByRole(
        'button',
        { name: '닫기' },
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: '자료 등록' }));
    fireEvent.change(screen.getByPlaceholderText('자료 제목'), {
      target: { value: '새 초안' },
    });
    await act(async () =>
      old.resolve({ title: '늦은 응답', body: '이전 본문' }),
    );
    expect(
      (screen.getByPlaceholderText('자료 제목') as HTMLInputElement).value,
    ).toBe('새 초안');
  });
  it('clears hidden selections when filters change', async () => {
    const api = client();
    render(
      <OperatorResourcesConsolePage serviceKey="kpa-society" client={api} />,
    );
    await screen.findByText('fixture');
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.change(screen.getByLabelText('자료 상태'), {
      target: { value: 'published' },
    });
    await waitFor(() =>
      expect(
        (screen.getAllByRole('checkbox')[1] as HTMLInputElement).checked,
      ).toBe(false),
    );
  });
  it('guards duplicate writes through list refresh', async () => {
    const api = client();
    const write = deferred<unknown>();
    api.operatorUpdateStatus.mockReturnValueOnce(write.promise);
    render(
      <OperatorResourcesConsolePage serviceKey="kpa-society" client={api} />,
    );
    await screen.findByText('fixture');
    fireEvent.click(screen.getByTitle('더보기'));
    const button = screen.getByRole('button', { name: '노출' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(api.operatorUpdateStatus).toHaveBeenCalledTimes(1);
    expect(
      (
        screen
          .getByLabelText('자료 상태')
          .closest('fieldset') as HTMLFieldSetElement
      ).disabled,
    ).toBe(true);
    const read = deferred<ReturnType<typeof list>>();
    api.operatorList.mockReturnValueOnce(read.promise);
    await act(async () => write.resolve({ success: true }));
    expect(
      (
        screen
          .getByLabelText('자료 상태')
          .closest('fieldset') as HTMLFieldSetElement
      ).disabled,
    ).toBe(true);
    await act(async () => read.resolve(list()));
    await waitFor(() =>
      expect(
        (
          screen
            .getByLabelText('자료 상태')
            .closest('fieldset') as HTMLFieldSetElement
        ).disabled,
      ).toBe(false),
    );
  });
  it('keeps an unsuccessful status response as a visible failure', async () => {
    const api = client();
    api.operatorUpdateStatus.mockResolvedValueOnce({
      success: false,
      error: '전이 거부',
    });
    render(
      <OperatorResourcesConsolePage serviceKey="kpa-society" client={api} />,
    );
    await screen.findByText('fixture');
    fireEvent.click(screen.getByTitle('더보기'));
    fireEvent.click(screen.getByRole('button', { name: '노출' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      '전이 거부',
    );
    expect(screen.queryByRole('status')).toBeNull();
    expect(api.operatorList).toHaveBeenCalledTimes(1);
  });
  it('keeps edited input on failure and guards a duplicate submit', async () => {
    const api = {
      ...client(),
      operatorGet: vi
        .fn()
        .mockResolvedValue({ ...row(), title: 'fixture', body: '원본' }),
      operatorUpdate: vi
        .fn()
        .mockRejectedValueOnce(new Error('저장 장애'))
        .mockResolvedValue({ success: true }),
      operatorCreate: vi.fn(),
    };
    render(
      <OperatorResourcesConsolePage
        serviceKey="fixture"
        client={api}
        lifecycle={CMS_CONTENTS_RESOURCES_LIFECYCLE}
      />,
    );
    await screen.findByText('fixture');
    fireEvent.click(screen.getByTitle('더보기'));
    fireEvent.click(screen.getByRole('button', { name: '편집' }));
    const title = await screen.findByPlaceholderText('자료 제목');
    fireEvent.change(title, { target: { value: '수정 제목' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByText('저장 장애');
    expect((title as HTMLInputElement).value).toBe('수정 제목');
    const pending = deferred<unknown>();
    api.operatorUpdate.mockReturnValueOnce(pending.promise);
    const form = title.closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(api.operatorUpdate).toHaveBeenCalledTimes(2);
    expect(
      (
        within(screen.getByRole('dialog', { name: '자료 편집' })).getByRole(
          'button',
          { name: '닫기' },
        ) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await act(async () => pending.resolve({ success: true }));
    await screen.findByRole('status');
  });
  it('does not refresh when a pending write completes after unmount', async () => {
    const api = client();
    const pending = deferred<unknown>();
    api.operatorUpdateStatus.mockReturnValueOnce(pending.promise);
    const view = render(
      <OperatorResourcesConsolePage serviceKey="kpa-society" client={api} />,
    );
    await screen.findByText('fixture');
    fireEvent.click(screen.getByTitle('더보기'));
    fireEvent.click(screen.getByRole('button', { name: '노출' }));
    view.unmount();
    await act(async () => pending.resolve({ success: true }));
    expect(api.operatorList).toHaveBeenCalledTimes(1);
  });
  it('refreshes a partial bulk result and retries only failed ids', async () => {
    const api=client(); api.operatorList.mockResolvedValue({items:[row('first'),row('second')],total:2});
    api.operatorUpdateStatus.mockImplementation(async (id:string)=> { if(id==='second' && api.operatorUpdateStatus.mock.calls.length <= 2) throw new Error('부분 실패');return {success:true}; });
    render(<OperatorResourcesConsolePage serviceKey="kpa-society" client={api}/>);await screen.findByText('first');
    fireEvent.click(screen.getAllByRole('checkbox')[0]);fireEvent.click(screen.getByRole('button',{name:'노출'}));
    fireEvent.click(screen.getAllByRole('button',{name:'노출'}).at(-1)!);
    await screen.findByText('실패 1건 재시도');await waitFor(()=>expect(api.operatorList).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button',{name:'실패 1건 재시도'}));await waitFor(()=>expect(api.operatorList).toHaveBeenCalledTimes(3));
    expect(api.operatorUpdateStatus.mock.calls.map(args=>args[0])).toEqual(['first','second','second']);
  });
  it('corrects an emptied last page after delete without repeating the delete', async () => {
    const api=client();api.operatorList.mockImplementation(async ({page}:{page:number})=> page===2 ? ({items:[row('last')],total:21}) : ({items:[row('first')],total:21}));
    render(<OperatorResourcesConsolePage serviceKey="kpa-society" client={api}/>);await screen.findByText('first');
    fireEvent.click(screen.getByRole('button',{name:'다음'}));await screen.findByText('last');
    fireEvent.click(screen.getByTitle('더보기'));fireEvent.click(screen.getByRole('button',{name:'삭제'}));
    api.operatorList.mockResolvedValueOnce({items:[],total:20});fireEvent.click(screen.getAllByRole('button',{name:'삭제'}).at(-1)!);
    await screen.findByText('first');expect(api.operatorDelete).toHaveBeenCalledTimes(1);expect(api.operatorList.mock.calls.at(-1)?.[0].page).toBe(1);
  });

  it('does not execute a confirmation opened for a previous filter result', async () => {
    const api=client();api.operatorList.mockResolvedValue({items:[row('fixture','published')],total:1});
    render(<OperatorResourcesConsolePage serviceKey="kpa-society" client={api}/>);await screen.findByText('fixture');
    fireEvent.click(screen.getByTitle('더보기'));fireEvent.click(screen.getByRole('button',{name:'숨김'}));
    fireEvent.change(screen.getByLabelText('자료 상태'),{target:{value:'published'}});
    await waitFor(()=>expect(api.operatorList).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getAllByRole('button',{name:'숨김'}).at(-1)!);
    await screen.findByText('목록을 다시 확인한 뒤 처리해 주세요.');expect(api.operatorUpdateStatus).not.toHaveBeenCalled();
  });

});
