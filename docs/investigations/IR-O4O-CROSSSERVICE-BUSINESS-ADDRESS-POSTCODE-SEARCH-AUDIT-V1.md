# IR-O4O-CROSSSERVICE-BUSINESS-ADDRESS-POSTCODE-SEARCH-AUDIT-V1

> **유형:** read-only 조사 — 코드/DB/API/UI 변경 0.
> **대상:** 4서비스 사업자 가입/정보 화면의 주소 입력 방식 + 공통 `AddressSearch`(Daum Postcode) 적용 상태.
> **핵심 결론: 백엔드는 `zipCode/address1/address2`를 가입·프로필 경로에서 손실 없이 수용 → Neture supplier 가입 주소검색 적용은 frontend-only 가능. 단 서비스 간 drift 큼.** KPA=가입·정보 양쪽 PASS(레퍼런스). Neture=가입 FAIL/프로필 PASS(내부 불일치). GlycoPharm=가입 PASS/정보 FAIL(역방향). K-Cosmetics=양쪽 미적용.
> 선행: WO-O4O-NETURE-SUPPLIER-BUSINESS-TYPE-SELECT-REMOVE-V1 (업종 select 정리) — 2026-06-18

---

## 1. 공통 컴포넌트 `AddressSearch`

- `packages/ui/src/components/AddressSearch.tsx` — Daum Postcode API 기반(키 불필요). 우편번호 검색 버튼 → 팝업 → 우편번호+기본주소 자동입력, 상세주소 직접 입력.
- `onChange` value 키: **`{ zipCode, address, addressDetail }`** (AddressSearchValue, line 35-39).
- export 확인: `packages/ui/src/index.tsx:629-630`. → 플랫폼 전역 사용 가능.

## 2. 화면별 현황 (실측)

| 화면 | 파일:line | 주소 UI | 우편번호검색 | 상세주소 분리 | AddressSearch | payload key | 목적 | 판정 |
|------|-----------|---------|:---:|:---:|:---:|------|------|:---:|
| Neture supplier 가입 | web-neture/RegisterModal.tsx:705-726 | free-text | ❌ | ✅ | ❌ | address1/address2 | 가입 | **FAIL** |
| Neture store_owner 가입 | web-neture/RegisterModal.tsx:630-635 | free-text(지역) | ❌ | ❌ | ❌ | businessAddress | 가입 | FAIL |
| Neture partner 가입 | web-neture/RegisterModal.tsx | (주소 없음) | — | — | — | — | 가입 | N/A |
| Neture 공급자 프로필 | web-neture/SupplierProfilePage.tsx:563 | **AddressSearch** | ✅ | ✅ | ✅ | businessZipCode/businessAddress/businessAddressDetail | profile | **PASS** |
| GlycoPharm 약국경영자 가입 | web-glycopharm/RegisterFlowModal.tsx:614 | **AddressSearch** | ✅ | ✅ | ✅ | zipCode/address1/address2 | 가입 | **PASS** |
| GlycoPharm 약국 정보 | web-glycopharm/store/PharmacyInfoPage.tsx:281-287 | free-text | ❌ | ❌ | ❌ | businessAddress | info | FAIL |
| K-Cosmetics 판매자 가입 | web-k-cosmetics/auth/RegisterPage.tsx | (주소 없음) | — | — | ❌ | — | 가입 | FAIL/없음 |
| K-Cosmetics 매장 정보 | web-k-cosmetics/store/StoreInfoPage.tsx | free-text | ❌ | ❌ | ❌ | businessAddress | info | FAIL |
| KPA 개설약사 가입 | web-kpa-society/RegisterModal.tsx:695-708 | **AddressSearch** | ✅ | ✅ | ✅ | zipCode/address1/address2 | 가입 | **PASS** |
| KPA 약사(비개설) 가입 | web-kpa-society/RegisterModal.tsx | free-text | ❌ | ❌ | ❌ | pharmacyAddress | 가입 | FAIL(근무처) |
| KPA 약국 정보 | web-kpa-society/pharmacy/PharmacyInfoPage.tsx:316-330 | **AddressSearch** | ✅ | ✅ | ✅ | zipCode/baseAddress/detailAddress | info | **PASS** |

## 3. 서비스 간 Drift 패턴

- **KPA = 레퍼런스** — 개설약사 가입 + 약국 정보 양쪽 AddressSearch. (단 비개설 약사 근무처는 free-text — 사업장 아님)
- **Neture = 내부 불일치** — 공급자 **프로필(SupplierProfilePage)은 AddressSearch(PASS)** 인데 **가입(RegisterModal supplier)은 free-text(FAIL)**. 같은 공급자 흐름 안에서 가입↔프로필 UX 불일치.
- **GlycoPharm = 역방향 불일치** — **가입은 AddressSearch(PASS)** 인데 **약국 정보 수정은 free-text(FAIL)**.
- **K-Cosmetics = 미적용** — 가입엔 주소 자체 없음, 매장 정보는 free-text.

## 4. 백엔드 수용성 (핵심)

DTO(`register.dto.ts`)에 5개 키 전부 optional 정의: `zipCode`(228) / `businessAddress`(233, canonical) / `businessAddressDetail`(238, canonical) / `address1`(243, legacy) / `address2`(248, legacy).

| 경로 | zipCode | address1 | address2 | 비고 |
|------|:---:|:---:|:---:|------|
| `POST /auth/register` | ✅ | ✅→businessAddress | ✅→businessAddressDetail | canonical 매핑 + `storeAddress{zipCode,baseAddress,detailAddress}` dual-write |
| `PATCH /auth/me/profile` | ✅ | ✅ | ✅ | white-list 포함 + storeAddress 동기화 |
| `PUT /operator/members/:id` | ✅ | ✅ | ✅ | ⚠️ legacy(address/address2)만, **canonical businessAddress/Detail 미지원** |
| Neture supplier 승인 응답 | ❌ | ❌ | ❌ | ⚠️ getAllSuppliers 응답에 주소 **미노출**(검토 불가) |

→ **결론: AddressSearch 출력(zipCode/address1/address2)은 가입·프로필 경로에서 손실 없이 저장됨.** 즉 Neture supplier 가입에 AddressSearch 적용은 **frontend-only**로 가능(백엔드 변경 불요). 단 운영자 측 2개 gap(멤버 수정 canonical 미지원 / supplier 승인 주소 미노출)은 별도.

## 5. 판정 요약

- Neture supplier 가입: **FAIL** — 사용자가 지목한 화면. free-text + 상세주소 분리는 있으나 우편번호 검색 없음, AddressSearch 미사용. (직전 WO에서 업종 select는 정리됐으나 주소 UX 미정리.)
- 4서비스 전반: PASS 4 / FAIL 5 / N-A 1 — 서비스·화면별 편차 큼, canonical key는 백엔드에서 대체로 정렬됨.

## 6. 후속 WO 후보 / 우선순위

### 후보 1 (소·안전, 권장 선행) — Neture 공급자 가입 주소검색
`WO-O4O-NETURE-SUPPLIER-SIGNUP-ADDRESS-POSTCODE-SEARCH-V1`
- 범위: **Neture supplier 가입 화면 한정.** `businessAddress`+`businessAddressDetail` free-text → `AddressSearch` 교체. 매핑: AddressSearch `{zipCode,address,addressDetail}` → payload `zipCode`/`address1`(=businessAddress)/`address2`(=businessAddressDetail). 백엔드 무변경(§4 확인). store_owner/partner 비범위.
- 근거: SupplierProfilePage가 이미 AddressSearch이므로 가입↔프로필 정합 회복. frontend-only, 회귀 위험 낮음.

### 후보 2 (중·횡단) — 4서비스 사업자 주소 공통 정렬
`WO-O4O-CROSSSERVICE-BUSINESS-ADDRESS-POSTCODE-SEARCH-ALIGNMENT-V1`
- 범위: GlycoPharm 약국정보 / K-Cosmetics 매장정보(+가입 주소 수집 여부 판단) / Neture store_owner 등 FAIL 화면 + 운영자 gap 2건(MembershipConsoleController canonical 수용 / Neture supplier 승인 응답 주소 노출). KPA 레퍼런스 기준 정렬.
- Shared 컴포넌트/백엔드 동시 → 중규모 별 WO.

## 7. 비범위

- 실제 AddressSearch 적용 코드 수정 / backend migration / 주소 DB 구조 변경 / 연락처 필드 보강 / 사업자유형 후순위화 / store_owner·partner 정책 / Daum Postcode 대체 검토.

## 8. 준수 확인

```
✅ read-only — 코드/DB/API/UI 변경 0
✅ 정적 분석만(운영 데이터 미조회), 산출물 = 본 문서 1개(path-specific)
✅ git fetch 동기(작업트리 clean), 동시 세션 파일 무간섭
```

---

*read-only · AddressSearch(Daum Postcode) 존재·export · 백엔드 zipCode/address1/address2 가입·프로필 경로 손실 없이 수용 → Neture supplier 가입 주소검색=frontend-only 가능 · drift: KPA(PASS/PASS 레퍼런스)/Neture(가입FAIL·프로필PASS)/GlycoPharm(가입PASS·정보FAIL)/KCos(미적용) · 후속1=NETURE-SUPPLIER-SIGNUP-ADDRESS-POSTCODE-SEARCH-V1(소·frontend-only), 후속2=CROSSSERVICE-ALIGNMENT(중) · 운영자 gap 2건(멤버수정 canonical 미지원/supplier 승인 주소 미노출).*
