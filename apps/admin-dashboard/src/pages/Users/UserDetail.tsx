/**
 * UserDetail - 사용자 상세 정보 조회 페이지
 * 읽기 전용 사용자 정보 표시
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  Shield,
  Building,
  MapPin,
  ArrowLeft,
  Edit3,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Pause
} from 'lucide-react';

import AdminLayout from '../../components/layout/AdminLayout';
import PageHeader from '../../components/common/PageHeader';
import apiClient from '../../api/base';
import { User, ROLE_LABELS, STATUS_LABELS } from '../../types/user';

// API 응답 타입
interface GetUserResponse {
  success: boolean;
  data: User;
}

const UserDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // 사용자 정보 조회
  const {
    data: userResponse,
    isLoading,
    error,
    refetch
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

  // 상태별 아이콘 및 색상 매핑
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-4 h-4" />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200'
        };
      case 'approved':
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200'
        };
      case 'rejected':
        return {
          icon: <XCircle className="w-4 h-4" />,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200'
        };
      case 'suspended':
        return {
          icon: <Pause className="w-4 h-4" />,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          borderColor: 'border-orange-200'
        };
      default:
        return {
          icon: <Clock className="w-4 h-4" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200'
        };
    }
  };

  // 로딩 상태
  if (isLoading) {
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
  if (error || !userResponse?.data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">사용자 정보 로드 실패</h3>
            <p className="text-gray-600 mb-4">
              {error?.message || '사용자 정보를 불러올 수 없습니다.'}
            </p>
            <div className="space-x-3">
              <button
                onClick={() => refetch()}
                className="wp-button wp-button-secondary"
              >
                다시 시도
              </button>
              <button
                onClick={() => navigate('/users')}
                className="wp-button wp-button-primary"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                목록으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const user = userResponse.data;
  const statusDisplay = getStatusDisplay(user.status);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <PageHeader
          title={`사용자 상세: ${user.name}`}
          subtitle={`${user.email} 사용자의 상세 정보`}
          actions={[
            {
              id: 'back-to-list',
              label: '목록으로',
              icon: <ArrowLeft className="w-4 h-4" />,
              onClick: () => navigate('/users'),
              variant: 'secondary'
            },
            {
              id: 'edit-user',
              label: '수정하기',
              icon: <Edit3 className="w-4 h-4" />,
              onClick: () => navigate(`/users/${id}/edit`),
              variant: 'primary'
            }
          ]}
        />

        {/* 사용자 기본 정보 */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center">
              <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
              기본 정보
            </h3>
          </div>
          <div className="wp-card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 이름 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">이름</label>
                <p className="text-sm text-gray-900 bg-gray-50 rounded px-3 py-2">
                  {user.name}
                </p>
              </div>

              {/* 이메일 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Mail className="w-4 h-4 mr-1" />
                  이메일
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 rounded px-3 py-2">
                  {user.email}
                </p>
              </div>

              {/* 전화번호 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  전화번호
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 rounded px-3 py-2">
                  {user.phone || '등록되지 않음'}
                </p>
              </div>

              {/* 가입일 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  가입일
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 rounded px-3 py-2">
                  {format(new Date(user.createdAt), 'PPP', { locale: ko })}
                </p>
              </div>

              {/* 최근 수정일 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">최근 수정일</label>
                <p className="text-sm text-gray-900 bg-gray-50 rounded px-3 py-2">
                  {format(new Date(user.updatedAt), 'PPP', { locale: ko })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 권한 및 상태 */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title flex items-center">
              <Shield className="w-5 h-5 mr-2 text-purple-600" />
              권한 및 상태
            </h3>
          </div>
          <div className="wp-card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 역할 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">역할</label>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
              </div>

              {/* 상태 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">상태</label>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusDisplay.bgColor} ${statusDisplay.color} border ${statusDisplay.borderColor}`}>
                    {statusDisplay.icon}
                    <span className="ml-1">{STATUS_LABELS[user.status]}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 사업자 정보 (사업자 역할인 경우에만 표시) */}
        {user.role === 'business' && user.businessInfo && (
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title flex items-center">
                <Building className="w-5 h-5 mr-2 text-green-600" />
                사업자 정보
              </h3>
            </div>
            <div className="wp-card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 사업자명 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">사업자명</label>
                  <p className="text-sm text-gray-900 bg-gray-50 rounded px-3 py-2">
                    {user.businessInfo.businessName || '등록되지 않음'}
                  </p>
                </div>

                {/* 사업자 유형 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">사업자 유형</label>
                  <p className="text-sm text-gray-900 bg-gray-50 rounded px-3 py-2">
                    {user.businessInfo.businessType || '등록되지 않음'}
                  </p>
                </div>

                {/* 사업자등록번호 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">사업자등록번호</label>
                  <p className="text-sm text-gray-900 bg-gray-50 rounded px-3 py-2">
                    {user.businessInfo.businessNumber || '등록되지 않음'}
                  </p>
                </div>

                {/* 대표자명 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">대표자명</label>
                  <p className="text-sm text-gray-900 bg-gray-50 rounded px-3 py-2">
                    {user.businessInfo.representativeName || '등록되지 않음'}
                  </p>
                </div>

                {/* 사업장 주소 */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    사업장 주소
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 rounded px-3 py-2">
                    {user.businessInfo.businessAddress || '등록되지 않음'}
                  </p>
                </div>

                {/* 연락처 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    사업장 연락처
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 rounded px-3 py-2">
                    {user.businessInfo.contactPhone || '등록되지 않음'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 추가 정보 */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title text-sm">시스템 정보</h3>
          </div>
          <div className="wp-card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">사용자 ID:</span>
                <span className="ml-2 text-gray-900 font-mono">{user.id}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">마지막 로그인:</span>
                <span className="ml-2 text-gray-900">
                  {user.lastLoginAt 
                    ? format(new Date(user.lastLoginAt), 'PPpp', { locale: ko })
                    : '로그인 기록 없음'
                  }
                </span>
              </div>
            </div>

            {/* 상태별 안내 메시지 */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              {user.status === 'pending' && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                  <p className="text-sm text-yellow-700">
                    <strong>승인 대기 중:</strong> 이 사용자는 아직 승인되지 않았습니다. 
                    정보 확인 후 승인 처리해 주세요.
                  </p>
                </div>
              )}
              {user.status === 'rejected' && (
                <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded">
                  <p className="text-sm text-red-700">
                    <strong>가입 거부됨:</strong> 이 사용자의 가입이 거부되었습니다. 
                    필요시 다시 승인으로 변경할 수 있습니다.
                  </p>
                </div>
              )}
              {user.status === 'suspended' && (
                <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded">
                  <p className="text-sm text-orange-700">
                    <strong>이용 정지:</strong> 이 사용자는 현재 이용이 정지된 상태입니다. 
                    정지 해제 시 다시 서비스를 이용할 수 있습니다.
                  </p>
                </div>
              )}
              {user.status === 'approved' && (
                <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded">
                  <p className="text-sm text-green-700">
                    <strong>정상 이용 중:</strong> 이 사용자는 현재 정상적으로 서비스를 이용하고 있습니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserDetail;