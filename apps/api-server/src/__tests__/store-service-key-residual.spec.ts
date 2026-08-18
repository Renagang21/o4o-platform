/**
 * WO-O4O-STORE-SERVICE-KEY-RESIDUAL-INTEGRITY-CLEANUP-V1
 *
 * Store 관련 service-key 저장소의 legacy key **신규 생성 경로 0** 회귀 테스트.
 *
 * 확정 계약(기존 SSOT 재확인 — 신규 계약 아님):
 *   organization_product_listings.service_key      = platform canonical ('kpa-society' / 'k-cosmetics' / ...)
 *   organization_service_enrollments.service_code  = platform canonical ('k-cosmetics')
 *   role_assignments prefix / platform_store_slugs = 별도 축('kpa' / 'cosmetics') — 본 테스트 대상 아님
 */
import fs from 'fs';
import path from 'path';

import { LISTING_SERVICE_KEYS } from '../utils/listing-service-key.js';
import { SERVICE_KEYS } from '../constants/service-keys.js';

const SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8');

describe('Store service-key residual integrity', () => {
  // ── OPL write: event offer → 매장 진열 파생행 ──────────────────────
  it('Event Offer 매장 진열 매핑은 모두 canonical listing key 로만 기록한다', () => {
    const src = read('routes/kpa/services/event-offer.service.ts');
    const block = src.match(/const STORE_SERVICE_KEY_MAP[\s\S]*?\n\};/)?.[0];
    expect(block).toBeTruthy();

    const targets = [...block!.matchAll(/\]:\s*SERVICE_KEYS\.([A-Z_]+),/g)].map((m) => m[1]);
    expect(targets.length).toBeGreaterThanOrEqual(3);
    for (const t of targets) {
      expect(LISTING_SERVICE_KEYS).toContain((SERVICE_KEYS as Record<string, string>)[t]);
    }
    // legacy role-prefix key 로의 매핑이 다시 생기지 않는다
    expect(block).not.toContain(': SERVICE_KEYS.KPA,');
    expect(block).toContain('SERVICE_KEYS.KPA_SOCIETY');
  });

  it('파생행 구분은 service_key 가 아니라 source_type 으로 한다', () => {
    const src = read('routes/o4o-store/controllers/pharmacy-products.controller.ts');
    expect(src).toContain("opl.source_type IS DISTINCT FROM 'event-offer'");
    // 파생행을 legacy service_key 로 식별하는 read 경로가 없어야 한다
    expect(src).not.toMatch(/opl\.service_key\s*=\s*'kpa'/);
  });

  it('KPA 운영자 이벤트 오퍼 pending KPI 는 승인 큐와 같은 key 를 센다', () => {
    const src = read('routes/kpa/services/operator-dashboard.service.ts');
    expect(src).toMatch(/service_key = 'kpa-groupbuy' AND status = 'pending'/);
  });

  // ── enrollment write: canonical only ──────────────────────────────
  it('enrollment write 경로에 legacy service_code 리터럴이 없다', () => {
    for (const rel of [
      'routes/cosmetics/services/cosmetics-store.service.ts',
      'modules/neture/services/supplier.service.ts',
    ]) {
      const src = read(rel);
      const calls = src.match(/enrollService\(\s*\{[\s\S]{0,200}?\}/g) ?? [];
      for (const call of calls) {
        expect(call).not.toMatch(/serviceCode:\s*'(cosmetics|kpa)'/);
      }
    }
  });
});
