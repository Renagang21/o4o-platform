import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Printer,
  DollarSign,
  User,
  Phone,
  Mail,
  Copy,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
// import { format } from 'date-fns';

interface OrderItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Order {
  id: string;
  orderNumber: string;
  sellerId: string;
  sellerName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  shippingMethod: string;
  trackingNumber?: string;
  carrier?: string;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

interface OrderStats {
  pendingOrders: number;
  processingOrders: number;
  shippedToday: number;
  totalRevenue: number;
  averageOrderValue: number;
  returnRate: number;
}

const OrderManagement: React.FC = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showShippingDialog, setShowShippingDialog] = useState(false);
  const [shippingData, setShippingData] = useState({
    trackingNumber: '',
    carrier: '',
    notes: ''
  });

  useEffect(() => {
    fetchOrders();
  }, [selectedTab]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/dropshipping/supplier/orders?status=${selectedTab}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      // Error log removed
      toast({
        title: 'Error',
        description: 'Failed to fetch orders',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/v1/dropshipping/supplier/orders/${orderId}/status`, {
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
          description: 'Order status updated successfully'
        });
        fetchOrders();
      }
    } catch (error) {
      // Error log removed
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive'
      });
    }
  };

  const handleShipOrder = async () => {
    if (!selectedOrder) return;

    try {
      const response = await fetch(`/api/v1/dropshipping/supplier/orders/${selectedOrder.id}/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(shippingData)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Order shipped successfully'
        });
        setShowShippingDialog(false);
        setShippingData({ trackingNumber: '', carrier: '', notes: '' });
        fetchOrders();
      }
    } catch (error) {
      // Error log removed
      toast({
        title: 'Error',
        description: 'Failed to ship order',
        variant: 'destructive'
      });
    }
  };

  const handlePrintLabel = async (orderId: string) => {
    try {
      const response = await fetch(`/api/v1/dropshipping/supplier/orders/${orderId}/label`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url);
      }
    } catch (error) {
      // Error log removed
      toast({
        title: 'Error',
        description: 'Failed to generate shipping label',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'confirmed': return 'default';
      case 'processing': return 'warning';
      case 'shipped': return 'info';
      case 'delivered': return 'success';
      case 'cancelled': return 'destructive';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.sellerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Order Details Dialog
  const OrderDetailsDialog = () => {
    if (!selectedOrder) return null;

    return (
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder.orderNumber}</DialogTitle>
            <DialogDescription>
              Order placed on {'/* date removed */'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Order Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={getStatusColor(selectedOrder.status) as any}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(selectedOrder.status)}
                    {selectedOrder.status}
                  </span>
                </Badge>
              </div>
              <div className="flex space-x-2">
                {selectedOrder.status === 'confirmed' && (
                  <Button size="sm" onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'processing')}>
                    Start Processing
                  </Button>
                )}
                {selectedOrder.status === 'processing' && (
                  <Button size="sm" onClick={() => {
                    setShowShippingDialog(true);
                    setShowOrderDetails(false);
                  }}>
                    Ship Order
                  </Button>
                )}
              </div>
            </div>

            {/* Customer & Seller Information */}
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedOrder.customerName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedOrder.customerEmail}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedOrder.customerPhone}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{selectedOrder.shippingAddress.name}</p>
                    <p>{selectedOrder.shippingAddress.street}</p>
                    <p>
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}
                    </p>
                    <p>{selectedOrder.shippingAddress.country}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${item.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4 space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span>${selectedOrder.shippingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>${selectedOrder.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            {selectedOrder.trackingNumber && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Shipping Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Carrier:</span>
                      <span className="font-medium">{selectedOrder.carrier}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Tracking Number:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">{selectedOrder.trackingNumber}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedOrder.trackingNumber || '');
                            toast({
                              title: 'Copied',
                              description: 'Tracking number copied to clipboard'
                            });
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {selectedOrder.shippedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Shipped Date:</span>
                        <span>{'/* date removed */'}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Shipping Dialog
  const ShippingDialog = () => {
    if (!selectedOrder) return null;

    return (
      <Dialog open={showShippingDialog} onOpenChange={setShowShippingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ship Order - {selectedOrder.orderNumber}</DialogTitle>
            <DialogDescription>
              Enter shipping details to mark this order as shipped
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Shipping Carrier *</Label>
              <Select
                value={shippingData.carrier}
                onValueChange={(value) => setShippingData({ ...shippingData, carrier: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fedex">FedEx</SelectItem>
                  <SelectItem value="ups">UPS</SelectItem>
                  <SelectItem value="usps">USPS</SelectItem>
                  <SelectItem value="dhl">DHL</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackingNumber">Tracking Number *</Label>
              <Input
                id="trackingNumber"
                value={shippingData.trackingNumber}
                onChange={(e) => setShippingData({ ...shippingData, trackingNumber: e.target.value })}
                placeholder="Enter tracking number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={shippingData.notes}
                onChange={(e) => setShippingData({ ...shippingData, notes: e.target.value })}
                placeholder="Any special instructions or notes"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowShippingDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleShipOrder}>
                Confirm Shipment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Order Management</h2>
          <p className="text-muted-foreground">
            Process and manage incoming orders
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => fetchOrders()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Orders
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.processingOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Being prepared
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipped Today</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.shippedToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              On the way
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.totalRevenue?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Orders</CardTitle>
            <div className="flex space-x-2">
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="all">All Orders</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
              <TabsTrigger value="shipped">Shipped</TabsTrigger>
              <TabsTrigger value="delivered">Delivered</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-mono text-sm">
                            {order.orderNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          {'/* date removed */'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.customerEmail}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{order.sellerName}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.items.length} items</p>
                            <p className="text-xs text-muted-foreground">
                              {order.items.reduce((sum, item) => sum + item.quantity, 0)} units
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${order.total.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(order.status) as any}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(order.status)}
                              {order.status}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowOrderDetails(true);
                              }}
                            >
                              View
                            </Button>
                            {order.status === 'processing' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handlePrintLabel(order.id)}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            )}
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

      <OrderDetailsDialog />
      <ShippingDialog />
    </div>
  );
};

export default OrderManagement;