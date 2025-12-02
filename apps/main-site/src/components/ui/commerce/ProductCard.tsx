import { memo } from 'react';

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  thumbnail: string;
  category?: string;
}

// Performance: Memoize ProductCard to prevent unnecessary re-renders
export const ProductCard = memo(function ProductCard({ title, price, thumbnail, category }: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-200">
      <div className="aspect-square overflow-hidden bg-gray-100">
        <img
          src={thumbnail}
          alt={title}
          loading="lazy" // Performance: Lazy load images
          onError={(e) => {
            // Performance: Fallback for broken images
            e.currentTarget.src = '/placeholder-product.png';
          }}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-4">
        {category && (
          <div className="text-xs text-gray-500 mb-1">{category}</div>
        )}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{title}</h3>
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold text-blue-600">
            ₩{price.toLocaleString()}
          </div>
          <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition">
            Details
          </button>
        </div>
      </div>
    </div>
  );
});
