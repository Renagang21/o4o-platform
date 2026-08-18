# HANDOFF-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1

- **작성일**: 2026-08-18
- **인계자**: Agent E (Operator 트랙)
- **인계 대상**: Agent A (cross-service legal/policy 축)
- **기준**: `origin/main` = `fa0962cf7`
- **대상 서비스**: KPA-Society / K-Cosmetics / Neture / PharmacyHub / GlycoPharm

---

## 0. 인계 전 반드시 읽을 것 — 후속 WO 후보가 이미 완료되었다

본 handoff 의 애초 후속 WO 후보였던 **`WO-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1` 은 병행 세션이 이미 수행·마감했다.**

| 항목 | 값 |
|---|---|
| 구현 커밋 | `fa3c533c7` — PharmacyHub 공개 약관 route 추가 + Neture terms/privacy canonical 정렬 (10 files, +130/−129) |
| CHECK 커밋 | `99e279340` |
| CHECK 문서 | [`docs/checks/CHECK-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1.md`](../checks/CHECK-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1.md) |
| 범위 | 5서비스 legal/policy 전수 census + 구현 + production E2E (desktop·mobile) |

따라서 Agent A 는 **census 를 처음부터 다시 하지 않는다.** 아래 §3 의 실측 현황을 출발점으로 삼고, §5 의 **잔여 3건**만 이어서 처리한다. 같은 WO 명을 다시 열지 말고 **§6 의 후속 WO 후보**를 사용한다.

---

## 1. 현재 확인된 상태 (2026-08-18 production 실측)

| # | 항목 | 상태 |
|---|---|:---:|
| 1 | PharmacyHub legal route / footer 404 **코드 문제** | ✅ **해결** — `c6ff9c023` + `7f5bcb456` (service scope) · `fa3c533c7` (`/terms` `/privacy` route + footer 링크) |
| 2 | KPA legal route 정상, **실제 게시 문서 부재** | ⚠️ **확인** — route·guard·frontend 정상, 게시 문서 0건 |
| 3 | `service_policy_documents` 게시 상태 | ⚠️ **조사 완료 — 게시 0건** (§3-2) |
| 4 | `service_legal_profiles` 누락 / NULL 상태 | ⚠️ **조사 완료 — 전 서비스 미설정** (§3-3) |
| 5 | Neture / PharmacyHub legal route 정비 | ✅ **완료** — `fa3c533c7` |
| 6 | `[E2E_TEST]` legal 문서 잔류 | ⚠️ **잔류 1건 확인** (§3-4) |
| 7 | 문서 미게시 시 frontend empty state | ✅ **정상** — 5서비스 전부 "현재 공개된 문서가 없습니다" 렌더, 404 화면 아님 |

---

## 2. 계약 (오해 방지 — Agent A 가 먼저 알아야 할 것)

`apps/api-server/src/modules/service-legal/public-service-legal.controller.ts` 에 명시된 설계다.

```text
GET /public/services/:serviceKey/legal-profile          → 없으면 200 { data: null }  (placeholder 금지)
GET /public/services/:serviceKey/footer-legal           → legal-profile 과 동일 데이터
GET /public/services/:serviceKey/policies/:documentType → 없으면 404 NOT_FOUND "게시된 문서가 없습니다."
GET /public/services/unknown-svc/*                      → 404 UNKNOWN_SERVICE
```

- **`policies/*` 의 404 는 장애가 아니라 "미게시" 를 뜻하는 계약 응답**이다. 공통 뷰어가 이를 흡수해 empty 상태를 렌더한다. 브라우저 콘솔의 404 를 결함으로 집계하지 말 것.
- KPA 는 canonical 404 후 legacy `/api/v1/kpa/legal/documents/published/*` 를 한 번 더 시도하므로 **404 가 2건** 찍힌다. 기존 fallback 설계이며 화면은 정상이다.
- serviceKey 는 `apps/api-server/src/modules/service-legal/service-legal-scope.ts` 의 `SUPPORTED_LEGAL_SERVICE_KEYS` 5개(`neture` `glycopharm` `kpa-society` `k-cosmetics` `pharmacy-hub`)가 유일 선언이다. 중복 목록 없음.
- **KPA 의 이용약관 공개 경로는 `/terms` 가 아니라 `/policy`** 다 (서비스 고유 계약). `/terms` 로 검증하면 오탐이 난다.
- **K-Cosmetics 의 실제 도메인은 `k-cosmetics.site`** 다. `k-cosmetics.co.kr` 은 무관한 Cafe24 쇼핑몰이다.

---

## 3. production 실측 현황 (Agent A 의 출발점)

### 3-1. 공개 API — 5/5 동일

```text
{key}/footer-legal      → 200 {"success":true,"data":null}      (5/5)
{key}/legal-profile     → 200 {"success":true,"data":null}      (5/5)
{key}/policies/terms    → 404 NOT_FOUND                          (5/5)
{key}/policies/privacy  → 404 NOT_FOUND                          (5/5)
```

### 3-2. `service_policy_documents` — 관리자 API 실측

`GET /api/v1/admin/services/{key}/policies` (admin 세션):

| 서비스 | 문서 수 | 게시(published) |
|---|:---:|:---:|
| kpa-society | 0 | 0 |
| neture | 0 | 0 |
| k-cosmetics | 0 | 0 |
| glycopharm | 0 | 0 |
| pharmacy-hub | **1** (§3-4 잔여물) | **0** (draft) |

**게시 문서는 5서비스 통틀어 0건이다.** 레거시 `kpa_legal_documents` 도 `data:[]` 로 비어 있다.

### 3-3. `service_legal_profiles` — 관리자 API 실측

| 서비스 | row | 내용 |
|---|:---:|---|
| neture | 있음 | 전 필드 `null` (E2E 검증 후 원복된 상태) |
| pharmacy-hub | 있음 | 전 필드 `null` |
| kpa-society | **없음** | `data:null` |
| k-cosmetics | **없음** | `data:null` |
| glycopharm | **없음** | `data:null` |

### 3-4. `[E2E_TEST]` 잔류 문서 — 1건

```json
{
  "id": "f347af0e-bdf1-420e-9017-1f772da2a8d9",
  "serviceKey": "pharmacy-hub",
  "documentType": "terms",
  "title": "[E2E_TEST] 이용약관 검증용 임시 문서 (수정 반영 확인)",
  "version": 1,
  "status": "draft"
}
```

- **공개 노출 없음** — `status='draft'` 이므로 public API·공개 화면에서 조회되지 않는다. 운영자 "정책 문서" 탭 목록에서만 보인다.
- 삭제되지 않은 이유: **`admin-service-legal.controller.ts` 에 DELETE 엔드포인트가 없다** (create / update / publish 만 존재). 선행 WO 가 DB 직접 write 를 금지해 SQL 삭제를 하지 않았다.
- 즉 이 잔류물은 **엔드포인트 부재라는 기능 결손의 증상**이며, Agent A 의 실제 작업 항목은 "행 지우기" 가 아니라 **삭제(또는 archive) 경로 신설**이다.

### 3-5. 운영자 legal 설정 화면 (5/5 공통화 완료)

5서비스 전부 `@o4o/operator-core-ui` 의 동일한 `ServiceLegalSettingsPage` 를 소비하며, `enabledTabs` 를 넘기는 서비스는 **0개**(3탭 동일).

| 서비스 | 경로 |
|---|---|
| KPA-Society | `/admin/settings/legal` |
| K-Cosmetics | `/admin/settings/legal-terms` |
| GlycoPharm | `/admin/settings/legal-terms` |
| Neture | `/admin/settings/legal-terms` |
| PharmacyHub | `/operator/settings/legal-terms` |

### 3-6. 공개 route / footer 노출

| 서비스 | 이용약관 | 개인정보처리방침 | footer 링크 |
|---|---|---|---|
| KPA-Society | `/policy` | `/privacy` | 노출 |
| K-Cosmetics | `/terms` | `/privacy` | 노출 |
| PharmacyHub | `/terms` | `/privacy` | 노출 (`fa3c533c7` 신규) |
| Neture | `/terms` | `/privacy` | `NetureLayout`·`MainLayout` 배선됨 (desktop footer 스캔에서는 미검출 — §5 R3) |
| GlycoPharm | `/terms` | `/privacy` | desktop footer 스캔에서 미검출 — §5 R3 |

**dead link 0건** — 코드상의 모든 legal 링크에 대응 route 가 존재한다.

---

## 4. Agent A 대상 서비스

```text
KPA-Society
K-Cosmetics
Neture
PharmacyHub
GlycoPharm
```

---

## 5. Agent A 가 이어서 할 일

WO 원문이 지시한 항목을 **현재 실측 결과에 맞춰 재조정**한 것이다. 이미 끝난 census 는 재수행 대신 §3 을 재확인(spot check)하는 수준으로 충분하다.

| # | 항목 | 상태 | 해야 할 일 |
|---|---|:---:|---|
| A1 | 5서비스 legal/policy 전체 census | **완료** | §3 표를 production 에서 spot check 만. 불일치가 나오면 그때 전수 재조사 |
| A2 | 이용약관·개인정보처리방침 존재/게시 상태 | **완료 (게시 0건)** | 재조사 불필요. §5-R1 로 이어짐 |
| A3 | legal profile | **완료 (전 서비스 미설정)** | 재조사 불필요. §5-R1 로 이어짐 |
| A4 | footer / public route 실제 노출 | **완료** | Neture·GlycoPharm footer 약관 링크 노출 여부만 재확인 (§5-R3) |
| A5 | production DB canonical 상태 | **완료** | `service_policy_documents` · `service_legal_profiles` 가 canonical 임을 §3 이 확인. 추가 조사 불필요 |
| A6 | **테스트 문서 잔류 정리** | **미완** | **§5-R2** — 삭제/archive 엔드포인트 신설 후 `f347af0e-…` 제거 |
| A7 | 게시 문서가 있는 경우 production 본문 렌더 확인 | **실증 완료** | PharmacyHub 실데이터 사이클(초안→게시→public 200→브라우저 렌더→수정→취소→404 복귀)로 이미 검증됨. 실제 법적 문서 게시 후 1회 재확인만 |

