# PharmacyHub retirement TODO

> 상태: ACTIVE · 2026-10-10 · 사용자 범위: TODO 작성 → 조사로 보정 → 구현·검증·push

## 완전 제거 범위 확정 — 2026-10-10

사용자는 PH 재사용·전용 데이터 보존이 불필요하며 PH 전용 데이터 삭제도 승인했다. 다른 서비스의 공용 행·기능은 삭제 대상이 아니다. 기존 QR 연결용 도메인·DNS·인증서는 유지한다. 기존의 데이터 삭제 승인 대기 문구는 이 명시적 승인으로 해소됐다. 삭제 대상 귀속·FK·타 서비스 영향 확인은 계속 필요하다.

- [x] PR #417 CI·리뷰 확인 후 main 병합.
- [x] 전체 PH 호스트 리다이렉트 초안/실행 옵션 준비(`retire_host=true`). PH default backend·pathRules 참조를 제거하고 다른 host/matcher는 보존. 302·path/query 유지.
- [x] 새 코드 CI·리뷰·main 통합 후 `retire_host=true, mode=plan`의 변경 전후 map 확인.
- [x] URL map update·global operation 조회 권한 확인 후 전체 호스트 apply. 실제 QR/tablet·네 경로 규칙·root·기타 경로 302 검증. 실행 `38119869917` SUCCESS.
- [ ] 전체 URL map과 다른 backend/NEG에서 `pharmacy-hub-web` 참조가 없는지 확인. Cloud Run 삭제 권한과 대상 project/region 확인 후 전용 서비스 제거·부재 확인.
- [ ] 현재 DB schema/FK 및 PH 전용 테이블·service_key 행 목록 확인. 공용 조직·사용자·Neture QR/매장 데이터를 PH 문자열만으로 삭제하지 않음. PH 전용 데이터는 transaction 단위 삭제 계획 후 실제 삭제·잔여 건수 확인.
- [ ] 남은 PH 활성 등록·권한·호환 참조를 실제 공용 소비처 기준으로 제거. 과거 migration을 다시 실행하거나 migration 이력을 없애지 않음.
- [ ] 각 운영 실행 결과·잔여 blocker 기록. 전체 호스트 apply는 성공, Cloud Run·DB 삭제는 미완료.

전체 제거 phase는 사용자 지정 worktree를 유지하고 최신 main의 `wo/pharmacyhub-full-retirement`에서 수행한다.

## 최초 TODO — 이전 push 단계 기록

- [ ] 기존 네 URL 경로를 Neture 약국으로 리다이렉트하도록 구현 확인.
- [ ] 존재하는 QR·태블릿으로 실데이터 동작 확인.
- [ ] 다국어·제휴는 데이터 존재와 무관하게 리다이렉트 규칙 확인.
- [ ] 검증 후 기존 Cloud Run 제거, 도메인·DNS·인증서 유지.
- [x] 문서·구현·검증 범위 조사 완료. 실제 commit·push 결과는 실행 TODO를 따른다.

## 조사 후 보정

`pharmacy-hub-qr-redirect.mjs`는 네 경로를 이미 302·host 변경·query 보존 규칙으로 생성한다. `pharmacy-hub-qr-cutover.mjs`의 네 활성 경로 필수 조건이 폐기 목적과 충돌한다. 성공한 plan run `38047926623`에서는 QR·tablet만 발견됐다. PR #416의 추가 운영 집계는 이 작업의 선행 조건에서 제외한다.

설계 문서 §16-7에 따라 현재 단계는 PH default backend를 보존한다. 따라서 네 경로 검증만으로 Cloud Run을 삭제하면 나머지 PH 경로가 끊긴다. Cloud Run 제거 전 호스트 전체 리다이렉트로 default backend 참조를 없애고 잔여 결제 복귀·안내 경로를 확인하는 별도 운영 단계가 필요하다. 이번 push 범위에는 실제 LB 변경·Cloud Run 삭제·DB 삭제를 포함하지 않는다.

## 실행 TODO

- [x] 네 경로의 302·path/query 보존은 유지하고 필수 실데이터 probe를 QR·tablet으로 보정.
- [x] 다국어·제휴 미발견 시 명시적 규칙 검사 경로로 root·www의 302 Location을 검사하도록 구현. 가상 경로의 목적지 HTTP 200을 요구하거나 실데이터 검증으로 보고하지 않음. 운영 실행은 아직 아님.
- [x] 실데이터 목적지 HTTP 200, fingerprint·시간 상한·동시 변경 차단·롤백 보호 유지.
- [x] 안전 테스트 22개·문서 민감정보 검사·diff 검사 통과. 실행 단계 마지막으로 commit·push·PR 진행.
- [ ] 후속 운영: main 통합 → plan → 실제 QR·tablet 화면 검증과 apply·네 경로 리다이렉트 검사.
- [ ] 후속 운영: 전체 PH 호스트 리다이렉트로 backend 참조 해제 확인 후 `pharmacy-hub-web` 제거. 도메인·DNS·인증서는 유지.
- [ ] PH 전용 데이터 삭제는 사용자 승인 완료. 전용 귀속·FK·타 서비스 영향 확인 후 수행하며 실제 실행은 아직 하지 않음.

