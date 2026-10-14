import { useState, useCallback } from 'react';
import { supplierOnboardingApi, type SupplierOnboarding } from '../../../lib/api';

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
  const [taxInvoiceEmail, setTaxInvoiceEmail] = useState('');
  const [settlementBankName, setSettlementBankName] = useState('');
  const [settlementAccountNumber, setSettlementAccountNumber] = useState('');
  const [settlementAccountHolder, setSettlementAccountHolder] = useState('');
  const [settlementContactName, setSettlementContactName] = useState('');
  const [settlementContactEmail, setSettlementContactEmail] = useState('');
  const [mailOrderSalesStatus, setMailOrderSalesStatus] = useState('');
  const [mailOrderSalesRegistrationNumber, setMailOrderSalesRegistrationNumber] = useState('');

  const initializeOnboarding = useCallback(
    (onboardingData: SupplierOnboarding, profileTaxInvoiceEmail?: string | null) => {
      setOnboarding(onboardingData);
      setTaxInvoiceEmail(onboardingData.taxInvoiceEmail || profileTaxInvoiceEmail || '');
      setSettlementBankName(onboardingData.settlementBankName || '');
      setSettlementAccountNumber(onboardingData.settlementAccountNumber || '');
      setSettlementAccountHolder(onboardingData.settlementAccountHolder || '');
      setSettlementContactName(onboardingData.settlementContactName || '');
      setSettlementContactEmail(onboardingData.settlementContactEmail || '');
      setMailOrderSalesStatus(onboardingData.mailOrderSalesStatus || '');
      setMailOrderSalesRegistrationNumber(onboardingData.mailOrderSalesRegistrationNumber || '');
    },
    [],
  );

  const refreshOnboarding = async () => {
    try {
      const data = await supplierOnboardingApi.getOnboarding();
      setOnboarding(data);
      setTaxInvoiceEmail(data.taxInvoiceEmail || '');
      setSettlementBankName(data.settlementBankName || '');
      setSettlementAccountNumber(data.settlementAccountNumber || '');
      setSettlementAccountHolder(data.settlementAccountHolder || '');
      setSettlementContactName(data.settlementContactName || '');
      setSettlementContactEmail(data.settlementContactEmail || '');
      setMailOrderSalesStatus(data.mailOrderSalesStatus || '');
      setMailOrderSalesRegistrationNumber(data.mailOrderSalesRegistrationNumber || '');
      setOnboardingLoadError(false);
    } catch {
      setOnboardingLoadError(true);
    }
  };

  const handleSaveOnboarding = async () => {
    setOnboardingSaving(true);
    setOnboardingSaved(false);
    setOnboardingError(null);

    const result = await supplierOnboardingApi.updateOnboarding({
      taxInvoiceEmail,
      settlementBankName,
      settlementAccountNumber,
      settlementAccountHolder,
      settlementContactName,
      settlementContactEmail,
      mailOrderSalesStatus,
      mailOrderSalesRegistrationNumber,
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

  const handleUploadDocument = async (
    documentType: 'business_registration' | 'bank_statement' | 'mail_order_report',
  ) => {
    const file =
      documentType === 'business_registration'
        ? businessRegistrationFile
        : documentType === 'mail_order_report'
          ? mailOrderReportFile
          : bankbookFile;
    if (!file) {
      setOnboardingError('PDF 파일을 선택해 주세요.');
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
    handleUploadDocument,
    handleDownloadDocument,
  };
}
