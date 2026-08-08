/**
 * ManualDetailPage (약국 경영자) — 상품 설명서 상세 · 미리보기
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (범위 E)
 *
 * 본문은 공통 `ContentRenderer` 로만 렌더한다 (Pharmacy-Hub 전용 렌더러 0).
 * 매장용 설명서(sd-* 마크업)는 `variant="store-description"` 이 아니면 CSS 스코프 래퍼
 * `.store-desc-content` 가 붙지 않아 **무스타일로 렌더**된다 — 섞여 들어오는 슬롯이므로
 * 공통 `hasStoreDescriptionMarkup()` 으로 판별해 variant 를 정한다.
 *
 * 이 화면에는 저작·번역·저장 경로가 없다 (설명서 write 0).
 * "상품 QR" 만 명시적 발급 액션이며, master 기준 고정 Landing(/p/{key}) 으로 멱등이다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ContentRenderer, hasStoreDescriptionMarkup } from '@o4o/content-editor';
import {
  fetchManualDetail,
  issueProductQr,
  type ManualDetail,
  type ProductQr,
} from '../../lib/api/pharmacyHubStoreManual';
import { StoreConnectionNotice, type StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';

const LOCALE_LABELS: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  ja: '日本語',
  vi: 'Tiếng Việt',
  th: 'ไทย',
  id: 'Bahasa',
};

export default function StoreOwnerManualDetailPage() {
  const { listingId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const locale = searchParams.get('locale') ?? undefined;

  const [detail, setDetail] = useState<ManualDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<ProductQr | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const load = useCallback(() => {
    if (!listingId) return;
    setLoading(true);
    fetchManualDetail(listingId, locale)
      .then((d) => {
        setDetail(d);
        setError(null);
      })
      .catch((e: any) => setError(e?.message || '설명서를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [listingId, locale]);

  useEffect(() => {
    load();
  }, [load]);

  const handleIssueQr = async () => {
    setQrLoading(true);
    try {
      setQr(await issueProductQr(listingId));
    } catch (e: any) {
      window.alert(e?.message || '상품 QR 을 발급하지 못했습니다.');
    } finally {
      setQrLoading(false);
    }
  };

  const connection = detail?.storeConnection as StoreConnectionState | undefined;
  const manual = detail?.manual;
  const content = manual?.content ?? null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="mb-1 text-xs text-gray-400">
        <Link to="/store-owner/manuals" className="hover:underline">
          상품 설명서
        </Link>{' '}
        / 상세
      </p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {connection && connection.status !== 'connected' ? (
        <StoreConnectionNotice connection={connection} subject="상품 설명서" />
      ) : loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : !detail?.product ? (
        <p className="text-sm text-gray-500">제품을 찾을 수 없습니다.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">{detail.product.name}</h1>
              {detail.product.brandName && (
                <p className="mt-1 text-sm text-gray-500">{detail.product.brandName}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleIssueQr}
              disabled={qrLoading || !detail.product.masterId}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {qrLoading ? '발급 중…' : '상품 QR 보기'}
            </button>
          </div>

          {/* 언어 선택 — 설명서가 있는 언어만 노출한다 (빈 언어 탭을 만들지 않는다) */}
          {manual && manual.languages.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {manual.languages.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setSearchParams(l === 'ko' ? {} : { locale: l })}
                  className={`rounded-md border px-3 py-1.5 text-xs ${
                    manual.locale === l
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {LOCALE_LABELS[l] ?? l}
                </button>
              ))}
            </div>
          )}

          {qr && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
              <p className="mb-2 text-sm font-medium text-gray-900">상품 QR</p>
              <div className="flex flex-wrap items-center gap-4">
                {/* 서버가 인코딩한 SVG — QR 이미지는 저장하지 않는다 (F12 불변식 ④) */}
                <div className="h-32 w-32" dangerouslySetInnerHTML={{ __html: qr.svg }} />
                <div className="min-w-0 text-xs text-gray-500">
                  <p className="break-all">
                    <a href={qr.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {qr.url}
                    </a>
                  </p>
                  <p className="mt-2">
                    같은 제품이면 항상 같은 QR 입니다. 설명서 내용이 바뀌어도 주소는 그대로 유지됩니다.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!manual?.hasCanonical ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-600">아직 등록된 설명서가 없습니다.</p>
              <p className="mt-2 text-sm text-gray-400">
                상품 설명서는 O4O 공용 자산이라 매장에서 직접 작성하지 않습니다. 준비되면 이 화면에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              {manual.summary && <p className="mb-3 text-sm text-gray-600">{manual.summary}</p>}
              <ContentRenderer
                html={content ?? ''}
                variant={hasStoreDescriptionMarkup(content) ? 'store-description' : 'product-detail'}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
