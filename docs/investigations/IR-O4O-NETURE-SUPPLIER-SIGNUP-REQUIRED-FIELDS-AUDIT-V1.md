# IR-O4O-NETURE-SUPPLIER-SIGNUP-REQUIRED-FIELDS-AUDIT-V1

> **조사명:** IR-O4O-NETURE-SUPPLIER-SIGNUP-REQUIRED-FIELDS-AUDIT-V1
> **유형:** 조사(Investigation) — Neture 공급자 가입신청 필수항목 정의와 현재 구현 불일치 확인
> **결과: 완료 — 백엔드 `/auth/register`에 Neture supplier 필수항목 방어 검증 부재 확인(핵심). 프론트는 최소 식별항목만 검증, 사업자등록번호 등은 미검증. 운영자 일괄 결과 모달은 빈 results 시 성공 오표시 조건부 확인.**
> **후속 WO:** `WO-O4O-NETURE-SUPPLIER-SIGNUP-REQUIRED-FIELDS-GATE-V1`
> **정책 결정:** 사업자등록번호·정산·증빙 서류는 **가입신청 필수로 올리지 않고 온보딩/ACTIVE 전환 게이트에서 유지.** 가입신청 단계는 최소 식별항목만 프론트·백엔드 양쪽 검증.

---

## 1. 조사 배경

Neture 운영자 화면 `/operator/members`에서 공급자 가입 승인을 시도하는 과정에서, 공급자 가입신청 상태와 실제 승인 가능 상태가 일관되지 않은 정황이 발견되었다.

특히 운영자 화면에는 공급자 관련 컬럼이 존재하지만, 일부 회원은 공급자 가입신청에 필요한 정보가 충분히 입력되지 않았거나 공급자 프로필 생성 대상이 아닌 상태로 보였다. 이로 인해 (1) 가입신청 필수항목 강제 부족, (2) 일부 누락 상태에서도 접수 가능, (3) 프론트/백엔드 기준 불일치, (4) 승인 대상 0건 처리 메시지 오표시, (5) 신청/승인/프로필 생성/활성화 상태 전이 혼재 가능성이 의심되었다.

본 조사는 가입신청의 필수항목·검증 위치·승인 흐름·운영자 화면 표시 기준을 코드 관점에서 확인하기 위한 것이다.

---

## 2. 조사한 실제 파일

| 영역 | 파일 |
|------|------|
| 프론트 가입모달 | `services/web-neture/src/components/RegisterModal.tsx` |
| 사업자 공통필드 | `packages/account-ui/src/components/BusinessRegistrationFields.tsx` |
| 백엔드 register | `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts` |
| register DTO | `apps/api-server/src/modules/auth/dto/register.dto.ts` |
| 공급자 승인/온보딩 | `apps/api-server/src/modules/neture/services/supplier.service.ts` |
| 공급자 엔터티 | `apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts` |
| 운영자 회원관리 | `packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx` |
| 운영자 회원관리(Neture) | `services/web-neture/src/pages/operator/UsersManagementPage.tsx` |
| 일괄처리 훅 | `packages/operator-ux-core/src/list/useBatchAction.ts` |
| 결과 모달 | `packages/ui/src/components/table/BulkResultModal.tsx` |

---

## 3. 필수항목 매트릭스 (실측)

