# WO-O4O-NETURE-SUPPLIER-ONBOARDING-BUSINESS-PROFILE-SYNC-AND-SIMPLIFICATION-V1

> **상태:** 설계·결정 확정 / **구현 보류(coordination)** — 가입과정이 동시 수정 중이라 signup/register 경로 코드 변경은 해당 작업 정착 후 진행.
> **유형:** 설계 결정 기록(documentation). 본 문서 자체는 코드/DB/API 변경 0.
> 선행 조사: 본 세션 데이터흐름 조사 + `IR-O4O-NETURE-SUPPLIER-PROFILE-APPROVAL-TARGET-AUDIT-V1`(다른 세션, 운영자측 0-target) · `IR-O4O-CROSSSERVICE-BUSINESS-ADDRESS-POSTCODE-SEARCH-AUDIT-V1` — 2026-06-18

---

## 0. 코디네이션 주의 (필독)

- **가입과정(auth-register / RegisterModal / registerSupplier / operator-registration.service)이 현재 다른 작업으로 수정 중**(최근 커밋 `e05212e15` AddressSearch on signup, `8767133fa` registration batch shape).
- 본 WO의 핵심 변경(가입 시 supplier seed upsert)은 **정확히 그 경로**에 들어가므로, **동시 편집 충돌 방지를 위해 구현은 가입과정 수정 정착 후** 착수한다.
- 본 문서는 그 시점에 따를 **확정 결정**을 고정한다(구현 없음).

---

## 1. 확정된 근본 원인 (조사 결과)

가입 데이터가 공급자 도메인으로 흐르지 않음:

1. **가입(`auth-register.controller`)**: `users.businessInfo`(JSONB) + `service_memberships(pending)`만 저장. **`neture_suppliers` row 미생성.**
2. **`POST /neture/supplier/register`(`registerSupplier`)**: PENDING row를 `{slug, userId, contactEmail}` + org{name}만으로 생성 — **businessInfo(사업자번호/대표자/주소/세금계산서/담당자 등) 미복사.** (별도로 `operator-registration.service`에 lazy 생성 경로 존재 — 다른 세션 IR 참조.)
3. **프로필 조회(`getSupplierProfile`)**: prefill 부분적 — `needsPrefill`일 때 businessNumber/businessAddress/businessType/taxInvoiceEmail만. **representativeName/managerName/managerPhone/zipCode/addressDetail은 businessInfo fallback 없이 항상 null.**
4. **운영자 승인(`AdminSupplierApprovalPage` + `getMissingBasicOnboardingFields`)**: **정산은행/계좌/예금주/통장사본 문서/사업자등록증 문서 + 세금계산서 이메일**이 모두 있어야 승인 버튼 활성 → 가입 데이터와 별개의 무거운 서류로 승인 차단.

→ "비어 보임 + 승인 막힘"은 ① businessInfo 미전달(이중 원천) + ② 승인 게이트의 무거운 서류 요구.

## 2. 확정 결정 (사용자 승인 2026-06-18)

### D1. Part 1 정합 = "가입 시 복사(write)" — seed-once upsert
- **가입 신청 제출 시점**에 `users.businessInfo` 를 seed source 로 `neture_suppliers`(+ org) 에 **초기 생성(upsert)** 한다.
- 이후 `/mypage/business-profile` 및 운영자 승인 화면은 **`neture_suppliers` 를 canonical 로 조회**한다.
- **1회성 seed + 이후 supplier profile 독립 관리.** `users.businessInfo` 는 **초기 seed source 로만** 사용하고, 승인/운영 단계의 canonical source 로 쓰지 않는다.
- **항상 동기화 금지** — 가입 후 공급자가 `/mypage/business-profile` 에서 수정한 값을 나중 businessInfo 저장이 덮어쓰면 안 됨. 이미 supplier row 존재 시 **덮어쓰기 범위 제한**(빈 필드만 seed, 기존 값 보존).
- 읽기마다 businessInfo fallback surface 방식은 **채택하지 않음**(원천 이중화로 승인·운영 혼선).

**seed upsert 필드 매핑:**
| 필드 | source |
|------|--------|
| companyName / organizationName | users.businessInfo |
| representativeName | users.businessInfo |
| businessNumber | users.businessInfo |
| contactName(managerName) | users.businessInfo 또는 user 기본정보 |
| phone(managerPhone) | users.businessInfo 또는 user 기본정보 |
| email | user.email / businessInfo.taxInvoiceEmail |
| address(+zip/detail) | users.businessInfo |
| taxInvoiceEmail | users.businessInfo |
| mailOrderReport status/number | 있으면 복사 |
| supplier status | PENDING (또는 SUBMITTED) |

