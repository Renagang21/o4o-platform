/**
 * KPA Asset Resolver
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 * WO-O4O-LMS-STORE-LIBRARY-FOUNDATION-V1: lesson type 추가 (Reference Metadata 방식)
 *   — CHECK-O4O-LMS-KPA-LESSON-SNAPSHOT-CREATION-REMOVAL-V1: lesson 분기·resolveLesson() 제거.
 *     신규 lesson snapshot 생성 경로를 닫는다. 기존 row / store-assets?type=lesson 조회 호환은 유지.
 * WO-O4O-CONTENT-HUB-ASSET-SNAPSHOT-WIRING-V1: content type 추가
 *   (kpa_contents 콘텐츠 허브 → 자료함 Full Copy 경로)
 * WO-O4O-CMS-CONTENT-REUSABLE-POLICY-ALIGN-V1: resolveContent 에 reusable_policy 검증 추가
 * WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1: resource type 추가
 *   (kpa_contents sub_type='resource' 자료실 → 자료함 Full Copy 경로)
 *   — WO-O4O-KPA-FORUM-RESOURCE-STORE-COPY-REMOVAL-V1: resource 분기·resolveResource() 제거.
 *     자료실 신규 매장 복사 경로를 닫는다(404 SOURCE_NOT_FOUND). 기존 row /
 *     GET /assets?type=resource 조회 호환은 유지(allowedAssetTypes 에 'resource' 존치).
 *     resolveContent 에도 sub_type<>'resource' 필터를 추가해 content 타입 우회를 차단한다.
 *     매장 복사 허용 대상은 콘텐츠(content/cms)·디지털사이니지(signage) 뿐이다.
 *     포럼은 애초에 assetType·resolver 가 없어 복사 경로가 존재하지 않는다.
 *
 * Resolves KPA community CMS, Signage, KPA Content assets
 * into the standard ResolvedContent format.
 */

