import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Users, 
  Calendar, 
  Target, 
  TrendingUp, 
  MessageSquare, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { CrowdfundingProjectDetail as ProjectDetail, CrowdfundingParticipation } from '@o4o/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import toast from 'react-hot-toast';

const CrowdfundingProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 프로젝트 상세 정보 조회
  const { data: projectData, isLoading } = useQuery({
    queryKey: ['crowdfunding-project', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/v1/crowdfunding-simple/projects/${id}`);
      return response.data;
    },
    enabled: !!id
  });

  const project: ProjectDetail = projectData?.data;

  // 참여 상태 조회
  const { data: participationData } = useQuery({
    queryKey: ['crowdfunding-participation', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/v1/crowdfunding-simple/projects/${id}/participation-status`);
      return response.data;
    },
    enabled: !!id
  });

  const userParticipation: CrowdfundingParticipation | null = participationData?.data;

  // 참여하기 mutation
  const joinMutation = useMutation({
    mutationFn: async () => {
      const response = await authClient.api.post(`/v1/crowdfunding-simple/projects/${id}/join`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('프로젝트에 참여했습니다!');
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-project', id] });
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-participation', id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '참여에 실패했습니다.');
    }
  });

  // 참여 취소 mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await authClient.api.post(`/v1/crowdfunding-simple/projects/${id}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('참여를 취소했습니다.');
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-project', id] });
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-participation', id] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '취소에 실패했습니다.');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-modern-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-16 h-16 text-modern-text-tertiary mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-modern-text-primary mb-2">
          프로젝트를 찾을 수 없습니다
        </h3>
        <p className="text-modern-text-secondary mb-4">
          요청하신 프로젝트가 존재하지 않거나 삭제되었습니다.
        </p>
        <Button onClick={() => navigate('/crowdfunding/projects')}>
          프로젝트 목록으로
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      recruiting: { label: '모집중', variant: 'default' as const, icon: Clock },
      in_progress: { label: '진행중', variant: 'secondary' as const, icon: TrendingUp },
      completed: { label: '완료', variant: 'outline' as const, icon: CheckCircle },
      cancelled: { label: '중단', variant: 'destructive' as const, icon: XCircle }
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

  const getRemainingDays = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const progress = calculateProgress(project.currentParticipantCount, project.targetParticipantCount);
  const remainingDays = getRemainingDays(project.endDate);
  const isActive = project.status === 'recruiting' && remainingDays > 0;
  const isParticipating = userParticipation?.status === 'joined';
  const canParticipate = isActive && !isParticipating;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => navigate('/crowdfunding/projects')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          프로젝트 목록
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant={"outline" as const}
            size={"sm" as const}
            onClick={() => navigate(`/crowdfunding/projects/${id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            수정
          </Button>
        </div>
      </div>

      {/* 프로젝트 기본 정보 */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-2xl">{project.title}</CardTitle>
                {getStatusBadge(project.status)}
              </div>
              <div className="flex items-center gap-4 text-sm text-modern-text-secondary">
                <span>개발사: {project.creatorName}</span>
                <span>•</span>
                <span>등록일: {formatDate(project.createdAt)}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 프로젝트 설명 */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">프로젝트 설명</h3>
                <div className="prose prose-sm max-w-none text-modern-text-secondary whitespace-pre-wrap">
                  {project.description}
                </div>
              </div>

              {/* 참여자 목록 */}
              {project.participants && project.participants.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">참여 매장 ({project.participants.length}개)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {project.participants.map((participant: any) => (
                      <div key={participant.id} className="flex items-center gap-3 p-3 bg-modern-bg-tertiary rounded-lg">
                        <div className="w-10 h-10 bg-modern-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {participant.vendorName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-modern-text-primary">{participant.vendorName}</p>
                          <p className="text-xs text-modern-text-secondary">
                            {formatDate(participant.joinedAt)} 참여
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 사이드바 - 프로젝트 정보 */}
            <div className="space-y-6">
              {/* 진행 현황 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-modern-primary" />
                    진행 현황
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-modern-text-secondary">참여 진행률</span>
                      <span className="font-medium text-modern-text-primary">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="w-full bg-modern-bg-tertiary rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
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

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-modern-text-primary">
                        {project.currentParticipantCount}
                      </p>
                      <p className="text-xs text-modern-text-secondary">현재 참여</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-modern-text-primary">
                        {project.targetParticipantCount}
                      </p>
                      <p className="text-xs text-modern-text-secondary">목표 참여</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-modern-text-tertiary" />
                        <span className="text-modern-text-secondary">남은 기간</span>
                      </div>
                      <span className="font-medium text-modern-text-primary">
                        {isActive ? `${remainingDays}일` : '종료됨'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-modern-text-tertiary" />
                        <span className="text-modern-text-secondary">참여 매장</span>
                      </div>
                      <span className="font-medium text-modern-text-primary">
                        {project.currentParticipantCount}개
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 참여 버튼 */}
              <Card>
                <CardContent className="p-4">
                  {isParticipating ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-modern-success">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">참여 중</span>
                      </div>
                      <Button
                        variant={"outline" as const}
                        className="w-full"
                        onClick={() => cancelMutation.mutate()}
                        disabled={cancelMutation.isPending}
                      >
                        {cancelMutation.isPending ? '처리 중...' : '참여 취소'}
                      </Button>
                    </div>
                  ) : canParticipate ? (
                    <Button
                      className="w-full"
                      onClick={() => joinMutation.mutate()}
                      disabled={joinMutation.isPending}
                    >
                      {joinMutation.isPending ? '처리 중...' : '프로젝트 참여하기'}
                    </Button>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 text-modern-text-secondary">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm">
                          {project.status === 'completed' ? '완료된 프로젝트입니다' :
                           project.status === 'cancelled' ? '중단된 프로젝트입니다' :
                           '참여 기간이 종료되었습니다'}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 포럼 링크 */}
              {project.forumLink && (
                <Card>
                  <CardContent className="p-4">
                    <Button
                      variant={"outline" as const}
                      className="w-full"
                      onClick={() => navigate(project.forumLink!)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      포럼에서 토론하기
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* 프로젝트 기간 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">프로젝트 기간</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-modern-text-secondary">시작일</span>
                    <span className="text-modern-text-primary">
                      {formatDate(project.startDate)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-modern-text-secondary">종료일</span>
                    <span className="text-modern-text-primary">
                      {formatDate(project.endDate)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CrowdfundingProjectDetail;