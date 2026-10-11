/** Owner edits must not restore a stale operator publication or lifecycle state. */
jest.mock('@o4o/forum-core/entities', () => ({ ForumCategoryRequest: class ForumCategoryRequest {}, PostStatus: {} }), { virtual: true });
jest.mock('../database/connection.js', () => ({ AppDataSource: { getRepository: () => repo } }));
jest.mock('../controllers/forum/ForumControllerBase.js', () => ({ ForumControllerBase: class {
  getForumContext() { return {}; }
  async isForumInServiceScope() { return true; }
} }));
import { ForumDirectoryController } from '../controllers/forum/ForumDirectoryController.js';
import { PUBLIC_READ_KEY } from '../services/community/community-public-read-metadata.js';
const id = '11111111-1111-4111-8111-111111111111';
const owner = 'fixture-owner';
const oldRow = { id, requesterId: owner, serviceCode: 'community:fixture', name: 'before', status: 'completed',
  metadata: { [PUBLIC_READ_KEY]: { mode: 'board', proof: 'old-proof' } } };
const currentRow = { ...oldRow, status: 'archived', metadata: { [PUBLIC_READ_KEY]: { mode: 'private' } } };
const repo = { findOne: jest.fn(), update: jest.fn(), save: jest.fn(), manager: { query: jest.fn() } };
function response() { const res: any = { json: jest.fn(), status: jest.fn() }; res.status.mockReturnValue(res); return res; }
beforeEach(() => {
  jest.clearAllMocks();
  repo.findOne.mockResolvedValueOnce(oldRow).mockResolvedValueOnce(currentRow);
});
it('owner description update preserves a concurrent operator revocation/archive and ignores injected metadata/status', async () => {
  const res = response();
  await new ForumDirectoryController().updateMyForum({ user: { id: owner }, params: { id },
    body: { description: 'new description', metadata: oldRow.metadata, status: 'completed' } } as any, res);
  expect(repo.update).toHaveBeenCalledWith({ id, requesterId: owner, serviceCode: oldRow.serviceCode }, { description: 'new description' });
  expect(repo.save).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith({ success: true, data: currentRow });
});
it('owner deletion request merges lifecycle keys without replaying the loaded public designation/status', async () => {
  const res = response();
  await new ForumDirectoryController().requestDeleteForum({ user: { id: owner }, params: { id }, body: { reason: 'fixture' } } as any, res);
  expect(repo.save).not.toHaveBeenCalled();
  const [sql, params] = repo.manager.query.mock.calls[0];
  expect(sql).not.toContain('status =');
  expect(JSON.parse(params[2])).toMatchObject({ deleteRequestStatus: 'pending', deleteRequestReason: 'fixture' });
  expect(JSON.parse(params[2])).not.toHaveProperty(PUBLIC_READ_KEY);
  expect(res.json).toHaveBeenCalledWith({ success: true, data: currentRow });
});
