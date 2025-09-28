#!/usr/bin/env node

/**
 * Script to initialize Dropshipping CPTs in the database
 * This will register all dropshipping custom post types
 */

import axios from 'axios';

// API configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''; // 필요시 토큰 설정

async function initializeDropshippingCPTs() {
  try {
    console.log('🔄 Initializing Dropshipping CPTs...');
    console.log('   API URL:', API_BASE_URL);

    // Option 1: Try dropshipping specific initialization
    try {
      const response1 = await axios.post(
        `${API_BASE_URL}/api/cpt/dropshipping/initialize`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` })
          }
        }
      );
      
      if (response1.data.success) {
        console.log('✅ Dropshipping CPTs initialized successfully via dropshipping route');
        console.log('   Response:', response1.data.message);
        return;
      }
    } catch (error) {
      console.log('⚠️  Dropshipping route not available, trying migration route...');
    }

    // Option 2: Try migration route
    try {
      const response2 = await axios.post(
        `${API_BASE_URL}/api/migration/initialize`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` })
          }
        }
      );
      
      if (response2.data.success) {
        console.log('✅ Dropshipping CPTs initialized successfully via migration route');
        console.log('   Response:', response2.data.message);
        return;
      }
    } catch (error) {
      console.log('⚠️  Migration route not available, trying general CPT route...');
    }

    // Option 3: Try general CPT initialization
    try {
      const response3 = await axios.post(
        `${API_BASE_URL}/api/cpt/initialize`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` })
          }
        }
      );
      
      if (response3.data.success) {
        console.log('✅ CPTs initialized successfully via general route');
        console.log('   Response:', response3.data.message);
        return;
      }
    } catch (error) {
      console.log('⚠️  General CPT route not available');
    }

    // Option 4: Manually create each CPT
    console.log('📝 Attempting to manually create CPTs...');
    
    const cpts = [
      {
        slug: 'ds_supplier',
        name: '공급자',
        description: '드롭쉬핑 상품 공급자',
        icon: 'store',
        menuPosition: 25,
        public: false,
        hasArchive: false,
        showInMenu: true,
        supports: ['title', 'editor', 'custom-fields', 'revisions'],
        taxonomies: [],
        active: true
      },
      {
        slug: 'ds_partner',
        name: '파트너',
        description: '드롭쉬핑 제휴 파트너',
        icon: 'groups',
        menuPosition: 26,
        public: false,
        hasArchive: false,
        showInMenu: true,
        supports: ['title', 'editor', 'custom-fields', 'revisions', 'thumbnail'],
        taxonomies: [],
        active: true
      },
      {
        slug: 'ds_product',
        name: '드롭쉬핑 상품',
        description: '드롭쉬핑 플랫폼 상품',
        icon: 'cart',
        menuPosition: 24,
        public: true,
        hasArchive: true,
        showInMenu: true,
        supports: ['title', 'editor', 'custom-fields', 'revisions', 'thumbnail', 'excerpt'],
        taxonomies: ['ds_product_category', 'ds_product_tag'],
        active: true
      },
      {
        slug: 'ds_commission_policy',
        name: '수수료 정책',
        description: '드롭쉬핑 수수료 정책',
        icon: 'money-alt',
        menuPosition: 27,
        public: false,
        hasArchive: false,
        showInMenu: true,
        supports: ['title', 'editor', 'custom-fields', 'revisions'],
        taxonomies: [],
        active: true
      }
    ];

    let successCount = 0;
    for (const cpt of cpts) {
      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/cpt/types`,
          cpt,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` })
            }
          }
        );
        
        if (response.data.success) {
          console.log(`   ✅ Created CPT: ${cpt.name} (${cpt.slug})`);
          successCount++;
        }
      } catch (error) {
        if (error.response?.data?.error?.includes('already exists')) {
          console.log(`   ℹ️  CPT already exists: ${cpt.name} (${cpt.slug})`);
          successCount++;
        } else {
          console.log(`   ❌ Failed to create CPT: ${cpt.name} - ${error.response?.data?.error || error.message}`);
        }
      }
    }

    if (successCount === cpts.length) {
      console.log('\n✅ All Dropshipping CPTs are registered successfully!');
    } else {
      console.log(`\n⚠️  ${successCount}/${cpts.length} CPTs registered`);
    }

  } catch (error) {
    console.error('❌ Error initializing Dropshipping CPTs:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Check current CPTs
async function checkCurrentCPTs() {
  try {
    console.log('\n📊 Checking current CPTs...');
    
    const response = await axios.get(
      `${API_BASE_URL}/api/cpt/types`,
      {
        headers: {
          ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` })
        }
      }
    );

    if (response.data.success && response.data.data) {
      const dropshippingCPTs = response.data.data.filter(cpt => 
        cpt.slug?.startsWith('ds_')
      );
      
      console.log(`   Found ${response.data.data.length} total CPTs`);
      console.log(`   Found ${dropshippingCPTs.length} dropshipping CPTs`);
      
      if (dropshippingCPTs.length > 0) {
        console.log('\n   Dropshipping CPTs:');
        dropshippingCPTs.forEach(cpt => {
          console.log(`     - ${cpt.name} (${cpt.slug}) - Active: ${cpt.active}`);
        });
      }
    }
  } catch (error) {
    console.log('   ⚠️  Could not fetch current CPTs:', error.message);
  }
}

// Main execution
(async () => {
  console.log('🚀 Dropshipping CPT Initialization Script');
  console.log('=========================================\n');
  
  // First check current state
  await checkCurrentCPTs();
  
  // Initialize CPTs
  await initializeDropshippingCPTs();
  
  // Check state after initialization
  await checkCurrentCPTs();
  
  console.log('\n✨ Script completed!');
})();