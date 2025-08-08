import { useState } from 'react';
import { ShoppingCart, Check, Loader2 } from 'lucide-react';
import { __ } from '@wordpress/i18n';
import { cartService } from '../../services/cartService';
import { isProductPurchasable } from '../../utils/ecommerce';
import toast from 'react-hot-toast';

interface AddToCartButtonProps {
  product: any;
  quantity?: number;
  variations?: any;
  className?: string;
  showIcon?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  onAddToCart?: (success: boolean) => void;
}

export function AddToCartButton({
  product,
  quantity = 1,
  variations,
  className = '',
  showIcon = true,
  fullWidth = false,
  size = 'md',
  variant = 'primary',
  onAddToCart
}: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = async () => {
    if (!isProductPurchasable(product)) {
      toast.error(__('This product cannot be purchased', 'o4o'));
      return;
    }

    setIsLoading(true);

    try {
      const success = await cartService.addToCart(product, quantity, variations);
      
      if (success) {
        setIsAdded(true);
        toast.success(__('Added to cart!', 'o4o'));
        
        // Reset added state after 2 seconds
        setTimeout(() => setIsAdded(false), 2000);
        
        // Call callback if provided
        onAddToCart?.(true);
      } else {
        toast.error(__('Failed to add to cart', 'o4o'));
        onAddToCart?.(false);
      }
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error(__('An error occurred', 'o4o'));
      onAddToCart?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-400',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white disabled:border-gray-400 disabled:text-gray-400'
  };

  const buttonClasses = `
    inline-flex items-center justify-center gap-2 font-medium rounded-md
    transition-all duration-200 disabled:cursor-not-allowed
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `;

  const isDisabled = isLoading || !isProductPurchasable(product);

  const getButtonText = () => {
    if (product.stockStatus === 'out_of_stock') {
      return __('Out of Stock', 'o4o');
    }
    if (isLoading) {
      return __('Adding...', 'o4o');
    }
    if (isAdded) {
      return __('Added!', 'o4o');
    }
    return __('Add to Cart', 'o4o');
  };

  const getButtonIcon = () => {
    if (!showIcon) return null;
    
    if (isLoading) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    if (isAdded) {
      return <Check className="w-4 h-4" />;
    }
    return <ShoppingCart className="w-4 h-4" />;
  };

  return (
    <button
      onClick={handleAddToCart}
      disabled={isDisabled}
      className={buttonClasses}
      data-product-id={product.id}
      data-product-type={product.type}
      aria-label={`${__('Add', 'o4o')} ${product.title} ${__('to cart', 'o4o')}`}
    >
      {getButtonIcon()}
      <span>{getButtonText()}</span>
    </button>
  );
}