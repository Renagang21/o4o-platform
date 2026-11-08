import { useState, useCallback } from 'react';
import { supplierOnboardingApi, type SupplierOnboarding } from '../../../lib/api';

/** 온보딩 화면의 저장 범위 (WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T4). */
export type SupplierOnboardingScope = 'settlement' | 'mailOrder';
type DocumentType = 'business_registration' | 'bank_statement' | 'mail_order_report';
const documentScope = (type: DocumentType): SupplierOnboardingScope =>
  type === 'mail_order_report' ? 'mailOrder' : 'settlement';

export function useSupplierOnboarding() {
  const [onboarding, setOnboarding] = useState<SupplierOnboarding | null>(null);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingSaved, setOnboardingSaved] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [businessRegistrationFile, setBusinessRegistrationFile] = useState<File | null>(null);
  const [bankbookFile, setBankbookFile] = useState<File | null>(null);
  const [mailOrderReportFile, setMailOrderReportFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState<
    'business_registration' | 'bank_statement' | 'mail_order_report' | null
  >(null);
  const [onboardingLoadError, setOnboardingLoadError] = useState(false);
  const [onboardingScope, setOnboardingScope] = useState<SupplierOnboardingScope | null>(null);
  const [taxInvoiceEmail, setTaxInvoiceEmail] = useState('');
  const [settlementBankName, setSettlementBankName] = useState('');
  const [settlementAccountNumber, setSettlementAccountNumber] = useState('');
  const [settlementAccountHolder, setSettlementAccountHolder] = useState('');
  const [settlementContactName, setSettlementContactName] = useState('');
  const [settlementContactEmail, setSettlementContactEmail] = useState('');
  const [mailOrderSalesStatus, setMailOrderSalesStatus] = useState('');
  const [mailOrderSalesRegistrationNumber, setMailOrderSalesRegistrationNumber] = useState('');

  /**
   * WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T5: 초기화와 재조회가 같은 필드 대입을 두 번 적던 것을 하나로 모은다.
   *   profileTaxInvoiceEmail 은 초기 조회에서만 넘긴다 — onboarding 값이 비었을 때의 기존 대체값(동작 불변).
   */
  const applyOnboarding = useCallback(
    (data: SupplierOnboarding, profileTaxInvoiceEmail?: string | null) => {
      setOnboarding(data);
      setTaxInvoiceEmail(data.taxInvoiceEmail || profileTaxInvoiceEmail || '');
      setSettlementBankName(data.settlementBankName || '');
      setSettlementAccountNumber(data.settlementAccountNumber || '');
      setSettlementAccountHolder(data.settlementAccountHolder || '');
      setSettlementContactName(data.settlementContactName || '');
      setSettlementContactEmail(data.settlementContactEmail || '');
      setMailOrderSalesStatus(data.mailOrderSalesStatus || '');
      setMailOrderSalesRegistrationNumber(data.mailOrderSalesRegistrationNumber || '');
    },
    [],
  );
  const initializeOnboarding = applyOnboarding;

  const refreshOnboarding = async () => {
    try {
      applyOnboarding(await supplierOnboardingApi.getOnboarding());
      setOnboardingLoadError(false);
    } catch {
      setOnboardingLoadError(true);
    }
  };

  /**
   * WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T4: 정산 저장과 통신판매업 저장은 자기 필드만 보낸다.
   *   이전에는 두 버튼이 8개 필드를 모두 보내서, 통신판매업 신고번호 누락이 정산 저장까지 막았다.
   *   scope 를 생략하면 둘 다 보낸다(기존 호출 호환).
   */
  const handleSaveOnboarding = async (scope?: SupplierOnboardingScope) => {
    const target = typeof scope === 'string' ? scope : null;
    setOnboardingScope(target);
    setOnboardingSaving(true);
    setOnboardingSaved(false);
    setOnboardingError(null);

    const settlement = {
      taxInvoiceEmail,
      settlementBankName,
      settlementAccountNumber,
      settlementAccountHolder,
      settlementContactName,
      settlementContactEmail,
    };
    const mailOrder = { mailOrderSalesStatus, mailOrderSalesRegistrationNumber };
    const result = await supplierOnboardingApi.updateOnboarding({
      ...(target === null || target === 'settlement' ? settlement : {}),
      ...(target === null || target === 'mailOrder' ? mailOrder : {}),
    });

    setOnboardingSaving(false);
    if (result.success) {
      if (result.data) setOnboarding(result.data);
      setOnboardingSaved(true);
      setTimeout(() => setOnboardingSaved(false), 3000);
    } else {
      setOnboardingError(result.error || '온보딩 정보 저장에 실패했습니다.');
    }
  };

  /** 각 섹션이 자기 저장 · 업로드의 진행과 결과만 보이게 한다. */
  const scopeStatus = (scope: SupplierOnboardingScope) => {
    const own = onboardingScope === null || onboardingScope === scope;
    return {
      saving: onboardingSaving && own,
      saved: onboardingSaved && own,
      error: own ? onboardingError : null,
    };
  };

  const handleUploadDocument = async (
    documentType: 'business_registration' | 'bank_statement' | 'mail_order_report',
  ) => {
    const file =
      documentType === 'business_registration'
        ? businessRegistrationFile
        : documentType === 'mail_order_report'
          ? mailOrderReportFile
          : bankbookFile;
    setOnboardingScope(documentScope(documentType));
    if (!file) {
      setOnboardingError('PDF 파일을 선택해 주시기 바랍니다.');
      return;
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setOnboardingError('PDF 파일만 업로드할 수 있습니다.');
      return;
    }

    setUploadingDocument(documentType);
    setOnboardingError(null);
    const result = await supplierOnboardingApi.uploadDocument(documentType, file);
    setUploadingDocument(null);

    if (result.success) {
      if (documentType === 'business_registration') setBusinessRegistrationFile(null);
      else if (documentType === 'mail_order_report') setMailOrderReportFile(null);
      else setBankbookFile(null);
      await refreshOnboarding();
    } else {
      setOnboardingError(result.error || '문서 업로드에 실패했습니다.');
    }
  };

  const handleDownloadDocument = async (
    documentType: 'business_registration' | 'bank_statement' | 'mail_order_report',
  ) => {
    const blob = await supplierOnboardingApi.downloadDocument(documentType);
    setOnboardingScope(documentScope(documentType));
    if (!blob) {
      setOnboardingError('문서를 열 수 없습니다.');
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  return {
    onboarding,
    setOnboarding,
    onboardingSaving,
    setOnboardingSaving,
    onboardingSaved,
    setOnboardingSaved,
    onboardingError,
    setOnboardingError,
    businessRegistrationFile,
    setBusinessRegistrationFile,
    bankbookFile,
    setBankbookFile,
    mailOrderReportFile,
    setMailOrderReportFile,
    uploadingDocument,
    setUploadingDocument,
    onboardingLoadError,
    setOnboardingLoadError,
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
    mailOrderSalesStatus,
    setMailOrderSalesStatus,
    mailOrderSalesRegistrationNumber,
    setMailOrderSalesRegistrationNumber,
    initializeOnboarding,
    refreshOnboarding,
    handleSaveOnboarding,
    scopeStatus,
    handleUploadDocument,
    handleDownloadDocument,
  };
}
