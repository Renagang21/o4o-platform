# CHECK-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1

- **WO**: `WO-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1`
- **성격**: 5서비스 legal/policy 축 전체 마감 (조사 + 구현 + 프로덕션 E2E)
- **작성일**: 2026-08-18
- **기준 브랜치**: `main`
- **대상 서비스**: KPA-Society / K-Cosmetics / GlycoPharm / PharmacyHub / Neture

---

## 1. 전체 모집단 전수조사 결과 (§1)

기존 문서 수치를 신뢰하지 않고 **코드 + 프로덕션 실측**으로 다시 확인했다. 미조사 0건.

| 항목 | KPA | KCos | GP | PH | Neture | 판정 |
|---|---|---|---|---|---|---|
| operator/admin legal 설정 화면 | 있음 `/admin/settings/legal` | 있음 `/admin/settings/legal-terms` | 있음 `/admin/settings/legal-terms` | 있음 `/operator/settings/legal-terms` | 있음 `/admin/settings/legal-terms` | **IMPLEMENTED** |
| 메뉴 링크 | 있음 | 있음 (System) | 있음 (System) | 있음 | 있음 | **IMPLEMENTED** |
| footer 법정정보 컴포넌트 | `PublicLegalFooterInfo` | 동일 | 동일 | 동일 | 동일(이번 WO 배선) | **IMPLEMENTED** |
| public `footer-legal` | 200 `data:null` | 200 `data:null` | 200 `data:null` | 200 `data:null` | 200 `data:null` | **EMPTY-BUT-VALID** |
| public `legal-profile` | 200 `data:null` | 200 `data:null` | 200 `data:null` | 200 `data:null` | 200 `data:null` | **EMPTY-BUT-VALID** |
| public `policies/terms` | 404 `NOT_FOUND` | 404 | 404 | 404 | 404 | **EMPTY-BUT-VALID** (미게시 계약) |
| public `policies/privacy` | 404 `NOT_FOUND` | 404 | 404 | 404 | 404 | **EMPTY-BUT-VALID** |
| 이용약관 공개 route | `/policy` (**SERVICE_SPECIFIC**) | `/terms` | `/terms` | `/terms` (신설) | `/terms` (교체) | **IMPLEMENTED** |
| 개인정보처리방침 공개 route | `/privacy` | `/privacy` | `/privacy` | `/privacy` (신설) | `/privacy` (교체) | **IMPLEMENTED** |
| `policies` 탭 | 열림 | 열림 | 열림 | **이번 WO 로 열림** | 열림 | **IMPLEMENTED** |

### 착수 시점의 실제 결함 (BROKEN / NOT_IMPLEMENTED)

| # | 서비스 | 결함 | 처리 |
|---|---|---|---|
| B1 | PharmacyHub | `/terms` · `/privacy` route 부재 → footer 링크가 SPA fallback | route + 페이지 신설 |
| B2 | PharmacyHub | footer 에 약관 링크 자체가 없음 | `navigation.ts` 약관 섹션 추가 |
| B3 | PharmacyHub | `enabledTabs={['profile','status']}` 로 정책 문서 탭이 숨겨져 있었음 | 제거 (공통 3탭) |
| B4 | Neture | `/terms` · `/privacy` 가 CMS 기반 `LegalPage` → **항상 "해당 페이지를 준비 중입니다."** (CMS 라우터 미마운트) | 공통 `PolicyDocumentViewer` 로 교체, `LegalPage.tsx` 삭제 |
| B5 | Neture | 푸터에 법정정보·약관 링크 없음 | `NetureLayout` · `MainLayout` 에 배선 |

KPA / KCos / GP 는 착수 시점에 이미 IMPLEMENTED 였고 **코드 변경 0건**이다.

---

## 2. 운영자 legal 설정 공통화 (§2)

5서비스 전부 `@o4o/operator-core-ui` 의 **동일한 `ServiceLegalSettingsPage`** 를 소비한다.

- **`enabledTabs` 를 전달하는 서비스는 이제 0개** — 5서비스 모두 `법정정보 / 정책 문서 / 공개 상태 확인` 3탭을 동일하게 렌더한다. (PH 만 2탭이던 예외를 제거)
- 서비스별 차이는 **`serviceKey` / route 경로 / 메뉴 위치 / 권한 adapter** 뿐이다.
- **동일 화면을 서비스별로 복사한 사례 0건.** 이번 WO 에서 신규 복사본을 만들지 않았다.

브라우저 실측 (desktop 1440×900) — 5서비스 모두 동일 헤더 `서비스 설정 — 법정정보·약관` + `대상 서비스: {serviceKey}` 표기 확인:

| 서비스 | 표기된 serviceKey | 탭 |
|---|---|---|
| KPA-Society | `kpa-society` | 3탭 |
| K-Cosmetics | `k-cosmetics` | 3탭 |
| GlycoPharm | `glycopharm` | 3탭 |
| PharmacyHub | `pharmacy-hub` | 3탭 |
| Neture | `neture` | 3탭 |

---

## 3. terms / privacy 계약 (§3)

- 문서가 게시되면 제목 · 버전 · 시행일 · 본문이 렌더된다 → PharmacyHub 실데이터 사이클로 **실증**(§6).
- 문서가 없으면 공통 empty 상태 `현재 공개된 문서가 없습니다.` 를 렌더한다 → 5서비스 전부 확인.
- **dead link · 404 방치 0건.** 코드에서 발견된 legal 링크(`/terms` `/privacy` `/policy` `/contact`) 전부 해당 서비스에 라우트가 존재한다.
- **가짜 약관 · 개인정보 문구를 생성하지 않았다.** 본 WO 가 작성한 문장은 `[E2E_TEST]` 접두 검증 데이터뿐이며 전량 원복했다.
- KPA 는 이용약관 공개 경로가 `/terms` 가 아닌 **`/policy`** 다 (기존 계약). 공통 API 실패 시 legacy `kpa/legal/documents/published/*` 로 fallback 하는 KPA 고유 배선도 유지했다.

---

## 4. footer / public API (§4)

프로덕션 실측 (`https://api.neture.co.kr/api/v1/public/services/{key}/...`):

```text
{key}/footer-legal      → 200 {"success":true,"data":null}        (5/5)
{key}/legal-profile     → 200 {"success":true,"data":null}        (5/5)
{key}/policies/terms    → 404 NOT_FOUND "게시된 문서가 없습니다."   (5/5)
{key}/policies/privacy  → 404 NOT_FOUND "게시된 문서가 없습니다."   (5/5)
unknown-svc/*           → 404 UNKNOWN_SERVICE                      (계약 유지)
```

- serviceKey 불일치 **0건** — 프론트가 보내는 키가 5개 canonical key 와 정확히 일치한다.
- 잘못된 fallback **0건** — 미설정 시 placeholder 를 만들지 않고 `null` / empty 를 유지한다.
- **중복 supported-service 목록 없음.** `SUPPORTED_LEGAL_SERVICE_KEYS` 는 저장소에서 `service-legal-scope.ts` 1곳에만 선언돼 있고, 정확히 5개임을 테스트가 고정한다. 정리 대상 중복이 발견되지 않아 **추가 변경 없음**.
- **auth / membership 구조 미변경** (파일 수정 0건).

---

## 5. 권한 매트릭스 (§5) — 프로덕션 실측

| 주체 | admin GET/PUT profile | policies list | public terms/privacy/footer |
|---|---|---|---|
| admin (`sohae2100@gmail.com`) | **200** (5서비스) | **200** | 200 |
| operator | **200** (scope `{prefix}:operator`) | **200** | 200 |
| store_owner (`renagang21@gmail.com`) | **403 FORBIDDEN** (`Required scope: kpa:operator` / `pharmacy-hub:operator`) — GET·PUT 양쪽 | **403** | 200 |
| anonymous | **401** | **401** | **200 / 404(미게시)** — 공개 조회 가능 |

권한 모델·role·scope 정의는 **한 줄도 변경하지 않았다.**

---

## 6. 프로덕션 실데이터 검증 (§6)

법적 문구가 확정된 서비스가 없으므로 **`[E2E_TEST]` 데이터만 정규 API 로** 입력하고 전량 원복했다. **DB 직접 write 0건.**

### 6-1. PharmacyHub — 정책 문서 전체 사이클

| 단계 | 수단 | 결과 |
|---|---|---|
| 초안 생성 | `POST /admin/services/pharmacy-hub/policies` | 201 (status=`draft`) |
| 게시 | `PATCH .../policies/{id}/publish` (action=publish) | 200 |
| public 반영 | `GET /public/services/pharmacy-hub/policies/terms` | **200** |
| 브라우저(desktop 1440×900) | `https://pharmacyhub.co.kr/terms` | 제목·버전·본문 렌더 |
| 수정 | `PUT .../policies/{id}` | 200 → public 즉시 반영 |
| 브라우저(mobile 390×844) | 동일 경로 | 렌더 정상 · `overflowX=false` |
| 게시 취소 | `PATCH .../publish` (action=unpublish) | 200 → public **404** 복귀 |
| 최종 화면 | `/terms` | `현재 공개된 문서가 없습니다.` 로 복귀 |

### 6-2. Neture — 법정정보 프로필 전체 사이클 (**운영자 UI 경유**)

저장 `[E2E_TEST] 검증용 임시 상호` + 활성 → `footer-legal` **200** → `/terms` 푸터에 표시 → 새로고침 지속 확인 → `[E2E_TEST] 수정 반영 확인` 으로 수정 → public 반영 → 값 비우고 비활성화 → **`data:null` 복귀**. 원복 후 admin 행은 `updatedAt` 외 백업과 동일.

### 6-3. 잔여물 (숨기지 않고 명시)

PharmacyHub 의 `[E2E_TEST]` 정책 문서 행 `f347af0e-bdf1-420e-9017-1f772da2a8d9` 가 **미게시 draft 로 남아 있다.**

- 원인: `admin-service-legal.controller.ts` 에 **DELETE 엔드포인트가 존재하지 않는다** (create / update / publish 만 있음).
- WO §6 · §10 이 **DB 직접 write 를 금지**하므로 SQL 삭제를 하지 않았다.
- 영향: `status='draft'` 이므로 **공개 API·공개 화면에서 조회되지 않는다.** 운영자 정책 문서 탭 목록에서만 보인다.
- 후속: 정책 문서 삭제(또는 archive) 엔드포인트 부재는 별도 WO 대상(§12 후속 1).

---

## 7. dead surface 전수 제거 (§7)

| 항목 | 결과 |
|---|---|
| legal 404 (라우트 없음) | **0** — PH `/terms` `/privacy` 신설로 해소 |
| dead footer link | **0** — 코드의 모든 legal 링크에 라우트 존재 |
| route 없는 terms/privacy | **0** |
| menu 없는 live settings | **0** — 5서비스 모두 메뉴 진입 가능 |
| "준비 중" 화면 | **0** — Neture `LegalPage` 삭제로 해소 |
| white screen | **0** |
| JS exception | **0** |
| 핵심 API 5xx | **0** |
| 잘못된 serviceKey | **0** |

### console 404 에 대한 판정

공개 legal 페이지에서 관측되는 `policies/{type}` **404 는 결함이 아니라 계약**이다 (미게시 → `NOT_FOUND` → 공통 뷰어가 empty 상태로 처리). KPA 는 canonical 404 후 legacy 엔드포인트를 한 번 더 시도하므로 404 가 2건 찍힌다 — 기존 fallback 설계대로이며 화면은 정상이다. **JS exception · white screen 은 0건.**

---

## 8. 브라우저 E2E (§8)

| 서비스 | desktop 1440×900 | mobile 390×844 | 확인 경로 |
|---|:---:|:---:|---|
| KPA-Society | **PASS** | **PASS** | 로그인 → `/admin/settings/legal` (3탭) → `/policy` → `/privacy` |
| K-Cosmetics | **PASS** | **PASS** | 로그인 → `/admin/settings/legal-terms` (법정정보·정책문서 탭) → `/terms` → `/privacy` |
| GlycoPharm | **PASS** | **PASS** | 로그인 → `/admin/settings/legal-terms` (3탭 전부) → `/terms` → `/privacy` · 설정화면 모바일 `overflowX=false` |
| PharmacyHub | **PASS** | **PASS** | 로그인 → operator 설정 → 저장/게시/수정/취소 사이클 → `/terms` → `/privacy` |
| Neture | **PASS** | **PASS** | 로그인 → `/admin/settings/legal-terms` → 저장·수정·원복 → 푸터 → `/terms` → `/privacy` |

전 페이지 가로 스크롤 없음(`overflowX=false`), white screen 0, JS exception 0.

