# 내 매장 잔여 업무 흐름 검증

> 상태: ACTIVE
> 작성일: 2026-10-11 · 최종 갱신: 2026-10-11
> 근거: [실제 계정 CHECK](../checks/CHECK-O4O-STORE-REAL-WORKFLOW-VERIFICATION-V1.md)
> 범위: 브라우저 업무 화면·사본 독립성 검증, 미완료 운영 조건 조사

## 이번 실행

계정은 로컬 전용 `docs/local/TEST-ACCOUNTS.local.md`가 지정한 canonical Store Owner를 사용했다. 이전 private 생성 기록의 유지 매장 A를 선택했다. 새 계정·매장·자격·운영 콘텐츠를 만들거나 기존 업무 데이터·권한을 변경하지 않았다. 실제 운영 API는 로그인과 기존 자료 조회에 사용했고, 원본 변경 실험은 격리 로컬 PostgreSQL에서 실행했다.

현재 서비스 정본에 따라 `pharmacy.neture.co.kr`에서 로그인하고 `store.neture.co.kr`의 통합 내 매장 화면으로 handoff했다. Chromium·Playwright를 사용했으며 TLS 검증을 유지했다. 최초 분회 host의 TLS 실패는 업무 화면 결과와 구분하며 약국 업무 host로 바로잡았다.

| 검증 | 결과 |
|---|---|
| 이메일·비밀번호 로그인, handoff, 기존 승인 매장 A 선택 | desktop 1440px / mobile 390px PASS |
| 내 매장, 자료함 콘텐츠, 자체 상품, QR, 태블릿 관리 직접 URL | 두 viewport에서 각 화면·인증 상태·대상 데이터 API 200 PASS |
| 내 매장 화면 링크로 자료함·QR·태블릿 관리 진입 | 두 viewport에서 각 목적 경로·대상 API 200 PASS |
| 브라우저 상태·API 검증 | 총 20개 PASS, 기록된 page error 및 실패 API 0 |

QR·태블릿 **관리 화면**을 브라우저로 확인했다. 실제 QR 스캔·등록 태블릿 출력·송출 품질·물리 기기 연결을 확인한 것은 아니다. 화면·응답 원문·계정·조직 식별자는 private 실행 기록에만 남겼다.

## 재현 가능한 로컬 사본 검증

`scripts/verification/store-copy-independence.local.mjs`는 현재 KPA resolver를 실행하고 실제 `AssetCopyService`·CMS/Snapshot entity를 격리 PostgreSQL database에서 사용한다. 명시적인 로컬 Unix socket이 없으면 연결 전에 실패한다. DDL 전에 서버 system identifier와 로컬 control file, backend PID와 로컬 postmaster, 실제 socket 설정을 대조한다. 새 fixture 연결에서도 같은 서버임을 재확인한 뒤 extension/schema를 생성한다. 무작위 이름의 자기 database만 생성·삭제하며 운영 연결 설정을 사용하지 않는다. Core·schema/migration·API 계약·dependency 변경은 없다.

실제 SQL로 6개 PASS: A/B 독립 복사, 원본 수정 후 기존 두 사본 불변, A 편집 후 원본/B 불변, 실제 Core 조직별 목록 격리·교차 수정 차단, 새 복사에 새 원본 버전 반영, 원본 archived 전환 후 신규 복사 차단 및 기존 사본 유지. A/B는 로컬 fixture 조직이며 정상 운영 매장 두 곳의 인증·업무 흐름을 증명하지 않는다.

SETUP에 따른 의존성 설치 후 실행한다. Linux 로컬 PostgreSQL의 control file/process 조회와 테스트 DB 생성 권한이 필요하다. 검증 대상 Core·CMS entity·KPA resolver는 현재 checkout source를 임시 디렉터리에 컴파일해 사용하며 기존 dist는 읽지 않는다.

```sh
LOCAL_COPY_PG_SOCKET=/path/to/local/postgresql/socket \
  node scripts/verification/store-copy-independence.local.mjs
```

별도 worktree는 `LOCAL_COPY_INSTALLED_ROOT`로 의존성이 설치된 기준 checkout을 지정할 수 있다. 이는 pg·typeorm·TypeScript 의존성 선택용이며 검증할 프로젝트 source와 dist 선택용이 아니다. `LOCAL_COPY_PG_USER`는 로컬 DB 사용자 선택, `LOCAL_COPY_RESULT_FILE`은 결과 JSON 경로다. 비밀번호·운영 DB URL을 입력받지 않는다. 확인되지 않은 SQL proxy socket은 실제 연결 후 DDL 0건으로 차단되고, 설치 root의 stale dist를 의도적으로 오류 코드로 바꾼 격리 fixture에서도 현재 source의 6개 검증만 실행됨을 확인했다. 기존 설치 파일은 수정하지 않았다.

## 운영 조건과 기존 미완료 작업

실제 `/auth/me`에서 현재 테스트 계정의 CMS 운영자 권한이 없음을 확인했다. 로컬 계정 안내에는 기존 운영자 인증 정보가 없다. 기존 공유 CMS 원본을 수정하거나 권한을 새로 발급하지 않았다. 운영 원본 변경 검증은 기존 운영자 인증 또는 별도로 검토된 정비 실행 경로가 필요하다.

이 WO의 최초 브라우저 검증 단계에서 접근 가능 조직 목록은 실제 API·브라우저 모두 **17개**였다. 17개 서비스 해석 조회가 200/resolved이며 그중 활성 KPA 업무 연결은 6개다. 이 수를 정상 개설 약국 수로 해석하지 않는다. 사용자가 확인한 정상 유지 매장은 A 하나다.

이는 이번 사본 cleanup으로 매장이 다시 생긴 결과가 아니다. PR #418의 전체 테스트 매장 정리 plan 38058271623은 참조 안전 검사에서 실패했고 DELETE가 미실행 상태였다. PR #426은 참조 진단을 보강해 main에 반영했으며 기존 로컬 안내도 17개 잔존·정리 미완료를 기록하고 있다. 이전 사본 cleanup은 정확히 snapshot·편집·게시 제어 3행만 정리했다. 16개 테스트 조직의 전체 정리는 기존 참조별 삭제/보존 규칙을 확정하고 새 plan을 확인해야 한다.

## TODO

- [x] 정본·로컬 계정 안내·기존 정리 이력 조사
- [x] desktop/mobile 실제 계정 로그인·매장 A 선택·직접 URL 검증
- [x] desktop/mobile 실제 메뉴 링크 진입 및 데이터 API 검증
- [x] 현재 resolver/Core로 원본 변경·재복사·2개 로컬 조직 격리 검증
- [x] 로컬 검증 실행 도구를 저장소에 보관
- [x] 필수 CI·리뷰·main 통합 및 사후 확인
- [ ] 운영 검증 전용 원본 변경 후 사본 유지 확인
- [ ] 정상 승인 업무 매장 두 곳 간 전환·작성·게시 확인
- [x] 기존 16개 테스트 조직의 차단 참조 처리 및 전체 정리
- [ ] 실제 QR 스캔·태블릿 기기 출력 확인

이번 완료 범위는 브라우저와 로컬 계약 검증이다. 운영 원본 변경·두 정상 매장·전체 조직 정리·물리 기기는 열린 TODO로 유지한다. DEPLOYMENT = NOT_APPLICABLE: 검증 도구·기록만 변경한다.


## 자동 리뷰 보완

PR #470의 두 P1 finding(원격 proxy socket을 로컬로 오인할 가능성, stale dist 재사용)을 반영했다. 단순 경로/소스 일치 비교 대신 실제 로컬 서버 identity를 DDL 전에 확인하고, 검증 코드 전체를 현재 source에서 컴파일한다. 보완한 실제 SQL 6개와 proxy 차단·stale artifact 비사용 검증이 통과했다.

## 기존 조직 정리 read-only 재진단

기존 16개 삭제 후보와 유지 매장 A를 명시한 read-only plan 38128450487은 main `e1cd3b187861f22edd15c0ff2e05f4a43af1091f`에서 실행했고 참조 검사로 중단됐다. apply를 요청하지 않았고 데이터 삭제는 0건이다.

| 미모델링 참조 | 일치 행 수 | 참조 대상 |
|---|---:|---|
| `checkout_orders.sellerId` | 14 | organizations |
| `checkout_orders.sellerOrganizationId` | 14 | organizations |
| `kpa_operator_audit_logs.target_id` | 2 | kpa_members |
| `organization_product_listings.source_id` | 1 | organization_product_listings |

두 주문 컬럼의 수를 더해 주문 28건으로 해석하지 않는다. 코드의 주문 판매자/조직 구분, 감사 로그의 `target_type`, 상품 출처의 `source_type`은 서로 다른 의미를 가진다. UUID가 일치한다는 사실만으로 범용 cascade 삭제 규칙을 추가하지 않는다. 후속 정리는 후보 조직별 주문의 종속 관계와 보존 범위, 감사 대상의 기록 보존 방식, 다른 매장의 상품 출처 참조 여부를 먼저 확인하고 삭제·보존 규칙과 새 plan을 검증해야 한다. 운영자·관리자 계정은 계속 보존한다.

## main 통합 기록

PR #470은 최신 head의 CI 38128964948, SonarCloud 및 CodeQL 38128964933을 통과했고 두 P1 스레드의 보완·해결을 확인했다. main merge commit은 `c8903e1b8a013c8d6424af727bd75aa3ec8cf2ca`다. 동일 WO 결과 기록 Phase는 기존 전용 worktree/branch를 이어 사용한다. 검증 도구와 문서만 변경하므로 DEPLOYMENT = NOT_APPLICABLE이다.

main 사후 CI 38129545596과 CodeQL 38129545592도 PASS다. main 포함을 확인했으며 동일 WO 기록 Phase의 문서 PR #472로 결과와 기존 조직 정리의 차단 원인을 동기화한다. 전체 WO 상태는 미완료 운영·기기 TODO 때문에 ACTIVE로 유지한다.

## 후속 운영 정리 완료

[참조 삭제·보존 WO](WO-O4O-DEMO-STORE-CLEANUP-REFERENCE-DISPOSITION-V1.md)의 PR #476·#477로 주문 소유 관계와 감사·출처 보존을 모델링했다. 운영 plan 38134169210과 동일 digest의 apply 38135279630이 성공해 기존 16개 테스트 매장과 종속 352행을 정리했다. 감사·출처 17행과 모든 사용자 계정은 보존했다. 사후 discovery 38136199586은 기존 삭제 후보 0개와 원래 유지 관계·계정 수 보존을 확인했다.

현재 실제 테스트 계정의 접근 매장은 **1개**이며 유지 매장 A다. 사후 desktop/mobile 브라우저 20개와 공급자 로그인·본인 조회도 PASS다. 앞의 17개 잔존 및 참조 차단 표는 이전 단계의 실행 이력이며 현재 정리 미완료 상태를 뜻하지 않는다. 운영 원본 변경·두 정상 승인 매장·물리 기기 확인은 여전히 열린 TODO다.
