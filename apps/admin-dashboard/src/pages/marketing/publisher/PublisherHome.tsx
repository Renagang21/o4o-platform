/**
 * Marketing Publisher Home
 *
 * Dashboard for Marketing LMS Publisher
 * Phase R10: Supplier Publishing UI
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Package,
  ClipboardList,
  FileQuestion,
  TrendingUp,
  Plus,
  AlertTriangle,
  BarChart3,
  Clock,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { insightsApi, type SupplierDashboardSummary } from '@/lib/api/lmsMarketing';
import { useAuth } from '@o4o/auth-context';

export default function PublisherHome() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<SupplierDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use supplier ID from user context or default
  const supplierId = String(user?.supplierId || user?.id || 'default-supplier');

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await insightsApi.getDashboard(supplierId);
        if (response.success && response.data) {
          setDashboard(response.data);
        } else {
          setError(response.error || 'Failed to load dashboard');
        }
      } catch (err) {
        setError('Failed to load dashboard');
        console.error('Dashboard fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [supplierId]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const overview = dashboard?.overview || {
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalParticipants: 0,
    totalCompletions: 0,
    overallCompletionRate: 0,
  };

  const byType = dashboard?.byType || [];
  const recentActivity = dashboard?.recentActivity || [];

  const productStats = byType.find((t) => t.type === 'product') || { total: 0, active: 0, draft: 0 };
  const quizStats = byType.find((t) => t.type === 'quiz') || { total: 0, active: 0, draft: 0, totalParticipants: 0 };
  const surveyStats = byType.find((t) => t.type === 'survey') || { total: 0, active: 0, draft: 0, totalParticipants: 0 };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing Publisher</h1>
          <p className="text-muted-foreground">
            Create and manage marketing campaigns for your products
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Badge>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Campaigns"
          value={overview.totalCampaigns}
          icon={ClipboardList}
          description={`${overview.activeCampaigns} active`}
        />
        <StatCard
          title="Total Participants"
          value={overview.totalParticipants}
          icon={TrendingUp}
          description={`${overview.totalCompletions} completions`}
        />
        <StatCard
          title="Completion Rate"
          value={`${overview.overallCompletionRate.toFixed(1)}%`}
          icon={CheckCircle}
          description="Overall completion rate"
          trend={overview.overallCompletionRate >= 50 ? 'up' : 'down'}
        />
        <StatCard
          title="Active Campaigns"
          value={overview.activeCampaigns}
          icon={Clock}
          description="Currently running"
        />
      </div>

      {/* Campaign Types */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Product Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                Product Info
              </CardTitle>
              <Badge variant="secondary">{productStats.total}</Badge>
            </div>
            <CardDescription>
              Educational content about your products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active</span>
                <span className="font-medium">{productStats.active}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Draft</span>
                <span className="font-medium">{productStats.draft}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button asChild size="sm" className="flex-1">
                  <Link to="/admin/marketing/publisher/product">
                    <Eye className="h-4 w-4 mr-1" />
                    View All
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/marketing/publisher/product/create">
                    <Plus className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Campaign Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5 text-green-500" />
                Quiz Campaigns
              </CardTitle>
              <Badge variant="secondary">{quizStats.total}</Badge>
            </div>
            <CardDescription>
              Interactive quizzes for product education
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active</span>
                <span className="font-medium">{quizStats.active}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Participants</span>
                <span className="font-medium">{quizStats.totalParticipants}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button asChild size="sm" className="flex-1">
                  <Link to="/admin/marketing/publisher/quiz">
                    <Eye className="h-4 w-4 mr-1" />
                    View All
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/marketing/publisher/quiz/create">
                    <Plus className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Survey Campaign Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-purple-500" />
                Survey Campaigns
              </CardTitle>
              <Badge variant="secondary">{surveyStats.total}</Badge>
            </div>
            <CardDescription>
              Collect feedback and insights from users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active</span>
                <span className="font-medium">{surveyStats.active}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Responses</span>
                <span className="font-medium">{surveyStats.totalParticipants}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button asChild size="sm" className="flex-1">
                  <Link to="/admin/marketing/publisher/survey">
                    <Eye className="h-4 w-4 mr-1" />
                    View All
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/marketing/publisher/survey/create">
                    <Plus className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates on your campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.action === 'published' ? 'bg-green-500' :
                      activity.action === 'created' ? 'bg-blue-500' :
                      activity.action === 'ended' ? 'bg-gray-500' :
                      'bg-purple-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.action} - {activity.type}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with your marketing campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <QuickActionButton
                href="/admin/marketing/publisher/product/create"
                icon={Package}
                label="Create Product Info"
                description="Add educational content for your products"
              />
              <QuickActionButton
                href="/admin/marketing/publisher/quiz/create"
                icon={FileQuestion}
                label="Create Quiz Campaign"
                description="Build interactive quizzes with rewards"
              />
              <QuickActionButton
                href="/admin/marketing/publisher/survey/create"
                icon={ClipboardList}
                label="Create Survey Campaign"
                description="Collect feedback from your audience"
              />
              <QuickActionButton
                href={`/admin/marketing/insights/${supplierId}`}
                icon={BarChart3}
                label="View Insights"
                description="Analyze your campaign performance"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Sub-components

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  trend?: 'up' | 'down';
}

function StatCard({ title, value, icon: Icon, description, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <TrendingUp
              className={`h-4 w-4 ${
                trend === 'up' ? 'text-green-500' : 'text-red-500 rotate-180'
              }`}
            />
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickActionButtonProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}

function QuickActionButton({ href, icon: Icon, label, description }: QuickActionButtonProps) {
  return (
    <Link
      to={href}
      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent transition-colors"
    >
      <Icon className="h-8 w-8 text-primary" />
      <div>
        <span className="font-medium">{label}</span>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
