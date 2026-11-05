import { useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { ForcedContentPage, type SignageHqConfig, type SignageApiFetch } from '@o4o/operator-core-ui/modules/signage-hq';

const config: SignageHqConfig = {
  serviceKey: 'kpa-society', tableIdPrefix: 'platform-signage', actionPolicyPrefix: 'platform:signage',
  routeBase: '/operator/signage', tagSuggestions: [], playlistLabel: '재생목록', storeLabel: '매장', enableTabletSurface: false,
  accent: {
    icon: 'text-blue-600', primaryButton: 'bg-blue-600 hover:bg-blue-700', focusRing: 'focus:ring-blue-500',
    cardBorder: 'border-blue-100', tagPill: 'bg-blue-100 text-blue-700', linkText: 'text-blue-600',
    spinnerBorder: 'border-blue-600', countBadge: 'bg-blue-100 text-blue-700', softButton: 'text-blue-600 border-blue-200 hover:bg-blue-50',
    panelBg: 'border-blue-100 bg-blue-50/30', statusRing: 'ring-blue-400',
  },
};
const apiFetch: SignageApiFetch = async (path, options) => {
  const response = await authClient.api.request({
    url: new URL(path, authClient.api.defaults.baseURL || window.location.origin).toString(),
    method: options?.method || 'GET', data: options?.body ? JSON.parse(String(options.body)) : undefined,
  });
  if (!response.data?.success) throw new Error('필수 영상 요청을 처리하지 못했습니다.');
  return response.data;
};
export default function AdminRequiredSignagePage() {
  const navigate = useNavigate();
  return <><p className="text-sm text-slate-600 mb-4">게시 시작 전과 종료 후에는 매장 목록과 재생 대상에 표시되지 않습니다. 게시 일시는 한국 시간입니다.</p><ForcedContentPage apiFetch={apiFetch} config={config} navigate={navigate} /></>;
}
