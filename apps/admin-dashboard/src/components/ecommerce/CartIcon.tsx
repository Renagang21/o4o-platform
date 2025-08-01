import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { __ } from '@wordpress/i18n';
import { useCart } from '../../services/cartService';
import { MiniCart } from './MiniCart';

interface CartIconProps {
  showCount?: boolean;
  showDropdown?: boolean;
  className?: string;
}

export function CartIcon({ 
  showCount = true, 
  showDropdown = true,
  className = ''
}: CartIconProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  return (
    <div className="relative">
      <button
        onClick={() => setIsCartOpen(!isCartOpen)}
        className={`relative p-2 hover:bg-gray-100 rounded-md transition-colors ${className}`}
        aria-label={__('Shopping cart', 'o4o')}
      >
        <ShoppingCart className="w-6 h-6" />
        {showCount && itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <MiniCart
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          position="dropdown"
        />
      )}
    </div>
  );
}