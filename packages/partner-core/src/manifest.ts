/**
 * Partner Core Manifest
 *
 * S2S 구조에서 파트너/제휴 프로그램의 Core 엔진
 *
 * ## Core 책임 범위
 * - 파트너 등록/승인/상태 관리
 * - 링크 생성 및 클릭 추적
 * - 전환(Conversion) 기록 및 확정
 * - 커미션 계산 및 정산 배치 관리
 *
 * ## Core가 하지 않는 것
 * - 서비스별 커미션율 결정 (Extension에서 Hook으로 처리)
 * - 특정 서비스 비즈니스 로직 (Cosmetics, Yaksa 등)
 * - 파트너 자격 조건 판단 (서비스별 Extension)
 *
 * ## 하드코딩 상수 (역사적 결정)
 * - 기본 커미션율, 정산 주기 등은 현재 하드코딩됨
 * - 추후 일반화 대상이나, 현재는 유지
 *
 * @package @o4o/partner-core
 */

import type { AppManifest } from '@o4o/types';

export const partnerCoreManifest: AppManifest = {
  appId: 'partner-core',
  name: 'Partner Core',
  version: '1.0.0',
  type: 'core',
  source: 'local',
  description:
    'S2S 파트너 프로그램 엔진 - 링크 추적, 전환 기록, 커미션 계산, 정산 관리',

  // 독립적인 Core App - 다른 앱에 의존하지 않음
  dependencies: {},

  // DB 테이블
  ownsTables: [
    'partners',
    'partner_links',
    'partner_clicks',
    'partner_conversions',
    'partner_commissions',
    'partner_settlement_batches',
  ],

  // API 라우트
  routes: [
    '/api/partners',
    '/api/partners/:id',
    '/api/partners/:id/links',
    '/api/partners/:id/clicks',
    '/api/partners/:id/conversions',
    '/api/partners/:id/commissions',
    '/api/partners/:id/settlements',
    '/api/partner-links',
    '/api/partner-links/:shortUrl/redirect',
    '/api/partner-clicks/record',
    '/api/partner-conversions',
    '/api/partner-commissions',
    '/api/partner-settlements',
  ],

  // 권한
  permissions: [
    'partner.read',
    'partner.write',
    'partner.approve',
    'partner.settlement',
    'partner.admin',
  ],

  // 라이프사이클 훅
  lifecycle: {
    install: './lifecycle/install.js',
    activate: './lifecycle/activate.js',
    deactivate: './lifecycle/deactivate.js',
    uninstall: './lifecycle/uninstall.js',
  },

  // 언인스톨 정책
  uninstallPolicy: {
    defaultMode: 'keep-data',
    allowPurge: true,
    autoBackup: true,
  },

  // 추가 메타데이터
  backend: {
    entities: [
      'Partner',
      'PartnerLink',
      'PartnerClick',
      'PartnerConversion',
      'PartnerCommission',
      'PartnerSettlementBatch',
    ],
    services: [
      'PartnerService',
      'PartnerLinkService',
      'PartnerClickService',
      'PartnerConversionService',
      'PartnerCommissionService',
      'PartnerSettlementService',
    ],
  },

  hooks: {
    provided: [
      'validatePartnerVisibility',
      'beforePartnerCommissionApply',
      'beforePartnerSettlementCreate',
    ],
  },

  events: {
    emitted: [
      'partner.created',
      'partner.approved',
      'partner.suspended',
      'partner.levelUp',
      'partner.click.recorded',
      'partner.conversion.created',
      'partner.conversion.confirmed',
      'partner.commission.created',
      'partner.commission.confirmed',
      'partner.settlement.created',
      'partner.settlement.closed',
      'partner.settlement.paid',
    ],
  },
};

export default partnerCoreManifest;
