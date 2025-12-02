import { useState, FC } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface ProductData {
  id: string;
  name: string;
  basePrice: number;
  image: string;
}

interface LivePreviewProps {
  product: ProductData | null;
  label: File | null;
  price: number;
}

const LivePreview: FC<LivePreviewProps> = ({
  product,
  label,
  price
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  if (!product) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
        <p className="text-gray-500">
          상품을 선택해주세요
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        실시간 미리보기
      </h2>
      <div className="relative">
        <div
          className={`relative transition-all duration-300 ${
            isZoomed ? 'scale-150' : 'scale-100'
          }`}
        >
          <div className="aspect-w-1 aspect-h-1">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-contain"
            />
          </div>
          {label && (
            <div className="absolute inset-0">
              <img
                src={URL.createObjectURL(label)}
                alt="Custom label"
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>
        <button
          onClick={() => setIsZoomed(!isZoomed)}
          className="absolute bottom-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
        >
          {isZoomed ? (
            <ZoomOut className="w-5 h-5 text-gray-600" />
          ) : (
            <ZoomIn className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>
      <div className="mt-6 space-y-2">
        <h3 className="text-lg font-medium text-gray-900">
          {product.name}
        </h3>
        <p className="text-2xl font-bold text-blue-600">
          {price.toLocaleString()}원
        </p>
      </div>
    </div>
  );
};

export default LivePreview; 