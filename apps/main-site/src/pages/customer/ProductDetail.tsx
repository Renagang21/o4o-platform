import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useProductStore } from '../../stores/productStore';
import { useOrderStore } from '../../stores/orderStore';
import { useAuthStore } from '../../stores/authStore';
import ProductReviews from '../../components/ProductReviews';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { products, fetchProducts, flatCategories } = useProductStore();
  const { addToCart } = useOrderStore();
  
  const [product, setProduct] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');

  useEffect(() => {
    if (!user || user.userType !== 'customer') {
      navigate('/login');
      return;
    }

    fetchProducts();
  }, [user]);

  useEffect(() => {
    if (id && products.length > 0) {
      const foundProduct = products.find(p => p.id === id && p.approvalStatus === 'approved');
      if (foundProduct) {
        setProduct(foundProduct);
      } else {
        navigate('/customer/products');
      }
    }
  }, [id, products]);

  const handleAddToCart = () => {
    if (!product || !user) return;

    try {
      addToCart(product.id, quantity);
      toast.success('장바구니에 추가되었습니다.');
    } catch (error) {
      toast.error('장바구니 추가에 실패했습니다.');
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = flatCategories.find(cat => cat.id === categoryId);
    return category?.name || '미분류';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <Link to="/customer/dashboard" className="flex items-center text-gray-600 hover:text-gray-900">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                쇼핑몰 홈으로
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/customer/cart" className="text-gray-600 hover:text-gray-900">
                장바구니
              </Link>
              <span className="text-sm text-gray-500">{user?.name}님</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 브레드크럼 */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link to="/customer/dashboard" className="text-gray-700 hover:text-gray-900">
                홈
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <Link to="/customer/products" className="ml-1 text-gray-700 hover:text-gray-900 md:ml-2">
                  상품
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="ml-1 text-gray-500 md:ml-2">{product.categories[0] && getCategoryName(product.categories[0])}</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* 상품 정보 */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
          {/* 상품 이미지 */}
          <div className="flex flex-col-reverse">
            {/* 이미지 썸네일 */}
            <div className="hidden mt-6 w-full max-w-2xl mx-auto sm:block lg:max-w-none">
              <div className="grid grid-cols-4 gap-6">
                {product.images.map((image: string, index: number) => (
                  <button
                    key={index}
                    className={`relative h-24 bg-white rounded-md flex items-center justify-center text-sm font-medium uppercase text-gray-900 cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring focus:ring-offset-4 focus:ring-opacity-50 ${
                      index === selectedImage ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <span className="sr-only">이미지 {index + 1}</span>
                    <span className="absolute inset-0 rounded-md overflow-hidden">
                      <img
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-center object-cover"
                      />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 메인 이미지 */}
            <div className="w-full aspect-w-1 aspect-h-1">
              <img
                src={product.images[selectedImage] || '/images/placeholder.jpg'}
                alt={product.name}
                className="w-full h-full object-center object-cover sm:rounded-lg"
              />
            </div>
          </div>

          {/* 상품 정보 */}
          <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{product.name}</h1>
            
            <div className="mt-3">
              <h2 className="sr-only">상품 정보</h2>
              <p className="text-3xl text-gray-900">₩{formatPrice(product.basePrice)}</p>
            </div>

            {/* 브랜드 및 카테고리 */}
            <div className="mt-6">
              <div className="flex items-center text-sm text-gray-500">
                <span>브랜드: {product.brand}</span>
                <span className="mx-2">•</span>
                <span>카테고리: {product.categories.map((catId: string) => getCategoryName(catId)).join(', ')}</span>
              </div>
            </div>

            {/* 짧은 설명 */}
            <div className="mt-6">
              <h3 className="sr-only">설명</h3>
              <div className="text-base text-gray-700">
                <p>{product.shortDescription}</p>
              </div>
            </div>

            {/* 수량 선택 및 장바구니 */}
            <div className="mt-10 flex sm:flex-col1">
              <div className="flex items-center space-x-6">
                {/* 수량 선택 */}
                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                    수량
                  </label>
                  <select
                    id="quantity"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="mt-1 block w-20 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {[...Array(Math.min(product.stockQuantity, 10))].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 장바구니 추가 */}
                <button
                  onClick={handleAddToCart}
                  disabled={product.stockQuantity === 0}
                  className="flex-1 bg-blue-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {product.stockQuantity === 0 ? '품절' : '장바구니 담기'}
                </button>
              </div>
            </div>

            {/* 재고 정보 */}
            <div className="mt-6 text-sm text-gray-600">
              <p>재고: {product.stockQuantity}개</p>
            </div>
          </div>
        </div>

        {/* 상품 상세 탭 */}
        <div className="mt-16">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('description')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'description'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                상품 설명
              </button>
              <button
                onClick={() => setActiveTab('specs')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'specs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                상품 사양
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'reviews'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                상품 리뷰
              </button>
            </nav>
          </div>

          <div className="mt-8">
            {activeTab === 'description' && (
              <div className="prose max-w-none">
                <p className="text-gray-700">{product.description}</p>
              </div>
            )}

            {activeTab === 'specs' && (
              <div>
                {product.specifications && Object.keys(product.specifications).length > 0 ? (
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-sm font-medium text-gray-900">{key}</dt>
                        <dd className="mt-1 text-sm text-gray-700">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-gray-500">상품 사양 정보가 없습니다.</p>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <ProductReviews productId={product.id} productName={product.name} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}