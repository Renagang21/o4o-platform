import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Calendar, Users, TrendingUp, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { CrowdfundingProject, CrowdfundingProjectsQuery } from '@o4o/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CrowdfundingProjects: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 12;

  // 프로젝트 목록 조회
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['crowdfunding-projects', { search: searchTerm, status: statusFilter, page, limit }],
    queryFn: async () => {
      const params: CrowdfundingProjectsQuery = {
        page,
        limit,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter as any })
      };
      
      const queryString = new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString();

      const response = await authClient.api.get(`/v1/crowdfunding-simple/projects?${queryString}`);
      return response.data;
    }
  });

  const projects: CrowdfundingProject[] = projectsData?.data || [];
  const pagination = projectsData?.pagination;

  // 프로젝트 통계 조회
  const { data: statsData } = useQuery({
    queryKey: ['crowdfunding-stats'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/crowdfunding-simple/dashboard/stats');
      return response.data;
    }
  });

  const stats = statsData?.data;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      recruiting: { label: '모집중', variant: 'default' as const, color: 'bg-blue-500' },
      in_progress: { label: '진행중', variant: 'secondary' as const, color: 'bg-yellow-500' },
      completed: { label: '완료', variant: 'outline' as const, color: 'bg-green-500' },
      cancelled: { label: '중단', variant: 'destructive' as const, color: 'bg-red-500' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.recruiting;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateProgress = (current: number, target: number) => {
    return target > 0 ? Math.min((current / target) * 100, 100) : 0;
  };

  const getRemainingDays = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-modern-primary" />
            크라우드펀딩 프로젝트
          </h1>
          <p className="text-modern-text-secondary mt-1">
            제품 개발사와 판매자를 연결하여 비용을 절감하는 B2B 크라우드펀딩
          </p>
        </div>
        <Button onClick={() => navigate('/crowdfunding/projects/new')}>
          <Plus className="w-4 h-4 mr-2" />
          새 프로젝트
        </Button>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-modern-text-secondary">전체 프로젝트</p>
                  <p className="text-2xl font-bold text-modern-text-primary">{stats.totalProjects}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-modern-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-modern-text-secondary">활성 프로젝트</p>
                  <p className="text-2xl font-bold text-modern-primary">{stats.activeProjects}</p>
                </div>
                <Clock className="w-8 h-8 text-modern-warning opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-modern-text-secondary">완료 프로젝트</p>
                  <p className="text-2xl font-bold text-modern-primary">{stats.completedProjects}</p>
                </div>
                <Badge className="w-8 h-8 text-modern-success opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-modern-text-secondary">성공률</p>
                  <p className="text-2xl font-bold text-modern-text-primary">{stats.successRate}%</p>
                </div>
                <Users className="w-8 h-8 text-modern-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 필터 및 검색 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-modern-text-tertiary w-5 h-5" />
            <Input
              type="text"
              placeholder="프로젝트명, 설명, 개발사명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-modern-text-secondary" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
          >
            <option value="all">모든 상태</option>
            <option value="recruiting">모집중</option>
            <option value="in_progress">진행중</option>
            <option value="completed">완료</option>
            <option value="cancelled">중단</option>
          </select>
        </div>
      </div>

      {/* 프로젝트 목록 */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-4 bg-modern-bg-tertiary rounded w-3/4"></div>
                    <div className="h-3 bg-modern-bg-tertiary rounded w-1/2"></div>
                    <div className="h-20 bg-modern-bg-tertiary rounded"></div>
                    <div className="flex justify-between">
                      <div className="h-3 bg-modern-bg-tertiary rounded w-1/4"></div>
                      <div className="h-3 bg-modern-bg-tertiary rounded w-1/4"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <TrendingUp className="w-16 h-16 text-modern-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-modern-text-primary mb-2">
                프로젝트가 없습니다
              </h3>
              <p className="text-modern-text-secondary mb-4">
                첫 번째 크라우드펀딩 프로젝트를 만들어보세요!
              </p>
              <Button onClick={() => navigate('/crowdfunding/projects/new')}>
                <Plus className="w-4 h-4 mr-2" />
                새 프로젝트 만들기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const progress = calculateProgress(project.currentParticipantCount, project.targetParticipantCount);
              const remainingDays = getRemainingDays(project.endDate);
              const isActive = project.status === 'recruiting' && remainingDays > 0;

              return (
                <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2 mb-2">
                          {project.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-modern-text-secondary">
                          <span>by {project.creatorName}</span>
                          {getStatusBadge(project.status)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 설명 */}
                      <p className="text-sm text-modern-text-secondary line-clamp-3">
                        {project.description}
                      </p>

                      {/* 진행률 */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-modern-text-secondary">진행률</span>
                          <span className="font-medium text-modern-text-primary">
                            {project.currentParticipantCount}/{project.targetParticipantCount} ({Math.round(progress)}%)
                          </span>
                        </div>
                        <div className="w-full bg-modern-bg-tertiary rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              progress >= 100 
                                ? 'bg-modern-success' 
                                : progress >= 50 
                                ? 'bg-modern-primary' 
                                : 'bg-modern-warning'
                            }`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* 메타 정보 */}
                      <div className="flex items-center justify-between text-sm text-modern-text-secondary">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {isActive ? `${remainingDays}일 남음` : '종료'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{project.currentParticipantCount}명 참여</span>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/crowdfunding/projects/${project.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          상세보기
                        </Button>
                        {project.forumLink && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(project.forumLink!)}
                          >
                            포럼
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 페이지네이션 */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              이전
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(
                  pagination.totalPages - 4, 
                  Math.max(1, page - 2)
                )) + i;
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            >
              다음
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrowdfundingProjects;