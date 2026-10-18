# CHECK-O4O-PHARMCOOP-DOMAIN-CORRECTION-V1

- 작성: 2026-10-18 · branch `wo/pharmcoop-domain-correction` · base `993206f0a4`
- 상태: 코드 LOCAL_VERIFIED · 인프라·배포 결과는 아래 절에 이어서 기록

## 정정 내용

협동조합 서비스 도메인이 `coop.neture.co.kr` 로 잘못 안내됐다. 정확한 도메인은 `pharmcoop.neture.co.kr` 이고 테스트 조합 주소는 `https://pharmcoop.neture.co.kr/test` 다.
기존 주소에서 새 주소로의 redirect 는 두지 않는다.

도메인 변경을 이유로 바꾸지 않은 식별자: Cloud Run `cooperative-web` · 조합 slug `test` · 사업 코드 `coop-test` · 인증 세션 scope `coop` · 적용된 migration.

## 조사 결과

| 위치 | 사용처 | 조치 |
|---|---|---|
| `apps/api-server/src/bootstrap/setup-middlewares.ts` | 운영 CORS 허용 origin (정확한 origin 목록) | `https://pharmcoop.neture.co.kr` 로 교체. 옛 origin 은 활성 목록에서 제거 |
| `apps/api-server/src/utils/session-origin.ts` | Origin host → 세션 폐기 scope `coop` 판정 | host 를 `pharmcoop.neture.co.kr` 로 교체. scope 값 `coop` 유지 |
| `services/web-neture/src/components/home/ServiceDiscovery.tsx` | 대표 홈 협력사업 카드 외부 링크 | `https://pharmcoop.neture.co.kr/` |
| Neture 홈 · ServiceDiscovery 테스트, API session-origin 테스트 | 기대값 | 새 도메인으로 교체. 옛 도메인은 scope 를 얻지 못함(null)을 회귀로 추가 |
| `services/web-pharmacy-coop/README.md`, `docs/baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md` | 현행 안내 | 새 도메인으로 교체 |
| `docs/checks/CHECK-O4O-COOPERATIVE-AUTH-AND-TEST-BUSINESS-CONNECTION-V1.md`, `docs/checks/CHECK-O4O-HOME-COOPERATION-ENTRY-V1.md` | 과거 실행 기록 | 원문 보존, 잘못 안내된 도메인이며 정정됐음을 표시 |
| 협동조합 앱(`services/web-pharmacy-coop`) | API base `https://api.neture.co.kr`, 자기 host 를 쓰는 코드 없음 | 변경 없음 |
| `.github/workflows/deploy-cooperative.yml` | 도메인을 쓰지 않음(서비스 이름 `cooperative-web` · smoke 경로만) | 변경 없음 |
| GitHub repository · production environment Variables | 도메인 값 없음 | 변경 없음 |
| 운영 DB (read-only 조회) | 서비스·설정·협동조합·준프랜차이즈 계열 테이블의 문자열 컬럼에 `coop.neture` 0건. `cooperatives` · `cooperative_memberships` 0행(테스트 조합 미등록) | DB 변경 불필요 |

## 코드 검증

| 검증 | 결과 |
|---|---|
| API 관련 jest (session-origin · 협동조합 · CORS 관련) / tsc / build | 9 suites 151 통과(env-gated 1 suite skip) / 통과 / 통과 |
| Neture 전체 Vitest / tsc / build | 126개 파일 1,129개 통과 / 통과 / 통과 |
| 협동조합 앱 Vitest / build | 4개 파일 38개 통과 / 통과 |
| 변경 파일 ESLint | 0 |

## 사전 점검 (read-only, 2026-10-18)

- GCP: `cooperative-web` Cloud Run 서비스 없음(미배포). LB `o4o-global-lb` 에 coop · pharmcoop host rule 없음. Certificate Manager 에 coop 인증서 · map entry 없음. 옛 도메인으로 만들어진 GCP 리소스는 없어 정리 대상도 없다.
- DNS(가비아 위임): `pharmcoop.neture.co.kr` A 레코드가 기존 전역 LB 공인 IP(다른 서비스 host 와 동일)로 이미 등록. wildcard 아님. `coop.neture.co.kr` 은 해석되지 않는다.
- 운영자 계정(지정 운영자): 운영 DB 에 없음 — 기존 차단 미해결. 계정 생성 · 전역 역할 부여는 하지 않는다.
- 개인 조합원(지정 계정) 기준선: 활성 역할 `neture:store_owner`(비활성 `kpa:store_owner` 1), 약국 조직 owner 1, service membership `kpa-society` · `lecture` · `neture`, 협동조합 membership 0.