사용자 지정 worktree는 동일 폐기 WO의 연속 phase로 재사용하고 최신 main 기준 `wo/pharmacyhub-qr-retirement-validation`에서 수행한다. 과거 집계·네 probe 필수 기록은 당시 기록이며 현재 범위는 이 TODO를 따른다.

## PR #422 리뷰 대응

전체 호스트 plan은 Cloud SQL proxy·운영 경로 inventory·private probe 파일 읽기를 건너뛰며 URL map 조회·검증만 수행한다. apply는 실제 QR/tablet 경로 검증을 유지한다. 현재 사용자 승인에 따라 서비스 baseline의 PH 전용 데이터 보존 계약을 완전 폐기 정책으로 정렬했고 기존 WO는 이전 단계 기록으로 유지했다. 공용·Neture 데이터는 제외한다. 사용자 제공 IAM 결과에서 URL map update·global operation 조회 권한 추가를 확인했다. 실제 plan/apply 결과는 후속 실행으로 확인한다.

재리뷰 대응: 서브도메인·역할 업무공간·Store owner RBAC 정본에도 PH 전용 완전 폐기 예외를 정렬했다. 다른 서비스 정책은 유지한다. retire_host와 Demo census/relink/cleanup 동시 선택은 첫 gate에서 거부하여 PH 전환 미실행을 성공으로 보고하지 않는다.

최종 정책 대조: Store access/membership·RBAC role catalog·RBAC canonical state의 PH 가입/역할 재발급 계약에도 폐기 예외를 반영했다. 공통 RBAC/Freeze 및 다른 서비스 계약은 유지한다. PH 폐기 예외가 적용되는 정본 집합을 서비스 baseline에 명시했다.

Commerce/공통 소비처 대조: B2B 주문·checkout stable의 PH 축은 퇴역 잔여로 정렬했다. distribution freeze·supplier boundary·store content/signage/POP·commonization/operator/header에도 PH 폐기 예외를 반영하고 공통 계약은 유지했다. 공용 checkout/fulfillment/결제 테이블 통째 삭제는 금지하며 PH 전용 행 귀속을 조사한다. 개인정보/감사기록의 법정 보유 대상 여부도 분리 확인하며 서비스 폐기를 보유기간 면제로 해석하지 않는다.

약관 연결 리뷰 대응: PH `/terms`와 `/terms/`는 Neture 약국 `/policy`로 별도 302 전환하고 query를 유지한다. 다른 PH 경로는 기존 path/query를 보존한다. apply 검증은 두 옛 호스트의 약관 Location 및 Neture `/policy` HTTP 200도 요구하며 실패 시 기존 map으로 복구한다. 앱 변경·별도 앱 배포는 필요하지 않다.

SPA 검증 보강: QR은 읽기 전용 DB inventory로 활성 경로를 수집하고 HTML 200·302 Location을 확인한다. QR 공개 API(`kpa/qr/public/:slug`)는 실제 scan 원장을 쓰므로 자동 검증에서 호출하지 않는다. 태블릿은 HTML 200 외에 프런트가 사용하는 공개 API(`stores/:slug/tablet/products`·tabletId 유지)의 HTTP 200·JSON success/data를 apply 전후에 확인한다. HTML fallback·누락 데이터·API 실패는 전환 성공으로 처리하지 않고 원문 응답/매장 정보는 로그에 쓰지 않는다. 이는 공개 데이터 연결 확인이며 브라우저 화면·실물 QR 스캔 검증 완료를 뜻하지 않는다.

스캔 원장 리뷰 대응: 자동 QR 공개 API 호출은 제거했다. QR 데이터 확인은 기존 READ ONLY transaction inventory이며 자동 HTTP 요청은 정적 웹/리다이렉트에 한정한다. 태블릿 공개 데이터 API 검증은 유지한다. QR 브라우저 콘텐츠 및 실물 스캔 확인은 아직 미실행이다.

한글 slug 리뷰 대응: URL.pathname의 tablet slug를 decode 후 한 번 encode하여 원문·이미 percent-encoded 입력 모두 같은 공개 API 경로로 검증한다. 양쪽 입력과 tabletId 유지 회귀 테스트를 추가했다.

HTTPS proxy 리뷰 대응: `o4o-global-lb`는 HTTPS proxy의 application map이므로 redirect에서 `httpsRedirect: true`를 제거했다(전체 호스트·약관·기존 4경로 초안 모두). HTTPS 요청의 scheme은 유지한다. HTTP→HTTPS는 기존 별도 `neture-https-frontend-redirect` map이 담당하며 이를 수정하지 않는다. 인프라 근거: `docs/checks/WO-O4O-GCP-PRELAUNCH-COST-MINIMIZATION-CENSUS-V1-CHECK.md` 및 `WO-O4O-GCLB-REMOVE-UNUSED-FORWARDING-RULES-V1-CHECK.md`.

읽기 전용 QR payload 리뷰 대응: 기존 공개 QR API의 HEAD는 GET과 동일한 resolver/error status를 사용하되 scan INSERT를 건너뛴다. 일반 GET의 스캔 기록은 유지한다. 자동 검증은 먼저 slug 없는 기존 namespace의 HEAD 응답에서 지원 헤더를 확인하며, 지원이 없는 이전 API에는 실제 QR HEAD를 보내지 않고 apply 전에 중단한다. API 배포 후 실제 QR HEAD의 200·JSON content type 및 태블릿 JSON 데이터를 apply 전후에 확인한다. 새 debug/진단 HTTP route는 추가하지 않는다. 실제 API 배포·운영 전환은 아직 미실행이다. 다른 운영 작업 종료 후 이 세션이 URL map 변경을 단독 진행한다는 사용자 확인을 받았다.

2026-10-11 재리뷰 대응: 약관 `/policy` 목적지를 apply preflight에도 포함하여 불가용 시 URL map update 전에 중단한다. Frozen `NETURE-DISTRIBUTION-ENGINE-FREEZE-V1`에 넣었던 PH override는 이 혼합 PR에서 제외하고 origin/main 본문을 보존한다. 사용자 승인된 PH 폐기 정책의 Frozen 계약 변경은 canonical-index 정합과 함께 별도 문서 작업 #427에서 처리한다. 본 PR은 Frozen 변경 완료를 뜻하지 않는다.

Frozen 문서 전체 대조: Supplier 정본도 ACTIVE (FROZEN)이므로 PH override를 본 PR에서 제외하고 origin/main 본문으로 복원했다. Distribution·Supplier 두 Frozen 정본의 PH 판정 변경은 별도 문서 작업 #427로 묶는다. 변경된 문서의 상태 선언과 canonical index를 모두 대조했으며 나머지 변경 대상은 Frozen 정본이 아니다.

Canonical 문서 작업 경계 정정: ACTIVE/FROZEN 여부와 관계없이 기준 문서의 PH 정책 판정 변경 전체를 별도 canonical 작업 #427로 분리했다. 본 PR에서 architecture·baseline·RBAC 정본은 모두 origin/main과 동일하게 복원했다. 앞선 정렬 기록은 branch에서 검토한 단계 이력이며 canonical 통합 완료를 뜻하지 않는다. 사용자 승인된 PH 완전 폐기 정책의 정본 적용과 index 정합은 후속 문서 PR에서 함께 처리한다. 본 PR의 변경은 전환 코드·읽기 전용 검증·실행 기록이며 운영 삭제는 아직 미실행이다.

- 2026-10-11 리뷰 대응: workflow job-level skip을 제거하고 인증 이전 gate에서 입력 조합 및 Demo 소유자 권한을 명시적으로 검증한다. 비소유자 잘못된 조합도 실패하며 운영 자원에 접근하지 않는다. gate 5개 조합 검증 통과.


## 2026-10-11 운영 제거 후속 phase

동일 폐기 WO의 연속 phase로 사용자 지정 worktree를 유지하며 `wo/pharmacyhub-retirement-inventory`를 최신 main에서 생성했다. PR #422 병합(`9d1ee57f90`)·post-merge CI·Delivery `38094660443`의 API 배포는 성공했다. 운영 readiness HTTP 200 및 slug 없는 QR namespace HEAD의 읽기 전용 지원 헤더를 확인했다(404는 slug 없는 namespace의 정상 상태이며 실데이터 실패가 아니다).

전체 호스트 read-only plan `38095477480`은 SUCCESS, `applied:false`다. DB/probe 조회 없이 URL map 초안 검증을 통과했다. artifact 다운로드는 네트워크 차단으로 실패했다. 다른 운영 배포 종료 확인 후 전체 호스트 apply `38096187400`을 시작했으며 결과는 아직 미확정이다. Cloud Run/backend/데이터 삭제 완료를 뜻하지 않는다.

추가 운영 census는 `retirement_inventory=true, mode=plan` 전용이며 retire_host/Demo 동시 선택과 apply를 인증 전에 거부한다. production SQL은 READ ONLY transaction + timeout + ROLLBACK으로 테이블 schema/FK·PH namespace별 건수만 조회한다. 원문 행·사용자 식별자·credential은 출력하지 않는다. Cloud 자원은 list/describe만 수행하고 부족한 권한은 안전한 permission 이름으로 보고한다. 이 census는 삭제 계획 승인이나 PH 조직의 전용 귀속 판정이 아니다. 공용 조직·사용자·인쇄 QR/Neture 데이터 및 법정 보유 판단은 별도 보호한다.

- [x] API 읽기 전용 QR 지원 배포·검증.
- [x] 전체 호스트 URL map plan 검증.
- [ ] 전체 호스트 apply 및 실제 QR/tablet/rule HTTP 검증.
- [ ] resource/schema/scoped-row census push·CI·review·main 통합 후 운영 read-only 실행.
- [ ] census 결과로 전용 자원/FK/데이터 삭제 계획 확정 및 실행.
- [ ] PH 활성 참조 정리와 별도 정본 작업 #427.

