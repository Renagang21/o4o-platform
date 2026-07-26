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
 * WO-O4O-KPA-CONTENT-ACCESS-AND-COPY-POLICY-FINAL-ALIGNMENT-V1: 신규 복사 경로 최종 정렬.
 *   - blog / pop / qr 분기·resolver 제거(신규 사본 생성 차단). 실제 매장 가져가기는
 *     전용 import 엔드포인트(importOperatorBlog/Pop/Qr)가 담당하므로 끊기는 경로 없음.
 *   - resolveContent 에 status 게이트 추가(ready·published 만) — draft/private 차단.
 *   - resolveSignage 에 serviceKey/scope/source 게이트 추가 — 서비스 간 자산 격리.
 *   - blog/pop/qr/resource/lesson 은 allowedAssetTypes 에 남아 있으나 **신규 생성은 불가**하고
 *     기존 사본의 목록 조회 호환만 유지한다(같은 목록이 GET /assets?type= 에도 쓰임).
 *
 * 신규 사본 생성 가능 = **cms · content · signage** 3종뿐이다(전부 '콘텐츠·디지털사이니지' 정책 범위).
 *
 * Resolves KPA community CMS, Signage, KPA Content assets
 * into the standard ResolvedContent format.
 */

import { DataSource, In } from 'typeorm';
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
    // WO-O4O-KPA-CONTENT-ACCESS-AND-COPY-POLICY-FINAL-ALIGNMENT-V1:
    //   매장 복사 허용 대상은 **콘텐츠(content/cms) · 디지털사이니지(signage)** 뿐이다.
    //   blog / pop / qr 분기를 제거해 신규 사본 생성을 닫는다(→ 404 SOURCE_NOT_FOUND).
    //   - 실제 매장 가져가기는 asset-snapshot 이 아니라 전용 import 엔드포인트가 담당한다
    //     (HubBlogLibraryPage=importOperatorBlog · HubPopLibraryPage=importOperatorPop ·
    //      HubQrLibraryPage=importOperatorQr) → 본 차단으로 끊기는 실사용 경로 없음.
    //   - allowedAssetTypes 에는 3종을 남겨 둔다 — 같은 목록이 조회(GET /assets?type=)에도
    //     쓰여 제거하면 기존 사본 조회가 400 으로 깨지기 때문이다(resource 와 동일 처리).
    return null;
  }

  /**
   * WO-O4O-SUPPLIER-RESOURCE-CURRENT-PUBLISH-AND-HUB-FLOW-PRESERVE-V1:
   * status='published' 게이트 추가 — HUB 목록(cms 탭: status='published')과 가져오기 게이트 정합.
   * 종전에는 ID 만 알면 pending/draft/archived cms 콘텐츠도 매장 사본 생성이 가능했다
   * (승인 전 공급자 제출물 포함).
   * service_key 정합은 기존 결정대로 listing 단(HubContentQueryService)이 담당한다 —
   * ContentResolver 인터페이스가 (sourceAssetId, assetType) 만 받아 resolver 레벨 service_key
   * 검증은 인터페이스 확장이 필요하며 별도 WO 대상이다.
   * (WO-O4O-KPA-CONTENT-ACCESS-AND-COPY-POLICY-FINAL-ALIGNMENT-V1: resolveBlog/resolvePop 은
   *  제거되어 더 이상 참조 대상이 아니므로 주석에서 뺀다.)
   */
  private async resolveCms(id: string): Promise<ResolvedContent | null> {
    const repo = this.dataSource.getRepository(CmsContent);
    // WO-O4O-KPA-CONTENT-ACCESS-AND-COPY-POLICY-FINAL-ALIGNMENT-V1 (보완):
    //   cms_contents 는 **서비스 공용 테이블**이고 serviceKey 로 소유 서비스를 구분한다
    //   ('kpa' | 'kpa-society' | 'glycopharm' | 'neture' | null=global).
    //   serviceKey 게이트가 없어 **다른 서비스의 published CMS 를 ID 만 알면 KPA 매장 사본으로
    //   복사**할 수 있었다(프로덕션 실증: GlycoPharm·Neture 콘텐츠가 201 로 복사됨).
    //   KPA 범위 = 기존 목록 계약과 동일한 키 집합으로 강제한다:
    //     - HUB 목록(cmsApi.getContents 기본) : serviceKey='kpa'
    //     - Home/공용 조회(ContentQueryService): serviceKey IN ('kpa-society','kpa')
    //   global(null) 은 두 목록 어디에도 노출되지 않으므로 복사 대상에서 제외한다
    //   (목록에 없는 자산이 복사되는 우회를 다시 만들지 않기 위함).
    const content = await repo.findOne({
      where: { id, status: 'published', serviceKey: In(['kpa', 'kpa-society']) },
    });
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
   *   2. sub_type ≠ 'resource'  (자료실 우회 차단)
   *   3. reusable_policy ≠ 'restricted'  (제작자 명시적 차단)
   *   4. status ∈ {ready, published}  (draft/private 차단)
   * 위 조건 미충족 시 null 반환 → AssetCopyService 가 SOURCE_NOT_FOUND 로 처리.
   *
   * WO-O4O-KPA-CONTENT-ACCESS-AND-COPY-POLICY-FINAL-ALIGNMENT-V1:
   *   종전 주석은 "운영자 콘텐츠도 가져갈 수 있어야 하므로 status 게이트를 적용하지 않는다" 였으나,
   *   운영자 콘텐츠는 'ready' 로 저장되어 게이트를 통과하므로 그 의도는 유지되고
   *   draft/private 만 차단된다.
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

    // Gate 3 — WO-O4O-KPA-CONTENT-ACCESS-AND-COPY-POLICY-FINAL-ALIGNMENT-V1
    //   상태 게이트가 없어 **draft/private 콘텐츠도 ID 만 알면 매장 사본 생성**이 가능했다.
    //   매장에 내보낼 수 있는 상태는 ready(발행 가능/검토 완료) · published 뿐이다.
    //   resolveCms/resolveBlog/resolvePop 이 이미 쓰는 status 게이트와 동일한 패턴.
    if (c.status !== 'ready' && c.status !== 'published') return null;

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
         -- WO-O4O-KPA-CONTENT-ACCESS-AND-COPY-POLICY-FINAL-ALIGNMENT-V1:
         --   serviceKey/scope/source 게이트가 없어 **다른 서비스의 활성 미디어도 ID 만 알면
         --   KPA 매장 사본으로 복사**할 수 있었다(서비스 간 자산 격리 부재).
         --   HUB 조회(HubContentQueryService.querySignageMedia) 및 공개 상세 API 와 동일 기준으로 맞춘다.
         --
         --   source='store' 를 제외하는 이유 (의도된 정책 — 본 resolver 가 새로 정한 것이 아니라
         --   기존 HUB 공유 계약을 그대로 따른 것):
         --     store = **개별 매장이 직접 올린 매장 전용 자산**이다. HUB 공유 대상은
         --     hq(본사) · supplier(공급자) · community(회원 공개) 3종이며,
         --     HubContentQueryService.querySignageMedia 와 공개 목록·상세 API 모두 이 3종만 노출한다.
         --     따라서 한 매장의 자산이 다른 매장으로 재복사되지 않는다(매장 간 자산 유출 차단).
         --     resolveBlog/resolvePop 이 author_role='store' 를 배제했던 것과 동일한 원칙이다.
         AND "serviceKey" = 'kpa-society'
         AND "scope" = 'global'
         AND "source" IN ('hq', 'supplier', 'community')
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
