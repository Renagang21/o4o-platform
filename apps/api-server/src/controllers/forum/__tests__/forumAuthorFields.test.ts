import { authorPostFields } from '../forumAuthorFields';

describe('fields a post author may set (2026-11-14 community review)', () => {
  it('an author cannot pin, lock, announce, archive or approve their own post', () => {
    expect(authorPostFields({ isPinned: true, isLocked: true, type: 'announcement', status: 'archived' }, false)).toEqual({ type: undefined, status: undefined });
    expect(authorPostFields({ status: 'pending' }, false).status).toBeUndefined();
    expect(authorPostFields({ status: 'rejected' }, false).status).toBeUndefined();
  });
  it('an author keeps ordinary types and draft/publish', () => {
    expect(authorPostFields({ type: 'question', status: 'draft' }, false)).toEqual({ type: 'question', status: 'draft' });
    expect(authorPostFields({ status: 'publish' }, false).status).toBe('publish');
    expect(authorPostFields({ type: 'not-a-type' }, false).type).toBeUndefined();
  });
  it('board operators and platform governance keep the previous behaviour', () => {
    expect(authorPostFields({ isPinned: true, isLocked: false, type: 'announcement', status: 'archived' }, true))
      .toEqual({ isPinned: true, isLocked: false, type: 'announcement', status: 'archived' });
  });
});
