import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ForumCommentList } from '../ForumCommentList';

afterEach(cleanup);
const comment = { id: 'one', authorName: '회원', content: '댓글' };

describe('댓글 중재와 작성자 수정 권한', () => {
  it('담당 운영자의 삭제 중재는 타인 댓글 수정 버튼을 열지 않는다', () => {
    const remove = vi.fn();
    render(<ForumCommentList comments={[{ ...comment, canDelete: true }]} onEditComment={vi.fn()} onDeleteComment={remove} />);
    expect(screen.queryByRole('button', { name: '수정' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(remove).toHaveBeenCalledWith('one');
  });

  it('일반 독자는 액션을 볼 수 없으며 작성자는 기존 인라인 수정을 이용한다', () => {
    const { rerender } = render(<ForumCommentList comments={[comment]} onEditComment={vi.fn()} onDeleteComment={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<ForumCommentList comments={[{ ...comment, isAuthor: true }]} onEditComment={vi.fn()} onDeleteComment={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('댓글');
  });
});

it('실패한 댓글 수정은 초안을 유지하고 재시도를 허용한다', async () => {
 const edit=vi.fn().mockRejectedValueOnce(new Error('저장 실패')).mockResolvedValue(undefined);
 render(<ForumCommentList comments={[{...comment,isAuthor:true}]} onEditComment={edit}/>);
 fireEvent.click(screen.getByRole('button',{name:'수정'}));fireEvent.change(screen.getByRole('textbox'),{target:{value:'보존할 초안'}});fireEvent.click(screen.getByRole('button',{name:'저장'}));
 await screen.findByRole('alert');expect(screen.getByDisplayValue('보존할 초안')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'저장'}));await screen.findByRole('button',{name:'수정'});expect(edit).toHaveBeenCalledTimes(2);
});
it('삭제 실패는 오류를 표시하고 동일 댓글을 다시 삭제할 수 있다', async () => {
 const remove=vi.fn().mockRejectedValueOnce(new Error('삭제 실패')).mockResolvedValue(undefined);
 render(<ForumCommentList comments={[{...comment,canDelete:true}]} onDeleteComment={remove}/>);fireEvent.click(screen.getByRole('button',{name:'삭제'}));await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'삭제'}));await screen.findByRole('button',{name:'삭제'});expect(remove).toHaveBeenCalledTimes(2);
});
