/**
 * Account Center Dashboard
 * 사용자 프로필 + 서비스 목록 + 서비스 이동/가입
 *
 * WO-O4O-ACCOUNT-CENTER-UI-V1
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import UserProfileCard from '../components/UserProfileCard';
import ServiceCard from '../components/ServiceCard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface ServiceInfo {
  key: string;
  name: string;
  domain: string;
  description: string;
  joinEnabled: boolean;
  membership: { status: string } | null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchServices = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/services`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.data?.services) {
        setServices(data.data.services);
      }
    } catch {
      setError('서비스 목록을 불러올 수 없습니다.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleOpen = async (serviceKey: string) => {
    setActionLoading(serviceKey);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetServiceKey: serviceKey }),
      });
      const data = await response.json();
      if (data.success && data.data?.targetUrl) {
        window.location.href = data.data.targetUrl;
        return;
      }
      setError(data.error || '서비스 이동에 실패했습니다.');
    } catch {
      setError('서비스 이동 중 오류가 발생했습니다.');
    }
    setActionLoading(null);
  };

  const handleJoin = async (serviceKey: string) => {
    setActionLoading(serviceKey);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/services/${serviceKey}/join`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        // Refresh service list to reflect new membership
        await fetchServices();
      } else {
        setError(data.error || '서비스 가입에 실패했습니다.');
      }
    } catch {
      setError('서비스 가입 중 오류가 발생했습니다.');
    }
    setActionLoading(null);
  };

  if (!user) return null;

  const myServices = services.filter(s => s.membership?.status === 'active');
  const availableServices = services.filter(s => !s.membership || s.membership.status !== 'active');

  return (
    <div className="space-y-8">
      {/* User Profile */}
      <UserProfileCard user={user} />

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">닫기</button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-center py-8">서비스 목록 로딩 중...</p>
      ) : (
        <>
          {/* My Services */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">내 서비스</h2>
            {myServices.length === 0 ? (
              <p className="text-sm text-gray-500">가입된 서비스가 없습니다. 아래에서 서비스에 가입해보세요.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myServices.map(service => (
                  <ServiceCard
                    key={service.key}
                    service={service}
                    onOpen={handleOpen}
                    onJoin={handleJoin}
                    loading={actionLoading === service.key}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Available Services */}
          {availableServices.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">이용 가능한 서비스</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableServices.map(service => (
                  <ServiceCard
                    key={service.key}
                    service={service}
                    onOpen={handleOpen}
                    onJoin={handleJoin}
                    loading={actionLoading === service.key}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
