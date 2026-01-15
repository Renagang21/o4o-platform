/**
 * PartnerStatusPage - 상태 확인 페이지
 * Reference: GlycoPharm (복제)
 * API Integration: WO-PARTNER-DASHBOARD-API-FE-INTEGRATION-V1
 */

import { useState, useEffect } from 'react';
import { FileText, Calendar, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { partnerApi, type PartnerStatusData } from '../../services/api';

const statusConfig = {
  active: { label: '활성', icon: CheckCircle, color: 'green' },
  inactive: { label: '비활성', icon: XCircle, color: 'slate' },
  ongoing: { label: '진행 중', icon: Clock, color: 'blue' },
  ended: { label: '종료', icon: XCircle, color: 'slate' },
};

export default function PartnerStatusPage() {
  const [data, setData] = useState<PartnerStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      setIsLoading(true);
      setError(null);
      const response = await partnerApi.getStatus();
      if (response.error) {
        setError(response.error.message);
      } else if (response.data) {
        setData(response.data);
      }
      setIsLoading(false);
    };
    fetchStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
        <p className="text-slate-500">데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const contentItems = data.contents;
  const eventItems = data.events;

  const renderStatusBadge = (status: keyof typeof statusConfig) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-${config.color}-100 text-${config.color}-700`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">상태</h1>
        <p className="text-slate-500 mt-1">
          콘텐츠와 이벤트의 현재 상태를 확인하세요.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {contentItems.filter((i) => i.status === 'active').length}
          </p>
          <p className="text-sm text-slate-500">활성 콘텐츠</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-400">
            {contentItems.filter((i) => i.status === 'inactive').length}
          </p>
          <p className="text-sm text-slate-500">비활성 콘텐츠</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {eventItems.filter((i) => i.status === 'ongoing' || i.status === 'active').length}
          </p>
          <p className="text-sm text-slate-500">진행 중 이벤트</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-400">
            {eventItems.filter((i) => i.status === 'ended').length}
          </p>
          <p className="text-sm text-slate-500">종료 이벤트</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-400" />
          <h2 className="font-semibold text-slate-800">콘텐츠 상태</h2>
        </div>
        {contentItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500">등록된 콘텐츠가 없습니다.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {contentItems.map((item) => (
              <li key={item.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{item.name}</p>
                </div>
                {renderStatusBadge(item.status as 'active' | 'inactive')}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          <h2 className="font-semibold text-slate-800">이벤트 상태</h2>
        </div>
        {eventItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500">등록된 이벤트가 없습니다.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {eventItems.map((item) => (
              <li key={item.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{item.name}</p>
                </div>
                {renderStatusBadge(item.status === 'active' ? 'ongoing' : item.status as 'ongoing' | 'ended')}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-slate-400">
          상태 변경이 필요한 경우 각 메뉴에서 수정하세요.
        </p>
      </div>
    </div>
  );
}