운영 apply `38096187400`은 실제 QR/tablet 2종을 읽기 전용으로 발견하고 preflight를 통과했으나 옛 호스트의 302/path/query HTTP 검증에서 실패했다. 변경 도구는 기존 URL map을 복구·대조한 뒤 원래 검증 오류로 종료했다. Cloud Run/backend/데이터 삭제는 수행하지 않았다. 리다이렉트 검증의 실패 호스트·경로 종류·HTTP status·Location 일치 여부를 식별자 없는 진단으로 보강한다. 후속 census는 현재 PH matcher와 DNS 주소 일치 여부·고정 synthetic 경로 HTTPS 결과를 읽기 전용으로 확인해 복구 상태 및 DNS/라우팅 원인을 조사한다. 실제 IP/Location/DB 행 원문은 보고하지 않는다.

PR #438 리뷰 대응: `checkout_orders.metadata.serviceKey/source` 등 JSON/JSONB scope를 명시적으로 집계하고 해당 테이블을 FK 조사 집합에 포함했다. scalar/array scope와 JSONB scope는 겹칠 수 있으므로 건수를 합산해 삭제 총량으로 해석하지 않는다. 조사 도구 안전 테스트 7개, 리다이렉트 안전 진단 회귀 포함 focused tests 통과.

PR #438 추가 리뷰 대응: legacy quoted camelCase serviceKey/serviceCode/sourceService/sourceModule/serviceKeys/scopeKey도 안전한 식별자 quoting과 함께 집계한다. cms_contents.serviceKey의 PH 건수/FK 포함 회귀를 추가했다. SonarCloud 지적의 finally 내부 throw를 제거하고 원래 query 오류를 보존하는 rollback 처리로 정리했다. HTTPS/DNS 진단은 독립 요청을 bounded timeout으로 병렬 조회하고 진단 helper를 분리했다. 관련 focused tests 42개가 통과했다. 이 환경의 직접 DNS는 권한 요청 후에도 ECONNREFUSED이므로 실제 DNS/HTTPS 판정은 Actions census 결과를 따른다.

추가 census 범위/진단 리뷰: 등록된 pharmacy-hub-event-offer 키도 정확한 PH namespace 집계에 포함한다. 잘못된 Location은 별도 파싱 실패로 처리해 HTTP status와 Location 존재 여부를 보존하며 네트워크 장애로 오진하거나 원문 Location을 출력하지 않는다.

서비스 범위 컬럼 전수 대조: 명시적 scope 목록 외에도 schema의 모든 호환 text/text-array service 명칭 컬럼을 후보 집계한다. handoff_tokens.source_service_key/target_service_key와 seller_recruitments.service_id의 PH 건수/FK 포함 회귀를 추가했다. UUID service_id가 PH 문자열과 일치하지 않는 경우의 실제 귀속은 FK 관계로 별도 조사하며 이 후보 census로 삭제를 승인하지 않는다.


## 운영 census 진단 후속 — 2026-10-11

PR #438은 필수 CI·최신 Codex 리뷰·Sonar 통과 후 main `498ccbd9ea`로 병합했다. read-only census `38099121451`은 DB 단계에서 실패했으나 이미 정제된 오류의 code를 CLI에서 다시 정제하며 UNKNOWN으로 잃는 결함을 확인했다. 알려진 오류 code만 유지하며 DB 실패 시에도 독립 Cloud/DNS/HTTPS 진단은 수집하고 실행 상태는 실패로 유지한다. 원문 SQL 오류·credential·행 데이터는 계속 출력하지 않는다. 같은 폐기 WO의 연속 phase로 사용자 지정 worktree와 최신 main 기준 `wo/pharmacyhub-retirement-census-diagnostics`를 사용한다. 운영 변경·Cloud Run·데이터 삭제는 미실행이다.


read-only census `38099849484`: PH matcher는 기존 backend로 복구돼 있고 Cloud Run은 존재한다. root/www의 DNS는 API LB 주소와 일치하며 synthetic 6경로는 두 호스트 모두 HTTP 200·Location 없음이다. DB 오류는 여전히 UNKNOWN이며 gcloud list의 빈 결과도 권한 warning을 놓쳤을 수 있어 자원/데이터 부재 증거로 쓰지 않는다. 표준 SQLSTATE·검증된 schema context만 보존하고 exit 0인 gcloud 부분 실패 warning도 blocker로 처리하는 후속 진단 phase를 준비한다. 사용자 지정 worktree를 동일 WO의 `wo/pharmacyhub-retirement-census-context` phase로 유지한다. 리다이렉트 검증은 기존 6회/10초 retry가 이미 있어 반영 지연을 확정 원인으로 단정하지 않는다. 운영 삭제는 미실행이다.

HTTPS frontend 연결 진단: 기존 production proxy `o4o-global-lb-target-proxy-2`의 현재 URL map 연결도 describe로 조회한다. DNS 일치만으로 변경 map이 실제 HTTPS frontend에 연결됐다고 추론하지 않는다. 부족한 get 권한은 다른 census와 동일한 안전한 blocker로 보고한다.


## 운영 census 결과 확정 — 2026-10-11

PR #438·#441·#444는 필수 CI·최신 Codex 리뷰 통과 후 main에 병합했다. 정본 작업 PR #439도 병합했고 #427은 CLOSED, 병합 후 main CI는 PASS다. 이번 변경은 문서/Actions 운영 도구이며 앱 재배포는 NOT_APPLICABLE이다. 동일 WO의 결과 기록 phase는 사용자 지정 worktree의 `wo/pharmacyhub-retirement-census-report`(base `6ffe1316da`)를 사용한다.

