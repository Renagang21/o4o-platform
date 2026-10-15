/**
 * 퇴역 서비스 전용 조직 판정 (SQL fragment)
 *
 * PharmacyHub 등 퇴역 서비스의 enrollment · 매장 주소만 남은 조직은 매장 후보 · 초대 · QR · 콘텐츠
 * fallback 에 나타나지 않아야 한다. 요청 경로 guard(`rejectRetiredService`)는 DB 에 이미 저장된 조직을
 * 보지 못하므로 조회 쿼리에서 이 판정을 함께 쓴다.
 *
 * 판정: 퇴역 서비스 연결 기록이 있고, 살아 있는 서비스 연결(active enrollment · active slug ·
 * Neture 약국 membership)이 하나도 없는 조직. kpa_members 는 소속(association)일 뿐 매장 연결 근거가 아니다.
 *
 * 값은 모두 상수(RETIRED_SERVICE_KEYS)라 요청 입력이 SQL 에 들어가지 않는다.
 */
import { RETIRED_SERVICE_KEYS, RETIRED_SERVICE_KEY_PREFIX } from '../middleware/retired-service.middleware.js';

const keyList = RETIRED_SERVICE_KEYS.map((k) => `'${k}'`).join(', ');
const prefixLike = `'${RETIRED_SERVICE_KEY_PREFIX}%'`;

/** 신뢰된 column 식에만 사용한다. NULL은 서비스 중립 값으로 유지한다. */
export function retiredServiceKeySql(column: string): string {
  return `COALESCE((btrim(${column}) IN (${keyList}) OR btrim(${column}) LIKE ${prefixLike}), FALSE)`;
}

/** `orgIdExpr` 조직이 퇴역 서비스 전용이면 TRUE 인 SQL boolean 식. */
export function retiredServiceOnlyOrganizationSql(orgIdExpr: string): string {
  return `(
    (EXISTS (SELECT 1 FROM organization_service_enrollments rse
              WHERE rse.organization_id = ${orgIdExpr}
                AND (rse.service_code IN (${keyList}) OR rse.service_code LIKE ${prefixLike}))
      OR EXISTS (SELECT 1 FROM platform_store_slugs rss
                  WHERE rss.store_id = ${orgIdExpr} AND rss.service_key IN (${keyList})))
    AND NOT EXISTS (SELECT 1 FROM organization_service_enrollments lse
                     WHERE lse.organization_id = ${orgIdExpr} AND lse.status = 'active'
                       AND lse.service_code NOT IN (${keyList}) AND lse.service_code NOT LIKE ${prefixLike})
    AND NOT EXISTS (SELECT 1 FROM platform_store_slugs lss
                     WHERE lss.store_id = ${orgIdExpr} AND lss.is_active = true
                       AND lss.service_key NOT IN (${keyList}))
    AND NOT EXISTS (SELECT 1 FROM neture_pharmacy_memberships lnm
                     WHERE lnm.organization_id = ${orgIdExpr} AND lnm.status = 'active')
  )`;
}
