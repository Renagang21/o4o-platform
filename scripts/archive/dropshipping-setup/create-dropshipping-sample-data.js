/**
 * 드롭쉬핑 CPT 샘플 데이터 생성 스크립트
 * 각 CPT에 실제 테스트용 데이터 입력
 */

import axios from 'axios';

const API_URL = 'http://localhost:4000/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAxOTQ3N2Y3LWVjMDktNzA5OC05YWY1LWRlNjcxMTU4YmQzOCIsImVtYWlsIjoiYWRtaW5Abmv0dXJlLmNvLmtyIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzM1NDc1MTg4LCJleHAiOjE3MzYwNzk5ODh9.8M9vBB-IxQzbCjOX9L8DLp0-G-GvdD2Y5hQOJcQ4Lro';

// 생성된 데이터를 저장할 객체
const createdData = {
  suppliers: [],
  policies: [],
  partners: [],
  products: []
};

// 1. 공급자 샘플 데이터
const supplierSamples = [
  {
    title: '삼성전자 공식 공급자',
    slug: 'samsung-supplier',
    content: '삼성전자 제품 공식 드롭쉬핑 공급자입니다.',
    status: 'publish',
    custom_fields: {
      company_name: '삼성전자 주식회사',
      contact: '02-1234-5678',
      email: 'dropship@samsung.com',
      business_number: '124-81-00998',
      address: '경기도 수원시 영통구 삼성로 129',
      representative: '김철수',
      approval_status: 'approved',
      api_info: JSON.stringify({
        endpoint: 'https://api.samsung.com/dropship',
        api_key: 'samsung_api_key_2024',
        secret: 'samsung_secret_key'
      }),
      default_commission_rate: 15
    }
  },
  {
    title: 'LG전자 드롭쉬핑 파트너',
    slug: 'lg-supplier',
    content: 'LG전자 가전제품 드롭쉬핑 공급 파트너',
    status: 'publish',
    custom_fields: {
      company_name: 'LG전자 주식회사',
      contact: '02-3777-1114',
      email: 'partner@lg.com',
      business_number: '107-86-14075',
      address: '서울특별시 영등포구 여의대로 128',
      representative: '이영희',
      approval_status: 'approved',
      api_info: JSON.stringify({
        endpoint: 'https://api.lg.com/b2b/dropship',
        api_key: 'lg_dropship_2024',
        secret: 'lg_secret_2024'
      }),
      default_commission_rate: 12
    }
  },
  {
    title: '쿠팡 셀러스 공급자',
    slug: 'coupang-supplier',
    content: '쿠팡 셀러스를 통한 드롭쉬핑 공급',
    status: 'publish',
    custom_fields: {
      company_name: '쿠팡 주식회사',
      contact: '1577-7011',
      email: 'sellers@coupang.com',
      business_number: '120-88-00767',
      address: '서울특별시 송파구 송파대로 570',
      representative: '박민수',
      approval_status: 'pending',
      api_info: JSON.stringify({
        endpoint: 'https://api.coupang.com/v1/dropship',
        api_key: 'coupang_seller_key',
        secret: 'coupang_seller_secret'
      }),
      default_commission_rate: 18
    }
  }
];

// 2. 수수료 정책 샘플 데이터
const policyData = [
  {
    title: '프리미엄 파트너 수수료 정책',
    slug: 'premium-partner-policy',
    content: '프리미엄 파트너를 위한 특별 수수료 정책',
    status: 'publish',
    custom_fields: {
      commission_rate: 8,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      minimum_order_amount: 1000000,
      policy_type: 'vip',
      conditions: '월 매출 1억원 이상 파트너에게 적용되는 VIP 수수료율',
      is_active: true
    }
  },
  {
    title: '신규 파트너 프로모션',
    slug: 'new-partner-promotion',
    content: '신규 파트너를 위한 프로모션 수수료 정책',
    status: 'publish',
    custom_fields: {
      commission_rate: 5,
      start_date: '2024-01-01',
      end_date: '2024-06-30',
      minimum_order_amount: 0,
      policy_type: 'promotional',
      conditions: '신규 가입 후 6개월간 적용되는 프로모션 수수료',
      is_active: true
    }
  },
  {
    title: '표준 수수료 정책',
    slug: 'standard-policy',
    content: '일반 파트너를 위한 표준 수수료 정책',
    status: 'publish',
    custom_fields: {
      commission_rate: 10,
      start_date: '2024-01-01',
      end_date: null,
      minimum_order_amount: 100000,
      policy_type: 'standard',
      conditions: '모든 일반 파트너에게 적용되는 기본 수수료',
      is_active: true
    }
  }
];

