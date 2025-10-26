import { FC, useState, useEffect } from 'react';
import {
  FileText,
  Folder,
  Tag as TagIcon,
  Link2,
  Plus,
  Search,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { unifiedApi } from '../../../../api/unified-client';
import type {
  Page,
  Post,
  Category,
  TagItem,
  UnifiedApiClient,
  ApiResponse
} from '../../../../types/menu.types';
import type { MenuItemFlat } from '../../utils/menu-tree-helpers';

export interface AvailableItemsProps {
  onAdd: (item: Partial<MenuItemFlat>) => void;
}

type TabType = 'pages' | 'posts' | 'categories' | 'tags' | 'cpt' | 'custom';

interface ContentItem {
  id: string;
  title: string;
  type: 'page' | 'post' | 'category' | 'tag' | 'cpt';
  url: string;
  slug?: string;
}

/**
 * Available Items Component
 * Displays available content items (pages, posts, categories, tags)
 * that can be added to the menu
 */
export const AvailableItems: FC<AvailableItemsProps> = ({ onAdd }) => {
  const [activeTab, setActiveTab] = useState<TabType>('pages');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Content state
  const [pages, setPages] = useState<ContentItem[]>([]);
  const [posts, setPosts] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<ContentItem[]>([]);
  const [tags, setTags] = useState<ContentItem[]>([]);
  const [cpts, setCpts] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Custom link state
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  // Load available items
  useEffect(() => {
    const loadItems = async () => {
      try {
        setIsLoading(true);
        const apiClient = unifiedApi as unknown as UnifiedApiClient;

        const [pagesResponse, postsResponse, categoriesResponse, tagsResponse, cptsResponse] = await Promise.all([
          apiClient.raw.get<ApiResponse<Page[]>>('/pages?limit=100'),
          apiClient.raw.get<ApiResponse<Post[]>>('/posts?limit=100'),
          apiClient.raw.get<ApiResponse<Category[]>>('/categories?limit=100'),
          apiClient.raw.get<ApiResponse<TagItem[]>>('/tags?limit=100'),
          apiClient.raw.get<any>('/platform/custom-post-types')
        ]);

        // Process pages
        if (Array.isArray(pagesResponse.data?.data)) {
          setPages(
            pagesResponse.data.data.map((page) => ({
              id: page.id,
              title: page.title,
              type: 'page' as const,
              url: `/${page.slug}`
            }))
          );
        }

        // Process posts
        if (Array.isArray(postsResponse.data?.data)) {
          setPosts(
            postsResponse.data.data.map((post) => ({
              id: post.id,
              title: post.title,
              type: 'post' as const,
              url: `/blog/${post.slug}`
            }))
          );
        }

        // Process categories
        if (Array.isArray(categoriesResponse.data?.data)) {
          setCategories(
            categoriesResponse.data.data.map((cat) => ({
              id: cat.id,
              title: cat.name,
              type: 'category' as const,
              url: `/category/${cat.slug}`
            }))
          );
        }

        // Process tags
        if (Array.isArray(tagsResponse.data?.data)) {
          setTags(
            tagsResponse.data.data.map((tag) => ({
              id: tag.id,
              title: tag.name,
              type: 'tag' as const,
              url: `/tag/${tag.slug}`
            }))
          );
        }

        // Process CPTs
        if (Array.isArray(cptsResponse.data?.data)) {
          setCpts(
            cptsResponse.data.data.map((cpt: any) => ({
              id: cpt.id,
              title: cpt.name,
              type: 'cpt' as const,
              url: `/cpt/${cpt.slug}`,
              slug: cpt.slug
            }))
          );
        }
      } catch (error) {
        toast.error('콘텐츠 목록을 불러오는데 실패했습니다');
        console.error('Failed to load content items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();
  }, []);

  // Get current tab items
  const getCurrentTabItems = (): ContentItem[] => {
    const itemsMap = {
      pages,
      posts,
      categories,
      tags,
      cpt: cpts,
      custom: []
    };
    return itemsMap[activeTab];
  };

  // Filter items by search term
  const filteredItems = getCurrentTabItems().filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle item selection
  const toggleSelection = (id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Select all items
  const selectAll = () => {
    const allIds = filteredItems.map((item) => item.id);
    setSelectedItems(new Set(allIds));
  };

  // Deselect all items
  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  // Add selected items to menu
  const addSelectedToMenu = () => {
    if (selectedItems.size === 0) {
      toast.error('추가할 항목을 선택하세요');
      return;
    }

    const itemsToAdd = filteredItems.filter((item) => selectedItems.has(item.id));

    itemsToAdd.forEach((item) => {
      onAdd({
        title: item.title,
        url: item.url,
        type: item.type,
        originalId: item.id,
        target: '_self',
        metadata: item.type === 'cpt' && item.slug ? { cptSlug: item.slug } : undefined
      });
    });

    toast.success(`${itemsToAdd.length}개 항목이 메뉴에 추가되었습니다`);
    setSelectedItems(new Set());
  };

  // Add custom link
  const addCustomLink = () => {
    if (!customTitle || !customUrl) {
      toast.error('제목과 URL을 모두 입력하세요');
      return;
    }

    onAdd({
      title: customTitle,
      url: customUrl,
      type: 'custom',
      target: '_self'
    });

    toast.success('커스텀 링크가 추가되었습니다');
    setCustomTitle('');
    setCustomUrl('');
  };

  const tabs: { key: TabType; label: string; icon: typeof FileText }[] = [
    { key: 'pages', label: '페이지', icon: FileText },
    { key: 'posts', label: '글', icon: FileText },
    { key: 'categories', label: '카테고리', icon: Folder },
    { key: 'tags', label: '태그', icon: TagIcon },
    { key: 'cpt', label: 'CPT', icon: Folder },
    { key: 'custom', label: '커스텀 링크', icon: Link2 }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">추가 가능한 항목</h2>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'custom' ? (
          // Custom Link Form
          <div className="space-y-4">
            <div>
              <label htmlFor="custom-title" className="block text-sm font-medium text-gray-700 mb-2">
                링크 제목
              </label>
              <input
                id="custom-title"
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="예: 회사 소개"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="custom-url" className="block text-sm font-medium text-gray-700 mb-2">
                URL
              </label>
              <input
                id="custom-url"
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https:// 또는 /path"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={addCustomLink}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              메뉴에 추가
            </button>
          </div>
        ) : (
          // Content Items List
          <>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="검색..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Selection Actions */}
            {selectedItems.size > 0 && (
              <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700 font-medium">
                  {selectedItems.size}개 선택됨
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={deselectAll}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    선택 해제
                  </button>
                  <button
                    onClick={addSelectedToMenu}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    메뉴에 추가
                  </button>
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">불러오는 중...</div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? '검색 결과가 없습니다' : '항목이 없습니다'}
                </div>
              ) : (
                <>
                  <button
                    onClick={selectAll}
                    className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                  >
                    모두 선택
                  </button>
                  {filteredItems.map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors ${
                        selectedItems.has(item.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleSelection(item.id)}
                        className="rounded border-gray-300"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900 truncate">{item.title}</span>
                          {selectedItems.has(item.id) && (
                            <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{item.url}</div>
                      </div>
                    </label>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
