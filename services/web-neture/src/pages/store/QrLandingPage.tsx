/**
 * QrLandingPage - QR 코드 스캔 랜딩 페이지
 *
 * Work Order: WO-O4O-STORE-PRODUCT-PAGE-INTEGRATION-V1
 *
 * Route: /qr/:slug
 *
 * QR 코드 스캔 시 이 페이지에 도착.
 * API에서 QR 메타데이터를 가져와 landingType에 따라 적절한 페이지로 리다이렉트.
 *
 * landingType:
 * - product → /store/{storeSlug}/product/{landingTargetId} 또는 /store/product/{landingTargetId}
 * - promotion → /partner/contents/{landingTargetId}
 * - page → /knowledge/{landingTargetId}
 * - link → 외부 URL
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QrCode, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api/index.js';

interface QrData {
  id: string;
  type: string;
  title: string;
  description: string | null;
  landingType: string;
  landingTargetId: string | null;
  storeSlug: string | null;
  organizationId?: string;
}

export default function QrLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError('잘못된 QR 코드입니다.');
      return;
    }

    (async () => {
      try {
        const result = await api.get(`/kpa/qr/public/${encodeURIComponent(slug)}`);
        const qr: QrData = result.data.data;

        if (!qr) {
          setError('QR 코드를 찾을 수 없습니다.');
          return;
        }

        // Redirect based on landingType
        switch (qr.landingType) {
          case 'product': {
            const orgParam = qr.organizationId ? `?org=${qr.organizationId}` : '';
            if (qr.storeSlug && qr.landingTargetId) {
              navigate(`/store/${qr.storeSlug}/product/${qr.landingTargetId}${orgParam}`, { replace: true });
            } else if (qr.landingTargetId) {
              navigate(`/store/product/${qr.landingTargetId}${orgParam}`, { replace: true });
            } else {
              setError('QR 코드에 제품 정보가 없습니다.');
            }
            break;
          }
          case 'promotion': {
            if (qr.landingTargetId) {
              navigate(`/partner/contents/${qr.landingTargetId}`, { replace: true });
            } else {
              setError('QR 코드에 프로모션 정보가 없습니다.');
            }
            break;
          }
          case 'page': {
            if (qr.landingTargetId) {
              navigate(`/knowledge/${qr.landingTargetId}`, { replace: true });
            } else {
              setError('QR 코드에 페이지 정보가 없습니다.');
            }
            break;
          }
          case 'link': {
            if (qr.landingTargetId) {
              window.location.href = qr.landingTargetId;
            } else {
              setError('QR 코드에 링크 정보가 없습니다.');
            }
            break;
          }
          default:
            setError('지원하지 않는 QR 코드 유형입니다.');
        }
      } catch {
        setError('QR 코드를 불러오는 중 오류가 발생했습니다.');
      }
    })();
  }, [slug, navigate]);

  // Loading state (redirecting)
  if (!error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <QrCode size={32} className="text-primary-600" />
          </div>
          <p className="text-gray-600 font-medium">페이지로 이동 중...</p>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">QR 코드 오류</h1>
        <p className="text-sm text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}
