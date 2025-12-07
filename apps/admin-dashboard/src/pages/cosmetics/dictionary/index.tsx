/**
 * Cosmetics Dictionary Management Page
 *
 * Admin page for managing cosmetics dictionary
 * (Skin Types, Concerns, Ingredients, Categories)
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';

type DictionaryType = 'skin-types' | 'concerns' | 'ingredients' | 'categories';

interface DictionaryItem {
  id: string;
  name: string;
  description?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

const TAB_CONFIG = [
  { id: 'skin-types', label: '피부 타입', endpoint: '/api/v1/cosmetics/dictionary/skin-types' },
  { id: 'concerns', label: '피부 고민', endpoint: '/api/v1/cosmetics/dictionary/concerns' },
  { id: 'ingredients', label: '성분', endpoint: '/api/v1/cosmetics/dictionary/ingredients' },
  { id: 'categories', label: '카테고리', endpoint: '/api/v1/cosmetics/dictionary/categories' },
] as const;

export default function CosmeticsDictionaryPage() {
  const [activeTab, setActiveTab] = useState<DictionaryType>('skin-types');
  const [items, setItems] = useState<DictionaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, [activeTab]);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentTab = TAB_CONFIG.find(t => t.id === activeTab);
      if (!currentTab) return;

      const response = await authClient.api.get(currentTab.endpoint);

      if (response.data.success) {
        setItems(response.data.data || []);
      } else {
        setError('Failed to load items');
      }
    } catch (err: any) {
      console.error('Error loading items:', err);
      setError(err.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const currentTab = TAB_CONFIG.find(t => t.id === activeTab);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">화장품 사전 관리</h1>
        <p className="text-gray-600">
          화장품 제품 필터링 및 추천을 위한 기준 데이터를 관리합니다
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DictionaryType)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      )}

      {/* Items List */}
      {!loading && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              총 {items.length}개 항목
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              새 항목 추가
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
              등록된 {currentTab?.label} 항목이 없습니다
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      설명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      태그
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      업데이트
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">{item.description || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {item.metadata?.tags?.map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </span>
                          )) || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.updatedAt).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-4">
                          수정
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
