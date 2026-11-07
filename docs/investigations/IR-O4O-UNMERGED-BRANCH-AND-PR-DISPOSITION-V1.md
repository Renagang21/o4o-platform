# 병합되지 않은 원격 branch · PR 처분 정밀 조사

> **상태**: DRAFT (조사 전용 · 코드 · 설정 · branch 변경 없음. 삭제는 통합 담당이 §6 스크립트로 직접 실행)
> **작성일**: 2026-11-07
> **기준**: `origin/main` `3def3a9dd3` (#979) · 원격 branch 99개 · 열린 PR 8개
> **실행 위치**: CLOUD (git 전체 이력 · GitHub PR/코멘트 조회만. 운영 DB · GCP 조회 없음)
> **관련**: [`AGENTS.md` §4-1(e)·(i)](../../AGENTS.md) — 원격 branch 정리는 통합 담당이 한다

---

## 0. 요약

1. 전체 이력(unshallow)으로 다시 계산하면 `origin/main` 의 조상이 아닌 원격 branch 는 **46개**다. 앞선 1차 조사의 77개는 얕은 clone 때문에 부풀려진 수치다. 이 46개 중 8개는 열린 PR branch 이고, 나머지 38개는 B 그룹 23개와 squash 로 병합된 C 그룹 15개로 나뉜다. B 그룹의 나머지 3개는 이미 main 의 조상이다.
2. **B 그룹 26개 판정**: 전부 반영 13 · 대체됨 11 · **일부 반영 2**(`wo/pharmacyhub-residual-integration`, `wo/four-service-full-retirement-v1`). 단순 미반영으로 남은 작업은 없다. main 에 들어가지 않은 커밋은 모두 의도적으로 폐기됐거나 후속 PR 로 대체됐다.
3. **삭제 대상 86개**: C 그룹 62개(병합된 PR 의 head branch) + B 그룹 중 전부 반영·대체됨 24개. 여기에 PR 없이 이미 main 에 전부 포함된 branch 3개를 선택 항목으로 덧붙였다. 열린 PR 의 branch 는 하나도 없다(대조 0건).
4. **KEEP 2개**: `wo/pharmacyhub-residual-integration`(#610), `wo/four-service-full-retirement-v1`(#615). 남은 일부 작업을 이어 갈지 결정할 때까지 보존한다.
5. **보안 확인 (2026-11-07)**: `work/store-description-qr-audit-v1` 에는 조회 결과 JSON 7개(`tmp/store-description-qr-audit/*.json`, 2,196줄)가 있다. ① 현재 main 에 없고, main 이력 18,372커밋 어디에도 들어간 적이 없다(경로 · blob SHA · 파일명으로 대조). 이 커밋을 가진 원격 branch 는 이 branch 하나뿐이다. ② 항목은 상품 200건의 내부 ID(UUID) · 상품명 · 분류 · 건수 집계 · 판정 문장 · 소스 경로 · 코드 식별자 · 공개 서비스 도메인 URL · SELECT 문 1개다. 이메일 · 전화번호 · 주소 · 이름 · 계정 식별자 · 비밀번호 · 토큰 · key 는 패턴 검사와 키 이름 확인에서 0건이었다(전화번호 패턴 2건은 UUID 안 숫자열의 오탐). ③ **소유자 확인 사항**: 이 JSON 은 운영 실데이터가 아니라 테스트용 자료다(통합 담당 확인, 2026-11-07). 따라서 이 branch 는 다른 branch 와 같은 **일반 삭제 대상**으로 둔다. 판정은 패턴 · 키 기준이라 패턴에 맞지 않는 형태의 값까지 완전히 배제하지는 못한다.

## 1. 방법

| 단계 | 내용 |
|---|---|
| 이력 | `git fetch --unshallow` 로 main 18,372커밋 전체 확보 |
| 병합 시뮬레이션 | `git merge-tree --write-tree origin/main origin/<b>` — 결과 tree 가 main tree 와 같으면 "병합해도 main 변화 없음 = 전부 반영" |
| patch-id | `git cherry origin/main <b> <merge-base>` — `-` = main 에 같은 patch 존재 |
| 내용 존재율 | `-` 가 아닌 커밋은 추가한 줄(공백 제외 25자 이상)이 main 의 같은 파일에 그대로 있는 비율을 쟀다. squash · 재작성 반영을 잡기 위해서다 |
| 반영 경로 | 같은 제목 커밋을 `git log --grep` 으로 찾거나 `-S` 로 줄을 추적한 뒤, `commits/{sha}/pulls` 로 해당 PR 을 특정 |
| PR 경위 | B-2 · B-3 의 닫힌 PR 은 본문 · 코멘트 · timeline(교차 참조)을 확인 |
| C 안전성 | branch tip 과 병합된 PR 의 head SHA 를 비교. 병합 뒤 추가 커밋이 있으면 그 커밋의 main 반영을 따로 확인 |

판정 기준: **전부 반영** = 내용이 main 에 들어감 · **대체됨** = 그대로는 반영되지 않았지만 다른 PR · 정책이 같은 목적을 처리했거나 폐기를 결정함 · **일부 반영** = 의미 있는 미반영 범위가 남음 · **미반영** = 대체 근거 없이 빠짐(이번 조사에서 해당 없음).

## 2. B-1 — PR 없이 push 된 branch (8)

| branch | tip | 판정 | 근거 | 처분 |
|---|---|---|---|---|
| `wo/member-signup-approval-action` | `aea4fa8736` | 전부 반영 (대체) | 같은 "단일 가입승인 액션" 을 [#956](https://github.com/Renagang21/o4o-platform/pull/956) `2c931a6235` 이 반영. 추가한 306줄 중 302줄이 main 에 있음. 나머지 4줄은 이후 main 에서 다시 다듬어짐 | 삭제 |
| `wo/central-operator-management` | `3d7b36c248` | 대체됨 | 통합 담당 결론(2026-11-07). 내용 존재율 19/148. 중앙 운영 담당자 지정은 #908 등 이후 main 구조로 대체됨 | 삭제 |
| `wo/cross-service-ui-ux-standardization` | `90819c4e63` | 전부 반영 | tip 이 main 조상. [#900](https://github.com/Renagang21/o4o-platform/pull/900) 의 merge `ba55ccaefd` 로 들어옴 | 삭제 |
| `wo/chatgpt-registration-preparation-20261027` | `92d82521bc` | 전부 반영 | tip 이 main 조상. #900 의 `06c01337de` | 삭제 |
| `wo/assistant-product-naming` | `36b54f6f2c` | 전부 반영 | tip 이 main 조상. [#848](https://github.com/Renagang21/o4o-platform/pull/848) 의 `6b9b04dad0` | 삭제 |
| `wo/ai-model-delete-usability` | `ab441c5950` | 전부 반영 | 2커밋 모두 patch-id 동일. [#792](https://github.com/Renagang21/o4o-platform/pull/792) `39c0aacc9c` · `adab8bca24` | 삭제 |
| `wo/pharmacy-coop-foundation` | `fd19239ab4` | 전부 반영 | 2커밋 모두 patch-id 동일. [#670](https://github.com/Renagang21/o4o-platform/pull/670) `08775cfa3c` · `d4119ddf7c` | 삭제 |
| `wo/o4o-proprietary-license-notice-v1` | `1093062246` | 전부 반영 | patch-id 동일 · merge 시뮬레이션 결과 변화 없음. [#669](https://github.com/Renagang21/o4o-platform/pull/669) `a35e72f3db` | 삭제 |

## 3. B-2 — PR 이 병합되지 않고 닫힌 branch (7)

| branch | PR · 닫힌 이유 | 판정 | 미반영 내용 | 다시 할 가치 | 처분 |
|---|---|---|---|---|---|
| `wo/coop-frontend-only-api-gate` `fb92d4f4aa` | [#786](https://github.com/Renagang21/o4o-platform/pull/786) — "main 의 `521ec12c7f` 가 같은 문제를 Delivery 판정(`assessServingGap`)으로 이미 해결, 중복" | 대체됨 | `deploy-cooperative.yml` 의 frontend-only 조상 판정 27줄 | 없음. `521ec12c7f` 가 main 에 있음을 확인 | 삭제 |
| `wo/claude-autonomous-delivery-permissions` `02f785b189` | [#700](https://github.com/Renagang21/o4o-platform/pull/700) — "현재 main 의 후속 권한 정책 `d934482058` · `b0f094c8d3` 으로 대체. 그대로 병합하면 이후 정책과 충돌" | 대체됨 | `.claude/settings.json` ask 패턴 축소(28줄 중 20줄은 main 에 있음) | 없음. 이 PR 이 다루던 자동 진행 권한은 이후 [#966](https://github.com/Renagang21/o4o-platform/pull/966)(클라우드 세션 권한 · 자율 진행 원칙) · [#971](https://github.com/Renagang21/o4o-platform/pull/971)(작업 세션은 PR 까지, 병합 · 배포는 통합 담당)로 새로 정리됨. 종료 코멘트의 "브랜치는 보존" 은 통합 담당 확인(2026-11-07)으로 해제 | 삭제 |
| `wo/pharmacyhub-residual-integration` `abd296e1b2` | [#610](https://github.com/Renagang21/o4o-platform/pull/610) — 2026-10-16 "PH purge 대기로 막힌 PR 을 인계 후 닫기(branch 보존)". 10-24 재판정: CMS 저장 경계 · 옛 slug redirect 만 [#802](https://github.com/Renagang21/o4o-platform/pull/802) 로 분리해 병합 | **일부 반영** | 조직 생존 판정 helper(`utils/retired-organization.ts`) · 모집/초대/tablet device SQL 경계 · 공용 store settings/layout/template slug guard · residual guard spec · CHECK 문서. 15커밋 중 반영 0. 내용 존재율 낮음(대부분 0~50%) | **조건부.** 원본 tree 는 재사용할 수 없다 — 대상 controller 3개(`kpa-store-template` · `layout` · `store-settings`)가 main 에서 이미 삭제됨. PH 운영 데이터가 아직 남아 있는지 LOCAL read-only 로 확인한 뒤, 남아 있으면 최신 main 기준으로 재현 기반 새 WO 를 만든다. 남아 있지 않으면 종료 | **KEEP** |
| `wo/pharmacyhub-residual-guards` `bba5cc2cf1` | [#609](https://github.com/Renagang21/o4o-platform/pull/609) — "전체 head 가 #610 head 의 조상. 후속은 #610 하나에서" | 대체됨 | #610 과 동일(포함) | #610 판정을 따름. 내용은 #610 branch 에 전부 있음(조상 관계 재확인) | 삭제 |
| `wo/four-service-full-retirement-v1` `2efb6a8580` | [#615](https://github.com/Renagang21/o4o-platform/pull/615) — 10-16 "PH 정리 후 재개, branch 보존". 10-24 [#803](https://github.com/Renagang21/o4o-platform/pull/803) · [#804](https://github.com/Renagang21/o4o-platform/pull/804) 로 범위를 줄여 재개 · 병합 · API 배포 | **일부 반영** | ① `glycocare` operator scope 제거(`cc03c1ec37`): main 에 8파일이 남아 있음 — `apps/admin-dashboard` guards · `config/service-entry.ts` · `pages/operator/MyPolicyPage.tsx` · `packages/types/src/operator-policy.ts` · `apps/api-server/src/config/service-scopes.ts` ② 퇴역 4서비스 census IR 문서(main 에 없음) ③ 공급 등록 serviceKey allowlist(#803 이 "현재 draft/publication 설계와 달라" 의도적으로 제외) ④ GP 프로그램 문구(대상 KPA 페이지가 main 에서 삭제됨) | ①만 가치 있음. 퇴역한 GlycoPharm 의 운영자 scope 잔재다. `packages/types` 공용 타입을 건드리므로 [`O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1`](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md) 에 따른 작은 후속 WO 로 처리한다. ②~④는 다시 할 가치 없음 | **KEEP** (① 후속 WO 착수 후 삭제) |
| `wo/supplier-live-round-trip` `d9d757b501` | [#598](https://github.com/Renagang21/o4o-platform/pull/598) — "운영 상품 승인 · 테스트 주문 보존 계획은 테스트 종료 후 완전 삭제 지시에 따라 철회. 후속 [#618](https://github.com/Renagang21/o4o-platform/pull/618) 로 대체" | 대체됨 | `CHECK-O4O-SUPPLIER-LIVE-ROUND-TRIP-V1.md` 244줄(main 에 없음 · 참조 0) | 없음. 철회된 계획의 기록이다. 후속 검증은 main 의 `CHECK-O4O-SUPPLIER-TEST-CLEANUP-AND-ISOLATED-FLOW-V1` 에 있음. 원문은 PR #598 에 남음 | 삭제 |
| `wo/service-operator-assignment-audit` `b3b71b4602` | [#603](https://github.com/Renagang21/o4o-platform/pull/603) — "전체 head 가 #610 head 에 포함. 후속은 #610 에서" | 대체됨 | TODO 문서 8줄("분회 운영자 지정은 새 분회 구축 후") | 없음. 분회는 이후 `kpa.neture.co.kr` 로 재구축됨(`CLAUDE.md` §10). 내용은 #610 branch 와 PR #603 에 보존됨 | 삭제 |

## 4. B-3 — 2026-10-11 이전 branch (11)

| branch | PR | 판정 | 근거 · 다시 할 가치 | 처분 |
|---|---|---|---|---|
| `wo/pharmacyhub-qr-missing-family-census` `cfbe1d2207` | [#416](https://github.com/Renagang21/o4o-platform/pull/416) closed | 대체됨 | read-only QR 계측 스크립트 66줄. 같은 날 [#417](https://github.com/Renagang21/o4o-platform/pull/417)(merged)이 "QR 검증을 서비스 퇴역에 맞춤" 으로 대체. PH 퇴역 완료라 가치 없음 | 삭제 |
| `wo/pharmacy-hub-full-retirement-v1` `5fa346ca12` | [#373](https://github.com/Renagang21/o4o-platform/pull/373) closed | 대체됨 | 닫힌 이유: "오래된 main 기준이라 삭제된 기능이 되살아남 · purge workflow 조기 삭제 · PH payment handler · Frozen Core 변경 포함 → #609 로 대체". 이후 #609 → #610 → #802 와 main 의 PH 퇴역으로 이어짐. 20커밋 모두 그대로는 반영 불가이며 가치 없음 | 삭제 |
| `wo/pharmacy-hub-canonical-index-alignment-v1` `770c20df9a` | [#380](https://github.com/Renagang21/o4o-platform/pull/380) closed | 대체됨 | 닫힌 이유: "#427(10-11) 폐기 정책 정합으로 대체. SUPERSEDED 로 바꾸면 현재 폐기 정책까지 무효화". 위 branch 와 공통 커밋 9개 + 문서 커밋 4개 | 삭제 |
| `wo/home-discovery-doc-status` `3a86d927d1` | [#409](https://github.com/Renagang21/o4o-platform/pull/409) closed (코멘트 없음) | 대체됨 | 10-10 시점 대표 홈 정본의 구현 상태 정합. 이후 `O4O-HOME-SERVICE-DISCOVERY-V1` 이 10-21 · 10-29 · 10-30 · 10-31 에 갱신돼 내용이 낡음. 가치 없음 | 삭제 |
| `wo/neture-service-realignment-v1` `bcdaa90fcc` | #364 병합 후 추가 push | 전부 반영 | 같은 제목 커밋 `92ad0982f4` 가 [#671](https://github.com/Renagang21/o4o-platform/pull/671) 로 반영(31줄 중 27줄 일치. 나머지는 이후 편집) | 삭제 |
| `wo/email-auth-ui-smoke-record` `6f6a02720b` | 없음 | 전부 반영 | [#608](https://github.com/Renagang21/o4o-platform/pull/608) `5a06b46107` "PR 없이 push 만 된 기록 문서 5 branch 를 main 으로 회수". 39/39줄 일치 | 삭제 |
| `work/operator-targets-9` `6004ea3e0a` | 없음 | 전부 반영 | #608 회수. IR 2종 255/258줄 일치 | 삭제 |
| `docs/google-only-auth-cleanup-check` `d88f687a86` | 없음 | 전부 반영 | #608 회수. ENROLLMENT CHECK 는 branch 초안 대신 main `9aac89b74f` 판을 유지한다고 커밋에 명시 | 삭제 |
| `docs/enrollment-closeout` `51903a1254` | 없음 | 전부 반영 | #608 에서 3-way 적용. 51/51줄 일치 | 삭제 |
| `work/cross-service-my-store-runtime-contract-commonization-v1` `26c7e0eb18` | #207 병합 후 추가 push | 대체됨 | 같은 작업이 [#211](https://github.com/Renagang21/o4o-platform/pull/211)(merged, "KCos·GP 태블릿 client 계약 중복 제거")로 반영됨. 대상 `services/web-glycopharm` · `web-k-cosmetics` 는 main 에서 제거됨 | 삭제 |
| `work/store-description-qr-audit-v1` `9aa2a48f82` | 없음 | 전부 반영 | #608 이 CHECK 를 회수했고, `tmp/*.json` 조회 결과 7개는 Public 저장소라 의도적으로 제외. JSON 에 개인정보 · 비밀값 없음, 소유자 확인상 테스트용 자료(§0-5) | 삭제 |

## 5. C 그룹 — PR 이 병합됐는데 원격에 남은 branch (62)

1차 조사의 "51개" 는 얕은 clone 에서 main 조상으로 판정되지 않은 것만 센 값이다. 전체 이력으로 다시 세면, 병합된 PR 의 head 이면서 원격에 남은 branch(열린 PR · B 그룹 제외)는 62개다. 47개는 merge 로 병합돼 main 의 조상이고, 15개는 squash 병합이다.

병합 뒤 추가 커밋이 있는 3개는 따로 확인했다.
- `wo/pharmacy-resource-transition-preparation`, `wo/unified-operations-workspace` — tip 자체가 main 조상.
- `wo/pharmacyhub-purge-gate-fixture-isolation` — #566 뒤의 `a36f04191e` 가 patch-id 동일 커밋 `6506fc960d`([#671](https://github.com/Renagang21/o4o-platform/pull/671))로 반영됨.

**62개 모두 main 에 내용이 들어 있다.**

| # | branch | 병합 PR | 병합일 | 병합 방식 | tip 관계 |
|---|---|---|---|---|---|
| 1 | `dependabot/github_actions/actions/setup-node-7` | #921 | 2026-11-02 | main 조상(merge 병합) | tip = PR head |
| 2 | `dependabot/github_actions/actions/upload-artifact-7` | #920 | 2026-11-02 | main 조상(merge 병합) | tip = PR head |
| 3 | `wo/account-erasure-activation-20261104` | #936 | 2026-11-06 | squash 병합 | tip = PR head |
| 4 | `wo/admin-operator-invitation-submit` | #923 | 2026-11-02 | main 조상(merge 병합) | tip = PR head |
| 5 | `wo/admin-operator-invite-first` | #925 | 2026-11-02 | main 조상(merge 병합) | tip = PR head |
| 6 | `wo/assistant-manual-knowledge` | #849 | 2026-10-27 | main 조상(merge 병합) | tip = PR head |
| 7 | `wo/central-access-denial-reason` | #956 | 2026-11-06 | squash 병합 | tip = PR head |
| 8 | `wo/ci-command-driver-idle-exit` | #906 | 2026-10-31 | main 조상(merge 병합) | tip = PR head |
| 9 | `wo/ci-quality-deduplicate-package-builds` | #935 | 2026-11-04 | main 조상(merge 병합) | tip = PR head |
| 10 | `wo/claude-code-env-setup` | #954 | 2026-11-06 | squash 병합 | tip = PR head |
| 11 | `wo/common-ui-remaining-adoption` | #907 | 2026-10-31 | main 조상(merge 병합) | tip = PR head |
| 12 | `wo/community-forum-ai-phase1` | #965 | 2026-11-07 | squash 병합 | tip = PR head |
| 13 | `wo/community-participation-operations` | #870 | 2026-10-29 | main 조상(merge 병합) | tip = PR head |
| 14 | `wo/community-signage-ai-registration` | #918 | 2026-11-01 | main 조상(merge 병합) | tip = PR head |
| 15 | `wo/consultation-access-guidance` | #881 | 2026-10-29 | main 조상(merge 병합) | tip = PR head |
| 16 | `wo/consultation-customer-recovery` | #885 | 2026-10-29 | main 조상(merge 병합) | tip = PR head |
| 17 | `wo/consultation-improvement-todo` | #910 | 2026-11-01 | main 조상(merge 병합) | tip = PR head |
| 18 | `wo/coop-member-test-race` | #964 | 2026-11-07 | squash 병합 | tip = PR head |
| 19 | `wo/cooperation-opening-end-to-end-20261029` | #882 | 2026-10-29 | main 조상(merge 병합) | tip = PR head |
| 20 | `wo/development-push-boundary` | #926 | 2026-11-02 | main 조상(merge 병합) | tip = PR head |
| 21 | `wo/display-playback-simplification` | #948 | 2026-11-05 | main 조상(merge 병합) | tip = PR head |
| 22 | `wo/drugstore-brand-domain-20261031` | #911 | 2026-11-01 | main 조상(merge 병합) | tip = PR head |
| 23 | `wo/drugstore-deploy-record-20261101` | #916 | 2026-11-01 | main 조상(merge 병합) | tip = PR head |
| 24 | `wo/drugstore-host-completion-20261101` | #917 | 2026-11-01 | main 조상(merge 병합) | tip = PR head |
| 25 | `wo/drugstore-host-cutover-20261101` | #912 | 2026-11-01 | main 조상(merge 병합) | tip = PR head |
| 26 | `wo/erasure-activation-record` | #967 | 2026-11-07 | squash 병합 | tip = PR head |
| 27 | `wo/erasure-job-missing-detection` | #963 | 2026-11-07 | squash 병합 | tip = PR head |
| 28 | `wo/github-app-token-issuer` | #842 | 2026-10-27 | main 조상(merge 병합) | tip = PR head |
| 29 | `wo/hospital-pharmacy-no-menu` | #927 | 2026-11-02 | main 조상(merge 병합) | tip = PR head |
| 30 | `wo/iphone-signup-submit` | #904 | 2026-10-31 | squash 병합 | tip = PR head |
| 31 | `wo/member-account-lifecycle-20261103` | #933 | 2026-11-03 | main 조상(merge 병합) | tip = PR head |
| 32 | `wo/member-erasure-simplification` | #960 | 2026-11-06 | squash 병합 | tip = PR head |
| 33 | `wo/member-profile-edit-20261104` | #938 | 2026-11-04 | main 조상(merge 병합) | tip = PR head |
| 34 | `wo/member-sonar-diagnostic-20261104` | #958 | 2026-11-06 | squash 병합 | tip = PR head |
| 35 | `wo/o4o-private-ci-budget-v1` | #897 | 2026-10-30 | main 조상(merge 병합) | tip = PR head |
| 36 | `wo/partner-community-readiness-v1` | #928 | 2026-11-02 | main 조상(merge 병합) | tip = PR head |
| 37 | `wo/partner-community-v1` | #841 | 2026-10-27 | main 조상(merge 병합) | tip = PR head |
| 38 | `wo/pc-connection-update-delivery` | #858 | 2026-10-27 | main 조상(merge 병합) | tip = PR head |
| 39 | `wo/pharmacy-approval-auto-membership-20261031` | #903 | 2026-10-31 | main 조상(merge 병합) | tip = PR head |
| 40 | `wo/pharmacy-auto-membership-deploy-record-20261031` | #909 | 2026-10-31 | main 조상(merge 병합) | tip = PR head |
| 41 | `wo/pharmacy-order-local-foundation` | #855 | 2026-10-27 | main 조상(merge 병합) | tip = PR head |
| 42 | `wo/pharmacy-residue-safe-cleanup` | #829 | 2026-10-26 | main 조상(merge 병합) | tip = PR head |
| 43 | `wo/pharmacy-resource-transition-preparation` | #838 | 2026-10-26 | main 조상(merge 병합) | 병합 후 커밋 25개 — main 반영 확인 |
| 44 | `wo/pharmacyhub-purge-gate-fixture-isolation` | #566 | 2026-10-14 | squash 병합 | 병합 후 커밋 2개 — main 반영 확인 |
| 45 | `wo/pushed-work-integration-20261027` | #848 | 2026-10-27 | main 조상(merge 병합) | tip = PR head |
| 46 | `wo/rea-response-minimization-v1` | #905 | 2026-11-02 | main 조상(merge 병합) | tip = PR head |
| 47 | `wo/readonly-db-rule` | #961 | 2026-11-06 | squash 병합 | tip = PR head |
| 48 | `wo/service-contact-operator-review` | #929 | 2026-11-02 | main 조상(merge 병합) | tip = PR head |
| 49 | `wo/settlement-notification-recovery` | #854 | 2026-10-27 | main 조상(merge 병합) | tip = PR head |
| 50 | `wo/signup-method-discovery-20261102` | #924 | 2026-11-02 | main 조상(merge 병합) | tip = PR head |
| 51 | `wo/social-first-login-20261103` | #932 | 2026-11-03 | main 조상(merge 병합) | tip = PR head |
| 52 | `wo/standard-list-workspace-contract` | #959 | 2026-11-06 | squash 병합 | tip = PR head |
| 53 | `wo/store-ai-overview-auth` | #891 | 2026-10-30 | main 조상(merge 병합) | tip = PR head |
| 54 | `wo/store-content-flow-20261106` | #953 | 2026-11-06 | main 조상(merge 병합) | tip = PR head |
| 55 | `wo/store-delivery-record-20261105` | #946 | 2026-11-05 | main 조상(merge 병합) | tip = PR head |
| 56 | `wo/store-pc-setup-ux` | #943 | 2026-11-05 | main 조상(merge 병합) | tip = PR head |
| 57 | `wo/store-playlist-authoring-required` | #947 | 2026-11-05 | main 조상(merge 병합) | tip = PR head |
| 58 | `wo/store-playlist-delivery-record-20261105` | #949 | 2026-11-05 | main 조상(merge 병합) | tip = PR head |
| 59 | `wo/store-signage-workspace-alignment-20261105` | #945 | 2026-11-06 | squash 병합 | tip = PR head |
| 60 | `wo/store-studio-menu-audit` | #957 | 2026-11-06 | squash 병합 | tip = PR head |
| 61 | `wo/supplier-business-store-handoff` | #874 | 2026-10-30 | main 조상(merge 병합) | tip = PR head |
| 62 | `wo/unified-operations-workspace` | #878 | 2026-10-29 | main 조상(merge 병합) | 병합 후 커밋 7개 — main 반영 확인 |

## 6. 원격 branch 삭제 스크립트 (PowerShell · 통합 담당 직접 실행)

- 대상: **C 그룹 62개 + B 그룹 삭제 판정 24개 = 86개**. 선택 항목(`OPT`) 3개는 PR 이 없지만 tip 이 이미 main 조상이라 전부 반영된 branch 이며, `-IncludeOptional` 을 줄 때만 처리한다(`wo/store-daily-workflow-upgrade` · `wo/store-signage-workspace` · `wo/store-video-single-list`).
- 제외: 열린 PR branch 8개(`wo/ci-short-job-consolidation` · `wo/community-industry-news-v2` · `wo/docs-fast-agent-config` · `wo/draft-light-ready-guarantee` · `wo/ir-ci-budget-s10` · `wo/main-verified-reuse` · `wo/promote-same-sha-guard` · `wo/wif-schedule-check-record`), KEEP 2개(`wo/pharmacyhub-residual-integration` · `wo/four-service-full-retirement-v1`), `main`.
- 안전장치:
  - 기본 실행은 **미리보기**다. 실제 삭제는 `-Execute` 를 줄 때만 한다.
  - 실행 직전 `gh pr list` 로 열린 PR 을 다시 조회한다. 그사이 PR 이 열린 branch 는 건너뛴다. `gh` 가 없거나 조회에 실패하면 중단한다.
  - `git ls-remote` 로 각 branch 의 현재 tip 을 이 조사의 SHA 와 비교한다. 다르면(조사 뒤 새 push) 건너뛰고 재조사 대상으로 표시한다.
  - 삭제 요청 자체에도 그 SHA 를 lease 로 건다(`--force-with-lease=refs/heads/<branch>:<SHA>`). 조회와 삭제 사이에 새 push 가 들어오면 서버가 삭제를 거절하고, 그 branch 는 `failed` 로 보고된다. 실패한 branch 는 tip 을 다시 조사한 뒤 처리한다.
  - 이 스크립트는 통합 담당이 로컬 PowerShell 에서 직접 실행한다. Claude Code 세션에서는 원격 branch 삭제 명령이 권한 규칙과 `guard-git-push` 훅으로 거부된다.
  - 같은 이름의 tag 와 헷갈리지 않도록 `refs/heads/<branch>` 전체 이름으로 삭제한다.
- 복구: PR 이 있던 branch 의 커밋은 GitHub 의 `refs/pull/<번호>/head` 에 남는다. PR 이 없던 branch 는 아래 표의 SHA 로 다시 만들 수 있다(`git push origin <sha>:refs/heads/<branch>`, 객체가 남아 있는 동안).
- 스크립트 본문은 일부러 ASCII 로만 썼다. Windows PowerShell 5.1 은 BOM 없는 UTF-8 `.ps1` 을 시스템 코드페이지로 읽어 한글이 깨지기 때문이다.
- 실행: 저장소 checkout 에서 아래 내용을 `cleanup-branches.ps1` 로 저장한 뒤 `.\cleanup-branches.ps1` 로 미리보기를 보고, 확인 후 `.\cleanup-branches.ps1 -Execute` 를 실행한다. 실행 정책에 막히면 `powershell -ExecutionPolicy Bypass -File .\cleanup-branches.ps1` 처럼 그 실행에만 정책을 풀어 쓴다.
- 미검증: 조사 환경에 PowerShell 이 없어 이 스크립트는 실제로 실행해 보지 못했다(괄호 · 따옴표 짝만 정적으로 확인). 먼저 미리보기 출력에서 대상 86개 · 건너뜀 0개(조사 이후 변경이 없다면)를 확인한다.

```powershell
# IR-O4O-UNMERGED-BRANCH-AND-PR-DISPOSITION-V1 section 6 - remote branch cleanup
# Baseline: origin/main 3def3a9dd3 (2026-11-07). ASCII only on purpose (Windows PowerShell 5.1 encoding).
# Default = preview only. Delete: -Execute   Include optional (OPT) branches: -IncludeOptional
param([switch]$Execute, [switch]$IncludeOptional)
$ErrorActionPreference = 'Stop'
$Repo = 'Renagang21/o4o-platform'

$Targets = @(
    @{ G = 'B'; B = 'wo/member-signup-approval-action'; Sha = 'aea4fa8736ea43dbae66fd6d5516fe2ea35f08ea' }
    @{ G = 'B'; B = 'wo/central-operator-management'; Sha = '3d7b36c248a6ba0d7f17a281e9175c5b6d523d22' }
    @{ G = 'B'; B = 'wo/cross-service-ui-ux-standardization'; Sha = '90819c4e6342f8c40277a693efe781fd483031e9' }
    @{ G = 'B'; B = 'wo/chatgpt-registration-preparation-20261027'; Sha = '92d82521bcc3fb3b355dd65262490e9bce65ff59' }
    @{ G = 'B'; B = 'wo/assistant-product-naming'; Sha = '36b54f6f2c9d6e7388c6f0d32a91b912492ed513' }
    @{ G = 'B'; B = 'wo/ai-model-delete-usability'; Sha = 'ab441c59507333061c3dc2bad914212b3389c0b1' }
    @{ G = 'B'; B = 'wo/pharmacy-coop-foundation'; Sha = 'fd19239ab4d1896730396b7a7e29924188ff3bf1' }
    @{ G = 'B'; B = 'wo/o4o-proprietary-license-notice-v1'; Sha = '10930622466fa79e760e71f6795b6d9e09f9d7b5' }
    @{ G = 'B'; B = 'wo/coop-frontend-only-api-gate'; Sha = 'fb92d4f4aab7c06e393659193fd018fe0ec5e929' }
    @{ G = 'B'; B = 'wo/claude-autonomous-delivery-permissions'; Sha = '02f785b189986ae1967e19fd7dc20585500c5baf' }
    @{ G = 'B'; B = 'wo/pharmacyhub-residual-guards'; Sha = 'bba5cc2cf12da8f155cf80fec27bb9bd49a1cbd5' }
    @{ G = 'B'; B = 'wo/supplier-live-round-trip'; Sha = 'd9d757b5013718749a910916cfa87bd262b31795' }
    @{ G = 'B'; B = 'wo/service-operator-assignment-audit'; Sha = 'b3b71b46021858c841ae203ea93509e3ef1f29d8' }
    @{ G = 'B'; B = 'wo/pharmacyhub-qr-missing-family-census'; Sha = 'cfbe1d2207348bb3127761cf776deddc23717e51' }
    @{ G = 'B'; B = 'wo/pharmacy-hub-full-retirement-v1'; Sha = '5fa346ca128e974aa3a3af84ecd50b5bc0e400a9' }
    @{ G = 'B'; B = 'wo/home-discovery-doc-status'; Sha = '3a86d927d1320056e72d571d2767db0387fff9e5' }
    @{ G = 'B'; B = 'wo/pharmacy-hub-canonical-index-alignment-v1'; Sha = '770c20df9a1a432169687dac85e21a35115df23d' }
    @{ G = 'B'; B = 'wo/neture-service-realignment-v1'; Sha = 'bcdaa90fcc0333718d84c240589b0b8b748aadc1' }
    @{ G = 'B'; B = 'wo/email-auth-ui-smoke-record'; Sha = '6f6a02720b832dc5acaf0c9559356e9b8df33445' }
    @{ G = 'B'; B = 'work/operator-targets-9'; Sha = '6004ea3e0a4383160e224481c1f7fcfe6c59b75e' }
    @{ G = 'B'; B = 'docs/google-only-auth-cleanup-check'; Sha = 'd88f687a86daab5af9588b6c653cb60ede988635' }
    @{ G = 'B'; B = 'docs/enrollment-closeout'; Sha = '51903a125431d6d893cf268f5daefa65c8521185' }
    @{ G = 'B'; B = 'work/cross-service-my-store-runtime-contract-commonization-v1'; Sha = '26c7e0eb18e3787439e73a7050e89be86ff46669' }
    @{ G = 'B'; B = 'work/store-description-qr-audit-v1'; Sha = '9aa2a48f824ad3eb8eef4d3c3779ada7b78a5e11' }
    @{ G = 'C'; B = 'dependabot/github_actions/actions/setup-node-7'; Sha = '8833fe34b982a444100e0e6528fe47e36c14f408' }
    @{ G = 'C'; B = 'dependabot/github_actions/actions/upload-artifact-7'; Sha = '2e768fdd3576aa5743c68a178c25b2a6843b90d7' }
    @{ G = 'C'; B = 'wo/account-erasure-activation-20261104'; Sha = 'ea722c623865f5020ad94136c091dbb404d853ba' }
    @{ G = 'C'; B = 'wo/admin-operator-invitation-submit'; Sha = '2a9e844f17989b5cac01eccd3ecdbe4a81d973a2' }
    @{ G = 'C'; B = 'wo/admin-operator-invite-first'; Sha = '52f756e25cd6fb2cafce4fb9a206056784fa80c0' }
    @{ G = 'C'; B = 'wo/assistant-manual-knowledge'; Sha = 'cff446562c4b19ba454a76ce58d4c7a48070b37b' }
    @{ G = 'C'; B = 'wo/central-access-denial-reason'; Sha = '1f9639297833e2839d9585ae57355cec862de5f5' }
    @{ G = 'C'; B = 'wo/ci-command-driver-idle-exit'; Sha = '7c34d4c23479f9c31b0b8d228b6e06140d8861bb' }
    @{ G = 'C'; B = 'wo/ci-quality-deduplicate-package-builds'; Sha = '66c718577483eda43398a831e5802fe3c2cd5881' }
    @{ G = 'C'; B = 'wo/claude-code-env-setup'; Sha = '81976d0b720ad19492ea661807c24703e94ce4b6' }
    @{ G = 'C'; B = 'wo/common-ui-remaining-adoption'; Sha = 'a6db58f870d13c0dac008990acae1127508c716a' }
    @{ G = 'C'; B = 'wo/community-forum-ai-phase1'; Sha = '6063a21546f4d555795f35d999f00010c074e8e5' }
    @{ G = 'C'; B = 'wo/community-participation-operations'; Sha = 'de4d8661dd59b68e6fff1907b1b41fb2853dbe26' }
    @{ G = 'C'; B = 'wo/community-signage-ai-registration'; Sha = '0db4b2c834fd5b9dc11a60d4dea9c8abdbda1e50' }
    @{ G = 'C'; B = 'wo/consultation-access-guidance'; Sha = '8f541d8d1527b7b7582cba80845d344c97d70a92' }
    @{ G = 'C'; B = 'wo/consultation-customer-recovery'; Sha = '1a03dee6ffe154821a5491f7c94a91397be56845' }
    @{ G = 'C'; B = 'wo/consultation-improvement-todo'; Sha = 'd3a14e31709ed38a48e047802679cd3b9995c2f6' }
    @{ G = 'C'; B = 'wo/coop-member-test-race'; Sha = '0f2d59877b3c08850c38404c0dd930c67c2f6ecf' }
    @{ G = 'C'; B = 'wo/cooperation-opening-end-to-end-20261029'; Sha = '302dc490421ae8a9a6335e672b1cc6c308de0ea3' }
    @{ G = 'C'; B = 'wo/development-push-boundary'; Sha = '7af49e2409a91e13e01fff7711646bf3923404f9' }
    @{ G = 'C'; B = 'wo/display-playback-simplification'; Sha = '064ef06a37bbeaa468f49b646c6f30770ad7d42d' }
    @{ G = 'C'; B = 'wo/drugstore-brand-domain-20261031'; Sha = 'da8d2f674722bdeffefacd8bf901b2c99c4bae9a' }
    @{ G = 'C'; B = 'wo/drugstore-deploy-record-20261101'; Sha = '937c075b4da89e3ee853c02369e35612686ee185' }
    @{ G = 'C'; B = 'wo/drugstore-host-completion-20261101'; Sha = '6e6ca31171c89068a9f29bc7b3cd9d318fce139b' }
    @{ G = 'C'; B = 'wo/drugstore-host-cutover-20261101'; Sha = '4110397e7b37412450cce912d057456af8429e97' }
    @{ G = 'C'; B = 'wo/erasure-activation-record'; Sha = '9a5a2ea0896c09a5e8ee9629ac5ebefb36189750' }
    @{ G = 'C'; B = 'wo/erasure-job-missing-detection'; Sha = '0bfdb96aef34b69aa0703811a1f08f6cb0104465' }
    @{ G = 'C'; B = 'wo/github-app-token-issuer'; Sha = 'a70e9a4fc64ef1cf24da70d8d14d91f94ee2eabb' }
    @{ G = 'C'; B = 'wo/hospital-pharmacy-no-menu'; Sha = '0557fac3534ce95051ca1870cf0b9e7dee342434' }
    @{ G = 'C'; B = 'wo/iphone-signup-submit'; Sha = '9104683a20d6ec797d2ef474241b6aea395304f1' }
    @{ G = 'C'; B = 'wo/member-account-lifecycle-20261103'; Sha = 'af638c3025f2c57de0f5ee1f12e24ca872cbd7bb' }
    @{ G = 'C'; B = 'wo/member-erasure-simplification'; Sha = '1833e23552ea022888302fc5d5f382e405733bf4' }
    @{ G = 'C'; B = 'wo/member-profile-edit-20261104'; Sha = '8e0f234f40f2d5a5ded45743fb39113d249902f6' }
    @{ G = 'C'; B = 'wo/member-sonar-diagnostic-20261104'; Sha = 'c90c3838e8a50f733ae9dbf7e313d5668b64720f' }
    @{ G = 'C'; B = 'wo/o4o-private-ci-budget-v1'; Sha = '70df607bb92e258f937d3603628aee7b944823f6' }
    @{ G = 'C'; B = 'wo/partner-community-readiness-v1'; Sha = '3a91777d63f492291fa555cc634dc9c1e9c6babd' }
    @{ G = 'C'; B = 'wo/partner-community-v1'; Sha = '2e8ecfb0e5fec93ecfa1e7786585a4b64f9d39e1' }
    @{ G = 'C'; B = 'wo/pc-connection-update-delivery'; Sha = '61fce658ef3c68e6aae5e0e759bc56dccbf70d26' }
    @{ G = 'C'; B = 'wo/pharmacy-approval-auto-membership-20261031'; Sha = '87522125f8e2342c021cc51f36941c82a291e5fa' }
    @{ G = 'C'; B = 'wo/pharmacy-auto-membership-deploy-record-20261031'; Sha = 'c511a0df5ce7bc531c2d755b8a62a68c377a66ac' }
    @{ G = 'C'; B = 'wo/pharmacy-order-local-foundation'; Sha = '56eb24f002950a9590b923472eae1e6fd2cac9f9' }
    @{ G = 'C'; B = 'wo/pharmacy-residue-safe-cleanup'; Sha = '0fcc84bac57c057ece7cd46e6d2b4c8b79f2b01a' }
    @{ G = 'C'; B = 'wo/pharmacy-resource-transition-preparation'; Sha = '3e1c80c2348d5aa124a4c50c7da2f52b06ffc907' }
    @{ G = 'C'; B = 'wo/pharmacyhub-purge-gate-fixture-isolation'; Sha = 'a36f04191e6fe4c2aa17c867b3691b865552784f' }
    @{ G = 'C'; B = 'wo/pushed-work-integration-20261027'; Sha = '03343ce322a2391ed743d000c31e5bdb419efb91' }
    @{ G = 'C'; B = 'wo/rea-response-minimization-v1'; Sha = '36ba89ffa9b51a6d6e2457597af4523e4c5231db' }
    @{ G = 'C'; B = 'wo/readonly-db-rule'; Sha = 'c01aa012920adc55ad83d9d56a59818999c3e392' }
    @{ G = 'C'; B = 'wo/service-contact-operator-review'; Sha = 'b6761072defa0d8bc1e673e4f32dd9d6e668d221' }
    @{ G = 'C'; B = 'wo/settlement-notification-recovery'; Sha = 'aec942ce1ee5ce5d7c87dea76dfadb1dd03d8c17' }
    @{ G = 'C'; B = 'wo/signup-method-discovery-20261102'; Sha = '626def0c624038d29281635cd55a7064c4995a1e' }
    @{ G = 'C'; B = 'wo/social-first-login-20261103'; Sha = 'ae9f5d0d18c7d59baa2b73d93da15953cca56f67' }
    @{ G = 'C'; B = 'wo/standard-list-workspace-contract'; Sha = '65442eb7f1a01e26ef2fed0953ec8d4cdbe1269a' }
    @{ G = 'C'; B = 'wo/store-ai-overview-auth'; Sha = '7678cb5f0d3e754058245addb0d38b6e99f4ae22' }
    @{ G = 'C'; B = 'wo/store-content-flow-20261106'; Sha = 'd273af65ed11c5659161f13c891f84569a2f01c7' }
    @{ G = 'C'; B = 'wo/store-delivery-record-20261105'; Sha = '02b2fd5f9956ae80182b8553828a92b715989714' }
    @{ G = 'C'; B = 'wo/store-pc-setup-ux'; Sha = 'a3eb8656976a8980241550ac87af0373801b7923' }
    @{ G = 'C'; B = 'wo/store-playlist-authoring-required'; Sha = '051879468f93fe51cb1ecd1d14acd09c69fe7a63' }
    @{ G = 'C'; B = 'wo/store-playlist-delivery-record-20261105'; Sha = 'b49fdb358109b95bce04b07985d7b944b61682bf' }
    @{ G = 'C'; B = 'wo/store-signage-workspace-alignment-20261105'; Sha = '121c570f695927da8eb24585d3f4d132fecc66de' }
    @{ G = 'C'; B = 'wo/store-studio-menu-audit'; Sha = 'c888d37d36c7163162e8d1d181885873ea0f80cc' }
    @{ G = 'C'; B = 'wo/supplier-business-store-handoff'; Sha = 'ba48ec31ca795448c315ed6060d57ca48286d3cc' }
    @{ G = 'C'; B = 'wo/unified-operations-workspace'; Sha = 'f44ace602b2406aa37c36bc54d1f893802dd1f3e' }
    @{ G = 'OPT'; B = 'wo/store-daily-workflow-upgrade'; Sha = '40a33194a5713384c8884d5605ecf68cc220f8fb' }
    @{ G = 'OPT'; B = 'wo/store-signage-workspace'; Sha = 'aa7b209012a50abe3a13d6e523724bedfd10610e' }
    @{ G = 'OPT'; B = 'wo/store-video-single-list'; Sha = 'a3e6c131bb41fc193735151d427d0e970a9d6d54' }
)

git fetch origin --prune
if ($LASTEXITCODE -ne 0) { throw 'git fetch failed - abort' }

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'gh CLI not found; cannot re-check open PRs - abort' }
$OpenHeads = @(gh pr list --repo $Repo --state open --limit 300 --json headRefName --jq '.[].headRefName')
if ($LASTEXITCODE -ne 0) { throw 'open PR lookup failed - abort' }

$RemoteLines = @(git ls-remote --heads origin)
if ($LASTEXITCODE -ne 0) { throw 'git ls-remote failed - abort' }
$Remote = @{}
foreach ($line in $RemoteLines) {
    $parts = $line -split "`t"
    $Remote[($parts[1] -replace '^refs/heads/', '')] = $parts[0]
}

$ToDelete = New-Object System.Collections.Generic.List[object]
$Skipped  = New-Object System.Collections.Generic.List[string]
foreach ($t in $Targets) {
    if ($t.G -eq 'OPT' -and -not $IncludeOptional) { continue }
    if ($t.B -eq 'main') { $Skipped.Add("$($t.B) | main is never a target"); continue }
    if ($OpenHeads -contains $t.B) { $Skipped.Add("$($t.B) | has an open PR"); continue }
    if (-not $Remote.ContainsKey($t.B)) { $Skipped.Add("$($t.B) | already gone"); continue }
    if ($Remote[$t.B] -ne $t.Sha) { $Skipped.Add("$($t.B) | tip changed to $($Remote[$t.B].Substring(0,10)) - re-check needed"); continue }
    $ToDelete.Add($t)
}

Write-Host ("To delete: {0}  Skipped: {1}" -f $ToDelete.Count, $Skipped.Count)
foreach ($t in $ToDelete) { Write-Host ("  [{0}] {1}  {2}" -f $t.G, $t.B, $t.Sha.Substring(0,10)) }
if ($Skipped.Count -gt 0) { Write-Host 'Skipped:'; foreach ($s in $Skipped) { Write-Host "  $s" } }

if (-not $Execute) { Write-Host 'Preview only. Re-run with -Execute to delete.'; return }

$Failed = New-Object System.Collections.Generic.List[string]
foreach ($t in $ToDelete) {
    # Lease on the verified SHA: the server rejects the delete if the tip moved after ls-remote.
    git push origin ('--force-with-lease=refs/heads/' + $t.B + ':' + $t.Sha) --delete ('refs/heads/' + $t.B)
    if ($LASTEXITCODE -ne 0) { $Failed.Add("$($t.B) | delete rejected (tip moved or push error) - re-check") }
}
Write-Host ("Done: deleted {0}  failed {1}" -f ($ToDelete.Count - $Failed.Count), $Failed.Count)
foreach ($f in $Failed) { Write-Host "  failed: $f" }
git fetch origin --prune
```

## 7. 남은 판단 · 후속 제안

| 항목 | 다음 실행자 | 내용 |
|---|---|---|
| `wo/pharmacyhub-residual-integration` 재개 여부 | LOCAL → 통합 담당 | 운영 DB read-only 로 PH(`pharmacy-hub`) 서비스 키 · slug 를 가진 조직 · 모집 · 초대 · tablet device 행이 남아 있는지 확인한다. 남아 있으면 최신 main 기준 재현 기반 WO 를 만들고, 없으면 branch 를 삭제한다 |
| GlycoPharm `glycocare` scope 잔재 정리 | CLOUD | §3 #615 ①. 공용 타입(`packages/types`)을 포함하므로 shared module protocol 에 따라 소비처를 식별한 뒤 정리한다. 착수하면 `wo/four-service-full-retirement-v1` 삭제 |
| `work/store-description-qr-audit-v1` | 통합 담당 | 보안 확인 완료(§0-5): main 유입 이력 없음 · 개인정보 · 비밀값 없음 · 소유자 확인상 테스트용 자료. 별도 조치 없이 §6 스크립트의 일반 삭제 대상으로 처리 |

## 8. 검증 · 한계

- 실행한 것: `git fetch --unshallow` · 전 branch 의 `merge-tree` · `git cherry` · 커밋별 내용 존재율 · 반영 커밋의 PR 특정(GitHub API) · B-2 · B-3 PR 코멘트 · timeline 조회 · 삭제 목록과 열린 PR 대조(0건) · 중복 이름 0건.
- 한계: 내용 존재율은 "같은 줄이 main 의 같은 파일에 있는가" 만 본다. 파일이 이동 · 분할된 경우에는 실제보다 낮게 나온다. 그래서 `일부 반영` 2건은 줄 비율만으로 정하지 않고 PR 경위(#802 · #803 · #804 의 범위 기록)와 main 의 실제 잔재 검색(`glycocare` 8파일 · 삭제된 controller 3개)으로 판정했다.
- 운영 DB · GCP 는 조회하지 않았다. PH 잔여 데이터 존재 여부는 미확인이다(§7).
- 조사 뒤 새로 push 된 branch · 열린 PR 은 반영되지 않는다. 스크립트가 실행 시점에 다시 확인한다.

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건(§7 PH 잔여 재판정 · glycocare scope 정리)
