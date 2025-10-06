import { FC, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Menu,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ChevronRight,
  Link2,
  FileText,
  Folder,
  Tag,
  Move,
  Edit2,
  X,
  Search,
  ExternalLink,
  Type,
  AlertCircle,
  Check,
  ChevronUp,
  Settings,
  Code,
  Globe,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authClient } from '@o4o/auth-client';

// Types
interface MenuItem {
  id: string;
  title: string;
  url?: string;
  type: 'page' | 'post' | 'custom' | 'category' | 'tag';
  target?: '_blank' | '_self' | '_parent' | '_top';
  cssClass?: string;
  description?: string;
  linkRelationship?: string; // rel attribute (nofollow, noopener, etc.)
  titleAttribute?: string; // title attribute for tooltip
  visibility?: 'public' | 'private' | 'protected';
  children?: MenuItem[];
  isOpen?: boolean;
  isExpanded?: boolean; // For accordion settings panel
  originalId?: string;
}

interface MenuLocation {
  id: string;
  name: string;
  description: string;
}

interface AvailableItem {
  id: string;
  title: string;
  type: 'page' | 'post' | 'category' | 'tag';
  url?: string;
}

const WordPressMenuEditorEnhanced: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const dragItem = useRef<MenuItem | null>(null);
  const dragOverItem = useRef<MenuItem | null>(null);
  
  // Menu data
  const [menuName, setMenuName] = useState('');
  const [menuSlug, setMenuSlug] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [menuDescription, setMenuDescription] = useState('');

  // Advanced settings (metadata)
  const [subdomain, setSubdomain] = useState<string>('');
  const [pathPrefix, setPathPrefix] = useState<string>('');
  const [theme, setTheme] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  
  // UI state
  const [activeTab, setActiveTab] = useState<'pages' | 'posts' | 'links' | 'categories' | 'tags'>('pages');
  const [showAddCustomLink, setShowAddCustomLink] = useState(false);
  const [customLinkTitle, setCustomLinkTitle] = useState('');
  const [customLinkUrl, setCustomLinkUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  // Available items (mock data)
  const [pages] = useState<AvailableItem[]>([
    { id: 'page-1', title: '홈', type: 'page', url: '/' },
    { id: 'page-2', title: '회사 소개', type: 'page', url: '/about' },
    { id: 'page-3', title: '서비스', type: 'page', url: '/services' },
    { id: 'page-4', title: '포트폴리오', type: 'page', url: '/portfolio' },
    { id: 'page-5', title: '연락처', type: 'page', url: '/contact' },
    { id: 'page-6', title: '개인정보처리방침', type: 'page', url: '/privacy' },
    { id: 'page-7', title: '이용약관', type: 'page', url: '/terms' }
  ]);
  
  const [posts] = useState<AvailableItem[]>([
    { id: 'post-1', title: '최신 뉴스 업데이트', type: 'post', url: '/blog/latest-news' },
    { id: 'post-2', title: '제품 출시 안내', type: 'post', url: '/blog/product-launch' },
    { id: 'post-3', title: '이벤트 공지사항', type: 'post', url: '/blog/event-notice' }
  ]);
  
  const [categories] = useState<AvailableItem[]>([
    { id: 'cat-1', title: '뉴스', type: 'category', url: '/category/news' },
    { id: 'cat-2', title: '공지사항', type: 'category', url: '/category/notice' },
    { id: 'cat-3', title: '이벤트', type: 'category', url: '/category/events' }
  ]);
  
  const [tags] = useState<AvailableItem[]>([
    { id: 'tag-1', title: '중요', type: 'tag', url: '/tag/important' },
    { id: 'tag-2', title: '신제품', type: 'tag', url: '/tag/new-product' },
    { id: 'tag-3', title: '업데이트', type: 'tag', url: '/tag/update' }
  ]);
  
  // Menu locations
  const menuLocations: MenuLocation[] = [
    { id: 'primary', name: '주 메뉴', description: '사이트 상단에 표시되는 메인 메뉴' },
    { id: 'footer', name: '푸터 메뉴', description: '사이트 하단에 표시되는 메뉴' },
    { id: 'mobile', name: '모바일 메뉴', description: '모바일 기기에서 표시되는 메뉴' },
    { id: 'social', name: '소셜 링크', description: '소셜 미디어 링크 메뉴' }
  ];

  // Load menu data if editing
  useEffect(() => {
    const loadMenuData = async () => {
      if (!id) return;

      try {
        const response = await authClient.api.get(`/api/menus/${id}`);

        if (response.data.success && response.data.data) {
          const menu = response.data.data;

          // Set basic menu data
          setMenuName(menu.name || '');
          setMenuSlug(menu.slug || '');
          setSelectedLocation(menu.location || '');
          setMenuDescription(menu.description || '');

          // Load metadata if exists
          if (menu.metadata) {
            setSubdomain(menu.metadata.subdomain || '');
            setPathPrefix(menu.metadata.path_prefix || '');
            setTheme(menu.metadata.theme || '');
            setLogoUrl(menu.metadata.logo_url || '');
          }

          // Convert and set menu items
          if (menu.items && Array.isArray(menu.items)) {
            const convertedItems = menu.items.map((item: any) => convertApiItemToMenuItem(item));
            setMenuItems(convertedItems);
          }
        }
      } catch (error) {
        console.error('Failed to load menu data:', error);
        toast.error('메뉴 데이터를 불러오는데 실패했습니다');
      }
    };

    loadMenuData();
  }, [id]);

  // Convert API menu item to UI format
  const convertApiItemToMenuItem = (apiItem: any): MenuItem => {
    const item: MenuItem = {
      id: apiItem.id || Date.now().toString() + Math.random(),
      title: apiItem.title,
      url: apiItem.url,
      type: apiItem.type || 'custom',
      target: apiItem.target,
      cssClass: apiItem.css_class,
      description: apiItem.description,
      linkRelationship: apiItem.link_relationship,
      titleAttribute: apiItem.title_attribute,
      visibility: apiItem.visibility,
      isExpanded: false,
      originalId: apiItem.original_id
    };

    if (apiItem.children && Array.isArray(apiItem.children)) {
      item.children = apiItem.children.map((child: any) => convertApiItemToMenuItem(child));
    }

    return item;
  };

  // Generate slug from menu name
  useEffect(() => {
    if (menuName && !id) {
      const slug = menuName
        .toLowerCase()
        .replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setMenuSlug(slug);
    }
  }, [menuName, id]);

  // Get available items based on active tab
  const getAvailableItems = () => {
    let items: AvailableItem[] = [];
    switch (activeTab) {
      case 'pages':
        items = pages;
        break;
      case 'posts':
        items = posts;
        break;
      case 'categories':
        items = categories;
        break;
      case 'tags':
        items = tags;
        break;
      default:
        items = [];
    }
    
    if (searchTerm) {
      return items.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return items;
  };

  // Add items to menu
  const addItemsToMenu = () => {
    if (selectedItems.length === 0) {
      toast.error('항목을 선택해주세요');
      return;
    }
    
    const availableItems = getAvailableItems();
    const newItems: MenuItem[] = selectedItems.map(itemId => {
      const item = availableItems.find(i => i.id === itemId);
      if (item) {
        return {
          id: Date.now().toString() + Math.random(),
          title: item.title,
          url: item.url,
          type: item.type,
          originalId: item.id,
          isExpanded: false
        };
      }
      return null;
    }).filter(Boolean) as MenuItem[];
    
    setMenuItems([...menuItems, ...newItems]);
    setSelectedItems([]);
    toast.success(`${newItems.length}개 항목이 추가되었습니다`);
  };

  // Add custom link
  const addCustomLink = () => {
    if (!customLinkTitle || !customLinkUrl) {
      toast.error('제목과 URL을 입력해주세요');
      return;
    }
    
    const newItem: MenuItem = {
      id: Date.now().toString(),
      title: customLinkTitle,
      url: customLinkUrl,
      type: 'custom',
      isExpanded: false
    };
    
    setMenuItems([...menuItems, newItem]);
    setCustomLinkTitle('');
    setCustomLinkUrl('');
    setShowAddCustomLink(false);
    toast.success('사용자 정의 링크가 추가되었습니다');
  };

  // Remove menu item
  const removeMenuItem = (itemId: string) => {
    const removeItemRecursive = (items: MenuItem[]): MenuItem[] => {
      return items.filter(item => {
        if (item.id === itemId) {
          return false;
        }
        if (item.children) {
          item.children = removeItemRecursive(item.children);
        }
        return true;
      });
    };
    
    setMenuItems(removeItemRecursive(menuItems));
    toast.success('메뉴 항목이 삭제되었습니다');
  };

  // Update menu item
  const updateMenuItem = (itemId: string, updates: Partial<MenuItem>) => {
    const updateItemRecursive = (items: MenuItem[]): MenuItem[] => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, ...updates };
        }
        if (item.children) {
          return { ...item, children: updateItemRecursive(item.children) };
        }
        return item;
      });
    };
    
    setMenuItems(updateItemRecursive(menuItems));
  };

  // Toggle item expansion (for accordion)
  const toggleItemExpansion = (itemId: string) => {
    const toggleRecursive = (items: MenuItem[]): MenuItem[] => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, isExpanded: !item.isExpanded };
        }
        if (item.children) {
          return { ...item, children: toggleRecursive(item.children) };
        }
        return item;
      });
    };
    
    setMenuItems(toggleRecursive(menuItems));
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: MenuItem) => {
    dragItem.current = item;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (_e: React.DragEvent, item: MenuItem) => {
    dragOverItem.current = item;
  };

  const handleDragEnd = () => {
    if (dragItem.current && dragOverItem.current && dragItem.current.id !== dragOverItem.current.id) {
      const draggedItem = dragItem.current;
      const targetItem = dragOverItem.current;
      
      const removeItem = (items: MenuItem[]): { items: MenuItem[], removed?: MenuItem } => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].id === draggedItem.id) {
            const removed = items.splice(i, 1)[0];
            return { items, removed };
          }
          if (items[i].children) {
            const result = removeItem(items[i].children!);
            if (result.removed) {
              return { items, removed: result.removed };
            }
          }
        }
        return { items };
      };
      
      const insertItem = (items: MenuItem[], itemToInsert: MenuItem, targetId: string): MenuItem[] => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].id === targetId) {
            items.splice(i + 1, 0, itemToInsert);
            return items;
          }
          if (items[i].children) {
            items[i].children = insertItem(items[i].children!, itemToInsert, targetId);
          }
        }
        return items;
      };
      
      let newItems = [...menuItems];
      const { items: itemsAfterRemove, removed } = removeItem(newItems);
      if (removed) {
        newItems = insertItem(itemsAfterRemove, removed, targetItem.id);
        setMenuItems(newItems);
      }
    }
    
    dragItem.current = null;
    dragOverItem.current = null;
    setIsDragging(false);
  };

  // Save menu
  const saveMenu = async () => {
    if (!menuName) {
      toast.error('메뉴 이름을 입력해주세요');
      return;
    }

    if (!selectedLocation) {
      toast.error('메뉴 위치를 선택해주세요');
      return;
    }

    // Validate path prefix
    if (pathPrefix && !pathPrefix.startsWith('/')) {
      toast.error('경로 접두사는 /로 시작해야 합니다');
      return;
    }

    try {
      // Build metadata
      const metadata: any = {};
      if (subdomain) metadata.subdomain = subdomain;
      if (pathPrefix) metadata.path_prefix = pathPrefix;
      if (theme) metadata.theme = theme;
      if (logoUrl) metadata.logo_url = logoUrl;

      const menuData = {
        name: menuName,
        slug: menuSlug,
        location: selectedLocation,
        description: menuDescription || undefined,
        is_active: true,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        items: menuItems.map(item => convertMenuItemForApi(item))
      };

      let response;
      if (id) {
        // Update existing menu
        response = await authClient.api.put(`/api/menus/${id}`, menuData);
      } else {
        // Create new menu
        response = await authClient.api.post('/api/menus', menuData);
      }

      if (response.data.success) {
        toast.success(id ? '메뉴가 수정되었습니다!' : '메뉴가 생성되었습니다!');
        navigate('/menus');
      } else {
        throw new Error(response.data.error || 'Failed to save menu');
      }
    } catch (error: any) {
      console.error('Menu save error:', error);
      const errorMessage = error.response?.data?.error || error.message || '메뉴 저장 중 오류가 발생했습니다';
      toast.error(errorMessage);
    }
  };

  // Convert menu item to API format
  const convertMenuItemForApi = (item: MenuItem): any => {
    const apiItem: any = {
      title: item.title,
      url: item.url || '',
      type: item.type,
      target: item.target || '_self',
      css_class: item.cssClass,
      description: item.description,
      link_relationship: item.linkRelationship,
      title_attribute: item.titleAttribute,
      visibility: item.visibility || 'public'
    };

    if (item.children && item.children.length > 0) {
      apiItem.children = item.children.map(child => convertMenuItemForApi(child));
    }

    return apiItem;
  };

  // Render menu item with WordPress-style accordion
  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const isExpanded = item.isExpanded;
    
    return (
      <div key={item.id} className={`${depth > 0 ? 'ml-8' : ''}`}>
        <div
          className={`group bg-white border rounded-lg mb-2 ${
            isDragging ? 'cursor-move' : ''
          } ${isExpanded ? 'border-blue-300' : 'hover:border-gray-300'} transition-all`}
          draggable={!isExpanded}
          onDragStart={(e) => !isExpanded && handleDragStart(e, item)}
          onDragEnter={(e) => !isExpanded && handleDragEnter(e, item)}
          onDragEnd={!isExpanded ? handleDragEnd : undefined}
        >
          {/* Main Item Bar */}
          <div 
            className={`p-3 ${isExpanded ? 'bg-gray-50 border-b' : ''} cursor-pointer`}
            onClick={() => !isExpanded && toggleItemExpansion(item.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                {!isExpanded && (
                  <Move className="w-4 h-4 text-gray-400 mr-3 cursor-move" />
                )}
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{item.title}</span>
                    {item.type === 'page' && <FileText className="w-3 h-3 text-blue-500" />}
                    {item.type === 'post' && <Type className="w-3 h-3 text-green-500" />}
                    {item.type === 'category' && <Folder className="w-3 h-3 text-orange-500" />}
                    {item.type === 'tag' && <Tag className="w-3 h-3 text-purple-500" />}
                    {item.type === 'custom' && <Link2 className="w-3 h-3 text-gray-500" />}
                    {item.target === '_blank' && <ExternalLink className="w-3 h-3 text-gray-400" />}
                    {item.visibility === 'private' && <EyeOff className="w-3 h-3 text-red-400" />}
                    {item.visibility === 'protected' && <Eye className="w-3 h-3 text-yellow-400" />}
                  </div>
                  {!isExpanded && item.url && (
                    <div className="text-xs text-gray-500 mt-1">{item.url}</div>
                  )}
                  {!isExpanded && item.description && (
                    <div className="text-xs text-gray-600 italic mt-1">{item.description}</div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleItemExpansion(item.id);
                  }}
                  className={`p-1.5 ${isExpanded ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'} rounded transition-colors`}
                  title={isExpanded ? '설정 닫기' : '설정 열기'}
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {!isExpanded && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMenuItem(item.id);
                    }}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Accordion Settings Panel */}
          {isExpanded && (
            <div className="p-4 space-y-4 bg-gray-50">
              {/* Navigation Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  내비게이션 레이블
                </label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateMenuItem(item.id, { title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="메뉴에 표시될 텍스트"
                />
              </div>

              {/* URL */}
              {(item.type === 'custom' || showAdvancedSettings) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL
                  </label>
                  <input
                    type="text"
                    value={item.url || ''}
                    onChange={(e) => updateMenuItem(item.id, { url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com"
                    disabled={item.type !== 'custom'}
                  />
                </div>
              )}

              {/* Title Attribute */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  타이틀 속성
                </label>
                <input
                  type="text"
                  value={item.titleAttribute || ''}
                  onChange={(e) => updateMenuItem(item.id, { titleAttribute: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="마우스 오버 시 표시될 툴팁 텍스트"
                />
              </div>

              {/* Open link in new tab */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  링크 타겟
                </label>
                <select
                  value={item.target || '_self'}
                  onChange={(e) => updateMenuItem(item.id, { target: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="_self">같은 탭에서 열기</option>
                  <option value="_blank">새 탭에서 열기</option>
                  <option value="_parent">부모 프레임에서 열기</option>
                  <option value="_top">전체 창에서 열기</option>
                </select>
              </div>

              {/* CSS Classes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CSS 클래스 (선택사항)
                </label>
                <input
                  type="text"
                  value={item.cssClass || ''}
                  onChange={(e) => updateMenuItem(item.id, { cssClass: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="menu-item-custom"
                />
              </div>

              {/* Link Relationship (rel) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  링크 관계 (XFN)
                </label>
                <input
                  type="text"
                  value={item.linkRelationship || ''}
                  onChange={(e) => updateMenuItem(item.id, { linkRelationship: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="nofollow noopener"
                />
                <p className="text-xs text-gray-500 mt-1">
                  예: nofollow, noopener, noreferrer, sponsored
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={item.description || ''}
                  onChange={(e) => updateMenuItem(item.id, { description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="이 메뉴 항목에 대한 설명 (테마에 따라 표시될 수 있음)"
                />
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  가시성
                </label>
                <select
                  value={item.visibility || 'public'}
                  onChange={(e) => updateMenuItem(item.id, { visibility: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="public">공개</option>
                  <option value="private">비공개 (로그인 사용자만)</option>
                  <option value="protected">보호됨 (특정 역할만)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={() => toggleItemExpansion(item.id)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  <Check className="w-4 h-4 inline mr-1" />
                  완료
                </button>
                <button
                  onClick={() => {
                    toggleItemExpansion(item.id);
                    removeMenuItem(item.id);
                  }}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  삭제
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Children */}
        {item.children && (
          <div className="mt-1">
            {item.children.map(child => renderMenuItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">메뉴 편집 (WordPress 스타일)</h1>
            <p className="text-gray-600 mt-2">WordPress 스타일의 아코디언 UI로 메뉴를 관리합니다</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${
                showAdvancedSettings ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Settings className="w-4 h-4" />
              고급 설정
            </button>
            <button
              onClick={() => navigate('/menus')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={saveMenu}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center gap-2 shadow-sm"
            >
              <Save className="w-4 h-4" />
              메뉴 저장
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="flex gap-6">
          {/* Left Panel - Available Items */}
          <div className="w-96">
            {/* Menu Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">메뉴 설정</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    메뉴 이름
                  </label>
                  <input
                    type="text"
                    value={menuName}
                    onChange={(e) => setMenuName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="메뉴 이름 입력"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    메뉴 슬러그
                  </label>
                  <input
                    type="text"
                    value={menuSlug}
                    onChange={(e) => setMenuSlug(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="menu-slug"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    메뉴 설명
                  </label>
                  <textarea
                    value={menuDescription}
                    onChange={(e) => setMenuDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="메뉴에 대한 설명 (선택사항)"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
              <div className="p-4 border-b cursor-pointer" onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">고급 설정</h3>
                  {showAdvancedSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
              {showAdvancedSettings && (
                <div className="p-4 space-y-4">
                  {/* Subdomain Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      서브도메인
                    </label>
                    <select
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">전역 (모든 서브도메인)</option>
                      <option value="shop">shop</option>
                      <option value="forum">forum</option>
                      <option value="crowdfunding">crowdfunding</option>
                      <option value="admin">admin</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      이 메뉴를 표시할 서브도메인을 선택하세요. 선택하지 않으면 모든 서브도메인에서 표시됩니다.
                    </p>
                  </div>

                  {/* Path Prefix */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      경로 접두사 (선택사항)
                    </label>
                    <input
                      type="text"
                      value={pathPrefix}
                      onChange={(e) => setPathPrefix(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="/seller1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      특정 경로에서만 표시하려면 입력하세요 (예: /seller1). / 로 시작해야 합니다.
                    </p>
                  </div>

                  {/* Theme Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      테마
                    </label>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">기본 테마 (변경 없음)</option>
                      <option value="afternoon">🌅 Afternoon</option>
                      <option value="evening">🌆 Evening</option>
                      <option value="noon">☀️ Noon</option>
                      <option value="dusk">🌇 Dusk</option>
                      <option value="twilight">🌃 Twilight</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      이 메뉴가 활성화될 때 적용할 테마를 선택하세요.
                    </p>
                  </div>

                  {/* Logo URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      로고 URL (선택사항)
                    </label>
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/logo.png"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      이 메뉴가 활성화될 때 표시할 로고 URL을 입력하세요.
                    </p>
                    {logoUrl && (
                      <div className="mt-2">
                        <img src={logoUrl} alt="Logo preview" className="h-12 object-contain border rounded p-1" onError={(e) => {
                          e.currentTarget.src = '';
                          e.currentTarget.alt = '이미지를 불러올 수 없습니다';
                        }} />
                      </div>
                    )}
                  </div>

                  {/* Context Preview */}
                  {(subdomain || pathPrefix) && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm text-blue-800">
                        <Globe className="w-4 h-4 inline mr-1" />
                        <strong>표시 위치:</strong>{' '}
                        {subdomain ? `${subdomain}.neture.co.kr` : 'neture.co.kr'}
                        {pathPrefix && `${pathPrefix}`}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Add Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">메뉴에 추가</h3>
              </div>
              
              {/* Tabs */}
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab('pages')}
                  className={`flex-1 px-4 py-2 text-sm font-medium ${
                    activeTab === 'pages'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-1" />
                  페이지
                </button>
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`flex-1 px-4 py-2 text-sm font-medium ${
                    activeTab === 'posts'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Type className="w-4 h-4 inline mr-1" />
                  글
                </button>
                <button
                  onClick={() => setActiveTab('links')}
                  className={`flex-1 px-4 py-2 text-sm font-medium ${
                    activeTab === 'links'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Link2 className="w-4 h-4 inline mr-1" />
                  링크
                </button>
              </div>
              
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab('categories')}
                  className={`flex-1 px-4 py-2 text-sm font-medium ${
                    activeTab === 'categories'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Folder className="w-4 h-4 inline mr-1" />
                  카테고리
                </button>
                <button
                  onClick={() => setActiveTab('tags')}
                  className={`flex-1 px-4 py-2 text-sm font-medium ${
                    activeTab === 'tags'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Tag className="w-4 h-4 inline mr-1" />
                  태그
                </button>
              </div>
              
              {/* Content */}
              <div className="p-4">
                {activeTab === 'links' ? (
                  <div className="space-y-3">
                    {!showAddCustomLink ? (
                      <button
                        onClick={() => setShowAddCustomLink(true)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        <Plus className="w-4 h-4 inline mr-2" />
                        사용자 정의 링크 추가
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={customLinkUrl}
                          onChange={(e) => setCustomLinkUrl(e.target.value)}
                          placeholder="https://example.com"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          value={customLinkTitle}
                          onChange={(e) => setCustomLinkTitle(e.target.value)}
                          placeholder="링크 텍스트"
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={addCustomLink}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            추가
                          </button>
                          <button
                            onClick={() => {
                              setShowAddCustomLink(false);
                              setCustomLinkTitle('');
                              setCustomLinkUrl('');
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Search */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="검색..."
                        className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    
                    {/* Items List */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {getAvailableItems().map(item => (
                        <label
                          key={item.id}
                          className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItems([...selectedItems, item.id]);
                              } else {
                                setSelectedItems(selectedItems.filter(id => id !== item.id));
                              }
                            }}
                            className="mr-3"
                          />
                          <span className="text-sm">{item.title}</span>
                        </label>
                      ))}
                    </div>
                    
                    {/* Add to Menu Button */}
                    <button
                      onClick={addItemsToMenu}
                      disabled={selectedItems.length === 0}
                      className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      메뉴에 추가
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Menu Structure */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">메뉴 구조</h3>
                  <div className="text-sm text-gray-500">
                    드래그하여 순서 변경, 클릭하여 설정 편집
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                {menuItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Menu className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">메뉴 항목이 없습니다</p>
                    <p className="text-sm text-gray-400 mt-1">왼쪽 패널에서 항목을 추가해주세요</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {menuItems.map(item => renderMenuItem(item))}
                  </div>
                )}
              </div>

              {/* Menu Location */}
              {menuItems.length > 0 && (
                <div className="p-4 border-t bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-3">메뉴 위치</h4>
                  <div className="space-y-2">
                    {menuLocations.map(location => (
                      <label key={location.id} className="flex items-start cursor-pointer">
                        <input
                          type="radio"
                          name="menuLocation"
                          value={location.id}
                          checked={selectedLocation === location.id}
                          onChange={(e) => setSelectedLocation(e.target.value)}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <div className="font-medium text-sm">{location.name}</div>
                          <div className="text-xs text-gray-500">{location.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordPressMenuEditorEnhanced;