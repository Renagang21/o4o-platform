/**
 * SignageQueryService — APP-SIGNAGE 공용 쿼리 서비스
 *
 * Phase 1: 홈 페이지용 사이니지 미리보기 쿼리를 공통 서비스로 추출.
 * KPA, Neture 등 모든 서비스가 동일한 쿼리 로직을 재사용.
 */

import { DataSource } from 'typeorm';

export interface SignageQueryConfig {
  serviceKey: string;
  sources?: string[];  // default: ['hq', 'store']
}

export class SignageQueryService {
  constructor(
    private dataSource: DataSource,
    private config: SignageQueryConfig,
  ) {}

  /**
   * 홈 페이지용 최신 미디어 + 플레이리스트 요약
   */
  async listForHome(mediaLimit = 6, playlistLimit = 4) {
    const sources = this.config.sources || ['hq', 'store'];
    const sourcePlaceholders = sources.map((_, i) => `$${i + 2}`).join(', ');
    const limitIndex = sources.length + 2;

    const media = await this.dataSource.query(`
      SELECT id, name, "mediaType", "sourceUrl" as url, "thumbnailUrl", duration, metadata
      FROM signage_media
      WHERE "serviceKey" = $1 AND source IN (${sourcePlaceholders}) AND status = 'active' AND "deletedAt" IS NULL
      ORDER BY "createdAt" DESC
      LIMIT $${limitIndex}
    `, [this.config.serviceKey, ...sources, mediaLimit]);

    const playlists = await this.dataSource.query(`
      SELECT id, name, description, "itemCount", "totalDuration"
      FROM signage_playlists
      WHERE "serviceKey" = $1 AND source IN (${sourcePlaceholders}) AND status = 'active' AND "deletedAt" IS NULL
      ORDER BY "createdAt" DESC
      LIMIT $${limitIndex}
    `, [this.config.serviceKey, ...sources, playlistLimit]);

    return { media, playlists };
  }
}
