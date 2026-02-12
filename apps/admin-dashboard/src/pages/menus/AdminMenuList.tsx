import { FC, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  Plus,
  Edit2,
  Trash2,
  Copy,
  MapPin,
  Settings,
  ChevronRight,
  Search,
  Filter,
  Check,
  X,
  Smartphone,
  Monitor,
  Users,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MenuApi, Menu as MenuType } from '../../api/menuApi';
import { MenuLocations } from '../../types/menu.types';

interface MenuData {
  id: string;
  name: string;
  slug: string;
  location?: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

const AdminMenuList: FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);

  // API state management
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Utility: Transform API menu to display format
  const transformMenu = (menu: MenuType): MenuData => ({
    id: menu.id,
    name: menu.name,
    slug: menu.slug,
    location: menu.location,
    itemCount: menu.items?.length || 0,
    createdAt: menu.created_at || new Date().toISOString(),
    updatedAt: menu.updated_at || new Date().toISOString()
  });

  // Utility: Reload menus from API
  const reloadMenus = async () => {
    const response = await MenuApi.getMenus();
    setMenus(response.data.map(transformMenu));
  };

  // Fetch menus from API
  useEffect(() => {
    const loadMenus = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await reloadMenus();
      } catch (err) {
        const errorMessage = '메뉴 목록을 불러올 수 없습니다';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Failed to load menus:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMenus();
  }, []);
  
  const menuLocations: MenuLocations = {
    primary: { name: '주 메뉴', icon: Monitor, color: 'blue' },
    footer: { name: '푸터 메뉴', icon: MapPin, color: 'gray' },
    mobile: { name: '모바일 메뉴', icon: Smartphone, color: 'green' },
    social: { name: '소셜 링크', icon: Users, color: 'purple' },
    sidebar: { name: '사이드바', icon: Menu, color: 'gray' },
    'shop-categories': { name: '쇼핑 카테고리', icon: Menu, color: 'green' },
    'forum-menu': { name: '포럼 메뉴', icon: Menu, color: 'purple' },
    'funding-categories': { name: '펀딩 카테고리', icon: Menu, color: 'yellow' },
    'business-menu': { name: '비즈니스 메뉴', icon: Menu, color: 'red' }
  };
  
  // Filter menus based on search
  const filteredMenus = menus.filter(menu =>
    menu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    menu.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Delete menu
  const deleteMenu = async (menuId: string) => {
    if (!confirm('이 메뉴를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await MenuApi.deleteMenu(menuId);
      setMenus(menus.filter(m => m.id !== menuId));
      setSelectedMenus(selectedMenus.filter(id => id !== menuId));
      toast.success('메뉴가 삭제되었습니다');
    } catch (err) {
      toast.error('메뉴 삭제에 실패했습니다');
      console.error('Failed to delete menu:', err);
    }
  };

  // Duplicate menu
  const duplicateMenu = async (menu: MenuData) => {
    try {
      const duplicatedName = `${menu.name} (복사본)`;
      const duplicatedSlug = `${menu.slug}-copy`;
      await MenuApi.duplicateMenu(menu.id, duplicatedName, duplicatedSlug);
      await reloadMenus();
      toast.success(`"${menu.name}" 메뉴가 복제되었습니다`);
    } catch (err) {
      toast.error('메뉴 복제에 실패했습니다');
      console.error('Failed to duplicate menu:', err);
    }
  };
  
  // Bulk delete
  const bulkDelete = async () => {
    if (selectedMenus.length === 0) {
      toast.error('삭제할 메뉴를 선택하세요');
      return;
    }

    if (!confirm(`선택한 ${selectedMenus.length}개 메뉴를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      // Delete all selected menus
      await Promise.all(selectedMenus.map(id => MenuApi.deleteMenu(id)));
      setMenus(menus.filter(m => !selectedMenus.includes(m.id)));
      toast.success(`${selectedMenus.length}개 메뉴가 삭제되었습니다`);
      setSelectedMenus([]);
    } catch (err) {
      toast.error('일부 메뉴 삭제에 실패했습니다');
      console.error('Failed to bulk delete menus:', err);
    }
  };
  
  // Select all
  const selectAll = () => {
    if (selectedMenus.length === filteredMenus.length) {
      setSelectedMenus([]);
    } else {
      setSelectedMenus(filteredMenus.map(m => m.id));
    }
  };
  
  // Get location icon and color
  const getLocationStyle = (location?: string) => {
    if (!location || !menuLocations[location]) return null;
    const loc = menuLocations[location];
    const colors: Record<'blue' | 'gray' | 'green' | 'purple', string> = {
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      gray: 'bg-gray-100 text-gray-700 border-gray-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200'
    };
    
    return {
      icon: loc.icon,
      className: colors[loc.color],
      name: loc.name
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Menu className="w-8 h-8 text-gray-700" />
              메뉴
            </h1>
            <p className="text-gray-600 mt-2">사이트의 내비게이션 메뉴를 관리합니다</p>
          </div>
          <Link
            to="/appearance/menus/new"
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center gap-2 shadow-sm transition-all duration-200 transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">새 메뉴 만들기</span>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(menuLocations).map(([key, location]) => {
            const menuCount = menus.filter(m => m.location === key).length;
            const LocationIcon = location.icon;
            const style = getLocationStyle(key);

            return (
              <div key={key} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{location.name}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{menuCount}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${style?.className}`}>
                    <LocationIcon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="px-8 pb-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="메뉴 검색..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {selectedMenus.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-700">
                    {selectedMenus.length}개 선택됨
                  </span>
                  <button
                    onClick={bulkDelete}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    삭제
                  </button>
                  <button
                    onClick={() => setSelectedMenus([])}
                    className="text-sm text-gray-600 hover:text-gray-700"
                  >
                    선택 해제
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <Filter className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="px-8 pb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">메뉴 목록 불러오는 중...</h3>
              <p className="text-gray-500">잠시만 기다려주세요</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <Menu className="w-16 h-16 text-red-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">오류가 발생했습니다</h3>
              <p className="text-gray-500 mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                다시 시도
              </button>
            </div>
          ) : filteredMenus.length === 0 ? (
            <div className="text-center py-16">
              <Menu className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? '검색 결과가 없습니다' : '메뉴가 없습니다'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? '다른 검색어를 시도해보세요' : '첫 번째 메뉴를 만들어보세요'}
              </p>
              {!searchTerm && (
                <Link
                  to="/appearance/menus/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  새 메뉴 만들기
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="w-12 px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedMenus.length === filteredMenus.length && filteredMenus.length > 0}
                      onChange={selectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    메뉴 이름
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    위치
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    항목 수
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    마지막 수정
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMenus.map((menu) => {
                  const locationStyle = getLocationStyle(menu.location);
                  const LocationIcon = locationStyle?.icon;
                  
                  return (
                    <tr key={menu.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-5">
                        <input
                          type="checkbox"
                          checked={selectedMenus.includes(menu.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMenus([...selectedMenus, menu.id]);
                            } else {
                              setSelectedMenus(selectedMenus.filter(id => id !== menu.id));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-5">
                        <div>
                          <Link
                            to={`/appearance/menus/${menu.id}/edit`}
                            className="text-base font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {menu.name}
                          </Link>
                          <div className="flex items-center gap-3 mt-2">
                            {editingSlug === menu.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  defaultValue={menu.slug}
                                  className="px-2 py-0.5 text-xs border rounded"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      setEditingSlug(null);
                                      toast.success('슬러그가 업데이트되었습니다');
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingSlug(null);
                                    }
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={() => {
                                    setEditingSlug(null);
                                    toast.success('슬러그가 업데이트되었습니다');
                                  }}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingSlug(null)}
                                  className="text-gray-600 hover:text-gray-700"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500">
                                  슬러그: <code className="bg-gray-100 px-1 py-0.5 rounded">{menu.slug}</code>
                                </span>
                                <button
                                  onClick={() => setEditingSlug(menu.id)}
                                  className="text-xs text-blue-600 hover:text-blue-700"
                                >
                                  편집
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {locationStyle && LocationIcon && (
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${locationStyle.className}`}>
                            <LocationIcon className="w-3 h-3" />
                            {locationStyle.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">{menu.itemCount}</span>
                          <span className="text-xs text-gray-500">항목</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm text-gray-600">
                          {new Date(menu.updatedAt).toLocaleDateString('ko-KR')}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          생성: {new Date(menu.createdAt).toLocaleDateString('ko-KR')}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/appearance/menus/${menu.id}/edit`}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="편집"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => duplicateMenu(menu)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="복제"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteMenu(menu.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="px-8 pb-8">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">메뉴 사용 가이드</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">메뉴 만들기</h4>
              <ul className="space-y-1">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>"새 메뉴 만들기" 버튼을 클릭합니다</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>페이지, 글, 카테고리 등을 메뉴에 추가합니다</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>드래그 앤 드롭으로 순서를 조정합니다</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">메뉴 위치</h4>
              <ul className="space-y-1">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>주 메뉴: 사이트 상단 내비게이션</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>푸터 메뉴: 사이트 하단 링크</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>모바일 메뉴: 모바일 전용 내비게이션</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMenuList;