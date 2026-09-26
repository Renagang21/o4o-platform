/**
 * KPA 매장 `/store` 새 위치 — CHECK-O4O-URL-FIRST-CENSUS-V1 §21-13
 */
import { describe, it, expect } from 'vitest';
import { mapLegacyStorePathToUnified } from '@o4o/store-ui-core';
import { toKpaScopedStorePath } from '../unifiedStoreScope';

const entry = (pathname: string, search = '') =>
  toKpaScopedStorePath(mapLegacyStorePathToUnified('kpa-society', pathname, search));

describe('KPA 매장 경영자 /store → store.neture.co.kr/work/kpa-society/store', () => {
  it('공통 매장 화면은 KPA 서비스 지정 경로로', () => {
    expect(entry('/store')).toBe('/work/kpa-society/store');
    expect(entry('/store/marketing/qr')).toBe('/work/kpa-society/store/marketing/qr');
    expect(entry('/store/info')).toBe('/work/kpa-society/store/info');
    expect(entry('/store/marketing/qr', '?id=1')).toBe('/work/kpa-society/store/marketing/qr?id=1');
  });

  it('서비스 업무 · 매장 HUB · 워크스페이스 홈은 기존 대상 그대로', () => {
    expect(entry('/store/commerce/orders')).toBe('/work/kpa-society/commerce/orders');
    expect(entry('/store-hub/b2b')).toBe('/hub/b2b');
    expect(entry('/store/workspace')).toBe('/');
    expect(entry('/store/services')).toBe('/services');
  });

  it('접두만 같은 경로는 바꾸지 않는다', () => {
    expect(toKpaScopedStorePath('/store-hub')).toBe('/store-hub');
    expect(toKpaScopedStorePath('/stores')).toBe('/stores');
  });
});
