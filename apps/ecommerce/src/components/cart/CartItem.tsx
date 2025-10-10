import { FC } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Minus, Plus } from 'lucide-react';
import { Button, Input } from '@o4o/ui';
import { Checkbox } from '@/components/ui/checkbox';
import { CartItem as CartItemType } from '@o4o/types';
import { PriceDisplay, StockStatus } from '@/components/common';
import { cn } from '@o4o/utils';

interface CartItemProps {
  item: CartItemType;
  isSelected: boolean;
  onSelect: (itemId: string, selected: boolean) => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  className?: string;
}

export const CartItem: FC<CartItemProps> = ({
  item,
  isSelected,
  onSelect,
  onQuantityChange,
  onRemove,
  className
}) => {
  const { product, quantity } = item as any;
  
  if (!product) {
    return null; // or a placeholder component
  }
  
  const handleQuantityChange = (newQuantity: number) => {
    const stockQuantity = (product as any).stockQuantity || 100; // fallback for missing property
    if (newQuantity >= 1 && newQuantity <= stockQuantity) {
      onQuantityChange(item.id, newQuantity);
    }
  };

  const price = (product.pricing?.customer || (product as any).price || 0);
  const subtotal = price * quantity;

  return (
    <div className={cn('flex gap-4 p-4 border rounded-lg', className)}>
      {/* Selection Checkbox */}
      <div className="flex items-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked: boolean) => onSelect(item.id, checked)}
        />
      </div>

      {/* Product Image */}
      <Link to={`/products/${product.slug || product.id}`}>
        <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden">
          {product.images && product.images[0] ? (
            <img
              src={product.images[0].url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="flex-1 space-y-2">
        <Link to={`/products/${product.slug || product.id}`}>
          <h3 className="font-medium hover:text-primary">{product.name}</h3>
        </Link>
        
        {/* Attributes */}
        {item.attributes && Object.keys(item.attributes).length > 0 && (
          <div className="text-sm text-muted-foreground">
            {Object.entries(item.attributes).map(([key, value]) => (
              <span key={key}>{key}: {value} </span>
            ))}
          </div>
        )}

        {/* Stock Status */}
        <StockStatus
          stockQuantity={(product as any).stockQuantity}
          manageStock={(product as any).manageStock}
        />

        {/* Quantity Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <Input
            type="number"
            value={quantity}
            onChange={(e: any) => handleQuantityChange(Number(e.target.value))}
            className="w-16 h-8 text-center"
            min={1}
            max={(product as any).stockQuantity || 100}
          />
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={quantity >= ((product as any).stockQuantity || 100)}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <span className="text-sm text-muted-foreground ml-2">
            재고: {(product as any).stockQuantity || 100}개
          </span>
        </div>
      </div>

      {/* Price and Actions */}
      <div className="text-right space-y-2">
        <PriceDisplay
          price={subtotal}
          compareAtPrice={(product as any).compareAtPrice ? (product as any).compareAtPrice * quantity : undefined}
          size="lg"
        />
        
        <div className="text-sm text-muted-foreground">
          개당 <PriceDisplay price={price} size="sm" />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};