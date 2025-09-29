/**
 * 드롭쉬핑 CPT 필드 그룹 생성 스크립트
 * 5개의 CPT에 대한 완전한 필드 구성
 */

import axios from 'axios';

const API_URL = 'http://localhost:3002/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjAxOTQ3N2Y3LWVjMDktNzA5OC05YWY1LWRlNjcxMTU4YmQzOCIsImVtYWlsIjoiYWRtaW5Abmv0dXJlLmNvLmtyIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzM1NDc1MTg4LCJleHAiOjE3MzYwNzk5ODh9.8M9vBB-IxQzbCjOX9L8DLp0-G-GvdD2Y5hQOJcQ4Lro'; // Replace with actual token

// 필드 그룹 정의
const fieldGroups = [
  // 1. ds_supplier (공급자) 필드 그룹
  {
    title: '공급자 기본 정보',
    description: '드롭쉬핑 공급자 기본 정보 관리',
    postTypes: ['ds_supplier'],
    position: 'normal',
    style: 'default',
    isActive: true,
    fields: [
      {
        id: 'field_company_name',
        name: 'company_name',
        label: '회사명',
        type: 'text',
        required: true,
        placeholder: '공급자 회사명을 입력하세요',
        order: 0
      },
      {
        id: 'field_contact',
        name: 'contact',
        label: '연락처',
        type: 'text',
        required: true,
        placeholder: '대표 연락처',
        order: 1
      },
      {
        id: 'field_email',
        name: 'email',
        label: '이메일',
        type: 'email',
        required: true,
        placeholder: 'contact@company.com',
        order: 2
      },
      {
        id: 'field_business_number',
        name: 'business_number',
        label: '사업자번호',
        type: 'text',
        required: true,
        placeholder: '000-00-00000',
        order: 3
      },
      {
        id: 'field_address',
        name: 'address',
        label: '주소',
        type: 'textarea',
        placeholder: '사업장 주소',
        order: 4
      },
      {
        id: 'field_representative',
        name: 'representative',
        label: '담당자',
        type: 'text',
        placeholder: '담당자 이름',
        order: 5
      },
      {
        id: 'field_approval_status',
        name: 'approval_status',
        label: '승인상태',
        type: 'select',
        required: true,
        defaultValue: 'pending',
        options: {
          choices: ['pending', 'approved', 'rejected', 'suspended']
        },
        order: 6
      },
      {
        id: 'field_api_info',
        name: 'api_info',
        label: 'API 정보',
        type: 'textarea',
        placeholder: 'API 연동 정보 (JSON 형식)',
        description: 'API 키, 엔드포인트 등의 정보를 JSON 형식으로 입력',
        order: 7
      },
      {
        id: 'field_default_commission_rate',
        name: 'default_commission_rate',
        label: '기본수수료율 (%)',
        type: 'number',
        defaultValue: 10,
        options: {
          min: 0,
          max: 100
        },
        order: 8
      }
    ]
  },

  // 2. ds_product (드롭쉬핑 상품) 필드 그룹
  {
    title: '드롭쉬핑 상품 정보',
    description: '드롭쉬핑 상품 상세 정보 및 관계 설정',
    postTypes: ['ds_product'],
    position: 'normal',
    style: 'default',
    isActive: true,
    fields: [
      {
        id: 'field_sku',
        name: 'sku',
        label: 'SKU',
        type: 'text',
        required: true,
        placeholder: 'PROD-001',
        description: '상품 고유 식별자',
        order: 0
      },
      {
        id: 'field_price',
        name: 'price',
        label: '가격',
        type: 'number',
        required: true,
        defaultValue: 0,
        options: {
          min: 0
        },
        order: 1
      },
      {
        id: 'field_cost_price',
        name: 'cost_price',
        label: '원가',
        type: 'number',
        required: true,
        defaultValue: 0,
        options: {
          min: 0
        },
        order: 2
      },
      {
        id: 'field_stock',
        name: 'stock',
        label: '재고',
        type: 'number',
        defaultValue: 0,
        options: {
          min: 0
        },
        order: 3
      },
      {
        id: 'field_shipping_info',
        name: 'shipping_info',
        label: '배송정보',
        type: 'textarea',
        placeholder: '배송 방법, 소요 시간 등',
        order: 4
      },
      {
        id: 'field_supplier',
        name: 'supplier',
        label: '공급자',
        type: 'relationship',
        required: true,
        description: '이 상품의 공급자를 선택하세요',
        options: {
          postType: 'ds_supplier',
          multiple: false,
          searchable: true
        },
        order: 5
      },
      {
        id: 'field_commission_policy',
        name: 'commission_policy',
        label: '수수료 정책',
        type: 'relationship',
        required: false,
        description: '적용할 수수료 정책을 선택하세요 (선택사항)',
        options: {
          postType: 'ds_commission_policy',
          multiple: false,
          searchable: true
        },
        order: 6
      },
      {
        id: 'field_weight',
        name: 'weight',
        label: '무게 (kg)',
        type: 'number',
        defaultValue: 0,
        options: {
          min: 0,
          step: 0.1
        },
        order: 7
      },
      {
        id: 'field_dimensions',
        name: 'dimensions',
        label: '크기 (가로x세로x높이 cm)',
        type: 'text',
        placeholder: '30x20x10',
        order: 8
      }
    ]
  },

  // 3. ds_commission_policy (수수료 정책) 필드 그룹
  {
    title: '수수료 정책 설정',
    description: '드롭쉬핑 수수료 정책 상세 설정',
    postTypes: ['ds_commission_policy'],
    position: 'normal',
    style: 'default',
    isActive: true,
    fields: [
      {
        id: 'field_commission_rate',
        name: 'commission_rate',
        label: '수수료율 (%)',
        type: 'number',
        required: true,
        defaultValue: 10,
        options: {
          min: 0,
          max: 100,
          step: 0.1
        },
        order: 0
      },
      {
        id: 'field_start_date',
        name: 'start_date',
        label: '시작일',
        type: 'date',
        required: true,
        description: '정책 적용 시작일',
        order: 1
      },
      {
        id: 'field_end_date',
        name: 'end_date',
        label: '종료일',
        type: 'date',
        description: '정책 적용 종료일 (비워두면 무기한)',
        order: 2
      },
      {
        id: 'field_minimum_order_amount',
        name: 'minimum_order_amount',
        label: '최소주문금액',
        type: 'number',
        defaultValue: 0,
        description: '이 정책이 적용되는 최소 주문 금액',
        options: {
          min: 0
        },
        order: 3
      },
      {
        id: 'field_target_suppliers',
        name: 'target_suppliers',
        label: '대상 공급자',
        type: 'relationship',
        required: false,
        description: '이 정책이 적용될 공급자들을 선택하세요',
        options: {
          postType: 'ds_supplier',
          multiple: true,
          searchable: true
        },
        order: 4
      },
      {
        id: 'field_target_partners',
        name: 'target_partners',
        label: '대상 파트너',
        type: 'relationship',
        required: false,
        description: '이 정책이 적용될 파트너들을 선택하세요 (선택사항)',
        options: {
          postType: 'ds_partner',
          multiple: true,
          searchable: true
        },
        order: 5
      },
      {
        id: 'field_policy_type',
        name: 'policy_type',
        label: '정책 유형',
        type: 'select',
        required: true,
        defaultValue: 'standard',
        options: {
          choices: ['standard', 'promotional', 'vip', 'seasonal', 'special']
        },
        order: 6
      },
      {
        id: 'field_conditions',
        name: 'conditions',
        label: '추가 조건',
        type: 'textarea',
        placeholder: '정책 적용을 위한 추가 조건이나 설명',
        order: 7
      },
      {
        id: 'field_is_active',
        name: 'is_active',
        label: '활성화',
        type: 'true_false',
        defaultValue: true,
        description: '이 정책을 즉시 활성화합니다',
        order: 8
      }
    ]
  },

  // 4. ds_partner (파트너) 필드 그룹
  {
    title: '파트너 정보',
    description: '드롭쉬핑 파트너/리셀러 정보 관리',
    postTypes: ['ds_partner'],
    position: 'normal',
    style: 'default',
    isActive: true,
    fields: [
      {
        id: 'field_partner_grade',
        name: 'partner_grade',
        label: '파트너 등급',
        type: 'select',
        required: true,
        defaultValue: 'bronze',
        options: {
          choices: ['bronze', 'silver', 'gold', 'platinum', 'diamond']
        },
        order: 0
      },
      {
        id: 'field_referral_code',
        name: 'referral_code',
        label: '추천코드',
        type: 'text',
        required: true,
        placeholder: 'PARTNER001',
        description: '파트너 고유 추천 코드',
        order: 1
      },
      {
        id: 'field_partner_email',
        name: 'partner_email',
        label: '이메일',
        type: 'email',
        required: true,
        placeholder: 'partner@example.com',
        order: 2
      },
      {
        id: 'field_partner_phone',
        name: 'partner_phone',
        label: '전화번호',
        type: 'text',
        required: true,
        placeholder: '010-0000-0000',
        order: 3
      },
      {
        id: 'field_social_media',
        name: 'social_media',
        label: 'SNS 정보',
        type: 'textarea',
        placeholder: '인스타그램, 페이스북, 유튜브 등 SNS 계정 정보',
        order: 4
      },
      {
        id: 'field_settlement_info',
        name: 'settlement_info',
        label: '정산정보',
        type: 'textarea',
        required: true,
        placeholder: '은행명, 계좌번호, 예금주 등',
        description: '파트너 수수료 정산을 위한 정보',
        order: 5
      },
      {
        id: 'field_applied_commission_policy',
        name: 'applied_commission_policy',
        label: '적용 수수료 정책',
        type: 'relationship',
        required: false,
        description: '이 파트너에게 적용되는 수수료 정책',
        options: {
          postType: 'ds_commission_policy',
          multiple: false,
          searchable: true
        },
        order: 6
      },
      {
        id: 'field_total_sales',
        name: 'total_sales',
        label: '총 판매액',
        type: 'number',
        defaultValue: 0,
        options: {
          min: 0
        },
        order: 7
      },
      {
        id: 'field_total_commission',
        name: 'total_commission',
        label: '총 수수료',
        type: 'number',
        defaultValue: 0,
        options: {
          min: 0
        },
        order: 8
      },
      {
        id: 'field_partner_status',
        name: 'partner_status',
        label: '파트너 상태',
        type: 'select',
        required: true,
        defaultValue: 'active',
        options: {
          choices: ['pending', 'active', 'inactive', 'suspended']
        },
        order: 9
      },
      {
        id: 'field_join_date',
        name: 'join_date',
        label: '가입일',
        type: 'date',
        required: true,
        defaultValue: new Date().toISOString().split('T')[0],
        order: 10
      }
    ]
  }
];

