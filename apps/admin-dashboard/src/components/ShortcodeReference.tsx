import { useState, FC } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, ShoppingBag, Grid, Package, Zap, List, Tag } from 'lucide-react';

interface ShortcodeExample {
  code: string;
  description: string;
}

interface ShortcodeInfo {
  name: string;
  icon: React.ElementType;
  description: string;
  parameters: {
    name: string;
    type: string;
    default?: string;
    description: string;
    required?: boolean;
  }[];
  examples: ShortcodeExample[];
}

const shortcodes: ShortcodeInfo[] = [
  {
    name: 'product',
    icon: Package,
    description: '단일 상품을 표시합니다',
    parameters: [
      { name: 'id', type: 'string', description: '상품 ID 또는 슬러그', required: true },
      { name: 'show_price', type: 'boolean', default: 'true', description: '가격 표시 여부' },
      { name: 'show_cart', type: 'boolean', default: 'true', description: '장바구니 버튼 표시 여부' },
      { name: 'class', type: 'string', description: '추가 CSS 클래스' }
    ],
    examples: [
      { code: '[product id="123"]', description: '기본 상품 표시' },
      { code: '[product id="awesome-product" show_cart="false"]', description: '장바구니 버튼 없이 표시' },
      { code: '[product id="123" class="featured-product"]', description: '커스텀 스타일 적용' }
    ]
  },
  {
    name: 'product_grid',
    icon: Grid,
    description: '상품 그리드를 표시합니다',
    parameters: [
      { name: 'category', type: 'string', description: '카테고리 ID 또는 슬러그' },
      { name: 'limit', type: 'number', default: '12', description: '표시할 상품 수' },
      { name: 'columns', type: 'number', default: '4', description: '그리드 열 수 (1-6)' },
      { name: 'featured', type: 'boolean', default: 'false', description: '추천 상품만 표시' },
      { name: 'orderby', type: 'string', default: 'created_at', description: '정렬 기준 (price, name, created_at)' },
      { name: 'order', type: 'string', default: 'desc', description: '정렬 순서 (asc, desc)' }
    ],
    examples: [
      { code: '[product_grid category="electronics" limit="8"]', description: '전자제품 카테고리 8개 표시' },
      { code: '[product_grid featured="true" columns="3"]', description: '추천 상품을 3열로 표시' },
      { code: '[product_grid orderby="price" order="asc" limit="16"]', description: '가격 낮은 순으로 16개 표시' }
    ]
  },
  {
    name: 'add_to_cart',
    icon: ShoppingBag,
    description: '장바구니 추가 버튼을 표시합니다',
    parameters: [
      { name: 'id', type: 'string', description: '상품 ID', required: true },
      { name: 'text', type: 'string', default: '장바구니에 담기', description: '버튼 텍스트' },
      { name: 'show_price', type: 'boolean', default: 'true', description: '가격 표시 여부' },
      { name: 'class', type: 'string', description: '추가 CSS 클래스' }
    ],
    examples: [
      { code: '[add_to_cart id="123"]', description: '기본 장바구니 버튼' },
      { code: '[add_to_cart id="123" text="구매하기"]', description: '커스텀 텍스트' },
      { code: '[add_to_cart id="123" show_price="false" class="btn-large"]', description: '가격 숨기고 큰 버튼' }
    ]
  },
  {
    name: 'product_carousel',
    icon: Zap,
    description: '상품 캐러셀을 표시합니다',
    parameters: [
      { name: 'category', type: 'string', description: '카테고리 ID 또는 슬러그' },
      { name: 'limit', type: 'number', default: '10', description: '표시할 상품 수' },
      { name: 'autoplay', type: 'boolean', default: 'true', description: '자동 재생 여부' },
      { name: 'title', type: 'string', description: '캐러셀 제목' }
    ],
    examples: [
      { code: '[product_carousel category="new-arrivals"]', description: '신상품 캐러셀' },
      { code: '[product_carousel title="베스트셀러" limit="15"]', description: '베스트셀러 15개' },
      { code: '[product_carousel category="sale" autoplay="false"]', description: '세일 상품 수동 슬라이드' }
    ]
  },
  {
    name: 'featured_products',
    icon: List,
    description: '추천 상품을 표시합니다',
    parameters: [
      { name: 'limit', type: 'number', default: '4', description: '표시할 상품 수' },
      { name: 'columns', type: 'number', default: '4', description: '그리드 열 수' },
      { name: 'title', type: 'string', default: '추천 상품', description: '섹션 제목' }
    ],
    examples: [
      { code: '[featured_products]', description: '기본 추천 상품 4개' },
      { code: '[featured_products limit="6" columns="3"]', description: '3열로 6개 표시' },
      { code: '[featured_products title="이달의 추천" limit="8"]', description: '커스텀 제목으로 8개' }
    ]
  },
  {
    name: 'product_categories',
    icon: Tag,
    description: '상품 카테고리 목록을 표시합니다',
    parameters: [
      { name: 'show_count', type: 'boolean', default: 'true', description: '상품 수 표시 여부' },
      { name: 'hide_empty', type: 'boolean', default: 'true', description: '빈 카테고리 숨김' },
      { name: 'columns', type: 'number', default: '3', description: '그리드 열 수' }
    ],
    examples: [
      { code: '[product_categories]', description: '기본 카테고리 목록' },
      { code: '[product_categories show_count="false"]', description: '상품 수 없이 표시' },
      { code: '[product_categories hide_empty="false" columns="4"]', description: '모든 카테고리 4열로' }
    ]
  }
];

