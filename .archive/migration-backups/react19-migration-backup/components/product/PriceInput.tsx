import React from 'react';
import { DollarSign } from 'lucide-react';

interface PriceInputProps {
  basePrice: number;
  currentPrice: number;
  onChange: (price: number) => void;
}

const PriceInput: React.FC<PriceInputProps> = ({
  basePrice,
  currentPrice,
  onChange
}) => {
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(value)) {
      onChange(value);
    }
  };

  const margin = currentPrice - basePrice;
  const marginPercentage = (margin / basePrice) * 100;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        가격 설정
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            기본 제공가
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={basePrice.toLocaleString()}
              readOnly
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            판매가
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={currentPrice.toLocaleString()}
              onChange={handlePriceChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">마진</span>
            <span className="font-medium text-gray-900">
              {margin.toLocaleString()}원 ({marginPercentage.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceInput; 