/**
 * AliasService
 *
 * WO-O4O-PRODUCT-ALIAS-FOUNDATION-V1
 *
 * ProductMaster 검색 별칭 관리.
 * 사용자 입력/검색 데이터를 기반으로 alias를 축적하여 검색 품질을 향상시킨다.
 *
 * UI에 alias 개념 노출 없음 — 완전 내부 시스템.
 */

import type { DataSource } from 'typeorm';
import { ProductAlias, AliasSource } from '../entities/ProductAlias.entity.js';
import { normalizeName } from './bulk-match.service.js';

export { AliasSource };

/** alias 최소 길이 */
const MIN_ALIAS_LENGTH = 2;

/**
 * alias 유효성 검사
 * - 길이 2 이상
 * - 특수문자만으로 이루어진 문자열 제외
 * - 순수 숫자 제외 (선택)
 */
function isValidAlias(normalized: string): boolean {
  if (normalized.length < MIN_ALIAS_LENGTH) return false;
  if (/^[^a-z0-9가-힣]+$/.test(normalized)) return false; // special-only
  if (/^\d+$/.test(normalized)) return false; // digits-only
  return true;
}

export class AliasService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * alias를 저장한다.
   *
   * 조건:
   * - normalized alias가 유효해야 함
   * - ProductMaster name의 normalized 버전과 동일하면 스킵 (별칭 의미 없음)
   * - 중복이면 스킵 (INSERT ... ON CONFLICT DO NOTHING)
   *
   * @param masterId   ProductMaster ID
   * @param rawAlias   원본 입력값
   * @param source     생성 출처
   * @param masterName ProductMaster.name (중복 체크용, 없으면 DB 조회 생략)
   */
  async upsertAlias(
    masterId: string,
    rawAlias: string,
    source: AliasSource,
    masterName?: string,
  ): Promise<void> {
    if (!rawAlias.trim()) return;

    const normalized = normalizeName(rawAlias);
    if (!isValidAlias(normalized)) return;

    // 마스터 이름과 동일하면 alias 불필요
    if (masterName !== undefined) {
      if (normalizeName(masterName) === normalized) return;
    } else {
      // DB에서 이름 확인
      const rows: Array<{ name: string }> = await this.dataSource.query(
        `SELECT name FROM product_masters WHERE id = $1 LIMIT 1`,
        [masterId],
      );
      if (rows.length > 0 && normalizeName(rows[0].name) === normalized) return;
    }

    // INSERT ... ON CONFLICT DO NOTHING — 중복 시 무시
    await this.dataSource.query(
      `INSERT INTO product_aliases (product_master_id, alias, normalized_alias, source)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ON CONSTRAINT uq_product_alias DO NOTHING`,
      [masterId, rawAlias.trim(), normalized, source],
    );
  }

  /**
   * 여러 alias를 한 번에 저장한다.
   * 각 항목 실패가 전체에 영향을 주지 않도록 개별 처리.
   */
  async upsertAliasesBulk(
    items: Array<{ masterId: string; rawAlias: string; source: AliasSource; masterName?: string }>,
  ): Promise<void> {
    for (const item of items) {
      try {
        await this.upsertAlias(item.masterId, item.rawAlias, item.source, item.masterName);
      } catch {
        // alias 저장 실패는 무시 (검색 품질 향상은 best-effort)
      }
    }
  }
}
