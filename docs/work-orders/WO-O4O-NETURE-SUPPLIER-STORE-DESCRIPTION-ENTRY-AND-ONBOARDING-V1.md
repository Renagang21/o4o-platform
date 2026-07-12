# WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-ENTRY-AND-ONBOARDING-V1

> 성격: 구현 WO(1차, 범위 최소). 저장/QR/태블릿 없음 — **진입점 + 안내(UI)만**.
> 선행 근거: [`IR-...-QR-TABLET-FLOW-AUDIT-V1`](../investigations/IR-O4O-NETURE-SUPPLIER-STORE-CONTENT-QR-TABLET-FLOW-AUDIT-V1.md) · [`DECISION-...-D1-D4-V1`](../investigations/DECISION-O4O-NETURE-SUPPLIER-STORE-CONTENT-D1-D4-V1.md)
> 상태: **초안(미착수)** — 승인 후 구현

## 0. 작업 위치
- 저장소: https://github.com/Renagang21/o4o-platform · 로컬: 작업자 checkout(예: `C:\Users\sohae\coding\o4o-platform`).
- 전제: `git pull origin main`, AGENTS.md/CLAUDE.md 확인, 기존 dirty·타 세션 파일(특히 product-landing·pnpm-lock·KPA·충돌 파일) **미접촉**.

## 1. 제목
Neture 공급자 대시보드 "매장용 상품 설명서" 진입점 + 온보딩 안내

## 2. 목표 (이번 WO 범위)
1. 공급자 대시보드에 **"매장용 상품 설명서" 서비스 진입점**(메뉴 + 라우트 + placeholder 페이지) 추가.
2. 상품 등록 완료 후 **다음 작업으로 "매장용 설명서 작성"을 안내**(링크/CTA).
3. **PENDING/ACTIVE 상태별 가능 작업 안내**(온보딩 안내 카드/체크리스트, 읽기 전용).
4. placeholder 페이지는 "곧 제공" 안내 + 정책 요약(운영자 검수 후 매장 노출)만 표시.

## 3. 비목표 (이번 WO에서 하지 않음 — 중요)
```
STORE 설명서 저장/편집 API·화면
description_type/SUPPLIER_STORE 관련 write
QR/Product Landing 생성·연결·인증(D3)
태블릿 Screen Set/Block 변경
SPD 스키마/마이그레이션 변경
운영자 검수 로직
```
위 항목은 후속 WO(DECISION 문서의 순서 2~6). 이번엔 **UI 진입점·안내만**.

## 4. 결정 준수 (DECISION-...-D1-D4-V1)
- 타입 표기는 **STORE**("매장용 상품 설명서"). `SUPPLIER_STORE` 문구 노출 금지.
- 안내 문구에 "운영자 검수 후 매장에 노출됩니다" 명시(D2).
- 공급자가 직접 게시/배포하는 것처럼 오해되는 문구 금지(D1/D4).

## 5. 대상 파일(예상, 실제는 코드 확인 후)
허용:
```
services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx   (사이드바 항목 추가)
services/web-neture/src/App.tsx                                      (라우트 추가)
services/web-neture/src/pages/supplier/  (신규 placeholder/온보딩 페이지)
services/web-neture/src/pages/supplier/SupplierDashboardPage.tsx     (CTA/안내, 선택)
```
금지:
```
apps/api-server/** (백엔드 write 없음)
product-landing.* / QR / tablet 관련 파일
shared_product_descriptions 관련 엔티티/마이그레이션
pnpm-lock.yaml, 기존 dirty·타 세션·충돌 파일
```

## 6. 진입점 위치 (IR §A-2 근거)
- 사이드바 `SUPPLIER_SIDEBAR_GROUPS`(`SupplierSpaceLayout.tsx:53-125`) — "제품 관리"와 "공급 오퍼" 사이 신규 그룹 또는 "제품 관리" items에 항목. 기존 `제품 콘텐츠 관리 → /supplier/b2b-content`(B2B)와 **명확히 구분**.
- 라우트는 `App.tsx:772-813` SupplierSpaceLayout 블록에 동반(데드링크 0).
- PENDING/ACTIVE 안내는 기존 `SupplierActivationGate`·`activationReady`/`missingActivationFields` 재사용(재계산 금지).

## 7. 검증
```
web-neture typecheck (수정 파일 무오류; 기존 미빌드 패키지 노이즈는 분리 판단)
build (가능 시)
브라우저 스모크: PENDING/ACTIVE 각각 진입점 표시·안내 문구·데드링크 0 확인
```

## 8. 완료 조건
- 공급자 대시보드에 "매장용 상품 설명서" 진입점 노출(데드링크 0).
- placeholder 페이지가 정책 요약(운영자 검수 후 노출) 표시.
- PENDING/ACTIVE 상태별 안내 정확.
- 저장/QR/태블릿/백엔드 write **0건**.
- CHECK 문서 작성: `docs/checks/CHECK-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-ENTRY-AND-ONBOARDING-V1.md`.
- 커밋은 경로 명시, 무관·타 세션 파일 미포함.
</content>
