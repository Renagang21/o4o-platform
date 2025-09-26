import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DollarSign,
  ShoppingCart,
  MousePointer,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Target,
  Activity
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
// Chart components will be available when recharts is installed
// import { format } from 'date-fns';

interface CommissionSummary {
  totalEarned: number;
  pendingAmount: number;
  paidAmount: number;
  currentMonthEarnings: number;
  lastMonthEarnings: number;
  growthRate: number;
  conversionRate: number;
  averageOrderValue: number;
  totalClicks: number;
  totalConversions: number;
  tierLevel: string;
  nextTierProgress: number;
  nextTierTarget: number;
}

interface Commission {
  id: string;
  orderId: string;
  orderDate: string;
  productName: string;
  productImage?: string;
  customerName: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  paymentDate?: string;
  linkUsed: string;
  platform?: string;
  tier: number;
}

interface PerformanceMetric {
  date: string;
  clicks: number;
  conversions: number;
  revenue: number;
  commission: number;
}

interface TopProduct {
  id: string;
  name: string;
  image?: string;
  conversions: number;
  revenue: number;
  commission: number;
  conversionRate: number;
}

interface TierInfo {
  current: string;
  level: number;
  commissionRate: number;
  requirements: {
    sales?: number;
    revenue?: number;
  };
  benefits: string[];
}

const CommissionDashboard: React.FC = () => {
  const { toast } = useToast();
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  useState<PerformanceMetric[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all dashboard data in parallel
      const [summaryRes, commissionsRes, performanceRes, productsRes, tierRes] = await Promise.all([
        fetch(`/api/v1/dropshipping/partner/commission/summary?range=${dateRange}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/v1/dropshipping/partner/commissions?range=${dateRange}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/v1/dropshipping/partner/performance?range=${dateRange}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/v1/dropshipping/partner/top-products?range=${dateRange}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/v1/dropshipping/partner/tier-info', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }

      if (commissionsRes.ok) {
        const data = await commissionsRes.json();
        setCommissions(data.commissions || []);
      }

      if (performanceRes.ok) {
        await performanceRes.json();
        // Performance data will be used when charts are available
      }

      if (productsRes.ok) {
        const data = await productsRes.json();
        setTopProducts(data.products || []);
      }

      if (tierRes.ok) {
        const data = await tierRes.json();
        setTierInfo(data);
      }
    } catch (error) {
      // Error log removed
      toast({
        title: 'Error',
        description: 'Failed to fetch dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await fetch(`/api/v1/dropshipping/partner/commission/export?range=${dateRange}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `commissions-${dateRange}.csv`;
        a.click();
        
        toast({
          title: 'Success',
          description: 'Commission data exported successfully'
        });
      }
    } catch (error) {
      // Error log removed
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'success';
      case 'approved': return 'info';
      case 'pending': return 'warning';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };


  // Chart data will be used when recharts is available

  if (loading) {
    return <div className="text-center py-8">Loading commission dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Commission Dashboard</h2>
          <p className="text-muted-foreground">
            Track your earnings and performance metrics
          </p>
        </div>
        <div className="flex space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportData}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Tier Progress */}
      {tierInfo && (
        <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold">
                    {tierInfo.current} Tier - Level {tierInfo.level}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Current commission rate: {tierInfo.commissionRate}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-2">
                  Progress to next tier
                </p>
                <div className="w-48">
                  <Progress 
                    value={(summary?.nextTierProgress || 0) / (summary?.nextTierTarget || 1) * 100} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ${summary?.nextTierProgress?.toLocaleString()} / ${summary?.nextTierTarget?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary?.totalEarned?.toLocaleString() || '0'}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {summary?.growthRate && summary.growthRate > 0 ? (
                <>
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-green-500">{summary.growthRate.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-red-500">{Math.abs(summary?.growthRate || 0).toFixed(1)}%</span>
                </>
              )}
              <span className="ml-1">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary?.pendingAmount?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.conversionRate?.toFixed(2) || '0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.totalConversions || 0} conversions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary?.averageOrderValue?.toFixed(2) || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per conversion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Earnings Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Earnings Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Chart component will be available when recharts is installed
                </div>
              </CardContent>
            </Card>

            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Conversion funnel chart will be available when recharts is installed
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Click-through Rate</span>
                    <span className="font-medium">
                      {((summary?.totalConversions || 0) / (summary?.totalClicks || 1) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Commissions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Commissions</CardTitle>
              <CardDescription>Your latest earned commissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Order Value</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.slice(0, 5).map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        {'/* date removed */'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {commission.productImage && (
                            <img 
                              src={commission.productImage} 
                              alt={commission.productName}
                              className="h-8 w-8 rounded object-cover"
                            />
                          )}
                          <span className="text-sm line-clamp-1">{commission.productName}</span>
                        </div>
                      </TableCell>
                      <TableCell>${commission.orderAmount.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">
                        ${commission.commissionAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(commission.status) as any}>
                          {commission.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle>Commission History</CardTitle>
              <CardDescription>Detailed view of all your commissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order Value</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell className="font-mono text-xs">
                        {commission.orderId}
                      </TableCell>
                      <TableCell>
                        {'/* date removed */'}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="text-sm line-clamp-1">{commission.productName}</p>
                        </div>
                      </TableCell>
                      <TableCell>{commission.customerName}</TableCell>
                      <TableCell>${commission.orderAmount.toFixed(2)}</TableCell>
                      <TableCell>{commission.commissionRate}%</TableCell>
                      <TableCell className="font-medium">
                        ${commission.commissionAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {commission.platform && (
                          <Badge variant="outline" className="text-xs">
                            {commission.platform}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(commission.status) as any}>
                          {commission.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Products</CardTitle>
              <CardDescription>Products generating the most commissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-semibold">
                        {index + 1}
                      </div>
                      {product.image && (
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="h-12 w-12 rounded object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.conversions} conversions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${product.commission.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.conversionRate.toFixed(1)}% conversion
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Performance by Day */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Conversions chart will be available when recharts is installed
                </div>
              </CardContent>
            </Card>

            {/* Revenue vs Commission */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Commission</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Revenue vs Commission chart will be available when recharts is installed
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Key Performance Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <MousePointer className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{summary?.totalClicks?.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{summary?.totalConversions}</p>
                  <p className="text-sm text-muted-foreground">Conversions</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Target className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <p className="text-2xl font-bold">{summary?.conversionRate?.toFixed(2)}%</p>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <p className="text-2xl font-bold">${summary?.averageOrderValue?.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommissionDashboard;