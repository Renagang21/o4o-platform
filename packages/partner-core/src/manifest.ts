/**
 * Partner Core Manifest
 *
 * AppStore 등록을 위한 Manifest 정의
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
    'O4O 플랫폼 파트너 프로그램 엔진. 클릭→전환→커미션→정산 전체 워크플로우를 관리합니다.',

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
