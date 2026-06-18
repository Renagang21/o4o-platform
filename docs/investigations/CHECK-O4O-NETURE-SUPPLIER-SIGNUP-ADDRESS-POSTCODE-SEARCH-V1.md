# CHECK-O4O-NETURE-SUPPLIER-SIGNUP-ADDRESS-POSTCODE-SEARCH-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-SIGNUP-ADDRESS-POSTCODE-SEARCH-V1
> **유형:** frontend-only — Neture **공급자 가입** 화면의 사업장 주소 free-text → 공통 `AddressSearch`(Daum Postcode 우편번호 검색) 교체.
> **결과: PASS — supplier 분기 주소 입력을 AddressSearch 로 교체, payload zipCode/address1/address2 전송. tsc 통과. store_owner/partner/SupplierProfilePage/백엔드 무변경.**
> 선행: IR-O4O-CROSSSERVICE-BUSINESS-ADDRESS-POSTCODE-SEARCH-AUDIT-V1 (§4 백엔드 수용 확인, §6 후속1)

## 1. 범위

- **대상:** `services/web-neture/src/components/RegisterModal.tsx` 의 **supplier 분기만.**
- **비대상(미변경):** store_owner(지역 free-text), partner(주소 없음), `SupplierProfilePage`(이미 AddressSearch=PASS), 백엔드/DTO/DB, 운영자 gap 2건.

## 2. 변경

| 항목 | 처리 |
|------|------|
| import | `import { AddressSearch } from '@o4o/ui';` 추가 (SupplierProfilePage 와 동일 출처) |
| formData state | `zipCode: ''` 추가 (useState init + useEffect reset 양쪽) |
| supplier 사업장 주소/상세주소 free-text input 2개 | **제거** → `<AddressSearch>` 1개로 교체 (우편번호 검색 + 기본주소 자동입력 + 상세주소) |
| AddressSearch onChange | `{zipCode,address,addressDetail}` → `formData.zipCode / businessAddress / businessAddressDetail` 매핑 |
| supplier payload | `zipCode: formData.zipCode` 추가, 기존 `address1=businessAddress`/`address2=businessAddressDetail` 유지 |

- AddressSearch 패턴은 `SupplierProfilePage.tsx:563` 과 동일(value: zipCode/address/addressDetail, inputClassName).
- 기본주소(`businessAddress`)가 `isStep2Valid`/`supplierMissingFields` 의 필수 기준이며 AddressSearch 가 채우므로 검증 로직 무변경.

## 3. 백엔드 정합 (무변경 근거)

IR §4 실측: `POST /auth/register` 가 `zipCode`/`address1`(→businessAddress)/`address2`(→businessAddressDetail) 를 손실 없이 저장(canonical 매핑 + `storeAddress` dual-write). 따라서 frontend-only 로 충분, 백엔드 변경 0.

## 4. 검증

- `npx tsc --noEmit -p tsconfig.json` (web-neture) → **exit 0**.
- 정적 격리 확인:
  - `AddressSearch` 사용 = import(17) + supplier 분기(714) **only**.
  - `name="businessAddress"` free-text 잔존 = line 635 = **store_owner 분기**(미변경).
  - partner 분기 주소 항목 없음(무변경).
  - diff = RegisterModal.tsx 단일, +22/−20.

## 5. 완료 기준 대비

| 기준 | 결과 |
|------|------|
| 공급자 가입 화면 우편번호 검색 버튼 노출 | ✅ (AddressSearch) |
| 우편번호 검색 후 주소 자동입력 | ✅ (Daum Postcode) |
| 상세주소 입력 | ✅ |
| 가입 submit 백엔드 흐름 유지 | ✅ (zipCode/address1/address2, 백엔드 무변경) |
| store_owner/partner 불변 | ✅ |
| tsc 통과 | ✅ |

## 6. 비범위 / 후속

- GlycoPharm 약국정보 / K-Cosmetics / Neture store_owner FAIL 화면 + 운영자 gap 2건(멤버수정 canonical 미지원 / supplier 승인 주소 미노출) = `WO-O4O-CROSSSERVICE-BUSINESS-ADDRESS-POSTCODE-SEARCH-ALIGNMENT-V1`(중규모, IR §6 후속2).

## 7. 배포 후 권장 (선택)

- 브라우저: Neture 공급자 가입 모달 supplier 선택 → 우편번호 검색/자동입력/상세주소 동작, submit payload 에 zipCode/address1/address2 포함 확인. (frontend-only, tsc 로 정합 확인됨)

---

*Date: 2026-06-18 · CHECK · PASS · Neture supplier 가입 주소 free-text → AddressSearch(Daum Postcode) · frontend-only · payload zipCode/address1/address2 · tsc 통과 · store_owner/partner/profile/백엔드 무변경.*
