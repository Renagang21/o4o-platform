import { useId } from 'react';
import { Mail, Save, Loader2, CheckCircle, FileText, Upload, Download } from 'lucide-react';
import { inputClass, fileInputClass } from './profilePresentation';
import type { useSupplierOnboarding } from './useSupplierOnboarding';

export default function SupplierOnboardingFields({
  controller,
}: {
  controller: ReturnType<typeof useSupplierOnboarding>;
}) {
  const fieldId = useId();
  const {
    onboarding,
    onboardingSaving,
    onboardingSaved,
    onboardingError,
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
  return (
    <>
      {/* Section A-2: 공급자 온보딩 서류/정산 정보 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-2">
          <FileText className="w-5 h-5 text-gray-500" />
          공급자 서류 및 정산 정보
        </h2>
        {/* WO-O4O-NETURE-SUPPLIER-ACTIVATION-DOCUMENT-GATE-RELAXATION-V1: 단계별 제출 안내 */}
        <p className="text-xs text-gray-500 mb-3">
          공급자 승인은 기본 사업자 정보만으로 진행할 수 있습니다. 아래 서류·정산 정보는 단계별로
          제출하시면 됩니다.
        </p>
        <ul className="text-xs text-gray-500 mb-5 space-y-0.5 list-disc list-inside">
          <li>
            <span className="font-medium text-gray-700">판매 가능 전</span> — 사업자등록증(PDF)
          </li>
          <li>
            <span className="font-medium text-gray-700">정산 전</span> — 정산은행/계좌/예금주, 통장
            사본(PDF), 세금계산서 이메일
          </li>
        </ul>

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
                placeholder="예: 주식회사 O4O"
                className={inputClass}
              />
            </div>
          </div>

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
                사업자등록증 PDF <span className="text-red-500">*</span>
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
                통장 사본 PDF <span className="text-red-500">*</span>
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
              onClick={handleSaveOnboarding}
              disabled={onboardingSaving}
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
