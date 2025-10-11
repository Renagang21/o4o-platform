import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, X, Plus, Minus, ShoppingBag, Loader } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import './CartModule.css';

interface CartModuleProps {
  data?: {
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
    showCount = true,
    showTotal = false,
    dropdownAlignment = 'right',
    customClass = ''
  } = data;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { cart, loading, updateQuantity, removeItem, totalItems, totalPrice } = useCart();
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatPrice = (price: number) => {
    return `₩${(price).toLocaleString()}`;
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    setUpdatingItems(prev => new Set(prev).add(itemId));
    try {
      await updateQuantity(itemId, newQuantity);
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setUpdatingItems(prev => new Set(prev).add(itemId));
    try {
      await removeItem(itemId);
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  return (
    <div className={`cart-module ${customClass}`} ref={dropdownRef}>
      <button
        className="cart-toggle"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
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

      {isDropdownOpen && (
        <div className={`cart-dropdown cart-dropdown--${dropdownAlignment}`}>
          <div className="cart-dropdown-header">
            <h3>장바구니 ({totalItems})</h3>
            <button
              className="cart-close"
              onClick={() => setIsDropdownOpen(false)}
              aria-label="Close cart"
            >
              <X size={20} />
            </button>
          </div>

          <div className="cart-dropdown-content">
            {loading ? (
              <div className="cart-loading">
                <Loader size={24} className="cart-loading-spinner" />
                <p>장바구니 로딩 중...</p>
              </div>
            ) : !cart || cart.items.length === 0 ? (
              <div className="cart-empty">
                <ShoppingBag size={48} />
                <p>장바구니가 비어있습니다</p>
                <Link 
                  to="/shop" 
                  className="cart-shop-link"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  쇼핑 계속하기
                </Link>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.items.map(item => (
                    <div key={item.id} className="cart-item">
                      <div className="cart-item-image">
                        {item.image ? (
                          <img src={item.image} alt={item.name} />
                        ) : (
                          <div className="cart-item-placeholder">
                            <ShoppingBag size={24} />
                          </div>
                        )}
                      </div>
                      
                      <div className="cart-item-details">
                        <h4 className="cart-item-name">{item.name}</h4>
                        {item.variant && (
                          <p className="cart-item-variant">{item.variant}</p>
                        )}
                        <div className="cart-item-price">
                          {formatPrice(item.price)}
                        </div>
                      </div>

                      <div className="cart-item-controls">
                        <div className="cart-quantity-control">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            disabled={updatingItems.has(item.id)}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="cart-quantity">
                            {updatingItems.has(item.id) ? '...' : item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            disabled={updatingItems.has(item.id)}
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        
                        <button
                          className="cart-item-remove"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={updatingItems.has(item.id)}
                          aria-label="Remove item"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-summary">
                  <div className="cart-summary-row">
                    <span>소계</span>
                    <span className="cart-summary-price">{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                <div className="cart-actions">
                  <Link
                    to="/cart"
                    className="cart-action-btn cart-action-btn--secondary"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    장바구니 보기
                  </Link>
                  <Link
                    to="/checkout"
                    className="cart-action-btn cart-action-btn--primary"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    결제하기
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};