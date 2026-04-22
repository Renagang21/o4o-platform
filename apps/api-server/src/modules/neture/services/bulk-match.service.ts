/**
 * BulkMatchService
 *
 * WO-O4O-BULK-MATCHING-NORMALIZATION-V1
 *
 * Bulk 상품 등록 시 name 기반 ProductMaster 자동 매칭.
 *
 * 흐름:
 *   1. normalizeName() — 입력값 정규화
 *   2. ProductMaster DB 검색 (name ILIKE)
 *   3. 상태 분류: EXACT_MATCH | SIMILAR_MATCH | NOT_FOUND
 */

import type { DataSource } from 'typeorm';

export type MatchStatus = 'EXACT_MATCH' | 'SIMILAR_MATCH' | 'NOT_FOUND';

export interface MasterCandidate {
  id: string;
  name: string;
  regulatoryName: string;
  manufacturerName: string;
  barcode: string;
}

export interface MatchResult {
  /** 원본 입력값 */
  rawName: string;
  /** 정규화된 이름 */
  normalizedName: string;
  /** 매칭 상태 */
  status: MatchStatus;
  /** EXACT_MATCH 시 연결할 master */
  master?: MasterCandidate;
  /** SIMILAR_MATCH 시 후보 목록 (최대 5건) */
  candidates?: MasterCandidate[];
}

/**
 * 상품명 정규화
 *
 * - trim, 소문자화
 * - 연속 공백 정리
 * - 특수문자 제거 (Korean, English, digits, spaces 유지)
 * - 단위 정규화: 숫자+단위 사이 공백 제거 (500 mg → 500mg)
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w가-힣\s]/g, '')
    .replace(/(\d+)\s*(mg|ml|g|kg|mcg|iu|정|캡슐|포|매|개|회|일)\b/gi, '$1$2')
    .trim();
}

export class BulkMatchService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * 이름 목록을 받아 각각의 ProductMaster 매칭 결과를 반환한다.
   * 최대 200건 제한.
   */
  async matchNames(names: string[]): Promise<MatchResult[]> {
    const limited = names.slice(0, 200);
    const results: MatchResult[] = [];

    for (const rawName of limited) {
      if (!rawName.trim()) {
        results.push({ rawName, normalizedName: '', status: 'NOT_FOUND' });
        continue;
      }

      const normalizedName = normalizeName(rawName);
      const result = await this.matchSingle(rawName, normalizedName);
      results.push(result);
    }

    return results;
  }

  private async matchSingle(rawName: string, normalizedName: string): Promise<MatchResult> {
    // 검색: name ILIKE '%keyword%'
    const rows: Array<{ id: string; name: string; regulatory_name: string; manufacturer_name: string; barcode: string }> =
      await this.dataSource.query(
        `SELECT id, name, regulatory_name, manufacturer_name, barcode
         FROM product_masters
         WHERE name ILIKE $1
         ORDER BY name ASC
         LIMIT 6`,
        [`%${normalizedName}%`],
      );

    if (rows.length === 0) {
      // NOT_FOUND: 결과 없음
      return { rawName, normalizedName, status: 'NOT_FOUND' };
    }

    const candidates: MasterCandidate[] = rows.slice(0, 5).map((r) => ({
      id: r.id,
      name: r.name,
      regulatoryName: r.regulatory_name,
      manufacturerName: r.manufacturer_name,
      barcode: r.barcode,
    }));

    // EXACT_MATCH: 정규화된 이름이 완전히 일치하는 단일 결과
    const exactHit = candidates.find((c) => normalizeName(c.name) === normalizedName);
    if (exactHit && rows.length === 1) {
      return { rawName, normalizedName, status: 'EXACT_MATCH', master: exactHit };
    }

    // EXACT_MATCH: 후보 중 정확히 1건만 이름 일치 (다른 결과들은 부분 일치)
    const exactMatches = candidates.filter((c) => normalizeName(c.name) === normalizedName);
    if (exactMatches.length === 1) {
      return { rawName, normalizedName, status: 'EXACT_MATCH', master: exactMatches[0] };
    }

    // SIMILAR_MATCH: 1건 이상 결과 but 정확히 일치하는 게 0건 또는 2건+
    return { rawName, normalizedName, status: 'SIMILAR_MATCH', candidates };
  }
}
