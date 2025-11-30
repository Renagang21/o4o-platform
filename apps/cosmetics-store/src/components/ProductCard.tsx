import { Link } from 'react-router-dom';

interface ProductCardProps {
  product: any;
}

export default function ProductCard({ product }: ProductCardProps) {
  const cosmetics = product.metadata?.cosmetics || {};
  const imageUrl = product.image || '/placeholder-product.png';

  return (
    <Link
      to={`/product/${product.id}`}
      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="aspect-square bg-gray-100">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
          {product.name}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {product.description}
        </p>

        {/* Skin Type Tags */}
        {cosmetics.skinType && cosmetics.skinType.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {cosmetics.skinType.slice(0, 3).map((type: string) => (
              <span
                key={type}
                className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded"
              >
                {getSkinTypeLabel(type)}
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex justify-between items-center mt-3">
          <span className="text-lg font-bold text-gray-900">
            {product.price?.toLocaleString()}원
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              // TODO: Import to my products
              alert('내 제품으로 가져오기 기능 구현 예정');
            }}
            className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            가져오기
          </button>
        </div>
      </div>
    </Link>
  );
}

function getSkinTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    dry: '건성',
    oily: '지성',
    combination: '복합성',
    sensitive: '민감성',
    normal: '정상',
  };
  return labels[type] || type;
}
