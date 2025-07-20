import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Checkbox } from '@o4o/ui';
import { Trash2, ShoppingCart as CartIcon } from 'lucide-react';
import { Cart, CartItem as CartItemType, OrderSummary } from '@o4o/types/ecommerce';
import { CartItem, CartSummary } from '@/components/cart';
import { useAuth } from '@o4o/auth-context';
import { authClient } from '@o4o/auth-client';
import { calculateCartTotal } from '@o4o/utils/pricing';

// Mock cart data - replace with actual API
const mockCart: Cart = {
  id: '1',
  userId: '1',
  items: [
    {
      id: '1',
      cartId: '1',
      productId: '1',
      quantity: 2,
      product: {
        id: '1',
        name: '프리미엄 무선 헤드폰',
        slug: 'premium-wireless-headphones',
        price: 89000,
        compareAtPrice: 129000,
        stockQuantity: 15,
        images: [{ id: '1', url: 'https://via.placeholder.com/300x300', alt: '헤드폰' }],
        status: 'published',
        manageStock: true,
        priceByRole: {
          customer: 89000,
          retailer: 84550, // 5% off for retailers
          business: 80100  // 10% off for business
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      cartId: '1',
      productId: '2',
      quantity: 1,
      product: {
        id: '2',
        name: '스마트 워치 프로',
        slug: 'smart-watch-pro',
        price: 259000,
        stockQuantity: 8,
        images: [{ id: '2', url: 'https://via.placeholder.com/300x300', alt: '스마트워치' }],
        status: 'published',
        manageStock: true,
        priceByRole: {
          customer: 259000,
          retailer: 246050,
          business: 233100
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Fetch cart
  const { data: cart = mockCart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      // TODO: Replace with actual API call
      // const response = await authClient.get('/api/v1/cart');
      // return response.data;
      return mockCart;
    }
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      // TODO: Replace with actual API call
      // const response = await authClient.patch(`/api/v1/cart/items/${itemId}`, { quantity });
      // return response.data;
      // TODO: Log quantity update for debugging
      // console.log('Update quantity:', itemId, quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    }
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      // TODO: Replace with actual API call
      // const response = await authClient.delete(`/api/v1/cart/items/${itemId}`);
      // return response.data;
      // TODO: Log item removal for debugging
      // console.log('Remove item:', itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    }
  });

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      // TODO: Replace with actual API call
      // const response = await authClient.delete('/api/v1/cart');
      // return response.data;
      // TODO: Log cart clearing for debugging
      // console.log('Clear cart');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setSelectedItems(new Set());
    }
  });

  // Calculate order summary
  const orderSummary = useMemo((): OrderSummary => {
    if (!cart || cart.items.length === 0) {
      return {
        itemCount: 0,
        subtotal: 0,
        discount: 0,
        shipping: 0,
        tax: 0,
        total: 0
      };
    }

    // Filter selected items or use all if none selected
    const itemsToCalculate = selectedItems.size > 0
      ? cart.items.filter(item => selectedItems.has(item.id))
      : cart.items;

    // Calculate using utility function
    const totals = calculateCartTotal(
      itemsToCalculate,
      user?.role || 'customer',
      user?.retailerGrade
    );

    // Get retailer discount
    let discountRate = 0;
    if (user?.role === 'retailer') {
      switch (user.retailerGrade) {
        case 'premium': discountRate = 0.03; break;
        case 'vip': discountRate = 0.05; break;
      }
    }

    const subtotal = totals.subtotal;
    const discount = subtotal * discountRate;
    const subtotalAfterDiscount = subtotal - discount;

    // Free shipping for orders over 50,000 or VIP retailers
    const shipping = (subtotalAfterDiscount >= 50000 || user?.retailerGrade === 'vip') ? 0 : 3000;
    
    // 10% tax
    const tax = Math.floor(subtotalAfterDiscount * 0.1);
    
    const total = subtotalAfterDiscount + shipping + tax;

    return {
      itemCount: itemsToCalculate.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      discount,
      shipping,
      tax,
      total
    };
  }, [cart, selectedItems, user]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(cart.items.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleCheckout = () => {
    if (selectedItems.size === 0 && cart.items.length > 0) {
      // If no items selected, select all
      setSelectedItems(new Set(cart.items.map(item => item.id)));
    }
    navigate('/checkout');
  };

  const handleRemoveSelected = () => {
    selectedItems.forEach(itemId => {
      removeItemMutation.mutate(itemId);
    });
    setSelectedItems(new Set());
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">장바구니를 불러오는 중...</p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center py-12">
        <CartIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">장바구니가 비어있습니다</h2>
        <p className="text-muted-foreground mb-4">원하는 상품을 장바구니에 담아보세요</p>
        <Button onClick={() => navigate('/products')}>
          쇼핑 계속하기
        </Button>
      </div>
    );
  }

  const allSelected = selectedItems.size === cart.items.length;
  const someSelected = selectedItems.size > 0 && selectedItems.size < cart.items.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">장바구니</h1>
        <p className="text-muted-foreground">
          {cart.items.length}개의 상품이 담겨있습니다
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Actions Bar */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm">
                전체선택 {selectedItems.size > 0 && `(${selectedItems.size}개)`}
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveSelected}
                disabled={selectedItems.size === 0}
              >
                선택삭제
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearCartMutation.mutate()}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                전체삭제
              </Button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="space-y-4">
            {cart.items.map(item => (
              <CartItem
                key={item.id}
                item={item}
                isSelected={selectedItems.has(item.id)}
                onSelect={handleSelectItem}
                onQuantityChange={(itemId, quantity) => 
                  updateQuantityMutation.mutate({ itemId, quantity })
                }
                onRemove={(itemId) => removeItemMutation.mutate(itemId)}
                userRole={user?.role}
              />
            ))}
          </div>
        </div>

        {/* Cart Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <CartSummary
              summary={orderSummary}
              userRole={user?.role}
              userGrade={user?.retailerGrade}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </div>
    </div>
  );
}