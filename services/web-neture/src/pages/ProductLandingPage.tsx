/**
 * ProductLandingPage — 제품 대표 QR 공개 랜딩 (neture.co.kr/p/:publicKey)
 *
 * WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1 / Phase 2b
 * WO-O4O-KPA-PRODUCT-QR-LANGUAGE-SELECTOR-REUSE-AND-ADAPT-V1:
 *   고객용 언어 선택 — 한국어만이면 UI 없음, 외국어가 있으면 [한국어][Other Languages].
 *   Other Languages → 실제 공개 가능한 언어를 국기 + 자국어명으로 표시(모바일 바텀시트).
 *   선택 언어는 localStorage 에 기억. 언어별 본문은 백엔드 canonical STORE(언어별)에서 조회.
 *
 * 제품 대표 QR 스캔 시 도착. 공개 API(GET /api/v1/public/product-landings/:publicKey?locale=).
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Package, AlertCircle, FileText, Clock, Globe, X } from 'lucide-react';
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
  resolvedLocale: string | null;
}

const REGULATORY_LABEL: Record<string, string> = {
  DRUG: '의약품',
  QUASI_DRUG: '의약외품',
  MEDICAL_DEVICE: '의료기기',
  GENERAL: '일반',
};

// 언어 코드 ↔ 자국어명 / 국기 (기존 LOCALE_LABELS 재사용 + 국기 매핑 보강)
const LOCALE_LABELS: Record<string, string> = {
  ko: '한국어', en: 'English', zh: '中文', ja: '日本語', vi: 'Tiếng Việt', th: 'ภาษาไทย', id: 'Bahasa Indonesia',
};
const LOCALE_FLAG: Record<string, string> = {
  ko: '🇰🇷', en: '🇺🇸', zh: '🇨🇳', ja: '🇯🇵', vi: '🇻🇳', th: '🇹🇭', id: '🇮🇩',
};
const STORAGE_KEY = 'o4o_product_landing_locale';

/** zh-CN / zh-TW 등 → 기본 코드(zh)로 정규화 (표시/매핑용) */
function baseLocale(l: string | null | undefined): string {
  return (l || '').toLowerCase().split('-')[0];
}
function localeLabel(l: string): string {
  return LOCALE_LABELS[baseLocale(l)] || l.toUpperCase();
}
function localeFlag(l: string): string {
  return LOCALE_FLAG[baseLocale(l)] || '🌐';
}

export default function ProductLandingPage() {
  const { publicKey } = useParams<{ publicKey: string }>();
  const [data, setData] = useState<PublicProductLanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 초기 선택 언어: localStorage 복원(없으면 undefined → 백엔드 ko 기본)
  const [locale, setLocale] = useState<string | undefined>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || undefined; } catch { return undefined; }
  });
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!publicKey) {
      setError('잘못된 주소입니다.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const qs = locale ? `?locale=${encodeURIComponent(locale)}` : '';
        const res = await api.get(`/public/product-landings/${encodeURIComponent(publicKey)}${qs}`);
        if (!cancelled) { setData(res.data.data as PublicProductLanding); setError(null); }
      } catch (e: any) {
        if (cancelled) return;
        if (e?.response?.status === 404) setError('존재하지 않는 제품 코드입니다.');
        else setError('제품 정보를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [publicKey, locale]);

  const chooseLocale = (loc: string) => {
    setLocale(loc);
    try { localStorage.setItem(STORAGE_KEY, loc); } catch { /* ignore */ }
    setSheetOpen(false);
  };

  if (loading && !data) {
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

  // 언어 선택 정책: 공개 가능한 언어 중 한국어 외 언어(외국어)가 있으면 [한국어][Other Languages].
  const available = (data.languages || []).filter(Boolean);
  const hasKo = available.some((l) => baseLocale(l) === 'ko');
  const foreignLangs = available.filter((l) => baseLocale(l) !== 'ko');
  const showSelector = foreignLangs.length >= 1; // 한국어만 있으면 선택 UI 없음
  const resolved = data.resolvedLocale;
  const koActive = baseLocale(resolved || '') === 'ko';

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

        {/* 언어 선택 — 외국어가 있을 때만 (한국어 / Other Languages) */}
        {showSelector && (
          <div className="flex items-center gap-2 mt-4">
            {hasKo && (
              <button
                type="button"
                onClick={() => chooseLocale('ko')}
                className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl border ${
                  koActive ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {LOCALE_FLAG.ko} 한국어
              </button>
            )}
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-xl border inline-flex items-center gap-1.5 ${
                !koActive ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Globe size={15} />
              {!koActive && resolved ? `${localeFlag(resolved)} ${localeLabel(resolved)}` : 'Other Languages'}
            </button>
          </div>
        )}

        {/* 설명 (선택 언어 본문) */}
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

      {/* Other Languages — 모바일 바텀시트(터치 친화). 국기 + 자국어명. 실제 공개 언어만. */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-xl p-5 pb-7 animate-[slideup_.2s_ease]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">언어 선택 · Language</h3>
              <button type="button" onClick={() => setSheetOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100" aria-label="닫기">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {hasKo && (
                <button
                  type="button"
                  onClick={() => chooseLocale('ko')}
                  className={`w-full min-h-[52px] px-4 py-3 text-left text-base rounded-2xl border flex items-center gap-3 ${
                    koActive ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{LOCALE_FLAG.ko}</span> 한국어
                </button>
              )}
              {foreignLangs.map((loc) => {
                const active = baseLocale(resolved || '') === baseLocale(loc);
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => chooseLocale(loc)}
                    className={`w-full min-h-[52px] px-4 py-3 text-left text-base rounded-2xl border flex items-center gap-3 ${
                      active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{localeFlag(loc)}</span> {localeLabel(loc)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
