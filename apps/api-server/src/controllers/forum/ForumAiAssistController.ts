import type { Request, Response } from 'express';
import { PostStatus } from '@o4o/forum-core/entities';
import { AppDataSource } from '../../database/connection.js';
import { IMPROVEMENT_SLUG } from '../../services/community/community-improvements.js';
import {
  escapeLike,
  extractForumKeywords,
  FORUM_AI_PROMPT_BOARDS_MAX,
  FORUM_AI_TITLE_MAX,
  FORUM_SIMILAR_RESULT_MAX,
  validateComposeInput,
  type ForumAiBoard,
} from '../../services/community/community-forum-ai-policy.js';
import {
  ForumAiError,
  getForumAiStatus,
  requestForumComposeAssist,
  requestForumSimilarKeywords,
} from '../../services/community/community-forum-ai.service.js';
import logger from '../../utils/logger.js';
import { ForumControllerBase } from './ForumControllerBase.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOARD_SCAN_MAX = 100;
const EXCERPT_MAX = 120;
/** "Few results" threshold shown to the web, which then offers "더 찾기". The AI retry is never automatic. */
const ENOUGH_RESULTS = 3;

interface AccessibleBoard extends ForumAiBoard {
  slug: string;
}

/**
 * Community forum AI phase 1 (WO-O4O-COMMUNITY-FORUM-AI-PHASE1-V1).
 * Boundaries are the server-resolved forum context and checkClosedForumAccess; no request value widens them.
 */
export class ForumAiAssistController extends ForumControllerBase {
  /** Live boards of this community the caller may read. checkClosedForumAccess is the one closed-board rule. */
  private async accessibleBoards(req: Request): Promise<AccessibleBoard[]> {
    const codes = this.getContextForumCodes(this.getForumContext(req));
    if (!codes?.length) return [];
    const rows: Array<AccessibleBoard & { forumType: string | null }> = await AppDataSource.query(
      `SELECT id, name, slug, description, forum_type AS "forumType" FROM forum_category_requests
       WHERE service_code = ANY($1::text[]) AND status = 'completed' AND organization_id IS NULL
       ORDER BY created_at ASC LIMIT ${BOARD_SCAN_MAX}`,
      [codes],
    );
    const { userId, roles } = this.getUserFromReq(req);
    const allowed = await Promise.all(rows.map(async (row) =>
      row.forumType !== 'closed' || (await this.checkClosedForumAccess(row.id, userId, roles)).allowed));
    return rows.filter((_, i) => allowed[i]).map(({ id, name, slug, description }) => ({ id, name, slug, description }));
  }

  /** Same rule as createPost: readable boards minus the improvement board, which has its own write screen. */
  private async writableBoards(req: Request): Promise<AccessibleBoard[]> {
    return (await this.accessibleBoards(req)).filter((board) => board.slug !== IMPROVEMENT_SLUG);
  }

  /** Published posts on boards the caller may read, keyword matches first and recent ones ahead. No AI here. */
  private async searchSimilar(req: Request, keywords: readonly string[]) {
    if (!keywords.length) return [];
    const boards = await this.accessibleBoards(req);
    if (!boards.length) return [];
    const params: Record<string, string> = {};
    const titleScore: string[] = [];
    const matches: string[] = [];
    keywords.forEach((keyword, i) => {
      const name = `similarKeyword${i}`;
      params[name] = `%${escapeLike(keyword)}%`;
      const inTitle = `post.title ILIKE :${name}`;
      const inExcerpt = `post.excerpt ILIKE :${name}`;
      const inTags = `array_to_string(post.tags, ' ') ILIKE :${name}`;
      matches.push(`(${inTitle} OR ${inExcerpt} OR ${inTags})`);
      titleScore.push(`(CASE WHEN ${inTitle} THEN 3 WHEN ${inExcerpt} OR ${inTags} THEN 1 ELSE 0 END)`);
    });
    const recency = `(CASE WHEN post.createdAt >= NOW() - INTERVAL '30 days' THEN 2 WHEN post.createdAt >= NOW() - INTERVAL '180 days' THEN 1 ELSE 0 END)`;
    const qb = this.postRepository.createQueryBuilder('post')
      .select('post.id', 'id')
      .addSelect('post.title', 'title')
      .addSelect('post.slug', 'slug')
      .addSelect('post.excerpt', 'excerpt')
      .addSelect('post.forumId', 'forumId')
      .addSelect('post.createdAt', 'createdAt')
      .addSelect(`${titleScore.join(' + ')} + ${recency}`, 'score')
      .where('post.status = :similarStatus', { similarStatus: PostStatus.PUBLISHED })
      .andWhere('post.forumId IN (:...similarForumIds)', { similarForumIds: boards.map((board) => board.id) })
      .andWhere(`(${matches.join(' OR ')})`, params);
    this.applyContextFilter(qb, 'post', this.getForumContext(req));
    const rows: Array<{ id: string; title: string; slug: string; excerpt: string | null; forumId: string; createdAt: Date }> =
      await qb.orderBy('score', 'DESC').addOrderBy('post.createdAt', 'DESC').limit(FORUM_SIMILAR_RESULT_MAX).getRawMany();
    const names = new Map(boards.map((board) => [board.id, board.name]));
    return rows.map((row) => ({
      id: row.id, title: row.title, slug: row.slug,
      excerpt: (row.excerpt ?? '').slice(0, EXCERPT_MAX),
      forumId: row.forumId, forumName: names.get(row.forumId) ?? '', createdAt: row.createdAt,
    }));
  }

  private respond(res: Response, source: 'keyword' | 'ai', keywords: string[], posts: unknown[]): void {
    res.json({ success: true, data: { source, keywords, posts, enough: posts.length >= ENOUGH_RESULTS } });
  }

  private fail(res: Response, error: unknown, label: string): void {
    if (error instanceof ForumAiError) {
      res.status(error.status).json({ success: false, code: error.code, error: 'AI 도움을 사용할 수 없습니다.' });
      return;
    }
    logger.error(`[COMMUNITY_FORUM_AI] ${label} failed`, { message: (error as Error)?.message });
    res.status(500).json({ success: false, code: 'FORUM_AI_ASSIST_ERROR', error: 'AI 도움을 처리하지 못했습니다.' });
  }

  /** GET /forum/ai/status */
  async status(req: Request, res: Response): Promise<void> {
    res.json({ success: true, data: await getForumAiStatus(this.getUserFromReq(req).userId!) });
  }

  /** GET /forum/posts/similar?title= — keyword search only, never calls AI. */
  async similar(req: Request, res: Response): Promise<void> {
    try {
      const title = typeof req.query.title === 'string' ? req.query.title.trim() : '';
      if (title.length > FORUM_AI_TITLE_MAX) {
        res.status(400).json({ success: false, code: 'INPUT_TOO_LONG', error: '제목이 너무 깁니다.' });
        return;
      }
      const keywords = extractForumKeywords(title);
      this.respond(res, 'keyword', keywords, await this.searchSimilar(req, keywords));
    } catch (error) {
      this.fail(res, error, 'similar');
    }
  }

  /** POST /forum/ai/similar-search — "더 찾기". POST because it spends quota and writes the usage ledger. */
  async similarWithAi(req: Request, res: Response): Promise<void> {
    try {
      const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
      if (title.length < 2 || title.length > FORUM_AI_TITLE_MAX) {
        res.status(400).json({ success: false, code: title.length < 2 ? 'INPUT_REQUIRED' : 'INPUT_TOO_LONG', error: '제목을 확인해 주시기 바랍니다.' });
        return;
      }
      const keywords = await requestForumSimilarKeywords(title, this.getUserFromReq(req).userId!);
      this.respond(res, 'ai', keywords, await this.searchSimilar(req, keywords));
    } catch (error) {
      this.fail(res, error, 'similar-search');
    }
  }

  /** POST /forum/ai/compose-assist — runs only on the author's request; the result is returned and not stored. */
  async composeAssist(req: Request, res: Response): Promise<void> {
    try {
      const input = validateComposeInput(req.body ?? {});
      if (input.ok === false) {
        res.status(400).json({ success: false, code: input.code, error: '제목과 본문을 확인해 주시기 바랍니다.' });
        return;
      }
      const currentBoardId = req.body?.forumId;
      if (currentBoardId !== undefined && currentBoardId !== null && (typeof currentBoardId !== 'string' || !UUID.test(currentBoardId))) {
        res.status(400).json({ success: false, code: 'INVALID_FORUM_ID', error: '게시판을 확인해 주시기 바랍니다.' });
        return;
      }
      const boards = await this.writableBoards(req);
      if (currentBoardId && !boards.some((board) => board.id === currentBoardId)) {
        res.status(403).json({ success: false, code: 'FORUM_NOT_WRITABLE', error: '이 게시판에는 글을 쓸 수 없습니다.' });
        return;
      }
      const promptBoards = boards.slice(0, FORUM_AI_PROMPT_BOARDS_MAX).map(({ id, name, description }) => ({ id, name, description: (description ?? '').slice(0, EXCERPT_MAX) }));
      const data = await requestForumComposeAssist(
        { title: input.title, body: input.body, ...(currentBoardId ? { currentBoardId } : {}) },
        promptBoards,
        this.getUserFromReq(req).userId!,
      );
      res.json({ success: true, data });
    } catch (error) {
      this.fail(res, error, 'compose-assist');
    }
  }
}