import { DataSource } from 'typeorm';
import { CmsContent } from '@o4o-apps/cms-core/entities';
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
    if (assetType === 'content') {
      return this.resolveContent(sourceAssetId);
    }
    // WO-O4O-KPA-FORUM-RESOURCE-STORE-COPY-REMOVAL-V1:
    //   'resource'(자료실) 신규 매장 복사 차단 — 분기 제거로 아래 `return null` 에 도달하고
    //   controller 가 404 SOURCE_NOT_FOUND 로 거부한다(기존 오류 코드 재사용, 신규 체계 없음).
    //   allowedAssetTypes 에는 'resource' 를 남겨 둔다 — 기존에 가져간 사본의 목록 조회
    //   (GET /assets?type=resource, StoreLibraryResourcesPage)가 계속 동작해야 하기 때문이다.
    //   포럼은 애초에 복사 경로(assetType/resolver)가 존재하지 않는다.
    if (assetType === 'blog') {
      return this.resolveBlog(sourceAssetId);
    }
    if (assetType === 'pop') {
      return this.resolvePop(sourceAssetId);
    }
    if (assetType === 'qr') {
      return this.resolveQr(sourceAssetId);
    }
    return null;
  }

  /**
   * WO-O4O-KPA-OPERATOR-HUB-QR-TEMPLATE-FOUNDATION-V1 Phase 1 Backend Foundation (2026-05-24)
   *
   * Phase 1 — placeholder. 항상 null 반환.
   *
   * operator_qr_templates entity 는 신설됐으나 (IR-O4O-KPA-OPERATOR-HUB-QR-BUSINESS-DEFINITION-V1
   * Option B) 실 resolver 구현 (id + author_role='operator' AND status='published' 조건 +
   * target_type/target_url/target_content_* contentJson 매핑) 은 Phase 2 후속.
   *
   * 본 단계는 assetType='qr' 호출이 allowedAssetTypes 통과 후 resolver 분기까지 도달하되
   * 항상 null 반환 → AssetCopyService 가 SOURCE_NOT_FOUND 로 처리.
   *
   * 본 trace 결정 사항: QR 의 매장 가져가기는 자료함 사본 (asset-snapshot copy) 흐름이 아니라
   * 직접 import endpoint (Phase 3-B 의 /stores/:slug/qr/staff/import) 가 채택될 가능성 높음
   * (변환 흐름: operator_qr_templates → store_qr_codes INSERT). 본 resolver 는 자료함 통합
   * 옵션을 위해 미리 골격만 등록.
   */
  private async resolveQr(_id: string): Promise<ResolvedContent | null> {
    return null;
  }

  /**
   * WO-O4O-KPA-POP-PUBLISHING-PHASE2-BACKEND-V1 (2026-05-24)
   *
   * Phase 1 placeholder 를 실 구현으로 전환. resolveBlog 패턴 mirror.
   *
   * 통과 조건:
   *   - author_role = 'operator'  (매장 직접 작성 POP 차단 — 매장 전용)
   *   - status = 'published'      (draft/archived 차단)
   *
   * 차단:
   *   - author_role = 'store'  → 매장 직접 작성 POP 는 자료함 가져가기 대상 아님
   *   - status ≠ 'published'   → 비공개 상태 POP 차단
   *
   * service_key 정합 (cross-service 노출 차단) 은 listing 단 (queryPop) 에서 처리한다.
   * ContentResolver 인터페이스가 (sourceAssetId, assetType) 만 받으므로 resolver 레벨
   * service_key 검증은 인터페이스 확장이 필요 — 별도 WO 대상. 다른 resolver (resolveBlog
   * 포함) 도 동일 패턴.
   *
   * Full Copy — POP 본문 / 메타데이터를 contentJson 에 담아 자료함에 보존한다.
   */
  private async resolvePop(id: string): Promise<ResolvedContent | null> {
    const rows = await this.dataSource.query(
      `SELECT id, title, slug, excerpt, content, status, author_role,
              published_at, created_at, service_key, store_id
       FROM store_pops
       WHERE id = $1
         AND author_role = 'operator'
         AND status = 'published'
       LIMIT 1`,
      [id],
    );
    if (!rows || rows.length === 0) return null;
    const p = rows[0];

    return {
      title: p.title,
      type: 'pop',
      sourceService: 'kpa',
      contentJson: {
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        content: p.content,
        authorRole: p.author_role,
        publishedAt:
          p.published_at instanceof Date ? p.published_at.toISOString() : p.published_at,
        sourceServiceKey: p.service_key,
        sourceStoreId: p.store_id,
        capturedAt: new Date().toISOString(),
      },
    };
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

  /**
   * WO-O4O-SUPPLIER-RESOURCE-CURRENT-PUBLISH-AND-HUB-FLOW-PRESERVE-V1:
   * status='published' 게이트 추가 — HUB 목록(cms 탭: status='published')과 가져오기 게이트 정합.
   * 종전에는 ID 만 알면 pending/draft/archived cms 콘텐츠도 매장 사본 생성이 가능했다
   * (승인 전 공급자 제출물 포함). resolveBlog/resolvePop 과 동일 패턴.
   * service_key 정합은 기존 결정대로 listing 단 담당(resolvePop 주석 참조 — 인터페이스 확장 별도 WO).
   */
  private async resolveCms(id: string): Promise<ResolvedContent | null> {
    const repo = this.dataSource.getRepository(CmsContent);
    const content = await repo.findOne({ where: { id, status: 'published' } });
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
         -- WO-O4O-KPA-FORUM-RESOURCE-STORE-COPY-REMOVAL-V1: 자료실 row 우회 복사 차단.
         --   자료실도 kpa_contents 를 쓰므로 sub_type 필터가 없으면 assetType='content' 로
         --   자료실 항목을 복사할 수 있었다. 문서형(sub_type='content')만 통과시킨다.
         AND (sub_type IS NULL OR sub_type <> 'resource')
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
   * WO-O4O-SUPPLIER-RESOURCE-CURRENT-PUBLISH-AND-HUB-FLOW-PRESERVE-V1:
   * status='active' 게이트 추가 — HUB signage 목록(status='active')과 가져오기 게이트 정합.
   * scope/serviceKey 정합은 기존 결정대로 listing 단 담당.
   */
  private async resolveSignage(id: string): Promise<ResolvedContent | null> {
    const rows = await this.dataSource.query(
      `SELECT "id", "name", "description", "mediaType", "sourceType", "sourceUrl",
              "thumbnailUrl", "duration", "resolution", "content", "tags", "metadata"
       FROM "signage_media"
       WHERE "id" = $1 AND "deletedAt" IS NULL AND "status" = 'active'
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