// 3. 파트너 샘플 데이터
const partnerData = [
  {
    title: '골드 파트너 - 김스토어',
    slug: 'kim-store-partner',
    content: '온라인 쇼핑몰 운영 골드 파트너',
    status: 'publish',
    custom_fields: {
      partner_grade: 'gold',
      referral_code: 'KIM2024GOLD',
      partner_email: 'kim@kimstore.com',
      partner_phone: '010-1234-5678',
      social_media: '인스타그램: @kimstore_official\n유튜브: 김스토어TV\n페이스북: /kimstore',
      settlement_info: '국민은행 / 123-456-789012 / 김철수',
      total_sales: 150000000,
      total_commission: 15000000,
      partner_status: 'active',
      join_date: '2023-06-15'
    }
  },
  {
    title: '실버 파트너 - 이커머스',
    slug: 'lee-commerce-partner',
    content: '이커머스 플랫폼 운영 실버 파트너',
    status: 'publish',
    custom_fields: {
      partner_grade: 'silver',
      referral_code: 'LEE2024SILVER',
      partner_email: 'contact@leecommerce.kr',
      partner_phone: '010-2345-6789',
      social_media: '인스타그램: @lee_commerce\n네이버 블로그: blog.naver.com/leecommerce',
      settlement_info: '신한은행 / 987-654-321098 / 이영희',
      total_sales: 75000000,
      total_commission: 7500000,
      partner_status: 'active',
      join_date: '2023-09-20'
    }
  },
  {
    title: '브론즈 파트너 - 박셀러',
    slug: 'park-seller-partner',
    content: '소규모 온라인 판매 브론즈 파트너',
    status: 'publish',
    custom_fields: {
      partner_grade: 'bronze',
      referral_code: 'PARK2024BRONZE',
      partner_email: 'park@parkseller.com',
      partner_phone: '010-3456-7890',
      social_media: '인스타그램: @park_seller',
      settlement_info: '우리은행 / 555-666-777888 / 박민수',
      total_sales: 25000000,
      total_commission: 2500000,
      partner_status: 'active',
      join_date: '2024-01-10'
    }
  }
];

// 4. 상품 샘플 데이터
const productData = [
  {
    title: '삼성 갤럭시 S24 Ultra',
    slug: 'samsung-galaxy-s24-ultra',
    content: '최신 플래그십 스마트폰',
    status: 'publish',
    custom_fields: {
      sku: 'SM-S928N',
      price: 1698000,
      cost_price: 1400000,
      stock: 50,
      shipping_info: '당일배송 가능 / 배송비 무료',
      weight: 0.233,
      dimensions: '16.2x7.9x0.89'
    }
  },
  {
    title: 'LG 올레드 TV 65인치',
    slug: 'lg-oled-tv-65',
    content: '프리미엄 OLED TV',
    status: 'publish',
    custom_fields: {
      sku: 'OLED65C3KNA',
      price: 3490000,
      cost_price: 2800000,
      stock: 20,
      shipping_info: '설치배송 / 배송비 무료',
      weight: 25.3,
      dimensions: '144.8x83.0x4.5'
    }
  },
  {
    title: '삼성 비스포크 냉장고',
    slug: 'samsung-bespoke-fridge',
    content: '맞춤형 디자인 냉장고',
    status: 'publish',
    custom_fields: {
      sku: 'RF85B9111AP',
      price: 4190000,
      cost_price: 3500000,
      stock: 15,
      shipping_info: '설치배송 / 배송비 무료',
      weight: 145,
      dimensions: '91.2x178.6x71.6'
    }
  },
  {
    title: 'LG 그램 17인치 노트북',
    slug: 'lg-gram-17',
    content: '초경량 대화면 노트북',
    status: 'publish',
    custom_fields: {
      sku: '17Z90R-GA56K',
      price: 2199000,
      cost_price: 1800000,
      stock: 30,
      shipping_info: '익일배송 / 배송비 무료',
      weight: 1.35,
      dimensions: '38.0x26.0x1.75'
    }
  },
  {
    title: '삼성 갤럭시 워치6',
    slug: 'samsung-galaxy-watch6',
    content: '스마트워치 최신 모델',
    status: 'publish',
    custom_fields: {
      sku: 'SM-R940NZKAKOO',
      price: 399000,
      cost_price: 320000,
      stock: 100,
      shipping_info: '당일배송 가능 / 배송비 3000원',
      weight: 0.052,
      dimensions: '4.3x4.3x0.9'
    }
  }
];