| 항목 | 화면 존재 | 프론트 필수 | 백엔드 필수 | 저장 위치(payload→DB) | 비고 |
|------|:--------:|:----------:|:----------:|------|------|
| 이메일 | ✅ | ✅ | ✅(형식만) | `email` | 중복 차단 409 |
| 비밀번호/확인 | ✅ | ✅ | ✅ | `password` | 강도 검증 |
| 성·이름 | ✅ | ✅ | ✅ | `lastName`/`firstName` | |
| 휴대폰 | ✅ | ✅ | — | `phone` | 10–11자(프론트만) |
| 회사명 | ✅ | ✅ | ❌ | `companyName`→`businessInfo.businessName` | |
| 대표자명 | ✅ | ✅ | ❌ | `representativeName`(fallback `ceoName`) | |
| 담당자명 | ✅ | ✅ | ❌ | `contactName` | |
| 담당자 연락처 | ✅ | ✅ | ❌ | `contactPhone`→`managerPhone` | **필드명 변환** |
| 사업장 주소 | ✅ | ✅ | ❌ | `businessAddress`→`address1` | **필드명 변환** |
| 상세주소 | ✅ | ❌ | ❌ | `businessAddressDetail`→`address2` | 선택 |
| 업종 | ✅ | ❌ | ❌ | `businessType` | 화면엔 있으나 미검증 |
| 사업자등록번호 | ✅ | ❌ | ❌ | `businessNumber` | 화면엔 있으나 미검증 |
| 세금계산서 이메일 | ✅ | ❌ | ❌ | `taxInvoiceEmail`(fallback `taxEmail`) | 미검증 |
| 종목 | ✅ | ❌ | ❌ | `businessItem` | 존재시만 전송 |
| 사업자 유형 | ✅ | ❌ | ❌ | `businessEntityType` | 존재시만 전송 |
| 개업일 | ✅ | ❌ | ❌ | `businessStartDate` | 존재시만 전송 |
| 약관 동의 | ✅ | ✅ | ✅ | `agreeTerms` | |
| 개인정보 동의 | ✅ | ✅ | ✅ | `agreePrivacy` | |
| 마케팅 동의 | ✅ | ❌(선택) | — | `agreeMarketing` | 선택 |

**프론트 supplier 필수**(`isStep2Valid`, `RegisterModal.tsx:287`): 회사명·대표자명·담당자명·담당자연락처(10+)·사업장주소 + 약관/개인정보. 그 외 모든 사업자 항목은 선택.

---

## 4. 문제 유형 판정

**A. 프론트엔드 필수 검증 누락 — 확인됨.** `isStep2Valid`가 사업자등록번호·세금계산서이메일·업종·종목·사업자유형·개업일을 검증하지 않음. 화면엔 입력란이 있으나 비워도 "가입 신청하기"가 활성화됨.

**B. 백엔드 방어 검증 누락 — 확인됨(핵심).** `/auth/register`는 `service=neture & role=supplier` 분기에서 사업자 필드를 전혀 검증하지 않음. `RegisterRequestDto` 전 항목 `@IsOptional()`. 전부 누락해도 **201 Created**로 멤버십(`pending`) 생성. 프론트 수정만으로는 불충분.

**C. 저장 필드 불일치 — 확인됨.** `contactPhone`→`managerPhone`, `businessAddress`→`address1`, `businessAddressDetail`→`address2`, `companyName`→`businessName`. legacy fallback(`ceoName`/`taxEmail`)도 공존.

**D. 운영자 목록 구분 — 부분 문제.** "회원 유형"·"공급자 프로필" 컬럼으로 시각적 구분은 됨. 단 일괄 승인은 `status ∈ {pending, rejected}`로만 필터(`OperatorMembersConsolePage.tsx:415`)하며 공급자/일반을 구분하지 않아, 혼합 선택 시 일반 회원까지 승인될 수 있음. 공급자 프로필 승인은 `/operator/suppliers` 별도 흐름.

**E. 0건 성공 메시지 — 조건부 확인.** 정상 동작에선 `if (count === 0) return` + 버튼 `visible: count>0` 가드로 차단됨. 다만 API가 `results: []`(빈 배열)을 `success:true`로 반환하면 `BulkResultModal.tsx:40`의 `allSuccess = failedCount===0 && skippedCount===0`가 `true`가 되어 "모든 항목이 성공적으로 처리되었습니다" 오표시. `useBatchAction`이 `res.data.results`만 파싱하므로 응답 포맷 변형 시 빈 배열로 떨어짐.

---

## 5. 가입신청 vs 온보딩 경계 (핵심 발견)

IR §7의 경계 가설이 맞았다. Neture 구조는 이미 두 단계로 분리되어 있다.

