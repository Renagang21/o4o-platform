/**
 * HubQrLibraryPage — 매장 HUB QR 템플릿 진열 + 매장으로 가져오기
 *
 * WO-O4O-KPA-STORE-HUB-QR-CONTENT-IMPORT-V1 (2026-05-24)
 *
 * 매장 경영자가 KPA HUB 에 진열된 운영자 발행 QR 템플릿을 보고, "가져가기" 로
 * 자기 매장 store_qr_codes 의 사본 row 로 변환·생성한다.
 *
 * 데이터 흐름:
 *   - HUB 목록: hubContentApi.list({ serviceKey='kpa', sourceDomain='qr' })
 *               → backend HubContentQueryService.queryQr
 *               → operator_qr_templates 의 author_role='operator' + status='published'
 *                 + service_key='kpa' 만 노출
 *   - 가져가기: importOperatorQr(slug, sourceId)
 *               → backend POST /stores/:slug/qr/staff/import
 *               → operator_qr_templates → store_qr_codes 변환 INSERT
 *                 (organization_id=매장id, landing_type/landing_target_id 변환)
 *
 * 권한: store_owner (HubGuard + verifyOwner backend 검증).
 * 패턴: HubPopLibraryPage mirror — QR 도메인 차이로 footer hint 가 매장 사본 관리 화면이
 *   아니라 기존 StoreQRPage (/store/marketing/qr) 로 안내.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Loader2, AlertCircle, Download, ExternalLink } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { hubContentApi } from '../../api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';
import { getStoreSlug } from '../../api/pharmacyInfo';
import { importOperatorQr } from '../../api/qrStaff';

const SERVICE_KEY = 'kpa';

export function HubQrLibraryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HubContentItemResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [slugResolved, setSlugResolved] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  // Resolve store slug
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const resolved = await getStoreSlug();
        if (!canceled) {
          setSlug(resolved);
          setSlugResolved(true);
        }
      } catch {
        if (!canceled) {
          setSlug(null);
          setSlugResolved(true);
        }
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  // Fetch HUB QR list
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await hubContentApi.list({
        serviceKey: SERVICE_KEY,
        sourceDomain: 'qr',
        page,
        limit,
      });
      setItems(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch (e: any) {
      setError(e?.message || 'HUB QR 을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleImport = async (item: HubContentItemResponse) => {
    if (!slug) {
      toast.error('매장 정보를 확인할 수 없습니다');
      return;
    }
    if (!window.confirm(`"${item.title}" QR 템플릿을 내 매장으로 가져오시겠습니까?\n매장 소유 QR-code 가 새로 발급되며, 가져온 후 내 매장 QR 화면에서 수정·출력할 수 있습니다.`)) {
      return;
    }
    setImportingId(item.id);
    try {
      const result = await importOperatorQr(slug, item.id);
      toast.success(`"${result.title}" 가져오기 완료 — 내 매장 QR 에 추가되었습니다 (slug: ${result.slug})`);
    } catch (e: any) {
      toast.error(e?.message || '가져오기에 실패했습니다');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">매장 HUB QR-code</h1>
        <p className="text-sm text-slate-500 mt-1">
          KPA 운영자가 발행한 QR 템플릿입니다. "가져가기" 로 내 매장 QR-code 를 새로 발급하고,
          내 매장 QR 화면에서 수정·출력·통계를 활용할 수 있습니다. 가져온 QR 은 매장 소유이며,
          slug 와 PNG 가 매장별로 별도 발급됩니다.
        </p>
      </div>

      {/* No store hint */}
      {slugResolved && !slug && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          매장 정보가 연결되지 않아 가져가기 기능을 사용할 수 없습니다. 매장 등록 후 다시 시도해 주세요.
        </div>
      )}

      {/* Content */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <QrCode className="w-10 h-10 text-slate-300" />
          <p className="text-sm text-slate-400">아직 운영자 발행 QR 템플릿이 없습니다</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-4 hover:border-slate-200 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800 truncate">
                      {item.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">
                      운영자 자료
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                    <span>{new Date(item.createdAt).toLocaleDateString('ko-KR')} 게시</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleImport(item)}
                    disabled={!slug || importingId !== null}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    title={slug ? '내 매장으로 가져가기' : '매장 정보 미연결'}
                  >
                    {importingId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    가져가기
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 disabled:opacity-40"
              >
                이전
              </button>
              <span className="px-3 py-1.5 text-sm text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {/* Footer hint — 가져간 QR 관리 위치 (기존 StoreQRPage) */}
      {slug && items.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600 flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-slate-400" />
          <span>
            가져온 QR 은{' '}
            <button
              onClick={() => navigate('/store/marketing/qr')}
              className="text-blue-600 hover:underline font-medium"
            >
              내 매장 QR
            </button>{' '}
            에서 수정·출력·통계를 활용할 수 있습니다.
          </span>
        </div>
      )}
    </div>
  );
}

export default HubQrLibraryPage;
