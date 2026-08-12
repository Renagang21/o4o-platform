/**
 * WO-O4O-KPA-BUSINESSINFO-KEY-READ-ALIGNMENT-V1
 *
 * `users.businessInfo` 는 write 경로마다 다른 키를 써 왔다 (조사: D-3 주소 키 비대칭 / D-4 약국 전화 키 이중화).
 * 읽기 경로가 한쪽 키만 참조하면 **저장되어 있는 값이 화면에서 빈칸으로 보인다.**
 * 이 모듈은 KPA 읽기 경로가 공통으로 쓰는 **read-only 정렬 규칙**이다.
 *
 * 실측한 write 키 (2026-08-12):
 *   주소      canonical `address` / `address2` / `zipCode`
 *               ← KPA 운영자 `PATCH /kpa/members/:id/info`
 *               ← 공통 운영자 `PATCH /operator/members/:userId`
 *               ← 본인 `PATCH /auth/me/profile` (legacy 호환 write 허용 목록)
 *             legacy `businessAddress` / `businessAddressDetail`
 *               ← 가입 `auth-register.controller`
 *               ← 본인 `PATCH /auth/me/profile` (naming standard canonical)
 *             구조화 `storeAddress { zipCode, baseAddress, detailAddress }`
 *               ← 본인 · 공통 운영자
 *   약국 전화  canonical `metadata.pharmacy_phone` ← KPA 운영자
 *             legacy `pharmacyPhone`              ← 공통 운영자
 *
 * 우선순위 근거:
 *   가입(`businessAddress`)은 최초 1회, 이후 수정은 KPA/공통 운영자·본인이 `address` 로 저장한다.
 *   따라서 KPA 화면 기준 **최신 값은 `address`** 이며, 이를 우선하고 나머지를 fallback 으로 둔다.
 *   (`businessAddress` 우선으로 두면 운영자가 수정한 최신 주소가 가입 시점 값으로 가려진다.)
 *
 * 규칙:
 *   - canonical 값이 **유효하면**(비어 있지 않은 문자열) 그것을 쓴다.
 *   - canonical 이 없거나 빈 문자열이면 legacy → 구조화 순으로 fallback 한다.
 *   - 모두 없으면 null.
 *   - 이 모듈은 읽기 전용이다. 어떤 write / 변환 / backfill 도 수행하지 않으며,
 *     원본 `businessInfo` 객체를 변경하지 않는다.
 */

/** 값이 실제로 표시 가능한 문자열일 때만 채택한다 (빈 문자열·공백은 "부재" 로 취급). */
function pick(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() !== '') return c;
  }
  return null;
}

export interface KpaBusinessContact {
  /** 우편번호 — `zipCode` → `storeAddress.zipCode` */
  zipCode: string | null;
  /** 기본 주소 — `address` → `businessAddress` → `storeAddress.baseAddress` */
  address: string | null;
  /** 상세 주소 — `address2` → `businessAddressDetail` → `storeAddress.detailAddress` */
  address2: string | null;
  /** 약국 전화 — `metadata.pharmacy_phone` → `pharmacyPhone` */
  pharmacyPhone: string | null;
}

/**
 * KPA 읽기 경로용 주소 · 약국 전화 정렬.
 * 이번 WO 범위는 **주소와 약국 전화 2개 축뿐**이다. 다른 필드는 확장하지 않는다.
 */
export function resolveKpaBusinessContact(businessInfo: unknown): KpaBusinessContact {
  const biz = (businessInfo && typeof businessInfo === 'object')
    ? businessInfo as Record<string, any>
    : null;

  if (!biz) {
    return { zipCode: null, address: null, address2: null, pharmacyPhone: null };
  }

  const storeAddress = (biz.storeAddress && typeof biz.storeAddress === 'object')
    ? biz.storeAddress as Record<string, any>
    : null;
  const metadata = (biz.metadata && typeof biz.metadata === 'object')
    ? biz.metadata as Record<string, any>
    : null;

  return {
    zipCode: pick(biz.zipCode, storeAddress?.zipCode),
    address: pick(biz.address, biz.businessAddress, storeAddress?.baseAddress),
    address2: pick(biz.address2, biz.businessAddressDetail, storeAddress?.detailAddress),
    pharmacyPhone: pick(metadata?.pharmacy_phone, biz.pharmacyPhone),
  };
}
