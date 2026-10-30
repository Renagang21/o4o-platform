import { useState, useCallback, useEffect, useRef } from 'react';
import { isSelectableBusinessEntityType } from '@o4o/types';
import { supplierProfileApi, type SupplierProfile, type ContactVisibility } from '../../../lib/api';

export function useSupplierBusinessProfile() {
  const mounted = useRef(true);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [representativeName, setRepresentativeName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessItem, setBusinessItem] = useState('');
  const [businessEntityType, setBusinessEntityType] = useState('');
  const [businessStartDate, setBusinessStartDate] = useState('');
  const [businessZipCode, setBusinessZipCode] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessAddressDetail, setBusinessAddressDetail] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWebsite, setContactWebsite] = useState('');
  const [contactKakao, setContactKakao] = useState('');
  const [emailVisibility, setEmailVisibility] = useState<ContactVisibility>('public');
  const [phoneVisibility, setPhoneVisibility] = useState<ContactVisibility>('private');
  const [websiteVisibility, setWebsiteVisibility] = useState<ContactVisibility>('public');
  const [kakaoVisibility, setKakaoVisibility] = useState<ContactVisibility>('partners');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [minOrderSurcharge, setMinOrderSurcharge] = useState('');
  const [orderConditionNote, setOrderConditionNote] = useState('');
  const [baseShippingFee, setBaseShippingFee] = useState('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('');
  const [averageDispatchDays, setAverageDispatchDays] = useState('');
  const [returnExchangeNotice, setReturnExchangeNotice] = useState('');
  const [shippingStandard, setShippingStandard] = useState('');
  const [shippingIsland, setShippingIsland] = useState('');
  const [shippingMountain, setShippingMountain] = useState('');
  const [prefilled, setPrefilled] = useState(false);

  const initializeProfile = useCallback((data: SupplierProfile) => {
    setProfile(data);
    setName(data.name);
    // Section A
    setRepresentativeName(data.representativeName || '');
    setBusinessNumber(data.businessNumber || '');
    setBusinessType(data.businessType || '');
    setBusinessItem(data.businessItem || '');
    // WO-O4O-NETURE-SUPPLIER-PROFILE-P4-FIELDS-ADD-V1
    setBusinessEntityType(data.businessEntityType || '');
    setBusinessStartDate(data.businessStartDate || '');
    setBusinessZipCode(data.businessZipCode || '');
    setBusinessAddress(data.businessAddress || '');
    setBusinessAddressDetail(data.businessAddressDetail || '');
    // Section B
    setManagerName(data.managerName || '');
    setManagerPhone(data.managerPhone || '');
    setManagerEmail(data.managerEmail || '');
    // Section C
    setContactEmail(data.contactEmail || '');
    setContactPhone(data.contactPhone || '');
    setContactWebsite(data.contactWebsite || '');
    setContactKakao(data.contactKakao || '');
    setEmailVisibility(data.contactEmailVisibility || 'public');
    setPhoneVisibility(data.contactPhoneVisibility || 'private');
    setWebsiteVisibility(data.contactWebsiteVisibility || 'public');
    setKakaoVisibility(data.contactKakaoVisibility || 'partners');
    // Section D: B2B 주문 조건
    setMinOrderAmount(data.minOrderAmount != null ? String(data.minOrderAmount) : '');
    setMinOrderSurcharge(data.minOrderSurcharge != null ? String(data.minOrderSurcharge) : '');
    setOrderConditionNote(data.orderConditionNote || '');
    // Section E: 배송 정책
    setBaseShippingFee(data.baseShippingFee != null ? String(data.baseShippingFee) : '');
    setFreeShippingThreshold(
      data.freeShippingThreshold != null ? String(data.freeShippingThreshold) : '',
    );
    setAverageDispatchDays(
      data.averageDispatchDays != null ? String(data.averageDispatchDays) : '',
    );
    setReturnExchangeNotice(data.returnExchangeNotice || '');
    setShippingStandard(data.shippingStandard || '');
    setShippingIsland(data.shippingIsland || '');
    setShippingMountain(data.shippingMountain || '');
    // Pre-fill
    setPrefilled(!!data._prefilled);
  }, []);

  const handleSave = async () => {
    if (!name.trim() || name.trim().length > 255) {
      setSaved(false);
      setError('상호명을 1~255자로 입력해 주세요.');
      return;
    }
    if (businessEntityType && !isSelectableBusinessEntityType(businessEntityType)) {
      setSaved(false);
      setError('세금계산서 발행을 위한 개인 / 법인 구분을 선택해 주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await supplierProfileApi.updateProfile({
      // Section A
      name: name.trim(),
      businessNumber,
      representativeName,
      businessZipCode,
      businessAddress,
      businessAddressDetail,
      businessType,
      businessItem,
      // WO-O4O-NETURE-SUPPLIER-PROFILE-P4-FIELDS-ADD-V1
      businessEntityType: businessEntityType || undefined,
      businessStartDate: businessStartDate || undefined,
      // WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §E:
      //   taxInvoiceEmail 은 onboarding(정산·세금계산서) 단일 소유다. 두 저장 버튼이 같은 값을
      //   서로 다른 시점에 쓰면 마지막 저장이 조용히 이긴다 — 여기서는 보내지 않는다.
      //   (입력 UI 와 저장은 handleSaveOnboarding 이 담당하고, 읽기는 그대로 유지한다.)
      // Section B
      managerName,
      managerPhone,
      managerEmail,
      // Section C
      contactEmail,
      contactPhone,
      contactWebsite,
      contactKakao,
      contactEmailVisibility: emailVisibility,
      contactPhoneVisibility: phoneVisibility,
      contactWebsiteVisibility: websiteVisibility,
      contactKakaoVisibility: kakaoVisibility,
      // Section D: B2B 주문 조건
      minOrderAmount:
        minOrderAmount.trim() === '' ? null : Number(minOrderAmount.replace(/[^\d]/g, '')),
      minOrderSurcharge:
        minOrderSurcharge.trim() === '' ? null : Number(minOrderSurcharge.replace(/[^\d]/g, '')),
      orderConditionNote: orderConditionNote.trim() === '' ? null : orderConditionNote,
      // Section E: 배송 정책 (저장만 — 배송비 계산 미적용)
      baseShippingFee:
        baseShippingFee.trim() === '' ? null : Number(baseShippingFee.replace(/[^\d]/g, '')),
      freeShippingThreshold:
        freeShippingThreshold.trim() === ''
          ? null
          : Number(freeShippingThreshold.replace(/[^\d]/g, '')),
      averageDispatchDays:
        averageDispatchDays.trim() === ''
          ? null
          : Number(averageDispatchDays.replace(/[^\d]/g, '')),
      returnExchangeNotice: returnExchangeNotice.trim() === '' ? null : returnExchangeNotice,
      shippingStandard: shippingStandard.trim() === '' ? null : shippingStandard,
      shippingIsland: shippingIsland.trim() === '' ? null : shippingIsland,
      shippingMountain: shippingMountain.trim() === '' ? null : shippingMountain,
    });

    if (!mounted.current) return;
    setSaving(false);

    if (result.success) {
      setSaved(true);
      setPrefilled(false);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error || '저장에 실패했습니다.');
    }
  };

  return {
    profile,
    setProfile,
    name,
    setName,
    saving,
    setSaving,
    saved,
    setSaved,
    error,
    setError,
    representativeName,
    setRepresentativeName,
    businessNumber,
    setBusinessNumber,
    businessType,
    setBusinessType,
    businessItem,
    setBusinessItem,
    businessEntityType,
    setBusinessEntityType,
    businessStartDate,
    setBusinessStartDate,
    businessZipCode,
    setBusinessZipCode,
    businessAddress,
    setBusinessAddress,
    businessAddressDetail,
    setBusinessAddressDetail,
    managerName,
    setManagerName,
    managerPhone,
    setManagerPhone,
    managerEmail,
    setManagerEmail,
    contactEmail,
    setContactEmail,
    contactPhone,
    setContactPhone,
    contactWebsite,
    setContactWebsite,
    contactKakao,
    setContactKakao,
    emailVisibility,
    setEmailVisibility,
    phoneVisibility,
    setPhoneVisibility,
    websiteVisibility,
    setWebsiteVisibility,
    kakaoVisibility,
    setKakaoVisibility,
    minOrderAmount,
    setMinOrderAmount,
    minOrderSurcharge,
    setMinOrderSurcharge,
    orderConditionNote,
    setOrderConditionNote,
    baseShippingFee,
    setBaseShippingFee,
    freeShippingThreshold,
    setFreeShippingThreshold,
    averageDispatchDays,
    setAverageDispatchDays,
    returnExchangeNotice,
    setReturnExchangeNotice,
    shippingStandard,
    setShippingStandard,
    shippingIsland,
    setShippingIsland,
    shippingMountain,
    setShippingMountain,
    prefilled,
    setPrefilled,
    initializeProfile,
    handleSave,
  };
}
