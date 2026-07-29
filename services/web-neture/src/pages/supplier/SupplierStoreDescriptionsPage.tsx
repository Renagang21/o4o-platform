/**
 * SupplierStoreDescriptionsPage — "매장용 상품 설명서" 서비스 진입점 (1차: 안내만)
 *
 * WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-ENTRY-AND-ONBOARDING-V1
 * 근거: IR-O4O-NETURE-SUPPLIER-STORE-CONTENT-QR-TABLET-FLOW-AUDIT-V1 / DECISION-...-D1-D4-V1
 *
 * 범위(1차): 진입점 + 온보딩 안내만. 실제 STORE 설명서 작성·저장·QR·태블릿은 하지 않는다.
 * 정책(DECISION):
 *   - 설명서 타입은 STORE (SUPPLIER_STORE 아님). 작성 주체는 metadata로 구분.
 *   - 공급자는 직접 게시하지 않는다. 운영자 검수 후 canonical 로 매장에 노출된다.
 *   - 매장 경영자는 가져오기=복사로 활용한다.
 * 상태는 backend(supplierProfileApi.getProfile → status/activationReady)를 단일 권위로 사용(재계산 없음).
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import {
  supplierProfileApi,
  supplierApi,
  supplierStoreDescriptionApi,
  type SupplierProfile,
  type SupplierProduct,
  type SupplierStoreDescriptionDraft,
} from '../../lib/api';
import { PROFILE_FIELD_LABELS } from '../../lib/api';
import SupplierStoreDescriptionEditorDrawer from './SupplierStoreDescriptionEditorDrawer';

const PROFILE_PATH = '/mypage/business-profile';
const PRODUCTS_PATH = '/supplier/products';

const DRAFT_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: '임시저장', cls: 'bg-slate-100 text-slate-600' },
  needs_review: { label: '검수 대기', cls: 'bg-amber-50 text-amber-700' },
  revision_requested: { label: '수정 요청', cls: 'bg-orange-50 text-orange-700' },
  canonical: { label: '매장 노출', cls: 'bg-emerald-50 text-emerald-700' },
  hidden: { label: '숨김', cls: 'bg-red-50 text-red-700' },
};

function missingLabels(profile: SupplierProfile | null): string[] {
  const missing = profile?.missingProfileFields ?? profile?.missingActivationFields ?? [];
  return missing.map((f) => PROFILE_FIELD_LABELS[f] || f);
}

export default function SupplierStoreDescriptionsPage() {
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // 프로필(승인 상태) 조회 실패를 '미승인'으로 오인하지 않도록 오류 상태를 분리한다.
  const [profileError, setProfileError] = useState(false);
  const [profileReloadKey, setProfileReloadKey] = useState(0);

  // authoring state (ACTIVE 전용)
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [drafts, setDrafts] = useState<SupplierStoreDescriptionDraft[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  // 상품·설명서 목록 조회 실패를 '상품 0건 / 설명서 없음'으로 오인하지 않도록 분리한다.
  const [productsError, setProductsError] = useState(false);
  const [activeReloadKey, setActiveReloadKey] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<SupplierProduct | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setProfileError(false);
    supplierProfileApi
      .getProfile()
      .then((p) => {
        if (mounted) setProfile(p);
      })
      .catch(() => {
        if (mounted) {
          setProfile(null);
          setProfileError(true);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [profileReloadKey]);

  const status = String(profile?.status ?? '').toUpperCase();
  const active = status === 'ACTIVE';
  const labels = missingLabels(profile);

  const loadDrafts = () => {
    // 저장 후 재조회. 실패 시 기존 목록을 유지하고 사용자에게 알린다(빈 목록으로 덮어쓰지 않음).
    supplierStoreDescriptionApi
      .listMine()
      .then(setDrafts)
      .catch(() => toast.error('설명서 목록을 새로고침하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
  };

  // ACTIVE 시 상품 목록 + 내 STORE 설명서 작업행 로드
  useEffect(() => {
    if (!active) return;
    let mounted = true;
    setProductsLoading(true);
    setProductsError(false);
    Promise.all([supplierApi.getProducts(), supplierStoreDescriptionApi.listMine()])
      .then(([prods, myDrafts]) => {
        if (!mounted) return;
        setProducts(prods);
        setDrafts(myDrafts);
      })
      .catch(() => {
        if (mounted) setProductsError(true);
      })
      .finally(() => {
        if (mounted) setProductsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [active, activeReloadKey]);

  const draftByMaster = useMemo(() => {
    const m = new Map<string, SupplierStoreDescriptionDraft>();
    for (const d of drafts) {
      const prev = m.get(d.masterId);
      // 우선순위: revision_requested(조치 필요) > canonical > needs_review > draft > 기타
      const rank = (s: string) =>
        s === 'revision_requested' ? 4 : s === 'canonical' ? 3 : s === 'needs_review' ? 2 : s === 'draft' ? 1 : 0;
      if (!prev || rank(d.status) > rank(prev.status)) m.set(d.masterId, d);
    }
    return m;
  }, [drafts]);

  const filteredProducts = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return products;
    return products.filter(
      (p) => (p.name || '').toLowerCase().includes(kw) || (p.masterName || '').toLowerCase().includes(kw) || (p.barcode || '').includes(kw),
    );
  }, [products, keyword]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">매장용 상품 설명서</h1>
        <p className="mt-1 text-sm text-slate-500">
          매장 경영자가 고객 응대·QR·태블릿에 활용할 <strong>매장용(STORE) 상품 설명서</strong>를 준비하는
          공간입니다.
        </p>
      </div>

      {/* 상태별 안내 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600" />
        </div>
      ) : profileError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
          <h2 className="text-lg font-bold">공급자 정보를 불러오지 못했습니다</h2>
          <p className="mt-2 text-sm">
            일시적인 오류로 승인 상태를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={() => setProfileReloadKey((k) => k + 1)}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      ) : active ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">상품별 매장용 설명서</h2>
              <p className="mt-1 text-sm text-slate-500">
                상품을 선택해 매장용(STORE) 설명서를 작성하세요. 검수요청 후 운영자 검수를 통과하면 매장에 노출됩니다.
              </p>
            </div>
            <Link
              to={PRODUCTS_PATH}
              className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              내 상품 관리
            </Link>
          </div>

          <div className="mt-4">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="상품명 · 바코드 검색"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
            {productsLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-slate-400">불러오는 중…</div>
            ) : productsError ? (
              <div className="py-12 text-center text-sm">
                <p className="text-red-600">상품·설명서 목록을 불러오지 못했습니다.</p>
                <button
                  type="button"
                  onClick={() => setActiveReloadKey((k) => k + 1)}
                  className="mt-3 rounded-lg border border-red-300 px-4 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  다시 시도
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                {products.length === 0 ? (
                  <>
                    등록된 상품이 없습니다.{' '}
                    <Link to={PRODUCTS_PATH} className="text-emerald-700 underline">
                      상품을 먼저 등록
                    </Link>
                    하세요.
                  </>
                ) : (
                  '검색 결과가 없습니다.'
                )}
              </div>
            ) : (
              filteredProducts.slice(0, 100).map((p) => {
                const d = draftByMaster.get(p.masterId);
                const badge = d ? DRAFT_STATUS_BADGE[d.status] : null;
                return (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-100">
                      {p.primaryImageUrl ? (
                        <img src={p.primaryImageUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{p.name || p.masterName || '(이름 없음)'}</p>
                      <p className="truncate font-mono text-xs text-slate-400">{p.barcode}</p>
                    </div>
                    {badge && (
                      <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelected(p)}
                      className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      {d ? '설명서 편집' : '설명서 작성'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
          {filteredProducts.length > 100 && (
            <p className="mt-2 text-xs text-slate-400">최대 100개까지 표시됩니다. 검색으로 좁혀 주세요.</p>
          )}

          {selected && (
            <SupplierStoreDescriptionEditorDrawer
              product={selected}
              open={!!selected}
              onClose={() => setSelected(null)}
              onSaved={loadDrafts}
            />
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          {/* WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
              차단 사유는 승인 상태뿐 — 프로필 필드를 승인 조건처럼 요구하지 않는다. */}
          <h2 className="text-lg font-bold">
            {status === 'REJECTED'
              ? '공급자 가입이 거절되었습니다'
              : status === 'INACTIVE'
                ? '공급자 이용이 정지되었습니다'
                : '공급자 승인 후 사용 가능합니다'}
          </h2>
          <p className="mt-2 text-sm">
            {status === 'REJECTED' || status === 'INACTIVE'
              ? '자세한 사항은 운영자에게 문의해 주세요.'
              : '매장용 설명서 작성은 운영자 승인 이후 이용할 수 있습니다. 대시보드 열람과 프로필 작성은 지금도 가능합니다.'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={PRODUCTS_PATH}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              내 상품 보기
            </Link>
          </div>
          {status && !active && <p className="mt-3 text-xs text-amber-700">현재 상태: {status}</p>}
        </div>
      )}

      {/* 승인 완료 + 프로필 미완료 → 보완 안내(정보성, 차단 아님) */}
      {!loading && active && labels.length > 0 && (
        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-900">
          <p className="text-sm font-semibold">공급자 정보를 등록해 주세요</p>
          <p className="mt-1 text-sm">
            미입력: <span className="font-medium">{labels.join(', ')}</span>
          </p>
          <Link
            to={PROFILE_PATH}
            className="mt-2 inline-block rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            공급자 정보 등록
          </Link>
        </div>
      )}

      {/* 진행 단계 안내 */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-700">진행 단계</h3>
        <ol className="mt-3 space-y-2 text-sm text-slate-600">
          <li>
            <span className="font-medium text-slate-800">1. 상품 등록</span> — 매장용 설명서는 등록한 상품을
            기준으로 작성합니다. (<Link to={PRODUCTS_PATH} className="text-emerald-700 underline">상품 관리</Link>)
          </li>
          <li>
            <span className="font-medium text-slate-800">2. 매장용 설명서 작성</span> — 상품별 STORE 설명서
            초안을 작성하고 검수요청합니다.
          </li>
          <li>
            <span className="font-medium text-slate-800">3. 운영자 검수</span> — 작성한 설명서는 운영자 검수 후
            매장에 노출됩니다.
          </li>
          <li>
            <span className="font-medium text-slate-800">4. 매장 활용</span> — 매장 경영자가 가져와(복사) 고객
            응대·QR·태블릿에 활용합니다.
          </li>
        </ol>
      </div>

      {/* 정책 요약 */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-xs leading-relaxed text-slate-500">
        <p className="mb-1 font-semibold text-slate-600">안내</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>매장용 설명서는 공급자가 <strong>직접 게시하지 않으며</strong>, 운영자 검수를 거쳐 매장에 노출됩니다.</li>
          <li>매장 경영자는 설명서를 <strong>복사</strong>하여 자기 매장에 맞게 활용합니다.</li>
          <li>이 화면은 서비스 <strong>진입점</strong>입니다. 실제 작성·저장·QR·태블릿 기능은 후속 단계에서 제공됩니다.</li>
        </ul>
      </div>
    </div>
  );
}
