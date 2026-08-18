# CHECK-O4O-PHARMACY-HUB-LEGAL-SERVICE-SCOPE-AND-FOOTER-404-FIX-V1

- **WO**: `WO-O4O-PHARMACY-HUB-LEGAL-SERVICE-SCOPE-AND-FOOTER-404-FIX-V1`
- **성격**: R1 운영 결함 수정
- **작성일**: 2026-08-18
- **기준 브랜치**: `main`

---

## 1. 404 실제 원인 (§1 · §5)

### 요청 흐름 (실측)

```text
services/web-pharmacy-hub/src/components/Footer.tsx
  → <PublicLegalFooterInfo serviceKey={SERVICE_KEY} loadProfile={loadFooterLegal} />
  → services/web-pharmacy-hub/src/lib/footerLegal.ts  (createFooterLegalLoader)
  → packages/shared-space-ui/src/legal/footerLegalLoader.ts
  → GET {api base}/public/services/pharmacy-hub/footer-legal
  → apps/api-server .../service-legal/public-service-legal.controller.ts  guardServiceKey()
  → isSupportedLegalServiceKey('pharmacy-hub') === false
  → 404 { code: 'UNKNOWN_SERVICE' }
```

- **실제 serviceKey**: `pharmacy-hub` (`services/web-pharmacy-hub/src/config/service.ts` SSOT). 잘못된 값이 아니다.
- **404 발생 지점**: `public-service-legal.controller.ts` 의 `guardServiceKey()` — 라우터 매칭은 성공하고 **guard 가 404 를 만든다.**
- **원인 상수**: `SUPPORTED_LEGAL_SERVICE_KEYS` 에 `pharmacy-hub` 부재 (4서비스만 등재).

### A/B/C 판정 → **A (scope 에서 차단되어 404)**

| 구분 | 판정 |
|---|---|
| A. scope 차단 404 | ✅ **확정** |
| B. scope 통과하나 문서 부재 | 해당 없음 — 문서 부재는 **404 가 아니라** `200 { data: null }` 계약이다 (컨트롤러 주석 "미설정/비활성 → placeholder 없이 null"). |
| C. 잘못된 serviceKey/prefix | 해당 없음 — `pharmacy-hub` 는 `SERVICE_KEYS.PHARMACY_HUB` · `service-catalog.ts` 와 일치하는 canonical key. |

**법적 문구는 이번 WO 에서 작성하지 않았다.** 프로필 미설정 시 푸터 법정정보 영역이 비표시되는 기존 계약을 그대로 따른다.

---

## 2. 기존 scope config 비교 (§2)

| serviceKey | config | rolePrefix | platformBypass | 비고 |
|---|---|---|---|---|
| `neture` | `NETURE_SCOPE_CONFIG` | `neture` | true | security-core |
| `glycopharm` | `GLYCOPHARM_SCOPE_CONFIG` | `glycopharm` | true | security-core |
| `kpa-society` | `KPA_SCOPE_CONFIG` | `kpa` | **false** (조직 격리) | security-core · key ≠ prefix |
| `k-cosmetics` | `COSMETICS_SCOPE_CONFIG` | `cosmetics` | true | security-core · key ≠ prefix |
| `pharmacy-hub` | `PHARMACY_HUB_SCOPE_CONFIG` | `pharmacy-hub` | true | **api-server 로컬** · key = prefix (self-map) |

`requireServiceLegalScope` 는 `config.serviceKey` 를 role prefix 로 쓰므로, PharmacyHub 는 `pharmacy-hub:admin`(write) · `pharmacy-hub:operator`(read) 가 된다. 다른 서비스 config 를 복사하지 않았다.

---

## 3. PHARMACY_HUB_SCOPE_CONFIG 필요성/내용 (§3)

**신설하지 않았다 — 이미 존재한다.**