## GCP 도메인 연결 (2026-10-18)

모두 이번 작업 전용 리소스를 새로 만들었다. 공유 인증서 · 다른 서비스 host rule · backend 는 바꾸지 않았다.

| 리소스 | 내용 |
|---|---|
| Certificate Manager `cm-cert-pharmcoop-v1` | `pharmcoop.neture.co.kr` 전용 Google 관리 인증서(LB 인증) |
| cert map entry `cm-entry-pharmcoop` | 기존 `o4o-main-cert-map` 에 host 1개 추가 |
| serverless NEG `neg-cooperative-web` | asia-northeast3, Cloud Run `cooperative-web` 대상 |
| backend service `backend-cooperative-web` | EXTERNAL_MANAGED · HTTP · 로그 1.0 (기존 web backend 와 같은 설정) |
| URL map `o4o-global-lb` | host rule `pharmcoop.neture.co.kr` → path matcher `path-matcher-cooperative` 추가. 변경 전후 export diff 는 이 두 항목 추가뿐 |

HTTP→HTTPS redirect URL map 은 모든 host 를 이미 덮어 변경하지 않았다. 옛 `coop` 도메인으로 만든 GCP 리소스는 처음부터 없었다.

## 병합 · 배포 결과 (2026-10-18)

| 항목 | 결과 |
|---|---|
| PR #692 | CI 전 항목 통과(CI Gate · API Jest 3분할 · Web build · Code Quality · Docs guard), Codex 지적 0, Sonar 통과 → merge `716504eaf2` |
| Delivery | `HELD_LEVEL_3` (api · neture) → Promote `716504eaf2` 성공 |
| API | `o4o-core-api` 새 revision 100% traffic, label `o4o-commit-sha=716504eaf2` |
| Neture web | `neture-web` 새 revision 100%, label `716504eaf2`. 운영 번들에 홈 협동조합 카드 `pharmcoop` 링크 확인 |
| CORS (운영 API preflight) | `Origin: https://pharmcoop.neture.co.kr` → 204 · `allow-origin` 일치 · credentials true. 옛 origin 은 임의 미등록 origin 과 같은 거부 응답 |
| 인증서 · HTTPS | `cm-cert-pharmcoop-v1` ACTIVE(AUTHORIZED), `https://pharmcoop.neture.co.kr` TLS 검증 정상 |
| 협동조합 workflow 사전 점검 (`apply=false`, main HEAD = API SHA = `716504eaf2`) | CI · SHA 고정 · 같은 SHA serving API 확인까지 통과, 조합 등록 사전 점검 job 에서 실패(지정 운영자 계정 부재 — 기존 차단). frontend 배포 단계는 실행되지 않음 |

## 후속 정정 — 홈 "내 서비스" 조합별 링크

#692 작성 기준(`993206f0a4`) 이후 다른 PR 로 들어온 `services/web-neture/src/lib/home-entry.ts` 의 조합별 참여 링크(`https://coop.neture.co.kr/<slug>`)가 운영 번들에 남아 있었다. 운영 DB 에 조합이 0건이라 실제 노출은 없었다.
`https://pharmcoop.neture.co.kr/<slug>` 로 고치고, 조합 항목의 href 를 고정하는 단위 검증을 추가했다(기존 테스트는 id 만 비교해 도메인을 보지 않았다).
Neture 전체 Vitest 127개 파일 1,133개 · tsc · build · ESLint 통과. 첫 실행은 다른 작업과 겹쳐 worker heap 부족 · `demoAccounts` timeout 으로 실패했고, worker 2개로 다시 실행해 전부 통과했다.

## 미해결

- 지정 운영자 계정이 운영 DB 에 없어 테스트 조합 등록과 협동조합 frontend 배포(`cooperative-web` 최초 생성)가 막혀 있다. 계정 생성 · 전역 역할 부여는 하지 않았다.
- 따라서 새 도메인의 `/` · `/test` · `/login` 직접 접근, 로그인 · 세션 유지 · 로그아웃, 운영자 · 개인 조합원 권한 검증은 frontend 배포 이후로 남는다. 현재 새 도메인은 유효한 HTTPS 위에서 backend 대상 서비스가 없어 404 다.
- `cooperative-web` 공개 invoker IAM 은 서비스가 생성된 뒤에 설정한다.
- 개인 조합원 계정의 역할 · 약국 조직 · 매장 연결은 이번 작업에서 바뀌지 않았다(조합 연결 미실행). 연결 후 비교는 등록 실행 시 위 기준선과 대조한다.
