# CHECK-O4O-SITEGUIDE-RETIREMENT-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-05 · **최종 갱신**: 2026-10-06
> **근거 WO**: WO-O4O-SITEGUIDE-RETIREMENT-V1 · 선행 WO-O4O-SITEGUIDE-LEGACY-CODE-REMOVAL-V1 (소스 `07496aa5f` · 스키마 drop migration)

**사용자 결정 (2026-10-05)**: siteguide 서비스는 진행하지 않는다. 전용 코드와 O4O 인프라 연결을 퇴역한다.
도메인 등록 해지 · 자동갱신 중단은 이번 범위가 아니다(도메인 보유 ≠ O4O 연결).

---

## 1. 조사 결과

| 축 | 상태 (정리 전) | 처리 |
|---|---|---|
| 앱 소스 · workspace · lockfile · 배포 workflow | 없음 — `07496aa5f` 에서 이미 제거 | 해당 없음 |
| DB 스키마 `siteguide` | 없음 — `DropSiteGuideSchema20261113000000` 운영 적용 · 스키마 0 (read-only 확인) | 해당 없음 |
| historical migration 2개 · manifest | `CreateSiteGuideTables` · `DropSiteGuideSchema` | **유지** — CI migration contract 가 파일 · 클래스 identity 를 동결 |
| LB host rule · backend · NEG · Cloud Run | 없음 | 해당 없음 |
| Certificate Manager | entry 2 (`siteguide-entry` · `www-siteguide-entry`) · 인증서 `cm-cert-siteguide`(11-20 만료) · DNS 인증 2 — **siteguide 전용**(다른 entry · 인증서 참조 0) | **삭제** |
| 이미지 | `gcr.io/siteguide-web` 6 version (마지막 2026-01-26) · 소비처 0 | **삭제** |
| Artifact Registry repo `siteguide` | 존재하지 않음 (README 표기만) | README 정정 |
| Cloud DNS · Secret · SA · bucket | 없음 | 해당 없음 |
| 외부 DNS (gabia) | A `siteguide.co.kr` · A `www.siteguide.co.kr` → O4O LB IP, CNAME `_acme-challenge` · `_acme-challenge.www` | **사용자 작업** (§3) |
| 동작 (정리 전) | `https://(www.)siteguide.co.kr/` → 200 **O4O 기본 화면**(neture-web, cert entry 는 있고 host rule 이 없어 LB default) | 정리 대상 |
| 플랫폼 문의 유형 `'siteguide'` | API `PlatformInquiry` 타입 · 제목 라벨, web-neture `VaultInquiriesPage` 필터 · 라벨. 운영 `platform_inquiries` 에 `type='siteguide'` **2행** | **2행 삭제 · 코드 정리** (§5, 2026-10-06 사용자 결정) |

## 2. 삭제 (2026-10-05 · production · 정의 백업 후)

삭제 직전 참조 재확인: `cm-cert-siteguide` 를 쓰는 entry = siteguide 2개뿐, siteguide DNS 인증을 쓰는 인증서 = `cm-cert-siteguide` 뿐, `siteguide-web` 이미지를 쓰는 Cloud Run · Job · revision 0.

| 순서 | 삭제 |
|---|---|
| 1 | cert map `o4o-main-cert-map` entry `siteguide-entry` · `www-siteguide-entry` (entry 22 → 20) |
| 2 | 인증서 `cm-cert-siteguide` |
| 3 | DNS 인증 `dns-authz-siteguide-co-kr` · `dns-authz-www-siteguide-co-kr` |
| 4 | `gcr.io` package `siteguide-web` |

사후: GCP 의 siteguide 이름 자원 0 (cert map entry · 인증서 · DNS 인증 · 이미지).

### 2-1. 저장소 (PR)

| 파일 | 변경 |
|---|---|
| `infra/artifact-registry/README.md` | 존재하지 않는 `siteguide` repository 행 제거 · "4개 repository" → "위 표의 repository" |
| `packages/ai-core/README.md` | "별도 저장소 신규 개발 후보로 보류" → 서비스 폐기 확정 |
| `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V1.md` | **변경 안 함** — SUPERSEDED 문서(대체: V3)라 본문의 siteguide 주석은 과거 기록으로 둔다. V3 에는 siteguide 서술 없음 |

