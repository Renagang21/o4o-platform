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
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import MenuApi, { MenuItem as MenuItemType, MenuLocation as MenuLocationType } from '../../api/menuApi';
import { unifiedApi } from '../../api/unified-client';
import { useAuthStore } from '@/stores/authStore';

// Types
interface MenuItem {
  id: string;
  title: string;
  url?: string;
  type: 'page' | 'post' | 'custom' | 'category' | 'tag';
  target?: '_blank' | '_self';
  cssClass?: string;
  description?: string;
  children?: MenuItem[];
  isOpen?: boolean;
  originalId?: string; // For pages/posts/categories
  menu_id?: string;
  parent_id?: string;
  order_num?: number;
  // Role-based access control
  display_mode?: 'show' | 'hide';
  target_audience?: {
    roles: string[];
    user_ids?: string[];
  };
}

interface MenuLocation {
  id: string;
  key?: string;
  name: string;
  description: string;
}

interface AvailableItem {
  id: string;
  title: string;
  type: 'page' | 'post' | 'category' | 'tag';
  url?: string;
}

const WordPressMenuEditor: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuthStore();
  const dragItem = useRef<MenuItem | null>(null);
  const dragOverItem = useRef<MenuItem | null>(null);
  
  // Permission checks
  const canCreateMenu = () => {
    if (!user) return false;
    return ['super_admin', 'admin', 'moderator', 'manager'].includes(user.role);
  };
  
  const canEditMenu = () => {
    if (!user) return false;
    return ['super_admin', 'admin', 'moderator', 'manager'].includes(user.role);
  };
  
  const canDeleteMenu = () => {
    if (!user) return false;
    return ['super_admin', 'admin'].includes(user.role);
  };
  
  // Menu data
  const [menuName, setMenuName] = useState('');
  const [menuSlug, setMenuSlug] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  
  // UI state
  const [activeTab, setActiveTab] = useState<'pages' | 'posts' | 'links' | 'categories' | 'tags'>('pages');
  const [showAddCustomLink, setShowAddCustomLink] = useState(false);
  const [customLinkTitle, setCustomLinkTitle] = useState('');
  const [customLinkUrl, setCustomLinkUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentMenuId, setCurrentMenuId] = useState<string | null>(null);
  
  // Available items - will be loaded from API
  const [pages, setPages] = useState<AvailableItem[]>([]);
  const [posts, setPosts] = useState<AvailableItem[]>([]);
  const [categories, setCategories] = useState<AvailableItem[]>([]);
  const [tags, setTags] = useState<AvailableItem[]>([]);
  
  // Role-based access control
  const [availableRoles, setAvailableRoles] = useState<Array<{value: string, label: string}>>([]);
  const [menuLocations, setMenuLocations] = useState<MenuLocation[]>([]);

  // Load user roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
        
        const response = await fetch(`${apiUrl}/api/v1/users/roles`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const roles = [
              { value: 'everyone', label: 'Everyone' },
              { value: 'logged_out', label: 'Logged Out Users' },
              ...result.data.map((role: any) => ({
                value: role.value,
                label: role.label
              }))
            ];
            setAvailableRoles(roles);
          }
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
        // Fallback to basic roles
        setAvailableRoles([
          { value: 'everyone', label: 'Everyone' },
          { value: 'logged_out', label: 'Logged Out Users' },
          { value: 'super_admin', label: 'Super Admin' },
          { value: 'admin', label: 'Admin' },
          { value: 'moderator', label: 'Moderator' }
        ]);
      }
    };

    fetchRoles();
  }, []);

  // Load available items and menu locations
  useEffect(() => {
    loadAvailableItems();
    loadMenuLocations();
  }, []);

  // Load menu data if editing
  useEffect(() => {
    if (id) {
      loadMenu(id);
    }
  }, [id]);

  const loadAvailableItems = async () => {
    try {
      // Load pages
      const pagesResponse = await (unifiedApi as any).raw.get('/v1/content/pages?limit=100');
      if (pagesResponse.data?.status === 'success' && Array.isArray(pagesResponse.data?.data)) {
        setPages(pagesResponse.data.data.map((page: any) => ({
          id: page.id,
          title: page.title,
          type: 'page' as const,
          url: `/${page.slug}`
        })));
      }

      // Load posts
      const postsResponse = await (unifiedApi as any).raw.get('/v1/content/posts?limit=100');
      if (postsResponse.data?.status === 'success' && Array.isArray(postsResponse.data?.data)) {
        setPosts(postsResponse.data.data.map((post: any) => ({
          id: post.id,
          title: post.title,
          type: 'post' as const,
          url: `/blog/${post.slug}`
        })));
      }

      // Load categories
      const categoriesResponse = await (unifiedApi as any).raw.get('/v1/content/categories?limit=100');
      if (categoriesResponse.data?.status === 'success' && Array.isArray(categoriesResponse.data?.data)) {
        setCategories(categoriesResponse.data.data.map((cat: any) => ({
          id: cat.id,
          title: cat.name,
          type: 'category' as const,
          url: `/category/${cat.slug}`
        })));
      }

      // Load tags
      const tagsResponse = await (unifiedApi as any).raw.get('/v1/content/tags?limit=100');
      if (tagsResponse.data?.status === 'success' && Array.isArray(tagsResponse.data?.data)) {
        setTags(tagsResponse.data.data.map((tag: any) => ({
          id: tag.id,
          title: tag.name,
          type: 'tag' as const,
          url: `/tag/${tag.slug}`
        })));
      }
    } catch (error) {
      // Show error to help debugging
      toast.error('콘텐츠 목록을 불러오는데 실패했습니다');
    }
  };

  const loadMenuLocations = async () => {
    try {
      const response = await MenuApi.getMenuLocations();
      if (response.success && Array.isArray(response.data)) {
        setMenuLocations(response.data.map((loc: MenuLocationType) => ({
          id: loc.key || loc.id,
          key: loc.key,
          name: loc.name,
          description: loc.description || ''
        })));
      }
    } catch (error) {
      // Error log removed
      // Use default locations as fallback
      setMenuLocations([
        { id: 'primary', key: 'primary', name: '주 메뉴', description: '사이트 상단에 표시되는 메인 메뉴' },
        { id: 'footer', key: 'footer', name: '푸터 메뉴', description: '사이트 하단에 표시되는 메뉴' },
        { id: 'mobile', key: 'mobile', name: '모바일 메뉴', description: '모바일 기기에서 표시되는 메뉴' },
        { id: 'social', key: 'social', name: '소셜 링크', description: '소셜 미디어 링크 메뉴' }
      ]);
    }
  };

  const loadMenu = async (menuId: string) => {
    setIsLoading(true);
    try {
      const response = await MenuApi.getMenu(menuId);
      if (response.success && response.data) {
        const menu = response.data;
        setCurrentMenuId(menu.id);
        setMenuName(menu.name);
        setMenuSlug(menu.slug);
        setSelectedLocation(menu.location || '');
        
        // Convert API menu items to component format
        if (menu.items && menu.items.length > 0) {
          const convertedItems = convertApiItemsToMenuItems(menu.items);
          setMenuItems(convertedItems);
        }
      }
    } catch (error) {
      // Error log removed
      toast.error('메뉴를 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const convertApiItemsToMenuItems = (apiItems: MenuItemType[]): MenuItem[] => {
    return apiItems.map(item => ({
      id: item.id,
      title: item.title,
      url: item.url,
      type: (item.type || 'custom') as any,
      target: item.target as any,
      cssClass: item.css_classes,
      description: item.description,
      originalId: item.object_id,
      children: item.children ? convertApiItemsToMenuItems(item.children) : [],
      menu_id: item.menu_id,
      order_num: item.order_num
    }));
  };

  const convertMenuItemsToApiFormat = (items: MenuItem[], menuId: string, parentId?: string): any[] => {
    return items.map((item, index) => ({
      id: item.id.startsWith('new-') ? undefined : item.id,
      menu_id: menuId,
      parent_id: parentId,
      title: item.title,
      url: item.url,
      type: item.type,
      target: item.target || '_self',
      object_id: item.originalId,
      css_classes: item.cssClass,
      description: item.description,
      order_num: index,
      is_active: true,
      display_mode: item.display_mode || 'show',
      target_audience: item.target_audience || { roles: ['everyone'] },
      children: item.children ? convertMenuItemsToApiFormat(item.children, menuId, item.id) : []
    }));
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
          display_mode: 'show',
          target_audience: {
            roles: ['everyone']
          }
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
      display_mode: 'show',
      target_audience: {
        roles: ['everyone']
      }
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

  // Toggle item expansion
  const toggleItemExpansion = (itemId: string) => {
    const toggleRecursive = (items: MenuItem[]): MenuItem[] => {
      return items.map(item => {
        if (item.id === itemId) {
          return { ...item, isOpen: !item.isOpen };
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
      // Reorder logic here
      const draggedItem = dragItem.current;
      const targetItem = dragOverItem.current;
      
      // Remove dragged item from its position
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
      
      // Insert item at new position
      const insertItem = (items: MenuItem[], itemToInsert: MenuItem, targetId: string): MenuItem[] => {
        for (let i = 0; i < items.length; i++) {
          if (items[i].id === targetId) {
            // Insert after target
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
    
    setIsSaving(true);
    try {
      const menuData = {
        name: menuName,
        slug: menuSlug || menuName.toLowerCase().replace(/\s+/g, '-'),
        location: selectedLocation,
        description: '',
        is_active: true
      };

      let savedMenu;
      if (currentMenuId || id) {
        // Update existing menu
        const response = await MenuApi.updateMenu(currentMenuId || id!, menuData);
        savedMenu = response.data;
      } else {
        // Create new menu
        const response = await MenuApi.createMenu(menuData);
        savedMenu = response.data;
        setCurrentMenuId(savedMenu.id);
      }

      // Save menu items
      if (savedMenu && menuItems.length > 0) {
        // First, delete all existing items for this menu
        if (currentMenuId || id) {
          // Note: We might need a bulk delete API endpoint
          // For now, we'll recreate all items
        }

        // Convert and save menu items
        const apiItems = convertMenuItemsToApiFormat(menuItems, savedMenu.id);
        
        // Create all menu items
        for (const item of apiItems) {
          await saveMenuItem(item, savedMenu.id);
        }
      }

      toast.success('메뉴가 저장되었습니다!');
      
      if (!id && !currentMenuId) {
        navigate('/menus');
      }
    } catch (error) {
      // Error log removed
      toast.error('메뉴 저장 중 오류가 발생했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to save menu item recursively
  const saveMenuItem = async (item: any, menuId: string, parentId?: string): Promise<string> => {
    const itemData = {
      menu_id: menuId,
      parent_id: parentId,
      title: item.title,
      url: item.url,
      type: item.type,
      target: item.target,
      object_id: item.object_id,
      css_classes: item.css_classes,
      description: item.description,
      order_num: item.order_num,
      is_active: true
    };

    let savedItemId = item.id;
    
    if (!item.id || item.id.startsWith('new-')) {
      // Create new item
      const response = await MenuApi.createMenuItem(itemData);
      savedItemId = response.data.id;
    } else {
      // Update existing item
      await MenuApi.updateMenuItem(item.id, itemData);
    }

    // Save children recursively
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        await saveMenuItem(child, menuId, savedItemId);
      }
    }

    return savedItemId;
  };

  // Render menu item
  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const isEditing = editingItem === item.id;
    
    return (
      <div key={item.id} className={`${depth > 0 ? 'ml-8' : ''}`}>
        <div
          className={`group bg-white border rounded-lg mb-2 ${
            isDragging ? 'cursor-move' : ''
          } hover:border-blue-300 transition-colors`}
          draggable
          onDragStart={(e) => handleDragStart(e, item)}
          onDragEnter={(e) => handleDragEnter(e, item)}
          onDragEnd={handleDragEnd}
        >
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                {item.children && item.children.length > 0 && (
                  <button
                    onClick={() => toggleItemExpansion(item.id)}
                    className="mr-2 text-gray-500 hover:text-gray-700"
                  >
                    {item.isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
                
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateMenuItem(item.id, { title: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                        placeholder="메뉴 제목"
                      />
                      {item.type === 'custom' && (
                        <input
                          type="text"
                          value={item.url || ''}
                          onChange={(e) => updateMenuItem(item.id, { url: e.target.value })}
                          className="w-full px-2 py-1 border rounded text-sm"
                          placeholder="URL"
                        />
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={item.cssClass || ''}
                          onChange={(e) => updateMenuItem(item.id, { cssClass: e.target.value })}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                          placeholder="CSS 클래스"
                        />
                        <select
                          value={item.target || '_self'}
                          onChange={(e) => updateMenuItem(item.id, { target: e.target.value as '_blank' | '_self' })}
                          className="px-2 py-1 border rounded text-sm"
                        >
                          <option value="_self">같은 탭</option>
                          <option value="_blank">새 탭</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => updateMenuItem(item.id, { description: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                        placeholder="설명 (선택사항)"
                      />
                      
                      {/* Role-based Access Control */}
                      <div className="border-t pt-3 space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">Display Settings</h4>
                        
                        {/* Display Mode */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Display Mode</label>
                          <select
                            value={item.display_mode || 'show'}
                            onChange={(e) => updateMenuItem(item.id, { display_mode: e.target.value as 'show' | 'hide' })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="show">Show</option>
                            <option value="hide">Hide</option>
                          </select>
                        </div>
                        
                        {/* Target Audience */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Target Audience</label>
                          <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2 bg-gray-50">
                            {availableRoles.map(role => (
                              <label key={role.value} className="flex items-center text-sm">
                                <input
                                  type="checkbox"
                                  checked={(item.target_audience?.roles || ['everyone']).includes(role.value)}
                                  onChange={(e) => {
                                    const currentRoles = item.target_audience?.roles || ['everyone'];
                                    let newRoles;
                                    
                                    if (e.target.checked) {
                                      // Add role, remove 'everyone' if adding specific roles
                                      newRoles = role.value === 'everyone' 
                                        ? ['everyone'] 
                                        : [...currentRoles.filter(r => r !== 'everyone'), role.value];
                                    } else {
                                      // Remove role, add 'everyone' if no roles left
                                      newRoles = currentRoles.filter(r => r !== role.value);
                                      if (newRoles.length === 0) {
                                        newRoles = ['everyone'];
                                      }
                                    }
                                    
                                    updateMenuItem(item.id, {
                                      target_audience: {
                                        ...item.target_audience,
                                        roles: newRoles
                                      }
                                    });
                                  }}
                                  className="mr-2"
                                />
                                <span>{role.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{item.title}</span>
                        {item.type === 'page' && <FileText className="w-3 h-3 text-blue-500" />}
                        {item.type === 'post' && <Type className="w-3 h-3 text-green-500" />}
                        {item.type === 'category' && <Folder className="w-3 h-3 text-orange-500" />}
                        {item.type === 'tag' && <Tag className="w-3 h-3 text-purple-500" />}
                        {item.type === 'custom' && <Link2 className="w-3 h-3 text-gray-500" />}
                        {item.target === '_blank' && <ExternalLink className="w-3 h-3 text-gray-400" />}
                      </div>
                      {item.url && (
                        <div className="text-xs text-gray-500 mt-1">{item.url}</div>
                      )}
                      {item.description && (
                        <div className="text-xs text-gray-600 italic mt-1">{item.description}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setEditingItem(null)}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingItem(null)}
                      className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditingItem(item.id)}
                      className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                      title="편집"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      className="p-1 text-gray-600 hover:bg-gray-100 rounded cursor-move"
                      title="드래그하여 이동"
                    >
                      <Move className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeMenuItem(item.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {item.children && item.isOpen && (
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
            <h1 className="text-3xl font-bold text-gray-900">메뉴 편집</h1>
            <p className="text-gray-600 mt-2">사이트 메뉴를 만들고 관리합니다</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/menus')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            {canEditMenu() && (
              <button
                onClick={saveMenu}
                disabled={isSaving || !canEditMenu()}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isSaving ? '저장 중...' : '메뉴 저장'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="flex gap-6">
          {/* Left Panel - Available Items */}
          <div className="w-96">
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
                        className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    
                    {/* Items list */}
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {getAvailableItems().map(item => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
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
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-700">{item.title}</span>
                        </label>
                      ))}
                    </div>
                    
                    {/* Add button */}
                    {canEditMenu() && (
                      <button
                        onClick={addItemsToMenu}
                        disabled={selectedItems.length === 0 || !canEditMenu()}
                        className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                      >
                        메뉴에 추가
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            
            {/* Menu Settings */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
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
                    placeholder="메뉴 이름을 입력하세요"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    슬러그
                  </label>
                  <input
                    type="text"
                    value={menuSlug}
                    onChange={(e) => setMenuSlug(e.target.value)}
                    placeholder="menu-slug"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    메뉴 위치
                  </label>
                  <div className="space-y-2">
                    {menuLocations.map(location => (
                      <label
                        key={location.id}
                        className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="location"
                          value={location.id}
                          checked={selectedLocation === location.id}
                          onChange={(e) => setSelectedLocation(e.target.value)}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{location.name}</div>
                          <div className="text-xs text-gray-500">{location.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Menu Structure */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">메뉴 구조</h3>
                <div className="text-sm text-gray-500">
                  드래그하여 순서 변경
                </div>
              </div>
              
              <div className="p-4">
                {menuItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Menu className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">메뉴 항목을 추가하세요</p>
                    <p className="text-sm text-gray-400 mt-2">
                      왼쪽 패널에서 페이지, 글, 카테고리 등을 선택하여 메뉴에 추가할 수 있습니다
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {menuItems.map(item => renderMenuItem(item))}
                  </div>
                )}
              </div>
              
              {menuItems.length > 0 && (
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                      <span>페이지</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                      <span>글</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                      <span>카테고리</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                      <span>태그</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-500 rounded-sm"></div>
                      <span>사용자 정의</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Tips */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                사용 팁
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 메뉴 항목을 드래그하여 순서를 변경할 수 있습니다</li>
                <li>• 항목을 다른 항목 아래로 드래그하면 하위 메뉴가 됩니다</li>
                <li>• 각 항목의 편집 버튼을 클릭하여 세부 설정을 변경할 수 있습니다</li>
                <li>• CSS 클래스를 추가하여 스타일을 커스터마이징할 수 있습니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordPressMenuEditor;
