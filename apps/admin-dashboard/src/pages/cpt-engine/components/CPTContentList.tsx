/**
 * CPT Content List Component
 * WordPress-style content listing with filtering, sorting, and bulk actions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';

// Custom hooks
import { useCPTData, CPTStatus, CPTSortField, CPTSortOrder } from '@/hooks/cpt/useCPTData';
import { useCPTActions } from '@/hooks/cpt/useCPTActions';

// Components
import { CPTStatusTabs } from '@/components/cpt/CPTStatusTabs';
import { CPTBulkActions } from '@/components/cpt/CPTBulkActions';
import { CPTScreenOptions } from '@/components/cpt/CPTScreenOptions';
import { CPTQuickEditRow } from '@/components/cpt/CPTQuickEditRow';
import { CPTRow } from '@/components/cpt/CPTRow';

interface CPTContentListProps {
  selectedType?: string | null;
  onTypeSelect?: (slug: string) => void;
  cptTypes?: any[];
}

const CPTContentList: React.FC<CPTContentListProps> = ({
  selectedType,
  onTypeSelect,
  cptTypes
}) => {
  const navigate = useNavigate();
  const { cptSlug } = useParams<{ cptSlug: string }>();

  // Use URL parameter if selectedType prop is not provided
  const effectiveType = selectedType || cptSlug || null;

  // Load CPT types if not provided via props
  const { data: loadedCPTTypes } = useQuery({
    queryKey: ['cpt-types'],
    queryFn: async () => {
      const response = await authClient.api.get('/public/cpt/types');
      const result = response.data?.data || response.data || [];
      return Array.isArray(result) ? result : [];
    },
    enabled: !cptTypes,
    staleTime: 5 * 60 * 1000,
  });

  // Use provided cptTypes or loaded ones
  const effectiveCPTTypes = cptTypes || loadedCPTTypes || [];
  const currentCPT = effectiveCPTTypes?.find((cpt: any) => cpt.slug === effectiveType);

  // State management
  const [activeTab, setActiveTab] = useState<CPTStatus>(() => {
    const saved = sessionStorage.getItem(`cpt-${effectiveType}-active-tab`);
    return (saved as CPTStatus) || 'all';
  });

  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [showScreenOptions, setShowScreenOptions] = useState(false);
  const [selectedBulkAction, setSelectedBulkAction] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<CPTSortField>(null);
  const [sortOrder, setSortOrder] = useState<CPTSortOrder>('desc');
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditData, setQuickEditData] = useState<{
    title: string;
    slug: string;
    status: 'publish' | 'draft' | 'private' | 'trash';
    customFields?: Record<string, any>;
  }>({
    title: '',
    slug: '',
    status: 'publish',
    customFields: {}
  });

  // Screen Options state
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(`cpt-${effectiveType}-visible-columns`);
    return saved ? JSON.parse(saved) : {
      author: true,
      date: true,
      status: true
    };
  });

  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem(`cpt-${effectiveType}-items-per-page`);
    return saved ? parseInt(saved) : 20;
  });

  // Custom hooks
  const {
    posts,
    setPosts,
    loading,
    error,
    filteredPosts,
    counts
  } = useCPTData({
    cptSlug: effectiveType || '',
    activeTab,
    searchQuery,
    sortField,
    sortOrder,
    itemsPerPage
  });

  const {
    handleQuickEdit,
    handleTrash,
    handlePermanentDelete,
    handleRestore,
    handleBulkAction
  } = useCPTActions({ cptSlug: effectiveType || '', posts, setPosts });

  // Effects
  useEffect(() => {
    if (effectiveType) {
      sessionStorage.setItem(`cpt-${effectiveType}-active-tab`, activeTab);
    }
  }, [activeTab, effectiveType]);

  useEffect(() => {
    if (effectiveType) {
      localStorage.setItem(`cpt-${effectiveType}-visible-columns`, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, effectiveType]);

  useEffect(() => {
    if (effectiveType) {
      localStorage.setItem(`cpt-${effectiveType}-items-per-page`, itemsPerPage.toString());
    }
  }, [itemsPerPage, effectiveType]);

  // Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPosts(new Set(filteredPosts.map(p => p.id)));
    } else {
      setSelectedPosts(new Set());
    }
  };

  const handleSelectPost = (id: string) => {
    const newSelection = new Set(selectedPosts);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedPosts(newSelection);
  };

  const handleSort = (field: CPTSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleColumnToggle = (column: string) => {
    setVisibleColumns((prev: any) => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const handleItemsPerPageChange = (value: string) => {
    const num = parseInt(value) || 20;
    if (num < 1) {
      setItemsPerPage(1);
    } else if (num > 999) {
      setItemsPerPage(999);
    } else {
      setItemsPerPage(num);
    }
  };

  const handleApplyBulkAction = async () => {
    const success = await handleBulkAction(selectedBulkAction, selectedPosts);
    if (success) {
      setSelectedPosts(new Set());
      setSelectedBulkAction('');
    }
  };

  const handleQuickEditClick = (id: string) => {
    const post = posts.find(p => p.id === id);
    if (post) {
      setQuickEditId(id);
      setQuickEditData({
        title: post.title,
        slug: post.slug,
        status: post.status,
        customFields: post.customFields || {}
      });
    }
  };

  const handleSaveQuickEdit = async () => {
    if (quickEditId) {
      const success = await handleQuickEdit(quickEditId, quickEditData);
      if (success) {
        setQuickEditId(null);
      }
    }
  };

  const handleCancelQuickEdit = () => {
    setQuickEditId(null);
    setQuickEditData({
      title: '',
      slug: '',
      status: 'publish',
      customFields: {}
    });
  };

  const getColumnCount = () => {
    return 2 + Object.values(visibleColumns).filter(Boolean).length;
  };

  // Show selection UI if no type is selected
  if (!effectiveType) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f0f0f1' }}>
        <div className="bg-white border-b border-gray-200 px-8 py-3">
          <AdminBreadcrumb
            items={[
              { label: 'Admin', path: '/admin' },
              { label: 'CPT 엔진', path: '/cpt-engine' },
              { label: '콘텐츠' }
            ]}
          />
        </div>
        <div className="px-8 py-6">
          <div className="bg-white border border-gray-300 rounded p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">콘텐츠 타입 선택</h3>
            <p className="text-gray-600 mb-4">관리할 콘텐츠 타입을 선택하세요</p>
            <select
              className="px-4 py-2 border border-gray-300 rounded"
              onChange={(e) => {
                if (onTypeSelect) {
                  onTypeSelect(e.target.value);
                } else {
                  navigate(`/cpt-engine/content/${e.target.value}`);
                }
              }}
            >
              <option value="">콘텐츠 타입 선택...</option>
              {effectiveCPTTypes?.map((cpt: any) => (
                <option key={cpt.slug} value={cpt.slug}>
                  {cpt.labels?.plural || cpt.name || cpt.slug}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f0f1' }}>
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const cptName = currentCPT?.labels?.plural || currentCPT?.name || effectiveType;
  const singularName = currentCPT?.labels?.singular || currentCPT?.name || effectiveType;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f0f1' }}>
      {/* Error message */}
      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-8 mt-4">
          <p className="text-sm text-yellow-700">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <div className="flex items-center justify-between">
          <AdminBreadcrumb
            items={[
              { label: 'Admin', path: '/admin' },
              { label: '자체 글', path: '/cpt-engine/content' },
              { label: cptName, path: `/cpt-engine/content/${effectiveType}` },
              { label: `모든 ${cptName}` }
            ]}
          />

          <CPTScreenOptions
            show={showScreenOptions}
            setShow={setShowScreenOptions}
            visibleColumns={visibleColumns}
            onColumnToggle={handleColumnToggle}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Title and Add New */}
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-normal text-gray-900">{cptName}</h1>
          <button
            onClick={() => navigate(`/cpt-engine/content/${effectiveType}/new`)}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            새 {singularName} 추가
          </button>
        </div>

        {/* Status Tabs */}
        <CPTStatusTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          counts={counts}
        />

        {/* Search and Bulk Actions */}
        <div className="flex justify-between items-center mb-4">
          <CPTBulkActions
            selectedAction={selectedBulkAction}
            setSelectedAction={setSelectedBulkAction}
            onApply={handleApplyBulkAction}
            disabled={!selectedBulkAction || selectedPosts.size === 0}
          />

          {/* Search */}
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={`${cptName} 검색...`}
            />
            <button
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
            >
              검색
            </button>
          </div>
        </div>

        {/* Item count */}
        <div className="text-sm text-gray-600 mb-2">
          {filteredPosts.length} items
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedPosts.size === filteredPosts.length && filteredPosts.length > 0}
                  />
                </th>
                <th className="px-3 py-3 text-left">
                  <button
                    onClick={() => handleSort('title')}
                    className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                  >
                    제목
                    {sortField === 'title' ? (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                </th>
                {visibleColumns.author && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">글쓴이</th>
                )}
                {visibleColumns.date && (
                  <th className="px-3 py-3 text-left">
                    <button
                      onClick={() => handleSort('date')}
                      className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                    >
                      날짜
                      {sortField === 'date' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      )}
                    </button>
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">상태</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={getColumnCount()} className="px-3 py-8 text-center text-gray-500">
                    {searchQuery || activeTab !== 'all'
                      ? '검색 결과가 없습니다'
                      : `아직 ${cptName}이(가) 없습니다`}
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <React.Fragment key={post.id}>
                    {quickEditId === post.id ? (
                      <CPTQuickEditRow
                        data={quickEditData}
                        onChange={setQuickEditData}
                        onSave={handleSaveQuickEdit}
                        onCancel={handleCancelQuickEdit}
                        colSpan={getColumnCount()}
                      />
                    ) : (
                      <CPTRow
                        post={post}
                        selected={selectedPosts.has(post.id)}
                        hovered={hoveredRow === post.id}
                        onSelect={() => handleSelectPost(post.id)}
                        onHover={setHoveredRow}
                        onEdit={() => navigate(`/cpt-engine/content/${effectiveType}/${post.id}/edit`)}
                        onQuickEdit={() => handleQuickEditClick(post.id)}
                        onDelete={() => handleTrash(post.id)}
                        onRestore={() => handleRestore(post.id)}
                        onPermanentDelete={() => handlePermanentDelete(post.id)}
                        onView={() => {
                          const baseUrl = window.location.origin.replace('admin.', '');
                          window.open(`${baseUrl}/${effectiveType}/${post.slug}`, '_blank');
                        }}
                        visibleColumns={visibleColumns}
                      />
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between mt-4">
          <CPTBulkActions
            selectedAction={selectedBulkAction}
            setSelectedAction={setSelectedBulkAction}
            onApply={handleApplyBulkAction}
            disabled={!selectedBulkAction || selectedPosts.size === 0}
          />

          <div className="text-sm text-gray-600">
            {filteredPosts.length} items
          </div>
        </div>
      </div>
    </div>
  );
};

export default CPTContentList;
