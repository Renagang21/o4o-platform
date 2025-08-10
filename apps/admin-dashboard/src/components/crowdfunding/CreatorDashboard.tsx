/**
 * 크리에이터 대시보드 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { 
  Plus,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  Edit,
  Eye,
  MessageSquare,
  Upload,
  Package,
  BarChart3
} from 'lucide-react';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';

interface DashboardData {
  projects: any[];
  stats: {
    totalProjects: number;
    activeProjects: number;
    successfulProjects: number;
    totalRaised: number;
    totalBackers: number;
  };
  recentBackings: any[];
}

export function CreatorDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/crowdfunding/creator/dashboard');
      setDashboardData(response.data.data);
      if (response.data.data.projects.length > 0) {
        setSelectedProject(response.data.data.projects[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUpdate = async (projectId: string) => {
    navigate(`/crowdfunding/projects/${projectId}/update`);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-500',
      pending: 'bg-yellow-500',
      ongoing: 'bg-blue-500',
      successful: 'bg-green-500',
      failed: 'bg-red-500',
      cancelled: 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground">Manage your crowdfunding projects</p>
        </div>
        <Button onClick={() => navigate('/crowdfunding/create')}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.stats.totalProjects > 0 
                ? Math.round((dashboardData.stats.successfulProjects / dashboardData.stats.totalProjects) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.stats.successfulProjects} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Raised</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.stats.totalRaised)}</div>
            <p className="text-xs text-muted-foreground">All projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Backers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dashboardData.stats.totalBackers)}</div>
            <p className="text-xs text-muted-foreground">Unique supporters</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Management */}
      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects">My Projects</TabsTrigger>
          <TabsTrigger value="backings">Recent Backings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          {dashboardData.projects.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground mb-4">You haven't created any projects yet</p>
                <Button onClick={() => navigate('/crowdfunding/create')}>
                  Create Your First Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {dashboardData.projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle>{project.title}</CardTitle>
                        <CardDescription>
                          Created on {formatDate(project.createdAt)}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Progress</p>
                        <p className="text-lg font-semibold">
                          {Math.round((project.currentAmount / project.targetAmount) * 100)}%
                        </p>
                        <Progress 
                          value={(project.currentAmount / project.targetAmount) * 100} 
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Raised</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(project.currentAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          of {formatCurrency(project.targetAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Backers</p>
                        <p className="text-lg font-semibold">{project.backerCount}</p>
                        <p className="text-xs text-muted-foreground">supporters</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Days Left</p>
                        <p className="text-lg font-semibold">
                          {project.status === 'ongoing' ? calculateDaysLeft(project.endDate) : '-'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ends {formatDate(project.endDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/crowdfunding/projects/${project.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/crowdfunding/projects/${project.id}/edit`)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateUpdate(project.id)}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Post Update
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/crowdfunding/projects/${project.id}/backers`)}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Backers
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/crowdfunding/projects/${project.id}/analytics`)}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Analytics
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="backings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Backings</CardTitle>
              <CardDescription>Latest supporters across all your projects</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.recentBackings.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No backings yet</p>
              ) : (
                <div className="space-y-4">
                  {dashboardData.recentBackings.map((backing: any) => (
                    <div key={backing.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {backing.isAnonymous ? 'Anonymous' : backing.displayName || 'Backer'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {backing.project?.title}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(backing.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(backing.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Analytics</CardTitle>
              <CardDescription>Performance metrics and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                Analytics dashboard coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}