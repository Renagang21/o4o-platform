-- 중복 및 잘못된 CPT 정리 후 올바른 CPT 추가

-- 1. 잘못된 복수형 CPT 제거 (이미 완료됨)
-- DELETE FROM custom_post_types WHERE slug IN ('ds_suppliers', 'ds_products', 'ds_orders');

-- 2. 올바른 단수형 CPT 추가
INSERT INTO custom_post_types (id, slug, name, description, icon, active, public, has_archive, show_in_menu, supports, taxonomies, menu_position, capability_type, rewrite, "createdAt", "updatedAt", labels)
VALUES 
  -- ds_supplier (공급자)
  (gen_random_uuid(), 'ds_supplier', '공급자', '드롭쉬핑 상품 공급자', 'store', true, false, false, true, 
   '["title","editor","custom-fields","revisions"]'::jsonb, '[]'::jsonb, 25, 'post', 
   '{"slug":"ds-supplier"}'::jsonb, NOW(), NOW(), 
   '{"add_new": "새 공급자 추가", "add_new_item": "새 공급자 추가", "edit_item": "공급자 편집", "new_item": "새 공급자", "view_item": "공급자 보기", "search_items": "공급자 검색", "not_found": "공급자를 찾을 수 없습니다", "not_found_in_trash": "휴지통에서 공급자를 찾을 수 없습니다"}'::jsonb),
  
  -- ds_partner (파트너) - ds_partners가 이미 있다면 삭제하고 다시 추가
  (gen_random_uuid(), 'ds_partner', '파트너', '드롭쉬핑 제휴 파트너', 'groups', true, false, false, true, 
   '["title","editor","custom-fields","revisions","thumbnail"]'::jsonb, '[]'::jsonb, 26, 'post', 
   '{"slug":"ds-partner"}'::jsonb, NOW(), NOW(),
   '{"add_new": "새 파트너 추가", "add_new_item": "새 파트너 추가", "edit_item": "파트너 편집", "new_item": "새 파트너", "view_item": "파트너 보기", "search_items": "파트너 검색", "not_found": "파트너를 찾을 수 없습니다", "not_found_in_trash": "휴지통에서 파트너를 찾을 수 없습니다"}'::jsonb),
  
  -- ds_product (드롭쉬핑 상품)
  (gen_random_uuid(), 'ds_product', '드롭쉬핑 상품', '드롭쉬핑 플랫폼 상품', 'cart', true, true, true, true, 
   '["title","editor","custom-fields","revisions","thumbnail","excerpt"]'::jsonb, 
   '["ds_product_category","ds_product_tag"]'::jsonb, 24, 'post', 
   '{"slug":"ds-products"}'::jsonb, NOW(), NOW(),
   '{"add_new": "새 상품 추가", "add_new_item": "새 드롭쉬핑 상품 추가", "edit_item": "상품 편집", "new_item": "새 상품", "view_item": "상품 보기", "search_items": "상품 검색", "not_found": "상품을 찾을 수 없습니다", "not_found_in_trash": "휴지통에서 상품을 찾을 수 없습니다"}'::jsonb),
  
  -- ds_order (주문) 
  (gen_random_uuid(), 'ds_order', '주문', '드롭쉬핑 주문 관리', 'shopping-cart', true, false, false, true, 
   '["title","custom-fields"]'::jsonb, '[]'::jsonb, 28, 'post', 
   '{"slug":"ds-order"}'::jsonb, NOW(), NOW(),
   '{"add_new": "새 주문 추가", "add_new_item": "새 주문 추가", "edit_item": "주문 편집", "new_item": "새 주문", "view_item": "주문 보기", "search_items": "주문 검색", "not_found": "주문을 찾을 수 없습니다", "not_found_in_trash": "휴지통에서 주문을 찾을 수 없습니다"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- 3. 확인
SELECT slug, name, icon, active, public FROM custom_post_types WHERE slug LIKE 'ds_%' ORDER BY slug;