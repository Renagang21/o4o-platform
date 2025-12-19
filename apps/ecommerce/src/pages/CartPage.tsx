import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@o4o/ui';
import { Checkbox } from '@/components/ui/checkbox';
import { ShoppingCart as CartIcon } from 'lucide-react';
import { Cart, OrderSummary, Product } from '@o4o/types';
import { CartItem, CartSummary } from '@/components/cart';
import { useAuth } from '@o4o/auth-context';

const mockCart: Cart = {
  id: 'cart-001',
  userId: 'user-001',
  summary: { subtotal: 83000, discount: 0, shipping: 0, tax: 0, total: 83000 },
  items: [
    {
      id: 'item-1',
      cartId: 'cart-001',
      productId: '1',
      quantity: 1,
      product: {
        id: '1',
        name: 'Luminous Glow Serum',
        slug: 'luminous-glow-serum',
        pricing: { customer: 45000, business: 40500, affiliate: 42750, retailer: { gold: 42750, premium: 41000, vip: 40500 } },
        inventory: { stockQuantity: 50, minOrderQuantity: 1, lowStockThreshold: 10, manageStock: true, allowBackorder: false, stockStatus: 'in_stock' },
        images: [{ id: '1', url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=200', alt: 'Product', sortOrder: 0, isFeatured: true }],
        categories: [], tags: [], specifications: {}, attributes: {}, status: 'active', approvalStatus: 'approved',
        supplierId: '1', supplierName: 'Supplier', isFeatured: true, isVirtual: false, isDownloadable: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: '1',
        viewCount: 0, salesCount: 0, rating: 0, reviewCount: 0
      } as Product,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'item-2',
      cartId: 'cart-001',
      productId: '2',
      quantity: 1,
      product: {
        id: '2',
        name: 'Hydra Barrier Cream',
        slug: 'hydra-barrier-cream',
        pricing: { customer: 38000, business: 34200, affiliate: 36100, retailer: { gold: 36100, premium: 35000, vip: 34200 } },
        inventory: { stockQuantity: 100, minOrderQuantity: 1, lowStockThreshold: 10, manageStock: true, allowBackorder: false, stockStatus: 'in_stock' },
        images: [{ id: '2', url: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&q=80&w=200', alt: 'Product', sortOrder: 0, isFeatured: true }],
        categories: [], tags: [], specifications: {}, attributes: {}, status: 'active', approvalStatus: 'approved',
        supplierId: '1', supplierName: 'Supplier', isFeatured: true, isVirtual: false, isDownloadable: false,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: '1',
        viewCount: 0, salesCount: 0, rating: 0, reviewCount: 0
      } as Product,
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

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(['item-1', 'item-2']));

  const { data: cart = mockCart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => { return mockCart; }
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async (_: { itemId: string; quantity: number }) => { },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cart'] }); }
  });

  const removeItemMutation = useMutation({
    mutationFn: async () => { },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cart'] }); }
  });

  const orderSummary = useMemo((): OrderSummary => {
    if (!cart || cart.items.length === 0) return { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0 };

    // Simple calculation, no policy logic
    const itemsToCalculate = selectedItems.size > 0
      ? cart.items.filter((item: any) => selectedItems.has(item.id))
      : cart.items;

    const subtotal = itemsToCalculate.reduce((sum: any, item: any) => {
      if (!item.product) return sum;
      return sum + (item.product.pricing?.customer || 0) * item.quantity;
    }, 0);

    return { subtotal, discount: 0, shipping: 0, tax: 0, total: subtotal };
  }, [cart, selectedItems]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedItems(new Set(cart.items.map((item: any) => item.id)));
    else setSelectedItems(new Set());
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) newSelected.add(itemId);
    else newSelected.delete(itemId);
    setSelectedItems(newSelected);
  };

  const handleRemoveSelected = () => {
    removeItemMutation.mutate();
    setSelectedItems(new Set());
  };

  if (isLoading) return <div className="text-center py-24">Loading...</div>;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center py-24">
        <CartIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Cart is empty</h2>
        <Button onClick={() => navigate('/products')}>Go Shopping</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Shopping Cart</h1>
        <p className="text-muted-foreground">{cart.items.length} items</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <Checkbox checked={selectedItems.size === cart.items.length} onCheckedChange={handleSelectAll} />
              <span className="text-sm font-medium">Select All</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRemoveSelected} disabled={selectedItems.size === 0}>
              Delete Selected
            </Button>
          </div>

          <div className="space-y-4">
            {cart.items.map((item: any) => (
              <CartItem
                key={item.id}
                item={item}
                isSelected={selectedItems.has(item.id)}
                onSelect={handleSelectItem}
                onQuantityChange={(itemId, quantity) => updateQuantityMutation.mutate({ itemId, quantity })}
                onRemove={() => removeItemMutation.mutate()}
              />
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <CartSummary summary={orderSummary} userRole={user?.role} onCheckout={() => navigate('/checkout')} />
          </div>
        </div>
      </div>
    </div>
  );
}