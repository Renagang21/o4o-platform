import { FC } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package } from 'lucide-react';

const RecentProducts: FC = () => {
  // Mock 데이터 제거 - 실제 API 연동 필요
  const products: any[] = [];

  const getStatusColor = (status: string) => {
    const colors = {
      '판매중': 'bg-green-100 text-green-800',
      '승인대기': 'bg-yellow-100 text-yellow-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            최근 등록 상품
          </h2>
          <Link
            to="/dashboard/products"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center"
          >
            전체보기
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">등록된 상품이 없습니다</h3>
            <p className="text-gray-500 mb-4">상품을 등록하여 판매를 시작해보세요</p>
            <Link
              to="/dashboard/products/add"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              상품 등록하기
            </Link>
          </div>
        ) : (
          products.map((product: any) => (
            <div key={product.id} className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-12 h-12">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {product.name}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-gray-500">
                      {product.price.toLocaleString()}원
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(product.status)}`}>
                      {product.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecentProducts; 