import { FC } from 'react';
import { ChevronDown } from 'lucide-react';

interface ProductData {
  id: string;
  name: string;
  basePrice: number;
  image: string;
}

interface ProductSelectorProps {
  selectedProduct: ProductData | null;
  onSelect: (product: ProductData) => void;
}

const ProductSelector: FC<ProductSelectorProps> = ({
  selectedProduct,
  onSelect
}) => {
  const products: ProductData[] = [
    {
      id: '1',
      name: '비타민 C 1000mg',
      basePrice: 15000,
      image: '/images/products/vitamin-c.png'
    },
    {
      id: '2',
      name: '오메가3 1000mg',
      basePrice: 25000,
      image: '/images/products/omega3.png'
    },
    {
      id: '3',
      name: '프로바이오틱스',
      basePrice: 30000,
      image: '/images/products/probiotics.png'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        상품 선택
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product: any) => (
          <button
            key={product.id}
            onClick={() => onSelect(product)}
            className={`relative p-4 rounded-lg border-2 transition-all ${
              selectedProduct?.id === product.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="aspect-w-1 aspect-h-1 mb-3">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            </div>
            <h3 className="font-medium text-gray-900">{product.name}</h3>
            <p className="text-sm text-gray-500">
              {product.basePrice.toLocaleString()}원
            </p>
            {selectedProduct?.id === product.id && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <ChevronDown className="w-4 h-4 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductSelector; 