// API 호출 함수
async function createCPTPost(cptSlug, postData) {
  try {
    const response = await axios.post(
      `${API_URL}/cpt/${cptSlug}/posts`,
      postData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`
        }
      }
    );
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    console.error(`Error creating ${cptSlug} post:`, errorMessage);
    throw new Error(errorMessage);
  }
}

// 모든 샘플 데이터 생성
async function createAllSampleData() {
  console.log('🚀 Starting creation of dropshipping sample data...\n');
  
  // 1. Create Suppliers
  console.log('📦 Creating Suppliers...');
  for (const supplier of supplierSamples) {
    try {
      const result = await createCPTPost('ds_supplier', supplier);
      createdData.suppliers.push(result);
      console.log(`✅ Created supplier: ${supplier.title}`);
    } catch (error) {
      console.error(`❌ Failed to create supplier: ${supplier.title}`);
    }
  }
  
  // 2. Create Commission Policies with supplier relationships
  console.log('\n💰 Creating Commission Policies...');
  for (let i = 0; i < policyData.length; i++) {
    const policy = { ...policyData[i] };
    
    // Add supplier relationships
    if (createdData.suppliers.length > 0) {
      policy.custom_fields.target_suppliers = createdData.suppliers.map(s => s.id);
    }
    
    try {
      const result = await createCPTPost('ds_commission_policy', policy);
      createdData.policies.push(result);
      console.log(`✅ Created policy: ${policy.title}`);
    } catch (error) {
      console.error(`❌ Failed to create policy: ${policy.title}`);
    }
  }
  
  // 3. Create Partners with commission policy relationships
  console.log('\n👥 Creating Partners...');
  for (let i = 0; i < partnerData.length; i++) {
    const partner = { ...partnerData[i] };
    
    // Add commission policy relationship (assign different policies to different partners)
    if (createdData.policies.length > 0) {
      partner.custom_fields.applied_commission_policy = createdData.policies[i % createdData.policies.length].id;
    }
    
    try {
      const result = await createCPTPost('ds_partner', partner);
      createdData.partners.push(result);
      console.log(`✅ Created partner: ${partner.title}`);
    } catch (error) {
      console.error(`❌ Failed to create partner: ${partner.title}`);
    }
  }
  
  // Update policies with partner relationships
  console.log('\n🔗 Updating policies with partner relationships...');
  for (let i = 0; i < createdData.policies.length; i++) {
    const policy = createdData.policies[i];
    if (createdData.partners.length > 0) {
      try {
        await axios.put(
          `${API_URL}/cpt/ds_commission_policy/posts/${policy.id}`,
          {
            ...policy,
            custom_fields: {
              ...policy.custom_fields,
              target_partners: createdData.partners.map(p => p.id)
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${TOKEN}`
            }
          }
        );
        console.log(`✅ Updated policy with partners: ${policy.title}`);
      } catch (error) {
        console.error(`❌ Failed to update policy: ${policy.title}`);
      }
    }
  }
  
  // 4. Create Products with supplier and policy relationships
  console.log('\n📱 Creating Products...');
  for (let i = 0; i < productData.length; i++) {
    const product = { ...productData[i] };
    
    // Add supplier relationship (distribute products among suppliers)
    if (createdData.suppliers.length > 0) {
      product.custom_fields.supplier = createdData.suppliers[i % createdData.suppliers.length].id;
    }
    
    // Add commission policy relationship (some products have specific policies)
    if (createdData.policies.length > 0 && i % 2 === 0) {
      product.custom_fields.commission_policy = createdData.policies[i % createdData.policies.length].id;
    }
    
    try {
      const result = await createCPTPost('ds_product', product);
      createdData.products.push(result);
      console.log(`✅ Created product: ${product.title}`);
    } catch (error) {
      console.error(`❌ Failed to create product: ${product.title}`);
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Created ${createdData.suppliers.length} suppliers`);
  console.log(`✅ Created ${createdData.policies.length} commission policies`);
  console.log(`✅ Created ${createdData.partners.length} partners`);
  console.log(`✅ Created ${createdData.products.length} products`);
  
  console.log('\n' + '='.repeat(60));
  console.log('🔗 RELATIONSHIPS CREATED');
  console.log('='.repeat(60));
  console.log('• Products linked to Suppliers');
  console.log('• Products linked to Commission Policies');
  console.log('• Commission Policies linked to Suppliers');
  console.log('• Commission Policies linked to Partners');
  console.log('• Partners linked to Commission Policies');
  
  console.log('\n✨ Sample data creation complete!');
  console.log('📌 Visit the admin dashboard to view and test the data');
  
  // Return created data for verification
  return createdData;
}

// 실행
createAllSampleData()
  .then(data => {
    console.log('\n📋 Created Data IDs for reference:');
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(console.error);