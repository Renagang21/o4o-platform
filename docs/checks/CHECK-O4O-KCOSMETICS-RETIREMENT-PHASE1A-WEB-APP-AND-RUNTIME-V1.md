# CHECK-O4O-KCOSMETICS-RETIREMENT-PHASE1A-WEB-APP-AND-RUNTIME-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-06 · **최종 갱신**: 2026-10-06
> **근거 WO**: WO-O4O-KCOSMETICS-RETIREMENT-PHASE1A-WEB-APP-AND-DEPLOY-TARGET-V1 (PR #334) · 선례 [CHECK-O4O-RETIRED-WEB-SERVICES-DEPLOYMENT-AND-INFRA-CLEANUP-V1](CHECK-O4O-RETIRED-WEB-SERVICES-DEPLOYMENT-AND-INFRA-CLEANUP-V1.md) · [CHECK-O4O-SHARED-CERTIFICATE-SEPARATION-V1](CHECK-O4O-SHARED-CERTIFICATE-SEPARATION-V1.md)

K-Cosmetics 퇴역 1차-A. 독립 웹 앱 `services/web-k-cosmetics` 와 배포 경로를 제거하고,
Codex P1(서비스가 살아 있는데 유지보수 경로만 사라지는 순서) 수용에 따라 **공개 서비스 운영 종료를 같은 PR 의 통합과 묶었다.**
API · DB · serviceKey · role · admin 정리는 범위 밖(1차-B 이후).

---

## 0. 판정

| 항목 | 결과 |
|---|---|
| 앱 소스 · 배포 경로 제거 | PR #334 커밋 `518da8b59` — 226 파일 삭제 · 웹 배포 job 8 → 7 · `WEB_SERVICES` · `WEB_CLOUD_RUN` 1행씩 제거 · lockfile importer 제거 |
| 진입 링크 정리 | PR #334 커밋 `50c44a69c` — §1 |
| 운영 종료 (production · 2026-10-06 KST 22:27~22:57) | §2 — K-Cos host 4개 TLS 단계 종료 · Cloud Run 삭제 · 공유 인증서 v4 전환 |
| 유지 host 회귀 | 0 (§3) |
| 사용자 작업 | 외부 DNS · Google OAuth 승인 origin (§4) |

## 1. 진입 링크 정리 (코드)

| 위치 | 변경 |
|---|---|
| `services/web-store/src/App.tsx` | `/work/k-cosmetics` · `/work/k-cosmetics/store` · K-Cos 송출 mount 는 종료 안내(`KcosRetired`)만 렌더. `/guide/*` 는 K-Cos 문맥에서 공개 사이트로 replace 하지 않음. 약국 화면으로 redirect 하지 않는다(같은 기능이라는 근거 없음). 이식 화면 코드 삭제는 1차-B |
| `services/web-neture` 공개 홈 | 주요 서비스 '리테일' 카드 제거 |
| `services/web-neture` community 호스트 | `/retail` 진입(→ retail 포럼) · 소매업소 커뮤니티 카드 제거. `/retail` 은 다른 미소유 경로처럼 대표 호스트로 간다 |
| `packages/shared-space-ui` `O4OHelpSection` | 서비스 목록의 K-Cosmetics 항목 제거 |

## 2. 운영 종료 실행 기록 (production)

변경 전 정의를 세션 scratchpad 에 YAML 로 백업했다(커밋하지 않음): URL map · backend · NEG · 보안정책 · Cloud Run · 인증서 2 · cert map entry 전체 · DNS authorization.
변경 전 트래픽(최근 14일 Cloud Run 요청 · 30일 API 별칭)은 크롤러 · AI 봇 · WordPress 취약점 스캐너뿐이었다 — 실제 이용 0. 데이터는 전부 테스트 데이터(보존 안 함 · 사용자 결정).

| 순서 | 단계 | 확인 | 결과 |
|---|---|---|---|
| 1 | `cm-cert-neture-v4` 생성 — 유지 7 도메인(neture · www · admin · api.neture · kpa-society · www · api.kpa-society), 기존 DNS authorization 7 재사용 · DNS 변경 0 | 약 4분 뒤 ACTIVE · 7/7 AUTHORIZED | 완료 |
| 2 | canary `www-kpa-society-entry` → v4, 이어서 나머지 6 entry 제자리 교체 | 7 host 모두 새 serial(`B7D89886…`) 제공 · HTTPS 200 · 체인 검증 0 | 완료 |
| 3 | K-Cos entry 4개 삭제 — `k-cosmetics-entry` · `www-k-cosmetics-entry` · `api-k-cosmetics-entry` · `cm-entry-retail` | cert map 에 PRIMARY entry 없음 → 4 host 모두 TLS handshake 실패(curl exit 35) · **기본 O4O 화면 미노출**. HTTP(80)는 301 → HTTPS → 같은 실패 | 완료 |
| 4 | URL map `o4o-global-lb` — export → 편집 → fingerprint 포함 import. host rule `k-cosmetics.site` · `www.k-cosmetics.site` · `retail.neture.co.kr` + `path-matcher-k-cosmetics` 제거, `path-matcher-api` host 목록에서 `api.k-cosmetics.site` 만 제거 | 편집 스크립트가 그 밖의 host rule · path matcher · default service 동일성을 단언 · 서버 validate load/test PASS · 적용 후 export 가 편집본과 일치(fingerprint `eyiGAxYin0s=` → `DILqTkZpPTE=`) · host rule 14 → 11 · matcher 12 → 11 | 완료 |
| 5 | backend `backend-k-cosmetics-web` → serverless NEG `neg-k-cosmetics-web` → 보안정책 `default-security-policy-for-backend-k-cosmetics-web` | 각 삭제 직전 참조 0 (URL map · backend 사용처) | 삭제 |
| 6 | Cloud Run `k-cosmetics-web` | 서비스 목록 9개로 감소 | 삭제 |
| 7 | `cm-cert-neture-v3` · `cm-cert-retail-v1` | 참조 entry 0 | 삭제 |
| 8 | DNS authorization `dns-authz-k-cosmetics-site` · `dns-authz-www-k-cosmetics-site` · `dns-authz-api-k-cosmetics-site` | 참조 인증서 0 | 삭제 |

복구: URL map 은 백업 YAML import, 인증서는 v4 를 그대로 쓰면 된다(유지 도메인 전부 포함). K-Cos 를 되살리는 복구는 하지 않는다(퇴역 결정).

## 3. 검증 (2026-10-06)

| 항목 | 결과 |
|---|---|
| 유지 host HTTPS | neture · www · `/hospital/` · admin · api.neture `/api/health` · api.kpa-society `/api/health` · kpa-society · www · `kpa-society.co.kr/kpa/` · kpa. · pharmacyhub · store · study · pharmacy · community · funding · supplier — 전부 200 · 체인 검증 0 (단계 3 · 4 직후 각각) |
| K-Cos host | `k-cosmetics.site` · `www.` · `api.` · `retail.neture.co.kr` — TLS 단계 종료, 응답 본문 없음 |
| Cloud Run | 9개 — hospital-pharmacy · kpa-branch · kpa-society · lecture · neture · admin · core-api · pharmacy-hub · store |
| 인증서 | `cm-cert-neture-v4` ACTIVE(7/7 DNS authorization — 유지 도메인의 기존 authorization 재사용) · v3 · retail 없음 |

## 4. 사용자 작업 (자동 변경하지 않음)

| 항목 | 현재 | 할 일 |
|---|---|---|
| 외부 DNS `k-cosmetics.site` · `www.` · `api.` A 레코드 | LB 공용 IP(`[REDACTED_IP]`)를 가리킴 — TLS 에서 끊겨 무해 | 도메인 관리 화면에서 삭제(또는 도메인 보유 종료) |
| 외부 DNS `_acme-challenge.k-cosmetics.site` · `www.` · `api.` CNAME | 남아 있음(authorization 은 삭제됨) | 삭제 |
| 외부 DNS `retail.neture.co.kr` A 레코드 | LB 공용 IP — TLS 에서 끊김 | neture.co.kr zone 에서 삭제 |
| Google OAuth 승인 origin · redirect URI 의 K-Cos host | 미확인(콘솔 전용) | Google Cloud 콘솔에서 K-Cos host 항목만 제거 |

## 5. 남은 항목 (다음 단계)

| 항목 | 메모 |
|---|---|
| 1차-B | `services/web-store/src/services/kcos/**` · `/api/v1/cosmetics` · admin `cosmetics-products` 일괄 제거 |
| API | service catalog `k-cosmetics`(domain `retail.neture.co.kr`) · CORS origin(K-Cos host · run.app) · cookie domain · 공급자 콘텐츠 handoff 대상 `k-cosmetics`(수신 운영자 화면 없음) · 로그인 후 진입이 K-Cos 로 보낼 수 있음(테스트 계정만) |
| shared-space-ui | guide copy `k-cosmetics.ts`(소비처 0) · Neture guide 의 K-Cosmetics 설명 문구 |
| admin | `StoreQrGuidePage` 의 K-Cos 항목 |
| e2e | `e2e/auth-runtime` · `registration-approval-login` 의 `k-cosmetics.site` 대상 |
| 이미지 | `gcr.io/…/k-cosmetics-web` — 저장소 단위 개별 승인 |
| main 재생성 위험 | PR #334 통합 전에는 main 의 `deploy-k-cosmetics` job 이 살아 있어 promote · 웹 배포가 Cloud Run 을 재생성할 수 있다 → 통합을 promote 보다 먼저 한다 |

## 6. 비밀정보

인증서 개인키 · secret · 환경변수 값은 다루거나 기록하지 않았다. 관리형 인증서라 키는 Google 이 보관한다.
