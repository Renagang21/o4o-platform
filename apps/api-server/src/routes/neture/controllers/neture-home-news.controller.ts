/**
 * Neture 대표 홈 「O4O 서비스 소식」 최신 글 API
 *
 * WO-O4O-NETURE-HOME-SERVICE-NEWS-FORUM-V1
 *
 * `GET /api/v1/neture/home/news?limit=5` — 대표 홈(neture.co.kr)이 「O4O 서비스 소식」
 * 포럼의 최신 글 N 건(기본 5 · 최대 10)을 **읽기 전용**으로 가져온다.
 *
 * 왜 기존 `/neture/forum/posts` 를 그대로 쓰지 않는가:
 *   - 기존 목록의 `sortBy=latest` 는 고정글(is_pinned) 을 먼저 두므로 WO 가 요구하는
 *     "게시일 내림차순" 과 다르다.
 *   - 포럼을 표시 이름이 아니라 **slug 상수**로 고정해 서버가 해석해야 한다. 홈이 포럼 목록을
 *     한 번 더 조회해 이름으로 고르는 방식은 불안정하다.
 *   기존 테이블(`forum_category_requests` · `forum_posts`)만 읽는다. 새 게시판 · 새 테이블 없음.
 *
 * 노출 규칙(서버에서 배제):
 *   - 포럼: `service_code='neture'` + `status='completed'` + `forum_type='open'` 인 것만.
 *     닫힌 포럼으로 바뀌면 이 API 는 `forum: null` 을 돌려주고 글을 노출하지 않는다
 *     (홈은 로그인 전에도 이 목록을 보여주므로 공개 포럼만 허용).
 *   - 글: `status='publish'` 만 (draft · pending · rejected · archived(삭제) 제외),
 *     커뮤니티 scope 와 동일하게 `organization_id IS NULL` 만.
 *   - 정렬: `COALESCE(published_at, created_at) DESC` — 고정글 우선 없음.
 * 인증 불필요 — 공개 포럼의 공개 글만 돌려주므로 요청자 정보를 쓰지 않는다.
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { asyncHandler } from '../../../middleware/error-handler.js';

/**
 * 「O4O 서비스 소식」 포럼 slug — 프로덕션 `forum_category_requests.slug`.
 * 포럼은 기존 신청→승인 절차로 2026-09-15 생성했으며 slug 는 생성 시 확정된 값이다.
 * 환경별로 다른 포럼을 가리켜야 하면 `NETURE_SERVICE_NEWS_FORUM_SLUG` 로 덮어쓴다.
 */
export const NETURE_SERVICE_NEWS_FORUM_SLUG_DEFAULT = 'o4o-서비스-소식-mu1x8n1s';

export function resolveNetureServiceNewsForumSlug(): string {
  const fromEnv = process.env.NETURE_SERVICE_NEWS_FORUM_SLUG?.trim();
  return fromEnv || NETURE_SERVICE_NEWS_FORUM_SLUG_DEFAULT;
}

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;

export interface HomeNewsForum {
  id: string;
  slug: string;
  name: string;
}

export interface HomeNewsPost {
  id: string;
  slug: string;
  title: string;
  tags: string[];
  /** 게시일 — published_at 이 없으면 created_at */
  publishedAt: string;
}

export interface HomeNewsResponse {
  /** null = 소식 포럼이 없거나 공개 상태가 아님 → 홈은 "아직 소식이 없습니다" 로 처리 */
  forum: HomeNewsForum | null;
  posts: HomeNewsPost[];
}

export function parseHomeNewsLimit(raw: unknown): number {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

export function createNetureHomeNewsController(dataSource: DataSource): Router {
  const router = Router();

  router.get(
    '/news',
    asyncHandler(async (req: Request, res: Response) => {
      const limit = parseHomeNewsLimit(req.query.limit);
      const slug = resolveNetureServiceNewsForumSlug();

      const [forum]: Array<{ id: string; slug: string; name: string }> = await dataSource.query(
        `SELECT id, slug, name
           FROM forum_category_requests
          WHERE slug = $1
            AND service_code = 'neture'
            AND status = 'completed'
            AND forum_type = 'open'
          LIMIT 1`,
        [slug],
      );

      if (!forum) {
        const empty: HomeNewsResponse = { forum: null, posts: [] };
        return res.json({ success: true, data: empty });
      }

      const rows: Array<{
        id: string;
        slug: string;
        title: string;
        tags: string[] | null;
        published_at: Date | string;
      }> = await dataSource.query(
        `SELECT id, slug, title, tags,
                COALESCE(published_at, created_at) AS published_at
           FROM forum_posts
          WHERE forum_id = $1
            AND status = 'publish'
            AND organization_id IS NULL
          ORDER BY COALESCE(published_at, created_at) DESC, id DESC
          LIMIT $2`,
        [forum.id, limit],
      );

      const data: HomeNewsResponse = {
        forum: { id: forum.id, slug: forum.slug, name: forum.name },
        posts: rows.map((r) => ({
          id: r.id,
          slug: r.slug,
          title: r.title,
          tags: Array.isArray(r.tags) ? r.tags : [],
          publishedAt: new Date(r.published_at).toISOString(),
        })),
      };

      return res.json({ success: true, data });
    }),
  );

  return router;
}