// API 호출 함수
async function createFieldGroup(fieldGroup) {
  try {
    const response = await axios.post(
      `${API_URL}/cpt/field-groups`,
      fieldGroup,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TOKEN}`
        }
      }
    );

    return response.data.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message;
    console.error(`Error creating field group "${fieldGroup.title}":`, errorMessage);
    throw new Error(errorMessage);
  }
}

// 모든 필드 그룹 생성
async function createAllFieldGroups() {
  console.log('🚀 Starting creation of dropshipping field groups...\n');
  
  const results = {
    success: [],
    failed: []
  };

  for (const fieldGroup of fieldGroups) {
    try {
      console.log(`Creating field group: "${fieldGroup.title}"...`);
      const created = await createFieldGroup(fieldGroup);
      console.log(`✅ Successfully created: "${fieldGroup.title}" (ID: ${created.id})`);
      results.success.push({
        title: fieldGroup.title,
        id: created.id,
        postTypes: fieldGroup.postTypes,
        fieldsCount: fieldGroup.fields.length
      });
    } catch (error) {
      console.error(`❌ Failed to create: "${fieldGroup.title}"`);
      results.failed.push({
        title: fieldGroup.title,
        error: error.message
      });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  if (results.success.length > 0) {
    console.log(`\n✅ Successfully created ${results.success.length} field groups:`);
    results.success.forEach(item => {
      console.log(`   - ${item.title} (${item.fieldsCount} fields) for ${item.postTypes.join(', ')}`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed to create ${results.failed.length} field groups:`);
    results.failed.forEach(item => {
      console.log(`   - ${item.title}: ${item.error}`);
    });
  }

  // Print relationship summary
  console.log('\n' + '='.repeat(60));
  console.log('🔗 RELATIONSHIP FIELDS CREATED');
  console.log('='.repeat(60));
  console.log('1. ds_product → ds_supplier (Required: 공급자 선택)');
  console.log('2. ds_product → ds_commission_policy (Optional: 수수료 정책)');
  console.log('3. ds_commission_policy → ds_supplier[] (Multiple: 대상 공급자들)');
  console.log('4. ds_commission_policy → ds_partner[] (Multiple: 대상 파트너들)');
  console.log('5. ds_partner → ds_commission_policy (Optional: 적용 수수료 정책)');
  
  console.log('\n✨ Field groups setup complete!');
}

// 실행
createAllFieldGroups().catch(console.error);