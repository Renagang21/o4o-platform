/**
 * ForumWritePageShell 테스트 — WO-O4O-COMMUNITY-FORUM-WRITE-SHELL-TEMPLATE-V1 §14
 *
 * 실행: npx vitest run --config packages/shared-space-ui/vitest.config.mjs
 * 주: vitest globals 미사용 → cleanup 을 명시적으로 등록한다.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ForumWritePageShell } from '../ForumWritePageShell';

afterEach(() => cleanup());

const FORUMS = [
  { id: 'f1', name: '자유게시판' },
  { id: 'f2', name: '공지' },
];

describe('ForumWritePageShell', () => {
  it('create 모드: 기본 heading 과 게시판 selector 를 렌더한다', () => {
    render(
      <ForumWritePageShell mode="create" isAuthenticated forums={FORUMS} forumId="f1">
        <div>form-body</div>
      </ForumWritePageShell>,
    );
    expect(screen.getByRole('heading', { name: '글쓰기' })).toBeTruthy();
    expect(screen.getByLabelText('게시판')).toBeTruthy();
    expect(screen.getByText('form-body')).toBeTruthy();
  });

  it('edit 모드: heading 이 수정용이고 게시판 selector 를 노출하지 않는다', () => {
    render(
      <ForumWritePageShell mode="edit" isAuthenticated forums={FORUMS}>
        <div>form-body</div>
      </ForumWritePageShell>,
    );
    expect(screen.getByRole('heading', { name: '글 수정' })).toBeTruthy();
    expect(screen.queryByLabelText('게시판')).toBeNull();
  });

  it('로딩 중에는 로딩 문구만 렌더한다', () => {
    render(
      <ForumWritePageShell mode="edit" isAuthenticated isLoading>
        <div>form-body</div>
      </ForumWritePageShell>,
    );
    expect(screen.getByText('불러오는 중...')).toBeTruthy();
    expect(screen.queryByText('form-body')).toBeNull();
  });

  it('비로그인 상태에서는 로그인 안내만 렌더하고 폼을 감춘다', () => {
    render(
      <ForumWritePageShell mode="create" isAuthenticated={false}>
        <div>form-body</div>
      </ForumWritePageShell>,
    );
    expect(screen.getByRole('heading', { name: '로그인이 필요합니다' })).toBeTruthy();
    expect(screen.queryByText('form-body')).toBeNull();
  });

  it('authorName 이 있으면 작성자 표시명 블록을 렌더한다', () => {
    render(
      <ForumWritePageShell mode="create" isAuthenticated authorName="홍길동">
        <div>form-body</div>
      </ForumWritePageShell>,
    );
    expect(screen.getByText('작성자 표시명:')).toBeTruthy();
    expect(screen.getByText('홍길동')).toBeTruthy();
  });

  it('authorName 이 없으면 작성자 블록을 렌더하지 않는다', () => {
    render(
      <ForumWritePageShell mode="create" isAuthenticated authorName={null}>
        <div>form-body</div>
      </ForumWritePageShell>,
    );
    expect(screen.queryByText('작성자 표시명:')).toBeNull();
  });

  it('게시판 목록을 option 으로 렌더하고 선택값을 콜백으로 넘긴다', () => {
    const onForumChange = vi.fn();
    render(
      <ForumWritePageShell
        mode="create"
        isAuthenticated
        forums={FORUMS}
        forumId="f1"
        onForumChange={onForumChange}
      >
        <div>form-body</div>
      </ForumWritePageShell>,
    );
    const select = screen.getByLabelText('게시판') as HTMLSelectElement;
    expect(select.value).toBe('f1');
    expect(screen.getByRole('option', { name: '공지' })).toBeTruthy();
    fireEvent.change(select, { target: { value: 'f2' } });
    expect(onForumChange).toHaveBeenCalledWith('f2');
  });

  it('게시판 로딩 중에는 selector 가 비활성이고 로딩 option 을 보여준다', () => {
    render(
      <ForumWritePageShell mode="create" isAuthenticated forums={[]} forumsLoading>
        <div>form-body</div>
      </ForumWritePageShell>,
    );
    const select = screen.getByLabelText('게시판') as HTMLSelectElement;
    expect(select.disabled).toBe(true);
    expect(screen.getByRole('option', { name: '불러오는 중…' })).toBeTruthy();
  });

  it('게시판이 비면 empty option 과 안내를 렌더한다', () => {
    render(
      <ForumWritePageShell mode="create" isAuthenticated forums={[]}>
        <div>form-body</div>
      </ForumWritePageShell>,
    );
    expect(screen.getByRole('option', { name: '게시판 없음' })).toBeTruthy();
    expect(screen.getByText('아직 글을 등록할 수 있는 게시판이 없습니다.')).toBeTruthy();
    expect((screen.getByLabelText('게시판') as HTMLSelectElement).disabled).toBe(true);
  });

  it('labels config 로 서비스별 문구를 전부 대체할 수 있다', () => {
    render(
      <ForumWritePageShell
        mode="create"
        isAuthenticated
        authorName="Jane"
        forums={[]}
        labels={{
          createHeading: 'Write a Post',
          authorLabel: 'Display name:',
          forumLabel: 'Forum',
          forumEmptyOption: 'No forum available',
          forumEmptyHint: 'No forum is open for posting yet. Please try again later.',
        }}
      >
        <div>form-body</div>
      </ForumWritePageShell>,
    );
    expect(screen.getByRole('heading', { name: 'Write a Post' })).toBeTruthy();
    expect(screen.getByText('Display name:')).toBeTruthy();
    expect(screen.getByLabelText('Forum')).toBeTruthy();
    expect(screen.getByText('No forum is open for posting yet. Please try again later.')).toBeTruthy();
  });

  it('showForumSelect 로 기본 동작(create=노출/edit=숨김)을 override 할 수 있다', () => {
    const { unmount } = render(
      <ForumWritePageShell mode="create" isAuthenticated showForumSelect={false} forums={FORUMS}>
        <div>form-body</div>
      </ForumWritePageShell>,
    );
    expect(screen.queryByLabelText('게시판')).toBeNull();
    unmount();

    render(
      <ForumWritePageShell mode="edit" isAuthenticated showForumSelect forums={FORUMS} forumId="f2">
        <div>form-body</div>
      </ForumWritePageShell>,
    );
    expect((screen.getByLabelText('게시판') as HTMLSelectElement).value).toBe('f2');
  });

  it('selectId 로 label htmlFor 를 서비스별로 지정한다', () => {
    render(
      <ForumWritePageShell mode="create" isAuthenticated forums={FORUMS} forumId="f1" selectId="kcos-forum-select">
        <div>form-body</div>
      </ForumWritePageShell>,
    );
    expect(screen.getByLabelText('게시판').getAttribute('id')).toBe('kcos-forum-select');
  });
});
