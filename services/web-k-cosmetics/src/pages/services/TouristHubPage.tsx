/**
 * TouristHubPage - 관광객 허브 페이지
 * Route: /services/tourists
 *
 * 관광객, 콘텐츠, 매장을 연결하는 허브:
 * - 연결된 매장 현황
 * - 관광객 트래픽 분석
 * - 콘텐츠 연동 관리
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  MapPin,
  Users,
  TrendingUp,
  Store,
  Camera,
  Calendar,
  ArrowRight,
  Loader2,
  CheckCircle
} from '@/components/icons';
import { useAuth } from '../../contexts';
import { AiSummaryButton } from '../../components/ai';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface ConnectedStore {
  id: string;
  name: string;
  location: string;
  rating: number;
  visitorCount: number;
  contentCount: number;
  isActive: boolean;
}

interface TouristStats {
  totalVisitors: number;
  todayVisitors: number;
  weeklyGrowth: number;
  topCountries: { country: string; percentage: number }[];
}

export default function TouristHubPage() {
  const { isAuthenticated } = useAuth();
  const [stores, setStores] = useState<ConnectedStore[]>([]);
  const [stats, setStats] = useState<TouristStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [storesResponse, statsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/cosmetics/tourist-hub/stores`, {
            credentials: 'include',
          }),
          fetch(`${API_BASE_URL}/api/v1/cosmetics/tourist-hub/stats`, {
            credentials: 'include',
          }),
        ]);

        if (storesResponse.ok) {
          const storesData = await storesResponse.json();
          setStores(storesData.data || []);
        } else {
          setStores([]);
        }

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData.data || null);
        } else {
          setStats(null);
        }
      } catch {
        setStores([]);
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                <Globe className="w-4 h-4" />
                Tourist Hub
              </div>
              <h1 className="text-3xl font-bold mb-2">관광객 허브</h1>
              <p className="text-slate-300">
                관광객·콘텐츠·매장을 연결하는 K-Beauty 네트워크
              </p>
            </div>
            <AiSummaryButton contextLabel="관광객 허브 현황" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm text-slate-500">총 방문자</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {stats?.totalVisitors?.toLocaleString() || '-'}
                </p>
                <p className="text-sm text-slate-500 mt-1">누적 관광객</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm text-slate-500">오늘 방문</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {stats?.todayVisitors ?? '-'}
                </p>
                {stats?.weeklyGrowth !== undefined && (
                  <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +{stats.weeklyGrowth}% 주간
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Store className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm text-slate-500">연결 매장</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {stores.length > 0 ? stores.filter(s => s.isActive).length : '-'}
                </p>
                <p className="text-sm text-slate-500 mt-1">활성 매장</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                    <Camera className="w-5 h-5 text-pink-600" />
                  </div>
                  <span className="text-sm text-slate-500">콘텐츠</span>
                </div>
                <p className="text-2xl font-bold text-slate-800">
                  {stores.length > 0 ? stores.reduce((sum, s) => sum + s.contentCount, 0) : '-'}
                </p>
                <p className="text-sm text-slate-500 mt-1">연동 콘텐츠</p>
              </div>
            </div>

            {/* Top Countries */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
              <h2 className="font-semibold text-slate-800 mb-4">방문자 국가 분포</h2>
              {stats?.topCountries && stats.topCountries.length > 0 ? (
                <div className="space-y-3">
                  {stats.topCountries.map((item) => (
                    <div key={item.country} className="flex items-center gap-4">
                      <span className="w-16 text-sm text-slate-600">{item.country}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-pink-500 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="w-12 text-sm text-slate-500 text-right">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">자료가 없습니다</p>
              )}
            </div>

            {/* Connected Stores */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800">연결된 매장</h2>
                {isAuthenticated && (
                  <Link
                    to="/platform/stores"
                    className="text-sm text-pink-600 font-medium hover:underline flex items-center gap-1"
                  >
                    내 매장 관리
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
              {stores.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <Store className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">자료가 없습니다</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stores.map((store) => (
                    <div
                      key={store.id}
                      className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Store className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <h3 className="font-medium text-slate-800">{store.name}</h3>
                            <p className="text-sm text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {store.location}
                            </p>
                          </div>
                        </div>
                        {store.isActive ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            활성
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                            비활성
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-slate-400" />
                          방문 {store.visitorCount.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Camera className="w-4 h-4 text-slate-400" />
                          콘텐츠 {store.contentCount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CTA Section */}
            {!isAuthenticated && (
              <div className="bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl p-8 text-center text-white">
                <h2 className="text-xl font-bold mb-2">Tourist Hub에 매장을 등록하세요</h2>
                <p className="text-pink-100 mb-6">
                  관광객에게 매장을 노출하고 K-Beauty 네트워크에 참여하세요
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-pink-600 rounded-lg font-medium hover:bg-pink-50 transition-colors"
                >
                  시작하기
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Info Notice */}
            <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-700 mb-2">Tourist Hub 안내</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Tourist Hub는 방한 관광객에게 K-Beauty 매장을 연결합니다.</li>
                <li>• 다국어 콘텐츠와 리뷰가 자동으로 연동됩니다.</li>
                <li>• 매장 등록 후 노출까지 1-2일 소요됩니다.</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
