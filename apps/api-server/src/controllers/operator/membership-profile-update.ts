/**
 * Membership Console 전용 request→SQL builder. No DB calls or authorization.
 * Keep aliases, omitted fields, nested address merging and parameter order unchanged.
 * Other services have different profile contracts; this is not a shared profile API.
 */
import { buildBusinessInfoUpdate } from '../../utils/business-info-write.js';

type MemberProfileInput = Partial<Record<
  | 'lastName' | 'firstName' | 'nickname'
  | 'businessName' | 'businessNumber' | 'businessType' | 'businessCategory'
  | 'zipCode' | 'address1' | 'address2' | 'ceoName' | 'contactName'
  | 'taxInvoiceEmail' | 'pharmacyPhone' | 'managerPhone' | 'taxEmail' | 'representativeName',
  unknown
>> & { phone?: string };

export function buildMemberProfileUpdate(
  input: MemberProfileInput,
  userId: string,
): { sql: string; params: unknown[] } | null {
  // WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1: ceoName/taxInvoiceEmail/managerPhone canonical 수용.
  // taxEmail/representativeName 은 legacy alias — controller 에서 canonical key 로만 저장.
  const {
    lastName, firstName, nickname, phone,
    businessName, businessNumber, businessType,
    businessCategory, zipCode, address1, address2,
    ceoName, contactName, taxInvoiceEmail, pharmacyPhone, managerPhone,
    taxEmail, representativeName, // legacy aliases
  } = input;

  // 2. Profile fields update
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (lastName !== undefined) { sets.push(`"lastName" = $${idx++}`); params.push(lastName); }
  if (firstName !== undefined) { sets.push(`"firstName" = $${idx++}`); params.push(firstName); }
  if (nickname !== undefined) { sets.push(`nickname = $${idx++}`); params.push(nickname); }
  if (phone !== undefined) { sets.push(`phone = $${idx++}`); params.push(phone.replace(/\D/g, '')); }

  // name 동기화 (lastName+firstName → name)
  if (lastName !== undefined || firstName !== undefined) {
    sets.push(`name = $${idx++}`);
    params.push(`${lastName || ''}${firstName || ''}`.trim());
  }

  // 3. businessInfo JSONB 머지
  // WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1:
  //   ceoName / taxInvoiceEmail / managerPhone canonical write.
  //   taxEmail → email overwrite 제거 (대표 이메일과 세금계산서 이메일 의미 분리).
  //   legacy alias (taxEmail / representativeName) 는 client 보내도 canonical key 로 저장.
  const bizFields: Record<string, unknown> = {};
  if (businessName !== undefined) bizFields.businessName = businessName;
  if (businessNumber !== undefined) bizFields.businessNumber = businessNumber;
  if (businessType !== undefined) bizFields.businessType = businessType;
  if (businessCategory !== undefined) bizFields.businessCategory = businessCategory;
  const effectiveCeoName = ceoName ?? representativeName;
  if (effectiveCeoName !== undefined) bizFields.ceoName = effectiveCeoName;
  if (contactName !== undefined) bizFields.contactName = contactName;
  const effectiveTaxInvoiceEmail = taxInvoiceEmail ?? taxEmail;
  if (effectiveTaxInvoiceEmail !== undefined) bizFields.taxInvoiceEmail = effectiveTaxInvoiceEmail;
  if (pharmacyPhone !== undefined) bizFields.pharmacyPhone = pharmacyPhone;
  if (managerPhone !== undefined) bizFields.managerPhone = managerPhone;
  // WO-O4O-POSTAL-CODE-ADDRESS-V1: zipCode 저장
  if (zipCode !== undefined) bizFields.zipCode = zipCode;
  if (address1 !== undefined) bizFields.address = address1;
  if (address2 !== undefined) bizFields.address2 = address2;
  // WO-O4O-STORE-PROFILE-UNIFICATION-V1: 구조화된 주소 동기화
  // WO-O4O-KPA-PROFILE-WRITE-JSONB-CONCAT-CONVERGENCE-V1:
  //   기존 구현은 storeAddress 를 **통째로 새로 만들어** 넣었다. 그래서
  //   상세주소만 수정해도 `baseAddress` 가 '' 로 덮이고 `zipCode` 키가 사라졌다
  //   (실측: 프로덕션 storeAddress 보유 11명 중 zipCode 보유 6 / detailAddress 보유 9).
  //   교정: 요청이 보낸 하위 키만 담아 중첩 부분 병합에 맡긴다 — 형제 키는 보존된다.
  //   빈 문자열은 최상위 키(address/address2)와 동일하게 "그 값으로 수정" 으로 다룬다
  //   (그래야 상세주소 지우기가 계속 동작한다).
  const storeAddressFields: Record<string, unknown> = {};
  if (zipCode !== undefined) storeAddressFields.zipCode = zipCode;
  if (address1 !== undefined) storeAddressFields.baseAddress = address1;
  if (address2 !== undefined) storeAddressFields.detailAddress = address2;

  // WO-O4O-KPA-PROFILE-WRITE-JSONB-CONCAT-CONVERGENCE-V1:
  //   read → 병합 → 전체 재저장 제거. 부분 갱신 표현식을 같은 UPDATE 문에 합쳐
  //   scalar 컬럼과 businessInfo 가 단일 statement 로 원자적으로 반영되게 한다.
  const bizFragment = buildBusinessInfoUpdate(
    {
      root: bizFields,
      ...(Object.keys(storeAddressFields).length > 0
        ? { nested: { storeAddress: storeAddressFields } }
        : {}),
    },
    idx,
  );
  if (bizFragment) {
    sets.push(`"businessInfo" = ${bizFragment.expression}`);
    params.push(...bizFragment.params);
    idx = bizFragment.nextIndex;
  }

  if (sets.length === 0) return null;
  sets.push(`"updatedAt" = NOW()`);
  params.push(userId);
  return { sql: `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}`, params };
}
