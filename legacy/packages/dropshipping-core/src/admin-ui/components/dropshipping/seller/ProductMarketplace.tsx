import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Search,
  Filter,
  ShoppingCart,
  Eye,
  Star,
  TrendingUp,
  Package,
  AlertCircle,
  CheckCircle,
  Plus,
  Minus,
  Heart,
  Share2,
  Shield,
  Zap,
  Award
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SupplierProduct {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierRating: number;
  supplierVerified: boolean;
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  images: string[];
  supplierPrice: number;
  msrp: number;
  minOrderQuantity: number;
  availableQuantity: number;
  shippingDays: number;
  features: string[];
  specifications: Record<string, string>;
  totalSold: number;
  averageRating: number;
  reviewCount: number;
  profitMargin: number;
  trending: boolean;
  bestseller: boolean;
}

interface ImportSettings {
  markup: number;
  autoSync: boolean;
  syncInventory: boolean;
  syncPricing: boolean;
  customTitle?: string;
  customDescription?: string;
  selectedVariations?: string[];
}

const ProductMarketplace: React.FC = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange] = useState([0, 1000]);
  const [selectedSuppliers] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('recommended');
  useState<'grid' | 'list'>('grid');
  const [selectedProduct, setSelectedProduct] = useState<SupplierProduct | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importSettings, setImportSettings] = useState<ImportSettings>({
    markup: 30,
    autoSync: true,
    syncInventory: true,
    syncPricing: false
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [importedProducts, setImportedProducts] = useState<string[]>([]);

  useEffect(() => {
    fetchMarketplaceProducts();
  }, [selectedCategory, sortBy, priceRange]);

  const fetchMarketplaceProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        category: selectedCategory,
        sortBy,
        minPrice: priceRange[0].toString(),
        maxPrice: priceRange[1].toString()
      });

      const response = await fetch(`/api/v1/dropshipping/seller/marketplace?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      // Error log removed
      toast({
        title: 'Error',
        description: 'Failed to fetch marketplace products',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportProduct = async (productId: string) => {
    try {
      const response = await fetch('/api/v1/dropshipping/seller/products/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          productId,
          settings: importSettings
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Product imported successfully'
        });
        setImportedProducts([...importedProducts, productId]);
        setShowImportDialog(false);
        setSelectedProduct(null);
      }
    } catch (error) {
      // Error log removed
      toast({
        title: 'Error',
        description: 'Failed to import product',
        variant: 'destructive'
      });
    }
  };

  // handleBulkImport function will be implemented when needed

  const toggleFavorite = (productId: string) => {
    if (favorites.includes(productId)) {
      setFavorites(favorites.filter(id => id !== productId));
    } else {
      setFavorites([...favorites, productId]);
    }
  };

  const calculateSellingPrice = (supplierPrice: number) => {
    return supplierPrice * (1 + importSettings.markup / 100);
  };

  const calculateProfit = (supplierPrice: number) => {
    const sellingPrice = calculateSellingPrice(supplierPrice);
    return sellingPrice - supplierPrice;
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSuppliers = selectedSuppliers.length === 0 || 
                             selectedSuppliers.includes(product.supplierId);
    
    return matchesSearch && matchesSuppliers;
  });

  // Product Details Dialog
  const ProductDetailsDialog = () => {
    if (!selectedProduct) return null;

    return (
      <Dialog open={showProductDetails} onOpenChange={setShowProductDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduct.name}</DialogTitle>
            <DialogDescription>
              SKU: {selectedProduct.sku} | Supplier: {selectedProduct.supplierName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Image Gallery */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {selectedProduct.images[0] ? (
                    <img 
                      src={selectedProduct.images[0]} 
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-20 w-20 text-gray-400" />
                    </div>
                  )}
                </div>
                {selectedProduct.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {selectedProduct.images.slice(1, 5).map((image, index) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img 
                          src={image} 
                          alt={`${selectedProduct.name} ${index + 2}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Supplier Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Supplier Information</CardTitle>
                      {selectedProduct.supplierVerified && (
                        <Badge variant="default">
                          <Shield className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Supplier</span>
                      <span className="font-medium">{selectedProduct.supplierName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Rating</span>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="ml-1 font-medium">{selectedProduct.supplierRating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Sold</span>
                      <span className="font-medium">{selectedProduct.totalSold.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Shipping Time</span>
                      <span className="font-medium">{selectedProduct.shippingDays} days</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Pricing & Profit</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Supplier Price</span>
                        <span className="font-medium">${selectedProduct.supplierPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">MSRP</span>
                        <span className="text-muted-foreground">${selectedProduct.msrp.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Your Markup</span>
                        <div className="flex items-center space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setImportSettings({
                              ...importSettings,
                              markup: Math.max(0, importSettings.markup - 5)
                            })}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-12 text-center font-medium">{importSettings.markup}%</span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setImportSettings({
                              ...importSettings,
                              markup: importSettings.markup + 5
                            })}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between text-green-600 font-medium">
                        <span className="text-sm">Your Selling Price</span>
                        <span>${calculateSellingPrice(selectedProduct.supplierPrice).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-blue-600 font-medium">
                        <span className="text-sm">Profit per Unit</span>
                        <span>${calculateProfit(selectedProduct.supplierPrice).toFixed(2)}</span>
                      </div>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Estimated profit margin: {((calculateProfit(selectedProduct.supplierPrice) / calculateSellingPrice(selectedProduct.supplierPrice)) * 100).toFixed(1)}%
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                {/* Stock Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Inventory Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Available Stock</span>
                        <Badge variant={selectedProduct.availableQuantity > 100 ? 'default' : 'secondary'}>
                          {selectedProduct.availableQuantity} units
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Min Order Quantity</span>
                        <span className="font-medium">{selectedProduct.minOrderQuantity} units</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Product Details Tabs */}
            <Tabs defaultValue="description">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="specifications">Specifications</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  {selectedProduct.description}
                </p>
              </TabsContent>

              <TabsContent value="features" className="mt-4">
                <ul className="space-y-2">
                  {selectedProduct.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </TabsContent>

              <TabsContent value="specifications" className="mt-4">
                <div className="space-y-2">
                  {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">{key}</span>
                      <span className="text-sm font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-5 w-5 ${star <= selectedProduct.averageRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">
                      {selectedProduct.averageRating.toFixed(1)} out of 5
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({selectedProduct.reviewCount} reviews)
                    </span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex justify-between">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => toggleFavorite(selectedProduct.id)}
              >
                <Heart className={`h-4 w-4 mr-2 ${favorites.includes(selectedProduct.id) ? 'fill-current text-red-500' : ''}`} />
                {favorites.includes(selectedProduct.id) ? 'Saved' : 'Save'}
              </Button>
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowProductDetails(false)}>
                Close
              </Button>
              <Button 
                onClick={() => {
                  setShowProductDetails(false);
                  setShowImportDialog(true);
                }}
                disabled={importedProducts.includes(selectedProduct.id)}
              >
                {importedProducts.includes(selectedProduct.id) ? 'Already Imported' : 'Import to Store'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Import Settings Dialog
  const ImportSettingsDialog = () => {
    if (!selectedProduct) return null;

    return (
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Product Settings</DialogTitle>
            <DialogDescription>
              Configure how you want to import and sell this product
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Title</label>
              <Input
                value={importSettings.customTitle || selectedProduct.name}
                onChange={(e) => setImportSettings({
                  ...importSettings,
                  customTitle: e.target.value
                })}
                placeholder="Custom product title"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Markup Percentage</label>
              <div className="flex items-center space-x-4">
                <Slider
                  value={[importSettings.markup]}
                  onValueChange={(value) => setImportSettings({
                    ...importSettings,
                    markup: value[0]
                  })}
                  min={0}
                  max={200}
                  step={5}
                  className="flex-1"
                />
                <span className="w-16 text-right font-medium">{importSettings.markup}%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Selling price: ${calculateSellingPrice(selectedProduct.supplierPrice).toFixed(2)} 
                (Profit: ${calculateProfit(selectedProduct.supplierPrice).toFixed(2)})
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Sync Settings</label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoSync"
                  checked={importSettings.autoSync}
                  onCheckedChange={(checked) => setImportSettings({
                    ...importSettings,
                    autoSync: checked as boolean
                  })}
                />
                <label htmlFor="autoSync" className="text-sm">
                  Auto-sync product updates from supplier
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="syncInventory"
                  checked={importSettings.syncInventory}
                  onCheckedChange={(checked) => setImportSettings({
                    ...importSettings,
                    syncInventory: checked as boolean
                  })}
                />
                <label htmlFor="syncInventory" className="text-sm">
                  Sync inventory levels in real-time
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="syncPricing"
                  checked={importSettings.syncPricing}
                  onCheckedChange={(checked) => setImportSettings({
                    ...importSettings,
                    syncPricing: checked as boolean
                  })}
                />
                <label htmlFor="syncPricing" className="text-sm">
                  Sync supplier price changes
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleImportProduct(selectedProduct.id)}>
              Import Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Product Marketplace</h2>
          <p className="text-muted-foreground">
            Browse and import products from verified suppliers
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Heart className="mr-2 h-4 w-4" />
            Saved ({favorites.length})
          </Button>
          <Button variant="outline">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Imported ({importedProducts.length})
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products, suppliers, or SKUs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="fashion">Fashion</SelectItem>
                <SelectItem value="home">Home & Garden</SelectItem>
                <SelectItem value="beauty">Beauty</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="toys">Toys</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="bestselling">Best Selling</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="profit">Highest Profit</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Badge variant="secondary" className="cursor-pointer">
              <Zap className="h-3 w-3 mr-1" />
              Fast Shipping
            </Badge>
            <Badge variant="secondary" className="cursor-pointer">
              <Shield className="h-3 w-3 mr-1" />
              Verified Suppliers
            </Badge>
            <Badge variant="secondary" className="cursor-pointer">
              <TrendingUp className="h-3 w-3 mr-1" />
              Trending
            </Badge>
            <Badge variant="secondary" className="cursor-pointer">
              <Award className="h-3 w-3 mr-1" />
              Best Sellers
            </Badge>
            <Badge variant="secondary" className="cursor-pointer">
              High Profit Margin
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-3">Loading marketplace products...</span>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters or search terms
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square relative bg-gray-100">
                {product.images[0] ? (
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                
                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {product.trending && (
                    <Badge variant="destructive">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Trending
                    </Badge>
                  )}
                  {product.bestseller && (
                    <Badge variant="default">
                      Best Seller
                    </Badge>
                  )}
                </div>

                {/* Favorite Button */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/80 hover:bg-white"
                  onClick={() => toggleFavorite(product.id)}
                >
                  <Heart className={`h-4 w-4 ${favorites.includes(product.id) ? 'fill-current text-red-500' : ''}`} />
                </Button>
              </div>

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm line-clamp-2">
                    {product.name}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs">
                  <div className="flex items-center justify-between">
                    <span>{product.supplierName}</span>
                    {product.supplierVerified && (
                      <Shield className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cost</span>
                    <span className="font-medium">${product.supplierPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Profit</span>
                    <span className="text-green-600 font-medium">
                      ${calculateProfit(product.supplierPrice).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center">
                      <Star className="h-3 w-3 text-yellow-400 fill-current mr-1" />
                      <span>{product.averageRating.toFixed(1)}</span>
                    </div>
                    <span>{product.totalSold.toLocaleString()} sold</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-0">
                <div className="flex space-x-2 w-full">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowProductDetails(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button 
                    size="sm"
                    className="flex-1"
                    disabled={importedProducts.includes(product.id)}
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowImportDialog(true);
                    }}
                  >
                    {importedProducts.includes(product.id) ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Imported
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Import
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <ProductDetailsDialog />
      <ImportSettingsDialog />
    </div>
  );
};

export default ProductMarketplace;