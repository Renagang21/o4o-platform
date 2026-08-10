# CHECK-O4O-ADMIN-STORE-QR-LEGACY-UI-GUIDE-V1

> WO: `WO-O4O-ADMIN-STORE-QR-LEGACY-UI-GUIDE-V1`
> 판정 근거: [`IR-O4O-ADMIN-QR-SOURCE-PRODUCTS-LEGACY-ROUTE-AUDIT-V1`](../investigations/IR-O4O-ADMIN-QR-SOURCE-PRODUCTS-LEGACY-ROUTE-AUDIT-V1.md) (판정 **REPLACE**)
> 작업일: 2026-08-10 · 기준 commit: `8750e090f` → 구현 commit: `4e5d634a2`
> 결과: **PASS (1건 부분검증)**

---

## 1. 목적

운영자 콘솔(admin-dashboard)의 매장 QR 생성/목록 화면은 `/api/v1/pharmacy/qr/*` 를 호출했으나
그 경로는 service router 안에만 마운트돼 있어(`/api/v1/{kpa|glycopharm|cosmetics}/pharmacy/qr/*`)
생성 시점부터 계속 404 였다. QR 기능을 복구하는 것이 아니라, **작동하지 않는 UI를 노출하지 않도록
안내 화면으로 교체**하는 것이 이번 WO 의 목적이다.

---

## 2. 검증 항목 (12)

| # | 항목 | 방법 | 결과 |
|:--:|------|------|:----:|
| 1 | `/store/qr` 가 안내 화면(`StoreQrGuidePage`)을 렌더한다 | 실브라우저 | ✅ PASS |
| 2 | `/store/qr/create` 도 동일 안내 화면을 렌더한다 (redirect 아님) | 실브라우저 | ✅ PASS |
| 3 | 두 경로 진입만으로 `/api/v1/pharmacy/qr/*` 호출 0건 | `performance.getEntriesByType('resource')` | ✅ PASS |
| 4 | 두 화면에서 404 응답 0건 · 콘솔 에러 0건 | 실브라우저 · console(error) | ✅ PASS |
| 5 | `QrCreatePage` · `QrListPage` 파일은 삭제하지 않고 라우팅만 해제 | 코드 | ✅ PASS |
| 6 | 프로덕션 번들에 `pharmacy/qr` 문자열 0건 (실행 불가 증명) | `grep -rl dist/assets` | ✅ PASS |
| 7 | `StoreContentWorkspacePage` QR CTA 문구 정리 + prefill state 제거 | 코드 · 번들 문자열 | ⚠️ 부분 (아래 §4) |
| 8 | 백엔드 · route · 권한 · DB 변경 0건 | `git show --stat` | ✅ PASS |
| 9 | admin-dashboard typecheck 통과 | `pnpm run type-check` | ✅ PASS |
| 10 | admin-dashboard 프로덕션 빌드 통과 | `pnpm run build:prod` | ✅ PASS |
| 11 | Deploy Admin Dashboard 성공 (API 배포 없음) | GitHub Actions | ✅ PASS |
| 12 | 회귀 — CMS/미디어/포럼/legacy redirect/로그인/좌측 메뉴 정상 | 실브라우저 | ✅ PASS |

---

## 3. 실브라우저 smoke 상세

계정: `sohae2100@gmail.com` (admin) — 자격증명 SSOT `docs/local/TEST-ACCOUNTS.local.md`
배포 스탬프 확인: `배포 성공 v4.0 · 2026. 8. 10. 오후 4:41:22` (commit `4e5d634a2` 리비전)

| 경로 | 관측 | `pharmacy/qr` 호출 | 콘솔 에러 |
|------|------|:---:|:---:|
| `/store/qr` | h1 `매장 QR 안내` · 3역할 그리드 · 서비스별 QR 링크 4건 | 0 | 0 |
| `/store/qr/create` | 동일 안내 화면 (URL 유지, redirect 없음) | 0 | 0 |
| `/kpa/content-workspace` | `매장 콘텐츠 작업 공간` 정상 · `GET /api/v1/kpa/store/assets` 200 | 0 | 0 |

안내 화면이 노출하는 매장 QR 진입점 (링크만, API 호출 없음):

- KPA-Society `kpa-society.co.kr/store/marketing/qr`
- GlycoPharm `glycopharm.co.kr/store/marketing/qr`
- K-Cosmetics `k-cosmetics.site/store/marketing/qr`
- Pharmacy-Hub `pharmacyhub.co.kr/store-owner/qr`

### 회귀 (§7.3)

