import { FieldGroup, CustomField } from '../../entities/CustomField';
import { AppDataSource } from '../../database/connection';
import { LocationRule } from '../../entities/CustomField';
import { logger } from '../../utils/logger';

export const DROPSHIPPING_ACF_GROUPS = [
  {
    name: 'ds_product_pricing',
    title: '가격 정보',
    position: 'side',
    style: 'default',
    label_placement: 'top',
    instruction_placement: 'label',
    location: [
      {
        param: 'post_type',
        operator: '==',
        value: 'ds_product'
      }
    ],
    fields: [
      {
        key: 'field_cost_price',
        label: '공급가',
        name: 'cost_price',
        type: 'number',
        required: true,
        default_value: 0,
        placeholder: '공급자로부터의 구매 가격',
        prepend: '₩',
        min: 0,
        step: 1000,
        instructions: '공급자로부터 구매하는 가격을 입력하세요'
      },
      {
        key: 'field_msrp',
        label: 'MSRP (권장 소비자 가격)',
        name: 'msrp',
        type: 'number',
        required: true,
        default_value: 0,
        placeholder: '제조업체 권장 소비자 가격',
        prepend: '₩',
        min: 0,
        step: 1000,
        instructions: '🚨 법률 준수: 이는 권장 가격이며, 실제 판매가는 판매자가 자율적으로 결정합니다'
      },
      {
        key: 'field_margin_rate',
        label: '권장 마진율 (%)',
        name: 'margin_rate',
        type: 'text',
        readonly: true,
        default_value: '0',
        append: '%',
        instructions: '자동 계산됨: (MSRP - 공급가) / MSRP × 100 (참고용)',
        wrapper: {
          class: 'acf-margin-rate-display'
        }
      },
      {
        key: 'field_partner_commission_rate',
        label: '파트너 수수료율 (%)',
        name: 'partner_commission_rate',
        type: 'number',
        required: true,
        default_value: 5,
        min: 0,
        max: 50,
        step: 0.5,
        append: '%',
        instructions: '파트너에게 지급할 수수료율을 설정하세요'
      },
      {
        key: 'field_price_autonomy_notice',
        label: '가격 결정 안내',
        name: 'price_autonomy_notice',
        type: 'message',
        message: '🏛️ <strong>공정거래법 준수</strong><br/>• MSRP는 권장 가격입니다<br/>• 실제 판매가는 판매자가 자율적으로 결정<br/>• 가격 지정은 법적으로 금지됩니다',
        wrapper: {
          class: 'legal-notice'
        }
      }
    ]
  },
  {
    name: 'ds_product_supplier',
    title: '공급자 정보',
    position: 'side',
    style: 'default',
    location: [
      {
        param: 'post_type',
        operator: '==',
        value: 'ds_product'
      }
    ],
    fields: [
      {
        key: 'field_supplier',
        label: '공급자',
        name: 'supplier',
        type: 'relationship',
        required: true,
        post_type: ['ds_supplier'],
        filters: ['search'],
        max: 1,
        return_format: 'object',
        instructions: '이 상품의 공급자를 선택하세요'
      },
      {
        key: 'field_supplier_sku',
        label: '공급자 상품코드',
        name: 'supplier_sku',
        type: 'text',
        placeholder: 'SUP-12345',
        instructions: '공급자의 상품 관리 코드'
      }
    ]
  },
  {
    name: 'ds_product_shipping',
    title: '배송 정보',
    position: 'normal',
    style: 'default',
    location: [
      {
        param: 'post_type',
        operator: '==',
        value: 'ds_product'
      }
    ],
    fields: [
      {
        key: 'field_shipping_days_min',
        label: '최소 배송일',
        name: 'shipping_days_min',
        type: 'number',
        default_value: 3,
        min: 1,
        max: 30,
        append: '일',
        wrapper: {
          width: '50'
        }
      },
      {
        key: 'field_shipping_days_max',
        label: '최대 배송일',
        name: 'shipping_days_max',
        type: 'number',
        default_value: 7,
        min: 1,
        max: 30,
        append: '일',
        wrapper: {
          width: '50'
        }
      },
      {
        key: 'field_shipping_fee',
        label: '배송비',
        name: 'shipping_fee',
        type: 'number',
        default_value: 0,
        min: 0,
        prepend: '₩',
        step: 500,
        instructions: '0원 입력 시 무료배송'
      }
    ]
  },
  {
    name: 'ds_supplier_info',
    title: '공급자 정보',
    position: 'normal',
    style: 'default',
    location: [
      {
        param: 'post_type',
        operator: '==',
        value: 'ds_supplier'
      }
    ],
    fields: [
      {
        key: 'field_supplier_email',
        label: '이메일',
        name: 'supplier_email',
        type: 'email',
        required: true
      },
      {
        key: 'field_supplier_phone',
        label: '연락처',
        name: 'supplier_phone',
        type: 'text',
        placeholder: '010-0000-0000'
      },
      {
        key: 'field_supplier_business_number',
        label: '사업자등록번호',
        name: 'supplier_business_number',
        type: 'text',
        placeholder: '000-00-00000'
      },
      {
        key: 'field_supplier_api_key',
        label: 'API Key',
        name: 'supplier_api_key',
        type: 'text',
        instructions: 'API 연동을 위한 키'
      },
      {
        key: 'field_supplier_api_endpoint',
        label: 'API Endpoint',
        name: 'supplier_api_endpoint',
        type: 'url',
        instructions: 'API 엔드포인트 URL'
      },
      {
        key: 'field_supplier_role_permissions',
        label: '권한 안내',
        name: 'supplier_role_permissions',
        type: 'message',
        message: '📝 <strong>공급자 권한</strong><br/>• 공급가 설정 가능<br/>• MSRP (권장 소비자 가격) 제안 가능<br/>• 파트너 수수료율 설정 가능<br/>• 실제 판매가는 판매자가 자율 결정',
        wrapper: {
          class: 'supplier-permissions-notice'
        }
      }
    ]
  },
  {
    name: 'ds_supplier_pricing_management',
    title: '공급자 가격 관리',
    position: 'normal',
    style: 'default',
    location: [
      {
        param: 'post_type',
        operator: '==',
        value: 'ds_product'
      },
      {
        param: 'current_user_role',
        operator: '==',
        value: 'supplier'
      }
    ],
    fields: [
      {
        key: 'field_supplier_cost_price_edit',
        label: '공급가 (편집 가능)',
        name: 'cost_price_supplier_edit',
        type: 'number',
        required: true,
        default_value: 0,
        placeholder: '공급자로부터의 구매 가격',
        prepend: '₩',
        min: 0,
        step: 1000,
        instructions: '공급자가 직접 설정하는 구매 가격',
        conditional_logic: [
          [
            {
              field: 'current_user_role',
              operator: '==',
              value: 'supplier'
            }
          ]
        ]
      },
      {
        key: 'field_supplier_msrp_edit',
        label: 'MSRP (권장 소비자 가격) - 편집 가능',
        name: 'msrp_supplier_edit',
        type: 'number',
        required: true,
        default_value: 0,
        placeholder: '제조업체 권장 소비자 가격',
        prepend: '₩',
        min: 0,
        step: 1000,
        instructions: '🚨 법률 준수: 권장 가격만 제안하며, 실제 판매가는 판매자가 자율 결정',
        conditional_logic: [
          [
            {
              field: 'current_user_role',
              operator: '==',
              value: 'supplier'
            }
          ]
        ]
      },
      {
        key: 'field_supplier_commission_rate_edit',
        label: '파트너 수수료율 (%) - 편집 가능',
        name: 'partner_commission_rate_supplier_edit',
        type: 'number',
        required: true,
        default_value: 5,
        min: 0,
        max: 50,
        step: 0.5,
        append: '%',
        instructions: '공급자가 설정하는 파트너 수수료율',
        conditional_logic: [
          [
            {
              field: 'current_user_role',
              operator: '==',
              value: 'supplier'
            }
          ]
        ]
      },
      {
        key: 'field_supplier_pricing_notice',
        label: '가격 설정 안내',
        name: 'supplier_pricing_notice',
        type: 'message',
        message: '⚖️ <strong>공정거래법 준수 안내</strong><br/>• MSRP는 권장 가격입니다<br/>• 실제 판매가는 판매자(셀러)가 자율적으로 결정<br/>• 가격 지정이나 강제는 법적으로 금지됩니다<br/>• 변경사항은 관리자 승인 후 적용됩니다',
        wrapper: {
          class: 'legal-compliance-notice'
        },
        conditional_logic: [
          [
            {
              field: 'current_user_role',
              operator: '==',
              value: 'supplier'
            }
          ]
        ]
      }
    ]
  },
  {
    name: 'ds_partner_info',
    title: '파트너 정보',
    position: 'normal',
    style: 'default',
    location: [
      {
        param: 'post_type',
        operator: '==',
        value: 'ds_partner'
      }
    ],
    fields: [
      {
        key: 'field_partner_type',
        label: '파트너 유형',
        name: 'partner_type',
        type: 'select',
        choices: {
          individual: '개인',
          business: '사업자'
        },
        default_value: 'individual',
        required: true
      },
      {
        key: 'field_partner_grade',
        label: '파트너 등급',
        name: 'partner_grade',
        type: 'select',
        choices: {
          bronze: '브론즈',
          silver: '실버',
          gold: '골드',
          platinum: '플래티넘'
        },
        default_value: 'bronze',
        required: true
      },
      {
        key: 'field_partner_referral_code',
        label: '추천 코드',
        name: 'partner_referral_code',
        type: 'text',
        readonly: true,
        instructions: '자동 생성되는 고유 추천 코드'
      },
      {
        key: 'field_partner_commission_rate',
        label: '기본 수수료율 (%)',
        name: 'partner_commission_rate',
        type: 'number',
        default_value: 10,
        min: 0,
        max: 100,
        append: '%'
      }
    ]
  },
  {
    name: 'ds_commission_policy_details',
    title: '수수료 정책 상세',
    position: 'normal',
    style: 'default',
    location: [
      {
        param: 'post_type',
        operator: '==',
        value: 'ds_commission_policy'
      }
    ],
    fields: [
      {
        key: 'field_policy_supplier',
        label: '적용 공급자',
        name: 'policy_supplier',
        type: 'relationship',
        post_type: ['ds_supplier'],
        filters: ['search'],
        max: 1,
        return_format: 'object'
      },
      {
        key: 'field_policy_commission_rate',
        label: '수수료율 (%)',
        name: 'policy_commission_rate',
        type: 'number',
        required: true,
        min: 0,
        max: 100,
        append: '%'
      },
      {
        key: 'field_policy_partner_grade',
        label: '적용 파트너 등급',
        name: 'policy_partner_grade',
        type: 'checkbox',
        choices: {
          bronze: '브론즈',
          silver: '실버',
          gold: '골드',
          platinum: '플래티넘'
        },
        layout: 'horizontal'
      },
      {
        key: 'field_policy_min_order_amount',
        label: '최소 주문 금액',
        name: 'policy_min_order_amount',
        type: 'number',
        default_value: 0,
        min: 0,
        prepend: '₩',
        instructions: '이 금액 이상 주문 시 정책 적용'
      },
      {
        key: 'field_policy_start_date',
        label: '시작일',
        name: 'policy_start_date',
        type: 'date_picker',
        required: true,
        display_format: 'Y-m-d',
        return_format: 'Y-m-d'
      },
      {
        key: 'field_policy_end_date',
        label: '종료일',
        name: 'policy_end_date',
        type: 'date_picker',
        display_format: 'Y-m-d',
        return_format: 'Y-m-d',
        instructions: '비워두면 무기한'
      }
    ]
  },
  {
    name: 'ds_seller_autonomous_pricing',
    title: '판매자 자율 가격 결정',
    position: 'normal',
    style: 'default',
    location: [
      {
        param: 'post_type',
        operator: '==',
        value: 'ds_product'
      },
      {
        param: 'current_user_role',
        operator: '==',
        value: 'seller'
      }
    ],
    fields: [
      {
        key: 'field_seller_final_price',
        label: '판매가 (자율 결정)',
        name: 'seller_final_price',
        type: 'number',
        required: true,
        default_value: 0,
        placeholder: '내 판매 가격',
        prepend: '₩',
        min: 0,
        step: 100,
        instructions: '내가 자율적으로 결정하는 실제 판매 가격',
        conditional_logic: [
          [
            {
              field: 'current_user_role',
              operator: '==',
              value: 'seller'
            }
          ]
        ]
      },
      {
        key: 'field_seller_profit_margin',
        label: '예상 수익률 (%)',
        name: 'seller_profit_margin',
        type: 'text',
        readonly: true,
        default_value: '0',
        append: '%',
        instructions: '자동 계산됨: (판매가 - 공급가) / 판매가 × 100',
        wrapper: {
          class: 'seller-profit-margin-display'
        },
        conditional_logic: [
          [
            {
              field: 'current_user_role',
              operator: '==',
              value: 'seller'
            }
          ]
        ]
      },
      {
        key: 'field_msrp_comparison',
        label: 'MSRP 대비 비교',
        name: 'msrp_comparison',
        type: 'text',
        readonly: true,
        default_value: '참고용',
        instructions: 'MSRP는 제조업체 권장 가격입니다 (참고용)',
        wrapper: {
          class: 'msrp-reference-display'
        },
        conditional_logic: [
          [
            {
              field: 'current_user_role',
              operator: '==',
              value: 'seller'
            }
          ]
        ]
      },
      {
        key: 'field_seller_pricing_autonomy',
        label: '가격 자율성 보장',
        name: 'seller_pricing_autonomy',
        type: 'message',
        message: '🏦 <strong>가격 자율성 보장</strong><br/>• 법률에 따라 판매가를 자율적으로 결정할 권리가 있습니다<br/>• MSRP는 단순 참고용이며 강제성이 없습니다<br/>• 시장 상황과 경쟁력을 고려하여 가격을 설정하세요<br/>• 합리적인 수익을 보장하며 사업을 운영하세요',
        wrapper: {
          class: 'seller-autonomy-notice'
        },
        conditional_logic: [
          [
            {
              field: 'current_user_role',
              operator: '==',
              value: 'seller'
            }
          ]
        ]
      }
    ]
  }
];

export async function registerDropshippingACFFields() {
  const fieldGroupRepo = AppDataSource.getRepository(FieldGroup);
  const customFieldRepo = AppDataSource.getRepository(CustomField);
  
  for (const groupDef of DROPSHIPPING_ACF_GROUPS) {
    // Create or update field group
    let fieldGroup = await fieldGroupRepo.findOne({ where: { title: groupDef.title } });
    
    if (!fieldGroup) {
      fieldGroup = fieldGroupRepo.create({
        title: groupDef.title,
        description: `Dropshipping field group for ${groupDef.title}`,
        location: groupDef.location as LocationRule[],
        rules: null,
        options: {
          position: groupDef.position as 'normal' | 'side',
          style: groupDef.style as 'default' | 'seamless',
          labelPlacement: (groupDef.label_placement || 'top') as 'top' | 'left',
          instructionPlacement: (groupDef.instruction_placement || 'label') as 'label' | 'field'
        },
        placement: groupDef.position as 'normal' | 'side',
        active: true,
        order: 0
      });
      
      await fieldGroupRepo.save(fieldGroup);
      logger.info(`Created ACF field group: ${groupDef.title}`);
    }
    
    // Create fields for the group
    for (let i = 0; i < groupDef.fields.length; i++) {
      const fieldDef = groupDef.fields[i];
      
      const existingField = await customFieldRepo.findOne({ 
        where: { 
          name: fieldDef.name,
          groupId: fieldGroup.id 
        } 
      });
      
      if (!existingField) {
        // Map field type
        let fieldType = fieldDef.type;
        if (fieldDef.type === 'relationship') fieldType = 'post_object';
        if (fieldDef.type === 'true_false') fieldType = 'toggle';
        if (fieldDef.type === 'date_picker') fieldType = 'date';
        
        const field = customFieldRepo.create({
          name: fieldDef.name,
          label: fieldDef.label,
          type: fieldType as any,
          groupId: fieldGroup.id,
          order: i,
          description: (fieldDef as any).instructions || '',
          required: (fieldDef as any).required || false,
          defaultValue: String((fieldDef as any).default_value || ''),
          placeholder: (fieldDef as any).placeholder || '',
          min: (fieldDef as any).min,
          max: (fieldDef as any).max,
          step: (fieldDef as any).step ? Number((fieldDef as any).step) : undefined,
          options: (fieldDef as any).choices ? Object.entries((fieldDef as any).choices).map(([value, label]) => ({ value, label: String(label) })) : undefined,
          multiple: (fieldDef as any).max && (fieldDef as any).max > 1 ? true : false,
          validation: (fieldDef as any).readonly ? { custom: 'readonly' } : undefined
        });
        
        await customFieldRepo.save(field);
        logger.info(`Created ACF field: ${fieldDef.name}`);
      }
    }
  }
}

// Enhanced pricing calculation JavaScript (법률 준수 및 자율 가격)
export const PRICING_CALCULATION_SCRIPT = `
<script>
(function($) {
  'use strict';
  
  // Calculate MSRP-based margin for suppliers (공급자용)
  function calculateMSRPMargin() {
    var costPrice = parseFloat($('#acf-field_cost_price').val()) || 0;
    var msrp = parseFloat($('#acf-field_msrp').val()) || 0;
    
    var marginRate = 0;
    if (msrp > 0) {
      marginRate = ((msrp - costPrice) / msrp * 100).toFixed(2);
    }
    
    $('#acf-field_margin_rate').val(marginRate);
    
    // Update display with color coding (참고용)
    var $display = $('.acf-margin-rate-display .acf-input');
    if ($display.length) {
      $display.find('input').val(marginRate);
      
      // Color code based on margin (참고용)
      if (marginRate < 10) {
        $display.css('background-color', '#fee');
      } else if (marginRate < 20) {
        $display.css('background-color', '#ffe');
      } else {
        $display.css('background-color', '#efe');
      }
    }
  }
  
  // Calculate seller profit margin (판매자용)
  function calculateSellerProfit() {
    var costPrice = parseFloat($('#acf-field_cost_price').val()) || 0;
    var sellerPrice = parseFloat($('#acf-field_seller_final_price').val()) || 0;
    var msrp = parseFloat($('#acf-field_msrp').val()) || 0;
    
    // Calculate seller profit margin
    var profitMargin = 0;
    if (sellerPrice > 0) {
      profitMargin = ((sellerPrice - costPrice) / sellerPrice * 100).toFixed(2);
    }
    
    $('#acf-field_seller_profit_margin').val(profitMargin);
    
    // Update profit margin display
    var $profitDisplay = $('.seller-profit-margin-display .acf-input');
    if ($profitDisplay.length) {
      $profitDisplay.find('input').val(profitMargin);
      
      // Color coding for profit health
      if (profitMargin < 5) {
        $profitDisplay.css('background-color', '#ffebee'); // Low profit
      } else if (profitMargin < 15) {
        $profitDisplay.css('background-color', '#fff3e0'); // Medium profit
      } else {
        $profitDisplay.css('background-color', '#e8f5e8'); // Good profit
      }
    }
    
    // Update MSRP comparison
    var comparison = 'MSRP 참고: ' + msrp.toLocaleString() + '원';
    if (sellerPrice > 0 && msrp > 0) {
      var diff = ((sellerPrice - msrp) / msrp * 100).toFixed(1);
      if (diff > 0) {
        comparison += ' (+' + diff + '%)';
      } else if (diff < 0) {
        comparison += ' (' + diff + '%)';
      } else {
        comparison += ' (동일)';
      }
    }
    
    $('#acf-field_msrp_comparison').val(comparison);
    
    // Update MSRP comparison display
    var $msrpDisplay = $('.msrp-reference-display .acf-input');
    if ($msrpDisplay.length) {
      $msrpDisplay.find('input').val(comparison);
    }
  }
  
  // Add enhanced legal compliance notices
  function addLegalNotices() {
    // MSRP legal notice for suppliers
    if (!$('.legal-margin-notice').length && $('#acf-field_margin_rate').length) {
      $('#acf-field_margin_rate').closest('.acf-field').after(
        '<div class="legal-margin-notice" style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 5px 0; border-radius: 4px; font-size: 12px;">' +
        '<strong>⚠️ 법률 준수 안내:</strong> MSRP는 권장 가격이며, 실제 판매가는 판매자가 자율적으로 결정합니다.' +
        '</div>'
      );
    }
    
    // Seller autonomy notice
    if (!$('.seller-autonomy-reminder').length && $('#acf-field_seller_final_price').length) {
      $('#acf-field_seller_final_price').closest('.acf-field').after(
        '<div class="seller-autonomy-reminder" style="background: #e8f5e8; border: 1px solid #4caf50; padding: 10px; margin: 5px 0; border-radius: 4px; font-size: 12px;">' +
        '<strong>🏦 가격 자율성 보장:</strong> 법률에 따라 판매가를 자율적으로 결정할 권리가 보장됩니다.' +
        '</div>'
      );
    }
  }
  
  // Enhanced pricing change notifications
  function showPriceChangeNotification(type) {
    var noticeClass = 'price-change-notice-' + type;
    if (!$('.' + noticeClass).length) {
      var message = '';
      var bgColor = '#fff3cd';
      var borderColor = '#ffeaa7';
      
      switch(type) {
        case 'supplier':
          message = '<strong>🚨 승인 필요</strong><br/>공급가/MSRP/수수료율 변경시 관리자 승인이 필요합니다.';
          break;
        case 'seller':
          message = '<strong>✅ 자율 가격 설정</strong><br/>판매가를 자율적으로 결정하셨습니다.';
          bgColor = '#e8f5e8';
          borderColor = '#4caf50';
          break;
      }
      
      $('body').append(
        '<div class="' + noticeClass + '" style="position: fixed; top: 20px; right: 20px; background: ' + bgColor + '; border: 1px solid ' + borderColor + '; padding: 15px; border-radius: 4px; z-index: 9999; max-width: 300px;">' +
        message +
        '<button onclick="$(this).parent().remove()" style="float: right; background: none; border: none; font-size: 16px;">×</button>' +
        '</div>'
      );
      
      setTimeout(function() {
        $('.' + noticeClass).fadeOut();
      }, 5000);
    }
  }
  
  $(document).ready(function() {
    // Initialize calculations on page load
    calculateMSRPMargin();
    calculateSellerProfit();
    addLegalNotices();
    
    // Supplier field changes - require approval
    $('#acf-field_cost_price, #acf-field_msrp, #acf-field_partner_commission_rate').on('input change', function() {
      calculateMSRPMargin();
      calculateSellerProfit();
      showPriceChangeNotification('supplier');
    });
    
    // Seller price changes - autonomous
    $('#acf-field_seller_final_price').on('input change', function() {
      calculateSellerProfit();
      showPriceChangeNotification('seller');
    });
    
    // Real-time calculations
    $('#acf-field_cost_price, #acf-field_msrp, #acf-field_seller_final_price').on('input', function() {
      calculateMSRPMargin();
      calculateSellerProfit();
    });
  });
  
})(jQuery);
</script>
`;

// Approval workflow integration
export const APPROVAL_WORKFLOW_SCRIPT = `
<script>
(function($) {
  'use strict';
  
  // Set approval status when supplier fields change
  function setApprovalPending() {
    // Mark post as pending approval
    $('#post-status-display').text('승인 대기 중');
    $('#hidden_post_status').val('pending');
    
    // Add hidden field to track what needs approval
    if (!$('#pending_approval_fields').length) {
      $('#post').append('<input type="hidden" id="pending_approval_fields" name="pending_approval_fields" value="pricing">');
    }
  }
  
  // Reset approval status for seller autonomous changes
  function setSellerAutonomous() {
    // Seller changes don't need approval
    if (!$('#autonomous_pricing_flag').length) {
      $('#post').append('<input type="hidden" id="autonomous_pricing_flag" name="autonomous_pricing_flag" value="true">');
    }
  }
  
  $(document).ready(function() {
    // Monitor supplier field changes
    $('#acf-field_cost_price, #acf-field_msrp, #acf-field_partner_commission_rate').on('change', function() {
      setApprovalPending();
    });
    
    // Monitor seller field changes
    $('#acf-field_seller_final_price').on('change', function() {
      setSellerAutonomous();
    });
  });
  
})(jQuery);
</script>
`;