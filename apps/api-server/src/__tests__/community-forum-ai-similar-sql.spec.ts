/**
 * WO-O4O-COMMUNITY-FORUM-AI-PHASE1-V1: the similar-post SQL as TypeORM really generates it, without a connection.
 * This checks the text and its bindings. It does not execute against PostgreSQL.
 */
import { DataSource, EntitySchema, SelectQueryBuilder } from 'typeorm';
import type { Request, Response } from 'express';

const post = new EntitySchema<Record<string, unknown>>({
  name: 'ForumPostSqlFixture',
  tableName: 'forum_post',
  columns: {
    id: { type: 'uuid', primary: true },
    title: { type: 'varchar' },
    slug: { type: 'varchar' },
    excerpt: { type: 'text', nullable: true },
    tags: { type: 'text', array: true, nullable: true },
    status: { type: 'varchar' },
    forumId: { name: 'forum_id', type: 'uuid', nullable: true },
    organizationId: { name: 'organization_id', type: 'uuid', nullable: true },
    createdAt: { name: 'created_at', type: 'timestamp' },
  },
});
const dataSource = new DataSource({ type: 'postgres', entities: [post] });
const boardQuery = jest.fn();

jest.mock('@o4o/forum-core/entities', () => ({
  ForumPost: class ForumPost {}, ForumPostLike: class ForumPostLike {},
  ForumCategoryRequest: class ForumCategoryRequest {}, ForumComment: class ForumComment {},
  PostStatus: { PUBLISHED: 'publish' },
}), { virtual: true });
jest.mock('../modules/auth/entities/User.js', () => ({ User: class User {} }));
jest.mock('../services/community/community-improvements.js', () => ({ IMPROVEMENT_SLUG: 'o4o-updates-improvements' }));
jest.mock('../services/community/community-forum-ai.service.js', () => ({ ForumAiError: class extends Error {} }));
jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    query: (...args: unknown[]) => boardQuery(...args),
    getRepository: () => dataSource.getRepository('ForumPostSqlFixture'),
  },
}));

import { ForumAiAssistController } from '../controllers/forum/ForumAiAssistController.js';

it('binds every keyword, keeps the community boundary, and orders by score then recency', async () => {
  await (dataSource as unknown as { buildMetadatas(): Promise<void> }).buildMetadatas();
  const board = '11111111-1111-4111-8111-111111111111';
  boardQuery.mockResolvedValue([{ id: board, name: '자유게시판', slug: 'free', description: '', forumType: 'open' }]);
  let captured: [string, unknown[]] | undefined;
  const raw = jest.spyOn(SelectQueryBuilder.prototype, 'getRawMany').mockImplementation(async function (this: SelectQueryBuilder<any>) {
    captured = this.getQueryAndParameters();
    return [];
  });

  const req = {
    query: { title: "약국 재고%' OR 1=1" },
    user: { id: 'author', roles: [] },
    forumContext: { communityKey: 'community', forumStorageCodes: ['community'], scope: 'community' },
  } as unknown as Request;
  const json = jest.fn();
  await new ForumAiAssistController().similar(req, { json, status: () => ({ json }) } as unknown as Response);
  raw.mockRestore();

  expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  const [sql, params] = captured!;
  expect(sql).toMatch(/ORDER BY "?score"? DESC, "post"\."created_at" DESC/);
  expect(sql).toMatch(/LIMIT 5/);
  expect(sql).toContain('"post"."title" ILIKE');
  expect(sql).toContain('"post"."forum_id" IN');
  expect(sql).toContain('_liveCommunityBoard');
  expect(sql).toContain('"post"."organization_id" IS NULL');
  expect(sql).toContain('"post"."status" =');
  // No request text in the SQL itself: it arrives only as escaped bound values.
  expect(sql).not.toContain('재고');
  expect(sql).not.toContain('1=1');
  expect(params).toEqual(expect.arrayContaining(['publish', board, '%약국%', '%재고%']));
  expect(params).not.toContain("%재고%' OR 1=1%");
});
