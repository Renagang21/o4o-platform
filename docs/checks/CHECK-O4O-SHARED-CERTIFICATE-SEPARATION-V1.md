# CHECK-O4O-SHARED-CERTIFICATE-SEPARATION-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-04 · **최종 갱신**: 2026-10-04
> **근거 WO**: WO-O4O-SHARED-CERTIFICATE-SEPARATION-V1 · 선행 조사 IR-O4O-LEGACY-WEB-SERVICES-RETIREMENT-ASSESSMENT-V1(화면 보고) · 관련 [CHECK-O4O-URL-FIRST-CENSUS-V1](CHECK-O4O-URL-FIRST-CENSUS-V1.md)

13개 도메인을 묶은 공유 관리형 인증서 `cm-cert-neture-v2` 에서 은퇴 도메인 glucoseview 3개를 분리했다.
유지 도메인 10개는 새 인증서 `cm-cert-neture-v3` 로 전환 · 검증했고, 참조가 0 이 된 v2 는 삭제했다.

---

## 0. 판정

| 항목 | 결과 |
|---|---|
| 유지 도메인 10개 HTTPS · 새 인증서 제공 | PASS (serial `CEB8BB9B…` · 체인 검증 0 · SAN 에 glucoseview 없음) |
| 주요 진입 경로 12 · 비대상 host 11 회귀 | PASS (200 · verify 0, api 루트는 원래 404 · `/api/health` 200) |
| 전환 후 `o4o-core-api` 5xx | 0 건 (14:20Z 이후) |
| `cm-cert-neture-v2` | 삭제 (참조 0 확인 후) |
| 자동 갱신 근거 | v3 의 DNS authorization 10/10 CNAME 해석됨 · v3 가 같은 authorization 으로 발급됨 |

## 1. 왜 했나 — 갱신 실패 위험

- `cm-cert-neture-v2` 는 **DNS authorization 방식** 관리형 인증서였고 SAN 13개 중 `glucoseview.co.kr` · `www.` · `api.` 3개를 포함했다.
- glucoseview.co.kr 는 앱 은퇴(2026-08-05) 후 DNS zone 이 응답하지 않는다(공용 DNS SERVFAIL, `.kr` 레지스트리는 gabia NS 위임 유지 · gabia NS 무응답). 3개 `_acme-challenge` CNAME 이 해석되지 않았다.
- 관리형 인증서는 SAN 전체가 인가되어야 갱신된다. v2 만료 2026-12-07 15:02Z.
  갱신 시작 **약 2026-11-07 은 예상값**이다(관리형 인증서가 만료 약 30일 전부터 갱신을 시도한다는 일반 동작 기준 · 실측 아님).
  갱신이 실패했다면 만료 시 neture · admin · api · kpa-society · k-cosmetics 계열 13개 host 의 TLS 가 함께 중단될 수 있었다.
- 2026-10-04 시점 v2 자체는 ACTIVE · 갱신 실패 기록 없음(아직 갱신 시도 전).

## 2. 도메인 분류

| 구분 | 도메인 | 근거 |
|---|---|---|
| 유지 (v3) | `neture.co.kr` `www.neture.co.kr` `admin.neture.co.kr` `api.neture.co.kr` | 대표 진입 · 관리 · API |
| 유지 (v3) | `k-cosmetics.site` `www.k-cosmetics.site` `api.k-cosmetics.site` | 옛 주소 호환 host · API 별칭 — 현재 200 · 서비스 정책 변경 범위 밖 |
| 유지 (v3) | `kpa-society.co.kr` `www.kpa-society.co.kr` `api.kpa-society.co.kr` | 위와 같음 |
| 제외 | `glucoseview.co.kr` `www.glucoseview.co.kr` `api.glucoseview.co.kr` | 앱 은퇴 · DNS 해석 불가 · 트래픽 0(도메인 유입 마지막 2026-09-25) |
| 영향 없음 (별도 인증서) | `pharmacyhub.co.kr` `www.pharmacyhub.co.kr` | `cm-cert-pharmacyhub` — QR 착지 이전 전까지 유지. 이번 작업에서 변경 0 |

## 3. 실행 기록 (2026-10-04 UTC · production)

| 시각 | 단계 |
|---|---|
| 14:1x | cert map 25 항목 · v2 정의를 세션 scratchpad 에 YAML 백업 · 유지 host 제공 serial 기록(`C4AD2768…`) |
| 14:15 | `cm-cert-neture-v3` 생성 — 유지 10 도메인, 기존 DNS authorization 10 재사용 (DNS 변경 없음) |
| 14:19 | v3 ACTIVE (10/10 AUTHORIZED · 만료 2027-01-02) |
| 14:20 | canary: `www-k-cosmetics-entry` → v3 · 14:22 새 serial 제공 · HTTPS 200 확인 |
| 14:23 | 나머지 9 entry → v3 (`maps entries update --certificates`, 제자리 교체 · 공백 없음) |
| 14:25 | 10/10 host 새 serial 제공 확인 → §0 검증 |
| 14:2x | v2 참조 entry = glucoseview 3개만 확인 → 3 entry 삭제 (cert map 25 → 22) |
| 14:3x | 22 host 재확인 PASS → `cm-cert-neture-v2` 삭제 → 삭제 후 HTTPS 재확인 PASS |

원복 방법(삭제 전까지 유효했던 것): entry 를 `--certificates=cm-cert-neture-v2` 로 되돌림. v2 삭제 이후 원복 대상은 v3 다.

## 4. 이번에 하지 않은 것 (남은 작업)

| 항목 | 상태 | 처리 |
|---|---|---|
| DNS authorization `dns-authz-glucoseview-co-kr` · `www-` · `api-` | 존재 · 미참조 | 퇴역 도메인 LB 정리 WO 에서 삭제 |
| URL map `glucoseview.co.kr`(+www) host rule · `path-matcher-glucoseview` · `path-matcher-api` 안의 `api.glucoseview.co.kr` | 존재 | 같은 WO (cert entry 가 없어 HTTPS 도달 불가 · DNS 도 없음) |
| backend `backend-glucoseview-web-advanced` · NEG · 보안정책 · Cloud Run `glucoseview-web` | 존재 | 같은 WO |
| `cm-cert-siteguide` · siteguide entry 2 · authz 2 | 존재 · 자동 갱신 중(CNAME 해석됨) | 도메인 보유 결정 후 |
| `hospital.neture.co.kr` host rule | 잔재 | 같은 WO |

## 5. 비밀정보

인증서 개인키 · secret · 환경변수 값은 다루거나 기록하지 않았다. 관리형 인증서라 키는 Google 이 보관한다.
