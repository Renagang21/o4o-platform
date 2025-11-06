/**
 * WordPress Shortcode Integration Configuration
 * 
 * This file contains the configuration for registering
 * React-based shortcodes in WordPress.
 */

// Shortcode definitions for WordPress registration
window.DropshippingShortcodes = {
  // Main partner portal shortcodes
  'partner_dashboard': {
    description: 'Partner Main Dashboard - 총 수익, 전환율, 개인 추천 링크를 보여주는 통합 UI',
    attributes: {
      tab: {
        type: 'select',
        options: ['overview', 'commissions', 'links'],
        default: 'overview',
        description: 'Default tab to display'
      }
    },
    example: '[partner_dashboard tab="overview"]',
    category: 'Partner Portal',
    requiresAuth: true
  },
  
  'partner_products': {
    description: 'Partner Products List - 파트너 개인의 추천 코드가 적용된 링크 생성 기능',
    attributes: {
      category: {
        type: 'text',
        default: '',
        description: 'Filter products by category'
      },
      featured: {
        type: 'checkbox',
        default: false,
        description: 'Show only featured products'
      },
      limit: {
        type: 'number',
        default: 12,
        description: 'Number of products to display'
      },
      sortBy: {
        type: 'select',
        options: ['commission', 'performance', 'price', 'newest'],
        default: 'commission',
        description: 'Default sorting option'
      }
    },
    example: '[partner_products category="electronics" limit="9" featured="true"]',
    category: 'Partner Portal',
    requiresAuth: true
  },
  
  'partner_commissions': {
    description: 'Partner Commissions - 수수료 정산 내역과 지급 상태를 보여주는 투명한 UI',
    attributes: {
      period: {
        type: 'select',
        options: ['7d', '30d', '90d', '1y'],
        default: '30d',
        description: 'Default time period'
      },
      status: {
        type: 'select',
        options: ['all', 'pending', 'approved', 'paid', 'cancelled'],
        default: 'all',
        description: 'Filter by commission status'
      },
      compact: {
        type: 'checkbox',
        default: false,
        description: 'Use compact layout'
      },
      showSummary: {
        type: 'checkbox',
        default: true,
        description: 'Show summary cards'
      }
    },
    example: '[partner_commissions period="30d" status="all" showSummary="true"]',
    category: 'Partner Portal',
    requiresAuth: true
  },
  
  // Additional utility shortcodes
  'partner_link_generator': {
    description: 'Partner Link Generator - Generate promotional links for products',
    attributes: {},
    example: '[partner_link_generator]',
    category: 'Partner Tools',
    requiresAuth: true
  },
  
  'partner_commission_dashboard': {
    description: 'Detailed Commission Dashboard - Advanced commission tracking',
    attributes: {
      dateRange: {
        type: 'select',
        options: ['7d', '30d', '90d', '1y'],
        default: '30d',
        description: 'Default date range for data display'
      }
    },
    example: '[partner_commission_dashboard dateRange="30d"]',
    category: 'Partner Analytics',
    requiresAuth: true
  },
  
  'partner_payout_requests': {
    description: 'Payout Requests Management - Manage payment requests',
    attributes: {},
    example: '[partner_payout_requests]',
    category: 'Partner Payments',
    requiresAuth: true
  },
  
  // Supplier shortcodes
  'supplier_products': {
    description: '공급자 상품 목록 - 자신이 등록/관리하는 ds_product 목록 출력',
    attributes: {
      limit: {
        type: 'number',
        default: 12,
        description: '표시할 상품 수'
      },
      category: {
        type: 'text',
        default: '',
        description: '카테고리별 필터링'
      },
      status: {
        type: 'select',
        options: ['all', 'active', 'pending', 'rejected'],
        default: 'all',
        description: '상품 상태 필터'
      },
      showStats: {
        type: 'checkbox',
        default: true,
        description: '통계 표시 여부'
      }
    },
    example: '[supplier_products limit="12" status="active"]',
    category: 'Supplier Portal',
    requiresAuth: true
  },
  
  'supplier_product_editor': {
    description: '공급자 상품 편집기 - 공급가, MSRP, 수수료율 편집 및 승인 요청',
    attributes: {
      productId: {
        type: 'text',
        default: '',
        description: '편집할 상품 ID'
      },
      mode: {
        type: 'select',
        options: ['create', 'edit'],
        default: 'edit',
        description: '편집 모드'
      },
      autoSave: {
        type: 'checkbox',
        default: false,
        description: '자동 저장 활성화'
      }
    },
    example: '[supplier_product_editor productId="123" mode="edit"]',
    category: 'Supplier Portal',
    requiresAuth: true
  },
  
  // Seller shortcodes
  'seller_dashboard': {
    description: '판매자 대시보드 - 총 마진, 전환율, 개인 추천 링크',
    attributes: {
      period: {
        type: 'select',
        options: ['7d', '30d', '90d', '1y'],
        default: '30d',
        description: '데이터 조회 기간'
      }
    },
    example: '[seller_dashboard period="30d"]',
    category: 'Seller Portal',
    requiresAuth: true
  },
  
  'seller_products': {
    description: '판매자 홍보 상품 목록 - 자율 가격 설정 및 추천 링크 생성',
    attributes: {
      limit: {
        type: 'number',
        default: 12,
        description: '표시할 상품 수'
      },
      category: {
        type: 'text',
        default: '',
        description: '카테고리별 필터링'
      },
      featured: {
        type: 'checkbox',
        default: false,
        description: '추천 상품만 표시'
      }
    },
    example: '[seller_products limit="9" featured="true"]',
    category: 'Seller Portal',
    requiresAuth: true
  },
  
  'seller_settlement': {
    description: '판매자 정산 내역 - 마진 정산 내역과 지급 상태',
    attributes: {
      period: {
        type: 'select',
        options: ['7d', '30d', '90d', '1y'],
        default: '30d',
        description: '조회 기간'
      },
      status: {
        type: 'select',
        options: ['all', 'pending', 'paid'],
        default: 'all',
        description: '정산 상태'
      }
    },
    example: '[seller_settlement period="30d" status="all"]',
    category: 'Seller Portal',
    requiresAuth: true
  },
  
  // General user shortcodes
  'user_dashboard': {
    description: 'User role-based dashboard for dropshipping platform',
    attributes: {
      role: {
        type: 'select',
        options: ['supplier', 'seller', 'affiliate', 'partner'],
        default: '',
        description: 'Specific role dashboard to display'
      }
    },
    example: '[user_dashboard role="partner"]',
    category: 'User Management',
    requiresAuth: true
  },
  
  'role_verification': {
    description: 'Role verification form for dropshipping users',
    attributes: {
      type: {
        type: 'select',
        options: ['supplier', 'seller', 'affiliate', 'partner'],
        required: true,
        description: 'Type of role to verify'
      }
    },
    example: '[role_verification type="partner"]',
    category: 'User Management',
    requiresAuth: false
  }
};

// WordPress registration function
window.registerDropshippingShortcodes = function() {
  if (typeof wp !== 'undefined' && wp.hooks) {
    // Hook into WordPress shortcode system
    Object.keys(window.DropshippingShortcodes).forEach(shortcodeName => {
      const config = window.DropshippingShortcodes[shortcodeName];
      
      // Register with WordPress
      wp.hooks.addAction(
        'wp.shortcode.register',
        'dropshipping/shortcodes',
        function() {
          wp.shortcode.add(shortcodeName, function(attrs, content) {
            const attributes = wp.shortcode.attrs({
              ...Object.keys(config.attributes).reduce((acc, key) => {
                acc[key] = config.attributes[key].default || '';
                return acc;
              }, {})
            }, attrs);
            
            // Create container for React component
            const containerId = 'shortcode-' + shortcodeName + '-' + Date.now();
            
            // Return HTML that will be replaced by React
            return '<div id="' + containerId + '" class="dropshipping-shortcode" data-shortcode="' + shortcodeName + '" data-attrs="' + encodeURIComponent(JSON.stringify(attributes)) + '" data-content="' + encodeURIComponent(content || '') + '">Loading...</div>';
          });
        }
      );
    });
  }
};

// Auto-initialize when WordPress is ready
document.addEventListener('DOMContentLoaded', function() {
  if (window.wp && window.wp.hooks) {
    window.registerDropshippingShortcodes();
  }
  
  // Initialize React shortcode renderer
  if (window.React && window.ReactDOM) {
    // Find and render all shortcode containers
    const shortcodeContainers = document.querySelectorAll('.dropshipping-shortcode');
    shortcodeContainers.forEach(container => {
      const shortcodeName = container.getAttribute('data-shortcode');
      const attrsJson = container.getAttribute('data-attrs');
      const contentJson = container.getAttribute('data-content');
      
      try {
        const attributes = attrsJson ? JSON.parse(decodeURIComponent(attrsJson)) : {};
        const content = contentJson ? decodeURIComponent(contentJson) : '';
        
        // Render React component
        if (window.DropshippingShortcodeRenderer) {
          window.ReactDOM.render(
            window.React.createElement(window.DropshippingShortcodeRenderer, {
              name: shortcodeName,
              attributes: attributes,
              content: content
            }),
            container
          );
        }
      } catch (error) {
        console.error('Failed to render shortcode:', shortcodeName, error);
        container.innerHTML = '<div class="shortcode-error">Failed to load shortcode: ' + shortcodeName + '</div>';
      }
    });
  }
});

// Export for WordPress admin
window.getDropshippingShortcodeInfo = function() {
  return Object.keys(window.DropshippingShortcodes).map(name => ({
    name: name,
    tag: '[' + name + ']',
    description: window.DropshippingShortcodes[name].description,
    example: window.DropshippingShortcodes[name].example,
    category: window.DropshippingShortcodes[name].category,
    attributes: window.DropshippingShortcodes[name].attributes,
    requiresAuth: window.DropshippingShortcodes[name].requiresAuth
  }));
};

// CSS for shortcode styling
const shortcodeStyles = `
.dropshipping-shortcode {
  margin: 1em 0;
  clear: both;
}

.shortcode-error {
  background: #ffebee;
  border: 1px solid #f44336;
  color: #c62828;
  padding: 12px;
  border-radius: 4px;
  font-size: 14px;
}

.shortcode-container {
  position: relative;
}

.shortcode-container[data-shortcode^="partner_"] {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
}

/* Responsive design */
@media (max-width: 768px) {
  .shortcode-container {
    padding: 8px;
  }
}
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = shortcodeStyles;
document.head.appendChild(styleSheet);