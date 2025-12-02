import { ProductCard } from './ProductCard';

interface ProductGridProps {
  items: Array<{
    id: string;
    title: string;
    price: number;
    thumbnail: string;
    category?: string;
  }>;
  total?: number;
  page?: number;
  pageSize?: number;
}

export function ProductGrid({ items, total }: ProductGridProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {total && `Showing ${items.length} of ${total} products`}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map((item) => (
          <ProductCard key={item.id} {...item} />
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No products found
        </div>
      )}
    </div>
  );
}