## 3. 검증

| 항목 | 결과 |
|---|---|
| `https://siteguide.co.kr/` · `https://www.siteguide.co.kr/` | 정리 전 200 (O4O 기본 화면) → LB 전파 후 **TLS handshake 실패** (cert map 에 PRIMARY entry 가 없어 미등록 host 는 TLS 단계에서 끊긴다) — O4O 화면 노출 종료 |
| `http://(www.)siteguide.co.kr/` | 301 → `https://…` (LB 공통 HTTP→HTTPS redirect) → TLS 실패. gabia A 레코드 삭제 시 함께 사라진다 |
| 유지 host 22 URL | neture · www · `/hospital/` · admin · api 3 `/api/health` · kpa-society · www · `/kpa/` · k-cosmetics · www · pharmacyhub · www · store · study · retail · pharmacy · kpa. · community · funding · supplier — 전부 200 · 인증서 검증 0 |
| www `/hospital` | 301 `Location: https://neture.co.kr:443/hospital/x?a=1` 유지 |

### 3-1. 사용자 DNS 작업 (gabia · `siteguide.co.kr` 영역)

O4O 쪽 연결은 끊겼지만 DNS 가 아직 O4O LB 를 가리킨다. 아래 4개 레코드를 삭제한다(도메인 등록은 유지 가능).

| 호스트 | 타입 | 현재 값 |
|---|---|---|
| `@` (siteguide.co.kr) | A | O4O LB IP |
| `www` | A | O4O LB IP |
| `_acme-challenge` | CNAME | `947f879b-…13.authorize.certificatemanager.goog.` |
| `_acme-challenge.www` | CNAME | `0c6ee6d5-…2.authorize.certificatemanager.goog.` |

삭제 후 확인: `nslookup siteguide.co.kr` · `nslookup www.siteguide.co.kr` 에 O4O LB IP 가 나오지 않는다. 도메인을 다른 곳에 연결할 때는 위 값을 재사용하지 않는다.

#### 3-1-a. 삭제 후 확인 (2026-10-06 · 사용자 gabia 작업 후)

조회: 공개 resolver(Google `8.8.8.8` · DoH, Cloudflare `1.1.1.1` · DoH) + gabia 권한 네임서버 4대 직접 질의. 마지막 조회 2026-10-06 09:15 KST 무렵.

| 항목 | 결과 (관측) |
|---|---|
| A `siteguide.co.kr` · `www.siteguide.co.kr` | O4O LB IP **응답 없음** — Google · Cloudflare 모두 `SERVFAIL`(Status 2), 답변 레코드 0 |
| gabia 네임서버 4대 직접 질의 (A · NS · CNAME) | 4대 모두 **`REFUSED`** (Google DoH 사유: lame delegation · EDE 22/23) |
| CNAME `_acme-challenge.www` | **현재 해석되지 않음** — Google · Cloudflare 모두 `SERVFAIL`, 답변 0 |
| CNAME `_acme-challenge` | 권한 응답 없음(`REFUSED`) · Cloudflare 답변 0. Google DoH 는 6회 반복 중 2회 기존 값 답변(TTL 253 → 244초, 나머지 4회 `SERVFAIL`) — 캐시 응답으로 보이나 확인하지 않았다. 첫 조회(2026-10-06 이른 시점)에는 www 쪽도 Google 이 기존 값을 답했고(TTL 385초), 재확인 때는 답변 0 |

판정:

- **완료 (관측 범위 한정)**: **O4O 연결 해제 및 현재 DNS 접근 차단 확인 완료.** apex · www 는 현재 O4O LB IP 로 해석되지 않고, 권한 네임서버 4대는 질의를 거부하며, `_acme-challenge.www` 는 현재 해석되지 않는다. `_acme-challenge` 는 Google 일부 응답에만 기존 값이 보인다(위 표의 관측값).
- **미확인**: gabia 의 **DNS 레코드 4개 실제 삭제** — `SERVFAIL` · `REFUSED` 는 현재 해석 불가만 보여 줄 뿐 삭제를 증명하지 않는다. gabia 설정 화면이나 정상 권한 응답의 `NXDOMAIN` / `NODATA` 로 확인되지 않았다. zone 장애 · 위임 문제가 복구되면 기존 A · CNAME 이 다시 노출될 가능성을 이 조회로는 배제할 수 없다.
- **추정**: 권한 서버가 빈 응답이 아닌 `REFUSED` 를 주므로 gabia 에서 `siteguide.co.kr` **DNS zone 전체가 삭제**되었을 가능성이 있다. 확인하지 않았다.
- **미확인**: 도메인 등록 상태(등록 유지 · 네임서버 위임 설정). 이번 범위 밖이며 조회하지 않았다.

별도 운영 배포 없음 (문서 기록만).

## 4. 남은 항목 · 결정 필요

- ~~플랫폼 문의 유형 `'siteguide'`~~ — **해소** (§5): 사용자 결정(2026-10-06)으로 `other` 재분류 대신 2행 삭제 후 코드 정리.
- gabia DNS (§3-1) — 사용자 작업 후 **현재 DNS 접근 차단 확인 완료** (2026-10-06, §3-1-a). 레코드 4개 실제 삭제 · zone 삭제는 **미확인**(gabia 설정 화면 확인 시 종결)
- 도메인 등록 해지 · 자동갱신 — 이번 범위 밖
- 기록물(checks · investigations · archive · work-orders) 의 siteguide 서술 — 과거 기록이라 그대로 둔다
- 발견(범위 밖): `infra/artifact-registry/README.md` 의 `cloud-run-source-deploy` repository 도 현재 존재하지 않고, 표의 보존 정책(keep 50 · 30일)은 실제 적용값(keep 10 · tagged 30일 · untagged 7일)과 다르다 — 별도 정비

## 5. 플랫폼 문의 유형 `'siteguide'` 정리 (2026-10-06)

**사용자 결정**: 기존 문의는 테스트 데이터이고 siteguide 는 폐기했으므로 `other` 로 옮겨 보존하지 않고 **삭제**한다. 다른 유형의 문의는 유지한다.

### 5-1. 운영 DB 삭제 (production · 사용자 승인)

| 확인 | 결과 |
|---|---|
| 대상 재확인 (read-only) | `platform_inquiries` 전체 3행 = `siteguide` 2 · `platform` 1. 대상 2행 모두 2026-01-26 생성 · 상태 `new` (개인정보 컬럼은 조회 · 기록하지 않음) |
| 종속 데이터 | `platform_inquiries` 를 참조하는 FK 0 · 트리거 0. 공개 스키마의 uuid 컬럼 전체와 알림 · 감사 · 로그 · 이벤트 계열 텍스트/JSON 컬럼 1,007개에서 두 id 검색 → **0건**(시간 초과 0) — 함께 지울 종속 데이터 없음 |
| 삭제 | 단일 트랜잭션 · 가드: 사전 대상 수 = 2 · id 일치 · 삭제 행 수 = 2 · 다른 유형 행 수 불변 — 하나라도 어긋나면 전체 롤백 |
| 결과 | `pre_total=3 · pre_target=2 · pre_other=1 · deleted=2 · post_total=1` → 남은 데이터 `platform=1` |

삭제한 행은 백업하지 않았다(테스트 데이터 · 개인정보 컬럼 포함 — 사용자 결정으로 보존 불필요).

