/**
 * ServiceSwitcher - 플랫폼 서비스 이동 드롭다운
 * WO-O4O-SERVICE-SWITCHER-GLOBAL-V1
 *
 * 현재 서비스 표시 + 서비스 목록 + handoff 이동 + join 가입
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, ExternalLink, UserPlus } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface ServiceInfo {
  key: string;
  name: string;
  domain: string;
  description: string;
  joinEnabled: boolean;
  membership: { status: string } | null;
}

interface ServiceSwitcherProps {
  currentServiceKey: string;
}

export default function ServiceSwitcher({ currentServiceKey }: ServiceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // 현재 서비스 이름
  const currentName = services.find(s => s.key === currentServiceKey)?.name || currentServiceKey;

  // 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // 서비스 목록 조회 (최초 오픈 시)
  const fetchServices = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/services`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.data?.services) {
        setServices(data.data.services);
      }
    } catch { /* ignore */ }
    setLoaded(true);
    setLoading(false);
  }, [loaded]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchServices();
  };

  // 서비스 이동 (handoff)
  const handleOpen = async (serviceKey: string) => {
    setActionKey(serviceKey);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetServiceKey: serviceKey }),
      });
      const data = await res.json();
      if (data.success && data.data?.targetUrl) {
        window.location.href = data.data.targetUrl;
        return;
      }
    } catch { /* ignore */ }
    setActionKey(null);
  };

  // 서비스 가입
  const handleJoin = async (serviceKey: string) => {
    setActionKey(serviceKey);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/services/${serviceKey}/join`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setLoaded(false);
        await fetchServices();
      }
    } catch { /* ignore */ }
    setActionKey(null);
  };

  const myServices = services.filter(s => s.membership?.status === 'active' && s.key !== currentServiceKey);
  const availableServices = services.filter(s => (!s.membership || s.membership.status !== 'active') && s.key !== currentServiceKey);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
      >
        {currentName}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {loading ? (
            <p className="px-4 py-3 text-sm text-gray-500">로딩 중...</p>
          ) : (
            <>
              {/* 현재 서비스 */}
              <div className="px-4 py-2 flex items-center gap-2 text-sm font-medium text-blue-600">
                <Check size={14} />
                {currentName}
              </div>

              {/* My Services */}
              {myServices.length > 0 && (
                <>
                  <div className="border-t border-gray-100 my-1" />
                  <p className="px-4 py-1 text-xs text-gray-400 font-medium">내 서비스</p>
                  {myServices.map(s => (
                    <button
                      key={s.key}
                      onClick={() => handleOpen(s.key)}
                      disabled={actionKey === s.key}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ExternalLink size={14} className="text-gray-400" />
                      {s.name}
                    </button>
                  ))}
                </>
              )}

              {/* Available Services */}
              {availableServices.length > 0 && (
                <>
                  <div className="border-t border-gray-100 my-1" />
                  <p className="px-4 py-1 text-xs text-gray-400 font-medium">이용 가능</p>
                  {availableServices.map(s => (
                    <button
                      key={s.key}
                      onClick={() => handleJoin(s.key)}
                      disabled={actionKey === s.key}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <UserPlus size={14} className="text-gray-400" />
                      {s.name}
                    </button>
                  ))}
                </>
              )}

            </>
          )}
        </div>
      )}
    </div>
  );
}
