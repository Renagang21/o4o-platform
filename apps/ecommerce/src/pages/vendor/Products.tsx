import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Eye,
  Package,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, Button, Input } from '@o4o/ui';
import { formatCurrency } from '@o4o/utils';
import { useNavigate } from 'react-router-dom';
import { ProductForm } from '../../components/vendor/ProductForm';
import type { Product as BaseProduct } from '@o4o/types';
import { 
  useVendorProducts, 
  useProductCategories, 
  useCreateProduct, 
  useUpdateProduct, 
  useDeleteProduct 
} from '../../hooks/vendor/useVendorProducts';


const statusConfig = {
  active: { label: '판매중', color: 'bg-green-100 text-green-800' },
  inactive: { label: '판매중지', color: 'bg-gray-100 text-gray-800' },
  out_of_stock: { label: '품절', color: 'bg-red-100 text-red-800' },
  in_stock: { label: '재고있음', color: 'bg-green-100 text-green-800' },
  published: { label: '판매중', color: 'bg-green-100 text-green-800' },
  draft: { label: '임시저장', color: 'bg-gray-100 text-gray-800' }
};

export default function VendorProducts() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<BaseProduct | undefined>();

  // React Query hooks
  const { data: productsData, isLoading } = useVendorProducts({
    page: currentPage,
    limit: 20,
    search: searchTerm,
    category: selectedCategory === 'all' ? undefined : selectedCategory,
  });
  
  const { data: categories = [] } = useProductCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const products = (productsData as any)?.products || [];
  const pagination = (productsData as any)?.pagination;

  // 카테고리 목록 구성
  const categoryOptions = ['all', ...(categories as any[]).map((cat: any) => cat.name)];

  // 검색/카테고리 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('정말로 이 상품을 삭제하시겠습니까?')) {
      await deleteProduct.mutateAsync(id);
    }
  };

  const handleEditProduct = async (id: string) => {
    // API에서 상품 상세 정보 가져오기는 ProductForm 내부에서 처리
    const product = products.find((p: any) => p.id === id);
    if (product) {
      // Convert to BaseProduct format
      const baseProduct: Partial<BaseProduct> = {
        id: product.id,
        name: product.name,
        description: '', // Will be fetched from API
        sku: product.sku,
        pricing: {
          customer: product.price,
          business: product.price * 0.8,
          affiliate: product.price * 0.85,
          retailer: {
            gold: product.price * 0.75,
            premium: product.price * 0.7,
            vip: product.price * 0.65
          }
        },
        status: product.status === 'active' ? 'active' : 'draft',
        slug: product.name.toLowerCase().replace(/\s+/g, '-'),
        images: product.image ? [{ 
          id: '1', 
          url: product.image, 
          alt: product.name, 
          sortOrder: 0,
          isFeatured: true
        }] : [],
        categories: (categories as any[]).filter((c: any) => c.name === product.category).map((c: any) => c.id),
        inventory: {
          stockQuantity: product.stock,
          stockStatus: product.status === 'out_of_stock' ? 'out_of_stock' : 'in_stock',
          manageStock: true,
          minOrderQuantity: 1,
          lowStockThreshold: 10,
          allowBackorder: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setEditingProduct(baseProduct as BaseProduct);
      setIsFormOpen(true);
    }
  };

  const handleViewProduct = (id: string) => {
    navigate(`/vendor/products/${id}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품 관리</h1>
          <p className="text-gray-600 mt-1">등록된 상품을 관리하고 새 상품을 추가하세요</p>
        </div>
        <Button onClick={() => {
          setEditingProduct(undefined);
          setIsFormOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          새 상품 등록
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 상품</p>
                <p className="text-2xl font-bold">{pagination?.total || 0}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">판매중</p>
                <p className="text-2xl font-bold">
                  {products.filter((p: any) => p.status === 'active' || p.status === 'in_stock').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">품절</p>
                <p className="text-2xl font-bold">
                  {products.filter((p: any) => p.status === 'out_of_stock').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">재고 부족</p>
                <p className="text-2xl font-bold">
                  {products.filter((p: any) => p.stock > 0 && p.stock < 10).length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="상품명 또는 SKU로 검색..."
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedCategory}
                onChange={(e: any) => setSelectedCategory(e.target.value)}
              >
                {categoryOptions.map((cat: any) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? '전체 카테고리' : cat}
                  </option>
                ))}
              </select>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                필터
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 상품 목록 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상품
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    카테고리
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    가격
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    재고
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    판매량
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm || selectedCategory !== 'all' 
                        ? '검색 결과가 없습니다.' 
                        : '등록된 상품이 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  products.map((product: any) => {
                    const status = statusConfig[product.status as keyof typeof statusConfig] || statusConfig.active;
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                              className="h-10 w-10 rounded-lg object-cover"
                              src={product.image}
                              alt={product.name}
                            />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {product.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            product.stock === 0 ? 'text-red-600' : 
                            product.stock < 10 ? 'text-yellow-600' : 
                            'text-gray-900'
                          }`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.sales}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewProduct(product.id)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="상세보기"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditProduct(product.id)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="수정"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-1 hover:bg-gray-100 rounded text-red-600"
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 페이지네이션 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <nav className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev: any) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              이전
            </Button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((page: any) => {
                return page === 1 || 
                       page === pagination.totalPages || 
                       Math.abs(page - currentPage) <= 2;
              })
              .map((page, index, array) => (
                <div key={page}>
                  {index > 0 && array[index - 1] < page - 1 && (
                    <span className="px-3 py-1">...</span>
                  )}
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                </div>
              ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev: any) => Math.min(prev + 1, pagination.totalPages))}
              disabled={currentPage === pagination.totalPages}
            >
              다음
            </Button>
          </nav>
        </div>
      )}

      {/* 상품 등록/수정 폼 */}
      <ProductForm
        product={editingProduct}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProduct(undefined);
        }}
        onSubmit={async (data: any) => {
          if (editingProduct) {
            // 수정
            await updateProduct.mutateAsync({ id: editingProduct.id, data });
          } else {
            // 신규 등록
            await createProduct.mutateAsync(data);
          }
          
          setIsFormOpen(false);
          setEditingProduct(undefined);
        }}
      />
    </div>
  );
}