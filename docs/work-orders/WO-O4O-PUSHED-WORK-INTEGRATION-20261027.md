# Push된 작업의 main 통합 조사와 실행

> **상태**: ACTIVE · **작성일**: 2026-10-27 (Asia/Seoul)
> **근거**: 사용자 요청 — push됐지만 main에 반영되지 않은 작업의 통합
> **DEPLOYMENT**: main 반영과 구분. 운영 배포는 기존 Delivery 판정 및 DB write 승인 범위를 따른다.

## 조사 범위와 판정

GitHub 원격 branch 전체를 가져와 main 조상 관계를 비교했다. 최초 단순 미병합 32개를 발견했고, PR의 실제 병합 이력·동일 patch(`git cherry`)·merge 결과 tree·현행 경로와 종료 근거를 함께 확인했다. 로컬 refspec이 main만 추적하던 상태를 전체 원격 head 조회로 보완했다.

| branch | 판정 | 근거/조치 |
|---|---|---|
| `docs/enrollment-closeout` | 구버전 보존 / 자동 재개 제외 | 과거 실행·종료 기록. main의 2026-10-15 이후 검증·역할 정책을 보존하며 과거 상태로 덮어쓰지 않음. |
| `docs/google-only-auth-cleanup-check` | 구버전 보존 / 자동 재개 제외 | 2026-09-26 기록. 이후 인증·등록 CHECK와 충돌하며 현행 원장을 과거 상태로 바꾸지 않음. |
| `wo/ai-model-delete-usability` | 동일 patch 반영 | branch 전용 모든 commit이 main과 patch-equivalent임을 확인. |
| `wo/assistant-product-naming` | 통합 대상 | 기존 PR #842/#833 재사용 또는 이번 통합 branch에서 원래 commit 이력을 보존해 병합. |
| `wo/claude-autonomous-delivery-permissions` | 구버전 보존 / 자동 재개 제외 | #700은 현재 main의 d934482058/b0f094c8d3 권한 정책으로 대체됐다는 종료 근거 확인. |
| `wo/consultation-cleanup-observation-20261026` | 통합 대상 | 기존 PR #842/#833 재사용 또는 이번 통합 branch에서 원래 commit 이력을 보존해 병합. |
| `wo/coop-frontend-only-api-gate` | 구버전 보존 / 자동 재개 제외 | #786은 main 521ec12c7f의 Delivery 판정으로 대체됐다는 종료 근거 확인. |
| `wo/email-auth-ui-smoke-record` | 구버전 보존 / 자동 재개 제외 | 과거 운영 관찰 기록. 이후 CHECK와 충돌하므로 현행 인증 검증 상태를 보존. |
| `wo/four-service-full-retirement-v1` | 구버전 보존 / 자동 재개 제외 | #615는 #803/#804로 한정 재개·병합·배포됨. 원본의 구 공급등록/종료 SQL을 복원하지 않음. |
| `wo/frontend-design-accessibility` | 이미 반영 | 같은 head의 PR MERGED 확인. squash로 commit 조상 관계가 달라도 재적용하지 않음. |
| `wo/github-app-token-issuer` | 통합 대상 | 기존 PR #842/#833 재사용 또는 이번 통합 branch에서 원래 commit 이력을 보존해 병합. |
| `wo/home-discovery-doc-status` | 구버전 보존 / 자동 재개 제외 | #409 종료 상태. 현재 구현·색인의 후속 상태와 충돌하는 구버전 문서 변경을 되돌리지 않음. |
| `wo/megapharm-requirements-documentation` | 통합 대상 | 기존 PR #842/#833 재사용 또는 이번 통합 branch에서 원래 commit 이력을 보존해 병합. |
| `wo/my-home-document-alignment` | 이미 반영 | 같은 head의 PR MERGED 확인. squash로 commit 조상 관계가 달라도 재적용하지 않음. |
| `wo/neture-host-static-seo` | 이미 반영 | 같은 head의 PR MERGED 확인. squash로 commit 조상 관계가 달라도 재적용하지 않음. |
| `wo/neture-service-realignment-v1` | 구버전 보존 / 자동 재개 제외 | #364 이후 상태 기록. 현재 체크리스트와 충돌하는 과거 완료/미완료 판정은 복원하지 않음. |
| `wo/o4o-proprietary-license-notice-v1` | 결과 동일 | merge 결과 tree가 main과 같음. 중복 적용 불필요. |
| `wo/partner-support-workspace-v1` | 통합 대상 | 기존 PR #842/#833 재사용 또는 이번 통합 branch에서 원래 commit 이력을 보존해 병합. |
| `wo/pharmacy-coop-foundation` | 동일 patch 반영 | branch 전용 모든 commit이 main과 patch-equivalent임을 확인. |
| `wo/pharmacy-hub-canonical-index-alignment-v1` | 구버전 보존 / 자동 재개 제외 | #380은 #427 폐기 정책으로 대체됐다고 명시적으로 종료. 폐기 정책의 ACTIVE를 무효화하지 않음. |
| `wo/pharmacy-hub-full-retirement-v1` | 구버전 보존 / 자동 재개 제외 | #373은 #609로 대체 종료. 현재 유지 중인 purge 도구와 후속 공유 Core 경계를 삭제하지 않음. |
| `wo/pharmacy-resource-transition-preparation` | 통합 대상 | 기존 PR #842/#833 재사용 또는 이번 통합 branch에서 원래 commit 이력을 보존해 병합. |
| `wo/pharmacyhub-purge-gate-fixture-isolation` | 동일 patch 반영 | branch 전용 모든 commit이 main과 patch-equivalent임을 확인. |
| `wo/pharmacyhub-qr-missing-family-census` | 구버전 보존 / 자동 재개 제외 | #416은 이미 종료된 과거 보조 census 안. 현행 운영 정리 절차와 재평가할 대상이며 자동 재개하지 않음. |
| `wo/pharmacyhub-residual-guards` | 구버전 보존 / 자동 재개 제외 | #609 전체 head는 #610에 포함되어 중복 종료됨. 후속 #802가 현재 실패 재현 범위만 통합. |
| `wo/pharmacyhub-residual-integration` | 구버전 보존 / 자동 재개 제외 | #610 원본 대신 재현 기반 CMS·slug 수정 #802가 병합됨. 원본 전체 복원 금지 종료 근거 확인. 남은 조사 범위는 별도. |
| `wo/service-operator-assignment-audit` | 구버전 보존 / 자동 재개 제외 | #603은 #610으로 대체 종료. 이후 운영자 지정·초대 정책과 원장을 과거 판정으로 덮어쓰지 않음. |
| `wo/store-daily-workflow-upgrade` | 구버전 보존 / 자동 재개 제외 | 변경 파일 중 9개는 현재 main과 완전 동일. 나머지는 709f10a03d 이후 개선됨. 옛 입력/선택 로직으로 되돌리지 않음. |
| `wo/supplier-live-round-trip` | 구버전 보존 / 자동 재개 제외 | #598은 테스트 기록 보존 계획을 사용자 지시로 철회하고 #618로 대체됨. 철회된 계획을 재도입하지 않음. |
| `work/cross-service-my-store-runtime-contract-commonization-v1` | 구버전 보존 / 자동 재개 제외 | 현재 삭제된 GlycoPharm·K-Cosmetics client를 복원하는 충돌. 활성 공통 타입과 후속 퇴역 구현 보존. |
| `work/operator-targets-9` | 구버전 보존 / 자동 재개 제외 | 과거 조사 문서. main의 후속 IR·운영자 지정 정책과 충돌하므로 구 시점 판정으로 교체하지 않음. |
| `work/store-description-qr-audit-v1` | 구버전 보존 / 자동 재개 제외 | 과거 운영 원문 JSON 산출물이 포함됨. 공개 main에 원문을 추가하지 않고 최신 정리된 CHECK를 보존. |

6개 통합 대상과 7개 기반영/동일 결과를 구분한다. 나머지 19개를 신규 구현 완료나 main 병합 완료로 보고하지 않는다. 이들은 이미 종료·대체되었거나 현행과 충돌하는 과거 기록/구현이다. 기존 원격 branch나 다른 세션의 변경은 삭제하지 않는다.

## 실행

- #833: 최신 main 동기화·CI Gate·Sonar PASS, head `0458ec0366` Codex 무지적·미해결 thread 0 확인 후 정상 merge `c6693aed7a`.
- #842: draft 해제. SSH remote와 기존 Authorization extraHeader의 신원 우회를 수정하고 해석된 remote URL도 검사했다. 실제 Git 회귀 포함 14/14 PASS. 최신 main 동기화 및 재리뷰·CI 진행 중.
- 추가 4개 branch: Assistant 명칭 정합, MegaPharm 요구 문서, 상담 정리 관찰, 약국 리소스 전환 실행 기록을 기존 commit 이력으로 충돌 없이 통합.
- 펀딩 조사 결과는 코드 수정·push 작업이 아니므로 이번 통합의 신규 기능으로 포함하지 않는다.

운영 DB·GCP·App 설치·토큰 Secret·다른 PC worktree·다른 공간의 의도된 삭제 100건은 변경하지 않는다. 오래된 폐기/대체 branch 전체를 머지해서 퇴역 기능·옛 권한·철회된 테스트 보존 계획을 되살리지 않는다.

## 검증·남은 절차

통합 branch에서 현행 Node 22.18.0·pnpm 10.25.0으로 frozen 설치·변경 소비처 검증을 수행한다. 로컬 기본 pnpm/Node 버전 차이로 실패한 초기 설치는 lockfile을 수정하지 않고 지정 버전과 workspace cache로 재시도한다. 필수 CI와 최신 head 리뷰 통과 후 PR로 순차 통합한다. 직접 main push·admin bypass·force push는 사용하지 않는다.

로컬 통합 검증: Node 22.18.0·pnpm 10.25.0 frozen 설치·공통 package build PASS, Neture 관련 4 files/33 tests 및 API 2 suites/43 tests PASS, Neture production build PASS. 최초 Vitest 호출은 실행 디렉터리가 잘못되어 파일 0개였고 저장소 루트의 정식 config로 다시 실행해 통과했다. lockfile·manifest 변경은 없다. 기존 큰 bundle 경고는 유지한다.
