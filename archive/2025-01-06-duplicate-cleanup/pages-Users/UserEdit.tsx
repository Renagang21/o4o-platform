/**
 * UserEdit - 사용자 정보 수정 페이지
 * 기존 사용자 정보를 불러와 UserForm으로 수정
 */

import { useState, FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  UserCog,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';

import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/common/PageHeader';
import UserForm, { UserFormData } from '../../components/users/UserForm';
import apiClient from '../../api/base';
import { User } from '../../types/user';

// API 응답 타입
interface UpdateUserResponse {
  success: boolean;
  data: User;
  message: string;
}

interface GetUserResponse {
  success: boolean;
  data: User;
}

const UserEdit: FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 사용자 정보 조회
  const {
    data: userResponse,
    isLoading: isLoadingUser,
    error: userError
  } = useQuery<GetUserResponse, Error>({
    queryKey: ['user', id],
    queryFn: async () => {
      if (!id) throw new Error('사용자 ID가 필요합니다.');
      const response = await apiClient.get(`/users/${id}`);
      return response.data;
    },
    enabled: !!id,
    retry: 1
  });

  // 사용자 수정 뮤테이션
  const updateUserMutation = useMutation<UpdateUserResponse, Error, UserFormData>({
    mutationFn: async (userData: UserFormData) => {
      if (!id) throw new Error('사용자 ID가 필요합니다.');
      const response = await apiClient.put(`/users/${id}`, userData);
      return response.data;
    },
    onSuccess: (data) => {
      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      
      toast.success(
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          {data.message || '사용자 정보가 성공적으로 수정되었습니다.'}
        </div>,
        {
          duration: 4000,
          position: 'top-right'
        }
      );

      // 사용자 목록 페이지로 이동
      navigate('/users');
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : '사용자 정보 수정 중 오류가 발생했습니다.';
      
      toast.error(
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          {errorMessage}
        </div>,
        {
          duration: 5000,
          position: 'top-right'
        }
      );
    }
  });

  const handleSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    
    try {
      await updateUserMutation.mutateAsync(data);
    } catch (error: any) {
      // 에러는 mutation의 onError에서 처리됨
    // Error logging - use proper error handler
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // 변경사항 있을 시 사용자 확인 후 뒤로 가기
    if (window.confirm('수정 중인 내용이 있습니다. 정말 취소하시겠습니까?')) {
      navigate('/users');
    }
  };

  // 로딩 상태
  if (isLoadingUser) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">사용자 정보를 불러오는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // 에러 상태
  if (userError || !userResponse?.data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">사용자 정보 로드 실패</h3>
            <p className="text-gray-600 mb-4">
              {userError?.message || '사용자 정보를 불러올 수 없습니다.'}
            </p>
            <button
              onClick={() => navigate('/users')}
              className="wp-button wp-button-primary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로 돌아가기
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const user = userResponse.data;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <PageHeader
          title={`사용자 수정: ${user.name}`}
          subtitle={`${user.email} 사용자의 정보를 수정합니다`}
          actions={[
            {
              id: 'back-to-list',
              label: '목록으로',
              icon: <ArrowLeft className="w-4 h-4" />,
              onClick: () => navigate('/users'),
              variant: 'secondary'
            },
            {
              id: 'view-detail',
              label: '상세보기',
              onClick: () => navigate(`/users/${id}`),
              variant: 'secondary'
            }
          ]}
        />

        {/* 수정 안내 메시지 */}
        <div className="wp-card border-amber-200 bg-amber-50">
          <div className="wp-card-body">
            <div className="flex items-start space-x-3">
              <UserCog className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-900 mb-1">사용자 정보 수정</h4>
                <p className="text-sm text-amber-700">
                  기존 사용자의 정보를 수정할 수 있습니다. 
                  비밀번호는 입력하지 않으면 기존 비밀번호가 유지됩니다.
                  이메일 변경 시 중복 확인이 이루어집니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 사용자 수정 폼 */}
        <UserForm
          mode="edit"
          initialData={user}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting}
          className="max-w-4xl"
        />

        {/* 수정 가이드 */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title text-sm">수정 가이드</h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3 text-sm text-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">수정 주의사항</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• 이메일 변경 시 중복 확인 후 저장됩니다</li>
                    <li>• 비밀번호를 비워두면 기존 비밀번호가 유지됩니다</li>
                    <li>• 역할 변경 시 권한이 즉시 반영됩니다</li>
                    <li>• 상태 변경 시 사용자에게 알림이 발송될 수 있습니다</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">역할별 특징</h4>
                  <ul className="space-y-1 text-xs">
                    <li><span className="font-medium">고객:</span> 일반 구매 사용자</li>
                    <li><span className="font-medium">사업자:</span> 사업자 정보 필수 입력</li>
                    <li><span className="font-medium">제휴사:</span> 특별 할인 적용</li>
                    <li><span className="font-medium">관리자:</span> 시스템 전체 관리 권한</li>
                  </ul>
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-200">
                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        <strong>안전한 수정을 위한 권장사항:</strong>
                        <br />
                        중요한 정보(이메일, 역할, 상태) 변경 시에는 사용자에게 미리 안내하시기 바랍니다.
                        특히 관리자 권한 부여/회수 시에는 신중히 검토해주세요.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserEdit;