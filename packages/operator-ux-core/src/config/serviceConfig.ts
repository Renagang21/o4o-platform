/**
 * ServiceConfig v1 — 표현 제어 레이어
 *
 * WO-O4O-SERVICE-CONFIG-INTRODUCTION-V1
 *
 * 서비스별 UI 표현(색상·용어·CTA)만 담당.
 * 구조(메뉴/기능/컴포넌트) 제어는 이 config의 범위가 아님.
 */

export type ServiceKey = 'kpa-society' | 'glycopharm' | 'k-cosmetics';

export interface ServiceConfig {
  key: ServiceKey;

  terminology: {
    /** 매장 유형 호칭 — 약국 / 매장 */
    storeLabel: string;
    /** 사용자 매장 호칭 — 내 약국 / 내 매장 */
    myStoreLabel: string;
    /** 운영 허브 명칭 — 약국 운영 허브 / 매장 운영 허브 */
    storeHubLabel: string;
  };

  uiText: {
    /** Home 주요 CTA 문구 */
    homePrimaryCTA: string;
    /** StoreHub 흐름 안내 문구 */
    storeHubFlow: string;
    /** StoreHome 페이지 제목 */
    storeHomeTitle: string;
    /** StoreHome 페이지 부제목 */
    storeHomeSubtitle: string;
    /** AppEntry 카드 라벨 */
    appEntry: {
      storeHubTitle: string;
    };
  };
}