| 단계 | 목적 | 필수 수준 |
|------|------|----------|
| 가입신청 | 공급자 참여 의사 접수 + 운영자가 계정/역할 승인 | 최소 식별 정보 |
| 공급자 온보딩 / ACTIVE 전환 | 실제 제품 등록·거래 가능 상태 전환 | 사업자등록증·정산·세금계산서·통장사본 등 |

승인 후 온보딩 검증은 `supplier.service.ts:120`의 `getMissingBasicOnboardingFields()`로 수행되며, ACTIVE 전환을 막는 게이트가 이미 존재한다. 즉 "가입신청 필수"와 "ACTIVE 온보딩 필수"가 코드상 분리되어 있으나, **백엔드 가입 게이트가 비어 있어** 프론트만 우회하면 무검증 통과된다.

---

## 6. 정책 결정

**사업자등록번호는 가입신청 필수로 올리지 않고, 온보딩 / ACTIVE 전환 필수로 유지한다.**

가입신청 단계에서 사업자등록증 PDF·통장사본·정산계좌·통신판매업 신고까지 모두 요구하면 가입 장벽이 과도해진다. 가입신청 단계에서는 "공급자 신청자임을 식별할 수 있는 최소 정보"만 받고, 실제 거래 가능 상태 전환은 기존 온보딩 게이트가 막는 구조가 자연스럽다.

### 6.1 가입신청 단계 필수항목 (최종안)

| 구분 | 필수항목 |
|------|---------|
| 계정 정보 | 이메일, 비밀번호, 비밀번호 확인, 성, 이름, 휴대폰 |
| 공급자 신청 정보 | 회사명, 대표자명, 담당자명, 담당자 연락처, 사업장 주소 |
| 동의 | 이용약관, 개인정보처리방침 |

### 6.2 가입신청 선택 / 온보딩 유지 항목

| 항목 | 처리 |
|------|------|
| 사업자등록번호 | 온보딩 / ACTIVE 전환 게이트 유지 |
| 세금계산서 이메일 | 온보딩 유지 |
| 종목 / 사업자 유형 / 개업일 | 온보딩 유지 |
| 사업자등록증 PDF / 통장 사본 PDF / 정산 계좌 | 온보딩 유지 |
| 통신판매업 신고 정보 / 신고증 PDF | 현행 정책 유지 |
| 품목군별 증빙 | 별도 WO 대상 |

---

## 7. 완료 기준 충족

1. 전체 입력 항목 확인 — ✅
2. 프론트 필수 여부 확인 — ✅
3. 백엔드 필수 여부 확인 — ✅ (전부 미검증)
4. 누락 상태 가입 가능 확인 — ✅ (가능, 201 반환)
5. 운영자 0건 성공 메시지 문제 확인 — ✅ (조건부, 빈 results 응답 시)
6. 수정 범위 확정 — ✅ (프론트 + 백엔드 동시 필요)
7. 후속 WO 작성 가능 — ✅

---

## 8. 산출물

1. 현재 필수항목 매트릭스 — §3
2. 프론트엔드 검증 로직 분석 — §3, §4-A
3. 백엔드 검증 로직 분석 — §4-B
4. payload-저장 위치 매핑 — §3, §4-C
5. 운영자 승인 UX 문제 — §4-D, §4-E
6. 수정 필요 여부 판단 — 필요(프론트+백엔드)
7. 수정 WO 제안 — `WO-O4O-NETURE-SUPPLIER-SIGNUP-REQUIRED-FIELDS-GATE-V1`
8. 영향 범위 — Neture supplier 가입만. KPA/GlycoPharm/K-Cosmetics 무관(§6.1 controller 분기)
9. 테스트 시나리오 — 후속 WO §9

---

*Date: 2026-06-18 · IR · 완료 · 백엔드 supplier 가입 게이트 부재 확인 · 정책=사업자등록번호 온보딩 유지 · 후속 WO-O4O-NETURE-SUPPLIER-SIGNUP-REQUIRED-FIELDS-GATE-V1 · 앱/DB 무변경(조사).*