- 위치: `apps/api-server/src/middleware/pharmacy-hub-scope.middleware.ts:44`
- security-core 가 아닌 api-server 로컬에 있는 이유는 해당 파일 주석에 명시돼 있다: **security-core 는 F1(Operator OS) Freeze 대상**이므로 소비처가 api-server 뿐인 config 는 로컬 정의로 둔다.
- 이번 WO 의 소비처도 api-server 내부(`service-legal`)뿐이므로 **security-core 승격 사유가 발생하지 않았다.** F1 Freeze 를 건드리지 않았다.
- config 내용(allowedRoles / scopeRoleMapping / platformBypass)은 **한 글자도 바꾸지 않았다.** PharmacyHub 권한 모델 불변.

---

## 4. SUPPORTED_LEGAL_SERVICE_KEYS 변경 (§4)

`apps/api-server/src/modules/service-legal/service-legal-scope.ts`

```
SUPPORTED_LEGAL_SERVICE_KEYS: 4개 → 5개  ('pharmacy-hub' 추가)
CONFIG_BY_SERVICE_KEY:        'pharmacy-hub' → PHARMACY_HUB_SCOPE_CONFIG 매핑 추가
```

`CONFIG_BY_SERVICE_KEY` 는 `Record<LegalServiceKey, …>` 이므로 두 변경은 **타입상 분리 불가**하다(하나만 넣으면 컴파일 에러).

### 중복 serviceKey 배열 확인 결과

- `SUPPORTED_LEGAL_SERVICE_KEYS` 는 저장소 전체에서 **이 파일 1곳에만 존재**한다(선언 1 + 파생 2). 중복 배열 없음.
- 프론트 4서비스의 `ServiceLegalSettingsPage.tsx` 는 각자 자기 serviceKey 를 고정 전달한다 — 목록 상수를 공유하지 않으므로 수정 대상 아님.

### 함께 넓어지는 범위 (명시 기록)

`requireServiceLegalScope` 는 `contact-inquiry` 모듈도 소비한다.

- `admin-contact-inquiry.controller.ts:90` (`operator`)
- `admin-service-contact-settings.controller.ts:147` (`admin`)

따라서 이번 변경으로 **PharmacyHub 자기 자신의** 문의/연락처 admin 엔드포인트도 `pharmacy-hub:admin`/`operator` 에게 열린다. 이는 서비스별 격리를 유지한 자기 범위 확장이며, **기존 4서비스의 권한은 변하지 않는다**(각 guard 는 여전히 자기 config 로만 판정). 별도 서비스 접근 확대는 없다.

---

## 5. legal document 존재 여부 — production read-only census (§5)

```sql
SELECT service_key, is_active, (company_name IS NOT NULL) FROM service_legal_profiles;
SELECT service_key, document_type, status, count(*) FROM service_policy_documents GROUP BY 1,2,3;
```

| 테이블 | 결과 |
|---|---|
| `service_legal_profiles` | **1행** — `neture` / `is_active=false` / `company_name` 없음 |
| `service_policy_documents` | **0행** |

→ **현재 어떤 서비스도 활성 법정정보가 없다.** 4서비스 푸터도 이미 `200 { data: null }` 로 법정정보 영역을 비표시 중이며, PharmacyHub 만 **404** 로 갈렸다. 이번 수정으로 PharmacyHub 도 동일하게 `200 { data: null }` 이 된다.

**가짜 문서/placeholder 를 만들지 않았다. legal 문구도 작성하지 않았다.** 실제 법정정보 입력은 admin UI 를 통한 별도 운영 작업이다(§11 후속 참조).

---

## 6. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/service-legal/service-legal-scope.ts` | `pharmacy-hub` 등재 + `PHARMACY_HUB_SCOPE_CONFIG` 매핑 (import 1줄 추가) |
| `apps/api-server/src/modules/service-legal/__tests__/service-legal-scope.spec.ts` | **신설** — 5 케이스 |

**프론트엔드 변경 0건** (푸터/로더는 이미 올바른 serviceKey 를 보내고 있었다).
**DB / migration 변경 0건.**

---

## 7. 회귀 테스트 (§6 · §7)

| 항목 | 결과 |
|---|---|
| `security-core` typecheck (`tsc --noEmit`) | ✅ PASS |
| `api-server` typecheck (`tsc --noEmit`) | ✅ PASS |
| `web-pharmacy-hub` build typecheck (`tsc -b`) | ✅ PASS |
| targeted (service-legal + security scope/cross-service/isolation) | ✅ 5 suites / **98 tests** PASS |
| **api-server 전체 Jest** | ✅ **125 suites / 1,946 tests** PASS |

신규 테스트가 고정한 계약:

```text
pharmacy-hub          accepted
neture/glycopharm/kpa-society/k-cosmetics  accepted (회귀 방지)
unknown / '' / pharmacy / pharmacyhub / kpa-groupbuy   rejected
role-prefix 축(kpa, cosmetics)             rejected  (계약을 넓히지 않았음)
집합 크기 = 정확히 5                        (의도치 않은 확장 감지)
```

미변경 확인: auth · membership · role · operator scope · store-owner scope · 서비스별 접근 권한 — 파일 수정 0건.

---

## 8. 배포 결과

- commit: `c6ff9c023` → `main` push (2026-08-18 00:01 UTC)
- 배포: `Deploy API Server (Cloud Run)` → **서빙 revision `o4o-core-api-03333-z68`** (생성 00:08:04Z)
- 반영 확인 시각: 2026-08-18 09:08 KST

### 엔드포인트 실측 (`https://api.neture.co.kr/api/v1/public/services/{key}/footer-legal`)

| serviceKey | 배포 전 | 배포 후 |
|---|:---:|:---:|
| `pharmacy-hub` | **404** | **200** `{"success":true,"data":null}` |
| `kpa-society` | 200 | 200 |
| `neture` | 200 | 200 |
| `glycopharm` | 200 | 200 |
| `k-cosmetics` | 200 | 200 |
| `unknown-svc` (음성 대조) | 404 | **404** `UNKNOWN_SERVICE` (계약 유지) |

배포 전 404 재현 → 배포 후 해소를 같은 명령으로 확인했다. 기존 4서비스 응답은 배포 전후 동일하다.

---

## 9. desktop / mobile 브라우저 확인 · console/network 404

실 브라우저(Playwright, 프로덕션 `https://pharmacyhub.co.kr`) · 계정 `pharmacy-hub:store_owner`.

| 뷰포트 | 경로 | footer-legal | 네트워크 404 | console error |
|---|---|:---:|:---:|:---:|
| desktop 1440×900 | `/login` (비로그인) | **200** | 0 | 0 *(auth/me·refresh 401 은 비로그인 부트스트랩 — 본 WO 무관)* |
| desktop 1440×900 | `/` (로그인 후) | **200** | **0** | **0** |
| desktop 1440×900 | `/store-owner` | 호출 없음(앱 셸에 공개 푸터 없음) | **0** | **0** |
| mobile 390×844 | `/join/status` (로그인 후) | **200** | **0** | **0** |

- 로그인 → `/store-owner` 진입 정상(매장 경영 홈 렌더, dashboard API 200).
- 푸터 법정정보 영역은 `data:null` 이므로 **비표시** — 이는 4서비스와 동일한 기존 계약이며 결함이 아니다(§5).

**완료 기준 대비: footer legal 404 = 0 / desktop PASS / mobile PASS / console error = 0 — 모두 충족.**

---

## 10. DB / migration 변경 여부

**0건.** 스키마·데이터 write 를 수행하지 않았다. production 접근은 read-only SELECT 2건뿐이다(§5).

---

## 11. 후속 제안 (이번 WO 범위 밖)

1. PharmacyHub 에 `pages/admin/ServiceLegalSettingsPage.tsx` 부재 — 다른 4서비스는 보유. 법정정보를 실제로 입력하려면 화면이 필요하다(현재는 API 만 열림). 별도 WO.
2. 전 서비스 법정정보 미설정(활성 0건) — 운영 데이터 입력 과제. 법무 검토가 필요하므로 개발 WO 로 처리하지 않는다.

---

## 12. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
```
