import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
// Chart components will be available when recharts is installed
import {
  Package,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  reorderPoint: number;
  reorderQuantity: number;
  averageDailySales: number;
  daysUntilStockout: number;
  lastRestocked: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
}

interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  overstockItems: number;
  turnoverRate: number;
  averageStockLevel: number;
  projectedStockouts: number;
}

const InventoryDashboard: React.FC = () => {
  const { toast } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    fetchInventoryData();
  }, [selectedFilter]);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/dropshipping/supplier/inventory', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInventory(data.inventory || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      // Error log removed
      toast({
        title: 'Error',
        description: 'Failed to fetch inventory data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestockItem = async (itemId: string, quantity: number) => {
    try {
      const response = await fetch(`/api/v1/dropshipping/supplier/inventory/${itemId}/restock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ quantity })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Item restocked successfully'
        });
        fetchInventoryData();
      }
    } catch (error) {
      // Error log removed
      toast({
        title: 'Error',
        description: 'Failed to restock item',
        variant: 'destructive'
      });
    }
  };

  const handleBulkRestock = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: 'Warning',
        description: 'Please select items to restock',
        variant: 'default'
      });
      return;
    }

    try {
      const response = await fetch('/api/v1/dropshipping/supplier/inventory/bulk-restock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ itemIds: selectedItems })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${selectedItems.length} items restocked successfully`
        });
        setSelectedItems([]);
        fetchInventoryData();
      }
    } catch (error) {
      // Error log removed
      toast({
        title: 'Error',
        description: 'Failed to restock items',
        variant: 'destructive'
      });
    }
  };

  // Chart data will be available when recharts is installed

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || item.status === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'success';
      case 'low_stock': return 'warning';
      case 'out_of_stock': return 'destructive';
      case 'overstock': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_stock': return <CheckCircle2 className="h-4 w-4" />;
      case 'low_stock': return <AlertTriangle className="h-4 w-4" />;
      case 'out_of_stock': return <XCircle className="h-4 w-4" />;
      case 'overstock': return <Package className="h-4 w-4" />;
      default: return null;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading inventory data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and manage your product inventory
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import Stock
          </Button>
          <Button onClick={() => fetchInventoryData()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">
              ${stats?.totalValue.toLocaleString() || 0} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.lowStockItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.outOfStockItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Lost sales opportunity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turnover Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.turnoverRate || 0}x</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock Level by Category</CardTitle>
            <CardDescription>Current inventory distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Chart will be available when recharts is installed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Trend Analysis</CardTitle>
            <CardDescription>Stock levels vs sales over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Chart will be available when recharts is installed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {stats && stats.projectedStockouts > 0 && (
        <div className="border border-yellow-200 bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              <strong>{stats.projectedStockouts} products</strong> are projected to go out of stock within the next 7 days based on current sales velocity.
            </p>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>Detailed view of all inventory items</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="overstock">Overstock</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedItems.length > 0 && (
            <div className="mb-4 flex items-center gap-2">
              <Badge variant="secondary">
                {selectedItems.length} selected
              </Badge>
              <Button size="sm" onClick={handleBulkRestock}>
                Bulk Restock
              </Button>
              <Button size="sm" variant="outline">
                Adjust Thresholds
              </Button>
            </div>
          )}
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(filteredInventory.map(item => item.id));
                      } else {
                        setSelectedItems([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Days Until Stockout</TableHead>
                <TableHead>Reorder Point</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    No inventory items found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, item.id]);
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.category}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min((item.quantity / (item.lowStockThreshold * 3)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{item.quantity}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.available}</p>
                        {item.reserved > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {item.reserved} reserved
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(item.status) as any}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(item.status)}
                          {item.status.replace('_', ' ')}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.daysUntilStockout > 0 ? (
                        <span className={item.daysUntilStockout <= 7 ? 'text-yellow-600 font-medium' : ''}>
                          {item.daysUntilStockout} days
                        </span>
                      ) : (
                        <span className="text-red-600 font-medium">Out of stock</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.reorderPoint}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty: {item.reorderQuantity}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestockItem(item.id, item.reorderQuantity)}
                      >
                        Restock
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryDashboard;