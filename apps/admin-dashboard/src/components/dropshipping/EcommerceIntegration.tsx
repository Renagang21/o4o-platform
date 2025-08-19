import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  ShoppingCart,
  Package,
  Truck,
  Users,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Link,
  Settings,
  Clock,
  Database,
  Cloud,
  Zap
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface IntegrationStatus {
  products: {
    synced: number;
    pending: number;
    failed: number;
    lastSync: string;
  };
  orders: {
    total: number;
    processing: number;
    shipped: number;
    delivered: number;
  };
  inventory: {
    autoSync: boolean;
    syncInterval: number;
    lastUpdate: string;
    outOfStock: number;
    lowStock: number;
  };
  suppliers: {
    active: number;
    verified: number;
    totalProducts: number;
  };
  sellers: {
    active: number;
    totalListings: number;
    revenue: number;
  };
}

interface SyncLog {
  id: string;
  type: 'product' | 'order' | 'inventory' | 'price';
  action: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
  details?: any;
}

const EcommerceIntegration: React.FC = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [settings, setSettings] = useState({
    autoSyncProducts: true,
    autoSyncInventory: true,
    autoSyncPrices: true,
    autoProcessOrders: true,
    syncInterval: 15, // minutes
    lowStockThreshold: 10,
    priceMarkupDefault: 30 // percentage
  });

  useEffect(() => {
    fetchIntegrationStatus();
    fetchSyncLogs();
  }, []);

  const fetchIntegrationStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/dropshipping/integration/status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching integration status:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch integration status',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncLogs = async () => {
    try {
      const response = await fetch('/api/v1/dropshipping/integration/logs', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSyncLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching sync logs:', error);
    }
  };

  const handleFullSync = async (type: string) => {
    try {
      setSyncing(true);
      const response = await fetch(`/api/v1/dropshipping/integration/sync/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `${type} synchronization started`
        });
        await fetchIntegrationStatus();
        await fetchSyncLogs();
      }
    } catch (error) {
      console.error(`Error syncing ${type}:`, error);
      toast({
        title: 'Error',
        description: `Failed to sync ${type}`,
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSettingChange = async (setting: string, value: any) => {
    const newSettings = { ...settings, [setting]: value };
    setSettings(newSettings);

    try {
      const response = await fetch('/api/v1/dropshipping/integration/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newSettings)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Settings updated successfully'
        });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading integration status...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">E-commerce Integration</h2>
          <p className="text-muted-foreground">
            Manage dropshipping integration with your e-commerce platform
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => fetchIntegrationStatus()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => handleFullSync('all')} disabled={syncing}>
            <Cloud className="mr-2 h-4 w-4" />
            Full Sync
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products Synced</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.products.synced || 0}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span className="text-yellow-600">{status?.products.pending || 0} pending</span>
              {status?.products.failed && status.products.failed > 0 && (
                <span className="ml-2 text-red-600">{status.products.failed} failed</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.orders.processing || 0}</div>
            <p className="text-xs text-muted-foreground">
              {status?.orders.shipped || 0} shipped
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.suppliers.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              {status?.suppliers.verified || 0} verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(status?.inventory.outOfStock || 0) + (status?.inventory.lowStock || 0)}
            </div>
            <div className="flex items-center text-xs">
              <span className="text-red-600">{status?.inventory.outOfStock || 0} out</span>
              <span className="ml-2 text-yellow-600">{status?.inventory.lowStock || 0} low</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Flow</CardTitle>
              <CardDescription>
                Real-time data flow between dropshipping and e-commerce
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Product Flow */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Product Sync</p>
                      <p className="text-sm text-muted-foreground">
                        Supplier products → E-commerce catalog
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={settings.autoSyncProducts ? 'default' : 'secondary'}>
                      {settings.autoSyncProducts ? 'Auto' : 'Manual'}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => handleFullSync('products')}>
                      Sync Now
                    </Button>
                  </div>
                </div>

                {/* Order Flow */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <ShoppingCart className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Order Processing</p>
                      <p className="text-sm text-muted-foreground">
                        Customer order → Supplier fulfillment
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={settings.autoProcessOrders ? 'default' : 'secondary'}>
                      {settings.autoProcessOrders ? 'Automated' : 'Manual'}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => handleFullSync('orders')}>
                      Process
                    </Button>
                  </div>
                </div>

                {/* Inventory Flow */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Database className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Inventory Sync</p>
                      <p className="text-sm text-muted-foreground">
                        Real-time stock levels across platforms
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={settings.autoSyncInventory ? 'default' : 'secondary'}>
                      Every {settings.syncInterval}min
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => handleFullSync('inventory')}>
                      Update
                    </Button>
                  </div>
                </div>

                {/* Shipping Flow */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Truck className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium">Shipping Updates</p>
                      <p className="text-sm text-muted-foreground">
                        Tracking info → Customer notifications
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default">Real-time</Badge>
                    <Button size="sm" variant="outline">
                      View Shipments
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Supplier Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  View All Suppliers ({status?.suppliers.active})
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Pending Verifications
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Package className="mr-2 h-4 w-4" />
                  Product Approvals
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline">
                  <Clock className="mr-2 h-4 w-4" />
                  Pending Orders ({status?.orders.processing})
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Truck className="mr-2 h-4 w-4" />
                  In Transit ({status?.orders.shipped})
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Problem Orders
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Product Synchronization</CardTitle>
              <CardDescription>
                Manage product catalog integration between suppliers and e-commerce
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Auto-sync products</p>
                    <p className="text-xs text-muted-foreground">
                      Automatically import new supplier products
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoSyncProducts}
                    onCheckedChange={(checked) => handleSettingChange('autoSyncProducts', checked)}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Auto-update prices</p>
                    <p className="text-xs text-muted-foreground">
                      Sync supplier price changes with markup
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoSyncPrices}
                    onCheckedChange={(checked) => handleSettingChange('autoSyncPrices', checked)}
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Product Mapping</AlertTitle>
                  <AlertDescription>
                    {status?.products.synced} products are mapped to e-commerce catalog.
                    {status?.products.pending && status.products.pending > 0 && ` ${status.products.pending} products pending review.`}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Button className="w-full" variant="outline" onClick={() => handleFullSync('products')}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync All Products
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Link className="mr-2 h-4 w-4" />
                    Map Unmapped Products
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Bulk Edit Mappings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order Processing</CardTitle>
              <CardDescription>
                Automated order routing and fulfillment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Auto-process orders</p>
                    <p className="text-xs text-muted-foreground">
                      Automatically send orders to suppliers
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoProcessOrders}
                    onCheckedChange={(checked) => handleSettingChange('autoProcessOrders', checked)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Processing</p>
                    <p className="text-2xl font-bold">{status?.orders.processing}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Shipped</p>
                    <p className="text-2xl font-bold">{status?.orders.shipped}</p>
                  </div>
                </div>

                <Button className="w-full" onClick={() => handleFullSync('orders')}>
                  <Zap className="mr-2 h-4 w-4" />
                  Process Pending Orders
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
              <CardDescription>
                Configure synchronization and automation settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Sync Interval (minutes)</Label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="5"
                      max="60"
                      value={settings.syncInterval}
                      onChange={(e) => handleSettingChange('syncInterval', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-12 text-right">{settings.syncInterval}m</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Low Stock Threshold</Label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={settings.lowStockThreshold}
                      onChange={(e) => handleSettingChange('lowStockThreshold', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-12 text-right">{settings.lowStockThreshold}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Default Price Markup (%)</Label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.priceMarkupDefault}
                      onChange={(e) => handleSettingChange('priceMarkupDefault', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-12 text-right">{settings.priceMarkupDefault}%</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button className="w-full" variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Advanced Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Synchronization Logs</CardTitle>
              <CardDescription>
                Recent sync activities and errors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{getStatusIcon(log.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.type}</Badge>
                      </TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell className="max-w-md truncate">{log.message}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EcommerceIntegration;