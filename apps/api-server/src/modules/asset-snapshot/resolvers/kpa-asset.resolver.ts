/**
 * KPA Asset Resolver
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 * WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1: lesson type 추가 (Reference Metadata 방식)
 * WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1: content type 추가
 *   (kpa_contents 콘텐츠 허브 → 자료함 Full Copy 경로)
 * WO-O4O-CMS-CONTENT-REUSABLE-POLICY-ALIGN-V1: resolveContent 에 reusable_policy 검증 추가
 * WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1: resource type 추가
 *   (kpa_contents sub_type='resource' 자료실 → 자료함 Full Copy 경로)
 *
 * Resolves KPA community CMS, Signage, LMS Course, KPA Content, KPA Resource assets
 * into the standard ResolvedContent format.
 */

import { DataSource } from 'typeorm';
import { CmsContent } from '@o4o-apps/cms-core/entities';
import { Course, CourseStatus, CourseReusablePolicy } from '@o4o/lms-core';
import type { ContentResolver, ResolvedContent } from '@o4o/asset-copy-core';

export class KpaAssetResolver implements ContentResolver {
  constructor(private dataSource: DataSource) {}

  async resolve(sourceAssetId: string, assetType: string): Promise<ResolvedContent | null> {
    if (assetType === 'cms') {
      return this.resolveCms(sourceAssetId);
    }
    if (assetType === 'signage') {
      return this.resolveSignage(sourceAssetId);
    }
    if (assetType === 'lesson') {
      return this.resolveLesson(sourceAssetId);
    }
    if (assetType === 'content') {
      return this.resolveContent(sourceAssetId);
    }
    if (assetType === 'resource') {
      return this.resolveResource(sourceAssetId);
    }
    if (assetType === 'blog') {
      return this.resolveBlog(sourceAssetId);
    }
    if (assetType === 'pop') {
      return this.resolvePop(sourceAssetId);
    }
    return null;
  }

  /**
   * WO-O4O-KPA-POP-OPERATOR-PUBLISHING-V1 Phase 1 Backend Foundation (2026-05-24)
   *
   * Phase 1 — placeholder. 항상 null 반환.
   *
   * store_pops entity 는 신설됐으나 (Option C — IR-O4O-KPA-POP-STRUCTURE-AND-MENU-AUDIT-V1)
   * 실 resolver 구현 (id + author_role='operator' AND status='published' 조건 + contentJson
   * full copy) 은 Phase 2 후속. Blog 의 resolveBlog 패턴 mirror 예정.
   *
   * 본 단계는 assetType='pop' 호출이 allowedAssetTypes 통과 후 resolver 분기까지 도달하되
   * 항상 null 반환 → AssetCopyService 가 SOURCE_NOT_FOUND 로 처리. 매장 사본 생성 안 됨.
   */
  private async resolvePop(_id: string): Promise<ResolvedContent | null> {
    return null;
  }

  /**
   * WO-O4O-OPERATOR-BLOG-PUBLISHING-BACKEND-QUERY-V1 (2026-05-23)
   *
   * Phase 2 — 운영자 HUB 게시 블로그를 매장 자료함으로 가져가기 위한 source resolver.
   *
   * 통과 조건:
   *   - author_role = 'operator'  (매장 직접 작성 블로그는 본 resolver 대상 아님)
   *   - status = 'published'      (draft/archived 차단)
   *
   * 차단:
   *   - author_role = 'store'  → 매장 직접 작성 블로그는 매장 전용, HUB 자료함 가져가기 대상 아님
   *   - status ≠ 'published'   → 비공개 상태 블로그 차단
   *
   * service_key 정합 (cross-service 노출 차단) 은 listing 단 (HubContentQueryService.queryBlog)
   * 에서 처리한다. ContentResolver 인터페이스가 (sourceAssetId, assetType) 만 받으므로
   * resolver 레벨 service_key 검증은 인터페이스 확장이 필요 — 별도 WO 대상.
   * 다른 resolver (resolveCms / resolveSignage 등) 도 동일 패턴.
   *
   * Full Copy — 블로그 본문 / 메타데이터를 contentJson 에 담아 자료함에 보존한다.
   */
  private async resolveBlog(id: string): Promise<ResolvedContent | null> {
    const rows = await this.dataSource.query(
      `SELECT id, title, slug, excerpt, content, status, author_role,
              published_at, created_at, service_key, store_id
       FROM store_blog_posts
       WHERE id = $1
         AND author_role = 'operator'
         AND status = 'published'
       LIMIT 1`,
      [id],
    );
    if (!rows || rows.length === 0) return null;
    const b = rows[0];

    return {
      title: b.title,
      type: 'blog',
      sourceService: 'kpa',
      contentJson: {
        title: b.title,
        slug: b.slug,
        excerpt: b.excerpt,
        content: b.content,
        authorRole: b.author_role,
        publishedAt:
          b.published_at instanceof Date ? b.published_at.toISOString() : b.published_at,
        sourceServiceKey: b.service_key,
        sourceStoreId: b.store_id,
        capturedAt: new Date().toISOString(),
      },
    };
  }

