import { FC } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const RecentProducts: FC = () => {
  const products = [
    {
      id: '1',
      name: '비타민 C 1000mg',
      image: '/images/products/vitamin-c.png',
      status: '판매중',
      price: 15000
    },
    {
      id: '2',
      name: '오메가3 1000mg',
      image: '/images/products/omega3.png',
      status: '승인대기',
      price: 25000
    },
    {
      id: '3',
      name: '프로바이오틱스',
      image: '/images/products/probiotics.png',
      status: '판매중',
      price: 30000
    },
    {
      id: '4',
      name: '칼슘 마그네슘',
      image: '/images/products/calcium.png',
      status: '승인대기',
      price: 20000
    },
    {
      id: '5',
      name: '루테인',
      image: '/images/products/lutein.png',
      status: '판매중',
      price: 35000
    }
  ];

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
        {products.map((product: any) => (
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
        ))}
      </div>
    </div>
  );
};

export default RecentProducts; 