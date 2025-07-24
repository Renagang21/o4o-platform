import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Target, FileText, Link } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { CrowdfundingProjectFormData } from '@o4o/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';

const CrowdfundingProjectForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [formData, setFormData] = useState<CrowdfundingProjectFormData>({
    title: '',
    description: '',
    targetParticipantCount: 10,
    startDate: '',
    endDate: '',
    forumLink: ''
  });

  const [errors, setErrors] = useState<Partial<CrowdfundingProjectFormData>>({});

  // 수정 모드일 때 기존 데이터 조회
  const { data: projectData, isLoading } = useQuery({
    queryKey: ['crowdfunding-project', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/v1/crowdfunding-simple/projects/${id}`);
      return response.data;
    },
    enabled: isEditMode
  });

  // 프로젝트 생성 mutation
  const createMutation = useMutation({
    mutationFn: async (data: CrowdfundingProjectFormData) => {
      const response = await authClient.api.post('/v1/crowdfunding-simple/projects', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('프로젝트가 생성되었습니다!');
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-projects'] });
      navigate('/crowdfunding/projects');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '프로젝트 생성에 실패했습니다.');
    }
  });

  // 프로젝트 수정 mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CrowdfundingProjectFormData) => {
      const response = await authClient.api.put(`/v1/crowdfunding-simple/projects/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('프로젝트가 수정되었습니다!');
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-project', id] });
      queryClient.invalidateQueries({ queryKey: ['crowdfunding-projects'] });
      navigate(`/crowdfunding/projects/${id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || '프로젝트 수정에 실패했습니다.');
    }
  });

  // 수정 모드일 때 기존 데이터로 폼 초기화
  useEffect(() => {
    if (projectData?.data) {
      const project = projectData.data;
      setFormData({
        title: project.title,
        description: project.description,
        targetParticipantCount: project.targetParticipantCount,
        startDate: project.startDate,
        endDate: project.endDate,
        forumLink: project.forumLink || ''
      });
    }
  }, [projectData]);

  // 폼 유효성 검사
  const validateForm = (): boolean => {
    const newErrors: Partial<CrowdfundingProjectFormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = '프로젝트 제목을 입력하세요.';
    }

    if (!formData.description.trim()) {
      newErrors.description = '프로젝트 설명을 입력하세요.';
    }

    if (formData.targetParticipantCount < 1) {
      newErrors.targetParticipantCount = '목표 참여 매장 수는 1개 이상이어야 합니다.';
    }

    if (!formData.startDate) {
      newErrors.startDate = '시작일을 선택하세요.';
    }

    if (!formData.endDate) {
      newErrors.endDate = '종료일을 선택하세요.';
    }

    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      newErrors.endDate = '종료일은 시작일보다 늦어야 합니다.';
    }

    // 시작일이 과거인지 확인
    if (formData.startDate && new Date(formData.startDate) < new Date()) {
      newErrors.startDate = '시작일은 현재 날짜 이후여야 합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 폼 제출
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('입력한 정보를 확인해주세요.');
      return;
    }

    if (isEditMode) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  // 폼 데이터 변경
  const handleChange = (field: keyof CrowdfundingProjectFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 에러 상태 초기화
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // 오늘 날짜 (YYYY-MM-DD 형식)
  const today = new Date().toISOString().split('T')[0];

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-modern-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(isEditMode ? `/crowdfunding/projects/${id}` : '/crowdfunding/projects')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isEditMode ? '프로젝트 상세' : '프로젝트 목록'}
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-modern-text-primary">
            {isEditMode ? '프로젝트 수정' : '새 프로젝트 만들기'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-modern-primary" />
              프로젝트 기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">프로젝트 제목 *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="예: 친환경 포장재 대량 구매 프로젝트"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">프로젝트 설명 *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="프로젝트의 목적, 혜택, 예상 절감 비용 등을 상세히 설명해주세요..."
                rows={8}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">{errors.description}</p>
              )}
              <p className="text-sm text-modern-text-secondary mt-1">
                참여 매장이 이해하기 쉽도록 구체적인 혜택과 절감 효과를 포함해주세요.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 목표 및 기간 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-modern-primary" />
              목표 및 기간 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="targetParticipantCount">목표 참여 매장 수 *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="targetParticipantCount"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.targetParticipantCount}
                  onChange={(e) => handleChange('targetParticipantCount', parseInt(e.target.value) || 0)}
                  className={`max-w-xs ${errors.targetParticipantCount ? 'border-red-500' : ''}`}
                />
                <span className="text-modern-text-secondary">개 매장</span>
              </div>
              {errors.targetParticipantCount && (
                <p className="text-sm text-red-500 mt-1">{errors.targetParticipantCount}</p>
              )}
              <p className="text-sm text-modern-text-secondary mt-1">
                목표를 달성하면 비용 절감 효과를 얻을 수 있는 최소 참여 매장 수를 설정하세요.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">프로젝트 시작일 *</Label>
                <Input
                  id="startDate"
                  type="date"
                  min={today}
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className={errors.startDate ? 'border-red-500' : ''}
                />
                {errors.startDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>
                )}
              </div>

              <div>
                <Label htmlFor="endDate">프로젝트 종료일 *</Label>
                <Input
                  id="endDate"
                  type="date"
                  min={formData.startDate || today}
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  className={errors.endDate ? 'border-red-500' : ''}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 추가 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5 text-modern-primary" />
              추가 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="forumLink">포럼 링크 (선택)</Label>
              <Input
                id="forumLink"
                value={formData.forumLink}
                onChange={(e) => handleChange('forumLink', e.target.value)}
                placeholder="/forum/posts/project-discussion"
              />
              <p className="text-sm text-modern-text-secondary mt-1">
                참여자들이 토론할 수 있는 포럼 페이지 링크를 입력하세요.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEditMode ? `/crowdfunding/projects/${id}` : '/crowdfunding/projects')}
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {createMutation.isPending || updateMutation.isPending 
              ? '저장 중...' 
              : isEditMode 
                ? '수정하기' 
                : '프로젝트 만들기'
            }
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CrowdfundingProjectForm;