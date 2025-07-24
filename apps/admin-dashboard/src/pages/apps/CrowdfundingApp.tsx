import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Plus, 
  Eye, 
  Users, 
  Target, 
  Clock,
  MessageSquare,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const CrowdfundingApp: React.FC = () => {
  const navigate = useNavigate();

  // 크라우드펀딩 통계 조회
  const { data: statsData } = useQuery({
    queryKey: ['crowdfunding-stats'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/crowdfunding-simple/dashboard/stats');
      return response.data;
    }
  });

  const stats = statsData?.data;

  // 최근 프로젝트 조회
  const { data: recentProjectsData } = useQuery({
    queryKey: ['crowdfunding-recent'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/crowdfunding-simple/projects?limit=4&status=recruiting');
      return response.data;
    }
  });

  const recentProjects = recentProjectsData?.data || [];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      recruiting: { label: '모집중', variant: 'default' as const, icon: Clock },
      in_progress: { label: '진행중', variant: 'secondary' as const, icon: TrendingUp },
      completed: { label: '완료', variant: 'outline' as const, icon: CheckCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.recruiting;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const calculateProgress = (current: number, target: number) => {
    return target > 0 ? Math.min((current / target) * 100, 100) : 0;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <TrendingUp className="w-12 h-12 text-modern-primary" />
          <h1 className="text-4xl font-bold text-modern-text-primary">
            O4O 크라우드펀딩
          </h1>
        </div>
        <p className="text-lg text-modern-text-secondary max-w-3xl mx-auto">
          제품 개발사와 판매 매장을 연결하여 대량 구매로 비용을 절감하는 B2B 크라우드펀딩 플랫폼입니다.
          복잡한 결제 시스템 없이 간단한 참여 방식으로 운영됩니다.
        </p>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-modern-text-secondary">전체 프로젝트</p>
                  <p className="text-3xl font-bold text-modern-text-primary">{stats.totalProjects}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-modern-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-modern-text-secondary">활성 프로젝트</p>
                  <p className="text-3xl font-bold text-modern-text-primary">{stats.activeProjects}</p>
                </div>
                <Clock className="w-10 h-10 text-modern-warning opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-modern-text-secondary">완료 프로젝트</p>
                  <p className="text-3xl font-bold text-modern-text-primary">{stats.completedProjects}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-modern-success opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-modern-text-secondary">성공률</p>
                  <p className="text-3xl font-bold text-modern-text-primary">{stats.successRate}%</p>
                </div>
                <Target className="w-10 h-10 text-modern-primary opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 주요 기능 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 빠른 액션 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-modern-primary" />
              빠른 액션
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full justify-start text-left h-auto p-4"
              onClick={() => navigate('/crowdfunding/projects/new')}
            >
              <div className="flex items-center gap-3 w-full">
                <Plus className="w-5 h-5" />
                <div>
                  <p className="font-medium">새 프로젝트 만들기</p>
                  <p className="text-sm opacity-80">대량 구매 프로젝트를 시작하세요</p>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </div>
            </Button>
            
            <Button 
              variant="outline"
              className="w-full justify-start text-left h-auto p-4"
              onClick={() => navigate('/crowdfunding/projects')}
            >
              <div className="flex items-center gap-3 w-full">
                <Eye className="w-5 h-5" />
                <div>
                  <p className="font-medium">프로젝트 목록 보기</p>
                  <p className="text-sm text-modern-text-secondary">모든 진행 중인 프로젝트를 확인하세요</p>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* 시스템 특징 */}
        <Card>
          <CardHeader>
            <CardTitle>시스템 특징</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-modern-success mt-0.5" />
                <div>
                  <p className="font-medium text-modern-text-primary">간단한 B2B 모델</p>
                  <p className="text-sm text-modern-text-secondary">복잡한 결제 없이 참여 의사만 표시</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-modern-primary mt-0.5" />
                <div>
                  <p className="font-medium text-modern-text-primary">포럼 연동</p>
                  <p className="text-sm text-modern-text-secondary">기존 포럼 시스템으로 소통</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-modern-warning mt-0.5" />
                <div>
                  <p className="font-medium text-modern-text-primary">참여 추적</p>
                  <p className="text-sm text-modern-text-secondary">실시간 참여 현황 모니터링</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 최근 프로젝트 */}
      {recentProjects.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-modern-primary" />
              최근 모집 중인 프로젝트
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/crowdfunding/projects')}
            >
              전체 보기
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentProjects.map((project: any) => {
                const progress = calculateProgress(project.currentParticipantCount, project.targetParticipantCount);
                
                return (
                  <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium line-clamp-2 flex-1">
                            {project.title}
                          </h4>
                          {getStatusBadge(project.status)}
                        </div>
                        
                        <p className="text-sm text-modern-text-secondary line-clamp-2">
                          {project.description}
                        </p>
                        
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
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-sm text-modern-text-secondary">
                            <Users className="w-4 h-4" />
                            <span>{project.currentParticipantCount}명 참여</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/crowdfunding/projects/${project.id}`)}
                          >
                            상세보기
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 성공 사례 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-modern-success" />
            성공 사례
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-modern-success/10 rounded-full flex items-center justify-center mx-auto">
                <Target className="w-8 h-8 text-modern-success" />
              </div>
              <h4 className="font-medium text-modern-text-primary">친환경 포장재 프로젝트</h4>
              <p className="text-sm text-modern-text-secondary">125개 매장 참여 · 35% 비용 절감</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-modern-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Users className="w-8 h-8 text-modern-primary" />
              </div>
              <h4 className="font-medium text-modern-text-primary">프리미엄 건강식품</h4>
              <p className="text-sm text-modern-text-secondary">89개 매장 참여 · 28% 비용 절감</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-modern-warning/10 rounded-full flex items-center justify-center mx-auto">
                <TrendingUp className="w-8 h-8 text-modern-warning" />
              </div>
              <h4 className="font-medium text-modern-text-primary">계절 상품 대량구매</h4>
              <p className="text-sm text-modern-text-secondary">67개 매장 참여 · 42% 비용 절감</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="text-center space-y-4 py-8">
        <h2 className="text-2xl font-bold text-modern-text-primary">
          지금 시작하세요
        </h2>
        <p className="text-modern-text-secondary">
          여러 매장이 함께 참여하여 더 좋은 조건으로 상품을 구매할 수 있습니다.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button size="lg" onClick={() => navigate('/crowdfunding/projects/new')}>
            <Plus className="w-5 h-5 mr-2" />
            새 프로젝트 만들기
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/crowdfunding/projects')}>
            <Eye className="w-5 h-5 mr-2" />
            프로젝트 둘러보기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CrowdfundingApp;