import React, { useState } from 'react';
import { Copy, Check, Search, Code, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';

interface Shortcode {
  name: string;
  description: string;
  category: string;
  usage: string;
  example: string;
  parameters?: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: string;
  }>;
}

const ShortcodeList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 숏코드 목록 데이터
  const shortcodes: Shortcode[] = [
    // Auth Shortcodes
    {
      name: 'social_login',
      description: 'OAuth 소셜 로그인 폼 (Google, 카카오, 네이버)',
      category: 'auth',
      usage: '[social_login]',
      example: '[social_login title="로그인" show_email_login="true"]',
      parameters: [
        { name: 'title', type: 'string', description: '로그인 폼 제목', required: false, default: '로그인' },
        { name: 'subtitle', type: 'string', description: '부제목', required: false, default: '계정에 접속하여 서비스를 이용하세요' },
        { name: 'show_email_login', type: 'boolean', description: '이메일 로그인 표시', required: false, default: 'true' },
        { name: 'redirect_url', type: 'string', description: '로그인 후 리다이렉트 URL', required: false, default: '/dashboard' }
      ]
    },
    {
      name: 'login_form',
      description: '로그인 폼 (social_login과 동일)',
      category: 'auth',
      usage: '[login_form]',
      example: '[login_form title="환영합니다"]'
    },
    {
      name: 'oauth_login',
      description: '소셜 로그인 버튼만 표시 (이메일 로그인 제외)',
      category: 'auth',
      usage: '[oauth_login]',
      example: '[oauth_login title="간편 로그인"]'
    },
    
    // Dropshipping Shortcodes
    {
      name: 'seller_dashboard',
      description: '판매자 대시보드',
      category: 'dropshipping',
      usage: '[seller_dashboard]',
      example: '[seller_dashboard]'
    },
    {
      name: 'supplier_dashboard',
      description: '공급업체 대시보드',
      category: 'dropshipping',
      usage: '[supplier_dashboard]',
      example: '[supplier_dashboard]'
    },
    {
      name: 'affiliate_dashboard',
      description: '어필리에이트 대시보드',
      category: 'dropshipping',
      usage: '[affiliate_dashboard]',
      example: '[affiliate_dashboard]'
    },

    // Product Shortcodes (예시)
    {
      name: 'product_list',
      description: '상품 목록 표시',
      category: 'product',
      usage: '[product_list]',
      example: '[product_list category="electronics" limit="12"]',
      parameters: [
        { name: 'category', type: 'string', description: '상품 카테고리', required: false },
        { name: 'limit', type: 'number', description: '표시할 상품 수', required: false, default: '10' },
        { name: 'sort', type: 'string', description: '정렬 방식', required: false, default: 'created_at' }
      ]
    },

    // Form Shortcodes (예시)
    {
      name: 'contact_form',
      description: '연락처 폼',
      category: 'form',
      usage: '[contact_form]',
      example: '[contact_form title="문의하기"]'
    }
  ];

  const categories = [
    { value: 'all', label: '전체' },
    { value: 'auth', label: '인증' },
    { value: 'dropshipping', label: '드롭시핑' },
    { value: 'product', label: '상품' },
    { value: 'form', label: '폼' }
  ];

  // 검색 및 필터링
  const filteredShortcodes = shortcodes.filter(shortcode => {
    const matchesSearch = searchQuery === '' || 
      shortcode.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcode.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || shortcode.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // 클립보드 복사
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-3">
        <AdminBreadcrumb 
          items={[
            { label: 'Dashboard', path: '/' },
            { label: 'Content', path: '/content' },
            { label: 'Shortcodes' }
          ]}
        />
      </div>

      <div className="px-8 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">숏코드 목록</h1>
          <p className="text-gray-600">사용 가능한 숏코드와 사용법을 확인하세요.</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="숏코드 이름이나 설명으로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="sm:w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shortcode List */}
        <div className="space-y-4">
          {filteredShortcodes.map((shortcode) => (
            <Card key={shortcode.name} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg font-mono text-blue-600">
                        [{shortcode.name}]
                      </CardTitle>
                      <Badge variant="secondary">
                        {categories.find(c => c.value === shortcode.category)?.label}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {shortcode.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {/* Basic Usage */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      기본 사용법
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-gray-100 border rounded font-mono text-sm">
                        {shortcode.usage}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(shortcode.usage)}
                        className="shrink-0"
                      >
                        {copiedCode === shortcode.usage ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Example */}
                  {shortcode.example && shortcode.example !== shortcode.usage && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        사용 예시
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-gray-100 border rounded font-mono text-sm">
                          {shortcode.example}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(shortcode.example)}
                          className="shrink-0"
                        >
                          {copiedCode === shortcode.example ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Parameters */}
                  {shortcode.parameters && shortcode.parameters.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        매개변수
                      </label>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 font-medium">이름</th>
                              <th className="text-left py-2 font-medium">타입</th>
                              <th className="text-left py-2 font-medium">필수</th>
                              <th className="text-left py-2 font-medium">기본값</th>
                              <th className="text-left py-2 font-medium">설명</th>
                            </tr>
                          </thead>
                          <tbody>
                            {shortcode.parameters.map((param) => (
                              <tr key={param.name} className="border-b border-gray-100">
                                <td className="py-2 font-mono text-blue-600">{param.name}</td>
                                <td className="py-2">
                                  <code className="text-xs bg-gray-100 px-1 rounded">{param.type}</code>
                                </td>
                                <td className="py-2">
                                  {param.required ? (
                                    <Badge variant="destructive" className="text-xs">필수</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">선택</Badge>
                                  )}
                                </td>
                                <td className="py-2">
                                  {param.default ? (
                                    <code className="text-xs bg-gray-100 px-1 rounded">{param.default}</code>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="py-2 text-gray-600">{param.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredShortcodes.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Code className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">검색 결과가 없습니다</h3>
              <p className="text-gray-600">다른 검색어나 카테고리를 시도해보세요.</p>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-1">숏코드 사용법</h3>
                <p className="text-sm text-blue-700">
                  숏코드는 페이지나 포스트 콘텐츠에 직접 입력하여 동적 기능을 추가할 수 있습니다. 
                  대괄호 안에 숏코드 이름과 필요한 매개변수를 입력하세요.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShortcodeList;