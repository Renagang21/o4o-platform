import { FC, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Download, 
  Star, 
  Eye, 
  ShoppingCart,
  Grid,
  List,
  X,
  Info,
  Calendar,
  User,
  Package,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface Theme {
  id: string;
  slug: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  authorUrl?: string;
  screenshot?: string;
  demoUrl?: string;
  type: 'builtin' | 'external' | 'custom';
  status: 'active' | 'inactive' | 'maintenance';
  isPremium: boolean;
  price?: number;
  features?: string[];
  requiredPlugins?: string[];
  downloads: number;
  rating: number;
  reviewCount: number;
  lastUpdate?: string;
  license?: string;
  supportedLanguages?: string[];
}

const ThemeMarketplace: FC = () => {
  const navigate = useNavigate();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState({
    type: 'all',
    isPremium: 'all',
    minRating: 0,
    maxPrice: 0
  });
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    fetchThemes();
  }, [searchQuery, filters]);

  const fetchThemes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (filters.type !== 'all') params.append('type', filters.type);
      if (filters.isPremium !== 'all') params.append('isPremium', filters.isPremium);
      if (filters.minRating > 0) params.append('minRating', filters.minRating.toString());
      if (filters.maxPrice > 0) params.append('maxPrice', filters.maxPrice.toString());

      const response = await api.get(`/v1/themes/marketplace?${params}`);
      setThemes(response.data.data || getMockThemes());
    } catch (error) {
      console.error('Error fetching themes:', error);
      // Use mock data in development
      setThemes(getMockThemes());
    } finally {
      setLoading(false);
    }
  };

  const getMockThemes = (): Theme[] => [
    {
      id: '1',
      slug: 'modern-business',
      name: 'Modern Business',
      description: 'A clean and modern business theme with multiple layouts',
      version: '2.1.0',
      author: 'O4O Themes',
      authorUrl: 'https://o4o.com',
      screenshot: '/images/theme-modern-business.jpg',
      demoUrl: 'https://demo.o4o.com/modern-business',
      type: 'external',
      status: 'active',
      isPremium: true,
      price: 49.99,
      features: ['Responsive', 'SEO Optimized', 'WooCommerce Ready', 'Page Builder'],
      requiredPlugins: ['woocommerce', 'elementor'],
      downloads: 15234,
      rating: 4.8,
      reviewCount: 234,
      lastUpdate: '2024-01-15',
      license: 'GPL v2',
      supportedLanguages: ['en', 'ko', 'ja', 'zh']
    },
    {
      id: '2',
      slug: 'minimal-blog',
      name: 'Minimal Blog',
      description: 'Perfect for bloggers who love simplicity',
      version: '1.5.2',
      author: 'Design Studio',
      authorUrl: 'https://designstudio.com',
      screenshot: '/images/theme-minimal-blog.jpg',
      demoUrl: 'https://demo.o4o.com/minimal-blog',
      type: 'external',
      status: 'active',
      isPremium: false,
      downloads: 8921,
      rating: 4.5,
      reviewCount: 156,
      lastUpdate: '2024-01-10',
      license: 'MIT',
      supportedLanguages: ['en', 'ko']
    },
    {
      id: '3',
      slug: 'ecommerce-pro',
      name: 'E-Commerce Pro',
      description: 'Advanced e-commerce theme with all features you need',
      version: '3.0.1',
      author: 'Commerce Themes',
      authorUrl: 'https://commercethemes.com',
      screenshot: '/images/theme-ecommerce-pro.jpg',
      demoUrl: 'https://demo.o4o.com/ecommerce-pro',
      type: 'external',
      status: 'active',
      isPremium: true,
      price: 89.99,
      features: ['Multi-vendor', 'Product Quick View', 'Advanced Filters', 'Wishlist'],
      requiredPlugins: ['woocommerce', 'dokan'],
      downloads: 5432,
      rating: 4.9,
      reviewCount: 89,
      lastUpdate: '2024-01-20',
      license: 'Commercial',
      supportedLanguages: ['en', 'ko', 'ja']
    }
  ];

  const handleInstall = async (theme: Theme) => {
    try {
      setInstalling(theme.id);
      
      // Simulate installation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`${theme.name} 테마가 설치되었습니다`);
      navigate('/themes');
    } catch (error) {
      console.error('Error installing theme:', error);
      toast.error('테마 설치에 실패했습니다');
    } finally {
      setInstalling(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">({rating})</span>
      </div>
    );
  };

  const ThemeCard = ({ theme }: { theme: Theme }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <div className="relative">
        <img
          src={theme.screenshot || '/placeholder-theme.jpg'}
          alt={theme.name}
          className="w-full h-48 object-cover rounded-t-lg"
        />
        {theme.isPremium && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
            PREMIUM
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2">{theme.name}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {theme.description}
        </p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            {renderStars(theme.rating)}
            <span className="text-sm text-gray-500">
              {theme.reviewCount} reviews
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-gray-600">
              <Download className="w-4 h-4" />
              {theme.downloads.toLocaleString()}
            </span>
            <span className="text-gray-600">v{theme.version}</span>
          </div>
        </div>

        {theme.features && (
          <div className="flex flex-wrap gap-1 mb-4">
            {theme.features.slice(0, 3).map((feature, index) => (
              <span
                key={index}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
              >
                {feature}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          {theme.isPremium && theme.price ? (
            <span className="text-2xl font-bold text-green-600">
              ${theme.price}
            </span>
          ) : (
            <span className="text-lg font-semibold text-gray-700">
              무료
            </span>
          )}
          
          <div className="flex gap-2">
            {theme.demoUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(theme.demoUrl, '_blank');
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTheme(theme);
              }}
              disabled={installing === theme.id}
            >
              {installing === theme.id ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Info className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">테마 마켓플레이스</h1>
          <p className="text-gray-600 mt-1">프리미엄 테마와 무료 테마를 찾아보세요</p>
        </div>
        <Button onClick={() => navigate('/themes')}>
          내 테마 관리
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="테마 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="all">모든 타입</option>
                <option value="external">외부 테마</option>
                <option value="custom">커스텀 테마</option>
              </select>
              
              <select
                value={filters.isPremium}
                onChange={(e) => setFilters({ ...filters, isPremium: e.target.value })}
                className="px-3 py-2 border rounded-lg"
              >
                <option value="all">모든 가격</option>
                <option value="false">무료</option>
                <option value="true">프리미엄</option>
              </select>
              
              <div className="flex gap-1 border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Themes Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
        }>
          {themes.map((theme) => (
            <ThemeCard key={theme.id} theme={theme} />
          ))}
        </div>
      )}

      {/* Theme Detail Modal */}
      {selectedTheme && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">{selectedTheme.name}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTheme(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <img
                    src={selectedTheme.screenshot || '/placeholder-theme.jpg'}
                    alt={selectedTheme.name}
                    className="w-full rounded-lg"
                  />
                </div>

                <div className="space-y-4">
                  <p className="text-gray-600">{selectedTheme.description}</p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        작성자: {selectedTheme.author}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        버전: {selectedTheme.version}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        최종 업데이트: {selectedTheme.lastUpdate}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        지원 언어: {selectedTheme.supportedLanguages?.join(', ')}
                      </span>
                    </div>
                  </div>

                  {selectedTheme.features && (
                    <div>
                      <h3 className="font-semibold mb-2">주요 기능</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedTheme.features.map((feature, index) => (
                          <span
                            key={index}
                            className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTheme.requiredPlugins && (
                    <div>
                      <h3 className="font-semibold mb-2">필수 플러그인</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedTheme.requiredPlugins.map((plugin, index) => (
                          <span
                            key={index}
                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm"
                          >
                            {plugin}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex gap-3">
                    {selectedTheme.demoUrl && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(selectedTheme.demoUrl, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        미리보기
                      </Button>
                    )}
                    <Button
                      onClick={() => handleInstall(selectedTheme)}
                      disabled={installing === selectedTheme.id}
                      className="flex-1"
                    >
                      {installing === selectedTheme.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          설치 중...
                        </>
                      ) : (
                        <>
                          {selectedTheme.isPremium ? (
                            <>
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              ${selectedTheme.price} 구매
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              무료 설치
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeMarketplace;