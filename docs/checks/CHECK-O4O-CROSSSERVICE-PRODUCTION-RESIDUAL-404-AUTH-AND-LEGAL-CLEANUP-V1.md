# CHECK-O4O-CROSSSERVICE-PRODUCTION-RESIDUAL-404-AUTH-AND-LEGAL-CLEANUP-V1

- **WO**: `WO-O4O-CROSSSERVICE-PRODUCTION-RESIDUAL-404-AUTH-AND-LEGAL-CLEANUP-V1`
- **작성일**: 2026-08-18
- **대상 서비스**: KPA-Society · Neture · Pharmacy-Hub (K-Cosmetics · GlycoPharm 은 회귀 확인)
- **판정**: **PASS_WITH_BLOCKED_ITEM**
  - 사용자 노출 404 / dead link / white screen / JS exception: **0**
  - 다만 **법적 문서 본문 자체는 production 에 1건도 게시되어 있지 않다**. 게시는 본 WO 가 명시적으로 금지한 행위(`법적 문서 내용 임의 생성·수정`)여서 수행하지 않았다. §5 참조.

---

## 0. 요약

| # | WO 대상 | 원인 | 처리 | production 실측 |
|---|---------|------|------|-----------------|
| 1 | PharmacyHub footer legal 404 | `pharmacy-hub` 가 `SUPPORTED_LEGAL_SERVICE_KEYS` 에 없어 `UNKNOWN_SERVICE` 404 | **이미 해결됨** (`c6ff9c023` + `7f5bcb456`) — 재구현 안 함 | 5개 서비스 `footer-legal` 전부 `200 {"success":true,"data":null}` |
| 2 | KPA 약관·개인정보 404 | **DB 데이터 부재** — `service_policy_documents` 에 게시 문서 0건 (KPA 뿐 아니라 5개 서비스 전부). route·guard·frontend 는 정상 | 코드 수정 없음. 게시는 §5 사유로 보류 | `/policy` · `/privacy` 페이지 **정상 렌더**, "현재 공개된 문서가 없습니다" 빈 상태. 페이지 404 0건 |
| 3 | Neture 미인증 `/operator` 착지 불일치 | `PostLoginRedirect` 가 `LoginModal` 의 `navigate(returnUrl)` 와 같은 auth 변화에 반응 → 역할 대시보드(`/admin`)로 덮어씀 | **수정** `ba5192616` — 1회성 `sessionStorage` 플래그 | 미인증 `/operator` → 로그인 → **`/operator` 복귀** (desktop·mobile 모두) |
| D1 | Neture `/terms` `/privacy` dead (CMS slug 404) | CMS 페이지 경로 참조 → 미마운트 `/api/v1/cms/public/page/*` | **다른 세션이 `fa3c533c7` 로 해결** — WO 지시대로 재구현 안 함 | canonical policy API 사용, 정상 렌더 |
| D2 | PharmacyHub `/terms` `/privacy` 앱 404 | 공개 route 미등록 | **다른 세션이 `fa3c533c7` 로 해결** | route 존재, 정상 렌더 + footer 링크 노출 |

---

## 1. 원인 확정 (WO 가 요구한 구분)

WO 는 404 원인을 `serviceKey 불일치 / 문서 미발행 / DB 데이터 부재 / 잘못된 frontend endpoint / scope 차단 / seed·migration 누락` 중 실제로 무엇인지 구분하라고 했다. 실측 결과:

| 후보 원인 | 해당 여부 | 근거 |
|---|:---:|---|
| serviceKey 불일치 | 해당 (과거, 해소됨) | `pharmacy-hub` 누락 → `SUPPORTED_LEGAL_SERVICE_KEYS` 추가로 해소. 현재 5키 전부 200 |
| 잘못된 frontend endpoint | 해당 (과거, 해소됨) | Neture 가 CMS slug 를 보고 있었음 → `fa3c533c7` 로 canonical API 정렬 |
| frontend route 누락 | 해당 (과거, 해소됨) | PharmacyHub `/terms` `/privacy` 미등록 → `fa3c533c7` 로 추가 |
| **DB 데이터 부재 / 문서 미발행** | **해당 (현존)** | 5개 서비스 × `terms`·`privacy` = 10건 전부 404. 관리자 권한 조회로 `service_policy_documents` 게시 0건, legacy `kpa_legal_documents` 도 `data:[]` 확인 |
| scope 차단 | 미해당 | 미인증 상태에서 public endpoint 200 (`footer-legal`) 확인 |
| seed·migration 누락 | 미해당 | 테이블·엔드포인트 모두 존재하고 응답. 비어 있을 뿐 |

### `policies/*` 404 는 계약상 정상 응답이다

`apps/api-server/src/modules/service-legal/public-service-legal.controller.ts` 주석에 명시:

```
GET /:serviceKey/legal-profile          — 활성 법정정보 (없으면 data:null, placeholder 금지)
GET /:serviceKey/footer-legal           — 푸터용 법정정보 (legal-profile 동일 데이터)
GET /:serviceKey/policies/:documentType — 최신 published 정책 문서 (없으면 404)
```

즉 `policies` 의 404 는 "게시된 문서 없음" 을 나타내는 **설계된 응답**이며 장애가 아니다. frontend 는 이를 `null` 로 흡수해 "현재 공개된 문서가 없습니다" 빈 상태를 렌더한다 — 사용자에게 404 화면이 보이지 않는다.

### 게시 경로가 살아 있다는 실증

desktop 검증 실행 중 PharmacyHub `/terms` 에서 다음이 실제로 렌더되었다:

```
[E2E_TEST] 이용약관 검증용 임시 문서 (수정 반영 확인)  버전 v1 · 게시일 2026. 8. 18.
```

같은 실행의 후속 단계(F)에서는 다시 "현재 공개된 문서가 없습니다" 로 돌아왔다 — 병행 세션이 E2E 임시 문서를 게시했다가 회수한 것이다. **문서를 게시하면 public 페이지에 그대로 노출된다는 경로가 production 에서 실증**되었고, 남은 것은 오직 "게시할 실제 법적 본문" 뿐이다.

---

## 2. 수정 내역

### 2-1. 본 WO 에서 직접 수정한 것 — Neture returnUrl 복귀 (`ba5192616`)

Neture 의 `/login` 은 페이지가 아니라 **모달**이다 (`LoginRedirect` → `openLoginModal(returnUrl)` → `<Navigate to="/" replace />`). 따라서 미인증 `/operator` 진입 시 `/` 에 착지하는 것 자체는 설계다. 실제 결함은 **로그인 성공 후 원래 경로로 돌아오지 않는 것**이었다 (실측: `/admin` 착지).

원인은 GlycoPharm 에서 `4e62945ad` 로 이미 확정된 것과 동일한 경쟁 조건이다.

- `LoginModal.handleLoginSuccess()` 가 `navigate(returnUrl)` 호출
- `PostLoginRedirect` 도 같은 auth 상태 변화에 반응하고, 그 시점 `pathname` 이 아직 `/` 이므로 가드를 통과해 역할 대시보드로 이동
- 결과적으로 `returnUrl` 이 덮어써짐

수정 (2 파일 / 23 insertions):

- `services/web-neture/src/components/LoginModal.tsx` — `returnUrl` 로 명시 이동할 때 `sessionStorage['neture_login_explicit_nav'] = '1'`
- `services/web-neture/src/App.tsx` — `PostLoginRedirect` 가 해당 플래그를 보면 1회 소비 후 리다이렉트를 건너뜀

권한 정책·guard·role 은 건드리지 않았다 (WO: `권한 정책 자체는 변경하지 않는다`).

### 2-2. 다른 커밋에서 이미 해결되어 재구현하지 않은 것

WO 지시: `이미 다른 커밋에서 해결된 항목이면 재구현하지 말고 현재 main/prod 실측 PASS 로 닫는다.`

| 항목 | 커밋 | 확인 |
|---|---|---|
| PharmacyHub legal scope (footer 404) | `c6ff9c023`, `7f5bcb456` | `footer-legal` 5/5 200 |
| PharmacyHub 공개 약관 route + Neture terms/privacy canonical 정렬 | `fa3c533c7` (병행 세션) | 두 서비스 모두 페이지 렌더 확인 |

`fa3c533c7` 는 조사 도중 main 에 착지했고 배포 완료(`Deploy Web Services` success)를 확인한 뒤 실측으로만 닫았다.

---

## 3. production 실측 (배포 후 재검증)

- 배포: `ba5192616` → `Deploy Web Services (Cloud Run)` **completed/success** (run 32086970194). `fa3c533c7` 도 success (32086712219).
  - 참고: `ba5192616` 의 `CI Pipeline` / `CodeQL` 은 `cancelled` 인데, 이는 직후 push(`94d25adab`)에 의한 concurrency 취소이며 실패가 아니다.
- 도구: Playwright (repo `node_modules`), desktop 1440×900 / mobile 390×844, 5개 서비스 × 2 뷰포트 = **10 세션**.

### 3-1. 미인증 `/operator` → 로그인 → 원래 경로 복귀

| 서비스 | 미인증 착지 | 로그인 | 로그인 후 착지 | 판정 |
|---|---|:---:|---|:---:|
| **Neture** (desktop) | `/` (모달, 설계) | 200 | **`/operator`** | ✅ |
| **Neture** (mobile) | `/` (모달, 설계) | 200 | **`/operator`** | ✅ |
| KPA (d/m) | `/login` | 200 | `/operator` | ✅ |
| K-Cosmetics (d/m) | `/login` | 200 | `/operator` | ✅ |
| GlycoPharm (d/m) | `/` (모달) | 200 | `/operator` | ✅ |
| Pharmacy-Hub (d/m) | `/operator` 에서 "로그인이 필요합니다" 게이트 | — | 인라인 로그인 폼 없음 | 관찰 (§6) |

Neture 의 `/admin` 오착지는 재현되지 않는다 — 수정 확인.

### 3-2. deep link + 새로고침

인증 상태에서 `/operator` 직접 진입 후 새로고침: **10/10 세션 모두 `/operator` 유지**, white screen 0.

### 3-3. legal 페이지 (미인증 · 인증 · 새로고침)

| 서비스 | 경로 | 렌더 | 본문 |
|---|---|:---:|---|
| KPA | `/policy` `/privacy` | ✅ | "현재 공개된 문서가 없습니다" |
| Neture | `/terms` `/privacy` | ✅ | 동일 (이전 "준비 중 / CMS slug" 문구 사라짐) |
| Pharmacy-Hub | `/terms` `/privacy` | ✅ | 동일 (이전 앱 404 사라짐) |
| K-Cosmetics | `/terms` `/privacy` | ✅ | 동일 |
| GlycoPharm | `/terms` `/privacy` | ✅ | 동일 |

미인증 · 인증 · 새로고침 3가지 상태 전부 동일하게 정상 렌더.

### 3-4. footer legal 링크 (dead link 0)

| 서비스 | 링크 | 대상 | 도달 |
|---|---|---|:---:|
| KPA | 이용약관 / 개인정보처리방침 | `/policy` / `/privacy` | ✅ |
| K-Cosmetics | 이용약관 / 개인정보처리방침 | `/terms` / `/privacy` | ✅ |
| **Pharmacy-Hub** | 이용약관 / 개인정보처리방침 | `/terms` / `/privacy` | ✅ (신규 노출) |
| Neture | footer 에 약관 링크 노출 없음 (desktop 스캔 0건, mobile 하단에는 표기 존재) | — | dead link 0 |
| GlycoPharm | footer 스캔 결과 약관 링크 없음 (`회원 데이터 관리` 만 매칭) | — | dead link 0 |

**dead link 0건.** Neture·GlycoPharm 의 footer 약관 링크 부재는 404 가 아니라 노출 여부 문제이므로 본 WO 범위 밖으로 §6 에 기록한다.

### 3-5. 오류 계측

| 항목 | 결과 |
|---|---|
| JS exception (`pageerror`) | **0** (10/10 세션) |
| white screen | **0** (모든 페이지 본문 길이 > 100자) |
| 예상치 못한 404/500 | **0** |
| 계측된 API 4xx | `policies/{terms,privacy}` 404 뿐 (설계된 응답) + KPA 의 legacy fallback `/kpa/legal/documents/published/*` 404 (canonical 실패 시 정상 fallback 시도) |

---

## 4. DB · API 변경

**없음.**

- migration 0건, seed 0건, production write 0건
- API 계약 변경 0건 (`불필요한 API/DB 계약 변경` 금지 준수)
- 실사용자 데이터 훼손 0건
- 변경은 frontend 2 파일뿐 (`services/web-neture`)

---

## 5. 완료 기준 대비 — 차단 항목 1건

| 완료 기준 | 결과 |
|---|:---:|
| PharmacyHub footer legal 404: 0 | ✅ |
| KPA 약관·개인정보 **페이지** 404: 0 | ✅ |
| Neture `/operator` 잘못된 홈 착지: 0 | ✅ |
| legal dead link: 0 | ✅ |
| 예상치 못한 404/500: 0 | ✅ |
| white screen: 0 | ✅ |
| JS exception: 0 | ✅ |
| desktop / mobile: PASS | ✅ |
| typecheck / build | ✅ `tsc -b` rc=0, `npm run build` rc=0 (web-neture) |
| **약관·개인정보 본문이 실제로 열림** | ❌ **차단** |

### 차단 사유

"KPA 약관·개인정보가 production 에서 실제로 열린다" 를 문자 그대로 만족시키려면 **법적 문서 본문을 작성해 production 에 게시**해야 한다. 이는

1. 본 WO 의 금지 조항 `법적 문서 내용 임의 생성·수정` 에 정면으로 위배되고,
2. WO 본문의 `법적 문서 내용 자체는 임의 작성·수정하지 않는다` 와도 충돌하며,
3. 법무·사업 판단이 필요한 production write 다.

따라서 **수행하지 않았고, 우회하지도 않았다.** 코드·route·API·frontend 측 원인은 전부 제거되었으므로, 승인된 법적 본문이 게시되는 순간 별도 코드 변경 없이 노출된다 (§1 의 `[E2E_TEST]` 실증). 이 항목은 **법무 승인 + 게시 WO** 로 넘긴다.

또한 이 결손은 KPA 만의 문제가 아니라 **5개 서비스 전부** 동일하다.

---

## 6. 남은 관찰 (본 WO 범위 밖 · 별도 판단 필요)

| # | 내용 | 성격 |
|---|---|---|
| O1 | `service_policy_documents` 게시 문서 0건 (5개 서비스 × 전 문서 유형) | 법무·콘텐츠 |
| O2 | `service_legal_profiles` — Neture·Pharmacy-Hub 는 row 존재하나 전 필드 null, KPA·K-Cosmetics·GlycoPharm 은 row 없음 | 사업자 정보 등록 |
| O3 | Neture·GlycoPharm footer 에 약관·개인정보 링크가 desktop 에서 노출되지 않음 (dead link 아님, 미노출) | UX |
| O4 | Pharmacy-Hub `/operator` 는 별도 "로그인이 필요합니다" 게이트를 렌더하며 인라인 로그인 폼이 없음 — 타 서비스와 동선이 다름 | UX 일관성 |
| O5 | 병행 세션이 production 에 `[E2E_TEST]` 법적 문서를 게시·회수 중. 잔류 여부 주기 확인 권장 | 운영 위생 |

---

## 7. 금지 조항 준수

| 금지 | 준수 |
|---|:---:|
| 법적 문서 내용 임의 생성·수정 | ✅ 0건 (그래서 §5 가 차단됨) |
| 권한 완화 | ✅ guard·role·allowedRoles 무변경 |
| 불필요한 API/DB 계약 변경 | ✅ 0건 |
| 실사용자 데이터 훼손 | ✅ production write 0건 |
| 세 문제를 다시 소형 WO 로 분리 | ✅ 단일 WO·단일 CHECK 로 종결 |

---

## 8. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (§5 법적 문서 게시 WO)

---

## 9. Git

| 항목 | 값 |
|---|---|
| 수정 커밋 | `ba5192616` — `fix(neture): 미인증 /operator 진입 후 로그인 시 원래 경로 복귀` |
| 참조 커밋 (타 세션) | `fa3c533c7` — PharmacyHub 공개 약관 route + Neture terms/privacy canonical 정렬 |
| 참조 커밋 (선행) | `c6ff9c023`, `7f5bcb456` — PharmacyHub legal service scope |
| 본 CHECK | 아래 커밋 |
