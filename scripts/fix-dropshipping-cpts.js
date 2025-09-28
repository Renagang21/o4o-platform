#!/usr/bin/env node

/**
 * Script to fix Dropshipping CPTs in the database
 * This will check and update the active status of dropshipping CPTs
 */

import pg from 'pg';
const { Client } = pg;

async function fixDropshippingCPTs() {
  const client = new Client({
    host: '43.202.242.215',
    port: 5432,
    user: 'o4o_user',
    password: 'o4o@2024!',
    database: 'o4o_platform'
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // 1. First, check if dropshipping CPTs exist
    console.log('📊 Checking existing Dropshipping CPTs...\n');
    const checkQuery = `
      SELECT slug, name, active, created_at
      FROM custom_post_types 
      WHERE slug IN ('ds_supplier', 'ds_partner', 'ds_product', 'ds_commission_policy')
      ORDER BY created_at DESC
    `;
    
    const checkResult = await client.query(checkQuery);
    
    if (checkResult.rows.length === 0) {
      console.log('❌ No dropshipping CPTs found. Creating them...\n');
      
      // Insert dropshipping CPTs
      const insertQuery = `
        INSERT INTO custom_post_types (id, slug, name, description, icon, active, public, has_archive, show_in_menu, supports, taxonomies, menu_position, capability_type, rewrite, created_at, updated_at, labels)
        VALUES 
        (gen_random_uuid(), 'ds_supplier', '공급자', '드롭쉬핑 상품 공급자', 'store', true, false, false, true, '["title","editor","custom-fields","revisions"]'::jsonb, '[]'::jsonb, 25, 'post', '{"slug":"ds-supplier"}'::jsonb, NOW(), NOW(), '{"add_new": "새 공급자 추가", "add_new_item": "새 공급자 추가", "edit_item": "공급자 편집", "new_item": "새 공급자", "view_item": "공급자 보기", "search_items": "공급자 검색", "not_found": "공급자를 찾을 수 없습니다", "not_found_in_trash": "휴지통에서 공급자를 찾을 수 없습니다"}'::jsonb),
        (gen_random_uuid(), 'ds_partner', '파트너', '드롭쉬핑 제휴 파트너', 'groups', true, false, false, true, '["title","editor","custom-fields","revisions","thumbnail"]'::jsonb, '[]'::jsonb, 26, 'post', '{"slug":"ds-partner"}'::jsonb, NOW(), NOW(), '{"add_new": "새 파트너 추가", "add_new_item": "새 파트너 추가", "edit_item": "파트너 편집", "new_item": "새 파트너", "view_item": "파트너 보기", "search_items": "파트너 검색", "not_found": "파트너를 찾을 수 없습니다", "not_found_in_trash": "휴지통에서 파트너를 찾을 수 없습니다"}'::jsonb),
        (gen_random_uuid(), 'ds_product', '드롭쉬핑 상품', '드롭쉬핑 플랫폼 상품', 'cart', true, true, true, true, '["title","editor","custom-fields","revisions","thumbnail","excerpt"]'::jsonb, '["ds_product_category","ds_product_tag"]'::jsonb, 24, 'post', '{"slug":"ds-products"}'::jsonb, NOW(), NOW(), '{"add_new": "새 상품 추가", "add_new_item": "새 상품 추가", "edit_item": "상품 편집", "new_item": "새 상품", "view_item": "상품 보기", "search_items": "상품 검색", "not_found": "상품을 찾을 수 없습니다", "not_found_in_trash": "휴지통에서 상품을 찾을 수 없습니다"}'::jsonb),
        (gen_random_uuid(), 'ds_commission_policy', '수수료 정책', '드롭쉬핑 수수료 정책', 'money-alt', true, false, false, true, '["title","editor","custom-fields","revisions"]'::jsonb, '[]'::jsonb, 27, 'post', '{"slug":"ds-commission-policy"}'::jsonb, NOW(), NOW(), '{"add_new": "새 정책 추가", "add_new_item": "새 수수료 정책 추가", "edit_item": "수수료 정책 편집", "new_item": "새 수수료 정책", "view_item": "수수료 정책 보기", "search_items": "수수료 정책 검색", "not_found": "수수료 정책을 찾을 수 없습니다", "not_found_in_trash": "휴지통에서 수수료 정책을 찾을 수 없습니다"}'::jsonb)
        ON CONFLICT (slug) DO NOTHING
      `;
      
      await client.query(insertQuery);
      console.log('✅ Dropshipping CPTs created!\n');
      
    } else {
      console.log(`Found ${checkResult.rows.length} dropshipping CPTs:\n`);
      console.table(checkResult.rows);
      
      // Check if any are inactive
      const inactiveCPTs = checkResult.rows.filter(row => !row.active);
      
      if (inactiveCPTs.length > 0) {
        console.log(`\n⚠️  Found ${inactiveCPTs.length} inactive CPTs. Activating them...\n`);
        
        // Update inactive CPTs to active
        const updateQuery = `
          UPDATE custom_post_types 
          SET active = true, updated_at = NOW()
          WHERE slug IN ('ds_supplier', 'ds_partner', 'ds_product', 'ds_commission_policy')
          AND active = false
        `;
        
        const updateResult = await client.query(updateQuery);
        console.log(`✅ Updated ${updateResult.rowCount} CPTs to active state\n`);
      } else {
        console.log('✅ All dropshipping CPTs are already active!\n');
      }
    }

    // Final check - show all dropshipping CPTs
    console.log('📊 Final status of Dropshipping CPTs:\n');
    const finalResult = await client.query(checkQuery);
    console.table(finalResult.rows);

    // Also check total CPT count
    const countQuery = `
      SELECT 
        COUNT(*) as total_cpts,
        COUNT(CASE WHEN active = true THEN 1 END) as active_cpts,
        COUNT(CASE WHEN slug LIKE 'ds_%' THEN 1 END) as dropshipping_cpts
      FROM custom_post_types
    `;
    const countResult = await client.query(countQuery);
    console.log('\n📊 CPT Statistics:');
    console.table(countResult.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Database connection refused. Check your database settings.');
    }
  } finally {
    await client.end();
    console.log('\n✨ Database operation completed!');
  }
}

// Run the fix
fixDropshippingCPTs();