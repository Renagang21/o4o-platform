/**
 * UserCreate - 새로운 사용자 생성 페이지
 * UserForm을 사용한 사용자 정보 생성
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  UserPlus,
  ArrowLeft,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/common/PageHeader';
import UserForm, { UserFormData } from '../../components/users/UserForm';
import apiClient from '../../api/base';

// API 응답 타입
interface CreateUserResponse {
  success: boolean;
  data: any;
  message: string;
}

const UserCreate: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 사용자 생성 뮤테이션
  const createUserMutation = useMutation<CreateUserResponse, Error, UserFormData>({
    mutationFn: async (userData: UserFormData) => {
      const response = await apiClient.post('/users', userData);
      return response.data;
    },
    onSuccess: (data) => {
      // 사용자 목록 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['users'] });
      
      toast.success(
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          {data.message || '새 사용자가 성공적으로 생성되었습니다.'}
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
      const errorMessage = error instanceof Error ? error.message : '사용자 생성 중 오류가 발생했습니다.';
      
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
      await createUserMutation.mutateAsync(data);
    } catch (error) {
      // 에러는 mutation의 onError에서 처리됨
      console.error('Create user error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // 변경사항 있을 시 사용자 확인 후 뒤로 가기
    if (window.confirm('작성 중인 내용이 있습니다. 정말 취소하시겠습니까?')) {
      navigate('/users');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <PageHeader
          title="새 사용자 추가"
          subtitle="새로운 사용자 정보를 추가합니다"
          actions={[
            {
              id: 'back-to-list',
              label: '목록으로',
              icon: <ArrowLeft className="w-4 h-4" />,
              onClick: () => navigate('/users'),
              variant: 'secondary'
            }
          ]}
        />

        {/* 안내 메시지 */}
        <div className="wp-card border-blue-200 bg-blue-50">
          <div className="wp-card-body">
            <div className="flex items-start space-x-3">
              <UserPlus className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">새 사용자 생성</h4>
                <p className="text-sm text-blue-700">
                  아래 양식을 작성하여 사용자 정보를 생성할 수 있습니다. 
                  빨간 별표(<span className="text-red-500">*</span>)가 있는 항목은 필수입니다.
                  역할에 따라 추가 정보 입력이 필요할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 사용자 생성 폼 */}
        <UserForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting}
          className="max-w-4xl"
        />

        {/* 도움말 정보 */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title text-sm">작성 가이드</h3>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3 text-sm text-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">입력 형식</h4>
                  <ul className="space-y-1 text-xs">
                    <li><span className="font-medium">이름:</span> 한글 또는 영문 이름</li>
                    <li><span className="font-medium">역할:</span> 고객, 사업자, 관리자</li>
                    <li><span className="font-medium">전화:</span> 전화번호 형식 준수</li>
                    <li><span className="font-medium">이메일:</span> 올바른 이메일 형식</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">비밀번호 요구사항</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• 최소 8자 이상</li>
                    <li>• 대문자 포함</li>
                    <li>• 소문자 포함</li>
                    <li>• 숫자와 특수문자 포함 (@$!%*?&)</li>
                  </ul>
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">상태 정보</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                    <span><strong>대기중:</strong> 승인 대기 상태</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                    <span><strong>승인됨:</strong> 정상적으로 이용 가능 상태</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                    <span><strong>거부됨:</strong> 가입 거부</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-orange-400 rounded-full mr-2"></div>
                    <span><strong>정지됨:</strong> 일시 이용 정지</span>
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

export default UserCreate;