import React from 'react';
import { Product } from '@o4o/types';
import { ProductCard } from './ProductCard';
import { cn } from '@o4o/utils';

interface ProductGridProps {
  products: Product[];
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  mode?: 'customer' | 'admin';
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  onDuplicate?: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  className?: string;
}

export const ProductGrid: FC<ProductGridProps> = ({
  products,
  columns = 4,
  mode = 'customer',
  onEdit,
  onDelete,
  onDuplicate,
  onAddToCart,
  className
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-6',
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">상품이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className={cn(`grid ${gridCols[columns]} gap-6`, className)}>
      {products.map((product: any) => (
        <ProductCard
          key={product.id}
          product={product}
          mode={mode}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
};