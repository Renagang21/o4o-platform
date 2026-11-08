import { useState, useCallback, useEffect, useRef } from 'react';
import { isSelectableBusinessEntityType } from '@o4o/types';
import { supplierProfileApi, type SupplierProfile, type ContactVisibility } from '../../../lib/api';

/** 사업자 정보 화면의 저장 묶음 (WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T4). */
export type SupplierProfileGroup = 'business' | 'contact' | 'orderShipping';

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
  const [saveGroup, setSaveGroup] = useState<SupplierProfileGroup | null>(null);

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

  /**
   * WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T4: 묶음별 저장.
   *   PATCH /neture/supplier/profile 은 보낸 필드만 바꾸므로(부분 갱신) 묶음 버튼은 자기 묶음 필드만 보낸다 —
   *   다른 묶음에서 저장하지 않은 편집이 함께 기록되지 않는다.
   *   taxInvoiceEmail 은 onboarding(정산) 단일 소유라 어떤 묶음에서도 보내지 않는다
   *   (WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §E).
   */
  const businessPayload = () => ({
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
  });
  const contactPayload = () => ({
    managerName,
    managerPhone,
    managerEmail,
    contactEmail,
    contactPhone,
    contactWebsite,
    contactKakao,
    contactEmailVisibility: emailVisibility,
    contactPhoneVisibility: phoneVisibility,
    contactWebsiteVisibility: websiteVisibility,
    contactKakaoVisibility: kakaoVisibility,
  });
  const amount = (value: string) => (value.trim() === '' ? null : Number(value.replace(/[^\d]/g, '')));
  const text = (value: string) => (value.trim() === '' ? null : value);
  const orderShippingPayload = () => ({
    // B2B 주문 조건
    minOrderAmount: amount(minOrderAmount),
    minOrderSurcharge: amount(minOrderSurcharge),
    orderConditionNote: text(orderConditionNote),
    // 배송 정책 (저장만 — 배송비 계산 미적용)
    baseShippingFee: amount(baseShippingFee),
    freeShippingThreshold: amount(freeShippingThreshold),
    averageDispatchDays: amount(averageDispatchDays),
    returnExchangeNotice: text(returnExchangeNotice),
    shippingStandard: text(shippingStandard),
    shippingIsland: text(shippingIsland),
    shippingMountain: text(shippingMountain),
  });

  /** group 을 생략하면 세 묶음을 함께 저장한다(기존 호출 호환). */
  const handleSave = async (group?: SupplierProfileGroup) => {
    const target = typeof group === 'string' ? group : null;
    setSaveGroup(target);
    const includesBusiness = target === null || target === 'business';
    if (includesBusiness && (!name.trim() || name.trim().length > 255)) {
      setSaved(false);
      setError('상호명을 1~255자로 입력해 주시기 바랍니다.');
      return;
    }
    if (includesBusiness && businessEntityType && !isSelectableBusinessEntityType(businessEntityType)) {
      setSaved(false);
      setError('세금계산서 발행을 위한 개인 / 법인 구분을 선택해 주시기 바랍니다.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await supplierProfileApi.updateProfile({
      ...(includesBusiness ? businessPayload() : {}),
      ...(target === null || target === 'contact' ? contactPayload() : {}),
      ...(target === null || target === 'orderShipping' ? orderShippingPayload() : {}),
    });

    if (!mounted.current) return;
    setSaving(false);

    if (result.success) {
      setSaved(true);
      setPrefilled(false);
      // 미입력 체크리스트는 서버 판정(missingProfileFields)을 그대로 쓴다.
      const missing = result.data?.missingProfileFields;
      if (Array.isArray(missing)) {
        setProfile((prev) => (prev ? { ...prev, missingProfileFields: missing, profileComplete: missing.length === 0 } : prev));
      }
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error || '저장에 실패했습니다.');
    }
  };

  /** 묶음 저장 버튼이 자기 묶음의 진행 · 결과만 보이게 한다. */
  const groupStatus = (group: SupplierProfileGroup) => {
    const own = saveGroup === null || saveGroup === group;
    return { saving: saving && own, saved: saved && own, error: own ? error : null };
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
    groupStatus,
  };
}
