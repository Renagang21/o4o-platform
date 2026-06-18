# CHECK-O4O-NETURE-SUPPLIER-ONBOARDING-PROFILE-SEED-COMPLETE-V1

> **작업명:** WO-A (D1) of WO-O4O-NETURE-SUPPLIER-ONBOARDING-BUSINESS-PROFILE-SYNC-AND-SIMPLIFICATION-V1
> **유형:** backend 1파일 — supplier seed 완성. DB/migration/route/API contract 무변경(기존 INSERT 컬럼 추가).
> **결과: PASS — `approveRegistration`의 businessInfo→neture_suppliers seed에 담당자명/담당자폰/업태/상세주소(우편번호 포함)를 추가. 프로필/공급 승인 화면 "비어 보임" 해소. api-server tsc EXIT 0.**
> 선행: WO 결정문서 `WO-O4O-NETURE-SUPPLIER-ONBOARDING-BUSINESS-PROFILE-SYNC-AND-SIMPLIFICATION-V1` (D1=가입 seed-once, canonical=neture_suppliers) — 2026-06-18

---

## 1. 배경 / 결정

- 결정 D1: 공급자 supplier row 생성 시 `users.businessInfo`를 seed source로 복사, canonical=`neture_suppliers`.
- 현 아키텍처: supplier row는 **운영자 등록 승인(`approveRegistration`)** 시점에 생성되며 이미 businessInfo를 **부분 seed**(representativeName/businessNumber/businessAddress/taxInvoiceEmail/org name) 중.
- **갭**: managerName(담당자)/managerPhone/businessType(업태)/zipCode·addressDetail(상세주소)가 seed에서 누락 → `getSupplierProfile`이 해당 필드를 null로 반환("비어 보임").

## 2. 변경 (1 파일)

`apps/api-server/src/modules/neture/services/operator-registration.service.ts` — `approveRegistration` supplier seed 블록:

1. businessInfo 추가 읽기: `contactName`→managerName, `managerPhone`(+users.phone fallback), `businessType`, `zipCode`, `businessAddressDetail`(+address2 fallback). `addressDetailJson = {zipCode, detailAddress}` (둘 중 하나라도 있으면).
2. `neture_suppliers` INSERT 컬럼 추가: `manager_name, manager_phone, business_type` ($6~$8).
3. `organizations` INSERT 컬럼 추가: `address_detail`($6::jsonb) + ON CONFLICT 시 `COALESCE(EXCLUDED, 기존)` 보존.

## 3. seed 필드 매핑 (완성 후)

| neture_suppliers / org | source(businessInfo) | 상태 |
|------|------|:--:|
| representative_name | representativeName(/ceoName/name) | 기존 |
| business_number (org) | businessNumber | 기존 |
| address (org) | businessAddress(/address) | 기존 |
| tax_invoice_email | taxInvoiceEmail | 기존 |
| contact_email/phone | users.email/phone | 기존 |
| **manager_name** | **contactName** | **추가** |
| **manager_phone** | **managerPhone(/users.phone)** | **추가** |
| **business_type** | **businessType** | **추가** |
| **address_detail (org)** | **{zipCode, detailAddress}** | **추가** |

→ `getSupplierProfile`이 managerName(583)/managerPhone(584)/businessType(585)/zip·detail(580-582, org.address_detail)을 surface → 프로필 완성.

## 4. 정합 원칙 준수 (D1)

- seed는 **supplier row 생성 시 1회**(`ON CONFLICT (user_id) DO NOTHING` / org는 COALESCE 보존). 이후 `/mypage/business-profile` 수정값을 덮어쓰지 않음(독립 관리).
- canonical = `neture_suppliers`/org. businessInfo는 seed source로만.

## 5. 검증

- **api-server `tsc --noEmit`: EXIT 0.**
- 정적: 추가 컬럼은 entity/스키마에 이미 존재(NetureSupplier.manager_name/manager_phone/business_type, organizations.address_detail JSONB). 값 없으면 null/미포함(안전). 트랜잭션 구조·승인 로직 무변경.
- **배포 후 smoke(권장)**: 신규 공급자 가입(담당자/업태/우편번호+상세주소 입력) → 운영자 등록 승인 → 공급자 `/mypage/business-profile` 조회 시 담당자명/담당자전화/업태/우편번호/상세주소 채워짐 확인. 기존 승인 플로우 회귀 없음.

## 6. 범위 / 후속

- 본 CHECK = **D1(seed 완성)만.** 
- **D2(승인 게이트 완화 — 정산/문서 활성화후 이연)**, **D3(품목군 선택-only + 증빙 상품단계 이동, 상품 게이트 재설계)**는 별도 WO(결정문서 §3 시퀀싱 참조). 미착수.
- (선택) 운영자 supplier-approval 목록(`getPendingSuppliers`)에 사업 필드 노출 확대는 후속 — 현재는 supplier 프로필 조회로 확인.

## 7. 준수 확인

```
✅ backend 1파일 — DB/migration/route/contract 무변경(기존 INSERT 컬럼 추가만)
✅ 가입(auth-register)·다른 세션 파일 무접촉
✅ tsc EXIT 0 · path-specific 커밋
```

---

*Date: 2026-06-18 · D1 · approveRegistration businessInfo seed 완성(managerName/managerPhone/businessType/address_detail 추가) → getSupplierProfile 비어 보임 해소 · seed-once 보존(덮어쓰기 금지) · canonical=neture_suppliers · api-server tsc 0 · D2/D3 별도 WO.*
