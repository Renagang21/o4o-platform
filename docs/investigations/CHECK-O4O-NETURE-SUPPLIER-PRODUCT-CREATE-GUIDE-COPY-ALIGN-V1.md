# CHECK-O4O-NETURE-SUPPLIER-PRODUCT-CREATE-GUIDE-COPY-ALIGN-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-PRODUCT-CREATE-GUIDE-COPY-ALIGN-V1 (정보-우선 마감 정합)
> **유형:** frontend copy-only — 등록 진입 GuideBlock 문구를 정보-우선 UX에 정렬. **backend/API/DB/migration/기능 0.**
> **결과: PASS(코드/타입) — 등록 GuideBlock 코드 fallback 문구 정정(Step2 '공급가, 유통 정책, 서비스 노출'→'기본 공급가(공급 방식은 저장 후 별도 설정)' + description/title 정보-우선). web-neture tsc 0. 라이브 smoke 배포 후.**
> 선행: WO-O4O-NETURE-SUPPLIER-PRODUCT-CREATE-INFO-FIRST-V1 (§발견 잔존) — 2026-06-19

---

## 0. 출처 확인 (§8 중단 기준 비해당)

- 문제 문구는 `SupplierProductCreatePage.tsx` GuideBlock 의 **코드 fallback**(`guideTitle/guideDesc/guideSteps ?? [...]`, line 488-498). 라이브가 이 fallback 문자열을 **그대로 표시**(CMS guide override 없음) → **코드 수정으로 정합 가능.** CMS 운영 데이터 의존 아님 → 중단 기준(CMS라 코드 수정 불가) **비해당.**
- 참고: 추후 해당 pageKey에 CMS guide가 작성되면 CMS copy가 fallback을 override — 그 경우 CMS 측 정정은 별도(운영) 소관.

## 1. 변경 파일 (frontend 1 + CHECK)

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx` | GuideBlock fallback: title/description/steps 문구를 정보-우선으로 정정 |

## 2. 문구 정정 (before → after)

| 항목 | before | after |
|------|--------|-------|
| title | "상품 등록 절차를 안내합니다." | "상품 정보를 먼저 등록합니다." |
| description | "3단계 마법사로 상품 기본 정보, **가격/유통 설정**, 이미지/설명을 순서대로 입력합니다." | "상품 기본 정보와 기본 공급가를 저장합니다. **공급 방식(전체 공개/서비스 공급)은 저장 후 상품 상세의 [공급 방식 변경]에서 설정**하며, 설정 전까지 HUB에 노출되지 않습니다." |
| Step 2 | "Step 2: 공급가, **유통 정책, 서비스 노출**을 설정합니다" | "Step 2: **기본 공급가**를 입력합니다 (**공급 방식은 저장 후 별도 설정**)" |
| Step 1 / Step 3 | (유지) | (유지) |

→ 등록 중 '유통 정책 / 서비스 노출' 직접 설정 암시 제거. 현재 위저드(Step2=기본 공급가, hideDistribution)와 정합.

## 3. 검증

- **web-neture `tsc --noEmit`: EXIT 0** (문자열 리터럴만 변경).
- 기능/flow/ProductForm/createProduct/API **무변경**.

### 실브라우저 smoke — 2026-06-19 **PASS** (renagang21, `/supplier/products/new`)
1. GuideBlock: title **"상품 정보를 먼저 등록합니다."** · description "…기본 공급가 저장. 공급 방식은 저장 후 [공급 방식 변경]에서 설정 … HUB 미노출" · **Step 2 "기본 공급가를 입력합니다 (공급 방식은 저장 후 별도 설정)"** — **'유통 정책/서비스 노출' 표현 제거 확인.** **PASS**
2. 스텝 표시 "2 기본 공급가" + 정보-우선 배너 일관, Step1 입력 UI 회귀 없음. **PASS**

## 4. 비범위 / 준수

- ✅ 등록 flow/ProductForm/createProduct/distribution/모달/이벤트오퍼/DB/migration/CMS 구조 **무변경**.
- ✅ path-specific(create page 1 + CHECK). **다른 세션 WIP·검증 png 미staging.**

## 5. 후속
- `IR-O4O-NETURE-SUPPLIER-PRODUCT-SERVICE-SPECIFIC-PRICING-V1` (서비스별/계약별 공급가 read-only 조사).

---

*Date: 2026-06-19 · copy-only · 등록 GuideBlock fallback 문구 정보-우선 정합(Step2 유통/서비스 노출 표현 제거) · 코드 fallback(CMS override 없음) · 기능/backend 0 · web-neture tsc 0 · 배포 후 smoke.*
