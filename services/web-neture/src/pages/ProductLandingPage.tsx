/**
 * ProductLandingPage — 제품 대표 QR 공개 랜딩 (neture.co.kr/p/:publicKey)
 *
 * WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1 / Phase 2b
 * Baseline: O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V2-AMENDMENT
 *
 * 제품 대표 QR 스캔 시 도착. 공개 API(GET /api/v1/public/product-landings/:publicKey)에서
 * 제품 기본정보 + 설명(canonical, 없으면 "준비 중")을 받아 렌더한다. 무인증.
 * Landing 은 확장 가능한 화면 — 이후 공급자/매장/관련 콘텐츠 블록이 추가된다(Phase 5).
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Package, AlertCircle, FileText, Clock } from 'lucide-react';
import { api } from '../lib/api/index.js';

interface PublicProductLanding {
  publicKey: string;
  productMasterId: string;
  status: string;
  exposureState: string;
  blocked: boolean;
  product: {
    name: string | null;
    manufacturerName: string | null;
    barcode: string | null;
    regulatoryType: string | null;
    specification: string | null;
  } | null;
  description: {
    hasCanonical: boolean;
    descriptionType: string | null;
    content: string | null;
    summary: string | null;
  };
  placeholder: string | null;
  languages: string[];
}

const REGULATORY_LABEL: Record<string, string> = {
  DRUG: '의약품',
  QUASI_DRUG: '의약외품',
  MEDICAL_DEVICE: '의료기기',
  GENERAL: '일반',
};

export default function ProductLandingPage() {
  const { publicKey } = useParams<{ publicKey: string }>();
  const [data, setData] = useState<PublicProductLanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setError('잘못된 주소입니다.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await api.get(`/public/product-landings/${encodeURIComponent(publicKey)}`);
        setData(res.data.data as PublicProductLanding);
      } catch (e: any) {
        if (e?.response?.status === 404) setError('존재하지 않는 제품 코드입니다.');
        else setError('제품 정보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [publicKey]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Package size={32} className="text-primary-600" />
          </div>
          <p className="text-gray-600 font-medium">제품 정보를 불러오는 중…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">제품을 찾을 수 없습니다</h1>
          <p className="text-sm text-gray-600">{error ?? '알 수 없는 오류'}</p>
        </div>
      </div>
    );
  }

  // 노출 게이트 차단(행정처분/회수 등)
  if (data.blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-amber-500" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">현재 표시할 수 없는 제품입니다</h1>
          <p className="text-sm text-gray-600">이 제품 정보는 일시적으로 제공되지 않습니다.</p>
        </div>
      </div>
    );
  }

  const p = data.product;
  const regLabel = p?.regulatoryType ? (REGULATORY_LABEL[p.regulatoryType] ?? p.regulatoryType) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 제품 기본정보 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
              <Package size={24} className="text-primary-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 break-keep">{p?.name || '제품'}</h1>
              {p?.manufacturerName && <p className="text-sm text-gray-500 mt-0.5">{p.manufacturerName}</p>}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            {regLabel && (<><dt className="text-gray-400">구분</dt><dd className="text-gray-700">{regLabel}</dd></>)}
            {p?.specification && (<><dt className="text-gray-400">규격</dt><dd className="text-gray-700 break-all">{p.specification}</dd></>)}
            {p?.barcode && (<><dt className="text-gray-400">바코드</dt><dd className="text-gray-700 font-mono text-xs">{p.barcode}</dd></>)}
          </dl>
        </div>

        {/* 설명 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-gray-400" />
            <h2 className="text-base font-semibold text-gray-800">제품 설명</h2>
          </div>
          {data.description.hasCanonical && data.description.content ? (
            <div
              className="prose prose-sm max-w-none text-gray-800"
              // 신뢰된 canonical 설명(관리자 검수 SPD)만 렌더
              dangerouslySetInnerHTML={{ __html: data.description.content }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Clock size={22} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">{data.placeholder || '상세 설명을 준비 중입니다.'}</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">O4O · neture.co.kr</p>
      </div>
    </div>
  );
}
