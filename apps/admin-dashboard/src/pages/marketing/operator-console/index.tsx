/**
 * Operator Content & Engagement Console - Main Page
 *
 * Phase R12-B: Operator Console
 * Purpose: Receive, compose, and distribute external content
 *
 * Key Responsibilities:
 * - Receive supplier content (not create)
 * - Compose ContentBundles
 * - Distribute to stores/channels
 * - View engagement summary
 */

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Inbox,
  FolderOpen,
  Send,
  AlertTriangle,
  LayoutDashboard,
  CheckCircle,
  Clock,
  Store,
  Eye,
  RefreshCw,
  Users,
  FileQuestion,
  ClipboardList,
} from 'lucide-react';
import {
  productContentApi,
  quizCampaignApi,
  surveyCampaignApi,
  type ProductContent,
  type QuizCampaign,
  type SurveyCampaign,
} from '@/lib/api/lmsMarketing';

type ContentStatus = 'all' | 'draft' | 'published' | 'expired';

export default function OperatorConsole() {
  const [products, setProducts] = useState<ProductContent[]>([]);
  const [quizCampaigns, setQuizCampaigns] = useState<QuizCampaign[]>([]);
  const [surveyCampaigns, setSurveyCampaigns] = useState<SurveyCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [contentFilter, setContentFilter] = useState<ContentStatus>('all');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch all supplier content (operator sees all)
        const [productsRes, quizRes, surveyRes] = await Promise.all([
          productContentApi.list(),
          quizCampaignApi.list(),
          surveyCampaignApi.list(),
        ]);

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
        console.error('Failed to fetch content:', err);
        setError('Failed to load content');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const activeProducts = products.filter((p) => p.isPublished && p.isActive).length;
    const draftProducts = products.filter((p) => !p.isPublished).length;
    const activeQuizzes = quizCampaigns.filter((q) => q.status === 'active').length;
    const activeSurveys = surveyCampaigns.filter((s) => s.status === 'active').length;

    const totalDistributed = activeProducts + activeQuizzes + activeSurveys;
    const totalIncoming = draftProducts +
      quizCampaigns.filter((q) => q.status === 'draft').length +
      surveyCampaigns.filter((s) => s.status === 'draft').length;

    const totalParticipation =
      quizCampaigns.reduce((sum, q) => sum + q.participationCount, 0) +
      surveyCampaigns.reduce((sum, s) => sum + s.participationCount, 0);

    return {
      totalContent: products.length + quizCampaigns.length + surveyCampaigns.length,
      activeProducts,
      draftProducts,
      activeQuizzes,
      activeSurveys,
      totalDistributed,
      totalIncoming,
      totalParticipation,
    };
  }, [products, quizCampaigns, surveyCampaigns]);

  // Filter content based on status
  const filteredContent = useMemo(() => {
    const allContent = [
      ...products.map((p) => ({
        id: p.id,
        title: p.title,
        type: 'product' as const,
        status: p.isPublished ? (p.isActive ? 'published' : 'expired') : 'draft',
        supplierId: p.supplierId,
        createdAt: p.createdAt,
        targeting: p.targeting,
      })),
      ...quizCampaigns.map((q) => ({
        id: q.id,
        title: q.title,
        type: 'quiz' as const,
        status: q.status,
        supplierId: q.supplierId,
        createdAt: q.createdAt,
        targeting: q.targeting,
        participation: q.participationCount,
        completion: q.completionCount,
      })),
      ...surveyCampaigns.map((s) => ({
        id: s.id,
        title: s.title,
        type: 'survey' as const,
        status: s.status,
        supplierId: s.supplierId,
        createdAt: s.createdAt,
        targeting: s.targeting,
        participation: s.participationCount,
        completion: s.completionCount,
      })),
    ];

    if (contentFilter === 'all') return allContent;
    return allContent.filter((c) => {
      if (contentFilter === 'published') return c.status === 'active' || c.status === 'published';
      if (contentFilter === 'expired') return c.status === 'ended' || c.status === 'expired' || c.status === 'archived';
      return c.status === contentFilter;
    });
  }, [products, quizCampaigns, surveyCampaigns, contentFilter]);

  if (isLoading) {
    return <ConsoleSkeleton />;
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
            <LayoutDashboard className="h-6 w-6" />
            Operator Content Console
          </h1>
          <p className="text-muted-foreground">
            Receive, compose, and distribute marketing content
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Content"
          value={stats.totalContent}
          icon={Package}
          description={`${stats.activeProducts} products, ${stats.activeQuizzes + stats.activeSurveys} campaigns`}
        />
        <StatCard
          title="Incoming"
          value={stats.totalIncoming}
          icon={Inbox}
          description="Awaiting review/distribution"
        />
        <StatCard
          title="Distributed"
          value={stats.totalDistributed}
          icon={Send}
          description="Currently active"
        />
        <StatCard
          title="Engagement"
          value={stats.totalParticipation}
          icon={Users}
          description="Total participation"
        />
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="incoming">Incoming Content</TabsTrigger>
          <TabsTrigger value="bundles">Bundle Manager</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Quick Status */}
            <Card>
              <CardHeader>
                <CardTitle>Content Status</CardTitle>
                <CardDescription>Overview of all content by status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span>Active/Published</span>
                  </div>
                  <Badge variant="secondary">{stats.totalDistributed}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                    <span>Draft/Pending</span>
                  </div>
                  <Badge variant="secondary">{stats.totalIncoming}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full" />
                    <span>Ended/Archived</span>
                  </div>
                  <Badge variant="secondary">
                    {stats.totalContent - stats.totalDistributed - stats.totalIncoming}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Engagement Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Summary</CardTitle>
                <CardDescription>How content is performing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {quizCampaigns.reduce((sum, q) => sum + q.participationCount, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Quiz Attempts</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {surveyCampaigns.reduce((sum, s) => sum + s.participationCount, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Survey Responses</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground text-center">
                  Reaction data only - no analysis
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Incoming Content Tab */}
        <TabsContent value="incoming" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Inbox className="h-5 w-5" />
                    Incoming Content
                  </CardTitle>
                  <CardDescription>
                    Content from suppliers awaiting distribution
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {(['all', 'draft', 'published', 'expired'] as ContentStatus[]).map((status) => (
                    <Button
                      key={status}
                      variant={contentFilter === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setContentFilter(status)}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredContent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No content found
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredContent.map((content) => (
                    <ContentRow key={`${content.type}-${content.id}`} content={content} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bundle Manager Tab */}
        <TabsContent value="bundles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Bundle Manager
              </CardTitle>
              <CardDescription>
                Compose and manage content bundles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Bundle Composition</p>
                <p className="text-sm mt-2">
                  Select content from the Incoming tab and compose into bundles
                </p>
                <p className="text-xs mt-4 text-muted-foreground">
                  Note: Content creation is not available here. <br />
                  Operators compose and distribute existing supplier content.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Distribution Status
              </CardTitle>
              <CardDescription>
                Where content has been distributed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Active Distributions */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Store className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Active Distributions</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-lg font-bold">{stats.activeProducts}</p>
                      <p className="text-sm text-muted-foreground">Products</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-lg font-bold">{stats.activeQuizzes}</p>
                      <p className="text-sm text-muted-foreground">Quizzes</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-lg font-bold">{stats.activeSurveys}</p>
                      <p className="text-sm text-muted-foreground">Surveys</p>
                    </div>
                  </div>
                </div>

                {/* Distribution Note */}
                <Alert>
                  <Eye className="h-4 w-4" />
                  <AlertTitle>Engagement Only</AlertTitle>
                  <AlertDescription>
                    This console shows where content is distributed and whether reactions occurred.
                    Performance evaluation and analysis are not part of operator responsibilities.
                  </AlertDescription>
                </Alert>
              </div>
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
}

function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface ContentRowProps {
  content: {
    id: string;
    title: string;
    type: 'product' | 'quiz' | 'survey';
    status: string;
    supplierId: string;
    createdAt: string;
    targeting?: { targets?: string[] };
    participation?: number;
    completion?: number;
  };
}

function ContentRow({ content }: ContentRowProps) {
  const statusColor = {
    draft: 'secondary',
    scheduled: 'outline',
    active: 'default',
    published: 'default',
    ended: 'secondary',
    expired: 'secondary',
    archived: 'outline',
  }[content.status] as 'default' | 'secondary' | 'outline';

  const TypeIcon = {
    product: Package,
    quiz: FileQuestion,
    survey: ClipboardList,
  }[content.type];

  const typeColor = {
    product: 'text-blue-500',
    quiz: 'text-green-500',
    survey: 'text-purple-500',
  }[content.type];

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3">
        <TypeIcon className={`h-5 w-5 ${typeColor}`} />
        <div>
          <p className="font-medium">{content.title}</p>
          <p className="text-sm text-muted-foreground">
            {content.type.charAt(0).toUpperCase() + content.type.slice(1)} •
            {content.targeting?.targets?.join(', ') || 'All audiences'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {content.participation !== undefined && (
          <div className="text-right text-sm">
            <p className="font-medium">{content.participation}</p>
            <p className="text-muted-foreground">Engagement</p>
          </div>
        )}
        <Badge variant={statusColor}>
          {content.status}
        </Badge>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ConsoleSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-24" />
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
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
