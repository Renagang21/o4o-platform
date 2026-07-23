/**
 * SupplierActivationGate — 공급자 승인 상태 게이트 / 프로필 보완 안내
 *
 * WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1
 *
 * 원칙: 공급자 가입 승인은 서비스 이용 자격을 결정하고,
 *       공급자 추가정보(대표자명/담당자명/담당자 연락처)는 승인 후 보완하는 프로필 정보로 관리한다.
 *
 * - 차단(gate)은 실제 미승인 상태(PENDING/REJECTED/INACTIVE)에서만 발생한다.
 *   승인(ACTIVE)된 공급자는 프로필이 미완료여도 children 을 그대로 사용한다.
 * - 프로필 완성 상태는 backend(profileComplete/missingProfileFields)가 단일 권위 — 프론트 재계산 금지.
 * - mode='banner' (대시보드): children 항상 렌더.
 *   · 미승인 → 상태 배너(대기/거절/정지)만. 프로필 필드를 승인 조건처럼 요구하지 않는다.
 *   · 승인 + 프로필 미완료 → 보완 배너 + 세션 1회 안내 모달('공급자 정보를 등록해 주세요').
 * - mode='gate' (상품 등록 진입): 미승인일 때만 차단 안내. 프로필 API 실패는 차단하지 않는다
 *   (서버 requireActiveSupplier 가 실제 게이트 — 프론트 실패 시 fail-open).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supplierProfileApi, type SupplierProfile } from '../../lib/api';
import { PROFILE_FIELD_LABELS } from '../../lib/api';

const PROFILE_PATH = '/mypage/business-profile';
const PROFILE_MODAL_SESSION_KEY = 'o4o_supplier_profile_modal_shown';

function missingLabels(profile: SupplierProfile | null): string[] {
  const missing = profile?.missingProfileFields ?? profile?.missingActivationFields ?? [];
  return missing.map((f) => PROFILE_FIELD_LABELS[f] || f);
}

function isProfileComplete(profile: SupplierProfile | null): boolean {
  if (!profile) return true; // 미확인 시 보완 안내를 띄우지 않는다 (fail-open)
  if (typeof profile.profileComplete === 'boolean') return profile.profileComplete;
  return (profile.missingProfileFields ?? profile.missingActivationFields ?? []).length === 0;
}

const STATUS_NOTICES: Record<string, { title: string; body: string }> = {
  PENDING: {
    title: '공급자 승인 대기 중입니다',
    body: '운영자 승인이 완료되면 상품 등록 등 공급 업무를 시작할 수 있습니다.',
  },
  REJECTED: {
    title: '공급자 가입이 거절되었습니다',
    body: '거절 사유는 운영자에게 문의해 주세요.',
  },
  INACTIVE: {
    title: '공급자 이용이 정지되었습니다',
    body: '이용 재개는 운영자에게 문의해 주세요.',
  },
};

function statusNotice(status: string): { title: string; body: string } {
  return (
    STATUS_NOTICES[status] ?? {
      title: '공급자 승인이 필요합니다',
      body: '운영자 승인이 완료된 후 공급 업무를 이용할 수 있습니다.',
    }
  );
}

interface Props {
  mode: 'banner' | 'gate';
  children: React.ReactNode;
}

export default function SupplierActivationGate({ mode, children }: Props) {
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    supplierProfileApi
      .getProfile()
      .then((p) => {
        if (mounted) setProfile(p);
      })
      .catch(() => {
        // API 실패는 이용 흐름을 차단하지 않는다 (서버 게이트가 실제 권위)
        if (mounted) setFetchFailed(true);
      })
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
  const profileComplete = isProfileComplete(profile);

  // 세션 1회 프로필 보완 모달 — 승인 완료 + 프로필 미완료일 때만 (banner 모드 = 대시보드 진입점).
  useEffect(() => {
    if (mode !== 'banner' || loading || !active || profileComplete) return;
    try {
      if (sessionStorage.getItem(PROFILE_MODAL_SESSION_KEY)) return;
      sessionStorage.setItem(PROFILE_MODAL_SESSION_KEY, '1');
      setShowProfileModal(true);
    } catch {
      // sessionStorage 불가 환경에서는 모달 생략 (배너만 노출)
    }
  }, [mode, loading, active, profileComplete]);

  // gate 모드: 실제 미승인(PENDING/REJECTED/INACTIVE)만 차단. 프로필 미완료는 차단 사유가 아니다.
  if (mode === 'gate') {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600" />
        </div>
      );
    }
    // 프로필 조회 실패 → fail-open (서버 게이트가 실제 차단 권위)
    if (!active && !fetchFailed) {
      const notice = statusNotice(status);
      return (
        <div className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="text-lg font-bold">{notice.title}</h2>
            <p className="mt-2 text-sm">{notice.body}</p>
            <div className="mt-4 flex gap-2">
              <Link
                to="/supplier"
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
              >
                대시보드로
              </Link>
            </div>
            {status && <p className="mt-3 text-xs text-amber-700">현재 상태: {status}</p>}
          </div>
        </div>
      );
    }
    return <>{children}</>;
  }

  // banner 모드: children 항상 렌더 + 상태/프로필 배너.
  return (
    <>
      {!loading && !fetchFailed && !active && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="text-sm font-semibold">{statusNotice(status).title}</p>
          <p className="mt-1 text-sm">{statusNotice(status).body}</p>
        </div>
      )}
      {!loading && active && !profileComplete && (
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-900">
          <p className="text-sm font-semibold">공급자 정보를 등록해 주세요</p>
          <p className="mt-1 text-sm">
            승인은 완료되었습니다. 원활한 거래를 위해 공급자 정보를 보완해 주세요.
            {labels.length > 0 && (
              <>
                {' '}
                <span className="font-medium">미입력: {labels.join(', ')}</span>
              </>
            )}
          </p>
          <Link
            to={PROFILE_PATH}
            className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            공급자 정보 등록
          </Link>
        </div>
      )}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">공급자 정보를 등록해 주세요</h2>
            <p className="mt-2 text-sm text-slate-600">
              승인은 완료되었습니다. 대표자명·담당자 정보 등 공급자 정보를 등록하면 매장과의 거래가
              더 원활해집니다.
            </p>
            {labels.length > 0 && (
              <p className="mt-2 text-sm text-slate-500">미입력: {labels.join(', ')}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
              >
                나중에 하기
              </button>
              <Link
                to={PROFILE_PATH}
                onClick={() => setShowProfileModal(false)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                공급자 정보 등록
              </Link>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
