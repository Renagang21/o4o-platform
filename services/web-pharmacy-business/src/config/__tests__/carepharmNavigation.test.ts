import { expect, it, vi } from 'vitest';
vi.mock('../businessSite', () => ({ BUSINESS_SITE: { key: 'carepharm', name: 'CarePharm', authServiceKey: 'neture' } }));
import { KPA_BASE_NAV } from '../navigation';
import { PHARMACY_ORIGIN, PHARMACY_HEADER_BRAND } from '../brand';
import { PHARMACY_HOME_TITLE } from '../seoRegistry';
it('keeps CarePharm anchors, existing community ingress and canonical metadata on its own host', () => {
  expect(KPA_BASE_NAV.map(x => x.href)).toEqual(['/#about', '/#news', '/communities/business%3Acarepharm/forum', '/materials', '/my/participation']);
  expect(PHARMACY_ORIGIN).toBe('https://carepharm.neture.co.kr');
  expect(PHARMACY_HEADER_BRAND.name).toBe('CarePharm');
  expect(PHARMACY_HOME_TITLE).toContain('CarePharm');
});
