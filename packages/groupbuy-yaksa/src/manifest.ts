/**
 * Groupbuy-Yaksa Manifest
 *
 * S2S 구조에서 Yaksa(약사) 조직 기반 공동구매 Extension
 *
 * ## S2S 관점에서의 역할
 * - S2S Core(dropshipping-core) + organization-core 위에서 동작
 * - 지부/분회 단위 조직 기반 S2S 구현
 * - 공동구매 캠페인을 통한 집단 구매력 확보
 *
 * ## 서비스 특수성 (Extension에서 흡수)
 * - 조직(지부/분회) 기반 구매
 * - 캠페인 기간 및 최소 수량 설정
 * - 지부장/분회장 승인 워크플로우
 *
 * ## S2S 흐름
 * 1. 지부/분회에서 공동구매 캠페인 생성
 * 2. Supplier의 Offer를 캠페인에 연결
 * 3. 회원들이 캠페인에 참여 (주문)
 * 4. 최소 수량 달성 시 일괄 Order Relay
 *
 * ## 하드코딩 상수 (역사적 결정, 추후 일반화 대상)
 * - defaultMinQuantity: 10
 * - defaultCampaignDurationDays: 14
 */

export const manifest = {
  id: 'groupbuy-yaksa',
  name: 'Yaksa 공동구매',
  version: '1.1.0',
  description: 'S2S 조직 기반 공동구매 Extension - 지부/분회 캠페인, 집단 구매',

  type: 'extension' as const,
  status: 'development' as const,

  category: 'commerce',

  targetServices: ['yaksa'],

  dependencies: {
    required: ['dropshipping-core', 'organization-core'],
    optional: [],
  },

  permissions: {
    entities: [
      'GroupbuyCampaign',
      'CampaignProduct',
      'GroupbuyOrder',
      'SupplierProfile',
    ],
    routes: ['/api/groupbuy/*'],
  },

  settings: {
    defaultMinQuantity: 10,
    defaultCampaignDurationDays: 14,
  },

  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },
};

export default manifest;
