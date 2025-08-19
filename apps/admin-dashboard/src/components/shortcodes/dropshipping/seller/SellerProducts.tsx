import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Package,
  DollarSign,
  TrendingUp,
  Settings,
  RefreshCw,
  AlertCircle,
  Link,
  BarChart3,
  ShoppingCart,
  Star,
  PauseCircle,
  PlayCircle,
  Eye
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface SellerProduct {
  id: string;
  productId: string; // Original supplier product ID
  supplierId: string;
  supplierName: string;
  sku: string;
  customSku?: string;
  name: string;
  customName?: string;
  description: string;
  customDescription?: string;
  images: string[];
  category: string;
  supplierPrice: number;
  sellingPrice: number;
  markup: number;
  profit: number;
  profitMargin: number;
  stock: number;
  reserved: number;
  available: number;
  status: 'active' | 'paused' | 'out_of_stock';
  syncSettings: {
    autoSync: boolean;
    syncInventory: boolean;
    syncPricing: boolean;
    lastSynced?: string;
  };
  performance: {
    views: number;
    clicks: number;
    orders: number;
    revenue: number;
    conversionRate: number;
    averageRating: number;
    reviewCount: number;
  };
  channels: string[]; // Where it's listed
  isPromoted: boolean;
  promotionEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface PricingStrategy {
  type: 'fixed_markup' | 'percentage_markup' | 'competitive' | 'dynamic';
  value: number;
  minPrice?: number;
  maxPrice?: number;
  competitorTracking?: boolean;
}

const SellerProducts: React.FC = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<SellerProduct | null>(null);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [pricingStrategy, setPricingStrategy] = useState<PricingStrategy>({
    type: 'percentage_markup',
    value: 30
  });

  useEffect(() => {
    fetchSellerProducts();
  }, [selectedTab]);

  const fetchSellerProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/dropshipping/seller/products?status=${selectedTab}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching seller products:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch products',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePricing = async (productId: string, newPrice: number) => {
    try {
      const response = await fetch(`/api/v1/dropshipping/seller/products/${productId}/pricing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ sellingPrice: newPrice })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Pricing updated successfully'
        });
        fetchSellerProducts();
      }
    } catch (error) {
      console.error('Error updating pricing:', error);
      toast({
        title: 'Error',
        description: 'Failed to update pricing',
        variant: 'destructive'
      });
    }
  };

  const handleBulkPricingUpdate = async () => {
    if (selectedProducts.length === 0) {
      toast({
        title: 'Warning',
        description: 'Please select products to update',
        variant: 'default'
      });
      return;
    }

    try {
      const response = await fetch('/api/v1/dropshipping/seller/products/bulk-pricing', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          productIds: selectedProducts,
          strategy: pricingStrategy
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Updated pricing for ${selectedProducts.length} products`
        });
        setSelectedProducts([]);
        setBulkEditMode(false);
        fetchSellerProducts();
      }
    } catch (error) {
      console.error('Error bulk updating pricing:', error);
      toast({
        title: 'Error',
        description: 'Failed to update pricing',
        variant: 'destructive'
      });
    }
  };

  const handleSyncProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/v1/dropshipping/seller/products/${productId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Product synced with supplier'
        });
        fetchSellerProducts();
      }
    } catch (error) {
      console.error('Error syncing product:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync product',
        variant: 'destructive'
      });
    }
  };

  const handleToggleStatus = async (productId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    
    try {
      const response = await fetch(`/api/v1/dropshipping/seller/products/${productId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Product ${newStatus === 'active' ? 'activated' : 'paused'}`
        });
        fetchSellerProducts();
      }
    } catch (error) {
      console.error('Error toggling product status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product status',
        variant: 'destructive'
      });
    }
  };

  // handleDeleteProduct function will be implemented later

  const getProductUrl = (product: SellerProduct) => {
    return `https://mystore.com/products/${product.customSku || product.sku}`;
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.customName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Pricing Dialog
  const PricingDialog = () => {
    if (!selectedProduct) return null;

    const [newPrice, setNewPrice] = useState(selectedProduct.sellingPrice);
    const newProfit = newPrice - selectedProduct.supplierPrice;
    const newMargin = (newProfit / newPrice) * 100;

    return (
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Pricing</DialogTitle>
            <DialogDescription>
              {selectedProduct.customName || selectedProduct.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Supplier Price (Cost)</Label>
              <div className="text-2xl font-bold">${selectedProduct.supplierPrice.toFixed(2)}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Your Selling Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="sellingPrice"
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(parseFloat(e.target.value))}
                  className="pl-10"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Profit per Unit</p>
                <p className={`text-lg font-bold ${newProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${newProfit.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profit Margin</p>
                <p className={`text-lg font-bold ${newMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {newMargin.toFixed(1)}%
                </p>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Recommended price range: ${(selectedProduct.supplierPrice * 1.2).toFixed(2)} - ${(selectedProduct.supplierPrice * 2).toFixed(2)}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPricingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              handleUpdatePricing(selectedProduct.id, newPrice);
              setShowPricingDialog(false);
            }}>
              Update Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Settings Dialog
  const SettingsDialog = () => {
    if (!selectedProduct) return null;

    const [syncSettings, setSyncSettings] = useState(selectedProduct.syncSettings);

    return (
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Product Settings</DialogTitle>
            <DialogDescription>
              {selectedProduct.customName || selectedProduct.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customName">Custom Product Name</Label>
              <Input
                id="customName"
                value={selectedProduct.customName || selectedProduct.name}
                placeholder="Override supplier's product name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customSku">Custom SKU</Label>
              <Input
                id="customSku"
                value={selectedProduct.customSku || ''}
                placeholder="Your internal SKU"
              />
            </div>

            <div className="space-y-3">
              <Label>Sync Settings</Label>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-normal">Auto Sync</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically sync with supplier updates
                  </p>
                </div>
                <Switch
                  checked={syncSettings.autoSync}
                  onCheckedChange={(checked) => setSyncSettings({
                    ...syncSettings,
                    autoSync: checked
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-normal">Sync Inventory</Label>
                  <p className="text-xs text-muted-foreground">
                    Keep stock levels synchronized
                  </p>
                </div>
                <Switch
                  checked={syncSettings.syncInventory}
                  onCheckedChange={(checked) => setSyncSettings({
                    ...syncSettings,
                    syncInventory: checked
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-normal">Sync Pricing</Label>
                  <p className="text-xs text-muted-foreground">
                    Update prices when supplier changes
                  </p>
                </div>
                <Switch
                  checked={syncSettings.syncPricing}
                  onCheckedChange={(checked) => setSyncSettings({
                    ...syncSettings,
                    syncPricing: checked
                  })}
                />
              </div>
            </div>

            {syncSettings.lastSynced && (
              <Alert>
                <RefreshCw className="h-4 w-4" />
                <AlertDescription>
                  Last synced: {new Date(syncSettings.lastSynced).toLocaleString()}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowSettingsDialog(false)}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Products</h2>
          <p className="text-muted-foreground">
            Manage your imported products and pricing
          </p>
        </div>
        <div className="flex space-x-2">
          {bulkEditMode ? (
            <>
              <Button variant="outline" onClick={() => {
                setBulkEditMode(false);
                setSelectedProducts([]);
              }}>
                Cancel
              </Button>
              <Button onClick={handleBulkPricingUpdate}>
                Update {selectedProducts.length} Products
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setBulkEditMode(true)}>
                Bulk Edit
              </Button>
              <Button>
                <Package className="mr-2 h-4 w-4" />
                Import Products
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.filter(p => p.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {products.filter(p => p.status === 'paused').length} paused
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${products.reduce((sum, p) => sum + p.performance.revenue, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Profit Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(products.reduce((sum, p) => sum + p.profitMargin, 0) / products.length || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(products.reduce((sum, p) => sum + p.performance.conversionRate, 0) / products.length || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average conversion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Edit Bar */}
      {bulkEditMode && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Badge variant="secondary">
                  {selectedProducts.length} selected
                </Badge>
                <Select value={pricingStrategy.type} onValueChange={(value: any) => 
                  setPricingStrategy({ ...pricingStrategy, type: value })
                }>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_markup">Fixed Markup</SelectItem>
                    <SelectItem value="percentage_markup">Percentage Markup</SelectItem>
                    <SelectItem value="competitive">Competitive Pricing</SelectItem>
                    <SelectItem value="dynamic">Dynamic Pricing</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={pricingStrategy.value}
                  onChange={(e) => setPricingStrategy({
                    ...pricingStrategy,
                    value: parseFloat(e.target.value)
                  })}
                  className="w-24"
                  placeholder="Value"
                />
                {pricingStrategy.type === 'percentage_markup' && (
                  <span className="text-sm text-muted-foreground">%</span>
                )}
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  Pause Selected
                </Button>
                <Button variant="outline" size="sm">
                  Sync Selected
                </Button>
                <Button variant="destructive" size="sm">
                  Remove Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Product Inventory</CardTitle>
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="all">All Products</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="paused">Paused</TabsTrigger>
              <TabsTrigger value="out_of_stock">Out of Stock</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab}>
              <Table>
                <TableHeader>
                  <TableRow>
                    {bulkEditMode && (
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts(filteredProducts.map(p => p.id));
                            } else {
                              setSelectedProducts([]);
                            }
                          }}
                        />
                      </TableHead>
                    )}
                    <TableHead>Product</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={bulkEditMode ? 8 : 7} className="text-center py-8">
                        No products found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        {bulkEditMode && (
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(product.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProducts([...selectedProducts, product.id]);
                                } else {
                                  setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                                }
                              }}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {product.images[0] ? (
                              <img 
                                src={product.images[0]} 
                                alt={product.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium line-clamp-1">
                                {product.customName || product.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                SKU: {product.customSku || product.sku}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{product.supplierName}</p>
                            {product.syncSettings.autoSync && (
                              <Badge variant="outline" className="text-xs">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Auto-sync
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">${product.sellingPrice.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              Cost: ${product.supplierPrice.toFixed(2)}
                            </p>
                            <p className="text-xs text-green-600">
                              Profit: ${product.profit.toFixed(2)} ({product.profitMargin.toFixed(1)}%)
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className={`font-medium ${product.available < 10 ? 'text-yellow-600' : ''}`}>
                              {product.available} available
                            </p>
                            {product.reserved > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {product.reserved} reserved
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <ShoppingCart className="h-3 w-3" />
                              <span className="text-sm">{product.performance.orders} orders</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Eye className="h-3 w-3" />
                              <span className="text-sm">{product.performance.views} views</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span className="text-sm">
                                {product.performance.averageRating.toFixed(1)} ({product.performance.reviewCount})
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            product.status === 'active' ? 'default' :
                            product.status === 'paused' ? 'secondary' :
                            'destructive'
                          }>
                            {product.status === 'active' && <PlayCircle className="h-3 w-3 mr-1" />}
                            {product.status === 'paused' && <PauseCircle className="h-3 w-3 mr-1" />}
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowPricingDialog(true);
                              }}
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSyncProduct(product.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowSettingsDialog(true);
                              }}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleStatus(product.id, product.status)}
                            >
                              {product.status === 'active' ? 
                                <PauseCircle className="h-4 w-4" /> : 
                                <PlayCircle className="h-4 w-4" />
                              }
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const url = getProductUrl(product);
                                navigator.clipboard.writeText(url);
                                toast({
                                  title: 'Link copied',
                                  description: 'Product URL copied to clipboard'
                                });
                              }}
                            >
                              <Link className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <PricingDialog />
      <SettingsDialog />
    </div>
  );
};

export default SellerProducts;