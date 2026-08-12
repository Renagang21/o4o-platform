/**
 * BranchSiteController — 분회 홈페이지 (고정 템플릿) + 공지/자료실
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §5
 *
 * 1차 범위: 로고 / 이름 / 소개 / 연락처 / 공지 / 자료실 / 관리자 글쓰기.
 * 페이지 빌더(블록·레이아웃 편집)는 범위 밖이다 — template 은 'classic' 고정이다.
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { BranchSite } from '../../routes/kpa-branch/entities/branch-site.entity.js';
import { BranchPost } from '../../routes/kpa-branch/entities/branch-post.entity.js';
import { KpaOrganization } from '../../routes/kpa-branch/entities/kpa-organization.entity.js';

function serializeSite(site: BranchSite | null, org: KpaOrganization) {
  return {
    organizationId: org.id,
    slug: org.slug,
    branchName: org.name,
    title: site?.title ?? org.name,
    tagline: site?.tagline ?? null,
    logoUrl: site?.logo_url ?? null,
    intro: site?.intro ?? null,
    contact: site?.contact ?? { phone: org.phone ?? undefined, address: org.address ?? undefined },
    template: site?.template ?? 'classic',
    isPublished: site?.is_published ?? false,
  };
}

function serializePost(p: BranchPost) {
  return {
    id: p.id,
    category: p.category,
    title: p.title,
    content: p.content,
    attachments: p.attachments,
    isPinned: p.is_pinned,
    status: p.status,
    publishedAt: p.published_at,
    viewCount: p.view_count,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

export class BranchSiteController {
  /** GET /branches/:branchSlug/site — 공개 홈페이지. 미게시면 404. */
  static async publicSite(req: Request, res: Response) {
    const org = await AppDataSource.getRepository(KpaOrganization).findOneOrFail({
      where: { id: req.branch!.id },
    });
    const site = await AppDataSource.getRepository(BranchSite).findOne({
      where: { organization_id: org.id },
    });
    if (!site || !site.is_published) {
      return res.status(404).json({
        success: false,
        error: '아직 공개되지 않은 분회 홈페이지입니다.',
        code: 'BRANCH_SITE_NOT_PUBLISHED',
      });
    }
    return res.json({ success: true, data: serializeSite(site, org) });
  }

  /** GET /branches/:branchSlug/posts?category=notice — 공개 글 목록 */
  static async publicPosts(req: Request, res: Response) {
    const category = req.query.category as 'notice' | 'resource' | undefined;
    const qb = AppDataSource.getRepository(BranchPost)
      .createQueryBuilder('p')
      .where('p.organization_id = :orgId', { orgId: req.branch!.id })
      .andWhere('p.status = :status', { status: 'published' });
    if (category) qb.andWhere('p.category = :category', { category });
    const [items, total] = await qb
      .orderBy('p.is_pinned', 'DESC')
      .addOrderBy('p.published_at', 'DESC')
      .take(Math.min(Number(req.query.limit ?? 20), 100))
      .skip(Number(req.query.offset ?? 0))
      .getManyAndCount();
    return res.json({ success: true, data: { items: items.map(serializePost), total } });
  }

  /** GET /branches/:branchSlug/operator/site — 운영자용 (미게시 포함) */
  static async operatorSite(req: Request, res: Response) {
    const org = await AppDataSource.getRepository(KpaOrganization).findOneOrFail({
      where: { id: req.branch!.id },
    });
    const site = await AppDataSource.getRepository(BranchSite).findOne({
      where: { organization_id: org.id },
    });
    return res.json({ success: true, data: serializeSite(site, org) });
  }

  /** PUT /branches/:branchSlug/operator/site — upsert. template 는 고정이므로 받지 않는다. */
  static async upsertSite(req: Request, res: Response) {
    const orgId = req.branch!.id;
    const repo = AppDataSource.getRepository(BranchSite);
    const org = await AppDataSource.getRepository(KpaOrganization).findOneOrFail({ where: { id: orgId } });
    const { title, tagline, logoUrl, intro, contact, isPublished } = req.body ?? {};

    let site = await repo.findOne({ where: { organization_id: orgId } });
    if (!site) {
      site = repo.create({ organization_id: orgId, title: title || org.name, template: 'classic' });
    }
    if (title !== undefined) site.title = title;
    if (tagline !== undefined) site.tagline = tagline;
    if (logoUrl !== undefined) site.logo_url = logoUrl;
    if (intro !== undefined) site.intro = intro;
    if (contact !== undefined) site.contact = contact;
    if (isPublished !== undefined) site.is_published = Boolean(isPublished);

    const saved = await repo.save(site);
    return res.json({ success: true, data: serializeSite(saved, org) });
  }

  /** GET /branches/:branchSlug/operator/posts — draft 포함 */
  static async operatorPosts(req: Request, res: Response) {
    const category = req.query.category as 'notice' | 'resource' | undefined;
    const qb = AppDataSource.getRepository(BranchPost)
      .createQueryBuilder('p')
      .where('p.organization_id = :orgId', { orgId: req.branch!.id });
    if (category) qb.andWhere('p.category = :category', { category });
    const [items, total] = await qb
      .orderBy('p.created_at', 'DESC')
      .take(Math.min(Number(req.query.limit ?? 50), 200))
      .skip(Number(req.query.offset ?? 0))
      .getManyAndCount();
    return res.json({ success: true, data: { items: items.map(serializePost), total } });
  }

  /** POST /branches/:branchSlug/operator/posts */
  static async createPost(req: Request, res: Response) {
    const { category, title, content, attachments, isPinned, status } = req.body ?? {};
    if (!title) {
      return res.status(400).json({ success: false, error: 'title은 필수입니다.', code: 'INVALID_INPUT' });
    }
    const repo = AppDataSource.getRepository(BranchPost);
    const post = repo.create({
      organization_id: req.branch!.id,
      category: category === 'resource' ? 'resource' : 'notice',
      title,
      content: content ?? '',
      attachments: Array.isArray(attachments) ? attachments : [],
      is_pinned: Boolean(isPinned),
      status: status === 'published' ? 'published' : 'draft',
      published_at: status === 'published' ? new Date() : null,
      author_user_id: (req as any).user.id,
    });
    const saved = await repo.save(post);
    return res.status(201).json({ success: true, data: serializePost(saved) });
  }

  /** PATCH /branches/:branchSlug/operator/posts/:postId */
  static async updatePost(req: Request, res: Response) {
    const repo = AppDataSource.getRepository(BranchPost);
    // 분회 경계 강제: postId 단독 조회 금지 (Boundary Guard Rule 1)
    const post = await repo.findOne({
      where: { id: req.params.postId, organization_id: req.branch!.id },
    });
    if (!post) {
      return res.status(404).json({ success: false, error: '글을 찾을 수 없습니다.', code: 'BRANCH_POST_NOT_FOUND' });
    }
    const { category, title, content, attachments, isPinned, status } = req.body ?? {};
    if (category !== undefined) post.category = category === 'resource' ? 'resource' : 'notice';
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (attachments !== undefined) post.attachments = Array.isArray(attachments) ? attachments : [];
    if (isPinned !== undefined) post.is_pinned = Boolean(isPinned);
    if (status !== undefined) {
      post.status = status === 'published' ? 'published' : 'draft';
      if (post.status === 'published' && !post.published_at) post.published_at = new Date();
    }
    const saved = await repo.save(post);
    return res.json({ success: true, data: serializePost(saved) });
  }

  /** DELETE /branches/:branchSlug/operator/posts/:postId — soft delete */
  static async deletePost(req: Request, res: Response) {
    const repo = AppDataSource.getRepository(BranchPost);
    const post = await repo.findOne({
      where: { id: req.params.postId, organization_id: req.branch!.id },
    });
    if (!post) {
      return res.status(404).json({ success: false, error: '글을 찾을 수 없습니다.', code: 'BRANCH_POST_NOT_FOUND' });
    }
    await repo.softDelete(post.id);
    return res.json({ success: true, data: { id: post.id } });
  }
}