### 도메인 확인 (조사 중 발견)

**K-Cosmetics 의 실제 서비스 도메인은 `k-cosmetics.site` 다.** `k-cosmetics.co.kr` 은 무관한 Cafe24 쇼핑몰이며 접속 시 Cafe24 404 페이지가 나온다. legal 검증 시 도메인 혼동 주의.

---

## 9. 회귀 (§9)

| 대상 | 명령 | 결과 |
|---|---|---|
| `services/web-kpa-society` | `tsc -b` | ✅ PASS |
| `services/web-k-cosmetics` | `tsc -b` | ✅ PASS |
| `services/web-glycopharm` | `tsc -b` | ✅ PASS |
| `services/web-pharmacy-hub` | `tsc -b` | ✅ PASS |
| `services/web-neture` | `tsc -b` | ✅ PASS |
| 주요 legal API | 위 §4 · §5 실측 | ✅ 전 항목 계약 일치 |
| CI 배포 | `Deploy Web Services (Cloud Run)` @ `fa3c533c7` | ✅ success |

---

## 10. 변경 파일 (구현 커밋 `fa3c533c7`, 10 files +130/−129)

| 파일 | 변경 |
|---|---|
| `services/web-pharmacy-hub/src/pages/legal/PolicyDocumentPage.tsx` | **신설** — `TermsPage` / `PrivacyPage` |
| `services/web-pharmacy-hub/src/App.tsx` | `/terms` · `/privacy` 라우트 |
| `services/web-pharmacy-hub/src/config/navigation.ts` | 푸터 '약관' 섹션 |
| `services/web-pharmacy-hub/src/components/Footer.tsx` | 주석 정정 |
| `services/web-pharmacy-hub/src/pages/operator/ServiceLegalSettingsPage.tsx` | `enabledTabs` 제거 (정책 문서 탭 개방) |
| `services/web-neture/src/pages/legal/PolicyDocumentPage.tsx` | **신설** |
| `services/web-neture/src/App.tsx` | 라우트를 공통 뷰어로 교체 |
| `services/web-neture/src/pages/LegalPage.tsx` | **삭제** — "준비 중" dead 화면 |
| `services/web-neture/src/components/layouts/NetureLayout.tsx` | 푸터 법정정보 + 약관 링크 |
| `services/web-neture/src/components/layouts/MainLayout.tsx` | 약관 링크 |

**DB schema · migration · auth · membership · role · 결제/주문 변경 0건.**

---

## 11. 완료 매트릭스 (§11)

| 항목 | KPA | KCos | GP | PH | Neture |
|---|:---:|:---:|:---:|:---:|:---:|
| operator legal settings | PASS | PASS | PASS | PASS | PASS |
| footer legal | PASS | PASS | PASS | PASS | PASS |
| terms | PASS (`/policy`) | PASS | PASS | PASS | PASS |
| privacy | PASS | PASS | PASS | PASS | PASS |
| public API | PASS | PASS | PASS | PASS | PASS |
| desktop (1440×900) | PASS | PASS | PASS | PASS | PASS |
| mobile (390×844) | PASS | PASS | PASS | PASS | PASS |
| dead link | 0 | 0 | 0 | 0 | 0 |
| 404 (결함성) | 0 | 0 | 0 | 0 | 0 |
| white screen | 0 | 0 | 0 | 0 | 0 |
| JS exception | 0 | 0 | 0 | 0 | 0 |

**`N/A` 사용 0건.** KPA 의 terms 는 경로가 `/terms` 가 아니라 `/policy` 라는 서비스 고유 계약일 뿐 기능은 존재하므로 PASS 로 판정했다.

---

## 12. 미해결 / 후속 (숨기지 않음)

1. **정책 문서 삭제 엔드포인트 부재** — PH `[E2E_TEST]` draft 1행 잔존(§6-3). 공개 노출 없음. 별도 WO.
2. **전 서비스 법정정보·약관 실데이터 미설정** — 법무 검토가 필요한 실제 문구는 본 WO 에서 작성하지 않았다. 운영 과제이며 개발 WO 로 처리하지 않는다.
3. KPA 운영자의 legacy "법률 관리" 화면이 공통 화면과 병존 — 공통 화면 안내문이 legacy 임을 이미 고지하고 있다. 제거는 별도 WO.

---

## 13. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건
```
