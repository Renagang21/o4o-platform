# SMOKE-O4O-ADMIN-SCOPE-STABILIZATION-POST-DEPLOY-V1

> **성격**: 배포 후 browser smoke 검증 (Playwright, 운영 환경). 코드/메뉴/route/backend/DB 수정 0.
> **대상**: GlycoPharm / K-Cosmetics / KPA-Society / Neture 운영 사이트.
> **선행**: `CHECK-O4O-ADMIN-SCOPE-STABILIZATION-CLOSURE-V1` (5f2f54ff9)
> **검증 일시**: 2026-06-16
> **도구**: Playwright 1.57.0 (headless chromium), curl
> **계정**: 통합 운영자 계정(SSOT `docs/local/TEST-ACCOUNTS.local.md`, admin+operator 동시 보유) — 자격증명 미기재(정책 준수)
> **판정: ✅ PASS** (검증 가능 항목 전부 정상. 일부 항목은 계정/운영데이터 제약으로 미수행 — §6 명시)

---

## 0. 판정 요약 (TL;DR)

| 서비스 | 로그인 | admin route | operator route | 결과 |
|---|:--:|:--:|:--:|:--:|
| GlycoPharm | ✅ | `/admin` 정상 (제거 진입점 미노출) | `/operator/contacts`·`/operator/stores` 정상 | ✅ PASS |
| K-Cosmetics | ✅ | `/admin` 정상 | `/operator/contacts` 정상 (+GP 무회귀) | ✅ PASS |
| KPA-Society | ✅ | `/admin`(공개 상태 점검 카드) · `/admin/settings/legal`(3탭) · `/operator/legal`(deprecated) | — | ✅ PASS |
| Neture | ✅ | `/admin`·service-audience·operators·roles ("(플랫폼)" 라벨·배너) | — | ✅ PASS |

- 모든 대상 route: **접근 정상**(redirect/403 없음), 기대 라벨/배너/카드 **표시 확인**, **unexpected console error / 4xx-5xx 없음**.
- 예외: KPA 정책 API 404(service_policy_documents + kpa_legal_documents 둘 다 미게시) — **의도된 빈 문서 상태**, graceful empty 처리 확인(회귀 아님).

---

## 1. 배포 반영 / 환경 확인

| 항목 | 결과 |
|---|---|
| 운영 사이트 reachability | glycopharm.co.kr / k-cosmetics.site / kpa-society.co.kr / neture.co.kr → **HTTP 200** |
| 4개 서비스 로그인(통합 운영자 계정) | **성공** — 로그인 후 `/admin`(또는 `/admin/kpa-dashboard`) 진입 |
| 기준 main commit | `11a89dbb3` (정비 종료 고정 시점) |

> 정확한 배포 commit pin 은 미수집(프론트 SPA). 화면 동작이 정비 결과와 일치하여 배포 반영 확인.

## 2. GlycoPharm

| route | finalUrl | redirect/403 | console err | 4xx/5xx | 관찰 |
|---|---|:--:|:--:|:--:|---|
| `/admin` | `/admin` | 없음 | 0 | 0 | 회원 데이터(관리) 라벨 present. **문의 관리 / 역할 관리 / 약국 네트워크 admin 진입점 미노출** |
| `/operator/contacts` | `/operator/contacts` | 없음 | 0 | 0 | 문의 관리 화면 접근 정상(operator 이관 확인) |
| `/operator/stores` | `/operator/stores` | 없음 | 0 | 0 | 약국 운영 canonical 접근 정상 |

→ admin scope 축소 + 문의 operator 이관 **배포 반영 확인**. ✅

## 3. K-Cosmetics

| route | finalUrl | redirect/403 | console err | 4xx/5xx | 관찰 |
|---|---|:--:|:--:|:--:|---|
| `/admin` | `/admin` | 없음 | 0 | 0 | 회원 데이터(관리) 라벨 present. **문의 관리 / 역할 관리 / 매장 네트워크 admin 진입점 미노출** |
| `/operator/contacts` | `/operator/contacts` | 없음 | 0 | 0 | 문의 관리 접근 정상(operator 이관 + guard 조정 확인) |

→ **GP 무회귀 확인**: GlycoPharm `/operator/contacts` 도 동일 정상(§2) — KCos 문의 guard 조정의 공통 controller 영향 회귀 없음. ✅

## 4. KPA-Society

| route | finalUrl | redirect/403 | console err | 4xx/5xx | 관찰 |
|---|---|:--:|:--:|:--:|---|
| `/admin` (→ `/admin/kpa-dashboard`) | `/admin/kpa-dashboard` | 없음 | 정책 404×4 (의도) | 정책 404×4 (의도) | **공개 상태 점검 카드** 표시(법정정보/약관/개인정보/문의). 정책 미게시 → 카드 graceful 표시(크래시 없음) |
| `/admin/settings/legal` | `/admin/settings/legal` | 없음 | 0 | 0 | **법정정보 + 정책 문서(약관/이용약관/개인정보) 탭** 표시. legacy 안내 문구 present |
| `/operator/legal` | `/operator/legal` | 없음 | 0 | 0 | route 보존(hard delete 아님) + **deprecated/legacy 배너** 표시 |
| `/policy` (no auth) | `/policy` | 없음 | 정책 404×2 (의도) | 정책 404×2 (의도) | **"현재 공개된 문서가 없습니다." 중립 empty state** — 빈/오류 페이지 아님 |
| `/privacy` (no auth) | `/privacy` | 없음 | 정책 404×2 (의도) | 정책 404×2 (의도) | 동일 중립 empty state |

