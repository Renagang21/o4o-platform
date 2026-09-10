/**
 * K-Cosmetics Asset Resolver
 *
 * WO-O4O-KCOS-LIBRARY-ORGANIZATION-SCOPE-AND-SNAPSHOT-ROUTE-CLOSURE-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 따로 있는가
 *
 *   `cosmetics.routes.ts` 는 지금까지 `/assets` 에 **KPA 전용** 컨트롤러를 그대로 마운트했다.
 *   그 컨트롤러의 resolver(`KpaAssetResolver`)는 CMS 를 `serviceKey IN ('kpa','kpa-society')`,
 *   사이니지를 `serviceKey = 'kpa-society'` 로 게이트한다 — KCos HUB 가 보여주는 자산
 *   (`k-cosmetics`)은 **ID 를 알아도 절대 통과하지 못했다.**
 *   즉 KCos 의 HUB → 자료함 복사는 원래부터 서비스 경계에서 막혀 있었고,
 *   눈에 보이던 사본은 전부 **사용자의 KPA 조직** 것이었다(org 해석 결함 — 컨트롤러 쪽).
 *
 * 이 resolver 는 KPA 의 게이트 정책을 **그대로 옮기고 키만 KCos 로 바꾼다.**
 *   - CMS     : `serviceKey IN ('cosmetics','k-cosmetics')` (KCos 목록 계약과 같은 키 집합)
 *   - Signage : `serviceKey = 'k-cosmetics'` + scope='global' + source IN (hq·supplier·community)
 *               (`cosmetics.routes.ts` 의 SignageQueryService 설정과 동일)
 *   - content : **없음** — `kpa_contents` 는 KPA 콘텐츠 허브 전용 테이블이다.
 *               KCos 에 대응 원장이 없으므로 null → 404 SOURCE_NOT_FOUND.
 *               KPA 테이블을 KCos 사본으로 흘려보내는 경로를 만들지 않는다.
 *
 * `sourceService` 는 기존 행의 관례('kpa' = role prefix)를 따라 'cosmetics' 로 기록한다.
 */

import { DataSource, In } from 'typeorm';
import { CmsContent } from '@o4o-apps/cms-core/entities';
import type { ContentResolver, ResolvedContent } from '@o4o/asset-copy-core';

/** KCos 가 CMS 를 조회할 때 쓰는 키 집합 — cmsApi 기본값 'cosmetics' · HubContentPage 'k-cosmetics'. */
export const COSMETICS_CMS_SERVICE_KEYS = ['cosmetics', 'k-cosmetics'] as const;
/** KCos 사이니지 canonical 키 — `cosmetics.routes.ts` SignageQueryService 와 동일. */
export const COSMETICS_SIGNAGE_SERVICE_KEY = 'k-cosmetics';
/** o4o_asset_snapshots.source_service 에 남기는 값 — 'kpa' 관례(role prefix)와 동형. */
export const COSMETICS_SOURCE_SERVICE = 'cosmetics';

export class CosmeticsAssetResolver implements ContentResolver {
  constructor(private dataSource: DataSource) {}

  async resolve(sourceAssetId: string, assetType: string): Promise<ResolvedContent | null> {
    if (assetType === 'cms') return this.resolveCms(sourceAssetId);
    if (assetType === 'signage') return this.resolveSignage(sourceAssetId);
    // content(kpa_contents) · resource · blog · pop · qr — KCos 에 원장이 없거나 복사 대상이 아니다.
    return null;
  }

  private async resolveCms(id: string): Promise<ResolvedContent | null> {
    const repo = this.dataSource.getRepository(CmsContent);
    const content = await repo.findOne({
      where: { id, status: 'published', serviceKey: In([...COSMETICS_CMS_SERVICE_KEYS]) },
    });
    if (!content) return null;

    return {
      title: content.title,
      type: 'cms',
      sourceService: COSMETICS_SOURCE_SERVICE,
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

  private async resolveSignage(id: string): Promise<ResolvedContent | null> {
    const rows = await this.dataSource.query(
      `SELECT "id", "name", "description", "mediaType", "sourceType", "sourceUrl",
              "thumbnailUrl", "duration", "resolution", "content", "tags", "metadata"
       FROM "signage_media"
       WHERE "id" = $1 AND "deletedAt" IS NULL AND "status" = 'active'
         AND "serviceKey" = $2
         AND "scope" = 'global'
         AND "source" IN ('hq', 'supplier', 'community')
       LIMIT 1`,
      [id, COSMETICS_SIGNAGE_SERVICE_KEY],
    );
    if (!rows || rows.length === 0) return null;

    const media = rows[0];
    return {
      title: media.name,
      type: 'signage',
      sourceService: COSMETICS_SOURCE_SERVICE,
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
