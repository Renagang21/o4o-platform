# HANDOFF

> 마지막 작업: 2026-10-05 (KST 오전) · 기준 `origin/main` = `e6ff76c23`
> 요약: 기존 웹 서비스 퇴역 트랙 — 현황 조사 → 퇴역 판정 IR → 공유 인증서 분리 → glucoseview · signage-player 퇴역 정리까지 완료.

## 완료된 것

| 작업 | 결과 | 기록 |
|---|---|---|
| GCP 웹 서비스 현황 조사 · 퇴역 판정 IR | glucoseview-web · signage-player-web = RETIRE_READY, pharmacy-hub-web = RETIRE_AFTER_MIGRATION | 화면 보고만 (문서 미작성) |
| WO-O4O-SHARED-CERTIFICATE-SEPARATION-V1 | `cm-cert-neture-v2`(13 SAN, glucoseview 3개 DNS 해석 불가 → 12-07 만료 전 갱신 실패 위험) → `cm-cert-neture-v3`(유지 10 도메인, 만료 2027-01-02) 전환 · 검증 · v2 삭제 | PR #305 (**OPEN · 통합 대기**) |
| WO-O4O-RETIRED-WEB-SERVICES-DEPLOYMENT-AND-INFRA-CLEANUP-V1 | signage 배포 경로 제거(PR #306 → `4cfcbf339`) · Cloud Run `glucoseview-web` · `signage-player-web` 삭제 · glucoseview LB 규칙/backend/NEG/보안정책 2/DNS authz 3 삭제 · `hospital.neture.co.kr` host rule 제거 · Cloud Run 10개 · 유지 host HTTPS · 실매장 Tablet 재생 검증 PASS | `docs/checks/CHECK-O4O-RETIRED-WEB-SERVICES-DEPLOYMENT-AND-INFRA-CLEANUP-V1.md` (PR #307 → `e6ff76c23`, COMPLETED) |

## 진행 중이던 것

상태 조회 시각: 2026-10-05 09:57 KST (`gh pr view` · `git ls-remote`)

| 대상 | 상태 | 남은 단계 |
|---|---|---|
| PR #305 · `wo/shared-certificate-separation-v1` (CHECK-O4O-SHARED-CERTIFICATE-SEPARATION-V1 1파일) | **OPEN** · CI Gate/Sonar PASS · 미해결 스레드 0 · 원격 branch 있음 | 사용자 "main 통합 진행" 승인 → merge. worktree `D:/o4o-wt/shared-certificate-separation-v1`(node_modules 없음) 은 merge 후 remove → prune → branch -d |
| PR #306 · #307 (퇴역 웹 정리) | **MERGED** (`4cfcbf339` · `e6ff76c23`) · 로컬 worktree/branch 정리 완료 | 원격 branch `wo/retired-web-services-cleanup-v1` · `…-closure` 가 아직 **있음** — GitHub 에서 삭제(로컬 settings 가 `push --delete` 차단) |
| 이 인수인계 · `wo/handoff-20261005-095537-desktop-ss4q2dk` | PR (생성 예정) (merge 하지 않음) | 다음 작업공간 `/start` 가 읽은 뒤 처리. worktree `C:/Users/sohae/o4o-wt/handoff-20261005-095537-desktop-ss4q2dk` |

## 다음에 이어서 할 일 (우선순위)

1. PR #305 통합 (사용자 승인 후 merge)
2. **pharmacy-hub-web 퇴역 트랙** — 기능 이전 + QR 4개 착지 처리. 근거: SUBDOMAIN-SERVICE-SEMANTICS §2-2, URL-FIRST CENSUS §10-5. 선행: `/join` 차단 · `StoreEnrollmentPage.tsx:21` "병원 약국" 오표기 · opt-in 공급 채널 결정(보류 중) · 매뉴얼 목적지 · KPA B2B 결손 3건. `store_qr_codes.landing_target_id` 4행이 `pharmacyhub.co.kr` — 호스트는 이전 전까지 유지
3. **siteguide.co.kr** — 사용자 도메인 보유 결정 후 cert map entry 2 · `cm-cert-siteguide`(11-20 만료, 자동 갱신 중) · authz 2 정리
4. `www.neture.co.kr/hospital` 이 neture-web 으로 감 — www matcher 에 `/hospital` path rule 추가 vs www→apex redirect 결정 필요
5. 잔여 정리(별도 WO): API CORS 잔재 3줄(`setup-middlewares.ts` signage run.app · `signage.neture.co.kr` · `hospital.neture.co.kr`, API 배포 동반) · 고아 보안정책 6개 · 이미지 저장소(glucoseview · glycopharm · signage-player · siteguide) · `services/signage-player-web` 소스
6. 문서 drift(기준 문서): `O4O-STORE-ACCESS-AND-MEMBERSHIP-V1:122` pharmacy-hub 가입 가능 업종 표기 · glucoseview 잔존 표기 3건(ROLE-POLICY-AND-GUARD:50 · USER-DOMAIN-SSOT:154 · OPERATOR-USER-MANAGEMENT-STANDARD:370)

## 주의 · 결정 · 미해결

- LB(URL map · cert map)는 코드로 관리되지 않는다 — 변경은 export 백업 → 편집 → fingerprint 포함 import(낙관적 잠금). `remove-host-rule` 은 무관한 matcher 고아 경고가 나서 쓰지 않는다.
- cert map 에 PRIMARY entry 가 없다 → 미등록 host 는 TLS 단계에서 실패. LB default service(neture-web)로 떨어지는 건 cert entry 는 있고 host rule 이 없는 host(현재 siteguide)뿐.
- `deploy-web-services.yml` 을 고치면 `--files-from` 판정은 보수적 LEVEL_3 이지만 실제 delivery(base/head job 단위 분석)는 job 제거를 LEVEL_1 로 본다 — merge 전 `node scripts/ci/deploy-risk.mjs --base origin/main --head HEAD` 로 확인.
- 신규 Tablet 재생 축은 만들지 않는다(정본 Tablet ScreenSet). `/api/signage/:sk/active-content` 는 store-web 이 쓰므로 보존.
- 운영 DB 조회 시 한글 slug 는 Windows 코드페이지로 깨진다 — `PGCLIENTENCODING=UTF8` + 파일 경유 + 코드에서 URL 인코딩.
- 미추적 `services/mobile-app/` 은 다른 세션 소유 — 건드리지 않음.
- 미확인: Google OAuth 승인 원본(콘솔 전용) · glucoseview.co.kr · siteguide.co.kr 도메인 등록 상태(gabia).
