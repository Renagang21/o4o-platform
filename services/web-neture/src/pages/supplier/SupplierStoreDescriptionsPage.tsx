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
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supplierProfileApi, type SupplierProfile } from '../../lib/api';
import { ACTIVATION_FIELD_LABELS } from '../../lib/api';

const PROFILE_PATH = '/mypage/business-profile';
const PRODUCTS_PATH = '/supplier/products';

function missingLabels(profile: SupplierProfile | null): string[] {
  return (profile?.missingActivationFields ?? []).map((f) => ACTIVATION_FIELD_LABELS[f] || f);
}

export default function SupplierStoreDescriptionsPage() {
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supplierProfileApi
      .getProfile()
      .then((p) => {
        if (mounted) setProfile(p);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const status = String(profile?.status ?? '').toUpperCase();
  const active = status === 'ACTIVE';
  const labels = missingLabels(profile);

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
      ) : active ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-lg font-bold text-emerald-900">상품별 매장용 설명서 준비</h2>
          <p className="mt-2 text-sm text-emerald-900">
            등록하신 상품을 기준으로 매장용 설명서를 준비할 수 있습니다. 작성 기능은 곧 제공됩니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              title="작성 기능은 곧 제공됩니다"
              className="cursor-not-allowed rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-500"
            >
              매장용 설명서 작성 (준비 중)
            </button>
            <Link
              to={PRODUCTS_PATH}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              내 상품 보기
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h2 className="text-lg font-bold">공급자 승인 후 사용 가능합니다</h2>
          <p className="mt-2 text-sm">
            매장용 설명서 작성은 공급자 활성화(승인) 이후 이용할 수 있습니다. 대시보드 열람과 프로필 작성은
            지금도 가능합니다.
          </p>
          {labels.length > 0 && (
            <p className="mt-2 text-sm font-medium">현재 누락된 정보: {labels.join(', ')}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={PROFILE_PATH}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              담당자 정보 입력하러 가기
            </Link>
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
            초안을 작성합니다. <span className="text-slate-400">(준비 중)</span>
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
