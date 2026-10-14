# PharmacyHub 완전 제거 — 새 작업공간 인계

> **상태**: ACTIVE
> **작성일**: 2026-10-14 · **최종 갱신**: 2026-10-14
> **근거 WO/IR**: [WO-O4O-PHARMACYHUB-RETIREMENT-TODO-V1](WO-O4O-PHARMACYHUB-RETIREMENT-TODO-V1.md)
> **인계 사유**: 사용자가 기존 Cloud 작업공간을 종료하고 새 작업공간에서 계속하기로 결정했다.
> **운영 상태 조회 기준**: 2026-10-14 02:59 UTC / 11:59 KST. 이후 상태는 새 세션에서 재조회한다.

## 1. 목표와 이미 승인된 범위

- o4o에서 PharmacyHub(PH)의 실행 코드·전용 운영 자원·전용 개발 데이터를 완전히 제거한다.
- 사용자는 PH를 실제 사용한 적이 없고 전용 데이터도 재사용하지 않는다고 명시했다. PH 전용 데이터 삭제, 일반적인 코드 수정·검증·push·PR 병합 및 필요한 운영 정리를 승인했다.
- 최초의 인쇄 QR 리다이렉트/도메인 유지 요구는 후속 승인으로 철회됐다. o4o의 PH 도메인 연결은 종료 대상이다.
- **Gabia 도메인 등록/자동연장은 사용자가 다른 용도로 재사용할 수 있도록 유지한다.** 다시 해제를 요청하지 않는다.
- Neture/KPA 등 다른 서비스의 공용 사용자·조직·상품·QR·매장·콘텐츠 및 Core 계정 삭제 보호는 유지한다. PH 문자열이나 이름만으로 공용 행을 삭제하지 않는다.
- 기존 PC Local Agent 설치본 업데이트는 다른 담당 에이전트의 범위다. 이 세션이 실 PC Agent를 갱신하지 않는다.

## 2. 완료된 운영 정리

아래는 앞선 실행 기록에 있는 완료 사항이다. 새 작업에서 재삭제하거나 QR 리다이렉트 유지 단계로 되돌아가지 않는다.

| 대상 | 완료 내용 |
|---|---|
| Cloud Run | `pharmacy-hub-web` 삭제·부재 검증 |
| Backend / NEG | `backend-pharmacy-hub-web`, `neg-pharmacy-hub-web` 삭제·부재 검증 |
| 관리 데이터 | PH 전용 관리 데이터 56행, 10개 테이블 정리·잔여 0 확인. 공용 identity는 보존 |
| URL map | PH root/www host rule 및 matcher 제거. 다른 서비스와 공유 LB 설정 보존 |
| Certificate Manager | `cm-entry-pharmacyhub-root`, `cm-entry-pharmacyhub-www`, `cm-cert-pharmacyhub`, `dns-auth-pharmacyhub-root`, `dns-auth-pharmacyhub-www` 제거 |
| 공유 인증서/LB | 공유 certificate map·proxy·다른 서비스 entry 보존 |
| Gabia DNS | 사용자가 PH root/www A 및 ACME CNAME 총 4개 레코드 삭제 확인 |
| WIF | 이전 운영 작업의 임시 제한은 사용자가 `WIF_RESTORED`로 복구·재조회 검증 확인 |

세부 실행 근거는 기존 TODO와 관련 WO에 있다. 현재 남은 개발/미디어 삭제와 위 관리 데이터 56행 삭제를 혼동하지 않는다.

## 3. 아직 삭제하지 않은 데이터

### 개발 데이터 — 고정 census

| 테이블 | 대상 행 | 처리 |
|---|---:|---|
| `checkout_order_logs` | 6 | PH 주문 로그 삭제 |
| `o4o_payments` | 6 | PH 전용 결제 삭제 |
| `offer_service_approvals` | 18 | PH 승인 관계 삭제 |
| `offer_service_prices` | 1 | PH 가격 관계 삭제 |
| `cms_contents` | 3 | PH 전용 콘텐츠 삭제 |
| `forum_category_requests` | 1 | PH 전용 신청 삭제 |
| `checkout_orders` | 6 | PH 주문 삭제 |
| `supplier_product_offers` | 19 | **행은 보존**. PH service key 관계 제거, 전용 제안 비활성화 및 distribution 정합 |

삭제는 총 **41행**이고 공급 제안 **19행의 PH 관계 변경**은 별도다. 공유 제안의 다른 service key·공개 상태·seller 허용 목록을 훼손하거나 공급 노출 범위를 확대하지 않는다.

### 미디어

- PH `media_assets` 4행, PH 소속 `media_entity_links` 1행, 개별 GCS 객체 4개.
- 확인된 링크는 **존재하지 않는 VIDEO Job의 OUTPUT**이다. 같은 고아 Job 식별자를 사용하는 다른 서비스의 자산/링크는 보존한다.
- 존재하는 Job, 고아 INPUT/INTERMEDIATE, 다른 서비스 자산·외부 UUID/URL/GCS 경로 참조는 보호한다.
- GCS bucket은 `o4o-media-library`로 고정하고 정확한 개별 객체 및 generation 조건으로만 처리한다. bucket/prefix 일괄 삭제는 하지 않는다.
- 이번 인계 시점까지 위 개발 데이터와 미디어/GCS의 실제 apply는 **미실행**이다.

## 4. 이번 세션에서 병합한 수정

| PR | 변경 | 결과 |
|---|---|---|
| [#551](https://github.com/Renagang21/o4o-platform/pull/551) | 활성 mutation trigger의 이름·속성·함수 지문 census | 병합. census `38487657820` 성공 |
| [#553](https://github.com/Renagang21/o4o-platform/pull/553) | 확인된 Core erasure fence를 활성 상태로 실행하는 호환 검사, advisory-before-table 잠금 순서 | 필수 CI·Codex 확인 후 병합. post-merge CI 통과 |
| [#561](https://github.com/Renagang21/o4o-platform/pull/561) | worker 진단: 고정 단계·형식 검증 SQLSTATE·실패 SQL SHA-256. 원문 SQL/parameter/error detail 비공개 | 병합 main `35f1dd39f35e287ec7cec9fd43ec19b065ceac62`. post-merge CI 통과 |
| [#566](https://github.com/Renagang21/o4o-platform/pull/566) | 개발 참조 검사에서 대상 패턴 materialize 및 source text 행당 1회 평가 | 필수 CI·Codex 무지적 후 병합. main `334094e7c57e21cc0d7d027cf728aea0558a671c` |

**#566의 post-merge CI는 인계 조회 시 아직 진행 중**이었다. 관리 화면 빌드·민감정보 guard는 통과했고 API Jest·Code Quality·CodeQL이 진행 중이었다. PR CI 통과와 main post-merge CI 통과를 구분한다. #566 병합 시 SonarCloud suite는 queued였으며 PASS라고 보고하지 않는다.

main `334094e7c57e21cc0d7d027cf728aea0558a671c`의 필수 CI 통과 전에는 다음 plan을 발행하지 않았다. 사용자의 작업공간 종료 요청 후 새 운영 실행을 발행하지 않는다.

## 5. 개발 plan 실패 원인과 최신 수정

### 실제 운영 오류

[development plan `38500564796`](https://github.com/Renagang21/o4o-platform/actions/runs/38500564796)은 main `6eeea05a2cb9bf7256d5c0157e3c8d91b1d53fa1`에서 실패했다. 관리자 로컬 로그:

```text
PH_PURGE_FAILED stage=purge code=57014 query_sha256=ff222aced979e0a253b3db17df17ae0aeb691914bfcf05a888660652151bc3ed
```

- `57014`는 PostgreSQL query cancellation이다. worker는 statement timeout 15초를 사용한다.
- 지문은 `public.product_identifiers.metadata`의 **비-FK 참조 검사 SQL과 정확히 일치**한다. 저장소의 테이블/컬럼 후보로 생성한 SQL을 해시 대조하여 확인했다.
- 대상 ID를 구성하는 7개 PH scope 조회와 JSON 문자열화가 반복 평가될 수 있는 구조였다.
- #566은 `MATERIALIZED` CTE에서 escaped literal LIKE 패턴 배열을 한 번 만들고, source text는 행당 한 번 평가하도록 변경했다.
- `%`, `_`, 역슬래시를 escape하고 `C` collation을 적용해 기존 case-sensitive literal substring 판정을 유지한다.
- **15초 제한·전체 application 컬럼 참조 검사·고정 census는 유지**한다. `product_identifiers`를 검사에서 제외하거나 timeout만 늘린 수정이 아니다.
- **수정 후 실제 운영 plan은 아직 실행하지 않았다.** 최적화가 운영에서 충분한지는 다음 plan으로 확인해야 한다.

### 실제 로컬 검증

- PH 단위 테스트 145 PASS, 선택 PG fixture 1 SKIP인 전체 실행과 별도로, 격리된 PostgreSQL 16 fixture를 실제 실행해 PASS했다.
- 상품 metadata 5,000행에서 실제 `EXPLAIN ANALYZE`의 대상 CTE producer `Actual Loops=1` 확인.
- 중첩 주문 로그 UUID 참조가 있으면 삭제 차단·rollback 확인.
- 특수문자 포함 legacy text ID에서 유사 문자열 허용/실제 literal 참조 차단 확인. 운영 schema/type 변경은 없다.
- 실제 승인된 Core fence 설치 상태의 plan/apply, `ACCOUNT_ERASURE_PENDING` 차단, rollback, fence 유지 확인.
- 두 connection의 advisory/table lock 순서를 plan/apply 모두 검증.
- 사용한 임시 DB container `ph-reference-timeout-fixture`는 제거했다. 운영 DB에 테스트 데이터를 쓰지 않았다.

## 6. 미디어 plan — 원인 확인 대기

[media plan `38500950060`](https://github.com/Renagang21/o4o-platform/actions/runs/38500950060)도 동일 main에서 Cloud Run 단계 실패로 종료됐다. **실제 worker 오류 코드는 아직 전달받지 못했다.** 개발 plan과 같은 원인이라고 단정하지 않는다. 미디어 worker에는 #566의 개발 참조 검사 최적화를 적용하지 않았다.

새 세션은 관리자에게 아래 읽기 전용 명령의 출력만 요청한다. 로그인 정보나 원문 DB 데이터는 받지 않는다.

```powershell
gcloud logging read 'resource.type="cloud_run_job" AND resource.labels.job_name="ph-media-38500950060-1" AND textPayload=~"^PH_(PURGE|DEV|MEDIA)_"' --project=netureyoutube --limit=20 --format="value(textPayload)"
```

아직 답변이 없는 것은 허가나 성공을 의미하지 않는다. 미디어 삭제는 실패 원인을 확인하고 안전한 plan을 완료한 뒤 진행한다.

## 7. Core / IAM / 실행 경계

### 활성 Core 보호 함수

- `supplier_product_offers`의 `public.account_erasure_write_fence`.
- BEFORE INSERT OR UPDATE FOR EACH ROW, type=23, enabled=O, plpgsql, securityDefiner=false.
- 함수 body SHA-256: `51cc91dfa608b87c5ac66564d67dc7f58d08e41e8132e01e271fc95fadf6bdb9`.
- migration `1791795139475-RetireLegacyErasureIdentityHashes.ts`와 census에서 정확히 일치했다.
- 정의/속성 변조, 보호 trigger 부재·비활성화, 다른 mutation trigger는 중단한다.
- trigger를 해제하거나 `o4o.erasure_operation` bypass를 설정하지 않는다. Core migration/함수를 PH 정리 목적으로 변경하지 않는다.

### IAM / WIF

- 프로젝트 `netureyoutube`, region `asia-northeast3`.
- provider `o4o-platform`, pool `github-actions`, location `global`.
- 이 세션에서 WIF 제한을 새로 적용하지 않았다. 마지막 관리자 확인은 원래 조건 복구 완료다. 새 운영 시작 전 실제 상태를 다시 조회한다.
- apply는 helper의 **정확한 flat `restrictedWifCondition(sha)`** 조건을 요구한다. 단순 `(original) && extra` 조건으로 대체하지 않는다.
- 관리자 로컬에 원래 조건을 백업하고 검증한 main SHA의 workflow로 일시 제한한 뒤 apply한다. 성공·실패와 관계없이 운영 window 종료 후 복구·재조회 검증한다.
- 이 Cloud 환경에는 GCP 관리자 인증이 없었다. provider 변경은 관리자 로컬 PowerShell로 수행했다. 새 환경에서도 먼저 실제 도구/권한을 확인한다.
- GitHub Actions 서비스계정에 임시 `roles/run.invoker` binding(title `ph-retirement-job-execution`, `ph-dev-`/`ph-media-` Job 범위)이 남아 있다. 종료 후 정확한 condition으로 제거해야 한다.
- `projects/netureyoutube/roles/pharmacyHubQrPlan` custom role/binding도 남아 있다. 사용 중인 공유 작업의 영향과 다른 사용자를 조사한 뒤 PH 임시 권한만 정리한다. 표준 배포/공용 계정 권한을 임의 제거하지 않는다.
- `PH_JOB_COMMAND_UNCONFIRMED permissions=run.jobs.execute`의 문자열은 **gcloud 명령명을 permission처럼 추출한 진단**이다. 실제 IAM 거부의 증거가 아니며, 그 문자열만으로 권한을 추가하지 않는다.

### 실행 경계

- 실제 write는 검토된 inline source를 현재 serving API의 immutable image에서 실행하는 일회성 Cloud Run Job으로만 수행한다. runner에서 직접 SQL write하지 않는다.
- standalone plan → 정확한 main/필수 CI/동시 운영 여부 재확인 → 일시 WIF 제한 → guarded apply → 잔여 census·GCS·공유 기능 확인 → 인증·임시 권한 복구/정리 순서를 따른다.
- 데이터 정리에 **무관한 누적 API promote는 필요하지 않다**. API bundle 실패나 계정 삭제 기능 등 별도 작업을 이 scope로 수정·배포하지 않는다.
- 과거 run/tag 재실행을 이용해 최신 main/CI/WIF/운영 잠금을 우회하지 않는다.

## 8. 새 작업공간 TODO — 이 순서로 진행

1. `AGENTS.md`, canonical index, 기존 TODO, 이 문서를 읽는다. 새 환경의 repository/worktree/branch/HEAD/status/진행 중 Git operation부터 확인한다.
2. 최신 `origin/main`에서 새 전용 branch/worktree를 만든다. 기존 `/workspace/o4o-platform`의 `work` branch 및 다른 세션의 변경을 건드리지 않는다.
3. #566 병합과 최신 main의 실제 필수 `CI Gate`(GitHub Actions app 15368) 완료를 재조회한다. 과거 snapshot SHA나 PR CI만 보고 main CI PASS로 간주하지 않는다.
4. running/queued/pending/waiting/requested의 모든 페이지·참조 workflow를 확인한다. main이 이동하면 현재 코드와 gate를 재확인한다. 다른 Cloud/로컬 운영 변경은 조회했다고 주장하지 않고 필요한 단독 운영 조건을 확인한다.
5. 수정된 **development standalone `plan`**을 실행해 참조 검사 통과와 고정 41행/19관계를 확인한다. 실패하면 새 진단의 SQLSTATE·query SHA를 확인하고 원인별 최소 수정한다.
6. 위 **미디어 실패 로그**를 확보해 원인을 확정한다. 필요한 수정·실제 fixture·CI·리뷰·PR 병합을 마친 뒤 standalone media plan으로 자산 4/링크 1/객체 4 및 generation/외부 참조를 확인한다.
7. successful plan과 운영 단독 진행 조건을 갖춘 범위만, 검증된 main SHA에 WIF를 일시 제한해 apply한다. DB/GCS 삭제는 승인돼 있으므로 같은 범위의 삭제 승인을 기계적으로 반복 요청하지 않는다. 새 위험 범위는 별도 확인한다.
8. 별도 read-only census로 PH 대상 잔여 0, 공급 제안 행/다른 keys 보존, 공유 identity/상품/콘텐츠/미디어 보존을 확인한다. GCS partial failure는 DB rollback 및 기존 generation/404 resume 계약에 따라 처리한다.
9. 이번 세션 및 앞선 세션의 실패 Job을 source/run/mode/image·terminal execution으로 확인한 뒤 정리한다. Job 이름만으로 삭제하지 않는다.
10. WIF 복구·검증, PH 임시 IAM binding/role의 안전한 종료를 진행한다. 공유 Demo 작업이 아직 PH-named workflow/helpers를 사용하므로 무작정 파일/allowlist를 삭제하지 말고 실제 소비처를 확인해 분리한다.
11. 현행 PH 코드·권한/등록·환경 연결의 잔여 조사와 문서 상태를 마무리한다. 과거 migration/적용 이력·역사 기록을 지우거나 과거 WO를 현행 정책처럼 다시 쓰지 않는다.
12. branch/worktree closure는 `AGENTS.md`의 main 반영·CI·미커밋·후속 작업 의존성을 확인한 뒤 수행한다.

## 9. 실패 실행/Job 인계 목록

| 실행 | 실제 확인 내용 | Job / 후속 |
|---|---|---|
| `38381041967` | 오래된 일반 실패. worker 미실행이라고 단정할 수 없음 | `ph-dev-38381041967-1` 상태/소유 확인 필요 |
| `38469425232` | Started=True, worker `PH_DEV_MUTATION_TRIGGER` 확인 | `ph-dev-38469425232-1` 조사용 보존 |
| `38494731550` | `PH_JOB_CI_REQUIRED`, create 전 중단 | Job 미생성 |
| `38496164336` | 관리자 worker `PH_PURGE_FAILED` 확인. 구 진단에 상세 SQLSTATE 없음 | `ph-dev-38496164336-1` 조사용 보존 |
| `38496961613` | CI 미확인 상태의 media 발행을 이 세션이 취소. 실제 로그 `PH_JOB_CI_REQUIRED` | Job 미생성. 성공 검증으로 취급 금지 |
| `38500564796` | `stage=purge code=57014`, product metadata SQL 지문 일치 | `ph-dev-38500564796-1` 조사용 보존 |
| `38500950060` | media Cloud Run 단계 실패. worker 진단 미확인 | `ph-media-38500950060-1` 상태/로그 확인 필요 |

위 Job 보존 정보는 후속 describe/list로 재확인한다. 이번 세션에서 실패 Job들을 삭제하지 않았다.

## 10. 코드·자료 위치 / 기존 작업공간

- `scripts/deployment/pharmacy-hub-development-purge.mjs`: 최신 개발 삭제/참조 검사.
- `scripts/deployment/pharmacy-hub-development-purge.pg.test.mjs`: 실제 격리 PG fixture. `PH_DEV_FIXTURE_URL`은 loopback 및 `ph_dev_purge_fixture` DB만 허용한다. 공유 DB를 연결하지 않는다.
- `scripts/deployment/pharmacy-hub-media-purge.mjs`: 아직 원인 확인 중인 미디어/GCS worker.
- `scripts/deployment/pharmacy-hub-administrative-purge-job.mjs`: inline job, exact WIF condition, live main/CI/운영 gate, 안전 진단.
- `scripts/deployment/pharmacy-hub-retirement-inventory.mjs`: read-only resource/schema/trigger census.
- `.github/workflows/pharmacyhub-qr-cutover.yml`: PH 및 공유 Demo 유지보수의 현행 workflow. 소비처 조사 없이 제거하지 않는다.
- 기존 worktree: `/workspace/o4o-pharmacyhub-retirement`.
- 기존 branch: `wo/pharmacyhub-purge-gate-fixture-isolation`. source HEAD `8575397c54bab89f1a31ccb7963a475761dfa05d`까지 #566에 반영됐다. 이 인계 문서는 후속 별도 커밋으로 게시한다.
- 기존 `/workspace/o4o-platform`의 `work` branch는 이 세션이 변경하지 않았다.
- `/tmp`에 있던 census JSON·GHA ZIP·쿼리 지문 대조 도구는 새 공간으로 자동 이전되지 않는다. 필요한 근거는 위 run/PR/문서로 다시 조회한다. 비밀 값·DB 행 원문을 이전하지 않는다.
- 작업공간 종료 요청 시 미커밋 코드 0. 인계 문서 commit/push 이후에도 남은 운영 작업 및 인계 의존성 때문에 기존 branch/worktree 판정은 **KEEP**다. 새 작업공간에서 읽었다는 확인 없이 제거하지 않는다.

## 새 Cloud 작업에 전달할 지시문

> 이 인계 문서와 기존 PharmacyHub retirement TODO를 읽고 최신 main 기준으로 이어서 진행하세요. PH 전용 개발/미디어 데이터 삭제는 이미 승인됐지만 실제 apply는 아직 실행하지 않았습니다. #566의 post-merge 필수 CI를 먼저 확인하고 수정된 development plan을 실행하세요. media run 38500950060의 worker 오류 코드를 로컬 관리자에게 받아 원인을 확인하세요. Core fence·다른 서비스 데이터·현재 Git/운영 gate를 보존하고, 필요한 권한 작업은 전체 복사 가능한 PowerShell 명령으로 준비하세요. Gabia 도메인 등록/자동연장은 유지하고 PC Local Agent는 다른 담당 범위로 두세요. 기존 작업공간의 미커밋 변경이나 새로운 운영 작업이 종료됐다고 조회 없이 단정하지 마세요.
