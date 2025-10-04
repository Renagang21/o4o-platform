import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, MessageSquare, Loader, AlertTriangle, Play, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient as api } from '../../services/api';

interface ForumSystemStatus {
  entities: {
    forum_category: string;
    forum_post: string;
    forum_comment: string;
    forum_tag: string;
  };
  records: {
    categories: number;
    posts: number;
    comments: number;
    tags: number;
  };
  tablesReady: number;
  systemReady: boolean;
}

const ForumSystemSetup: React.FC = () => {
  const [status, setStatus] = useState<ForumSystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/forum/system-status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        console.error('Failed to fetch forum system status');
        toast.error('포럼 시스템 상태 확인 실패');
      }
    } catch (error) {
      console.error('Error checking forum system status:', error);
      toast.error('포럼 시스템 상태 확인 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  const initializeSystem = async () => {
    if (!confirm('포럼 시스템을 초기화하시겠습니까? 데이터베이스 연결을 확인합니다.')) return;

    setInitializing(true);
    try {
      const response = await fetch('/api/admin/forum/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success('포럼 시스템이 성공적으로 초기화되었습니다');
        await checkSystemStatus();
      } else {
        toast.error('포럼 시스템 초기화에 실패했습니다');
      }
    } catch (error) {
      console.error('Error initializing forum system:', error);
      toast.error('포럼 시스템 초기화에 실패했습니다');
    } finally {
      setInitializing(false);
    }
  };

  const createSampleData = async () => {
    if (!confirm('포럼 샘플 데이터를 생성하시겠습니까? 테스트용 카테고리, 게시글, 사용자가 생성됩니다.')) return;

    setSeeding(true);
    try {
      const response = await fetch('/api/admin/forum/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`포럼 샘플 데이터가 생성되었습니다: 
          카테고리 ${data.categories || 0}개, 
          사용자 ${data.users || 0}명, 
          태그 ${data.tags || 0}개`);
        await checkSystemStatus();
      } else {
        toast.error('포럼 샘플 데이터 생성에 실패했습니다');
      }
    } catch (error) {
      console.error('Error creating forum sample data:', error);
      toast.error('포럼 샘플 데이터 생성에 실패했습니다');
    } finally {
      setSeeding(false);
    }
  };

  const getCPTStatus = (status: string) => {
    if (status === 'active') {
      return (
        <span className="flex items-center text-green-600">
          <CheckCircle className="h-4 w-4 mr-1" />
          활성
        </span>
      );
    }
    return (
      <span className="flex items-center text-red-600">
        <XCircle className="h-4 w-4 mr-1" />
        비활성
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-wordpress-blue" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">포럼 시스템 설정</h1>
        <p className="text-gray-600">CPT/ACF 기반 포럼 플랫폼 초기화 및 관리</p>
      </div>

      {/* System Status Card */}
      <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            포럼 시스템 상태
          </h2>
          <button
            onClick={checkSystemStatus}
            className="p-2 text-wordpress-blue hover:bg-blue-50 rounded transition"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {status && (
          <div className="space-y-4">
            {/* Overall Status */}
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-medium">전체 시스템 상태</span>
                {status?.systemReady ? (
                  <span className="flex items-center text-green-600 font-medium">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    준비 완료
                  </span>
                ) : (
                  <span className="flex items-center text-yellow-600 font-medium">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    초기화 필요
                  </span>
                )}
              </div>
            </div>

            {/* Entity Status Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-3">Database Entities</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>카테고리 (ForumCategory)</span>
                    {getCPTStatus(status?.entities?.forum_category || 'not_active')}
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>게시글 (ForumPost)</span>
                    {getCPTStatus(status?.entities?.forum_post || 'not_active')}
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>댓글 (ForumComment)</span>
                    {getCPTStatus(status?.entities?.forum_comment || 'not_active')}
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>태그 (ForumTag)</span>
                    {getCPTStatus(status?.entities?.forum_tag || 'not_active')}
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-3">데이터 현황</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>포럼 카테고리</span>
                    <span className="font-medium">{status?.records?.categories || 0}개</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>게시글</span>
                    <span className="font-medium">{status?.records?.posts || 0}개</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>댓글</span>
                    <span className="font-medium">{status?.records?.comments || 0}개</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>태그</span>
                    <span className="font-medium">{status?.records?.tags || 0}개</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Database Tables Status */}
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-900">데이터베이스 테이블</span>
              <span className="text-sm font-bold text-blue-900">{status.tablesReady}개 준비</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Initialize System */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="mb-4">
            <Zap className="h-8 w-8 text-wordpress-blue mb-2" />
            <h3 className="font-semibold text-lg">시스템 초기화</h3>
            <p className="text-sm text-gray-600 mt-1">
              포럼 데이터베이스 연결을 확인하고 시스템을 초기화합니다
            </p>
          </div>
          <button
            onClick={initializeSystem}
            disabled={initializing || (status?.systemReady ?? false)}
            className={`w-full py-2 px-4 rounded font-medium transition ${
              status?.systemReady 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-wordpress-blue text-white hover:bg-wordpress-blue-hover'
            }`}
          >
            {initializing ? (
              <span className="flex items-center justify-center">
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                초기화 중...
              </span>
            ) : status?.systemReady ? (
              '초기화 완료'
            ) : (
              '초기화 실행'
            )}
          </button>
        </div>

        {/* Create Sample Data */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="mb-4">
            <MessageSquare className="h-8 w-8 text-green-600 mb-2" />
            <h3 className="font-semibold text-lg">샘플 데이터 생성</h3>
            <p className="text-sm text-gray-600 mt-1">
              테스트용 포럼 카테고리, 사용자, 태그를 생성합니다
            </p>
          </div>
          <button
            onClick={createSampleData}
            disabled={seeding || !status?.systemReady}
            className={`w-full py-2 px-4 rounded font-medium transition ${
              !status?.systemReady
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {seeding ? (
              <span className="flex items-center justify-center">
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                생성 중...
              </span>
            ) : (
              '샘플 데이터 생성'
            )}
          </button>
        </div>

        {/* View Dashboard */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="mb-4">
            <Play className="h-8 w-8 text-purple-600 mb-2" />
            <h3 className="font-semibold text-lg">포럼 관리</h3>
            <p className="text-sm text-gray-600 mt-1">
              포럼 관리 대시보드로 이동합니다
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/forum/categories'}
            disabled={!status?.systemReady}
            className={`w-full py-2 px-4 rounded font-medium transition ${
              !status?.systemReady
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            포럼 관리로 이동
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2" />
          중요 안내
        </h4>
        <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
          <li>포럼 시스템 초기화는 최초 1회만 실행하시면 됩니다</li>
          <li>샘플 데이터는 테스트 목적으로만 사용하세요</li>
          <li>실제 운영 시에는 샘플 데이터를 삭제하고 실제 데이터를 입력하세요</li>
          <li>모든 데이터는 PostgreSQL 데이터베이스에 저장됩니다</li>
        </ul>
      </div>
    </div>
  );
};

export default ForumSystemSetup;