### D2. 승인 게이트 = 완화 (정책 변경)
- 현재 `getMissingBasicOnboardingFields`(정산은행/계좌/예금주/통장사본/사업자등록증 문서 + 세금계산서 이메일)가 **승인 필수** → 승인 버튼 차단.
- **완화**: 기본 사업자 정보만으로 승인 가능하게 하고, 정산/문서 제출은 **활성화 후 단계로 이연**(네이버·쿠팡식 간편 입점).
- ⚠️ **주의**: 정산정보는 향후 결제·정산 흐름에 필요 → "승인 시 필수"에서 빼되 **활성화 후 정산 등록 게이트**(주문/정산 진입 전 필수)로 이동하는 설계 필요. 결제·정산 영향 검토를 구현 WO에서 명시.

### D3. Part 2 = 증빙을 상품 단계로 이동
- `/mypage/business-profile` 공급 예정 품목군 = **선택(체크)만**. 허가/신고 번호·증빙 PDF·검토요청은 프로필 단계에서 제거.
- 규제 품목 번호/증빙은 **상품 등록 또는 검토 요청 단계**에서 제출.
- 일반 상품 = 서류 불필요 유지.
- ⚠️ **연쇄 영향**: 현재 상품 승인 게이트(`evaluateGate`)는 **공급자 품목군 status='approved'** 를 요구. 증빙/검토를 상품 단계로 옮기면 **이 게이트 재설계 필요**(품목군 승인 → 상품 단위 증빙 검토로 전환). **별도·중규모 WO 권장**(상품 승인 게이트 변경은 직전 `WO-...-APPROVAL-GATE-UX-MESSAGE-IMPROVEMENT-V1` 와도 정합 필요).

## 3. 권장 구현 시퀀싱 (가입과정 정착 후)

1. **WO-A (코어, D1)** — 가입 제출 시 `users.businessInfo`→`neture_suppliers`(+org) seed upsert + 프로필/운영자 조회를 neture_suppliers canonical 로 정렬. (※ 가입과정 동시수정과 충돌하므로 정착 후.)
2. **WO-B (정책, D2)** — 승인 게이트 완화 + 정산/문서를 활성화 후 게이트로 이동. 결제·정산 영향 검토 포함.
3. **WO-C (별도·중, D3)** — 품목군 프로필 선택-only + 상품 단계 증빙 게이트 재설계.

각 단계는 smoke(신규 가입 → 프로필 조회 → 운영자 승인 → 규제 품목 UI)로 검증하고 CHECK 기록.

## 4. canonical 규칙 (고정)

```
users.businessInfo        → 가입 신청 시 최초 seed source (1회성)
neture_suppliers / org    → 공급자 승인·운영·프로필 관리의 canonical source
※ 읽기마다 businessInfo fallback surface 방식 미채택 (원천 이중화 방지)
※ seed 이후 supplier profile 독립 관리 (businessInfo 재저장이 supplier 수정값 덮어쓰기 금지)
```

## 5. 비범위 / 주의

- 본 문서는 결정 기록만. **코드/DB/API/route/권한/migration 변경 0.**
- 가입과정 동시수정 충돌 회피 — signup/register 경로 코드 미접촉.
- D2 정산 완화는 결제·정산 흐름 영향 → 구현 WO에서 별도 검토 필수.
- D3 품목군 게이트 재설계는 상품 승인 게이트 영향 → 별도 WO.

## 6. 준수 확인

```
✅ documentation only — 코드/DB/API 변경 0
✅ 산출물 = 본 문서 1개(path-specific)
✅ 가입과정 동시수정 파일 무접촉(coordination)
```

---

*결정 확정 2026-06-18 · Part1=가입시 seed-once upsert(businessInfo→neture_suppliers, canonical=neture_suppliers, 독립관리·덮어쓰기 제한) · 승인게이트=완화(정산/문서 활성화후 이연, 결제영향 검토) · Part2=품목군 선택only+증빙 상품단계 이동(상품 게이트 재설계 별도 WO) · 구현은 가입과정 동시수정 정착 후 착수(충돌 회피).*
