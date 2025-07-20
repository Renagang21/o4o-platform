import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Minus, Plus } from 'lucide-react';
import { Button, Input, Checkbox } from '@o4o/ui';
import { CartItem as CartItemType } from '@o4o/types/ecommerce';
import { PriceDisplay, StockStatus } from '@/components/common';
import { cn } from '@o4o/utils';

interface CartItemProps {
  item: CartItemType;
  isSelected: boolean;
  onSelect: (itemId: string, selected: boolean) => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  userRole?: string;
  className?: string;
}

export const CartItem: React.FC<CartItemProps> = ({
  item,
  isSelected,
  onSelect,
  onQuantityChange,
  onRemove,
  userRole,
  className
}) => {
  const { product, quantity } = item;
  
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= product.stockQuantity) {
      onQuantityChange(item.id, newQuantity);
    }
  };

  const subtotal = product.priceByRole && userRole && product.priceByRole[userRole]
    ? product.priceByRole[userRole] * quantity
    : product.price * quantity;

  return (
    <div className={cn('flex gap-4 p-4 border rounded-lg', className)}>
      {/* Selection Checkbox */}
      <div className="flex items-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(item.id, checked as boolean)}
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
        {product.attributes && product.attributes.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {product.attributes.map(attr => (
              <span key={attr.name}>{attr.name}: {attr.value} </span>
            ))}
          </div>
        )}

        {/* Stock Status */}
        <StockStatus
          stockQuantity={product.stockQuantity}
          manageStock={product.manageStock}
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
            onChange={(e) => handleQuantityChange(Number(e.target.value))}
            className="w-16 h-8 text-center"
            min={1}
            max={product.stockQuantity}
          />
          
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={quantity >= product.stockQuantity}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <span className="text-sm text-muted-foreground ml-2">
            재고: {product.stockQuantity}개
          </span>
        </div>
      </div>

      {/* Price and Actions */}
      <div className="text-right space-y-2">
        <PriceDisplay
          price={subtotal}
          compareAtPrice={product.compareAtPrice ? product.compareAtPrice * quantity : undefined}
          size="lg"
        />
        
        <div className="text-sm text-muted-foreground">
          개당 <PriceDisplay price={product.price} priceByRole={product.priceByRole} userRole={userRole} size="sm" />
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