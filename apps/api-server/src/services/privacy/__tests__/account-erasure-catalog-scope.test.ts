import { isBusinessCatalogTable } from '../account-erasure.service.js';

/** 2026-11-09 통합 담당 결정: 상품 카탈로그(거래 · 사업 자료)는 계정 삭제 회원 사본 검사에서 제외한다. */
describe('account erasure — business catalog scope', () => {
  it.each([
    'product_candidates', 'product_masters', 'product_identifiers', 'product_master_cleanup_audits',
    'shared_product_descriptions', 'shared_product_description_audit_logs', 'representative_products',
  ])('excludes public.%s', (table_name) => {
    expect(isBusinessCatalogTable({ schema_name: 'public', table_name })).toBe(true);
  });

  it.each([
    'users', 'linked_accounts', 'action_logs', 'account_activities', 'organization_product_listings',
    'store_multilingual_product_content_groups', 'supplier_product_offers', 'representative_products_backup',
    '_bak_orphan_representative_products_20260706', 'kyc_documents',
  ])('keeps public.%s in the review', (table_name) => {
    expect(isBusinessCatalogTable({ schema_name: 'public', table_name })).toBe(false);
  });

  it('keeps non-public schemas in the review even with a product-like name', () => {
    expect(isBusinessCatalogTable({ schema_name: 'neture', table_name: 'product_masters' })).toBe(false);
  });
});
