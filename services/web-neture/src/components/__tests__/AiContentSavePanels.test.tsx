import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CommunitySavePanel, StoreSavePanel, ProductionMaterialSavePanel } from '../../../../../packages/content-editor/src/components/AiContentSavePanels';
import { blocksToHtml, htmlToForumBlocks } from '../../../../../packages/content-editor/src/components/ai-content-conversion';

afterEach(cleanup);
describe('AI content save destinations preserve interaction and result semantics', () => {
  it('community title, destination, save and cancel are delegated to the original owner', () => {
    const title = vi.fn(), forum = vi.fn(), save = vi.fn(), cancel = vi.fn();
    render(<CommunitySavePanel communityTitle="초안" setCommunityTitle={title} communityForumId="" setCommunityForumId={forum} communityForums={[{ id: 'forum-a', name: '업무 포럼' }]} communityForumsLoading={false} communitySaving={false} communitySaveStatus={null} handleCommunitySave={save} onCancel={cancel} />);
    fireEvent.change(screen.getByPlaceholderText('게시글 제목을 입력하세요'), { target: { value: '편집 제목' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'forum-a' } });
    fireEvent.click(screen.getByRole('button', { name: '게시글 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(title).toHaveBeenCalledWith('편집 제목'); expect(forum).toHaveBeenCalledWith('forum-a'); expect(save).toHaveBeenCalledTimes(1); expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('prevents duplicate store save while pending and after completion', () => {
    const save = vi.fn();
    const props = { storeTitle: '초안', setStoreTitle: vi.fn(), storeSaving: true, storeSaveStatus: null, handleStoreSave: save, onCancel: vi.fn() };
    const { rerender } = render(<StoreSavePanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '저장 중...' })); expect(save).not.toHaveBeenCalled();
    rerender(<StoreSavePanel {...props} storeSaving={false} storeSaveStatus={{ ok: true }} />);
    fireEvent.click(screen.getByRole('button', { name: '저장됨 ✓' })); expect(save).not.toHaveBeenCalled();
    expect(screen.getByText('내 매장 콘텐츠에 저장되었습니다 ✓')).toBeTruthy();
  });
  it('production-material save preserves classification and failed-save retry', () => {
    const save = vi.fn();
    render(<ProductionMaterialSavePanel productionMaterialTitle="제작 자료" setProductionMaterialTitle={vi.fn()} productionMaterialSaving={false} productionMaterialSaveStatus={{ ok: false, error: '다시 시도' }} handleProductionMaterialSave={save} onCancel={vi.fn()} mode="pop" modeConfig={{ label: 'POP', outputType: 'pop' }} />);
    expect(screen.getByText('저장 실패: 다시 시도')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '제작 자료로 저장' })); expect(save).toHaveBeenCalledTimes(1);
    expect(screen.getByText('POP')).toBeTruthy();
  });
});
it('content conversion preserves nested blocks and video wrapper for TipTap insertion', () => {
  const html = blocksToHtml([{ type: 'o4o/group', innerBlocks: [{ type: 'o4o/heading', content: '제목', attributes: { level: 2 } }, { type: 'o4o/youtube', attributes: { url: 'https://www.youtube.com/watch?v=sample' } }] }]);
  expect(html).toContain('<h2>제목</h2>'); expect(html).toContain('data-youtube-video'); expect(html).toContain('/embed/sample');
  const blocks = htmlToForumBlocks('<h2>제목</h2><p>본문</p><ul><li>항목</li></ul>');
  expect(blocks).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'heading', content: '제목' }), expect.objectContaining({ type: 'paragraph', content: '본문' }), expect.objectContaining({ type: 'list' })]));
});
