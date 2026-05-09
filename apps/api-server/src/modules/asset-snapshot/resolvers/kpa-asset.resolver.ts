/**
 * KPA Asset Resolver
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 * WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1: lesson type 추가 (Reference Metadata 방식)
 * WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1: content type 추가
 *   (kpa_contents 콘텐츠 허브 → 자료함 Full Copy 경로)
 *
 * Resolves KPA community CMS, Signage, LMS Course, KPA Content assets
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
    return null;
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
   *
   * KPA 콘텐츠 허브(`kpa_contents`)의 문서형/코스형 콘텐츠를 매장 자료함으로 Full Copy.
   * 콘텐츠 본문(body / blocks)이 자료함에서 직접 사용되어 POP/QR/블로그 제작에 활용된다.
   *
   * Gate: is_deleted = false 인 콘텐츠만 가져갈 수 있다. status 게이트는 운영자가
   * 작성한 콘텐츠도 매장이 가져갈 수 있어야 하므로 본 단계에서는 적용하지 않는다.
   */
  private async resolveContent(id: string): Promise<ResolvedContent | null> {
    const rows = await this.dataSource.query(
      `SELECT id, title, summary, body, blocks, tags, category, status,
              content_type, sub_type, source_type, source_url, source_file_name,
              thumbnail_url, author_name
       FROM kpa_contents
       WHERE id = $1 AND is_deleted = false
       LIMIT 1`,
      [id],
    );
    if (!rows || rows.length === 0) return null;
    const c = rows[0];

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

  private async resolveSignage(id: string): Promise<ResolvedContent | null> {
    const rows = await this.dataSource.query(
      `SELECT "id", "name", "description", "mediaType", "sourceType", "sourceUrl",
              "thumbnailUrl", "duration", "resolution", "content", "tags", "category", "metadata"
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
        category: media.category,
        description: media.description,
        metadata: media.metadata,
      },
    };
  }
}
