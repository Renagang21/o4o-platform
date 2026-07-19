/**
 * WO-O4O-STORE-HANDLED-PRODUCTS-SKU-DISTINGUISHABILITY-IMPROVEMENT-V1 (신설)
 * WO-O4O-TABLET-ADDITIONAL-CONTENT-SKU-DISTINGUISHABILITY-V1 (공통화 — 태블릿 추가정보 모달 재사용)
 *
 * 동일 상품명의 ProductMaster 를 구분하기 위한 SKU 보조 라벨.
 *
 * SKU 를 구분할 수 있는, 실제로 채워지는 유일한 필드는 ProductMaster.specification
 * (약품규격/총수량/제형/포장형태를 ' / ' 로 결합한 원문 문자열, 예: "20밀리리터 / 6 / 시럽 / 포") 이다.
 * 개별 함량/제형/포장 컬럼은 검색 응답에 없고 원천도 대부분 비어 있으므로, 원문을 임의로
 * 구조화·재라벨하지 않고 **존재하는 토큰만** 정리해 노출한다.
 *
 * 규칙:
 *  - '/' 또는 '·' 로 분리 후 trim. 빈 값·의미 없는 토큰(없음/0/-/미상/undefined/null)은 제거.
 *  - 동일 토큰 중복 제거(순서 유지). 남은 값이 없으면 '' 반환(상품명만 표시).
 */
export function buildProductVariantLabel(product: { specification?: string | null }): string {
  const spec = product?.specification;
  if (!spec || typeof spec !== 'string') return '';
  const DROP = new Set(['', '없음', '0', '-', '미상', 'undefined', 'null', 'n/a', 'na']);
  const seen = new Set<string>();
  return spec
    .split(/[/·]/)
    .map((s) => s.trim())
    .filter((s) => s && !DROP.has(s.toLowerCase()))
    .filter((s) => (seen.has(s) ? false : (seen.add(s), true)))
    .join(' · ');
}
