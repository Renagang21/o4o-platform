import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Card } from '@o4o/ui';
import { Heart, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { Product } from '@o4o/types';
import { PriceDisplay } from '@/components/common';
import { useAuth } from '@o4o/auth-context';

const mockProduct: Product = {
  id: '1',
  name: 'Luminous Glow Serum',
  slug: 'luminous-glow-serum',
  sku: 'SERUM-001',
  description: '<p>Standard product description text. Simple and direct.</p>',
  shortDescription: 'Product Short Description',
  pricing: { customer: 45000, business: 40500, affiliate: 42750, retailer: { gold: 42750, premium: 41000, vip: 40500 } },
  inventory: { stockQuantity: 50, minOrderQuantity: 1, lowStockThreshold: 10, manageStock: true, allowBackorder: false, stockStatus: 'in_stock' },
  categories: [],
  tags: [],
  images: [
    { id: '1', url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=600', alt: 'Product', sortOrder: 0, isFeatured: true },
    { id: '2', url: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?auto=format&fit=crop&q=80&w=600', alt: 'Detail', sortOrder: 1, isFeatured: false }
  ],
  featuredImageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=600',
  isFeatured: true,
  status: 'active',
  approvalStatus: 'approved',
  supplierId: '1',
  supplierName: 'Supplier',
  specifications: {},
  attributes: {},
  viewCount: 0,
  salesCount: 0,
  rating: 0,
  reviewCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'admin',
  isVirtual: false,
  isDownloadable: false
};

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  useAuth();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isWishlist, setIsWishlist] = useState(false);

  const { data: product = mockProduct, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => { return mockProduct; }
  });

  const handleQuantityChange = (value: number) => {
    if (value >= 1 && value <= product.inventory.stockQuantity) {
      setQuantity(value);
    }
  };

  const handleAddToCart = () => { };
  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  if (isLoading) {
    return <div className="text-center py-24">Loading...</div>;
  }

  if (!product) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground mb-4">Product not found.</p>
        <Button onClick={() => navigate('/products')}>Back to Shop</Button>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-16">
      <nav className="text-sm text-muted-foreground">
        <span className="mx-1">Home</span> /
        <span className="mx-1">Shop</span> /
        <span className="mx-1 text-foreground">{product.name}</span>
      </nav>

      {/* Main Layout: Flat Structure. No Tabs. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-gray-50 border border-gray-100">
            {product.images && product.images[selectedImage] ? (
              <img
                src={product.images[selectedImage].url}
                alt={product.images[selectedImage].alt}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="w-20 h-20 text-muted-foreground/30" />
              </div>
            )}

            {product.images && product.images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImage((prev) => prev > 0 ? prev - 1 : product.images!.length - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-lg backdrop-blur-sm transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedImage((prev) => prev < product.images!.length - 1 ? prev + 1 : 0)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-lg backdrop-blur-sm transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {product.images && product.images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {product.images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(index)}
                  className={`relative w-24 h-24 rounded-lg overflow-hidden border-2 transition-all ${selectedImage === index ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-gray-200'
                    }`}
                >
                  <img src={image.url} alt={image.alt} className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info - Flattened */}
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-gray-900">{product.name}</h1>
            <p className="text-lg text-gray-500 mb-4">{product.shortDescription}</p>

            <div className="p-4 bg-gray-50 rounded-xl">
              <PriceDisplay
                price={product.pricing.customer}
                size="xl"
                className="items-center"
              />
            </div>
          </div>

          <div className="h-px bg-gray-100"></div>

          <div className="space-y-6 pt-4">
            <div>
              <label className="text-sm font-medium mb-3 block text-gray-700">Quantity</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border rounded-lg bg-white shadow-sm">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    className="h-10 w-10"
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e: any) => handleQuantityChange(Number(e.target.value))}
                    className="w-16 text-center border-none h-10 focus-visible:ring-0"
                    min={1}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    className="h-10 w-10"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 h-12">
              <Button onClick={handleAddToCart} variant="outline" className="flex-1 text-base font-medium" size="lg">
                Add to Cart
              </Button>
              <Button onClick={handleBuyNow} variant="default" className="flex-1 text-base font-medium" size="lg">
                Buy Now
              </Button>
              <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => setIsWishlist(!isWishlist)}>
                <Heart className={`w-5 h-5 ${isWishlist ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Flattened Description Section (No Tabs) */}
      <div className="mt-16">
        <h2 className="text-xl font-bold mb-6">Product Details</h2>
        <Card className="p-8 border-none bg-gray-50/50">
          <div className="prose max-w-none text-gray-700">
            <div dangerouslySetInnerHTML={{ __html: product.description }} />
          </div>
        </Card>
      </div>
    </div>
  );
}