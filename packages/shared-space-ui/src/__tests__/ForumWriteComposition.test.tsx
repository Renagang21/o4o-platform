/**
 * ForumWritePageShell + ForumWriteForm 결합 테스트
 * WO-O4O-COMMUNITY-FORUM-WRITE-SHELL-TEMPLATE-V1 §14
 *
 * 셸 승격 후에도 폼 본문(제목/내용/validation/submit/cancel)이 그대로 동작하는지 고정한다.
 * RichTextEditor 는 jsdom 에서 무거우므로 mock 한다 — 검증 대상은 셸+폼 결합이다.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@o4o/content-editor', () => ({
  RichTextEditor: ({ value, onChange, placeholder }: any) => (
    <textarea
      aria-label="content-editor"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange({ html: e.target.value })}
    />
  ),
}));

const { ForumWritePageShell } = await import('../ForumWritePageShell');
const { ForumWriteForm } = await import('../ForumWriteForm');

afterEach(() => cleanup());

function renderComposed(props: {
  mode: 'create' | 'edit';
  onSubmit: (payload: any) => Promise<void> | void;
  onCancel?: () => void;
  onInvalid?: (reason: string) => void;
  initialTitle?: string;
  initialContentHtml?: string;
}) {
  return render(
    <ForumWritePageShell
      mode={props.mode}
      isAuthenticated
      authorName="tester"
      forums={[{ id: 'f1', name: '자유게시판' }]}
      forumId="f1"
    >
      <ForumWriteForm
        initialTitle={props.initialTitle}
        initialContentHtml={props.initialContentHtml}
        titleLabel="제목"
        titlePlaceholder="제목을 입력하세요"
        contentLabel="내용"
        submitLabel={props.mode === 'edit' ? '수정하기' : '등록'}
        submittingLabel="등록 중..."
        cancelLabel="취소"
        onSubmit={props.onSubmit}
        onCancel={props.onCancel}
        onInvalid={props.onInvalid as any}
      />
    </ForumWritePageShell>,
  );
}

describe('ForumWritePageShell + ForumWriteForm', () => {
  it('create: 제목/내용 입력 후 submit payload 를 그대로 전달한다', async () => {
    const onSubmit = vi.fn();
    renderComposed({ mode: 'create', onSubmit });

    fireEvent.change(screen.getByPlaceholderText('제목을 입력하세요'), { target: { value: '  새 글  ' } });
    fireEvent.change(screen.getByLabelText('content-editor'), { target: { value: '<p>본문</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ title: '새 글', editorHtml: '<p>본문</p>' });
  });

  it('edit: 초기값이 폼에 채워지고 수정 라벨로 submit 된다', async () => {
    const onSubmit = vi.fn();
    renderComposed({
      mode: 'edit',
      onSubmit,
      initialTitle: '기존 제목',
      initialContentHtml: '<p>기존 본문</p>',
    });

    expect((screen.getByPlaceholderText('제목을 입력하세요') as HTMLInputElement).value).toBe('기존 제목');
    expect((screen.getByLabelText('content-editor') as HTMLTextAreaElement).value).toBe('<p>기존 본문</p>');

    fireEvent.click(screen.getByRole('button', { name: '수정하기' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('제목이 비면 onInvalid("title") 이 호출되고 submit 되지 않는다', async () => {
    const onSubmit = vi.fn();
    const onInvalid = vi.fn();
    renderComposed({ mode: 'create', onSubmit, onInvalid });

    fireEvent.change(screen.getByLabelText('content-editor'), { target: { value: '<p>본문</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => expect(onInvalid).toHaveBeenCalledWith('title'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('내용이 비면 onInvalid("content") 이 호출되고 submit 되지 않는다', async () => {
    const onSubmit = vi.fn();
    const onInvalid = vi.fn();
    renderComposed({ mode: 'create', onSubmit, onInvalid });

    fireEvent.change(screen.getByPlaceholderText('제목을 입력하세요'), { target: { value: '제목만' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => expect(onInvalid).toHaveBeenCalledWith('content'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submit 진행 중에는 버튼이 비활성화되고 진행 라벨을 보여준다', async () => {
    let release: () => void = () => {};
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    renderComposed({ mode: 'create', onSubmit });

    fireEvent.change(screen.getByPlaceholderText('제목을 입력하세요'), { target: { value: '제목' } });
    fireEvent.change(screen.getByLabelText('content-editor'), { target: { value: '<p>본문</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    const submitting = await screen.findByRole('button', { name: '등록 중...' });
    expect((submitting as HTMLButtonElement).disabled).toBe(true);

    release();
    await waitFor(() => expect(screen.getByRole('button', { name: '등록' })).toBeTruthy());
  });

  it('취소 버튼은 onCancel 콜백만 호출한다 (셸은 라우팅을 모른다)', () => {
    const onCancel = vi.fn();
    renderComposed({ mode: 'create', onSubmit: vi.fn(), onCancel });
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