read-only census [38101012970](https://github.com/Renagang21/o4o-platform/actions/runs/38101012970)은 SUCCESS다. 운영 DB BEGIN READ ONLY + timeout + ROLLBACK으로 조사했고 원문 행/개인정보/credential을 출력하지 않았다. 선행 census의 UNKNOWN은 진단/식별자 처리 보강 후 재현되지 않았으므로 과거 실패의 정확한 SQL 원인은 확정하지 않는다. SUCCESS는 DB 조회 및 진단 수집 성공이며 전체 제거 준비 완료가 아니다.

- PH 전용 테이블 접두사 `ph_`/`pharmacy_hub_`: 현재 발견 0. 테이블 이름만으로 PH 데이터가 없다고 판단하지 않는다.
- 공용 테이블의 PH namespace 후보: 주문 6 · 결제 6, service 등록 1 · roles 5 · role assignments 3 · memberships 2, enrollment 8 · store slug 8 · 상품 listing 19 · Offer service_keys 19, 승인 18 · 서비스 가격 1, CMS 3 · forum category 1 · media 4 · POP 4 · derivation 2, audience policy 1 · legal profile 1 · policy documents 3 · acceptances 2, action logs 33 · event logs 5. scalar/array/JSON 및 role/service_key 집계가 겹치므로 합산하지 않는다.
- schema FK 확인: 주문의 checkout_payments, 콘텐츠 slot, forum join/post, media links/self references, listing/channel, role_permissions, service enrollment, 정책 동의가 부모 행 삭제의 영향 범위다. CASCADE/SET NULL을 타 서비스 데이터 삭제 승인으로 해석하지 않는다.
- 현재 URL map PH matcher는 기존 `backend-pharmacy-hub-web`을 사용하고 Cloud Run `pharmacy-hub-web`은 존재한다. 두 옛 호스트의 DNS 주소는 API LB와 같으며 synthetic 6경로는 양쪽 모두 HTTP 200·Location 없음이다. 리다이렉트 적용 완료가 아니다.
- Cloud 조회 blocker: `compute.targetHttpsProxies.get`, `compute.urlMaps.list`, `compute.backendServices.list`, `compute.networkEndpointGroups.list`. gcloud exit 0의 권한 warning도 불완전 조회로 표시한다. 빈 목록을 참조 0으로 취급하지 않는다.

### 갱신된 실행 순서

1. 네 read 권한 추가 후 census 재실행 → 실제 HTTPS proxy/map 연결과 다른 map/backend/NEG의 PH 참조 확인.
2. 승인된 전체 PH 호스트 plan/apply → 현재 QR/tablet와 네 규칙/약관/root의 302·path/query 검증. 실패 시 기존 map 복구.
3. 참조 해제 확인 후 PH 전용 backend·NEG·Cloud Run 제거 및 부재 확인. 도메인·DNS·인증서는 인쇄 QR 연결 때문에 유지.
4. 아래 세 데이터 그룹의 정확한 부모/자식 집합과 영향 건수를 READ ONLY로 확정한 뒤 transaction별 제거·잔여 검사. 신규 승인 대기가 아니라 이미 승인된 범위의 대상 판정 단계다.
   - 폐기: PH 등록·역할·membership·enrollment·승인·서비스 가격·PH 전용 콘텐츠/설정/운영 데이터. 공용 사용자·조직·Offer 부모 자체는 자동 삭제하지 않는다.
   - Neture/인쇄 QR 연결 보호: 기존 slug·QR 식별자 및 실제로 Neture가 사용하는 조직/콘텐츠는 삭제 전에 귀속·교차 참조 확인. 필요한 연결은 Neture 기준으로 정렬하고 PH 운영을 복구하지 않는다.
   - 법정/증빙 판단: 발견된 주문·결제 6건의 실제 거래 여부와 법정 보유 의무, 약관/동의 증빙·접속 감사기록의 적용 기간을 확인. 서비스 종료를 법정 보유 면제로 취급하지 않는다. 단순 폐기 데이터는 승인대로 삭제한다.
5. 공용 코드의 PH admission/role grant/opt-in/catalog/commerce 호환 잔재 제거와 보안 deny 목록·migration 이력 보존을 구분해 검증 → PR/CI/리뷰/병합/필요한 API 배포. Offer service_keys에서 PH를 뺀 결과 빈 배열이 되어 상품이 새로 노출되지 않도록 보호.

실제 QR 전환·Cloud Run/backend/NEG·DB 삭제는 아직 미완료다. 워크트리는 운영 후속 작업과 blocker가 남아 KEEP이며 기존 `/workspace/o4o-platform`의 work branch는 변경하지 않았다.

## 조회 권한 해소 및 전환 재검증 — 2026-10-11

사용자가 네 read 권한을 추가한 뒤 census [38117381901](https://github.com/Renagang21/o4o-platform/actions/runs/38117381901)은 SUCCESS이며 Cloud blockers는 0이다. HTTPS proxy `o4o-global-lb-target-proxy-2`는 실제 `o4o-global-lb`를 사용한다. PH backend 참조는 이 map 하나이며 `backend-pharmacy-hub-web` → `neg-pharmacy-hub-web` → `pharmacy-hub-web` 전용 연결을 확인했다. 다른 backend의 이 NEG 참조는 발견되지 않았다. 옛 두 호스트는 아직 HTTP 200·Location 없음이다.

전체 호스트 plan [38117520110](https://github.com/Renagang21/o4o-platform/actions/runs/38117520110)은 SUCCESS(`applied=false`). 다른 운영 workflow 실행이 없음을 확인한 뒤 apply [38117605410](https://github.com/Renagang21/o4o-platform/actions/runs/38117605410)을 실행했으나 www QR의 HTTP 200·Location 없음으로 실패했다. Cloud Run/backend/NEG/DB 삭제는 실행하지 않았다. rollback 이후 census [38118536052](https://github.com/Renagang21/o4o-platform/actions/runs/38118536052)은 SUCCESS이며 PH matcher가 기존 backend로 복구됐고 Cloud blockers 0·Cloud Run 존재·옛 두 호스트 HTTP 200임을 재확인했다.

기존 검증은 최대 6회/10초 간격으로 약 50초 뒤 실패할 수 있었다. Compute operation DONE과 frontend 반영은 구분해야 하므로 동일 엄격 검증을 최대 5분까지 반복하도록 보강한다. 반영 지연은 아직 확정 원인이 아니며, 이 검증으로 확인한다. timeout 이후에는 기존 fingerprint·동시 변경 차단·검증된 rollback을 유지하고 workflow의 변경 전 25분 잔여 시간 gate도 유지한다. 지연 후 성공·기한 만료 rollback·이미 취소된 검증 회귀를 포함해 focused tests 52개 PASS다.

동일 WO의 연속 phase로 사용자 지정 worktree를 재사용하며 branch는 `wo/pharmacyhub-retirement-propagation`, base는 최신 main `4f75e2563a`다. 운영 전환은 성공으로 보고하지 않으며 자원·데이터 제거는 여전히 미완료다.

## 전체 호스트 전환 성공 및 자원 제거 phase — 2026-10-11

PR #456은 최신 main 반영 후 필수 CI·최신 Codex 리뷰 통과로 main `ffa4403ddf`에 병합했다. main 후속 CI [38119674074](https://github.com/Renagang21/o4o-platform/actions/runs/38119674074)도 SUCCESS다. 새 plan `38119686512` SUCCESS 후 다른 API Delivery 진행을 확인해 초기 apply `38119756522`를 checkout 단계에서 취소했다. GCP 인증/운영 단계는 실행되지 않았다. 다른 Delivery 완료 후 단독 재실행한 [38119869917](https://github.com/Renagang21/o4o-platform/actions/runs/38119869917)은 SUCCESS(`applied=true`, `httpVerified=true`, `activeFamiliesVerified=2`, `ruleOnlyFamiliesVerified=6`). 실제 QR/tablet 2종과 나머지 규칙/전체 호스트·약관 경로를 확인했다. 앱 재배포는 NOT_APPLICABLE이며 실제 URL map 전환 완료다.

다음 대상은 `backend-pharmacy-hub-web` → `neg-pharmacy-hub-web` → `pharmacy-hub-web` 세 자원이다. 동일 WO의 연속 phase로 지정 worktree의 최신 main 기반 `wo/pharmacyhub-resource-retirement`을 사용한다. `resource_retirement=true`의 standalone owner plan/apply 경로를 추가한다. complete URL map/backend/NEG 참조 조회, 두 옛 호스트의 12개 HTTP 규칙, 실제 QR/tablet read-only HEAD/API 검증, fixed-target 의존 순서 삭제, 매 삭제 전 재조회·시간 gate·삭제 후 부재 확인을 적용한다. 부분 삭제는 성공으로 보고하지 않고 다음 read-only plan에서 남은 고정 대상만 재개한다.

plan은 현재 Actions principal의 backend/NEG/Cloud Run 삭제 및 operation 조회 권한도 read-only `testIamPermissions`로 확인한다. 누락 시 apply는 삭제 전 차단된다. 도메인·DNS·인증서와 운영 DB는 이 도구의 삭제 대상이 아니다. 기존 Demo/copy 정리와 혼합 실행을 인증 전에 거부한다. 자원/DB 삭제는 아직 실행하지 않았으며 기존 DB/FK·법정 보유·공용/Neture 데이터 보호 TODO는 계속 유효하다.

PR #459 P1 리뷰 대응: PH workflow의 기존 concurrency만으로 다른 Delivery/API 배포를 직렬화할 수 없으므로, 매 삭제 직전 GitHub Actions의 Delivery/API/admin/web/다른 PH 실행·대기 상태를 완전 페이지 조회해 차단한다. 현재 자기 run과 CI는 제외하며 조회 권한·identity·metadata·pagination이 불완전하면 fail closed한다. 이 async gate를 await한 후에만 고정 대상 삭제를 실행한다. `actions: read`와 해당 step의 ephemeral GitHub token만 사용하며 다른 배포 workflow의 lock을 변경하지 않는다. 새 자원/삭제 자원의 재등장도 후속 삭제를 차단한다. 이 gate는 분산 원자 lock을 주장하지 않으며 AGENTS의 세션 간 단독 운영 확인도 계속 적용한다.

추가 P1 대응: 최상위 `promote.yml`과 `referenced_workflows`의 production reusable workflow도 gate에 포함한다. caller 이름만으로 호출된 Delivery를 놓치지 않으며 호출 metadata가 불완전하면 차단한다. 품질 검사 지적에 따라 Ubuntu runner의 gcloud를 고정 절대 경로로 실행하고 의존 순서 삭제는 직렬 promise chain으로 유지한다. 자원 안전 테스트 18 PASS다.

P2 리뷰 대응: 대상 NEG는 Seoul 리전 SERVERLESS 자원이므로 삭제 preflight는 존 NEG 권한 대신 `compute.regionNetworkEndpointGroups.delete`를 검사한다. 기존 read-only list 권한과 삭제 권한은 구분하며, plan에서 실제 principal의 누락 권한을 확인하기 전 삭제하지 않는다.

## 자원 제거 plan 실측 — 2026-10-11

동일 WO 연속 phase로 지정 worktree에서 최신 main 기반 `wo/pharmacyhub-resource-plan-result`에 결과를 기록한다. PR [#459](https://github.com/Renagang21/o4o-platform/pull/459)는 required CI [38124261262](https://github.com/Renagang21/o4o-platform/actions/runs/38124261262), SonarCloud 및 최신 HEAD Codex 리뷰 통과·미해결 스레드 0으로 main `c15e96b5cd`에 병합됐다. 앱 배포는 NOT_APPLICABLE이다.

읽기 전용 resource plan [38124839394](https://github.com/Renagang21/o4o-platform/actions/runs/38124839394)은 SUCCESS(`applied=false`, `httpVerified=true`). 고정 대상은 `backend-pharmacy-hub-web`, Seoul 리전 `neg-pharmacy-hub-web`, `pharmacy-hub-web` 세 개이며 URL map 분리·공용 참조·12개 HTTP 규칙과 실제 QR/tablet를 재검증했다. `compute.globalOperations.get`과 `run.services.delete`는 이미 유효하다. 실제 Actions principal에 없는 권한은 아래 세 개다.

- `compute.backendServices.delete`
- `compute.regionNetworkEndpointGroups.delete`
- `compute.regionOperations.get`

사용자 로컬의 IAM 관리 권한으로 기존 `pharmacyHubQrPlan` 역할에 이 세 권한을 추가해야 한다. Actions 계정에 스스로 IAM 정책을 수정할 권한을 부여하지 않는다. 권한 반영 후 새 read-only plan에서 missingPermissions가 비어 있음을 확인하고, 다른 운영 작업 종료·단독 진행·현재 gate를 확인한 뒤 resource apply → 세 자원 부재·QR 유지 검증을 진행한다. 이후 PH-only 데이터 소유/FK/법정 보유 조사 및 잔여 공용 코드 제거 TODO를 계속한다. 이번 실행은 Cloud Run/backend/NEG/DB를 삭제하지 않았으며 도메인·DNS·인증서는 유지한다. main 후속 CI [38124838980](https://github.com/Renagang21/o4o-platform/actions/runs/38124838980)은 이 기록 시점에 대기 중이며 PASS로 주장하지 않는다.

## 권한 해소·부분 자원 제거 및 재개 준비 — 2026-10-11

사용자가 삭제 권한 세 개를 기존 역할에 추가했다. 새 resource plan [38130540549](https://github.com/Renagang21/o4o-platform/actions/runs/38130540549)은 SUCCESS(`missingPermissions=[]`, `httpVerified=true`)이며 세 고정 대상이 남아 있었다. 앞선 main 후속 CI `38124838980`, `38125089787`도 SUCCESS를 확인했다.

다른 main CI `38130407287` 및 후속 API Delivery `38130997115` SUCCESS 후 다섯 active status 전체에서 운영 writer 부재를 확인하고 apply [38131427277](https://github.com/Renagang21/o4o-platform/actions/runs/38131427277)을 실행했다. 실행은 후속 삭제 직전 production run inventory의 완전성 검사에서 실패했다. 전체 제거 성공으로 보고하지 않는다. 새 read-only plan [38131645110](https://github.com/Renagang21/o4o-platform/actions/runs/38131645110)은 SUCCESS이며 남은 대상은 `pharmacy-hub-web` 하나, 누락 권한 0, QR 검증 PASS다. 백엔드와 NEG는 부재하며 Cloud Run/DB는 아직 제거하지 않았다.

불완전 조회를 수용하지 않고 count/list 불일치나 페이지 간 총건수 변화 시 다섯 status 전체 목록을 각 1페이지부터 2초 간격 최대 3회 read-only 재조회하도록 보강한다. 최종 불일치는 status/page/expected/returned 숫자만 진단하며 차단한다. 알려진 다른 운영 writer·구조/metadata 오류·권한/HTTP 오류는 그대로 즉시 차단한다. 불일치의 일시성은 아직 확정 원인으로 주장하지 않는다. 자원 안전 테스트 23 PASS이며 기존 권한/QR/참조/시간/삭제 후 부재/새 자원 재등장 차단 조건을 유지한다. 동일 WO의 연속 phase로 지정 worktree의 최신 main 기반 `wo/pharmacyhub-resource-gate-retry`에서 작업한다. CI·리뷰·병합 후 남은 Cloud Run만 재개한다. 앱 배포 NOT_APPLICABLE; DB/DNS/인증서 변경 없음.

PR #475 P1 리뷰 대응: 건수가 맞지 않는 페이지에도 다른 운영 writer가 반환되면 count 재시도 전에 즉시 차단한다. queued → in_progress 이동 중 병렬 status 조회가 이를 놓치는 경우를 회귀 테스트로 고정했다. 불완전 페이지의 모든 반환 항목을 먼저 검사하며 정상 metadata/완전 목록만 허용한다.

추가 P1 대응: count 불일치가 어느 status에서 발생하든 재시도는 다섯 status 전체를 다시 읽는다. 이전 병렬 요청도 allSettled로 완료·검사해 다른 분기의 알려진 writer나 metadata/권한 오류를 재시도로 숨기지 않는다. 반환되지 않은 queued 작업이 대기 중 in_progress로 이동하는 경우와 다른 분기의 writer 우선 차단을 회귀 테스트로 추가했다.

CI 선행 수정: 최신 main 통합 중 CI `38132871563`의 기존 `CommunityServiceAdminPage.test.tsx:121` 테스트가 실패했다. label/select는 초기 렌더에 있지만 option은 비동기 community 조회 후 생기므로, option 생성 전에 c1로 change하면 선택되지 않을 수 있었다. 후보 검색 테스트에 첫 커뮤니티 option 대기 한 줄을 추가해 실제 데이터가 로드된 뒤 선택하게 한다. 테스트를 생략하거나 업무 화면 동작을 변경하지 않는다. 이후 funding PR #474의 최신 main도 기존 통합 규칙에 따라 반영한다.

CI 선행 수정 검증: 해당 관리자 테스트 9 PASS. 로컬 공용 인증 패키지 산출물을 갱신한 뒤 CI와 동일한 web-neture Vitest 설정에서 전체 66파일·551테스트 PASS를 확인했다. tracked package.json/lockfile/업무 화면 변경은 없으며 옵션 대기 한 줄과 결과 기록만 추가했다.

## 운영 직렬화 보강 — PR #475 추가 P1 대응

status sweep 자체도 작업 상태 이동과 원자적이지 않다는 지적을 받아 현재 공식 production root workflow(Delivery/Promote/API/admin/web/PH)의 concurrency를 `o4o-production-mutation`으로 통일한다. 조회 gate는 보조 차단으로 유지하며 공통 잠금이 실제 다른 root 실행과의 상호 배제를 담당한다. 재사용 Delivery는 Promote 부모가 잠금을 보유할 때 run별 child group을 쓰고, 재사용 API/admin/web은 Delivery/Promote 부모 아래에서 기존 서비스별 child group을 유지한다. 부모와 자식이 같은 잠금을 재취득해 교착하거나 기존 단일 Delivery 내 서비스 배포 병렬성이 사라지지 않도록 한다.

알려진 caller 경로는 현재 repository의 direct workflow/Delivery/Promote다. 지원되지 않는 reusable caller는 detect/classify의 checkout·GCP 인증 전 gate에서 실패시키므로 잠금 소유권을 추정한 하위 호출이 진행되지 않는다. freeze·owner·CI·ref·WIF 규칙은 유지하며 IAM 수정·새 workflow 경로는 필요 없다. 실제 YAML expression을 해석해 direct root 공통 잠금, Promote/Delivery 중첩 호출의 ancestor 잠금 비재취득, 알 수 없는 caller의 pre-auth 실패를 검증했다. 자원/직렬화 안전 테스트 26 PASS이며 이 파일을 일반 required CI에도 연결한다.

GitHub concurrency는 `cancel-in-progress: false`, `queue: max`로 active 작업과 기존 pending 요청을 새 요청이 대체 취소하지 않게 한다. 공식 GitHub.com 지원 문서([queue 규칙](https://github.com/github/docs/blob/main/data/reusables/actions/actions-group-concurrency.md), [fpt/ghec 지원 범위](https://github.com/github/docs/blob/main/data/features/actions-nga.yml))에 따라 최대 100 pending 요청을 보존한다. 지원되지 않는 caller는 별도 run별 group에서 pre-auth 실패시켜 ancestor 잠금 대기 교착도 피한다. 운영 dispatch는 여전히 다른 실행·대기 작업이 없는 단독 창에서 진행한다. 이미 시작한 이전 버전 workflow에는 새 잠금이 소급 적용되지 않으므로 main 반영 후 기존 버전의 모든 알려진 운영 run이 종료됐는지 직접 상태 확인·drain한 뒤 PH apply를 재개한다. 현재 main의 공식 경로에 대한 직렬화이며 오래된 deployment tag의 과거 정의를 자동 변경한 것으로 주장하지 않는다. 업무 앱 재배포는 NOT_APPLICABLE, workflow 설정은 main 반영으로 새 실행에 적용된다. Cloud Run·PH DB 제거는 아직 미완료다.