### 잔여 작업 3건

**R1 — 실제 법적 문서·법정정보 미설정 (운영/법무 과제)**

- 5서비스 전부 약관·개인정보처리방침 게시 0건, 법정정보 전 필드 미설정.
- **법적 문서 내용은 임의 작성하지 않는다.** 이는 선행 WO 와 본 handoff 공통 제약이다.
- Agent A 의 역할은 문구 작성이 아니라 **승인된 문구를 받아 정규 admin API 로 등록·게시하고 production 렌더를 확인**하는 것까지다.
- 게시 경로가 동작함은 이미 실증되었으므로 **추가 코드 변경 없이** 게시 즉시 노출된다.

**R2 — 정책 문서 삭제/archive 엔드포인트 부재 (개발 과제, 유일한 실제 코드 작업)**

- `apps/api-server/src/modules/service-legal/admin-service-legal.controller.ts` 에 DELETE / archive 없음.
- 결과: `[E2E_TEST]` draft 1건이 운영자 화면에 남아 있고, 앞으로도 잘못 만든 초안을 정리할 수단이 없다.
- 처리 방향: 소프트 삭제(archive) 우선 검토. **published 문서의 삭제 허용 여부는 법적 보존 관점에서 별도 판단** 필요.
- 엔드포인트 신설 후 `f347af0e-bdf1-420e-9017-1f772da2a8d9` 를 정규 API 로 제거한다. **DB 직접 write 금지.**

**R3 — Neture · GlycoPharm footer 약관 링크 노출 확인 (경미)**

- 두 서비스는 코드상 배선이 되어 있으나 desktop footer 텍스트 스캔에서 `약관|개인정보` 앵커가 검출되지 않았다 (Neture mobile 하단에는 표기 존재).
- dead link 가 아니라 **노출 여부** 문제다. 실제 미노출이면 다른 3서비스와 동일하게 맞춘다.

### 하지 말 것

- 법적 문서 **내용 임의 작성·수정** (약관·개인정보처리방침 문구 생성 금지)
- `[E2E_TEST]` 행을 **SQL 직접 삭제**로 처리 (R2 로 해결한다)
- 이미 마감된 census 를 처음부터 재수행
- `SUPPORTED_LEGAL_SERVICE_KEYS` · 권한 scope · membership 구조 변경
- `policies/*` 404 를 결함으로 집계해 계약을 바꾸는 것

---

## 6. 후속 WO 후보

원 후보명 `WO-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1` 은 **이미 사용·마감**되었으므로 재사용하지 않는다. 잔여 범위에 맞춘 후보:

```text
WO-O4O-SERVICE-LEGAL-DOCUMENT-LIFECYCLE-AND-RESIDUAL-CLEANUP-V1
  → R2 (삭제/archive 엔드포인트 신설 + [E2E_TEST] 잔류 제거) + R3 (footer 노출 정렬)
  → 개발 WO. 법적 문구 작성 없음.

WO-O4O-SERVICE-LEGAL-CONTENT-PUBLICATION-V1  (법무 승인 선행 필요)
  → R1 (승인된 약관·개인정보·법정정보를 정규 API 로 등록·게시 후 production 렌더 확인)
  → 승인된 문구가 확보되기 전에는 착수하지 않는다.
```

---

## 7. 참고 문서

| 문서 | 내용 |
|---|---|
| [`CHECK-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1.md`](../checks/CHECK-O4O-CROSSSERVICE-LEGAL-POLICY-PRODUCTION-COMPLETION-V1.md) | 5서비스 legal/policy 전수 census · 구현 · E2E (병행 세션) |
| [`CHECK-O4O-CROSSSERVICE-PRODUCTION-RESIDUAL-404-AUTH-AND-LEGAL-CLEANUP-V1.md`](../checks/CHECK-O4O-CROSSSERVICE-PRODUCTION-RESIDUAL-404-AUTH-AND-LEGAL-CLEANUP-V1.md) | 잔여 404·인증·legal 정리 + Neture `/operator` 복귀 수정 |
| [`CHECK-O4O-OPERATOR-REAL-LOGIN-CREDENTIAL-RECOVERY-AND-FINAL-PRODUCTION-E2E-V1.md`](../checks/CHECK-O4O-OPERATOR-REAL-LOGIN-CREDENTIAL-RECOVERY-AND-FINAL-PRODUCTION-E2E-V1.md) | 운영자 실제 로그인 · production E2E |
| `apps/api-server/src/modules/service-legal/` | `public-service-legal.controller.ts` · `admin-service-legal.controller.ts` · `service-legal-scope.ts` |
| `docs/local/TEST-ACCOUNTS.local.md` | 검증 계정 SSOT (gitignored, commit 금지) |
