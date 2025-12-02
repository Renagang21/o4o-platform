import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, ShoppingBag, Plus, Minus, Loader } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import './MiniCart.css';

interface MiniCartProps {
  isOpen: boolean;
  onClose: () => void;
  anchorEl?: HTMLElement | null;
  alignment?: 'left' | 'right';
}

export const MiniCart: React.FC<MiniCartProps> = ({
  isOpen,
  onClose,
  anchorEl,
  alignment = 'right'
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const { cart, loading, updateQuantity, removeItem, totalItems, totalPrice } = useCart();
  const [updatingItems, setUpdatingItems] = React.useState<Set<string>>(new Set());

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  // Outside click handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, anchorEl]);

  const formatPrice = (price: number) => {
    return `₩${price.toLocaleString()}`;
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

  if (!isOpen) return null;

  return (
    <div className="mini-cart-overlay">
      <div
        className={`mini-cart-panel mini-cart-panel--${alignment}`}
        ref={panelRef}
        role="dialog"
        aria-label="Shopping cart"
        aria-modal="true"
      >
        {/* Header */}
        <div className="mini-cart-header">
          <h3>장바구니 ({totalItems})</h3>
          <button
            onClick={onClose}
            className="mini-cart-close"
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="mini-cart-content">
          {loading ? (
            <div className="mini-cart-loading">
              <Loader size={24} className="mini-cart-spinner" />
              <p>장바구니 로딩 중...</p>
            </div>
          ) : !cart || cart.items.length === 0 ? (
            <div className="mini-cart-empty">
              <ShoppingBag size={48} />
              <p>장바구니가 비어있습니다</p>
              <Link
                to="/shop"
                className="mini-cart-shop-link"
                onClick={onClose}
              >
                쇼핑 계속하기
              </Link>
            </div>
          ) : (
            <>
              <div className="mini-cart-items">
                {cart.items.map(item => (
                  <div key={item.id} className="mini-cart-item">
                    <div className="mini-cart-item-image">
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <div className="mini-cart-item-placeholder">
                          <ShoppingBag size={24} />
                        </div>
                      )}
                    </div>

                    <div className="mini-cart-item-details">
                      <h4 className="mini-cart-item-name">{item.name}</h4>
                      {item.variant && (
                        <p className="mini-cart-item-variant">{item.variant}</p>
                      )}
                      <div className="mini-cart-item-price">
                        {formatPrice(item.price)}
                      </div>
                    </div>

                    <div className="mini-cart-item-controls">
                      <div className="mini-cart-quantity">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={updatingItems.has(item.id)}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span>
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
                        className="mini-cart-item-remove"
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

              {/* Footer */}
              <div className="mini-cart-footer">
                <div className="mini-cart-total">
                  <span>합계</span>
                  <span className="mini-cart-total-amount">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                <div className="mini-cart-actions">
                  <Link
                    to="/cart"
                    className="mini-cart-btn mini-cart-btn--secondary"
                    onClick={onClose}
                  >
                    장바구니 보기
                  </Link>
                  <Link
                    to="/checkout"
                    className="mini-cart-btn mini-cart-btn--primary"
                    onClick={onClose}
                  >
                    결제하기
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
