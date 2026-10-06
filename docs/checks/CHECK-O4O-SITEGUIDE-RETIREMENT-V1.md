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
| 플랫폼 문의 유형 `'siteguide'` | API `PlatformInquiry` 타입 · 제목 라벨, web-neture `VaultInquiriesPage` 필터 · 라벨. 운영 `platform_inquiries` 에 `type='siteguide'` **2행** | **유지 — 결정 필요** (§4) |

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
| CNAME `_acme-challenge.www` | 제거 확인 — Google · Cloudflare 모두 `SERVFAIL`, 답변 0 |
| CNAME `_acme-challenge` | 권한 응답 없음(`REFUSED`) · Cloudflare 답변 0. Google DoH 는 6회 반복 중 2회만 **캐시 잔존** 답변(TTL 253 → 244초 감소 중, 나머지 4회 `SERVFAIL`) — 원본이 없는 캐시라 TTL 만료로 사라진다. 첫 조회(2026-10-06 이른 시점)에 www 쪽도 같은 캐시 잔존이 있었고 재확인 때는 사라졌다 |

판정:

- **확정(관측)**: apex · www 에서 O4O LB IP 가 더 이상 응답하지 않는다. 인증용 CNAME 2개는 권한 네임서버에서 응답하지 않으며, 남은 것은 Google 일부 노드의 만료 대기 캐시뿐이다. → siteguide 의 O4O 연결 해제와 DNS 퇴역 단계 **완료**.
- **추정**: 레코드만 지웠다면 권한 서버가 `NXDOMAIN`/빈 응답을 줘야 하는데 `REFUSED` 를 주므로, gabia 에서 `siteguide.co.kr` **DNS zone 전체가 삭제**되었을 가능성이 크다. 사용자 작업 화면으로 확인한 것은 아니다.
- **미확인**: 도메인 등록 상태(등록 유지 · 네임서버 위임 설정). 이번 범위 밖이며 조회하지 않았다. 도메인을 다시 쓸 때는 gabia 에서 DNS zone 을 다시 만들어야 할 수 있다.

별도 운영 배포 없음 (문서 기록만).

## 4. 남은 항목 · 결정 필요

- **플랫폼 문의 유형 `'siteguide'`** — 운영 데이터 2행이 이 값을 쓴다. 코드에서만 지우면 Neture 관리자 문의 화면에서 그 2행의 유형 라벨이 비고 필터로 찾을 수 없다.
  제거하려면 먼저 2행 처리(삭제 또는 `other` 재분류 — DB write, 별도 승인)가 필요하고, 그 뒤 API 타입 · 라벨 · `VaultInquiriesPage` 의 값을 함께 지운다. 문의 접수 API 는 유형 화이트리스트가 없어 지금도 런타임 영향은 없다.
- ~~gabia DNS 레코드 4개 삭제 (§3-1) — 사용자 작업~~ → **완료** (2026-10-06, §3-1-a)
- 도메인 등록 해지 · 자동갱신 — 이번 범위 밖
- 기록물(checks · investigations · archive · work-orders) 의 siteguide 서술 — 과거 기록이라 그대로 둔다
- 발견(범위 밖): `infra/artifact-registry/README.md` 의 `cloud-run-source-deploy` repository 도 현재 존재하지 않고, 표의 보존 정책(keep 50 · 30일)은 실제 적용값(keep 10 · tagged 30일 · untagged 7일)과 다르다 — 별도 정비
