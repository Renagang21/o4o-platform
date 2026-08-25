/**
 * CMS 서비스 선택지 — admin-dashboard CMS 화면 공통 카탈로그
 *
 * WO-O4O-CMS-SERVICEKEY-ALIAS-SSOT-RESIDUAL-CLOSURE-V1 §7
 *
 * 이 목록은 **제품 UI 카탈로그**다 (label / 표시 순서 / "전체" 선택지). 그 성격은
 * security-core 의 canonical resolver 가 대신할 수 없으므로 목록 자체는 유지한다.
 * 다만 각 항목의 `value` 는 그대로 서버에 `serviceKey` 로 전달되어 **service identity**
 * 로 쓰이므로, 값은 반드시 **canonical ledger key** 여야 한다.
 *
 * 이전에는 6개 화면이 각자 같은 배열을 복사해 갖고 있었고 KPA 만 role prefix('kpa'),
 * K-Cosmetics 는 canonical('k-cosmetics') 이라 축이 섞여 있었다. 한 벌로 모으고
 * KPA 도 canonical('kpa-society') 로 맞춘다. 서버가 read 시 alias 집합으로 확장하므로
 * legacy `kpa` row/slot 도 계속 함께 조회된다.
 */
export interface CmsServiceOption {
  value: string;
  label: string;
}

/** canonical ledger key 만 담는다. role prefix('kpa','cosmetics')를 넣지 않는다. */
export const CMS_SERVICE_OPTIONS: CmsServiceOption[] = [
  { value: 'glycopharm', label: 'Glycopharm' },
  { value: 'kpa-society', label: 'KPA Society' },
  { value: 'neture', label: 'Neture' },
  { value: 'k-cosmetics', label: 'K-Cosmetics' },
];

/**
 * 앞에 "전체/글로벌"(빈 값) 항목을 붙인 선택지를 만든다.
 * 화면마다 그 항목의 문구만 다르다 (필터는 'All Services', 생성 폼은 'Global (All Services)').
 */
export function cmsServiceOptionsWithAll(allLabel = 'All Services'): CmsServiceOption[] {
  return [{ value: '', label: allLabel }, ...CMS_SERVICE_OPTIONS];
}