### KPA 정책 문서 상태 (중요)
- 운영 환경에서 `GET /api/v1/public/services/kpa-society/policies/{terms,privacy}` = **404(미게시)**, legacy `GET /api/v1/kpa/legal/documents/published/{terms,privacy}` = **404(미게시)**.
- 즉 표준·legacy **둘 다 게시 문서 없음** → `/policy`·/privacy 는 fallback 체인 후 **중립 empty state** 표시(설계대로). **회귀 아님** — 운영자가 `/admin/settings/legal` 정책 문서 탭에서 terms/privacy 를 게시하면 표준 문서가 표시됨.
- 정책 404 는 "게시된 문서가 없습니다" 응답이며 시스템 오류가 아님(공개 상태 점검 카드·공개 페이지 모두 graceful 처리).

→ KPA 법정정보 편집 UI / 공개 상태 점검 / 정책문서 표준 전환(+legacy fallback) **배포 반영 확인**. ✅

## 5. Neture

| route | finalUrl | redirect/403 | console err | 4xx/5xx | 관찰 |
|---|---|:--:|:--:|:--:|---|
| `/admin` | `/admin` | 없음 | 0 | 0 | 사이드바 "**(플랫폼)**" 라벨(운영자 관리/역할 관리) 표시 |
| `/admin/settings/service-audience` | 동일 | 없음 | 0 | 0 | **"서비스 대상 정책 (플랫폼 관리)"** + 플랫폼 배너 표시, 편집 기능 유지 |
| `/admin/operators` | 동일 | 없음 | 0 | 0 | **플랫폼 관리 배너** 표시, 운영자 관리 기능 유지 |
| `/admin/roles` | 동일 | 없음 | 0 | 0 | **플랫폼 관리 배너** 표시, 역할 관리 UI 정상(full) |

→ platform-admin 표면 분리(라벨·배너) **배포 반영 확인**. Neture 서비스 admin(법정정보·약관/문의 설정) 동시 노출 정상. ✅

## 6. 미검증 / 제약 항목 (정책 준수)

| 항목 | 사유 |
|---|---|
| pure operator-only 계정 접근 | 통합 계정(admin+operator 동시 보유)으로 검증 — operator route 접근 정상 확인. 순수 operator-only 권한 경계는 별도 계정 부재로 미분리 검증 |
| KPA `/admin/settings/legal` 저장/게시 | 운영 데이터 영향 방지(WO §10) — 읽기/탭 표시만 검증, 저장 미수행 |
| Finance(정산/커미션) | WO 범위 외(현상 유지) — 미검증 |
| 스크린샷 | 텍스트 기반 관찰(라벨/배너/empty-state 문자열 + console/network 수집)로 대체 |

## 7. 발견된 FIX 필요 항목

- **없음.** 모든 검증 항목 정상. 403/redirect/dead-link/크래시 0. (KPA 정책 404 는 의도된 미게시 상태로, FIX 대상 아님.)

## 8. 판정

| PASS 기준 | 충족 |
|---|:--:|
| 4 서비스 주요 admin/operator route 접근 정상 | ✅ |
| admin 제거 진입점 미노출(문의 관리/역할 관리/네트워크) | ✅ |
| operator 이관 문의 관리 접근 정상 | ✅ |
| KPA public `/policy`·`/privacy` 오류 없음(graceful empty) | ✅ |
| Neture platform-admin 라벨/배너 표시 | ✅ |
| 권한 403 회귀 없음(GP 무회귀 포함) | ✅ |

**판정: ✅ PASS** — O4O 4개 서비스 admin scope 정비가 운영 환경에 정상 반영. 코드·문서·배포 검증까지 완료.

## 9. 후속

- 운영자가 KPA `/admin/settings/legal` 정책 문서 탭에서 terms/privacy 표준 게시 → 공개 상태 점검 "게시됨(표준)" 확인 후 `WO-O4O-KPA-LEGAL-DOCUMENT-LEGACY-CLEANUP-V1`.
- `IR-O4O-PLATFORM-ADMIN-SURFACE-DESIGN-V1` (정책 결정 선행).
- (선택) pure operator-only 계정 확보 시 권한 경계 분리 재검증.

---

## 부록 — 검증 방법/제약

| 항목 | 값 |
|------|------|
| 수정 파일 | 없음 (smoke 검증 문서만 신규 생성) |
| 생성 문서 | `docs/investigations/SMOKE-O4O-ADMIN-SCOPE-STABILIZATION-POST-DEPLOY-V1.md` |
| 검증 도구 | Playwright headless chromium (login modal → Enter submit, hard-nav 후 finalUrl/console/network/keyword 수집) |
| 자격증명 | SSOT env 주입, 보고서 미기재(정책 준수) |
| 운영 데이터 변경 | 없음(읽기 전용 검증, 저장/mutation 미수행) |
| commit hash | (commit 후 기재) |
