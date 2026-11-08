import { useEffect, useId, useState } from 'react';
import { Mail, Save, Loader2, CheckCircle, FileText, Upload, Download } from 'lucide-react';
import { inputClass, fileInputClass } from './profilePresentation';
import type { useSupplierOnboarding } from './useSupplierOnboarding';

export default function SupplierOnboardingFields({
  controller,
  manager,
  businessName,
}: {
  controller: ReturnType<typeof useSupplierOnboarding>;
  /** 담당자 정보 묶음의 현재 입력 — "담당자와 같음" 이 복사한다(WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T4). */
  manager?: { name: string; email: string };
  /** 상호명 — 예금주가 비었을 때 "상호명으로 채우기" 가 쓴다. 자동 저장하지 않는다. */
  businessName?: string;
}) {
  const fieldId = useId();
  const {
    onboarding,
    scopeStatus,
    businessRegistrationFile,
    setBusinessRegistrationFile,
    bankbookFile,
    setBankbookFile,
    uploadingDocument,
    onboardingLoadError,
    taxInvoiceEmail,
    setTaxInvoiceEmail,
    settlementBankName,
    setSettlementBankName,
    settlementAccountNumber,
    setSettlementAccountNumber,
    settlementAccountHolder,
    setSettlementAccountHolder,
    settlementContactName,
    setSettlementContactName,
    settlementContactEmail,
    setSettlementContactEmail,
    refreshOnboarding,
    handleSaveOnboarding,
    handleUploadDocument,
    handleDownloadDocument,
  } = controller;
  const {
    saving: onboardingSaving,
    saved: onboardingSaved,
    error: onboardingError,
  } = scopeStatus('settlement');
  const [sameAsManager, setSameAsManager] = useState(false);
  // 체크된 동안은 담당자 입력을 따라간다. 체크를 풀면 마지막 값이 남고 직접 고칠 수 있다.
  useEffect(() => {
    if (!sameAsManager || !manager) return;
    setSettlementContactName(manager.name);
    setSettlementContactEmail(manager.email);
  }, [sameAsManager, manager?.name, manager?.email, setSettlementContactName, setSettlementContactEmail]);
  const holderFill = businessName?.trim();
  return (
    <>
      {/* Section A-2: 공급자 온보딩 서류/정산 정보 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-2">
          <FileText className="w-5 h-5 text-gray-500" />
          공급자 서류 및 정산 정보
        </h3>
        <p className="text-xs text-gray-500 mb-5"><span className="text-red-500">*</span> 표시(세금계산서 이메일 · 은행명 · 계좌번호 · 예금주)는 실제 정산에 필요합니다. 승인과는 별개이며 나중에 보완할 수 있습니다. 증빙 파일은 선택입니다.</p>

        {/* WO-O4O-NETURE-SUPPLIER-PROFILE-AUX-LOAD-ERROR-CONTRACT-V1:
            조회 실패를 "미입력" 으로 오인시키지 않는다. 입력값은 비우지 않고 안내만 덧붙인다. */}
        {onboardingLoadError && (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-900">온보딩 정보를 불러오지 못했습니다.</p>
            <p className="mt-0.5 text-xs text-amber-800">아래 값은 최신 상태가 아닐 수 있습니다.</p>
            <button
              type="button"
              onClick={refreshOnboarding}
              className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              다시 시도
            </button>
          </div>
        )}

        <div className="space-y-5">
          {/* 세금계산서 이메일 — WO-O4O-SUPPLIER-IDENTITY-...-CANONICALIZATION-V1 §E:
              쓰기 소유 = PATCH /supplier/onboarding. 이 섹션의 "정산 정보 저장" 이 저장한다. */}
          <div>
            <label
              htmlFor={`${fieldId}-field-0`}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              세금계산서 이메일 <span className="text-red-500">*</span>
            </label>
            <input
              id={`${fieldId}-field-0`}
              type="email"
              value={taxInvoiceEmail}
              onChange={(e) => setTaxInvoiceEmail(e.target.value)}
              placeholder="tax@company.com"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor={`${fieldId}-field-1`}
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                은행명 <span className="text-red-500">*</span>
              </label>
              <input
                id={`${fieldId}-field-1`}
                type="text"
                value={settlementBankName}
                onChange={(e) => setSettlementBankName(e.target.value)}
                placeholder="예: 국민은행"
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor={`${fieldId}-field-2`}
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                계좌번호 <span className="text-red-500">*</span>
              </label>
              <input
                id={`${fieldId}-field-2`}
                type="text"
                value={settlementAccountNumber}
                onChange={(e) => setSettlementAccountNumber(e.target.value)}
                placeholder="숫자와 하이픈 입력"
                className={inputClass}
              />
              {onboarding?.settlementAccountNumberMasked && (
                <p className="mt-1 text-xs text-gray-400">
                  저장된 계좌: {onboarding.settlementAccountNumberMasked}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor={`${fieldId}-field-3`}
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                예금주 <span className="text-red-500">*</span>
              </label>
              <input
                id={`${fieldId}-field-3`}
                type="text"
                value={settlementAccountHolder}
                onChange={(e) => setSettlementAccountHolder(e.target.value)}
                placeholder={holderFill ? `예: ${holderFill}` : '예: 주식회사 O4O'}
                className={inputClass}
              />
              {holderFill && !settlementAccountHolder.trim() && (
                <button
                  type="button"
                  onClick={() => setSettlementAccountHolder(holderFill)}
                  className="mt-1 text-xs font-medium text-primary-700 hover:text-primary-800"
                >
                  상호명으로 채우기
                </button>
              )}
            </div>
          </div>

          {manager && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={sameAsManager}
                onChange={(e) => setSameAsManager(e.target.checked)}
              />
              정산 담당자가 담당자와 같음
            </label>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={`${fieldId}-field-4`}
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                정산 담당자명
              </label>
              <input
                id={`${fieldId}-field-4`}
                type="text"
                value={settlementContactName}
                onChange={(e) => setSettlementContactName(e.target.value)}
                placeholder="선택"
                readOnly={sameAsManager}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor={`${fieldId}-field-5`}
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                정산 담당자 이메일
              </label>
              <input
                id={`${fieldId}-field-5`}
                type="email"
                value={settlementContactEmail}
                onChange={(e) => setSettlementContactEmail(e.target.value)}
                placeholder="settlement@company.com"
                readOnly={sameAsManager}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <label
                htmlFor={`${fieldId}-field-6`}
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                사업자등록증 PDF (선택)
              </label>
              {onboarding?.businessRegistrationDocument && (
                <button
                  type="button"
                  onClick={() => handleDownloadDocument('business_registration')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-800 mb-3"
                >
                  <Download className="w-3.5 h-3.5" />
                  제출 파일 열람
                </button>
              )}
              <input
                id={`${fieldId}-field-6`}
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setBusinessRegistrationFile(e.target.files?.[0] || null)}
                className={fileInputClass}
              />
              <button
                type="button"
                onClick={() => handleUploadDocument('business_registration')}
                disabled={uploadingDocument !== null || !businessRegistrationFile}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {uploadingDocument === 'business_registration' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                업로드
              </button>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <label
                htmlFor={`${fieldId}-field-7`}
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                통장 사본 PDF (선택)
              </label>
              {onboarding?.settlementBankbookDocument && (
                <button
                  type="button"
                  onClick={() => handleDownloadDocument('bank_statement')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-800 mb-3"
                >
                  <Download className="w-3.5 h-3.5" />
                  제출 파일 열람
                </button>
              )}
              <input
                id={`${fieldId}-field-7`}
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setBankbookFile(e.target.files?.[0] || null)}
                className={fileInputClass}
              />
              <button
                type="button"
                onClick={() => handleUploadDocument('bank_statement')}
                disabled={uploadingDocument !== null || !bankbookFile}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {uploadingDocument === 'bank_statement' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                업로드
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSaveOnboarding('settlement')}
              disabled={controller.onboardingSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50"
            >
              {onboardingSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : onboardingSaved ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {onboardingSaving ? '저장 중...' : onboardingSaved ? '저장됨' : '정산 정보 저장'}
            </button>
            {onboardingError && <p className="text-sm text-red-500">{onboardingError}</p>}
            {onboardingSaved && (
              <p className="text-sm text-green-600">온보딩 정보가 저장되었습니다.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
