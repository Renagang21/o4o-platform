# CHECK-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-ENTRY-AND-ONBOARDING-V1

> WO: [`WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-ENTRY-AND-ONBOARDING-V1`](../work-orders/WO-O4O-NETURE-SUPPLIER-STORE-DESCRIPTION-ENTRY-AND-ONBOARDING-V1.md)
> 근거: [`IR-...-QR-TABLET-FLOW-AUDIT-V1`](../investigations/IR-O4O-NETURE-SUPPLIER-STORE-CONTENT-QR-TABLET-FLOW-AUDIT-V1.md) · [`DECISION-...-D1-D4-V1`](../investigations/DECISION-O4O-NETURE-SUPPLIER-STORE-CONTENT-D1-D4-V1.md)
> 작성일: 2026-07-12 · 작업 위치: `C:\Users\sohae\coding\o4o-platform` (Laptop)
> 상태: **구현·검증·배포·라이브 스모크 완료 (PASS)**

---

## 0. 요약

공급자 대시보드에 **"매장용 상품 설명서" 서비스 진입점 + 온보딩 안내(UI만)** 를 추가했다. 저장/QR/태블릿/백엔드 write는 **없음**(비목표). 정책(D1~D4) 준수. PENDING/ACTIVE 두 분기 라이브 브라우저 스모크 PASS.

| 항목 | 결과 |
|------|------|
| 커밋 | `a58b95175` (4 files, +162) |
| 배포 | neture-web `01255-...` → **`01256-v8j`** (2026-07-12T04:44Z, run 29180091023 success) |
| typecheck | web-neture 총 오류 0 |
| build | vite build 성공(12.21s) |
| 라이브 스모크 | PENDING PASS · ACTIVE PASS · 콘솔오류 0 |
| product-landing(D3) 파일 | **미접촉** |

---

## 1. 변경 파일 (4개, 경로 명시 커밋)

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/supplier/SupplierStoreDescriptionsPage.tsx` | 신규 — 진입점/온보딩 안내 페이지 |
| `services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx` | 제품 관리 그룹에 `매장용 설명서` 사이드바 항목 추가 |
| `services/web-neture/src/App.tsx` | lazy import + `/supplier/store-descriptions` 라우트 |
| `services/web-neture/src/pages/supplier/SupplierDashboardPage.tsx` | QUICK_LINKS에 `매장용 설명서` 추가 |

백엔드·마이그레이션·lockfile·product-landing·태블릿 파일 **미변경**.

## 2. 구현 내용

- **진입점**: 사이드바(제품 관리 > 매장용 설명서, `/supplier/store-descriptions`) + 대시보드 quick-link. 기존 `제품 콘텐츠 관리(B2B)`와 라벨·경로 구분(데드링크 0).
- **상태별 안내**(backend `supplierProfileApi.getProfile` 단일 권위, 재계산 없음 — `SupplierActivationGate`와 동일 패턴):
  - PENDING/비-ACTIVE: "공급자 승인 후 사용 가능합니다" + 누락 정보(있으면) + 프로필 링크.
  - ACTIVE: "상품별 매장용 설명서 준비" + **작성 CTA는 `disabled`(준비 중)** + 상품 목록 링크.
- **진행 단계 안내**: 1 상품 등록 → 2 STORE 설명서 작성(준비 중) → 3 운영자 검수 → 4 매장 활용(복사).
- **정책 요약**: 공급자 직접 게시 안 함 / 운영자 검수 후 노출 / 가져오기=복사 / 이 화면은 진입점(저장·QR·태블릿은 후속).

## 3. 정책 준수 (DECISION D1~D4)

- D1: 타입 표기 **STORE**만 사용. `SUPPLIER_STORE` 문구 **미노출**(스모크 `noSupplierStore=true` 확인).
- D2: "운영자 검수 후 매장에 노출됩니다" 명시.
- D3(랜딩 인증): **미접촉** — product-landing 관련 파일 전혀 수정하지 않음(다른 세션 진행 중).
- D4: "공급자 직접 게시 안 함, 매장 경영자가 복사·활용" 명시. 태블릿 미접촉.

## 4. 비목표 확인 (이번 WO에서 안 한 것)

```
STORE 설명서 저장/편집 API·화면 (없음)
description_type/SUPPLIER_STORE write (없음)
QR/Product Landing 생성·연결·인증 (없음)
태블릿 Screen Set/Block 변경 (없음)
SPD 스키마/마이그레이션 (없음)
백엔드 write / DB migration (없음)
```

## 5. 검증

### 5.1 정적
- `web-neture` `tsc --noEmit`: **총 오류 0** (워크스페이스 패키지 빌드 완료 상태). 변경 4파일 관련 오류 0.
- `vite build`: **성공**(12.21s). (chunk-size 경고는 기존 advisory)
- 변경 격리: `git status` 상 web-neture 변경은 4파일뿐, product-landing/robots 미접촉 확인.

### 5.2 배포
- push `a58b95175` → GitHub Actions "Deploy Web Services (Cloud Run)" run `29180091023` **success** → `neture-web-01256-v8j` (2026-07-12T04:44Z) 롤포워드.

### 5.3 라이브 브라우저 스모크 (Playwright, 임시 userDataDir, 자격증명 env 주입)
대상: `https://neture.co.kr`. 테스트 계정은 `docs/local/TEST-ACCOUNTS.local.md` SSOT.

| 계정 | 상태 | heading | 분기 | 사이드바 진입점 | 정책문구 | SUPPLIER_STORE 미노출 | 콘솔오류 |
|------|------|:------:|------|:------:|:------:|:------:|:------:|
| `sohae21@naver.com`(공급자) | PENDING | ✅ | "승인 후 사용 가능" ✅ | ✅ | ✅ | ✅ | 0 |
| `renagang21@gmail.com`(공급자2) | ACTIVE | ✅ | "상품별 준비" ✅ | ✅ | ✅ | ✅ | 0 |

- `/supplier/store-descriptions` HTTP 200, 로그인 후 정상 렌더.
- 스크린샷: 스캐치패드 저장(`store-desc-pending.png`, `store-desc-active.png`) — 저장소 커밋 안 함.

## 6. 테스트 데이터 정리

- 스모크는 **읽기 전용 탐색**(로그인 + 페이지 조회)만 수행. ACTIVE 작성 CTA는 disabled → write 발생 불가.
- 상품·미디어·설명서·QR 생성 **0건** → 정리 대상 없음.

## 7. 완료 조건 대비

| 완료 조건 | 결과 |
|-----------|:---:|
| 공급자 대시보드에 새 진입점 노출 | ✅ (사이드바 + quick-link) |
| PENDING = "승인 후 사용 가능" 안내 | ✅ |
| ACTIVE = "상품별 매장용 설명서 준비" 안내 | ✅ |
| 상품 등록 후 다음 액션 연결 UI | ✅ (진행 단계 + 상품 관리 링크) |
| 작성 페이지 없으면 준비중/disabled CTA | ✅ (disabled CTA) |
| typecheck 통과 | ✅ (0 errors) |
| build | ✅ |
| 배포 후 브라우저 smoke | ✅ (PENDING/ACTIVE PASS) |
| CHECK 문서 | ✅ (본 문서) |
| 커밋/푸시 | ✅ (`a58b95175`) |

## 8. 커밋 정보

- 구현 커밋: `a58b95175` — feat(neture): 공급자 매장용 설명서 서비스 진입점 + 온보딩 안내
- CHECK 문서 커밋: (본 문서 커밋 후 기입)
- 스테이징: 경로 명시(4파일). 기존 dirty·타 세션 파일 미포함.

## 9. 후속 (DECISION 순서)

1. `WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1` — SPD 작성자/검수자 메타 컬럼 (다음 권장).
2. `WO-O4O-PRODUCT-CONTENT-STORE-SUPPLIER-DRAFT-V1` — 공급자 STORE 초안 작성·저장(이 진입점의 disabled CTA를 활성화).
3. (별도 세션) D3 랜딩 인증 게이트.
</content>
