/**
 * Service Card
 * 서비스 카드 — membership 상태에 따른 버튼 표시
 */

import { ExternalLink, UserPlus, RefreshCw } from 'lucide-react';

interface ServiceInfo {
  key: string;
  name: string;
  domain: string;
  description: string;
  membership: { status: string } | null;
}

interface ServiceCardProps {
  service: ServiceInfo;
  onOpen: (serviceKey: string) => void;
  onJoin: (serviceKey: string) => void;
  loading?: boolean;
}

export default function ServiceCard({ service, onOpen, onJoin, loading }: ServiceCardProps) {
  const status = service.membership?.status;
  const isActive = status === 'active';
  const isInactive = status && status !== 'active';
  const isNotJoined = !service.membership;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-gray-900">{service.name}</h3>
          {isActive && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              활성
            </span>
          )}
          {isInactive && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
              비활성
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-1">{service.description}</p>
        <p className="text-xs text-gray-400">{service.domain}</p>
      </div>

      <div className="mt-4">
        {isActive && (
          <button
            onClick={() => onOpen(service.key)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            <ExternalLink size={14} />
            열기
          </button>
        )}
        {isInactive && (
          <button
            onClick={() => onJoin(service.key)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 text-sm font-medium"
          >
            <RefreshCw size={14} />
            활성화
          </button>
        )}
        {isNotJoined && (
          <button
            onClick={() => onJoin(service.key)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
          >
            <UserPlus size={14} />
            가입
          </button>
        )}
      </div>
    </div>
  );
}
