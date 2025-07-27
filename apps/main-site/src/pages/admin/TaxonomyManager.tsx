import { useState, useEffect, FC } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Tag,
  Folder,
  Settings,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  Hash,
  List,
  Link
} from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

interface TaxonomyTerm {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  count: number;
  order: number;
}

interface Taxonomy {
  slug: string;
  name: string;
  singularName: string;
  description?: string;
  type: 'hierarchical' | 'flat'; // 계층형(카테고리) vs 평면형(태그)
  icon: string;
  connectedCPTs: string[]; // 연결된 CPT 목록
  settings: {
    public: boolean;
    showInMenu: boolean;
    hierarchical: boolean;
  };
  terms: TaxonomyTerm[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const TaxonomyManager: React.FC = () => {
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<Taxonomy | null>(null);
  const [expandedTaxonomies, setExpandedTaxonomies] = useState<string[]>([]);

  // 새 Taxonomy 생성 폼 상태
  const [newTaxonomy, setNewTaxonomy] = useState({
    slug: '',
    name: '',
    singularName: '',
    description: '',
    type: 'hierarchical' as 'hierarchical' | 'flat',
    icon: '🏷️',
    connectedCPTs: [] as string[],
    settings: {
      public: true,
      showInMenu: true,
      hierarchical: true
    }
  });

  // 새 Term 추가 상태
  const [newTerm, setNewTerm] = useState({
    name: '',
    slug: '',
    description: '',
    parentId: ''
  });

  // 사용 가능한 CPT 목록 (Mock)
  const [availableCPTs] = useState([
    { slug: 'product', name: '상품' },
    { slug: 'event', name: '이벤트' },
    { slug: 'service', name: '서비스' },
    { slug: 'portfolio', name: '포트폴리오' }
  ]);

  useEffect(() => {
    loadTaxonomies();
  }, []);

  const loadTaxonomies = async () => {
    try {
      // Mock data for demonstration
      const mockTaxonomies: Taxonomy[] = [
        {
          slug: 'location',
          name: '지역',
          singularName: '지역',
          description: '제품이나 서비스가 제공되는 지역 분류',
          type: 'hierarchical',
          icon: '📍',
          connectedCPTs: ['product', 'service'],
          settings: {
            public: true,
            showInMenu: true,
            hierarchical: true
          },
          terms: [
            { id: '1', name: '서울특별시', slug: 'seoul', count: 25, order: 0 },
            { id: '2', name: '강남구', slug: 'gangnam', parentId: '1', count: 10, order: 0 },
            { id: '3', name: '서초구', slug: 'seocho', parentId: '1', count: 8, order: 1 },
            { id: '4', name: '경기도', slug: 'gyeonggi', count: 15, order: 1 }
          ],
          active: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-15'
        },
        {
          slug: 'tags',
          name: '태그',
          singularName: '태그',
          description: '콘텐츠를 설명하는 키워드',
          type: 'flat',
          icon: '🏷️',
          connectedCPTs: ['product', 'event', 'portfolio'],
          settings: {
            public: true,
            showInMenu: true,
            hierarchical: false
          },
          terms: [
            { id: '5', name: '인기', slug: 'popular', count: 12, order: 0 },
            { id: '6', name: '신제품', slug: 'new', count: 8, order: 1 },
            { id: '7', name: '할인', slug: 'sale', count: 5, order: 2 }
          ],
          active: true,
          createdAt: '2025-01-01',
          updatedAt: '2025-01-10'
        }
      ];

      setTaxonomies(mockTaxonomies);
    } catch (error) {
      console.error('Taxonomy 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTaxonomy = async () => {
    try {
      const taxonomyData = {
        ...newTaxonomy,
        settings: {
          ...newTaxonomy.settings,
          hierarchical: newTaxonomy.type === 'hierarchical'
        }
      };

      // API 호출 (Mock)
      console.log('Creating taxonomy:', taxonomyData);
      
      await loadTaxonomies();
      resetForm();
      setActiveTab('list');
      alert('✅ Taxonomy가 성공적으로 생성되었습니다!');
    } catch (error) {
      console.error('Taxonomy 생성 실패:', error);
      alert('❌ Taxonomy 생성 중 오류가 발생했습니다.');
    }
  };

  const deleteTaxonomy = async (slug: string) => {
    if (!confirm('정말로 이 Taxonomy를 삭제하시겠습니까? 연결된 모든 term도 함께 삭제됩니다.')) return;

    try {
      // API 호출 (Mock)
      console.log('Deleting taxonomy:', slug);
      
      setTaxonomies(prev => prev.filter(tax => tax.slug !== slug));
      alert('✅ Taxonomy가 삭제되었습니다.');
    } catch (error) {
      console.error('Taxonomy 삭제 실패:', error);
      alert('❌ 삭제 중 오류가 발생했습니다.');
    }
  };

  const resetForm = () => {
    setNewTaxonomy({
      slug: '',
      name: '',
      singularName: '',
      description: '',
      type: 'hierarchical',
      icon: '🏷️',
      connectedCPTs: [],
      settings: {
        public: true,
        showInMenu: true,
        hierarchical: true
      }
    });
  };

  const toggleTaxonomyExpanded = (slug: string) => {
    setExpandedTaxonomies(prev =>
      prev.includes(slug)
        ? prev.filter(s => s !== slug)
        : [...prev, slug]
    );
  };

  const addTerm = (taxonomySlug: string) => {
    // Term 추가 로직 (나중에 구현)
    console.log('Adding term to:', taxonomySlug, newTerm);
  };

  const renderTermHierarchy = (terms: TaxonomyTerm[], parentId?: string, level = 0) => {
    const childTerms = terms.filter(term => term.parentId === parentId);
    
    return childTerms.map(term => (
      <div key={term.id} className={`${level > 0 ? `ml-${level * 4}` : ''}`}>
        <div className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-md group">
          <div className="flex items-center gap-2">
            {level > 0 && <div className="w-4 h-0.5 bg-gray-300" />}
            <Folder className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900">{term.name}</span>
            <span className="text-xs text-gray-500">({term.count})</span>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1 text-gray-400 hover:text-blue-600">
              <Edit3 className="w-3 h-3" />
            </button>
            <button className="p-1 text-gray-400 hover:text-red-600">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        {renderTermHierarchy(terms, term.id, level + 1)}
      </div>
    ));
  };

  const getTaxonomyIcon = (type: string) => {
    return type === 'hierarchical' ? <Folder className="w-5 h-5" /> : <Hash className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <AdminLayout title="Taxonomy 관리" subtitle="분류 체계를 생성하고 관리하세요">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Taxonomy 목록을 로드하는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Taxonomy 관리" 
      subtitle="분류 체계를 생성하고 관리하세요"
      fullWidth={activeTab === 'create'}
    >
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Tag className="w-4 h-4 inline mr-2" />
            Taxonomy 목록
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            새 Taxonomy 생성
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'list' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">등록된 Taxonomy 목록</h3>
                <p className="text-sm text-gray-500">총 {taxonomies.length}개의 분류 체계가 등록되어 있습니다.</p>
              </div>
              <button
                onClick={() => setActiveTab('create')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                새 Taxonomy 생성
              </button>
            </div>

            {taxonomies.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  아직 생성된 Taxonomy가 없습니다
                </h3>
                <p className="text-gray-600 mb-4">
                  첫 번째 분류 체계를 생성해보세요
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  새 Taxonomy 생성
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {taxonomies.map((taxonomy) => {
                  const isExpanded = expandedTaxonomies.includes(taxonomy.slug);
                  
                  return (
                    <div key={taxonomy.slug} className="bg-white rounded-lg shadow-sm border border-gray-200">
                      {/* Header */}
                      <div className="p-6 border-b border-gray-100">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{taxonomy.icon}</span>
                            <div>
                              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                {taxonomy.name}
                                {getTaxonomyIcon(taxonomy.type)}
                              </h3>
                              <p className="text-sm text-gray-500">/{taxonomy.slug}</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => {/* TODO: 편집 기능 */}}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="편집"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteTaxonomy(taxonomy.slug)}
                              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {taxonomy.description && (
                          <p className="text-gray-600 text-sm mb-4">{taxonomy.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <span className="text-gray-500">
                              유형: <span className="font-medium">
                                {taxonomy.type === 'hierarchical' ? '계층형' : '평면형'}
                              </span>
                            </span>
                            <span className="text-gray-500">
                              Terms: <span className="font-medium">{taxonomy.terms.length}개</span>
                            </span>
                          </div>
                          <button
                            onClick={() => toggleTaxonomyExpanded(taxonomy.slug)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                          >
                            {isExpanded ? 
                              <>접기 <ChevronDown className="w-4 h-4" /></> : 
                              <>펼치기 <ChevronRight className="w-4 h-4" /></>
                            }
                          </button>
                        </div>
                      </div>

                      {/* Connected CPTs */}
                      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center gap-2 text-sm">
                          <Link className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-500">연결된 CPT:</span>
                          {taxonomy.connectedCPTs.length > 0 ? (
                            <div className="flex gap-2">
                              {taxonomy.connectedCPTs.map(cptSlug => {
                                const cpt = availableCPTs.find(c => c.slug === cptSlug);
                                return (
                                  <span key={cptSlug} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    {cpt?.name || cptSlug}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">연결된 CPT 없음</span>
                          )}
                        </div>
                      </div>

                      {/* Terms List */}
                      {isExpanded && (
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-medium text-gray-900">Terms</h4>
                            <button className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                              <Plus className="w-3 h-3" />
                              Term 추가
                            </button>
                          </div>

                          {taxonomy.terms.length === 0 ? (
                            <div className="text-center py-4 border border-dashed border-gray-200 rounded">
                              <p className="text-gray-500 text-sm">아직 생성된 term이 없습니다</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {taxonomy.type === 'hierarchical' ? 
                                renderTermHierarchy(taxonomy.terms) :
                                taxonomy.terms.map(term => (
                                  <div key={term.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-md group">
                                    <div className="flex items-center gap-2">
                                      <Hash className="w-4 h-4 text-gray-500" />
                                      <span className="text-sm font-medium text-gray-900">{term.name}</span>
                                      <span className="text-xs text-gray-500">({term.count})</span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button className="p-1 text-gray-400 hover:text-blue-600">
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                      <button className="p-1 text-gray-400 hover:text-red-600">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              }
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">새 Taxonomy 생성</h3>
              <p className="text-gray-600 mt-1">분류 체계의 기본 정보를 설정하세요</p>
            </div>
            
            <div className="space-y-6">
              {/* 기본 정보 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">기본 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Taxonomy 슬러그 *
                    </label>
                    <input
                      type="text"
                      value={newTaxonomy.slug}
                      onChange={(e) => setNewTaxonomy(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="예: category, location, tags"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">URL과 API에서 사용됩니다 (영문, 숫자, - 만 가능)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      복수형 이름 *
                    </label>
                    <input
                      type="text"
                      value={newTaxonomy.name}
                      onChange={(e) => setNewTaxonomy(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="예: 카테고리, 지역, 태그"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      단수형 이름 *
                    </label>
                    <input
                      type="text"
                      value={newTaxonomy.singularName}
                      onChange={(e) => setNewTaxonomy(prev => ({ ...prev, singularName: e.target.value }))}
                      placeholder="예: 카테고리, 지역, 태그"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      아이콘
                    </label>
                    <input
                      type="text"
                      value={newTaxonomy.icon}
                      onChange={(e) => setNewTaxonomy(prev => ({ ...prev, icon: e.target.value }))}
                      placeholder="🏷️"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      설명
                    </label>
                    <textarea
                      value={newTaxonomy.description}
                      onChange={(e) => setNewTaxonomy(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="이 분류 체계의 용도를 설명해주세요"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 타입 및 설정 */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">타입 및 설정</h4>
                
                <div className="space-y-6">
                  {/* Taxonomy 타입 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Taxonomy 타입 *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="relative">
                        <input
                          type="radio"
                          name="taxonomyType"
                          value="hierarchical"
                          checked={newTaxonomy.type === 'hierarchical'}
                          onChange={(e) => setNewTaxonomy(prev => ({ 
                            ...prev, 
                            type: e.target.value as 'hierarchical' | 'flat',
                            settings: { ...prev.settings, hierarchical: true }
                          }))}
                          className="sr-only"
                        />
                        <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          newTaxonomy.type === 'hierarchical' 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}>
                          <div className="flex items-center gap-3">
                            <Folder className="w-6 h-6 text-blue-600" />
                            <div>
                              <div className="font-medium text-gray-900">계층형 (Category)</div>
                              <div className="text-sm text-gray-500">부모-자식 관계를 가지는 분류</div>
                              <div className="text-xs text-gray-400 mt-1">예: 지역 &gt; 서울 &gt; 강남구</div>
                            </div>
                          </div>
                        </div>
                      </label>
                      
                      <label className="relative">
                        <input
                          type="radio"
                          name="taxonomyType"
                          value="flat"
                          checked={newTaxonomy.type === 'flat'}
                          onChange={(e) => setNewTaxonomy(prev => ({ 
                            ...prev, 
                            type: e.target.value as 'hierarchical' | 'flat',
                            settings: { ...prev.settings, hierarchical: false }
                          }))}
                          className="sr-only"
                        />
                        <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          newTaxonomy.type === 'flat' 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}>
                          <div className="flex items-center gap-3">
                            <Hash className="w-6 h-6 text-green-600" />
                            <div>
                              <div className="font-medium text-gray-900">평면형 (Tags)</div>
                              <div className="text-sm text-gray-500">평면적인 키워드 분류</div>
                              <div className="text-xs text-gray-400 mt-1">예: 인기, 신제품, 할인</div>
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* 연결할 CPT 선택 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      연결할 Custom Post Types
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {availableCPTs.map(cpt => (
                        <label key={cpt.slug} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newTaxonomy.connectedCPTs.includes(cpt.slug)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewTaxonomy(prev => ({
                                  ...prev,
                                  connectedCPTs: [...prev.connectedCPTs, cpt.slug]
                                }));
                              } else {
                                setNewTaxonomy(prev => ({
                                  ...prev,
                                  connectedCPTs: prev.connectedCPTs.filter(slug => slug !== cpt.slug)
                                }));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">{cpt.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 기타 설정 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      기타 설정
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newTaxonomy.settings.public}
                          onChange={(e) => setNewTaxonomy(prev => ({
                            ...prev,
                            settings: { ...prev.settings, public: e.target.checked }
                          }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">공개 (프론트엔드에서 접근 가능)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newTaxonomy.settings.showInMenu}
                          onChange={(e) => setNewTaxonomy(prev => ({
                            ...prev,
                            settings: { ...prev.settings, showInMenu: e.target.checked }
                          }))}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">관리자 메뉴에 표시</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    resetForm();
                    setActiveTab('list');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={createTaxonomy}
                  disabled={!newTaxonomy.slug || !newTaxonomy.name || !newTaxonomy.singularName}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Taxonomy 생성
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default TaxonomyManager;