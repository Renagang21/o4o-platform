// Supplier Components Export
export { default as SupplierProducts } from './SupplierProducts';
export { default as SupplierProductEditor } from './SupplierProductEditor';

// Supplier Shortcodes Registration
export const supplierShortcodes = {
  'supplier_products': {
    component: 'SupplierProducts',
    description: '공급자가 자신이 등록/관리하는 ds_product 목록을 출력합니다',
    attributes: {
      limit: {
        type: 'number',
        required: false,
        default: 12,
        description: '표시할 상품 수'
      },
      category: {
        type: 'string',
        required: false,
        description: '카테고리별 필터링'
      },
      status: {
        type: 'string',
        required: false,
        default: 'all',
        options: ['all', 'active', 'pending', 'rejected'],
        description: '상품 상태 필터'
      },
      showStats: {
        type: 'boolean',
        required: false,
        default: true,
        description: '통계 표시 여부'
      }
    }
  },
  'supplier_product_editor': {
    component: 'SupplierProductEditor',
    description: '상품의 공급가, MSRP, 수수료율을 편집하고 승인 요청하는 UI',
    attributes: {
      productId: {
        type: 'string',
        required: false,
        description: '편집할 상품 ID (없으면 새 상품 등록)'
      },
      mode: {
        type: 'string',
        required: false,
        default: 'edit',
        options: ['create', 'edit'],
        description: '편집 모드'
      },
      autoSave: {
        type: 'boolean',
        required: false,
        default: false,
        description: '자동 저장 활성화'
      }
    }
  },
  'supplier_dashboard': {
    component: 'SupplierDashboard',
    description: '공급자 메인 대시보드 - 상품 현황, 정산, 승인 대기 등',
    attributes: {
      period: {
        type: 'string',
        required: false,
        default: '30d',
        options: ['7d', '30d', '90d', '1y'],
        description: '데이터 조회 기간'
      }
    }
  },
  'supplier_analytics': {
    component: 'SupplierAnalytics',
    description: '공급자 판매 분석 및 통계',
    attributes: {
      type: {
        type: 'string',
        required: false,
        default: 'overview',
        options: ['overview', 'products', 'partners', 'revenue'],
        description: '분석 유형'
      }
    }
  },
  'supplier_approval_queue': {
    component: 'SupplierApprovalQueue',
    description: '공급자 승인 대기 목록 관리',
    attributes: {
      showResolved: {
        type: 'boolean',
        required: false,
        default: false,
        description: '처리된 요청 표시 여부'
      }
    }
  }
};