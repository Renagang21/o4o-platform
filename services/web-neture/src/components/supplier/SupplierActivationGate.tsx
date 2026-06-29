/**
 * SupplierActivationGate — 공급자 활성화 상태 안내 / 사전 게이트
 *
 * WO-O4O-NETURE-SUPPLIER-ACTIVATION-GATE-ALIGN-AND-ERROR-SURFACE-V1
 *
 * 활성화 가능 여부는 backend(supplierProfileApi.getProfile → activationReady/missingActivationFields)가
 * 단일 권위. 프론트는 재계산하지 않고 그대로 사용한다.
 *
 * mode='banner'  : children 은 항상 렌더. PENDING 이면 상단에 상태 배너만 추가 (대시보드용).
 * mode='gate'    : ACTIVE 일 때만 children 렌더. 그 외에는 차단 안내만 표시 (상품 등록 진입 사전 게이트).
 *                  → PENDING 공급자가 분석·이미지 복사 등 전체 과정을 수행한 뒤 마지막에 실패하지 않게 한다.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supplierProfileApi, type SupplierProfile } from '../../lib/api';
import { ACTIVATION_FIELD_LABELS } from '../../lib/api';

const PROFILE_PATH = '/mypage/business-profile';

function missingLabels(profile: SupplierProfile | null): string[] {
  return (profile?.missingActivationFields ?? []).map((f) => ACTIVATION_FIELD_LABELS[f] || f);
}

function isActive(profile: SupplierProfile | null): boolean {
  return String(profile?.status ?? '').toUpperCase() === 'ACTIVE';
}

interface Props {
  mode: 'banner' | 'gate';
  children: React.ReactNode;
}

export default function SupplierActivationGate({ mode, children }: Props) {
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

  const active = isActive(profile);
  const labels = missingLabels(profile);
  const status = String(profile?.status ?? '').toUpperCase();

  // gate 모드: 상태 확인 전에는 차단 안내를 깜빡이지 않도록 로딩 동안 children 보류.
  if (mode === 'gate') {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600" />
        </div>
      );
    }
    if (!active) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="text-lg font-bold">공급자 승인이 필요합니다</h2>
            <p className="mt-2 text-sm">
              공급자 승인이 완료된 후 상품을 등록할 수 있습니다. 먼저 담당자 정보를 완료해 주세요.
            </p>
            {labels.length > 0 && (
              <p className="mt-2 text-sm font-medium">
                현재 누락된 정보: {labels.join(', ')}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <Link
                to={PROFILE_PATH}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                담당자 정보 입력하러 가기
              </Link>
              <Link
                to="/supplier"
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
              >
                대시보드로
              </Link>
            </div>
            {status && status !== 'ACTIVE' && (
              <p className="mt-3 text-xs text-amber-700">현재 상태: {status}</p>
            )}
          </div>
        </div>
      );
    }
    return <>{children}</>;
  }

  // banner 모드: children 항상 렌더 + PENDING 배너.
  return (
    <>
      {!loading && !active && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="text-sm font-semibold">공급자 활성화가 아직 완료되지 않았습니다.</p>
          <p className="mt-1 text-sm">
            대시보드 열람과 프로필 작성은 가능하지만, 상품 등록 등 공급 업무는 활성화 이후 가능합니다.
          </p>
          {labels.length > 0 ? (
            <p className="mt-2 text-sm">
              활성화를 위해 다음 정보를 입력해 주세요:{' '}
              <span className="font-medium">{labels.join(', ')}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm">기본 정보 입력이 완료되었습니다. 운영자 승인을 기다리고 있습니다.</p>
          )}
          {labels.length > 0 && (
            <Link
              to={PROFILE_PATH}
              className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              담당자 정보 입력하러 가기
            </Link>
          )}
        </div>
      )}
      {children}
    </>
  );
}
