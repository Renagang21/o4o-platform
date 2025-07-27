import { useState } from 'react';
import { 
  Layout, 
  Grid, 
  Sidebar, 
  Eye, 
  Download, 
  Star, 
  Plus,
  Filter,
  Search
} from 'lucide-react';

interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  layoutType: 'personal-blog' | 'photo-blog' | 'complex-blog' | 'custom';
  previewImage: string;
  isActive: boolean;
  isFeatured: boolean;
  usageCount: number;
  tags: string[];
  createdAt: string;
}

const mockTemplates: LayoutTemplate[] = [
  {
    id: '1',
    name: '미니멀 개인 블로그',
    description: '깔끔하고 단순한 1단 레이아웃. 개인 블로거에게 최적화된 디자인',
    layoutType: 'personal-blog',
    previewImage: '/api/placeholder/400/300',
    isActive: true,
    isFeatured: true,
    usageCount: 245,
    tags: ['개인', '미니멀', '블로그'],
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: '포토 갤러리',
    description: '이미지 중심의 그리드 레이아웃. 사진 블로그와 포트폴리오에 적합',
    layoutType: 'photo-blog',
    previewImage: '/api/placeholder/400/300',
    isActive: true,
    isFeatured: true,
    usageCount: 189,
    tags: ['사진', '갤러리', '그리드'],
    createdAt: '2024-01-20'
  },
  {
    id: '3',
    name: '비즈니스 블로그',
    description: '사이드바가 있는 복합 레이아웃. 기업 블로그와 뉴스 사이트에 최적',
    layoutType: 'complex-blog',
    previewImage: '/api/placeholder/400/300',
    isActive: true,
    isFeatured: false,
    usageCount: 156,
    tags: ['비즈니스', '사이드바', '복합'],
    createdAt: '2024-01-25'
  }
];

const TemplateLayoutManager: React.FC = () => {
  const [templates, _setTemplates] = useState<LayoutTemplate[]>(mockTemplates);
  const [selectedLayoutType, setSelectedLayoutType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const getLayoutIcon = (layoutType: string) => {
    switch (layoutType) {
      case 'personal-blog':
        return <Layout className="w-5 h-5" />;
      case 'photo-blog':
        return <Grid className="w-5 h-5" />;
      case 'complex-blog':
        return <Sidebar className="w-5 h-5" />;
      default:
        return <Layout className="w-5 h-5" />;
    }
  };

  const getLayoutTypeLabel = (layoutType: string) => {
    switch (layoutType) {
      case 'personal-blog':
        return '개인 블로그';
      case 'photo-blog':
        return '포토 블로그';
      case 'complex-blog':
        return '복합 블로그';
      default:
        return '커스텀';
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedLayoutType === 'all' || template.layoutType === selectedLayoutType;
    return matchesSearch && matchesType;
  });

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    // Here you would typically call an API to apply the template
    console.log('Applying template:', templateId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">템플릿 레이아웃 관리</h1>
        <p className="text-gray-600 mt-1">
          블로그 레이아웃 템플릿을 선택하고 관리합니다
        </p>
      </div>

      {/* Filters and Search */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="템플릿 검색..."
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Layout Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedLayoutType}
                onChange={(e: any) => setSelectedLayoutType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">모든 레이아웃</option>
                <option value="personal-blog">개인 블로그</option>
                <option value="photo-blog">포토 블로그</option>
                <option value="complex-blog">복합 블로그</option>
                <option value="custom">커스텀</option>
              </select>
            </div>

            {/* Create New Template */}
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              새 템플릿
            </button>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className={`wp-card overflow-hidden transition-all duration-200 ${
              selectedTemplate === template.id 
                ? 'ring-2 ring-blue-500 shadow-lg' 
                : 'hover:shadow-lg'
            }`}
          >
            {/* Template Preview */}
            <div className="relative h-48 bg-gray-100 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                <div className="text-center">
                  {getLayoutIcon(template.layoutType)}
                  <p className="text-sm text-gray-600 mt-2">{getLayoutTypeLabel(template.layoutType)}</p>
                </div>
              </div>
              
              {/* Featured Badge */}
              {template.isFeatured && (
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                    <Star className="w-3 h-3" />
                    추천
                  </span>
                </div>
              )}

              {/* Preview Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                <button className="opacity-0 hover:opacity-100 transition-opacity duration-200 bg-white text-gray-800 px-4 py-2 rounded-md shadow-lg flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  미리보기
                </button>
              </div>
            </div>

            {/* Template Info */}
            <div className="wp-card-body">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </div>

              {/* Layout Type */}
              <div className="flex items-center gap-2 mb-3">
                {getLayoutIcon(template.layoutType)}
                <span className="text-sm font-medium text-blue-600">
                  {getLayoutTypeLabel(template.layoutType)}
                </span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-4">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>사용: {template.usageCount}회</span>
                <span>{new Date(template.createdAt).toLocaleDateString('ko-KR')}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleApplyTemplate(template.id)}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    selectedTemplate === template.id
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {selectedTemplate === template.id ? '적용됨' : '적용하기'}
                </button>
                <button className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Layout className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            검색 결과가 없습니다
          </h3>
          <p className="text-gray-600">
            다른 검색어를 시도해보거나 필터를 변경해보세요.
          </p>
        </div>
      )}

      {/* Layout Information */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h2 className="text-lg font-medium">레이아웃 타입 안내</h2>
        </div>
        <div className="wp-card-body">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Layout className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">개인 블로그</h3>
              <p className="text-sm text-gray-600">
                깔끔한 1단 레이아웃으로 개인 블로거에게 최적화된 미니멀 디자인
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Grid className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">포토 블로그</h3>
              <p className="text-sm text-gray-600">
                이미지 중심의 그리드 레이아웃으로 사진과 포트폴리오 콘텐츠에 적합
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Sidebar className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">복합 블로그</h3>
              <p className="text-sm text-gray-600">
                사이드바와 위젯을 포함한 복합 레이아웃으로 비즈니스 블로그에 최적
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateLayoutManager;