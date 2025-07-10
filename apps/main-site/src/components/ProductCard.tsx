import React from 'react';
import { Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
}

interface ProductCardProps {
  product: Product;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onDelete, onToggleActive }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col gap-3 relative">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full" />
          ) : (
            <span className="text-gray-400 text-xs">No Image</span>
          )}
        </div>
        <div className="flex-1">
          <div className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            {product.name}
            {!product.isActive && (
              <span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs">판매 중지</span>
            )}
          </div>
          <div className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">{product.description}</div>
          <div className="mt-1 text-blue-600 dark:text-blue-300 font-semibold">{product.price.toLocaleString()}원</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">재고: {product.stock}개</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">등록일: {product.createdAt.slice(0, 10)}</div>
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onEdit(product.id)}
          className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 text-sm"
        >
          <Edit size={16} /> 수정
        </button>
        <button
          onClick={() => onDelete(product.id)}
          className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
        >
          <Trash2 size={16} /> 삭제
        </button>
        <button
          onClick={() => onToggleActive(product.id)}
          className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${product.isActive ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'}`}
        >
          {product.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          {product.isActive ? '판매중지' : '판매시작'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard; 