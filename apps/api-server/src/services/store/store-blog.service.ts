/**
 * Store Blog Service — 매장 블로그(store_blog_posts) 저작·관리 공통 로직
 *
 * WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1 (B안 — service 함수 추출)
 * 원본: routes/o4o-store/controllers/blog.controller.ts (WO-STORE-BLOG-CHANNEL-V1 외)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 추출하는가
 *   공통 blog.controller 는 매장을 **slug**(platform_store_slugs → OrganizationStore)로
 *   찾고, 소유 확인도 서비스별로 갈린다(KPA=role_assignments / 그 외=created_by_user_id).
 *   Pharmacy-Hub 는 enrollment 기준 resolvePharmacyHubStoreOrganization() 으로 조직을 정하므로
 *   slug 경유가 필요 없다. 조직 결정만 서비스 경계별로 하고, 저작 로직은 공유한다.
 *
 * 계약
 *   - 인증·조직 결정·소유 확인을 하지 않는다. storeId 는 호출자가 해석해서 넘긴다.
 *   - storeId = organizations.id (store_blog_posts.store_id 실측 정합, FK 없음).
 *   - 소유 경계는 (store_id, service_key) 다.
 *   - 검증 실패는 예외가 아니라 결과 객체로 돌려준다.
 *   - 응답 envelope 은 만들지 않는다.
 */

import type { DataSource } from 'typeorm';
import { StoreBlogPost } from '../../routes/glycopharm/entities/store-blog-post.entity.js';
import type { StoreBlogPostStatus } from '../../routes/glycopharm/entities/store-blog-post.entity.js';
import { recordDerivations } from '../../routes/o4o-store/services/store-asset-derivation.service.js';

export interface BlogFailure {
  ok: false;
  status: number;
  code: string;
  message: string;
}

export type BlogResult<T> = { ok: true; data: T } | BlogFailure;

const POST_NOT_FOUND: BlogFailure = {
  ok: false,
  status: 404,
  code: 'POST_NOT_FOUND',
  message: 'Blog post not found',
};

const SLUG_CONFLICT: BlogFailure = {
  ok: false,
  status: 409,
  code: 'SLUG_CONFLICT',
  message: 'A post with this slug already exists',
};

export const BLOG_STATUSES = ['draft', 'published', 'archived'] as const;

/**
 * Generate URL-friendly slug from title.
 * Keeps Korean characters (URL-encoded by browser), strips special chars.
 */
export function generateBlogSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w가-힯ᄀ-ᇿ㄰-㆏\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 140);
}

export interface ListStoreBlogParams {
  page?: unknown;
  limit?: unknown;
  status?: unknown;
}

export interface ListStoreBlogResult {
  posts: StoreBlogPost[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** GET staff — 전체 게시글 목록 (draft 포함) */
export async function listStoreBlogPosts(
  dataSource: DataSource,
  storeId: string,
  serviceKey: string,
  params: ListStoreBlogParams,
): Promise<ListStoreBlogResult> {
  const repo = dataSource.getRepository(StoreBlogPost);

  const page = Math.max(1, parseInt(params.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(params.limit as string) || 20));
  const statusFilter = params.status as string | undefined;

  const where: any = { storeId, serviceKey };
  if (statusFilter && (BLOG_STATUSES as readonly string[]).includes(statusFilter)) {
    where.status = statusFilter;
  }

  const [posts, total] = await repo.findAndCount({
    where,
    order: { updatedAt: 'DESC' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return { posts, page, limit, total, totalPages: Math.ceil(total / limit) };
}

/** GET staff 상세 — 매장 소유 게시글 단건 (draft 포함) */
export async function getStoreBlogPost(
  dataSource: DataSource,
  storeId: string,
  id: string,
): Promise<BlogResult<StoreBlogPost>> {
  const repo = dataSource.getRepository(StoreBlogPost);
  const post = await repo.findOne({ where: { id, storeId } });
  if (!post) return POST_NOT_FOUND;
  return { ok: true, data: post };
}

export interface CreateStoreBlogInput {
  title?: unknown;
  content?: unknown;
  excerpt?: unknown;
  slug?: unknown;
  /** 원본(source)→blog_post 관계 기록용 (선택) */
  sourceItems?: unknown;
}

/** POST staff — 게시글 생성 (status='draft') */
export async function createStoreBlogPost(
  dataSource: DataSource,
  storeId: string,
  serviceKey: string,
  userId: string | null,
  body: CreateStoreBlogInput,
): Promise<BlogResult<StoreBlogPost>> {
  const repo = dataSource.getRepository(StoreBlogPost);
  const { title, content, excerpt, slug: postSlug, sourceItems } = body ?? {};

  if (!title || !content) {
    return {
      ok: false,
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'title and content are required',
    };
  }

  const finalSlug = (postSlug as string) || generateBlogSlug(String(title));

  // 매장 내 slug 유일성 (idx_store_blog_store_slug)
  const existing = await repo.findOne({ where: { storeId, slug: finalSlug } });
  if (existing) return SLUG_CONFLICT;

  const post = repo.create({
    storeId,
    serviceKey,
    title: String(title),
    slug: finalSlug,
    excerpt: (excerpt as string) || String(content).substring(0, 200),
    content: String(content),
    status: 'draft' as StoreBlogPostStatus,
  });

  const saved = await repo.save(post);

  // WO-KPA-STORE-ASSET-DERIVATION-BLOG-WRITEPATH-V1:
  //   원본(source)→blog_post 관계 best-effort 기록. sourceItems 미전달 시 미기록.
  //   실패해도 블로그 생성 응답을 막지 않는다(보조 트래킹).
  if (Array.isArray(sourceItems) && sourceItems.length > 0) {
    try {
      await recordDerivations(dataSource, {
        serviceKey,
        organizationId: storeId,
        createdBy: userId ?? null,
        derivedKind: 'blog_post',
        derivedId: saved.id,
        derivedTitle: saved.title,
        sources: sourceItems
          .filter((s: any) => s && s.id && s.kind)
          .map((s: any) => ({ kind: s.kind, id: s.id, title: s.title ?? null })),
      });
    } catch (derivationErr) {
      console.error('[store-blog] derivation record failed (non-blocking)', derivationErr);
    }
  }

  return { ok: true, data: saved };
}

export interface UpdateStoreBlogInput {
  title?: unknown;
  content?: unknown;
  excerpt?: unknown;
  slug?: unknown;
}

/** PUT staff — 게시글 수정 */
export async function updateStoreBlogPost(
  dataSource: DataSource,
  storeId: string,
  id: string,
  body: UpdateStoreBlogInput,
): Promise<BlogResult<StoreBlogPost>> {
  const repo = dataSource.getRepository(StoreBlogPost);
  const { title, content, excerpt, slug: postSlug } = body ?? {};

  const post = await repo.findOne({ where: { id, storeId } });
  if (!post) return POST_NOT_FOUND;

  if (postSlug && postSlug !== post.slug) {
    const existing = await repo.findOne({ where: { storeId, slug: postSlug as string } });
    if (existing) return SLUG_CONFLICT;
    post.slug = postSlug as string;
  }

  if (title) post.title = String(title);
  if (content) post.content = String(content);
  if (excerpt !== undefined) post.excerpt = excerpt as string;

  const saved = await repo.save(post);
  return { ok: true, data: saved };
}

/** PATCH staff — 발행 */
export async function publishStoreBlogPost(
  dataSource: DataSource,
  storeId: string,
  id: string,
): Promise<BlogResult<StoreBlogPost>> {
  const repo = dataSource.getRepository(StoreBlogPost);

  const post = await repo.findOne({ where: { id, storeId } });
  if (!post) return POST_NOT_FOUND;

  if (post.status === 'published') {
    return {
      ok: false,
      status: 400,
      code: 'ALREADY_PUBLISHED',
      message: 'Post is already published',
    };
  }

  post.status = 'published';
  post.publishedAt = new Date();
  const saved = await repo.save(post);
  return { ok: true, data: saved };
}

/** PATCH staff — 보관 */
export async function archiveStoreBlogPost(
  dataSource: DataSource,
  storeId: string,
  id: string,
): Promise<BlogResult<StoreBlogPost>> {
  const repo = dataSource.getRepository(StoreBlogPost);

  const post = await repo.findOne({ where: { id, storeId } });
  if (!post) return POST_NOT_FOUND;

  post.status = 'archived';
  const saved = await repo.save(post);
  return { ok: true, data: saved };
}

/** DELETE staff — 물리 삭제 (원본 동작 유지) */
export async function deleteStoreBlogPost(
  dataSource: DataSource,
  storeId: string,
  id: string,
): Promise<BlogResult<{ id: string; deleted: true }>> {
  const repo = dataSource.getRepository(StoreBlogPost);

  const post = await repo.findOne({ where: { id, storeId } });
  if (!post) return POST_NOT_FOUND;

  await repo.remove(post);
  return { ok: true, data: { id, deleted: true } };
}
