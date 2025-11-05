import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { MiniCart } from './MiniCart';
import './CartModule.css';

interface CartModuleProps {
  data?: {
    action?: 'page' | 'mini-cart';
    showCount?: boolean;
    showTotal?: boolean;
    dropdownAlignment?: 'left' | 'right';
    customClass?: string;
  };
}

export const CartModule: React.FC<CartModuleProps> = ({
  data = {}
}) => {
  const {
    action = 'mini-cart',
    showCount = true,
    showTotal = false,
    dropdownAlignment = 'right',
    customClass = ''
  } = data;

  const [showMiniCart, setShowMiniCart] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const { totalItems, totalPrice } = useCart();

  const formatPrice = (price: number) => {
    return `₩${price.toLocaleString()}`;
  };

  const handleCartClick = () => {
    if (action === 'page') {
      navigate('/cart');
    } else {
      setShowMiniCart(!showMiniCart);
    }
  };

  return (
    <>
      <div className={`cart-module ${customClass}`}>
        <button
          ref={buttonRef}
          className="cart-toggle"
          onClick={handleCartClick}
          aria-label="Shopping cart"
          aria-expanded={action === 'mini-cart' ? showMiniCart : undefined}
          aria-haspopup={action === 'mini-cart' ? 'dialog' : undefined}
        >
          <div className="cart-icon-wrapper">
            <ShoppingCart size={20} />
            {showCount && totalItems > 0 && (
              <span className="cart-count">{totalItems}</span>
            )}
          </div>
          {showTotal && totalItems > 0 && (
            <span className="cart-total">{formatPrice(totalPrice)}</span>
          )}
        </button>
      </div>

      {/* Mini Cart - Only shown when action is 'mini-cart' */}
      {action === 'mini-cart' && (
        <MiniCart
          isOpen={showMiniCart}
          onClose={() => setShowMiniCart(false)}
          anchorEl={buttonRef.current}
          alignment={dropdownAlignment}
        />
      )}
    </>
  );
};