/**
 * Supplier Engagement Dashboard - Main Page
 *
 * Phase R12-A: Supplier Engagement Dashboard
 * Purpose: View market reaction data for supplier's content
 *
 * Data Sources (READ-ONLY):
 * - ContentBundle
 * - QuizCampaign / SurveyCampaign
 * - EngagementLog
 * - Campaign statistics fields
 */

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  ClipboardList,
  FileQuestion,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Users,
  Eye,
  CheckCircle,
  Activity,
  Calendar,
} from 'lucide-react';
import {
  insightsApi,
  productContentApi,
  quizCampaignApi,
  surveyCampaignApi,
  type SupplierDashboardSummary,
  type ProductContent,
  type QuizCampaign,
  type SurveyCampaign,
} from '@/lib/api/lmsMarketing';
import { useAuth } from '@o4o/auth-context';

type DateRange = '7d' | '30d' | 'all';

export default function SupplierEngagementDashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<SupplierDashboardSummary | null>(null);
  const [products, setProducts] = useState<ProductContent[]>([]);
  const [quizCampaigns, setQuizCampaigns] = useState<QuizCampaign[]>([]);
  const [surveyCampaigns, setSurveyCampaigns] = useState<SurveyCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const supplierId = user?.supplierId || user?.id || 'default-supplier';

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [dashboardRes, productsRes, quizRes, surveyRes] = await Promise.all([
          insightsApi.getDashboard(supplierId),
          productContentApi.list(supplierId),
          quizCampaignApi.list(supplierId),
          surveyCampaignApi.list(supplierId),
        ]);

        if (dashboardRes.success && dashboardRes.data) {
          setDashboard(dashboardRes.data);
        }
        if (productsRes.success && productsRes.data) {
          setProducts(productsRes.data.data || []);
        }
        if (quizRes.success && quizRes.data) {
          setQuizCampaigns(quizRes.data.data || []);
        }
        if (surveyRes.success && surveyRes.data) {
          setSurveyCampaigns(surveyRes.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch engagement data:', err);
        setError('Failed to load engagement data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supplierId]);

  // Calculate stats
  const stats = useMemo(() => {
    const overview = dashboard?.overview || {
      totalCampaigns: 0,
      activeCampaigns: 0,
      totalParticipants: 0,
      totalCompletions: 0,
      overallCompletionRate: 0,
    };

    const activeProducts = products.filter((p) => p.isActive && p.isPublished).length;
    const activeQuizzes = quizCampaigns.filter((q) => q.status === 'active').length;
    const activeSurveys = surveyCampaigns.filter((s) => s.status === 'active').length;

    const totalQuizParticipation = quizCampaigns.reduce((sum, q) => sum + q.participationCount, 0);
    const totalQuizCompletion = quizCampaigns.reduce((sum, q) => sum + q.completionCount, 0);
    const totalSurveyParticipation = surveyCampaigns.reduce((sum, s) => sum + s.participationCount, 0);
    const totalSurveyCompletion = surveyCampaigns.reduce((sum, s) => sum + s.completionCount, 0);

    return {
      overview,
      activeProducts,
      activeQuizzes,
      activeSurveys,
      totalActiveContents: activeProducts + activeQuizzes + activeSurveys,
      totalQuizParticipation,
      totalQuizCompletion,
      totalSurveyParticipation,
      totalSurveyCompletion,
      quizCompletionRate: totalQuizParticipation > 0
        ? (totalQuizCompletion / totalQuizParticipation) * 100
        : 0,
      surveyCompletionRate: totalSurveyParticipation > 0
        ? (totalSurveyCompletion / totalSurveyParticipation) * 100
        : 0,
    };
  }, [dashboard, products, quizCampaigns, surveyCampaigns]);

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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Supplier Engagement Dashboard
          </h1>
          <p className="text-muted-foreground">
            View market reaction data for your content and campaigns
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">
            {new Date().toLocaleDateString('ko-KR')}
          </Badge>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Contents"
          value={stats.totalActiveContents}
          icon={Package}
          description={`${stats.activeProducts} products, ${stats.activeQuizzes} quizzes, ${stats.activeSurveys} surveys`}
        />
        <StatCard
          title="Total Participants"
          value={stats.overview.totalParticipants}
          icon={Users}
          description="Across all campaigns"
        />
        <StatCard
          title="Total Completions"
          value={stats.overview.totalCompletions}
          icon={CheckCircle}
          description={`${stats.overview.overallCompletionRate.toFixed(1)}% completion rate`}
          trend={stats.overview.overallCompletionRate >= 50 ? 'up' : 'down'}
        />
        <StatCard
          title="Active Campaigns"
          value={stats.activeQuizzes + stats.activeSurveys}
          icon={Activity}
          description="Currently running"
        />
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quiz">Quiz Campaigns</TabsTrigger>
          <TabsTrigger value="survey">Survey Campaigns</TabsTrigger>
          <TabsTrigger value="content">Content Consumption</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Quiz Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileQuestion className="h-5 w-5 text-green-500" />
                  Quiz Campaign Performance
                </CardTitle>
                <CardDescription>
                  Summary of quiz campaign engagement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{stats.totalQuizParticipation}</p>
                    <p className="text-sm text-muted-foreground">Total Attempts</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{stats.totalQuizCompletion}</p>
                    <p className="text-sm text-muted-foreground">Completions</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completion Rate</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stats.quizCompletionRate.toFixed(1)}%</span>
                    {stats.quizCompletionRate >= 50 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                {quizCampaigns.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium mb-2">Top Performing Quiz</p>
                    {(() => {
                      const topQuiz = [...quizCampaigns].sort(
                        (a, b) => b.participationCount - a.participationCount
                      )[0];
                      return (
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate">{topQuiz.title}</span>
                          <Badge variant="secondary">{topQuiz.participationCount} attempts</Badge>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Survey Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-purple-500" />
                  Survey Campaign Performance
                </CardTitle>
                <CardDescription>
                  Summary of survey campaign responses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{stats.totalSurveyParticipation}</p>
                    <p className="text-sm text-muted-foreground">Total Responses</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{stats.totalSurveyCompletion}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completion Rate</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stats.surveyCompletionRate.toFixed(1)}%</span>
                    {stats.surveyCompletionRate >= 50 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                {surveyCampaigns.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium mb-2">Top Performing Survey</p>
                    {(() => {
                      const topSurvey = [...surveyCampaigns].sort(
                        (a, b) => b.participationCount - a.participationCount
                      )[0];
                      return (
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate">{topSurvey.title}</span>
                          <Badge variant="secondary">{topSurvey.participationCount} responses</Badge>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Quiz Campaigns Tab */}
        <TabsContent value="quiz" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quiz Campaign Performance</CardTitle>
              <CardDescription>
                Detailed performance metrics for each quiz campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quizCampaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No quiz campaigns found
                </div>
              ) : (
                <div className="space-y-4">
                  {quizCampaigns.map((quiz) => (
                    <CampaignRow
                      key={quiz.id}
                      title={quiz.title}
                      status={quiz.status}
                      participation={quiz.participationCount}
                      completion={quiz.completionCount}
                      avgScore={quiz.averageScore}
                      type="quiz"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Survey Campaigns Tab */}
        <TabsContent value="survey" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Survey Campaign Performance</CardTitle>
              <CardDescription>
                Response metrics for each survey campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              {surveyCampaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No survey campaigns found
                </div>
              ) : (
                <div className="space-y-4">
                  {surveyCampaigns.map((survey) => (
                    <CampaignRow
                      key={survey.id}
                      title={survey.title}
                      status={survey.status}
                      participation={survey.participationCount}
                      completion={survey.completionCount}
                      type="survey"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Consumption Tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Consumption Summary</CardTitle>
              <CardDescription>
                How your published content is being consumed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No published content found
                </div>
              ) : (
                <div className="space-y-4">
                  {products.filter((p) => p.isPublished).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">{product.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.targeting?.targets?.join(', ') || 'All audiences'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={product.isActive ? 'default' : 'secondary'}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">
                            Published {product.publishedAt
                              ? new Date(product.publishedAt).toLocaleDateString()
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

interface CampaignRowProps {
  title: string;
  status: string;
  participation: number;
  completion: number;
  avgScore?: number;
  type: 'quiz' | 'survey';
}

function CampaignRow({ title, status, participation, completion, avgScore, type }: CampaignRowProps) {
  const completionRate = participation > 0 ? (completion / participation) * 100 : 0;

  const statusColor = {
    draft: 'secondary',
    scheduled: 'outline',
    active: 'default',
    ended: 'secondary',
    archived: 'outline',
  }[status] as 'default' | 'secondary' | 'outline';

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        {type === 'quiz' ? (
          <FileQuestion className="h-5 w-5 text-green-500" />
        ) : (
          <ClipboardList className="h-5 w-5 text-purple-500" />
        )}
        <div>
          <p className="font-medium">{title}</p>
          <Badge variant={statusColor} className="mt-1">
            {status}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div className="text-right">
          <p className="font-medium">{participation}</p>
          <p className="text-muted-foreground">
            {type === 'quiz' ? 'Attempts' : 'Responses'}
          </p>
        </div>
        <div className="text-right">
          <p className="font-medium">{completion}</p>
          <p className="text-muted-foreground">Completed</p>
        </div>
        <div className="text-right">
          <p className="font-medium">{completionRate.toFixed(1)}%</p>
          <p className="text-muted-foreground">Rate</p>
        </div>
        {avgScore !== undefined && (
          <div className="text-right">
            <p className="font-medium">{avgScore.toFixed(1)}</p>
            <p className="text-muted-foreground">Avg Score</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
