/**
 * PharmacistApplyPage
 *
 * WO-GLYCOPHARM-MEMBER-REGISTER-FLOW-V1
 * 약사 회원 가입 신청 — subRole + licenseNumber + 약국 정보 입력
 *
 * 접근: 로그인 사용자 (아직 glycopharm:pharmacist 역할 없음)
 * 이미 신청한 경우 → 상태 표시
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Building2, Users, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { glycopharmApi } from '@/api/glycopharm';
import type { GlycopharmMemberRecord } from '@/api/glycopharm';

type SubRole = 'pharmacy_owner' | 'staff_pharmacist';
type PageStatus = 'loading' | 'idle' | 'submitting' | 'success' | 'already_applied' | 'error';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: '승인 대기 중', color: 'text-amber-700' },
  approved:  { label: '승인됨',      color: 'text-green-700' },
  rejected:  { label: '거절됨',      color: 'text-red-700' },
  suspended: { label: '정지됨',      color: 'text-slate-600' },
};

export default function PharmacistApplyPage() {
  const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
  const [existing, setExisting] = useState<GlycopharmMemberRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [subRole, setSubRole] = useState<SubRole>('pharmacy_owner');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacyAddress, setPharmacyAddress] = useState('');

  // 기존 신청 여부 확인
  useEffect(() => {
    glycopharmApi.getMyMembership()
      .then((res) => {
        if (res.data) {
          setExisting(res.data);
          setPageStatus('already_applied');
        } else {
          setPageStatus('idle');
        }
      })
      .catch(() => setPageStatus('idle'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subRole) return;
    if (subRole === 'pharmacy_owner' && !pharmacyName.trim()) {
      setError('약국경영자는 약국명을 입력해주세요.');
      return;
    }

    setPageStatus('submitting');
    setError(null);

    try {
      await glycopharmApi.applyMembership({
        subRole,
        licenseNumber: licenseNumber.trim() || undefined,
        pharmacyName: pharmacyName.trim() || undefined,
        pharmacyAddress: pharmacyAddress.trim() || undefined,
      });
      setPageStatus('success');
    } catch (err: any) {
      const code = err?.response?.data?.code ?? err?.code;
      if (code === 'ALREADY_APPLIED') {
        setError('이미 신청하신 내역이 있습니다.');
      } else {
        setError(err?.response?.data?.error ?? '신청 처리 중 오류가 발생했습니다.');
      }
      setPageStatus('idle');
    }
  };

  // ── 로딩 ──
  if (pageStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // ── 이미 신청함 ──
  if (pageStatus === 'already_applied' && existing) {
    const statusInfo = STATUS_LABEL[existing.status] ?? { label: existing.status, color: 'text-slate-600' };
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-white">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">신청 내역이 있습니다</h2>
          <p className="text-slate-500 mb-4">
            이미 약사 회원 신청을 완료하셨습니다.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 text-left mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">직역</span>
              <span className="text-slate-700 font-medium">
                {existing.subRole === 'pharmacy_owner' ? '약국경영자' : '근무약사'}
              </span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">상태</span>
              <span className={`font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
            </div>
            {existing.rejectionReason && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 rounded p-2">
                거절 사유: {existing.rejectionReason}
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-400 mt-2">
              <span>신청일</span>
              <span>{new Date(existing.createdAt).toLocaleDateString('ko-KR')}</span>
            </div>
          </div>
          <Link to="/" className="inline-block px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors text-sm font-medium">
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  // ── 신청 완료 ──
  if (pageStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-white">
        <div className="max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">신청 완료</h2>
          <p className="text-slate-500 mb-6">
            약사 회원 신청이 접수되었습니다.<br />
            운영자 승인 후 약사 기능을 이용하실 수 있습니다.
          </p>
          <Link to="/" className="inline-block px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors text-sm font-medium">
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  // ── 신청 폼 ──
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-white">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">약사 회원 신청</h1>
            <p className="text-sm text-slate-500">약사 직역을 인증하고 전용 기능을 이용하세요</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 직역 선택 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">직역 <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSubRole('pharmacy_owner')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  subRole === 'pharmacy_owner'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Building2 className="w-6 h-6" />
                <span className="text-sm font-medium">약국경영자</span>
              </button>
              <button
                type="button"
                onClick={() => setSubRole('staff_pharmacist')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  subRole === 'staff_pharmacist'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Users className="w-6 h-6" />
                <span className="text-sm font-medium">근무약사</span>
              </button>
            </div>
          </div>

          {/* 면허번호 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">약사 면허번호</label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="면허번호 입력 (선택)"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* 약국명 (경영자 필수) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              약국명
              {subRole === 'pharmacy_owner' && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={pharmacyName}
              onChange={(e) => setPharmacyName(e.target.value)}
              placeholder={subRole === 'pharmacy_owner' ? '약국명 입력 (필수)' : '약국명 입력 (선택)'}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* 약국 주소 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">약국 주소</label>
            <input
              type="text"
              value={pharmacyAddress}
              onChange={(e) => setPharmacyAddress(e.target.value)}
              placeholder="주소 입력 (선택)"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pageStatus === 'submitting'}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {pageStatus === 'submitting' && <Loader2 className="w-4 h-4 animate-spin" />}
            {pageStatus === 'submitting' ? '신청 중...' : '신청하기'}
          </button>

          <p className="text-xs text-slate-400 text-center">
            신청 후 운영자 검토 및 승인 절차가 진행됩니다.
          </p>
        </form>
      </div>
    </div>
  );
}
