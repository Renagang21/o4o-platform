import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Filter,
  Link,
  Copy,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Star,
  Heart,
  Share2,
  Eye,
  ShoppingCart,
  Package
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Product {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  marginRate: number;
  commissionRate: number;
  estimatedCommission: number;
  stockQuantity: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  featured: boolean;
  tags: string[];
  supplier: {
    id: string;
    name: string;
    rating: number;
  };
  performance: {
    views: number;
    clicks: number;
    conversions: number;
    conversionRate: number;
    totalEarnings: number;
  };
}

interface PartnerProductsProps {
  category?: string;
  featured?: boolean;
  limit?: number;
  sortBy?: 'commission' | 'performance' | 'price' | 'newest';
}

const PartnerProducts: React.FC<PartnerProductsProps> = ({
  category,
  featured = false,
  limit = 12,
  sortBy = 'commission'
}) => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');
  const [sortOption, setSortOption] = useState(sortBy);
  const [favorites, setFavorites] = useState<string[]>([]);

  const categories = [
    'all',
    'electronics',
    'clothing',
    'home',
    'beauty',
    'sports',
    'books',
    'toys'
  ];

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, sortOption, searchTerm]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        category: selectedCategory !== 'all' ? selectedCategory : '',
        search: searchTerm,
        sort: sortOption,
        featured: featured.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`/api/v1/dropshipping/partner/products?${params}`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch products',
          variant: 'destructive'
        });
      }
    } catch (error) {
      
      toast({
        title: 'Error',
        description: 'Network error occurred',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePartnerLink = async (productId: string) => {
    try {
      const response = await fetch('/api/v1/dropshipping/partner/generate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          productId,
          type: 'product',
          campaign: 'partner_products_shortcode'
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.link;
      }
      return null;
    } catch (error) {
      
      return null;
    }
  };

  const handleCopyLink = async (productId: string, productTitle: string) => {
    const link = await generatePartnerLink(productId);
    if (link) {
      await navigator.clipboard.writeText(link);
      toast({
        title: 'Success',
        description: `Partner link for "${productTitle}" copied to clipboard!`
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to generate partner link',
        variant: 'destructive'
      });
    }
  };

  const handleShare = async (productId: string, productTitle: string) => {
    const link = await generatePartnerLink(productId);
    if (link && navigator.share) {
      try {
        await navigator.share({
          title: productTitle,
          text: `Check out this amazing product: ${productTitle}`,
          url: link
        });
      } catch (error) {
        // Fallback to copy
        await handleCopyLink(productId, productTitle);
      }
    } else {
      await handleCopyLink(productId, productTitle);
    }
  };

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const getCommissionAmount = (price: number, rate: number) => {
    return (price * rate / 100).toFixed(2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'out_of_stock': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-t-lg"></div>
            <CardContent className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Partner Products</h2>
          <p className="text-gray-600">Promote high-quality products and earn commissions</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {products.length} products available
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortOption} onValueChange={setSortOption}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="commission">Highest Commission</SelectItem>
            <SelectItem value="performance">Best Performance</SelectItem>
            <SelectItem value="price">Price: Low to High</SelectItem>
            <SelectItem value="newest">Newest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <Alert>
          <Package className="h-4 w-4" />
          <AlertDescription>
            No products found matching your criteria. Try adjusting your filters.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="group hover:shadow-lg transition-shadow">
              {/* Product Image */}
              <div className="relative h-48 overflow-hidden rounded-t-lg">
                <img 
                  src={product.image} 
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                {product.featured && (
                  <Badge className="absolute top-2 left-2 bg-yellow-500 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                )}
                <Badge className={`absolute top-2 right-2 ${getStatusColor(product.status)}`}>
                  {product.status.replace('_', ' ')}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute bottom-2 right-2 bg-white/80 hover:bg-white"
                  onClick={() => toggleFavorite(product.id)}
                >
                  <Heart 
                    className={`h-4 w-4 ${favorites.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
                  />
                </Button>
              </div>

              <CardContent className="p-4 space-y-3">
                {/* Product Info */}
                <div>
                  <h3 className="font-semibold text-gray-900 line-clamp-2">{product.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">{product.description}</p>
                </div>

                {/* Category & Supplier */}
                <div className="flex items-center justify-between text-xs">
                  <Badge variant="outline">{product.category}</Badge>
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    <span>{product.supplier.rating}</span>
                    <span className="text-gray-500">• {product.supplier.name}</span>
                  </div>
                </div>

                {/* Pricing & Commission */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-lg font-bold text-gray-900">${product.sellingPrice}</span>
                      <span className="text-sm text-gray-500 ml-2">({product.marginRate}% margin)</span>
                    </div>
                  </div>
                  <div className="bg-green-50 p-2 rounded flex items-center justify-between">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                      <span className="text-sm font-medium text-green-800">
                        ${getCommissionAmount(product.sellingPrice, product.commissionRate)} commission
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {product.commissionRate}%
                    </Badge>
                  </div>
                </div>

                {/* Performance Stats */}
                {product.performance && (
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex justify-between">
                      <span className="flex items-center">
                        <Eye className="h-3 w-3 mr-1" />
                        {product.performance.views} views
                      </span>
                      <span className="flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {product.performance.conversionRate}% conversion
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="font-medium text-green-600">
                        ${product.performance.totalEarnings} earned by partners
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <Button 
                    onClick={() => handleCopyLink(product.id, product.title)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    <Link className="h-4 w-4 mr-1" />
                    Get Link
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShare(product.id, product.title)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`/product/${product.id}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                {/* Stock Info */}
                {product.stockQuantity < 10 && product.stockQuantity > 0 && (
                  <Alert className="mt-2">
                    <AlertDescription className="text-xs">
                      Only {product.stockQuantity} left in stock!
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Load More */}
      {products.length >= limit && (
        <div className="text-center">
          <Button variant="outline" onClick={() => setLimit(prev => prev + 12)}>
            Load More Products
          </Button>
        </div>
      )}
    </div>
  );
};

export default PartnerProducts;