import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, Database, Loader, AlertTriangle, Play, Zap, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authClient } from '@o4o/auth-client';
import PageHeader from '../../components/common/PageHeader';

interface SystemStatus {
  cpts: {
    ds_supplier: string;
    ds_product: string;
    ds_commission_policy: string;
  };
  records: {
    suppliers: number;
    partners: number;
    products: number;
    commissions: number;
  };
  fieldGroups: number;
  systemReady: boolean;
}

const SystemSetup: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setLoading(true);
    try {
      // Fetch actual system status from API using authClient
      const response = await authClient.api.get('/admin/dropshipping/system-status');
      if (response.data) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error('Error checking system status:', error);
      toast.error('시스템 상태 확인 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  const initializeSystem = async () => {
    if (!confirm('드롭쉬핑 시스템을 초기화하시겠습니까? CPT와 ACF 필드가 생성됩니다.')) return;

    setInitializing(true);
    try {
      await authClient.api.post('/admin/dropshipping/initialize');
      toast.success('시스템이 성공적으로 초기화되었습니다');
      await checkSystemStatus();
    } catch (error) {
      console.error('Error initializing system:', error);
      toast.error('시스템 초기화에 실패했습니다');
    } finally {
      setInitializing(false);
    }
  };

  const createSampleData = async () => {
    if (!confirm('샘플 데이터를 생성하시겠습니까? 테스트용 공급자, 파트너, 상품이 생성됩니다.')) return;

    setSeeding(true);
    try {
      const response = await authClient.api.post('/admin/dropshipping/seed');
      const data = response.data;
      toast.success(`샘플 데이터가 생성되었습니다:
        공급자 ${data.suppliers || 0}개,
        파트너 ${data.partners || 0}개,
        상품 ${data.products || 0}개`);
      await checkSystemStatus();
    } catch (error) {
      console.error('Error creating sample data:', error);
      toast.error('샘플 데이터 생성에 실패했습니다');
    } finally {
      setSeeding(false);
    }
  };

  const getCPTStatus = (status: string) => {
    if (status === 'installed') {
      return (
        <span className="flex items-center text-green-600">
          <CheckCircle className="h-4 w-4 mr-1" />
          설치됨
        </span>
      );
    }
    return (
      <span className="flex items-center text-red-600">
        <XCircle className="h-4 w-4 mr-1" />
        미설치
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-o4o-blue" />
      </div>
    );
  }

  const headerActions = [
    { id: 'screen-options', label: 'Screen Options', icon: <Settings className="w-4 h-4" />, onClick: () => {}, variant: 'secondary' as const },
    { id: 'refresh', label: '새로고침', icon: <RefreshCw className="w-4 h-4" />, onClick: checkSystemStatus, variant: 'secondary' as const },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="드롭쉬핑 시스템 설정"
        subtitle="CPT/ACF 기반 드롭쉬핑 플랫폼 초기화 및 관리"
        actions={headerActions}
      />

      {/* System Status Card */}
      <div className="bg-white border border-gray-300 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <Database className="h-5 w-5 mr-2" />
            시스템 상태
          </h2>
          <button
            onClick={checkSystemStatus}
            className="p-2 text-o4o-blue hover:bg-blue-50 rounded transition"
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

            {/* CPT Status Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-3">Custom Post Types</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>공급자 (ds_supplier)</span>
                    {getCPTStatus(status?.cpts?.ds_supplier || 'not_installed')}
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>상품 (ds_product)</span>
                    {getCPTStatus(status?.cpts?.ds_product || 'not_installed')}
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>수수료 정책 (ds_commission_policy)</span>
                    {getCPTStatus(status?.cpts?.ds_commission_policy || 'not_installed')}
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-3">데이터 현황</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>등록된 공급자</span>
                    <span className="font-medium">{status?.records?.suppliers || 0}개</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>등록된 파트너</span>
                    <span className="font-medium">{status?.records?.partners || 0}개</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>등록된 상품</span>
                    <span className="font-medium">{status?.records?.products || 0}개</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>수수료 정책</span>
                    <span className="font-medium">{status?.records?.commissions || 0}개</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Field Groups Status */}
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm font-medium text-blue-900">ACF 필드 그룹</span>
              <span className="text-sm font-bold text-blue-900">{status.fieldGroups}개 등록</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Initialize System */}
        <div className="bg-white border border-gray-300 rounded-lg p-6">
          <div className="mb-4">
            <Zap className="h-8 w-8 text-o4o-blue mb-2" />
            <h3 className="font-semibold text-lg">시스템 초기화</h3>
            <p className="text-sm text-gray-600 mt-1">
              CPT와 ACF 필드를 생성하여 시스템을 초기화합니다
            </p>
          </div>
          <button
            onClick={initializeSystem}
            disabled={initializing || (status?.systemReady ?? false)}
            className={`w-full py-2 px-4 rounded font-medium transition ${
              status?.systemReady 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-o4o-blue text-white hover:bg-o4o-blue-hover'
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
            <Database className="h-8 w-8 text-green-600 mb-2" />
            <h3 className="font-semibold text-lg">샘플 데이터 생성</h3>
            <p className="text-sm text-gray-600 mt-1">
              테스트용 공급자, 파트너, 상품 데이터를 생성합니다
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
            <h3 className="font-semibold text-lg">대시보드 이동</h3>
            <p className="text-sm text-gray-600 mt-1">
              드롭쉬핑 관리 대시보드로 이동합니다
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/dropshipping/products'}
            disabled={!status?.systemReady}
            className={`w-full py-2 px-4 rounded font-medium transition ${
              !status?.systemReady
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            대시보드로 이동
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
          <li>시스템 초기화는 최초 1회만 실행하시면 됩니다</li>
          <li>샘플 데이터는 테스트 목적으로만 사용하세요</li>
          <li>실제 운영 시에는 샘플 데이터를 삭제하고 실제 데이터를 입력하세요</li>
          <li>모든 데이터는 WordPress CPT 구조로 저장됩니다</li>
        </ul>
      </div>
    </div>
  );
};

export default SystemSetup;