  private async resolveCms(id: string): Promise<ResolvedContent | null> {
    const repo = this.dataSource.getRepository(CmsContent);
    const content = await repo.findOne({ where: { id } });
    if (!content) return null;

    return {
      title: content.title,
      type: 'cms',
      sourceService: 'kpa',
      contentJson: {
        title: content.title,
        type: content.type,
        summary: content.summary,
        body: content.body,
        imageUrl: content.imageUrl,
        linkUrl: content.linkUrl,
        linkText: content.linkText,
        metadata: content.metadata,
      },
    };
  }

  /**
   * WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1
   *
   * Reference Metadata 방식 — 강의 본문/lesson body/video URL은 복사하지 않는다.
   * 매장이 자료함에 가져갈 수 있는 강의는 다음 조건을 모두 만족해야 한다:
   *   1. status === 'published'  (DRAFT/PENDING_REVIEW/REJECTED/ARCHIVED는 차단)
   *   2. reusable_policy !== 'restricted'  (강사가 명시적 허용)
   *
   * 위 조건 미충족 시 null 반환 → AssetCopyService가 NotFound 또는 Forbidden으로 처리.
   * lesson_count 는 lms_lessons 테이블에서 별도 집계 (lightweight count, body 미포함).
   */
  private async resolveLesson(id: string): Promise<ResolvedContent | null> {
    const repo = this.dataSource.getRepository(Course);
    const course = await repo.findOne({
      where: { id },
      relations: ['instructor'],
    });
    if (!course) return null;

    // Gate 1 — published 강의만 자료함 노출 가능
    if (course.status !== CourseStatus.PUBLISHED) return null;

    // Gate 2 — reusable_policy 검증 (restricted는 가져가기 차단)
    if (course.reusablePolicy === CourseReusablePolicy.RESTRICTED) return null;

    // Lightweight lesson count (body 조회 없이 row count만)
    const [{ count }] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS count FROM "lms_lessons" WHERE "courseId" = $1`,
      [id],
    );

    const description = course.description ?? '';
    const summary = description.length > 200 ? `${description.slice(0, 200)}…` : description;
    const instructorName =
      (course as any).instructor?.name ??
      (course as any).instructor?.fullName ??
      (course as any).instructor?.email ??
      null;

    return {
      title: course.title,
      type: 'lesson',
      sourceService: 'kpa',
      contentJson: {
        // Reference Metadata만 — lesson body / quiz / video content 미포함
        courseId: course.id,
        title: course.title,
        thumbnail: course.thumbnail ?? null,
        summary,
        lessonCount: count ?? 0,
        instructorName,
        contentKind: course.contentKind,
        visibility: course.visibility,
        publicUrl: `/lms/course/${course.id}`,
        sourceService: 'kpa',
        capturedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1
   * WO-O4O-CMS-CONTENT-REUSABLE-POLICY-ALIGN-V1: reusable_policy 검증 추가
   *
   * KPA 콘텐츠 허브(`kpa_contents`)의 문서형/코스형 콘텐츠를 매장 자료함으로 Full Copy.
   * 콘텐츠 본문(body / blocks)이 자료함에서 직접 사용되어 POP/QR/블로그 제작에 활용된다.
   *
   * Gates:
   *   1. is_deleted = false  (삭제된 콘텐츠 차단)
   *   2. reusable_policy ≠ 'restricted'  (제작자 명시적 차단)
   * 위 조건 미충족 시 null 반환 → AssetCopyService 가 SOURCE_NOT_FOUND 로 처리.
   *
   * status 게이트는 운영자가 작성한 콘텐츠도 매장이 가져갈 수 있어야 하므로 본 단계에서는
   * 적용하지 않는다.
   */
  private async resolveContent(id: string): Promise<ResolvedContent | null> {
    const rows = await this.dataSource.query(
      `SELECT id, title, summary, body, blocks, tags, category, status,
              content_type, sub_type, source_type, source_url, source_file_name,
              thumbnail_url, author_name, reusable_policy
       FROM kpa_contents
       WHERE id = $1 AND is_deleted = false
       LIMIT 1`,
      [id],
    );
    if (!rows || rows.length === 0) return null;
    const c = rows[0];

    // Gate 2 — reusable_policy 검증 (restricted 는 가져가기 차단)
    if (c.reusable_policy === 'restricted') return null;

    return {
      title: c.title,
      type: 'content',
      sourceService: 'kpa',
      contentJson: {
        title: c.title,
        summary: c.summary,
        body: c.body,
        blocks: c.blocks,
        tags: c.tags,
        category: c.category,
        contentType: c.content_type,
        subType: c.sub_type,
        sourceType: c.source_type,
        sourceUrl: c.source_url,
        sourceFileName: c.source_file_name,
        thumbnailUrl: c.thumbnail_url,
        authorName: c.author_name,
        capturedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1
   *
   * KPA 자료실(`kpa_contents` WHERE sub_type='resource')의 파일/외부링크/문서 자료를
   * 매장 자료함으로 Full Copy. 자료실은 콘텐츠 허브와 동일 테이블을 공유하지만 sub_type
   * 으로 분리되며, 자료함 자료 탭(StoreLibraryResourcesPage)에서 제작 시작 진입점이 된다.
   *
   * Gates:
   *   1. is_deleted = false  (삭제된 자료 차단)
   *   2. sub_type = 'resource'  (콘텐츠 허브 항목이 resource 로 잘못 가져가지지 않도록 강제)
   *   3. reusable_policy ≠ 'restricted'  (제작자 명시적 차단)
   * 위 조건 미충족 시 null 반환 → AssetCopyService 가 SOURCE_NOT_FOUND 로 처리.
   */
  private async resolveResource(id: string): Promise<ResolvedContent | null> {
    const rows = await this.dataSource.query(
      `SELECT id, title, summary, body, blocks, tags, category, status,
              content_type, sub_type, source_type, source_url, source_file_name,
              usage_type, thumbnail_url, author_name, reusable_policy
       FROM kpa_contents
       WHERE id = $1 AND is_deleted = false AND sub_type = 'resource'
       LIMIT 1`,
      [id],
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];

    if (r.reusable_policy === 'restricted') return null;

    return {
      title: r.title,
      type: 'resource',
      sourceService: 'kpa',
      contentJson: {
        title: r.title,
        summary: r.summary,
        body: r.body,
        blocks: r.blocks,
        tags: r.tags,
        category: r.category,
        contentType: r.content_type,
        subType: r.sub_type,
        sourceType: r.source_type,
        sourceUrl: r.source_url,
        sourceFileName: r.source_file_name,
        usageType: r.usage_type,
        thumbnailUrl: r.thumbnail_url,
        authorName: r.author_name,
        capturedAt: new Date().toISOString(),
      },
    };
  }

  private async resolveSignage(id: string): Promise<ResolvedContent | null> {
    const rows = await this.dataSource.query(
      `SELECT "id", "name", "description", "mediaType", "sourceType", "sourceUrl",
              "thumbnailUrl", "duration", "resolution", "content", "tags", "metadata"
       FROM "signage_media"
       WHERE "id" = $1 AND "deletedAt" IS NULL
       LIMIT 1`,
      [id],
    );
    if (!rows || rows.length === 0) return null;

    const media = rows[0];
    return {
      title: media.name,
      type: 'signage',
      sourceService: 'kpa',
      contentJson: {
        title: media.name,
        mediaType: media.mediaType,
        sourceType: media.sourceType,
        sourceUrl: media.sourceUrl,
        thumbnailUrl: media.thumbnailUrl,
        duration: media.duration,
        resolution: media.resolution,
        content: media.content,
        tags: media.tags,
        description: media.description,
        metadata: media.metadata,
      },
    };
  }
}
