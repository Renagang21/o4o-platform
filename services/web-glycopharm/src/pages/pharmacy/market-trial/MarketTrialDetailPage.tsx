/**
 * Market Trial Detail Redirect (Pharmacy Store)
 *
 * WO-MARKET-TRIAL-LEGACY-SERVICE-PAGES-CONSOLIDATION-V1:
 * 상세 페이지는 KPA-a 시범판매 허브로 리다이렉트.
 * 서비스별 독립 상세 페이지를 제거하고 KPA-a 단일 진입점으로 통합.
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

const KPA_URL = import.meta.env.VITE_KPA_URL || 'https://kpa-society-web-3e3aws7zqa-du.a.run.app';

export default function MarketTrialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      window.open(`${KPA_URL}/market-trial/${id}`, '_blank');
    }
  }, [id]);

  return (
    <div className="p-6 max-w-md mx-auto text-center">
      <p className="text-sm text-slate-500 mb-4">
        시범판매 상세 정보는 KPA-a 허브에서 확인하실 수 있습니다.
      </p>
      <div className="flex flex-col gap-3">
        <a
          href={id ? `${KPA_URL}/market-trial/${id}` : `${KPA_URL}/market-trial`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
        >
          KPA-a에서 상세 보기
          <ExternalLink className="w-4 h-4" />
        </a>
        <button
          onClick={() => navigate('/store/market-trial')}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← 목록으로 돌아가기
        </button>
      </div>
    </div>
  );
}