### 5-2. 코드 정리

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/entities/PlatformInquiry.ts` | `InquiryType` 에서 `'siteguide'` 제거 · 용도/`source` 주석의 siteguide 예시 제거. 컬럼은 `varchar` 그대로 — **스키마 · migration 변경 없음** |
| `apps/api-server/src/controllers/platformInquiryController.ts` | 알림 메일 제목 접두어 `INQUIRY_TYPE_LABELS.siteguide` 제거 · 공개 접수에서 은퇴 유형 `siteguide` 만 `400 RETIRED_INQUIRY_TYPE` 으로 거부(삭제한 행의 재생성 방지 — Codex 리뷰 P2 반영). 저장소 내 공개 접수 호출처 0 · 최근 30일 운영 POST 0 |
| `apps/api-server/src/__tests__/platform-inquiry-retired-type.spec.ts` (신규) | `siteguide` → 400 · 저장 0, `platform` · `partnership` · `other` · 생략(기본 `platform`) → 201 — 5/5 PASS |
| `services/web-neture/src/pages/admin-vault/VaultInquiriesPage.tsx` | 유형 타입 · `TYPE_LABELS` · 유형 필터 `<option>` · 화면 설명 · 헤더 주석에서 siteguide 제거 |

유지: 문의 접수(`POST /api/v1/platform/inquiries`) · 관리자 목록/상세/상태 변경 동작 — `siteguide` 외 유형 값의 처리는 바꾸지 않았다(전체 허용 목록 도입은 API 계약 변경이라 범위 밖). KPA `JoinInquiryForm`(`/api/v1/join/inquiry`) · 서비스 문의(`contact_inquiries`)는 다른 축이라 무관.
historical migration(`CreateSiteGuideTables` · `DropSiteGuideSchema`) · 기록 문서는 유지.

이로써 **서비스 유형 · UI 참조 제거 완료, 재접수 차단용 참조만 유지**한다 — 런타임에 남은 `'siteguide'` 는 `platformInquiryController.ts` 의 `RETIRED_INQUIRY_TYPES`(접수 거부) 1곳과 그 회귀 spec 뿐이다. 그 밖의 남은 언급: `PlatformInquiry.ts` 의 은퇴 주석 · `packages/ai-core/README.md` 의 폐기 확정 문구 · historical migration · 기록 문서.

### 5-3. main 통합 · 배포 (2026-10-06)

| 항목 | 결과 |
|---|---|
| PR | #333 — 최신 main(`b2870aaff`) merge 후 HEAD `3f46f9c49` · CI 전부 PASS(CI Gate · API Jest 3/3 · Code Quality · CodeQL · SonarCloud · Web build · Guard) · Codex 재리뷰 👍(제안 없음, 요청 이후) · 미해결 스레드 0 · 충돌 없음 |
| merge | 사용자 "main 통합 진행" 승인 → merge commit `195ea6fee` · main CI success |
| Delivery (run 37459577021) | **NO EXECUTION · commit status `HELD_LEVEL_3`** — api `AUTO_DEPLOY_BLOCKED`(`BLOCKED_BY_PENDING_LEVEL3 since 46a1f8f6a` — 다른 트랙 #323 SERVICE-NOT-MEMBER 인증 복원의 auth-backend LEVEL_3) · neture `HELD_API_NOT_DEPLOYED`(#308 과 같은 commit 축의 API 의존). 이번 변경 자체의 판정은 LEVEL_2(api · neture) |
| promote | **하지 않음** — promote 는 다른 트랙의 LEVEL_3 변경을 함께 배포한다(사용자 지시: 다른 트랙 HOLD 포함 시 임의 promote 금지) |
| 운영 serving (확인 시점) | `o4o-core-api-03834-fuh` = `e0be29869` · `neture-web-01689-lev` = `4263d5fae` — 둘 다 #333 미포함. API `/api/health` 200 |

### 5-4. 배포 후 검증 — **대기**

다른 트랙의 통제 배포(#323 · #308 축)로 api · neture-web 이 `195ea6fee` 이후 SHA 로 올라간 뒤 수행한다. 운영에 테스트 문의를 저장하지 않는다.

| 검증 | 방법 |
|---|---|
| serving 에 #333 포함 | 두 서비스 revision label `o4o-commit-sha` 가 `195ea6fee` 를 조상으로 가짐 |
| API health | `GET https://api.neture.co.kr/api/health` 200 |
| siteguide 접수 400 | `POST /api/v1/platform/inquiries` `type=siteguide` → 400 `RETIRED_INQUIRY_TYPE` — 유형 검사가 저장 전 · 필수값 검사 뒤에 있으므로 필수값을 채워 보낸다. **배포 전에는 보내지 않는다**(이전 코드는 저장한다) |
| 관리자 문의 화면 | Neture admin vault 문의 화면 — 유형 필터에 SiteGuide 없음 · 기존 `platform` 1건 목록 · 상세 조회 |

배포 전 사전 확인: 운영 DB 의 `platform_inquiries` = `platform` 1행(§5-1 삭제 후) — 화면 검증의 기대값.
