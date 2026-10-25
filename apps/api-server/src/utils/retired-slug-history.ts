/**
 * 퇴역 서비스 old slug redirect 판정
 *
 * `StoreSlugService.findOldSlugRedirect()` 는 history 행의 service_key 를 버리고 storeId 만으로 현재
 * slug 를 찾는다. 그래서 퇴역 서비스(PharmacyHub 등)의 옛 slug 가 같은 매장의 다른 서비스 slug 로
 * 301 redirect 될 수 있다. redirect 전에 가장 최근 history 행의 service_key 를 직접 확인한다.
 */
import type { DataSource } from 'typeorm';
import { normalizeSlug } from '@o4o/platform-core/store-identity';
import { isRetiredServiceValue } from '../middleware/retired-service.middleware.js';

/** `oldSlug` 의 가장 최근 history 행이 퇴역 서비스 소속이면 true. */
export async function isRetiredOldSlugHistory(dataSource: DataSource, oldSlug: string): Promise<boolean> {
  const rows: Array<{ service_key: string }> = await dataSource.query(
    `SELECT service_key FROM platform_store_slug_history
      WHERE old_slug = $1
      ORDER BY changed_at DESC
      LIMIT 1`,
    [normalizeSlug(oldSlug)],
  );
  return rows.length > 0 && isRetiredServiceValue(rows[0].service_key);
}
