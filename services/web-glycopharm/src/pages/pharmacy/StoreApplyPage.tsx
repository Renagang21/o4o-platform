/**
 * StoreApplyPage - 약국 판매 참여 신청 (스토어 노출 권한 신청)
 *
 * Work Order 요구사항:
 * - 자동 등록 금지 / 신청 + 승인 필수
 * - 법정 고지 정보는 신청 시 확정
 * - 승인 전 스토어는 소비자 접근 불가
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Building2,
  FileText,
  Shield,
  Loader2,
} from 'lucide-react';
import { storeApi } from '@/api/store';
import type { StoreApplicationForm, StoreApplication } from '@/types/store';

type Step = 'intro' | 'legal-info' | 'agreements' | 'confirm';
type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

const INITIAL_FORM: StoreApplicationForm = {
  // 사업자 정보
  businessName: '',
  businessNumber: '',
  representativeName: '',
  businessAddress: '',
  businessPhone: '',
  businessEmail: '',
  // 통신판매업 정보
  onlineSalesNumber: '',
  onlineSalesRegisteredAt: '',
  // 약국 정보
  pharmacyName: '',
  pharmacistName: '',
  pharmacistLicense: '',
  pharmacyPhone: '',
  pharmacyAddress: '',
  // 정산 정보
  bankName: '',
  bankAccountNumber: '',
  bankAccountHolder: '',
  // 동의 항목
  agreedTerms: false,
  agreedPrivacy: false,
  agreedMarketing: false,
};

export default function StoreApplyPage() {
  const [step, setStep] = useState<Step>('intro');
  const [form, setForm] = useState<StoreApplicationForm>(INITIAL_FORM);
  const [existingApplication, setExistingApplication] = useState<StoreApplication | null>(null);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 기존 신청서 확인
  useEffect(() => {
    const checkExistingApplication = async () => {
      try {
        const res = await storeApi.getMyStoreApplication();
        if (res.success && res.data) {
          setExistingApplication(res.data);
          // 임시저장된 내용이 있으면 불러오기
          if (res.data.status === 'draft') {
            setForm({ ...INITIAL_FORM, ...res.data.form });
          }
        }
      } catch (err) {
        console.error('Failed to check existing application:', err);
      } finally {
        setLoading(false);
      }
    };
    checkExistingApplication();
  }, []);

  const updateForm = (updates: Partial<StoreApplicationForm>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    const steps: Step[] = ['intro', 'legal-info', 'agreements', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['intro', 'legal-info', 'agreements', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await storeApi.saveStoreApplicationDraft(form);
      alert('임시저장되었습니다.');
    } catch (err: any) {
      alert(err.message || '임시저장에 실패했습니다.');
    }
  };

  const handleSubmit = async () => {
    // 필수 입력 검증
    if (!form.agreedTerms || !form.agreedPrivacy) {
      setErrorMessage('필수 동의 항목을 체크해주세요.');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    try {
      await storeApi.submitStoreApplication(form);
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || '신청 중 오류가 발생했습니다.');
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  // 이미 제출된 신청이 있는 경우
  if (existingApplication && existingApplication.status !== 'draft') {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            {existingApplication.status === 'submitted' && (
              <>
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3">심사 진행 중</h2>
                <p className="text-slate-500 mb-6">
                  판매 참여 신청서가 접수되어 심사 중입니다.<br />
                  승인 결과는 등록된 연락처로 안내됩니다.
                </p>
              </>
            )}
            {existingApplication.status === 'reviewing' && (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3">서류 검토 중</h2>
                <p className="text-slate-500 mb-6">
                  담당자가 제출하신 서류를 검토하고 있습니다.
                </p>
              </>
            )}
            {existingApplication.status === 'supplementing' && (
              <>
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3">보완 요청</h2>
                <p className="text-slate-500 mb-4">
                  신청서에 보완이 필요합니다.
                </p>
                {existingApplication.supplementRequest && (
                  <div className="p-4 bg-orange-50 rounded-xl text-left mb-6">
                    <p className="text-sm text-orange-700">{existingApplication.supplementRequest}</p>
                  </div>
                )}
              </>
            )}
            {existingApplication.status === 'approved' && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3">승인 완료</h2>
                <p className="text-slate-500 mb-6">
                  판매 참여가 승인되었습니다.<br />
                  이제 고객에게 약국 몰이 노출됩니다.
                </p>
                <Link
                  to="/pharmacy"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700"
                >
                  <Store className="w-5 h-5" />
                  약국 관리 바로가기
                </Link>
              </>
            )}
            {existingApplication.status === 'rejected' && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3">신청 반려</h2>
                <p className="text-slate-500 mb-4">
                  신청이 반려되었습니다.
                </p>
                {existingApplication.rejectionReason && (
                  <div className="p-4 bg-red-50 rounded-xl text-left mb-6">
                    <p className="text-sm text-red-700">{existingApplication.rejectionReason}</p>
                  </div>
                )}
              </>
            )}
            <Link
              to="/"
              className="inline-block mt-4 text-primary-600 hover:text-primary-700 font-medium"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 제출 성공 화면
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <div className="max-w-lg mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">신청이 완료되었습니다</h2>
            <p className="text-slate-500 mb-8">
              판매 참여 신청서가 접수되었습니다.<br />
              심사 후 승인되면 약국 몰이 소비자에게 노출됩니다.
            </p>
            <div className="p-4 bg-amber-50 rounded-xl mb-6">
              <p className="text-sm text-amber-700">
                <strong>중요:</strong> 승인 전까지 약국 몰은 소비자에게 표시되지 않습니다.
              </p>
            </div>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {['안내', '법적 정보', '약관 동의', '제출 확인'].map((label, index) => {
              const steps: Step[] = ['intro', 'legal-info', 'agreements', 'confirm'];
              const isActive = steps.indexOf(step) >= index;
              return (
                <div key={label} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className={`ml-2 text-sm hidden sm:inline ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                    {label}
                  </span>
                  {index < 3 && (
                    <div className={`w-8 sm:w-16 h-0.5 mx-2 ${isActive && steps.indexOf(step) > index ? 'bg-primary-600' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: 안내 */}
        {step === 'intro' && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="w-8 h-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-3">온라인 판매 참여 신청</h1>
              <p className="text-slate-500">
                GlycoPharm 플랫폼에서 온라인 판매를 시작하세요.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-800 mb-1">승인 후 판매 시작</h3>
                    <p className="text-sm text-slate-500">
                      신청 후 <strong>운영자 승인</strong>을 거쳐야 약국 몰이 소비자에게 노출됩니다.
                      자동 등록되지 않습니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-800 mb-1">법적 정보 필수</h3>
                    <p className="text-sm text-slate-500">
                      통신판매업 신고번호, 사업자 정보, 관리약사 정보 등
                      <strong>전자상거래법</strong>에 따른 필수 정보를 입력해야 합니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-800 mb-1">책임 확인</h3>
                    <p className="text-sm text-slate-500">
                      입력하신 정보는 소비자에게 표시되는 <strong>법정 고지 사항</strong>의 출처가 됩니다.
                      정확하게 입력해주세요.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              신청 시작하기
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 2: 법적 정보 입력 */}
        {step === 'legal-info' && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">법적 정보 입력</h2>

            {/* 사업자 정보 */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-600 uppercase mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                사업자 정보
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">상호 *</label>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(e) => updateForm({ businessName: e.target.value })}
                    placeholder="OO약국"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">대표자명 *</label>
                  <input
                    type="text"
                    value={form.representativeName}
                    onChange={(e) => updateForm({ representativeName: e.target.value })}
                    placeholder="홍길동"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">사업자등록번호 *</label>
                  <input
                    type="text"
                    value={form.businessNumber}
                    onChange={(e) => updateForm({ businessNumber: e.target.value })}
                    placeholder="123-45-67890"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">통신판매업 신고번호 *</label>
                  <input
                    type="text"
                    value={form.onlineSalesNumber}
                    onChange={(e) => updateForm({ onlineSalesNumber: e.target.value })}
                    placeholder="제2024-서울강남-12345호"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">사업장 주소 *</label>
                  <input
                    type="text"
                    value={form.businessAddress}
                    onChange={(e) => updateForm({ businessAddress: e.target.value })}
                    placeholder="서울시 강남구 테헤란로 123"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">고객센터 연락처 *</label>
                  <input
                    type="tel"
                    value={form.businessPhone}
                    onChange={(e) => updateForm({ businessPhone: e.target.value })}
                    placeholder="02-1234-5678"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
                  <input
                    type="email"
                    value={form.businessEmail}
                    onChange={(e) => updateForm({ businessEmail: e.target.value })}
                    placeholder="contact@pharmacy.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            {/* 약국 정보 */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-600 uppercase mb-4">관리약사 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">관리약사 성명 *</label>
                  <input
                    type="text"
                    value={form.pharmacistName}
                    onChange={(e) => updateForm({ pharmacistName: e.target.value })}
                    placeholder="김약사"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">약사면허번호 *</label>
                  <input
                    type="text"
                    value={form.pharmacistLicense}
                    onChange={(e) => updateForm({ pharmacistLicense: e.target.value })}
                    placeholder="12345"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 정산 정보 */}
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-600 uppercase mb-4">정산 계좌 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">은행 *</label>
                  <input
                    type="text"
                    value={form.bankName}
                    onChange={(e) => updateForm({ bankName: e.target.value })}
                    placeholder="OO은행"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">계좌번호 *</label>
                  <input
                    type="text"
                    value={form.bankAccountNumber}
                    onChange={(e) => updateForm({ bankAccountNumber: e.target.value })}
                    placeholder="123-456-789012"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">예금주 *</label>
                  <input
                    type="text"
                    value={form.bankAccountHolder}
                    onChange={(e) => updateForm({ bankAccountHolder: e.target.value })}
                    placeholder="OO약국"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 py-4 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                이전
              </button>
              <button
                onClick={handleSaveDraft}
                className="py-4 px-6 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                임시저장
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
              >
                다음
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 약관 동의 */}
        {step === 'agreements' && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">약관 및 동의</h2>

            <div className="space-y-4 mb-8">
              <div className="p-4 border border-slate-200 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agreedTerms}
                    onChange={(e) => updateForm({ agreedTerms: e.target.checked })}
                    className="w-5 h-5 mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <p className="font-medium text-slate-800">
                      <span className="text-red-500">[필수]</span> 전자상거래 이용약관 동의
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      전자상거래등에서의 소비자보호에 관한 법률에 따른 판매자 의무를 준수합니다.
                    </p>
                  </div>
                </label>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agreedPrivacy}
                    onChange={(e) => updateForm({ agreedPrivacy: e.target.checked })}
                    className="w-5 h-5 mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <p className="font-medium text-slate-800">
                      <span className="text-red-500">[필수]</span> 개인정보 처리방침 동의
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      고객 개인정보를 관련 법령에 따라 안전하게 처리합니다.
                    </p>
                  </div>
                </label>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.agreedMarketing || false}
                    onChange={(e) => updateForm({ agreedMarketing: e.target.checked })}
                    className="w-5 h-5 mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <p className="font-medium text-slate-800">
                      <span className="text-slate-400">[선택]</span> 마케팅 정보 수신 동의
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      플랫폼 프로모션 및 이벤트 정보를 수신합니다.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl mb-6">
              <p className="text-sm text-slate-600">
                <strong>법적 책임 안내:</strong> 입력하신 사업자 정보, 통신판매업 신고번호, 관리약사 정보는
                소비자에게 표시되는 법정 고지 사항으로 사용됩니다. 허위 정보 기재 시 법적 책임이 발생할 수 있습니다.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 py-4 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                이전
              </button>
              <button
                onClick={handleNext}
                disabled={!form.agreedTerms || !form.agreedPrivacy}
                className="flex-1 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                다음
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: 제출 확인 */}
        {step === 'confirm' && (
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">제출 확인</h2>

            <div className="space-y-4 mb-8">
              <div className="p-4 bg-slate-50 rounded-xl">
                <h3 className="text-sm font-semibold text-slate-600 mb-3">사업자 정보</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-slate-500">상호</dt>
                  <dd className="text-slate-800 font-medium">{form.businessName || '-'}</dd>
                  <dt className="text-slate-500">대표자</dt>
                  <dd className="text-slate-800 font-medium">{form.representativeName || '-'}</dd>
                  <dt className="text-slate-500">사업자번호</dt>
                  <dd className="text-slate-800 font-medium">{form.businessNumber || '-'}</dd>
                  <dt className="text-slate-500">통신판매업</dt>
                  <dd className="text-slate-800 font-medium">{form.onlineSalesNumber || '-'}</dd>
                  <dt className="text-slate-500">주소</dt>
                  <dd className="text-slate-800 font-medium col-span-1">{form.businessAddress || '-'}</dd>
                </dl>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <h3 className="text-sm font-semibold text-slate-600 mb-3">관리약사</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-slate-500">성명</dt>
                  <dd className="text-slate-800 font-medium">{form.pharmacistName || '-'}</dd>
                  <dt className="text-slate-500">면허번호</dt>
                  <dd className="text-slate-800 font-medium">{form.pharmacistLicense || '-'}</dd>
                </dl>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <h3 className="text-sm font-semibold text-slate-600 mb-3">정산 계좌</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-slate-500">은행</dt>
                  <dd className="text-slate-800 font-medium">{form.bankName || '-'}</dd>
                  <dt className="text-slate-500">계좌번호</dt>
                  <dd className="text-slate-800 font-medium">{form.bankAccountNumber || '-'}</dd>
                  <dt className="text-slate-500">예금주</dt>
                  <dd className="text-slate-800 font-medium">{form.bankAccountHolder || '-'}</dd>
                </dl>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl">
                <h3 className="text-sm font-semibold text-slate-600 mb-3">동의 항목</h3>
                <ul className="text-sm space-y-1">
                  <li className={form.agreedTerms ? 'text-green-600' : 'text-red-500'}>
                    {form.agreedTerms ? '✓' : '✗'} 전자상거래 이용약관
                  </li>
                  <li className={form.agreedPrivacy ? 'text-green-600' : 'text-red-500'}>
                    {form.agreedPrivacy ? '✓' : '✗'} 개인정보 처리방침
                  </li>
                  <li className={form.agreedMarketing ? 'text-green-600' : 'text-slate-400'}>
                    {form.agreedMarketing ? '✓' : '-'} 마케팅 정보 수신
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
              <p className="text-sm text-amber-700">
                <strong>주의:</strong> 제출 후에는 내용을 수정할 수 없습니다.
                입력 내용을 다시 한번 확인해주세요.
              </p>
            </div>

            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleBack}
                disabled={status === 'loading'}
                className="flex-1 py-4 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ArrowLeft className="w-5 h-5" />
                이전
              </button>
              <button
                onClick={handleSubmit}
                disabled={status === 'loading'}
                className="flex-1 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    제출 중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    신청서 제출
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
