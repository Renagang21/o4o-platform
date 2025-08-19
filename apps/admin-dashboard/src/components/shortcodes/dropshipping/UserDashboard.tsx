import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
// Define UserRole enum locally since import path is not available
enum UserRole {
  CUSTOMER = 'customer',
  SUPPLIER = 'supplier',
  SELLER = 'seller',
  AFFILIATE = 'affiliate',
  ADMIN = 'admin'
}
import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';

interface DashboardProps {
  role?: string;
}

const UserDashboard: React.FC<DashboardProps> = ({ role }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  
  // Determine the actual role to display
  const displayRole = role || user?.role || UserRole.CUSTOMER;

  useEffect(() => {
    fetchDashboardData();
  }, [displayRole]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch role-specific dashboard data
      const response = await fetch(`/api/v1/dropshipping/dashboard/${displayRole}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Supplier Dashboard
  const SupplierDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.totalProducts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.activeProducts || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.pendingOrders || 0} pending
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
              ${dashboardData?.totalRevenue?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData?.revenueGrowth || 0}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.averageRating || '0.0'}</div>
            <p className="text-xs text-muted-foreground">
              from {dashboardData?.totalReviews || 0} reviews
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest orders from sellers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData?.recentOrders?.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.productCount} items - ${order.total}
                    </p>
                  </div>
                  <Badge variant={order.status === 'pending' ? 'secondary' : 'default'}>
                    {order.status}
                  </Badge>
                </div>
              )) || <p className="text-muted-foreground">No recent orders</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alert</CardTitle>
            <CardDescription>Products running low on inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData?.lowStockProducts?.map((product: any) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                  </div>
                  <Badge variant="destructive">
                    {product.quantity} left
                  </Badge>
                </div>
              )) || <p className="text-muted-foreground">All products well stocked</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Seller Dashboard
  const SellerDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${dashboardData?.totalSales?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              +{dashboardData?.salesGrowth || 0}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.activeListings || 0}</div>
            <p className="text-xs text-muted-foreground">
              from {dashboardData?.totalSuppliers || 0} suppliers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.processingOrders || 0} processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.satisfaction || '0'}%</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.returnRate || 0}% return rate
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Your best performing products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData?.topProducts?.map((product: any) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.sold} sold - ${product.revenue}
                    </p>
                  </div>
                  <Badge variant="default">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {product.growth}%
                  </Badge>
                </div>
              )) || <p className="text-muted-foreground">No sales data yet</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Actions</CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData?.pendingActions?.map((action: any, index: number) => (
                <div key={index} className="flex items-start space-x-2">
                  {action.type === 'warning' ? (
                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  ) : (
                    <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </div>
              )) || <p className="text-muted-foreground">No pending actions</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Affiliate Dashboard
  const AffiliateDashboard = () => (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your referral code: <strong>{dashboardData?.referralCode || 'GENERATING...'}</strong>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.totalClicks || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.uniqueClicks || 0} unique
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.conversions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.conversionRate || 0}% rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${dashboardData?.totalEarnings?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              ${dashboardData?.pendingEarnings || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.commissionRate || 5}%</div>
            <p className="text-xs text-muted-foreground">
              Tier: {dashboardData?.tier || 'Bronze'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversions</CardTitle>
            <CardDescription>Latest successful referrals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData?.recentConversions?.map((conversion: any) => (
                <div key={conversion.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order #{conversion.orderId.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      ${conversion.orderAmount} - Commission: ${conversion.commission}
                    </p>
                  </div>
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approved
                  </Badge>
                </div>
              )) || <p className="text-muted-foreground">No conversions yet</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Your affiliate performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Average Order Value</span>
                <span className="font-medium">${dashboardData?.avgOrderValue || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Repeat Customers</span>
                <span className="font-medium">{dashboardData?.repeatCustomers || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">This Month Earnings</span>
                <span className="font-medium">${dashboardData?.monthlyEarnings || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Next Payout</span>
                <span className="font-medium">{dashboardData?.nextPayoutDate || 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Render appropriate dashboard based on role
  const renderDashboard = () => {
    if (loading) {
      return <div className="text-center py-8">Loading dashboard...</div>;
    }

    switch (displayRole) {
      case UserRole.SUPPLIER:
        return <SupplierDashboard />;
      case UserRole.SELLER:
        return <SellerDashboard />;
      case UserRole.AFFILIATE:
        return <AffiliateDashboard />;
      default:
        return (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select a role to view the appropriate dashboard.
            </AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {displayRole.charAt(0).toUpperCase() + displayRole.slice(1)} Dashboard
          </h2>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {displayRole.toUpperCase()}
        </Badge>
      </div>

      {renderDashboard()}
    </div>
  );
};

export default UserDashboard;