const ShortcodeReference: FC = () => {
  const [expandedShortcode, setExpandedShortcode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleExpand = (name: string) => {
    setExpandedShortcode(expandedShortcode === name ? null : name);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">E-commerce 숏코드 레퍼런스</h2>
        <p className="text-gray-600">
          페이지나 게시물에서 아래 숏코드를 사용하여 상품을 표시할 수 있습니다.
        </p>
      </div>

      <div className="space-y-4">
        {shortcodes.map((shortcode) => {
          const Icon = shortcode.icon;
          const isExpanded = expandedShortcode === shortcode.name;

          return (
            <div key={shortcode.name} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleExpand(shortcode.name)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <Icon className="w-5 h-5 text-gray-500 mr-3" />
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">[{shortcode.name}]</h3>
                    <p className="text-sm text-gray-600">{shortcode.description}</p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 py-4 border-t bg-gray-50">
                  {/* Parameters */}
                  <div className="mb-4">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">파라미터</h4>
                    <div className="space-y-2">
                      {shortcode.parameters.map((param) => (
                        <div key={param.name} className="text-sm">
                          <code className="bg-gray-200 px-1 rounded">{param.name}</code>
                          <span className="text-gray-600 ml-2">
                            ({param.type})
                            {param.required && <span className="text-red-500 ml-1">*필수</span>}
                            {param.default && <span className="ml-1">= {param.default}</span>}
                          </span>
                          <p className="text-gray-600 ml-4">{param.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Examples */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">사용 예시</h4>
                    <div className="space-y-2">
                      {shortcode.examples.map((example, index) => (
                        <div key={index} className="bg-white rounded p-3">
                          <div className="flex items-center justify-between mb-1">
                            <code className="text-sm font-mono text-blue-600">
                              {example.code}
                            </code>
                            <button
                              onClick={() => copyToClipboard(example.code)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {copiedCode === example.code ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-gray-600">{example.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">💡 사용 팁</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 숏코드는 페이지, 게시물, 상품 설명 등 어디서나 사용할 수 있습니다</li>
          <li>• 여러 숏코드를 한 페이지에 함께 사용할 수 있습니다</li>
          <li>• 반응형 디자인이 적용되어 모바일에서도 잘 보입니다</li>
          <li>• 실시간으로 재고와 가격이 업데이트됩니다</li>
        </ul>
      </div>
    </div>
  );
};

export default ShortcodeReference;