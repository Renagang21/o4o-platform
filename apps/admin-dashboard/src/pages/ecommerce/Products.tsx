import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown,
  ChevronUp,
  Settings,
  Package,
  DollarSign,
  Hash,
  Calendar,
  Search,
  Image,
  AlertCircle
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { EcommerceApi } from '@/api/ecommerceApi';
import { Product } from '@/types/ecommerce';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type ProductStatus = 'published' | 'draft' | 'trash';
type SortField = 'title' | 'created_at' | 'price' | null;
type SortOrder = 'asc' | 'desc';

interface ExtendedProduct extends Product {
  displayStatus?: ProductStatus;
}

const Products = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft' | 'trash'>(() => {
    const saved = sessionStorage.getItem('products-active-tab');
    return (saved as 'all' | 'published' | 'draft' | 'trash') || 'all';
  });
  
  const [page, setPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showScreenOptions, setShowScreenOptions] = useState(false);
  const [selectedBulkAction, setSelectedBulkAction] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditData, setQuickEditData] = useState({
    title: '',
    handle: '',
    status: 'published' as string,
    price: 0
  });
  
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('products-visible-columns');
    return saved ? JSON.parse(saved) : {
      image: true,
      sku: true,
      price: true,
      inventory: true,
      categories: true,
      status: true,
      date: true
    };
  });
  
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('products-items-per-page');
    return saved ? parseInt(saved) : 20;
  });

  // Fetch products using React Query
  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ['products', page, searchQuery, sortField, sortOrder],
    queryFn: async () => {
      const filters = searchQuery ? { q: searchQuery } : {};
      const response = await EcommerceApi.getProducts(page, itemsPerPage, filters);
      return response;
    }
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Product> }) => {
      return await EcommerceApi.updateProduct(data.id, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('상품이 업데이트되었습니다.');
    },
    onError: () => {
      toast.error('상품 업데이트에 실패했습니다.');
    }
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return await EcommerceApi.deleteProduct(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('상품이 삭제되었습니다.');
    },
    onError: () => {
      toast.error('상품 삭제에 실패했습니다.');
    }
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: async (data: { action: string; productIds: string[] }) => {
      return await EcommerceApi.bulkProductAction({
        action: data.action as any,
        productIds: data.productIds
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedProducts(new Set());
      setSelectedBulkAction('');
      toast.success('일괄 작업이 완료되었습니다.');
    },
    onError: () => {
      toast.error('일괄 작업에 실패했습니다.');
    }
  });

  useEffect(() => {
    sessionStorage.setItem('products-active-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('products-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('products-items-per-page', itemsPerPage.toString());
  }, [itemsPerPage]);

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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProducts(new Set(getFilteredProducts().map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (id: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedProducts(newSelection);
  };

  const handleAddNew = () => {
    navigate('/ecommerce/products/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/ecommerce/products/${id}/edit`);
  };

  const handleQuickEdit = (id: string) => {
    const product = productsData?.products?.find(p => p.id === id);
    if (product) {
      setQuickEditId(id);
      setQuickEditData({
        title: product.title || '',
        handle: product.handle || '',
        status: product.status || 'draft',
        price: product.variants?.[0]?.prices?.[0]?.amount || 0
      });
    }
  };

  const handleSaveQuickEdit = async () => {
    if (quickEditId) {
      const sanitizedHandle = quickEditData.handle
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      await updateProductMutation.mutateAsync({
        id: quickEditId,
        updates: {
          title: quickEditData.title,
          handle: sanitizedHandle,
          status: quickEditData.status
        }
      });

      setQuickEditId(null);
    }
  };

  const handleCancelQuickEdit = () => {
    setQuickEditId(null);
    setQuickEditData({
      title: '',
      handle: '',
      status: 'published',
      price: 0
    });
  };

  const handleTrash = async (id: string) => {
    if (confirm('정말 이 상품을 휴지통으로 이동하시겠습니까?')) {
      await updateProductMutation.mutateAsync({
        id,
        updates: { status: 'draft', metadata: { trash: 'true' } }
      });
    }
  };

  const handleRestore = async (id: string) => {
    if (confirm('이 상품을 복원하시겠습니까?')) {
      await updateProductMutation.mutateAsync({
        id,
        updates: { status: 'draft', metadata: { trash: 'false' } }
      });
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (confirm('이 상품을 영구적으로 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.')) {
      await deleteProductMutation.mutateAsync(id);
    }
  };

  const handleView = (id: string) => {
    window.open(`/preview/products/${id}`, '_blank');
  };

  const handleApplyBulkAction = async () => {
    if (!selectedBulkAction) {
      alert('작업을 선택해주세요.');
      return;
    }
    
    if (selectedProducts.size === 0) {
      alert('상품을 선택해주세요.');
      return;
    }
    
    if (selectedBulkAction === 'trash') {
      if (confirm(`선택한 ${selectedProducts.size}개의 상품을 휴지통으로 이동하시겠습니까?`)) {
        await bulkActionMutation.mutateAsync({
          action: 'trash',
          productIds: Array.from(selectedProducts)
        });
      }
    } else if (selectedBulkAction === 'publish') {
      await bulkActionMutation.mutateAsync({
        action: 'publish',
        productIds: Array.from(selectedProducts)
      });
    } else if (selectedBulkAction === 'draft') {
      await bulkActionMutation.mutateAsync({
        action: 'draft',
        productIds: Array.from(selectedProducts)
      });
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getFilteredProducts = (): ExtendedProduct[] => {
    let filtered = productsData?.products || [];
    
    // Add display status based on metadata
    filtered = filtered.map(p => ({
      ...p,
      displayStatus: p.metadata?.trash === 'true' ? 'trash' : 
                    p.status === 'published' ? 'published' : 'draft'
    } as ExtendedProduct));
    
    // Filter by tab
    if (activeTab === 'published') {
      filtered = filtered.filter(p => p.displayStatus === 'published');
    } else if (activeTab === 'draft') {
      filtered = filtered.filter(p => p.displayStatus === 'draft');
    } else if (activeTab === 'trash') {
      filtered = filtered.filter(p => p.displayStatus === 'trash');
    } else if (activeTab === 'all') {
      filtered = filtered.filter(p => p.displayStatus !== 'trash');
    }
    
    // Sort
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        if (sortField === 'title') {
          return sortOrder === 'asc' 
            ? (a.title || '').localeCompare(b.title || '')
            : (b.title || '').localeCompare(a.title || '');
        } else if (sortField === 'created_at') {
          return sortOrder === 'asc'
            ? new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
            : new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        } else if (sortField === 'price') {
          const priceA = a.variants?.[0]?.prices?.[0]?.amount || 0;
          const priceB = b.variants?.[0]?.prices?.[0]?.amount || 0;
          return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
        }
        return 0;
      });
    }
    
    return filtered;
  };

  const getStatusCounts = () => {
    const allProducts = productsData?.products || [];
    const withStatus = allProducts.map(p => ({
      ...p,
      displayStatus: p.metadata?.trash === 'true' ? 'trash' : 
                    p.status === 'published' ? 'published' : 'draft'
    }));
    
    const published = withStatus.filter(p => p.displayStatus === 'published').length;
    const draft = withStatus.filter(p => p.displayStatus === 'draft').length;
    const trash = withStatus.filter(p => p.displayStatus === 'trash').length;
    const all = withStatus.filter(p => p.displayStatus !== 'trash').length;
    
    return { all, published, draft, trash };
  };

  const counts = getStatusCounts();
  const filteredProducts = getFilteredProducts();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f0f1' }}>
        <div className="text-gray-600">상품을 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f0f0f1' }}>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mx-8 mt-4">
          <p className="text-sm text-red-700">상품을 불러오는데 실패했습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f0f1' }}>
      {/* Header with Breadcrumb and Screen Options */}
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <div className="flex items-center justify-between">
          <AdminBreadcrumb 
            items={[
              { label: '관리자', path: '/admin' },
              { label: 'E-commerce', path: '/ecommerce' },
              { label: '상품 관리' }
            ]}
          />
          
          {/* Screen Options Button */}
          <div className="relative">
            <button
              onClick={() => setShowScreenOptions(!showScreenOptions)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              <Settings className="w-4 h-4" />
              화면 옵션
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showScreenOptions && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-300 rounded-md shadow-lg z-50">
                <div className="p-4">
                  <h3 className="font-medium text-sm mb-3">표시할 열</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.image}
                        onChange={() => handleColumnToggle('image')}
                        className="mr-2" 
                      />
                      이미지
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.sku}
                        onChange={() => handleColumnToggle('sku')}
                        className="mr-2" 
                      />
                      SKU
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.price}
                        onChange={() => handleColumnToggle('price')}
                        className="mr-2" 
                      />
                      가격
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.inventory}
                        onChange={() => handleColumnToggle('inventory')}
                        className="mr-2" 
                      />
                      재고
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.categories}
                        onChange={() => handleColumnToggle('categories')}
                        className="mr-2" 
                      />
                      카테고리
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.status}
                        onChange={() => handleColumnToggle('status')}
                        className="mr-2" 
                      />
                      상태
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.date}
                        onChange={() => handleColumnToggle('date')}
                        className="mr-2" 
                      />
                      날짜
                    </label>
                  </div>
                  
                  <div className="border-t border-gray-200 mt-3 pt-3">
                    <h3 className="font-medium text-sm mb-3">페이지네이션</h3>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">페이지당 항목:</label>
                      <input
                        type="number"
                        value={itemsPerPage}
                        onChange={(e) => handleItemsPerPageChange(e.target.value)}
                        min="1"
                        max="999"
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => setShowScreenOptions(false)}
                        className="ml-auto px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        적용
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Title and Add New */}
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-normal text-gray-900">상품</h1>
          <button
            onClick={handleAddNew}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            새로 추가
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`text-sm ${activeTab === 'all' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            모든 상품 ({counts.all})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('published')}
            className={`text-sm ${activeTab === 'published' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            발행됨 ({counts.published})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('draft')}
            className={`text-sm ${activeTab === 'draft' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            임시 저장 ({counts.draft})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('trash')}
            className={`text-sm ${activeTab === 'trash' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            휴지통 ({counts.trash})
          </button>
        </div>

        {/* Search Box and Bulk Actions */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                {selectedBulkAction === 'trash' ? '휴지통으로 이동' : 
                 selectedBulkAction === 'publish' ? '발행' :
                 selectedBulkAction === 'draft' ? '임시 저장' : '일괄 작업'}
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showBulkActions && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-300 rounded shadow-lg z-20">
                  <button
                    onClick={() => {
                      setSelectedBulkAction('publish');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    발행
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBulkAction('draft');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    임시 저장으로 변경
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBulkAction('trash');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    휴지통으로 이동
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={handleApplyBulkAction}
              className={`px-3 py-1.5 text-sm border border-gray-300 rounded transition-colors ${
                selectedBulkAction && selectedProducts.size > 0 
                  ? 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!selectedBulkAction || selectedProducts.size === 0}
            >
              적용
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && queryClient.invalidateQueries({ queryKey: ['products'] })}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="상품 검색..."
            />
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
            >
              상품 검색
            </button>
          </div>
        </div>

        {/* Item count */}
        <div className="text-sm text-gray-600 mb-2">
          {filteredProducts.length}개 항목
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
                    checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                  />
                </th>
                {visibleColumns.image && (
                  <th className="w-16 px-3 py-3 text-left">
                    <Image className="w-4 h-4 text-gray-700" />
                  </th>
                )}
                <th className="px-3 py-3 text-left">
                  <button 
                    onClick={() => handleSort('title')}
                    className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                  >
                    상품명
                    {sortField === 'title' ? (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                </th>
                {visibleColumns.sku && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">SKU</th>
                )}
                {visibleColumns.price && (
                  <th className="px-3 py-3 text-left">
                    <button 
                      onClick={() => handleSort('price')}
                      className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                    >
                      가격
                      {sortField === 'price' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      )}
                    </button>
                  </th>
                )}
                {visibleColumns.inventory && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">재고</th>
                )}
                {visibleColumns.categories && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">카테고리</th>
                )}
                {visibleColumns.status && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">상태</th>
                )}
                {visibleColumns.date && (
                  <th className="px-3 py-3 text-left">
                    <button 
                      onClick={() => handleSort('created_at')}
                      className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                    >
                      날짜
                      {sortField === 'created_at' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      )}
                    </button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <React.Fragment key={product.id}>
                  {quickEditId === product.id ? (
                    // Quick Edit Row
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td colSpan={100} className="p-4">
                        <div className="bg-white border border-gray-300 rounded p-4">
                          <h3 className="font-medium text-sm mb-3">빠른 편집</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">상품명</label>
                              <input
                                type="text"
                                value={quickEditData.title}
                                onChange={(e) => setQuickEditData({...quickEditData, title: e.target.value})}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                              <input
                                type="text"
                                value={quickEditData.handle}
                                onChange={(e) => setQuickEditData({...quickEditData, handle: e.target.value})}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                              <select
                                value={quickEditData.status}
                                onChange={(e) => setQuickEditData({...quickEditData, status: e.target.value})}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="published">발행됨</option>
                                <option value="draft">임시 저장</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">가격</label>
                              <input
                                type="number"
                                value={quickEditData.price}
                                onChange={(e) => setQuickEditData({...quickEditData, price: parseFloat(e.target.value)})}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={handleSaveQuickEdit}
                              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                              disabled={updateProductMutation.isPending}
                            >
                              업데이트
                            </button>
                            <button
                              onClick={handleCancelQuickEdit}
                              className="px-4 py-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    // Normal Row
                    <tr
                      className="border-b border-gray-100 hover:bg-gray-50"
                      onMouseEnter={() => {
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                        }
                        hoverTimeoutRef.current = setTimeout(() => {
                          setHoveredRow(product.id);
                        }, 300);
                      }}
                      onMouseLeave={() => {
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                          hoverTimeoutRef.current = null;
                        }
                        setHoveredRow(null);
                      }}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                        />
                      </td>
                      {visibleColumns.image && (
                        <td className="px-3 py-3">
                          {product.thumbnail ? (
                            <img 
                              src={product.thumbnail} 
                              alt={product.title}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <div>
                          <button 
                            onClick={() => handleEdit(product.id)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm text-left"
                          >
                            {product.title || '제목 없음'}
                            {product.displayStatus === 'draft' && <span className="ml-2 text-gray-500">— 임시 저장</span>}
                          </button>
                          {hoveredRow === product.id && (
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              {product.displayStatus === 'trash' ? (
                                <>
                                  <button
                                    onClick={() => handleRestore(product.id)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    복원
                                  </button>
                                  <span className="text-gray-400">|</span>
                                  <button
                                    onClick={() => handlePermanentDelete(product.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    영구 삭제
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEdit(product.id)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    편집
                                  </button>
                                  <span className="text-gray-400">|</span>
                                  <button
                                    onClick={() => handleQuickEdit(product.id)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    빠른 편집
                                  </button>
                                  <span className="text-gray-400">|</span>
                                  <button
                                    onClick={() => handleTrash(product.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    휴지통
                                  </button>
                                  <span className="text-gray-400">|</span>
                                  <button
                                    onClick={() => handleView(product.id)}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    보기
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      {visibleColumns.sku && (
                        <td className="px-3 py-3 text-sm text-gray-600">
                          {product.variants?.[0]?.sku || '—'}
                        </td>
                      )}
                      {visibleColumns.price && (
                        <td className="px-3 py-3 text-sm">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-gray-400" />
                            {product.variants?.[0]?.prices?.[0]?.amount?.toLocaleString() || '—'}
                          </div>
                        </td>
                      )}
                      {visibleColumns.inventory && (
                        <td className="px-3 py-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Hash className="w-3 h-3 text-gray-400" />
                            {product.variants?.[0]?.inventory_quantity || 0}
                          </div>
                        </td>
                      )}
                      {visibleColumns.categories && (
                        <td className="px-3 py-3 text-sm">
                          {product.categories?.map((cat: any, idx: number) => (
                            <span key={idx}>
                              <a href="#" className="text-blue-600 hover:text-blue-800">{cat.name}</a>
                              {idx < product.categories.length - 1 && ', '}
                            </span>
                          )) || '—'}
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-3 py-3 text-sm">
                          {product.displayStatus === 'published' && (
                            <span className="text-green-600">발행됨</span>
                          )}
                          {product.displayStatus === 'draft' && (
                            <span className="text-orange-600">임시 저장</span>
                          )}
                          {product.displayStatus === 'trash' && (
                            <span className="text-red-600">휴지통</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.date && (
                        <td className="px-3 py-3 text-sm text-gray-600">
                          <div>발행됨</div>
                          <div>{new Date(product.created_at || '').toLocaleDateString()}</div>
                        </td>
                      )}
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">상품이 없습니다.</p>
            </div>
          )}
        </div>

        {/* Bottom Actions and Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                일괄 작업
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <button 
              onClick={handleApplyBulkAction}
              className={`px-3 py-1.5 text-sm border border-gray-300 rounded transition-colors ${
                selectedBulkAction && selectedProducts.size > 0 
                  ? 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!selectedBulkAction || selectedProducts.size === 0}
            >
              적용
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              {filteredProducts.length}개 항목
            </div>
            {productsData?.total && productsData.total > itemsPerPage && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  이전
                </button>
                <span className="text-sm text-gray-600">
                  {page} / {Math.ceil(productsData.total / itemsPerPage)}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(productsData.total / itemsPerPage)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;