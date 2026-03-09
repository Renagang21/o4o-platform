/**
 * CartDrawer — Storefront Cart Sidebar
 *
 * WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1
 *
 * 오른쪽 슬라이딩 Drawer.
 * localStorage cart 기반.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import * as cartService from '../../services/cartService';
import type { CartItem } from '../../services/cartService';

interface CartDrawerProps {
  slug: string;
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ slug, open, onClose }: CartDrawerProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (open) {
      setItems(cartService.getCart(slug).items);
    }
  }, [open, slug]);

  const refresh = () => setItems(cartService.getCart(slug).items);

  const handleQuantityChange = (productId: string, delta: number) => {
    const item = items.find((i) => i.productId === productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      cartService.removeItem(slug, productId);
    } else {
      cartService.updateQuantity(slug, productId, newQty);
    }
    refresh();
  };

  const handleRemove = (productId: string) => {
    cartService.removeItem(slug, productId);
    refresh();
  };

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const handleCheckout = () => {
    onClose();
    navigate(`/store/${slug}/checkout`);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.4)',
          transition: 'opacity 0.2s',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 101,
        width: '100%', maxWidth: '380px',
        backgroundColor: '#fff',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 12px rgba(0,0,0,0.08)',
      }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>장바구니</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={22} color="#64748b" />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
              <ShoppingBag size={40} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '15px' }}>장바구니가 비어있습니다</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} style={{
                padding: '12px 0', borderBottom: '1px solid #f1f5f9',
                display: 'flex', gap: '12px', alignItems: 'flex-start',
              }}>
                {/* Image */}
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                ) : (
                  <div style={{ width: '56px', height: '56px', borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📦</div>
                )}

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.3 }}>{item.productName}</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{item.unitPrice.toLocaleString()}원</p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <button onClick={() => handleQuantityChange(item.productId, -1)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Minus size={14} color="#64748b" />
                    </button>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => handleQuantityChange(item.productId, 1)} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={14} color="#64748b" />
                    </button>

                    <button onClick={() => handleRemove(item.productId)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={16} color="#ef4444" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '15px', color: '#64748b' }}>합계</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{total.toLocaleString()}원</span>
            </div>
            <button
              onClick={handleCheckout}
              style={{
                width: '100%', height: '48px', borderRadius: '10px', border: 'none',
                backgroundColor: '#2563eb', color: '#fff', fontSize: '16px', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              주문하기
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default CartDrawer;
