# CHECK-O4O-MY-STORE-PRODUCT-HEADING-3SERVICES-SMOKE-V1

> 배포 후 3서비스(KPA / GlycoPharm / K-Cosmetics) `my-products` / `local-products` heading · IA browser smoke.
> **결과: PASS** — 6개 화면 모두 의도한 heading 렌더 확인 (redirect 0 / pageError 0).
> 선행: `WO-O4O-MY-STORE-CANONICAL-MENU-LABEL-ALIGNMENT-3SERVICES-V1`(PASS, commit `d8c40e78c`) — 2026-06-11

---

## 1. 목적

선행 WO 의 heading/문구 정렬이 **실제 배포 환경에서 의도대로 표시**되는지 확인한다.

확인 기준:
- `my-products` heading = **O4O 주문 가능 상품**
- `local-products` heading = **매장 취급 상품**
- 메뉴 라벨은 기존 "제품" 앵커 유지, 화면 렌더 정상, 권한/라우트 오류 없음

---

## 2. 배포 확인

`d8c40e78c` push → "Deploy Web Services (Cloud Run)" run `27344634022`:

| job | 결과 | 시각 |
|---|---|---|
| detect-changes | success | 11:48:57 |
| deploy-k-cosmetics | success | 11:49:09–11:51:11 |
| deploy-glycopharm | success | 11:49:09–11:51:12 |
| deploy-kpa-society | skipped (이번 커밋 KPA 무변경 — 선행 커밋에서 배포 반영) |
| deploy-neture | skipped |

→ GP/KCos 신규 배포 반영, KPA 선행 배포 반영 → 3서비스 모두 정렬 heading live.

---

## 3. 검증 방식

- Playwright (chromium, headless) — gitignored SSOT(`docs/local/TEST-ACCOUNTS.local.md`)에서 자격증명 직접 파싱(명령/로그 비노출).
- 각 서비스 `/login` 로그인 → 대상 route hard-navigation → `h1/h2/h3` 텍스트 추출 + screenshot + console/pageerror/4xx-5xx 수집.
- 계정: KPA/GP = `renagang21@gmail.com`(약국 경영자/약국 = store_owner), KCos = `sohae2100@gmail.com`(admin — store_owner 전용 계정 SSOT 부재).
- 산출물(로컬, 비커밋): `c:\tmp\smoke-heading-result.json`, `c:\tmp\smoke-*.png`.

---

## 4. 결과

| 서비스 | route | finalUrl redirect | h1 렌더 | expect 일치 | pageError | 4xx/5xx |
|---|---|---|---|---|---|---|
| KPA | /store/my-products | 없음 | `O4O 주문 가능 상품` | ✅ | 0 | 0 |
| KPA | /store/commerce/local-products | 없음 | `매장 취급 상품 (0)` | ✅ | 0 | 0 |
| GlycoPharm | /store/my-products | 없음 | `O4O 주문 가능 상품` | ✅ | 0 | 0 |
| GlycoPharm | /store/commerce/local-products | 없음 | `매장 취급 상품 (0)` | ✅ | 0 | 0 |
| K-Cosmetics | /store/my-products | 없음 | `O4O 주문 가능 상품` | ✅ | 0 | 403¹ |
| K-Cosmetics | /store/commerce/local-products | 없음 | `매장 취급 상품 (0)` | ✅ | 0 | 403¹ |

**6/6 PASS.** 모든 화면에서 의도한 heading 렌더, redirect/페이지 오류 없음.

¹ KCos 403 = `GET /api/v1/cosmetics/store-hub/capabilities` — 검증 계정(`sohae2100`, admin)이 `cosmetics:store_owner`
  capability 를 보유하지 않아 발생. **heading 렌더와 무관**(데이터/capability 영역). heading 은 정적 문구이므로
  store_owner 계정에서도 동일 렌더. → heading smoke 판정에 영향 없음.

---

## 5. 메뉴 IA 확인

- 3서비스 로그인 후 매장 사이드 메뉴의 활성화 앵커 라벨은 "내 약국 제품" / "내 매장 제품"(제품 = 제작 기준 데이터)
  으로 유지됨 — `storeMenuConfig.ts` 무변경 결과와 일치. 위험했던 포괄 라벨 "내 매장 상품" 메뉴 노출 없음.
- page heading 계층에서만 "O4O 주문 가능 상품" / "매장 취급 상품" 데이터 성격 표기 — 의도한 계층 분리 동작 확인.

---

## 6. 완료 판정

| 조건 | 충족 |
|---|---|
| my-products heading = O4O 주문 가능 상품 (3서비스) | ✅ |
| local-products heading = 매장 취급 상품 (3서비스) | ✅ |
| 메뉴 라벨 제품 앵커 유지 | ✅ |
| 화면 렌더 정상 / redirect·pageError 없음 | ✅ |
| 권한 관련 치명 오류 없음 (KCos 403 은 capability 영역, heading 무관) | ✅ |

**판정: PASS**

---

## 7. 후속

- KCos `cosmetics:store_owner` 테스트 계정이 SSOT 에 부재 — store_owner 기준 데이터 영역(상품 목록/capabilities)
  검증은 계정 보강 후 별도 수행 권장. (본 smoke 의 heading 검증 범위에는 영향 없음.)
- 다음 작업: `IR-O4O-SELLER-RECRUITMENT-TO-SUPPLY-APPROVAL-FLOW-V1` (판매자 모집 ↔ 공급 승인 흐름 확정).
