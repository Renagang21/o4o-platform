/**
 * Fulfillment Service Scope — SSOT
 *
 * WO-O4O-SUPPLIER-FULFILLMENT-SERVICE-SCOPE-V1
 *
 * 공용 fulfillment 원장 `public.neture_orders` 는 여러 서비스의 주문을 담는다.
 * 공급자 조회·통계가 서비스를 구분하지 않으면 다른 서비스 주문이 그대로 섞인다
 * (IR-PHARMACY-HUB-PAYMENT-AND-FULFILLMENT-BRIDGE-V1 §4).
 *
 * 이 파일이 **필터 조각의 단일 출처**다. 조회·카운트·통계가 서로 다른 조건을 쓰지 않도록
 * 모든 공급자 경로가 여기 헬퍼만 사용한다.
 *
 * 레거시 호환 규칙:
 *   `service_key` 는 `DEFAULT 'neture'` 라 미표기 행이 생기지 않지만, 방어적으로
 *   `COALESCE(service_key, 'neture')` 로 비교해 **미표기 = neture** 를 한 번 더 보장한다.
 */

/** Neture 자체 fulfillment 주문의 서비스 키 (레거시 주문 포함) */
export const NETURE_FULFILLMENT_SERVICE_KEY = 'neture';

/**
 * `neture_orders` 서비스 필터 SQL 조각.
 *
 * @param alias  neture_orders 테이블 alias (예: 'o')
 * @param param  바인딩 파라미터 자리 (예: '$2')
 *
 * @example
 *   `... WHERE spo.supplier_id = $1 AND ${netureOrderServiceScopeSql('o', '$2')}`
 *   params: [supplierId, NETURE_FULFILLMENT_SERVICE_KEY]
 */
export function netureOrderServiceScopeSql(alias: string, param: string): string {
  return `COALESCE(${alias}.service_key, '${NETURE_FULFILLMENT_SERVICE_KEY}') = ${param}`;
}

/**
 * `checkout_orders` 서비스 필터 SQL 조각.
 *
 * 공급자 통합 조회는 아직 bridge 되지 않은 paid checkout_order 도 함께 보여준다.
 * 그 소스에도 같은 서비스 경계를 적용해야 누락이 없다.
 * checkout_orders 는 컬럼이 아니라 `metadata.serviceKey` 축을 쓴다(기존 규약).
 */
export function checkoutOrderServiceScopeSql(alias: string, param: string): string {
  return `COALESCE(${alias}.metadata->>'serviceKey', '${NETURE_FULFILLMENT_SERVICE_KEY}') = ${param}`;
}
