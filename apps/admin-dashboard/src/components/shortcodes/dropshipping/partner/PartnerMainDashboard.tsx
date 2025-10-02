import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign,
  TrendingUp,
  Users,
  Link,
  Eye,
  MousePointer,
  ShoppingCart,
  Award,
  Target,
  BarChart3,
  Activity
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import existing components
import CommissionDashboard from './CommissionDashboard';
import PartnerLinkGenerator from './PartnerLinkGenerator';

interface PartnerDashboardSummary {
  totalEarnings: number;
  monthlyEarnings: number;
  pendingCommissions: number;
  conversionRate: number;
  totalClicks: number;
  totalConversions: number;
  activeLinks: number;
  tierLevel: string;
  tierProgress: number;
  referralCode: string;
  joinDate: string;
  lastActivity: string;
}

interface QuickStat {
  label: string;
  value: string;
  change: number;
  icon: React.ComponentType<any>;
  color: string;
}

const PartnerMainDashboard: React.FC = () => {
  const { toast } = useToast();
  const [summary, setSummary] = useState<PartnerDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardSummary();
  }, []);

  const fetchDashboardSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/dropshipping/partner/dashboard/summary', {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch dashboard data',
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

  const quickStats: QuickStat[] = [
    {
      label: 'Total Earnings',
      value: `$${summary?.totalEarnings?.toLocaleString() || '0'}`,
      change: 12.5,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      label: 'This Month',
      value: `$${summary?.monthlyEarnings?.toLocaleString() || '0'}`,
      change: 8.3,
      icon: TrendingUp,
      color: 'text-blue-600'
    },
    {
      label: 'Conversion Rate',
      value: `${summary?.conversionRate?.toFixed(2) || '0'}%`,
      change: 2.1,
      icon: Target,
      color: 'text-purple-600'
    },
    {
      label: 'Active Links',
      value: `${summary?.activeLinks || 0}`,
      change: 5.0,
      icon: Link,
      color: 'text-orange-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your partner dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Partner Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back! Track your performance and manage your partnerships.
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold">{summary?.tierLevel || 'Bronze'} Partner</span>
            </div>
            <p className="text-sm text-gray-500">
              Referral Code: <span className="font-mono font-medium">{summary?.referralCode || 'LOADING'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">+{stat.change}%</span>
                  </div>
                </div>
                <div className={`p-2 rounded-lg bg-gray-50`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Generate New Link</h3>
                <p className="text-sm text-blue-700 mt-1">Create promotional links for products</p>
              </div>
              <Link className="h-8 w-8 text-blue-600" />
            </div>
            <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700" size="sm">
              Create Link
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-green-900">View Commissions</h3>
                <p className="text-sm text-green-700 mt-1">Track your earnings and payments</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
            <Button variant="outline" className="w-full mt-4 border-green-300 text-green-700 hover:bg-green-50" size="sm">
              View Details
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-purple-900">Marketing Materials</h3>
                <p className="text-sm text-purple-700 mt-1">Download banners and creatives</p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
            <Button variant="outline" className="w-full mt-4 border-purple-300 text-purple-700 hover:bg-purple-50" size="sm">
              Browse
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Performance Overview
          </CardTitle>
          <CardDescription>Your key metrics at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <MousePointer className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{summary?.totalClicks?.toLocaleString() || '0'}</p>
              <p className="text-sm text-gray-600">Total Clicks</p>
            </div>
            <div className="text-center">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{summary?.totalConversions?.toLocaleString() || '0'}</p>
              <p className="text-sm text-gray-600">Conversions</p>
            </div>
            <div className="text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{summary?.conversionRate?.toFixed(1) || '0'}%</p>
              <p className="text-sm text-gray-600">Conversion Rate</p>
            </div>
            <div className="text-center">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">${summary?.pendingCommissions?.toLocaleString() || '0'}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="links">Link Manager</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              <strong>Tip:</strong> Increase your conversion rate by using high-performing products and targeting the right audience.
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm">New link created</span>
                    <Badge variant="secondary">2 hours ago</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm">Commission earned</span>
                    <Badge variant="secondary">1 day ago</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Tier upgraded</span>
                    <Badge variant="secondary">3 days ago</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tier Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Current: {summary?.tierLevel || 'Bronze'}</span>
                    <span className="text-sm text-gray-500">Next: Silver</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${summary?.tierProgress || 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600">
                    ${summary?.totalEarnings?.toLocaleString() || '0'} / $5,000 to reach Silver tier
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commissions">
          <CommissionDashboard />
        </TabsContent>

        <TabsContent value="links">
          <PartnerLinkGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PartnerMainDashboard;