jest.mock('@o4o/forum-core/entities', () => ({
  ForumPost: class ForumPost {}, ForumPostLike: class ForumPostLike {},
  ForumCategoryRequest: class ForumCategoryRequest {}, ForumComment: class ForumComment {},
}), { virtual: true });
jest.mock('../modules/auth/entities/User.js', () => ({ User: class User {} }));
jest.mock('../database/connection.js', () => ({ AppDataSource: { query: jest.fn() } }));
jest.mock('../services/community/community-workspace.service.js', () => ({ resolveCommunityWorkspace: jest.fn() }));

import { AppDataSource } from '../database/connection.js';
import { resolveCommunityWorkspace } from '../services/community/community-workspace.service.js';
import { ForumControllerBase } from '../controllers/forum/ForumControllerBase.js';

class Access extends ForumControllerBase {
  read(userId = 'operator', roles: string[] = ['community:operator']) {
    return this.checkClosedForumAccess('board', userId, roles);
  }
  moderate(roles: string[] = ['community:operator']) {
    return this.hasForumModerationOverride('board', roles, 'operator');
  }
}
const query = AppDataSource.query as jest.Mock;
const workspace = resolveCommunityWorkspace as jest.Mock;
let storageCode: string;
beforeEach(() => {
  jest.resetAllMocks();
  query.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM forum_category_requests')) return [{ id: 'board', forum_type: 'closed', requester_id: 'another-user', service_code: storageCode }];
    if (sql.includes('FROM semi_franchises')) return [{ key: 'other-business' }];
    return [];
  });
});

describe.each(['kpa-society', 'pharmacy-hub'])('independent pharmacist community: %s', code => {
  beforeEach(() => { storageCode = code; });
  it('allows its active community operator to read and moderate a member-created closed board', async () => {
    workspace.mockResolvedValue({ allowed: true, canManage: true });
    expect(await new Access().read()).toEqual({ allowed: true, forumType: 'closed' });
    expect(await new Access().moderate()).toBe(true);
    expect(workspace).toHaveBeenCalledWith(AppDataSource, { id: 'operator', roles: ['community:operator'] }, 'pharmacy');
  });
  it.each([{ allowed: true, canManage: false }, { allowed: false, canManage: false }, undefined])('does not grant closed-board moderation to a member or unavailable workspace: %p', async result => {
    workspace.mockResolvedValue(result);
    expect(await new Access().read()).toEqual({ allowed: false, forumType: 'closed' });
    expect(await new Access().moderate()).toBe(false);
  });
  it('does not grant another service operator an override', async () => {
    workspace.mockResolvedValue({ allowed: true, canManage: false });
    expect(await new Access().moderate(['neture:operator'])).toBe(false);
  });
});

it('does not use historical service roles as a fallback for a UUID business workspace', async () => {
  storageCode = 'sf:00000000-0000-0000-0000-000000000001';
  workspace.mockResolvedValue({ allowed: false, canManage: false });
  expect(await new Access().moderate(['kpa:operator', 'neture:operator'])).toBe(false);
  expect(workspace).toHaveBeenCalledWith(AppDataSource, expect.anything(), 'other-business');
});
