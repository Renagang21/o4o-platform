import { Save, Loader2, CheckCircle, FileText, Upload, Download } from 'lucide-react';
import { inputClass, fileInputClass } from './profilePresentation';
import type { useSupplierOnboarding } from './useSupplierOnboarding';

export default function SupplierMailOrderFields({
  controller,
}: {
  controller: ReturnType<typeof useSupplierOnboarding>;
}) {
  const {
    onboarding,
    onboardingSaving,
    onboardingSaved,
    onboardingError,
    mailOrderReportFile,
    setMailOrderReportFile,
    uploadingDocument,
    mailOrderSalesStatus,
    setMailOrderSalesStatus,
    mailOrderSalesRegistrationNumber,
    setMailOrderSalesRegistrationNumber,
    handleSaveOnboarding,
    handleUploadDocument,
    handleDownloadDocument,
  } = controller;
  return (
    <>
      {/* Section A-3: 통신판매업 신고 정보 (WO-O4O-SUPPLIER-MAIL-ORDER-REPORTING-FIELDS-V1) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-2">
          <FileText className="w-5 h-5 text-gray-500" />
          통신판매업 신고 정보
        </h2>
        <p className="text-xs text-gray-500 mb-5">
          통신판매업 신고 정보가 있는 경우 선택적으로 입력할 수 있습니다. 이 정보는 운영자 확인 또는
          특정 상품 승인 검토 시 참고 정보로 사용될 수 있습니다. 취급 품목이나 판매 방식에 따라 신고
          대상이 아닐 수 있으며, O4O 는 신고 대상 여부나 유효성을 보증하지 않습니다.
        </p>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                통신판매업 신고 상태
              </label>
              <select
                value={mailOrderSalesStatus}
                onChange={(e) => setMailOrderSalesStatus(e.target.value)}
                className={inputClass}
              >
                <option value="">선택 안 함</option>
                <option value="not_applicable">해당 없음</option>
                <option value="reported">신고 완료</option>
                <option value="pending">신고 예정 또는 확인 필요</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                통신판매업 신고번호
                {mailOrderSalesStatus === 'reported' && <span className="text-red-500"> *</span>}
              </label>
              <input
                type="text"
                value={mailOrderSalesRegistrationNumber}
                onChange={(e) => setMailOrderSalesRegistrationNumber(e.target.value)}
                placeholder="예: 2026-서울강남-01234"
                className={inputClass}
              />
              {mailOrderSalesStatus === 'reported' && (
                <p className="mt-1 text-xs text-gray-400">
                  신고 완료 상태에서는 신고번호가 필요합니다.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              통신판매업 신고증 PDF
            </label>
            {onboarding?.mailOrderSalesDocument && (
              <button
                type="button"
                onClick={() => handleDownloadDocument('mail_order_report')}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-800 mb-3"
              >
                <Download className="w-3.5 h-3.5" />
                제출 파일 열람
              </button>
            )}
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setMailOrderReportFile(e.target.files?.[0] || null)}
              className={fileInputClass}
            />
            <button
              type="button"
              onClick={() => handleUploadDocument('mail_order_report')}
              disabled={uploadingDocument !== null || !mailOrderReportFile}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {uploadingDocument === 'mail_order_report' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              업로드
            </button>
            <p className="mt-2 text-xs text-gray-400">신고증 PDF 는 선택 사항입니다.</p>
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
              {onboardingSaving
                ? '저장 중...'
                : onboardingSaved
                  ? '저장됨'
                  : '통신판매업 정보 저장'}
            </button>
            {onboardingError && <p className="text-sm text-red-500">{onboardingError}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
