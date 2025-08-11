/**
 * 후원자 대시보드 컴포넌트
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { 
  Heart,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign,
  Eye,
  MessageSquare
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface BackerDashboardData {
  backings: any[];
  stats: {
    totalBackings: number;
    totalAmount: number;
    activeBackings: number;
    successfulProjects: number;
  };
}

export function BackerDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<BackerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/crowdfunding/backer/dashboard');
      setDashboardData(response.data.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getBackingStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { variant: 'default', icon: Clock },
      fulfilled: { variant: 'success', icon: CheckCircle },
      cancelled: { variant: 'destructive', icon: XCircle },
      refunded: { variant: 'secondary', icon: XCircle }
    };

    const config = variants[status] || { variant: 'default', icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="mr-1 h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getProjectStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ongoing: 'text-blue-600',
      successful: 'text-green-600',
      failed: 'text-red-600',
      cancelled: 'text-gray-600'
    };
    return colors[status] || 'text-gray-600';
  };

  const calculateDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-8">
        <p>Failed to load dashboard data</p>
      </div>
    );
  }

  const activeBackings = dashboardData.backings.filter(b => b.status === 'active');
  const fulfilledBackings = dashboardData.backings.filter(b => b.status === 'fulfilled');
  const cancelledBackings = dashboardData.backings.filter(b => b.status === 'cancelled' || b.status === 'refunded');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Backed Projects</h1>
        <p className="text-muted-foreground">Track your crowdfunding contributions</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Backed</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.totalBackings}</div>
            <p className="text-xs text-muted-foreground">Projects supported</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contributed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">Lifetime contribution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Backings</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.activeBackings}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.stats.totalBackings > 0 
                ? Math.round((dashboardData.stats.successfulProjects / dashboardData.stats.totalBackings) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Projects funded</p>
          </CardContent>
        </Card>
      </div>

      {/* Backings List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeBackings.length})
          </TabsTrigger>
          <TabsTrigger value="fulfilled">
            Fulfilled ({fulfilledBackings.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({cancelledBackings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeBackings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No active backings</p>
              </CardContent>
            </Card>
          ) : (
            activeBackings.map((backing) => (
              <Card key={backing.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {backing.project?.title || 'Unknown Project'}
                      </CardTitle>
                      <CardDescription>
                        by {backing.project?.creatorName || 'Unknown Creator'}
                      </CardDescription>
                    </div>
                    {getBackingStatusBadge(backing.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Your Contribution</p>
                      <p className="text-lg font-semibold">{formatCurrency(backing.amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Backed On</p>
                      <p className="text-lg font-semibold">{formatDate(backing.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Project Status</p>
                      <p className={`text-lg font-semibold ${getProjectStatusColor(backing.project?.status)}`}>
                        {backing.project?.status || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Days Left</p>
                      <p className="text-lg font-semibold">
                        {backing.project?.status === 'ongoing' 
                          ? calculateDaysLeft(backing.project.endDate)
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {backing.project && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Project Progress</span>
                        <span className="text-sm font-medium">
                          {Math.round((backing.project.currentAmount / backing.project.targetAmount) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={(backing.project.currentAmount / backing.project.targetAmount) * 100}
                      />
                      <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                        <span>{formatCurrency(backing.project.currentAmount)} raised</span>
                        <span>of {formatCurrency(backing.project.targetAmount)}</span>
                      </div>
                    </div>
                  )}

                  {backing.rewards && backing.rewards.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Selected Rewards</p>
                      <div className="space-y-2">
                        {backing.rewards.map((reward: any, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{reward.reward?.title || 'Reward'}</span>
                            {reward.status === 'shipped' && (
                              <Badge variant="outline" className="text-xs">
                                Shipped
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/crowdfunding/projects/${backing.project?.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Project
                    </Button>
                    {backing.project?.allowComments && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/crowdfunding/projects/${backing.project?.id}/comments`)}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Comments
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="fulfilled" className="space-y-4">
          {fulfilledBackings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No fulfilled backings yet</p>
              </CardContent>
            </Card>
          ) : (
            fulfilledBackings.map((backing) => (
              <Card key={backing.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {backing.project?.title || 'Unknown Project'}
                      </CardTitle>
                      <CardDescription>
                        Fulfilled on {formatDate(backing.updatedAt)}
                      </CardDescription>
                    </div>
                    {getBackingStatusBadge(backing.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Contribution</p>
                      <p className="font-semibold">{formatCurrency(backing.amount)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/crowdfunding/projects/${backing.project?.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          {cancelledBackings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No cancelled backings</p>
              </CardContent>
            </Card>
          ) : (
            cancelledBackings.map((backing) => (
              <Card key={backing.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {backing.project?.title || 'Unknown Project'}
                      </CardTitle>
                      <CardDescription>
                        {backing.cancellationReason || 'Project cancelled or failed'}
                      </CardDescription>
                    </div>
                    {getBackingStatusBadge(backing.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Refunded Amount</p>
                      <p className="font-semibold">{formatCurrency(backing.refundAmount || backing.amount)}</p>
                    </div>
                    {backing.refundedAt && (
                      <p className="text-sm text-muted-foreground">
                        Refunded on {formatDate(backing.refundedAt)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}