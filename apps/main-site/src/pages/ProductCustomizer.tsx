import { useState, FC } from 'react';
import ProductSelector from '../components/product/ProductSelector';
import LabelUploader from '../components/product/LabelUploader';
import PriceInput from '../components/product/PriceInput';
import LivePreview from '../components/product/LivePreview';

interface ProductData {
  id: string;
  name: string;
  basePrice: number;
  image: string;
}

interface CustomizationData {
  product: ProductData | null;
  label: File | null;
  price: number;
}

const ProductCustomizer: FC = () => {
  const [customization, setCustomization] = useState<CustomizationData>({
    product: null,
    label: null,
    price: 0
  });

  const handleProductSelect = (product: ProductData) => {
    setCustomization(prev => ({
      ...prev,
      product,
      price: product.basePrice
    }));
  };

  const handleLabelUpload = (file: File) => {
    setCustomization(prev => ({
      ...prev,
      label: file
    }));
  };

  const handlePriceChange = (price: number) => {
    setCustomization(prev => ({
      ...prev,
      price
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            상품 커스터마이징
          </h1>
          <p className="text-lg text-gray-600">
            당신만의 브랜드로 상품을 커스터마이징하세요
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* 왼쪽: 설정 영역 */}
          <div className="space-y-8">
            <ProductSelector
              selectedProduct={customization.product}
              onSelect={handleProductSelect}
            />
            <LabelUploader
              onUpload={handleLabelUpload}
              currentLabel={customization.label}
            />
            <PriceInput
              basePrice={customization.product?.basePrice || 0}
              currentPrice={customization.price}
              onChange={handlePriceChange}
            />
          </div>

          {/* 오른쪽: 미리보기 영역 */}
          <div className="lg:sticky lg:top-8">
            <LivePreview
              product={customization.product}
              label={customization.label}
              price={customization.price}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCustomizer; 