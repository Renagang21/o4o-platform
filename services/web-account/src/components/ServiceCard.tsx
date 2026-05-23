/**
 * Service Card
 *
 * WO-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1 (2026-05-23):
 *   active membership 보유 서비스의 "열기" 버튼만 제공.
 *   가입/활성화 UI 는 제거 — 각 서비스 사이트에서 직접 가입 신청.
 *   기존 가입(UserPlus)/활성화(RefreshCw) 분기 제거.
 */

import { ExternalLink } from 'lucide-react';

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
  loading?: boolean;
}

export default function ServiceCard({ service, onOpen, loading }: ServiceCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-gray-900">{service.name}</h3>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            활성
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-1">{service.description}</p>
        <p className="text-xs text-gray-400">{service.domain}</p>
      </div>

      <div className="mt-4">
        <button
          onClick={() => onOpen(service.key)}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          <ExternalLink size={14} />
          열기
        </button>
      </div>
    </div>
  );
}