| 경로 | 결과 |
|------|------|
| `/admin/cms/contents` | ✅ `126 contents` 정상 렌더 |
| `/content-resource/media-assets` | ✅ `총 35건` 정상 렌더 |
| `/forum/categories` | ✅ 카테고리 목록 정상 렌더 |
| `/posts` (직전 legacy redirect) | ✅ `/admin/cms/contents` 로 redirect 유지 |
| 로그인 | ✅ 정상 |
| 좌측 메뉴 | ✅ 전체 항목 정상 렌더 |

---

## 4. 부분 검증 1건 (숨기지 않고 기록)

**#7 QR CTA 클릭 경로**는 **실브라우저에서 끝까지 실행하지 못했다.**

- 이유: 검증 계정의 `/kpa/content-workspace` 자산 목록이 **0건**이라 QR CTA(행 단위 버튼)가 렌더되지 않았다.
  `GET /api/v1/kpa/store/assets` 는 200 으로 정상 응답했고, 데이터가 없는 정상 상태다.
- 대체 검증:
  - 코드 — `handleQrConfirm()` 이 `navigate('/store/qr')` 만 호출하고 `prefillTitle` · `prefillLibraryItemId` state 를 넘기지 않음
  - 번들 — `StoreContentWorkspacePage-DiU1tD3-.js` 에 신규 문구 `QR 적용 안내` 포함 확인
  - 도착지 — `/store/qr` 는 위 #1 에서 안내 화면임이 실브라우저로 확인됨
- 잔여 리스크: **낮음.** CTA 의 도착지·호출 경로가 모두 독립적으로 확인됐고, 이동 대상 화면은 API 를 호출하지 않는다.
  자산이 존재하는 매장 계정 확보 시 클릭 경로 1회 확인을 권장한다.

---

## 5. 변경 파일 (commit `4e5d634a2`, +220/−20)

| 파일 | 변경 |
|------|------|
| `apps/admin-dashboard/src/pages/store/qr/StoreQrGuidePage.tsx` | **신규** — API 호출 0인 안내 화면 |
| `apps/admin-dashboard/src/routes/lms-marketing.routes.tsx` | `/store/qr` · `/store/qr/create` → 안내 화면 (guard 불변) |
| `apps/admin-dashboard/src/pages/kpa/StoreContentWorkspacePage.tsx` | QR CTA 문구 정리 + prefill state 제거 |
| `apps/admin-dashboard/src/pages/store/qr/QrListPage.tsx` | 헤더 주석만 (미라우팅 명시) |
| `apps/admin-dashboard/src/pages/store/qr/QrCreatePage.tsx` | 헤더 주석만 (미라우팅 명시) |

`apps/admin-dashboard/src/api/qr.api.ts` 는 **변경하지 않았다** (§5.3 — 파일 유지). 라우팅된 화면에서
참조되지 않으므로 번들에서 제거됐다(#6).

---

## 6. 금지사항 준수 (§5.1 · §6)

| 금지 | 준수 |
|------|:---:|
| `/api/v1/pharmacy` route 신규 마운트 | ✅ 없음 |
| service segment(`/kpa` 등) 임의 부착 | ✅ 없음 |
| admin-dashboard 에서 store_owner context 추정 | ✅ 없음 |
| `supplier_product_offers` QR 소스 복구 | ✅ 없음 |
| QR 백엔드 route · 권한 · 소유권 정책 변경 | ✅ 없음 (백엔드 파일 0건) |
| DB write · migration | ✅ 없음 |
| ProductMaster · StoreLocalProduct · organization_product_listings 모델 변경 | ✅ 없음 |
| 매장 프론트 코드 수정 | ✅ 없음 |
| 대규모 IA 변경 | ✅ 없음 (메뉴 항목 제거 없음) |
| 무관한 dirty 파일 · lockfile 스테이징 | ✅ 없음 (path-specific stage) |
| 기능적으로 다른 화면으로 redirect | ✅ 없음 (안내 화면 렌더) |

---

## 7. 후속 (§11 — 본 WO 범위 아님)

1. `WO-O4O-ADMIN-QR-READONLY-STATUS-GUIDE-V1` — 운영자용 QR 현황 read-only 조회 필요성 판단
2. `WO-O4O-ADMIN-API-SERVICE-SEGMENT-AUDIT-V1` — admin-dashboard 의 service segment 누락 호출 전수 감사
3. `WO-O4O-ADMIN-QR-PREFILL-STATE-WIRING-V1` — 자료 → QR prefill 전달 계약 재설계
4. `WO-O4O-ADMIN-DEAD-QR-CALLSITE-CLEANUP-V1` — `qr.api.ts` · `QrCreatePage` · `QrListPage` 파일 정리

---

## 8. 문서 정합 (CLAUDE.md §16)

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
