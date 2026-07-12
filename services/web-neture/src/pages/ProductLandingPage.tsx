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
import { useParams, useLocation } from 'react-router-dom';
import { Package, AlertCircle, FileText, Clock, Globe, X, Lock, LogIn, UserPlus } from 'lucide-react';
import { ContentRenderer } from '@o4o/content-editor';
import { api } from '../lib/api/index.js';
import { useAuth, useLoginModal } from '../contexts';

interface PublicProductLanding {
  publicKey: string;
  productMasterId: string;
  status: string;
  exposureState: string;
  blocked: boolean;
  authRequired: boolean;
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
  const location = useLocation();
  // WO-O4O-PRODUCT-DESCRIPTION-AUTH-GATE-AND-RETURNURL-V1 (Baseline V3-AMENDMENT · ADR-0002):
  //   설명서 본문은 로그인 회원만. 비로그인은 게이트 표시 → 로그인/가입 후 원래 상품 URL 복귀.
  //   isAuthenticated 를 fetch 의존성에 넣어 로그인 성공(모달 오버레이) 시 자동 재조회(본문 in-place 로드).
  const { isAuthenticated } = useAuth();
  const { openLoginModal, openRegisterModal } = useLoginModal();
  const [data, setData] = useState<PublicProductLanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 초기 선택 언어: localStorage 복원(없으면 undefined → 백엔드 ko 기본)
  const [locale, setLocale] = useState<string | undefined>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || undefined; } catch { return undefined; }
  });
  const [sheetOpen, setSheetOpen] = useState(false);

  // 원래 상품 URL(내부 상대경로만) — 로그인/가입 returnUrl. open-redirect 방지: pathname+search 만 사용.
  const returnUrl = `${location.pathname}${location.search}`;

  // 비로그인 설명서 페이지 색인 방지(보조조치). 실제 통제는 서버 인증. 이탈 시 원복.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

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
  }, [publicKey, locale, isAuthenticated]);

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

  // 로그인 게이트 — 비로그인 사용자에게는 설명서 본문을 제공하지 않는다(서버에서 이미 미포함).
  //   최소 상품 식별정보(제품명)와 로그인·가입 CTA 만 노출. 로그인 성공 시 상위 effect 가 자동 재조회.
  if (data.authRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Lock size={30} className="text-primary-600" />
          </div>
          {data.product?.name && (
            <p className="text-base font-semibold text-gray-900 break-keep mb-1">{data.product.name}</p>
          )}
          <h1 className="text-lg font-bold text-gray-900 mb-2">로그인 후 제품 설명을 볼 수 있어요</h1>
          <p className="text-sm text-gray-600 mb-6 break-keep">
            이 제품 상세설명서는 O4O 회원에게만 제공됩니다. 로그인하거나 가입하면 바로 이 화면에서 이어서 볼 수 있어요.
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => openLoginModal(returnUrl)}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors"
            >
              <LogIn size={18} /> 로그인
            </button>
            <button
              type="button"
              onClick={() => openRegisterModal()}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-800 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <UserPlus size={18} /> 회원가입
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">O4O · neture.co.kr</p>
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
        {data.description.hasCanonical && data.description.content ? (
          // WO-O4O-STORE-DESCRIPTION-RENDERER-DESIGN-SYSTEM-V1: 매장용 설명서 반응형 디자인 시스템 + sanitize.
          //   설명서는 자체 히어로/타이틀을 포함하므로 별도 "제품 설명" 카드 크롬 없이 직접 렌더(카드 중첩 방지).
          <div className="mt-4">
            <ContentRenderer variant="store-description" html={data.description.content} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={18} className="text-gray-400" />
              <h2 className="text-base font-semibold text-gray-800">제품 설명</h2>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Clock size={22} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">{data.placeholder || '상세 설명을 준비 중입니다.'}</p>
            </div>
          </div>
        )}

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
