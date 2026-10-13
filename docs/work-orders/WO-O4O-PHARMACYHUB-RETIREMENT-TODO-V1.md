# PharmacyHub retirement TODO

> 상태: ACTIVE · 사용자 범위: TODO 작성 → 조사로 보정 → 구현·검증·push
> 현재(2026-10-13): PH 전용 backend·NEG·Cloud Run, 관리 데이터 56건 및 Certificate Manager 자원 5개 제거·검증 완료. Gabia DNS 삭제는 사용자 확인 완료. 최신 인증서 종료 실행의 WIF 원래 조건 복구·재조회 검증은 관리자가 WIF_RESTORED로 확인했다(과거 인증 smoke와 구분). PH 주문·결제·공급·콘텐츠·미디어/GCS 및 URL map 연결 종료는 미완료. PC Local Agent는 담당 에이전트 범위다.

## 완전 제거 범위 확정 — 2026-10-10

사용자는 PH 재사용·전용 데이터 보존이 불필요하며 PH 전용 데이터 삭제도 승인했다. 다른 서비스의 공용 행·기능은 삭제 대상이 아니다. 기존 QR 연결 보존은 2026-10-12 사용자 후속 승인으로 철회됐다. PH 도메인·DNS·인증서 연결도 종료한다. 기존의 데이터 삭제 승인 대기 문구는 이 명시적 승인으로 해소됐다. 삭제 대상 귀속·FK·타 서비스 영향 확인은 계속 필요하다.

- [x] PR #417 CI·리뷰 확인 후 main 병합.
- [x] 전체 PH 호스트 리다이렉트 초안/실행 옵션 준비(`retire_host=true`). PH default backend·pathRules 참조를 제거하고 다른 host/matcher는 보존. 302·path/query 유지.
- [x] 새 코드 CI·리뷰·main 통합 후 `retire_host=true, mode=plan`의 변경 전후 map 확인.
- [x] URL map update·global operation 조회 권한 확인 후 전체 호스트 apply. 실제 QR/tablet·네 경로 규칙·root·기타 경로 302 검증. 실행 `38119869917` SUCCESS.
- [x] 전체 URL map과 다른 backend/NEG의 PH 참조 해제·권한/project/region 확인 후 전용 backend·NEG·Cloud Run 제거·부재 확인. apply `38187016286` 및 독립 plan `38187187895` SUCCESS.
- [ ] 현재 DB schema/FK 및 PH 전용 테이블·service_key 행 목록 확인. 공용 조직·사용자·Neture QR/매장 데이터를 PH 문자열만으로 삭제하지 않음. PH 전용 데이터는 transaction 단위 삭제 계획 후 실제 삭제·잔여 건수 확인.
- [ ] 남은 PH 활성 등록·권한·호환 참조를 실제 공용 소비처 기준으로 제거. 과거 migration을 다시 실행하거나 migration 이력을 없애지 않음.
- [x] 이번 자원 제거 실행 결과·잔여 작업 기록. 전체 호스트 전환과 전용 자원 제거는 완료.
- [x] 일시 WIF 제한을 원래 조건으로 복구하고 read-only 인증 smoke 확인. 실행 38187804879 SUCCESS, WIF_AUTH_PASS 확인.
- [ ] PH-only DB/잔여 공용 코드 정리 및 최종 결과 기록.

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

### 추가 검증 및 외부 인증 경계 blocker

읽기 전용 plan [38134188272](https://github.com/Renagang21/o4o-platform/actions/runs/38134188272)은 SUCCESS이며 남은 자원은 `pharmacy-hub-web` 하나, `missingPermissions=[]`, `httpVerified=true`다. 다른 Demo 작업 `38134169210`도 종료했다. 아직 새 apply는 제출하지 않았다.

CI `38136277948`은 기존 배포 gate 테스트 두 곳이 과거 concurrency 문자열을 요구해서 실패했다. 서비스별 child group 유지와 direct root 공통 잠금, Promote 부모 아래 Delivery의 잠금 비재취득, `queue: max`를 검사하도록 갱신했다. 해당 gate 및 자원 안전 테스트 합계 110 PASS다.

추가 P1: 이전 `deploy/*` 태그 또는 이전 workflow 실행의 재실행은 과거 YAML을 쓰므로 main의 잠금만으로 완전히 차단되지 않는다. 이미 생성된 run drain과 사용자 단독 작업 합의만으로 기술적 차단이 완료됐다고 주장하지 않는다. PH 삭제 창에서는 WIF provider의 기존 조건을 보존한 채 main ref와 잠금이 포함된 특정 main workflow SHA만 인증하도록 외부 IAM 경계를 일시 제한해야 한다. `assertion.ref == 'refs/heads/main'`만 추가하면 과거 main 실행의 rerun이 통과하므로 충분하지 않다. root `workflow_sha`와 called `job_workflow_sha` 모두 동일한 검증된 main SHA로 제한하고, 기존 자격증명을 받은 run도 종료·만료됐는지 확인한다. 실제 provider 변경은 IAM 관리 권한이 있는 사용자가 수행하며, 복구할 원래 조건은 로컬에 보관한다. 이후 새 plan 인증 성공과 다른 production 실행 차단을 확인하기 전에는 apply하지 않는다. 현재 이 외부 인증 경계는 적용 전이며 P1을 해결했다고 기록하지 않는다.

### WIF 일시 차단 적용 확인 — 2026-10-11

사용자가 새 인증 정책 변경을 승인하고 로컬 IAM 관리자로 기존 provider 조건을 저장소 밖에 백업했다. provider update 성공 및 describe 결과 기존 조건 전체 뒤에 `&& false`가 붙었음을 확인했다. 과거 태그/이전 main 재실행을 포함한 신규 WIF 인증은 현재 차단된다. 기존 run에 이미 발급된 자격증명은 별도 종료 확인 대상이며 차단과 동시에 폐기된 것으로 주장하지 않는다. 최신 main 반영·필수 CI·리뷰 완료 후 PR #475를 병합하고, 새 main SHA의 PharmacyHub workflow만 인증하도록 로컬 IAM 관리자가 제한 조건을 적용한다. read-only plan 성공 이후 남은 Cloud Run 제거·QR 재검증을 진행하고 원래 조건으로 복구한다. 아직 새 main SHA 제한·Cloud Run 삭제·DB 삭제는 실행하지 않았다.

### 최종 범위 정리 — PR #475 P2 대응

공통 `queue: max`가 오래된 자동 Delivery를 누적시켜 최신 배포를 지연시키는 P2 지적을 수용했다. 전체 서비스의 concurrency/caller 변경과 이에 종속된 테스트 변경을 철회하고 기존 main의 배포 coalescing/child group 동작을 보존한다. 앞선 공통 잠금 설계와 26/110 테스트 기록은 당시 검증 이력이며 최종 구현이 아니다. 최종 구현은 불완전 Actions inventory의 제한된 전체-sweep 재조회, writer/metadata 오류 우선 차단, 해당 자원 테스트의 required CI 연결과 비동기 옵션 대기 수정이다. 실제 PH 삭제 창은 승인·적용된 외부 WIF 인증 차단 및 병합 후 단일 main SHA/PH workflow 제한으로 격리한다. status 조회만으로 원자적 잠금을 구현했다고 주장하지 않는다. 새 P1/P2는 이 외부 제한과 범위 축소로 대응하며, 제한 적용·새 plan 성공 전 apply는 금지한다.

## 잔여 활성 경로 0건 대응 — 2026-10-11

PR #475는 main a3462a0256에 병합됐고 main 후속 CI 38142397450 SUCCESS를 확인했다. 이후 main ec7a21d59d로 이동해 사용자가 WIF의 root/called workflow SHA 제한을 동일 SHA로 갱신했다. 해당 main CI 38144099865도 SUCCESS다. PH workflow 및 삭제 스크립트는 그 사이 변경되지 않았다.

읽기 전용 resource plan [38144701943](https://github.com/Renagang21/o4o-platform/actions/runs/38144701943)은 인증/DB 조회에 성공했지만 삭제 검증 단계에서 실패했다. private probe 수집의 요약은 네 종류 모두 false, foundFamilies=0이다. 실데이터가 없는 상황에서도 기존 parseProbes가 QR/tablet 두 종류를 필수 요구해 중단했다. 추가 read-only census [38144858219](https://github.com/Renagang21/o4o-platform/actions/runs/38144858219)은 SUCCESS이며 실제 삭제는 제출하지 않았다.

동일 WO 연속 phase로 지정 worktree의 최신 main 기반 wo/pharmacyhub-resource-empty-probes에서 보강한다. 자원 폐기 entrypoint만 active-family 필수를 해제한다. 일반 QR cutover는 기존 strict 기본값을 유지한다. 남아 있는 공개 경로는 동일 검증하고, 없을 때는 독립적인 12개 전체 호스트/경로/query/스킴 리다이렉트 검사와 자원 참조/권한/시간/동시 writer 차단을 모두 유지한다. 결과의 activeFamiliesVerified가 0이면 실제 데이터 검증 성공으로 보고하지 않는다. 빈 경로/단일 잔여 family/잘못된 URL·중복 경로 차단 회귀를 포함해 focused tests 53 PASS. CI·리뷰·병합 후 새 main SHA로 WIF를 제한해 plan → 잔여 Cloud Run 제거 → 재검증 → 원래 인증 조건 복구 순으로 진행한다. Cloud Run 및 PH-only DB 정리는 아직 미완료다.

## 전용 Cloud 자원 제거 완료 — 2026-10-12

PR #490은 필수 CI·최신 Codex 리뷰·Sonar 통과 후 main 55f0061df3에 병합됐다. 이후 main de23f34310까지 PH workflow/삭제 스크립트 변경이 없음을 확인했고 해당 main CI 38147807102도 SUCCESS다. 사용자가 WIF root/called workflow SHA 제한을 de23f34310으로 갱신한 뒤 단독 운영 창에서 진행했다.

- 읽기 전용 plan [38186892659](https://github.com/Renagang21/o4o-platform/actions/runs/38186892659): SUCCESS. 남은 대상 pharmacy-hub-web 하나, 누락 권한 0, httpVerified=true, activeFamiliesVerified=0.
- 적용 [38187016286](https://github.com/Renagang21/o4o-platform/actions/runs/38187016286): SUCCESS. applied=true, targets=[], httpVerified=true, databaseWrites=false, activeFamiliesVerified=0. 기존에 제거된 backend/NEG에 이어 Seoul의 전용 Cloud Run도 부재를 확인했다.
- 독립 읽기 전용 재검증 [38187187895](https://github.com/Renagang21/o4o-platform/actions/runs/38187187895): SUCCESS. targets=[], requiredPermissions=[], missingPermissions=[], httpVerified=true, activeFamiliesVerified=0. 전체 12개 host/route/path/query/scheme 리다이렉트 검사를 유지했다.

활성 네 종류 경로는 이번 inventory에서 0건이므로 실데이터 QR/tablet 동작이나 실제 브라우저/인쇄 QR 스캔 성공을 주장하지 않는다. 도메인·DNS·인증서는 유지하며 운영 DB write는 없었다. PH-only 주문/결제/역할/정책/상품 scope 데이터 및 공용 코드 잔재 정리는 계속 미완료다.

인증 복구는 이미 승인됐으나 클라우드 환경에는 IAM 관리용 연결이 없어 사용자 로컬 관리자로 수행해야 한다. 원래 조건 백업이 다른 PC에 있을 때도 현재 조건에서 이번에 추가한 정확한 PH/ref/root SHA/called SHA 제한 suffix만 제거하면 기존 기본 조건을 보존할 수 있다. 다른 변경이 감지되면 복구 명령은 중단한다. 실제 복구 describe와 read-only WIF smoke 결과 확인 전에는 인증 복구 완료로 기록하지 않는다.

동일 WO 연속 결과 기록 phase로 지정 worktree와 최신 main 기반 wo/pharmacyhub-resource-removal-result를 사용한다. 업무 앱 배포 NOT_APPLICABLE. WO 전체는 데이터/공용 코드/인증 복구 검증이 남아 ACTIVE·worktree KEEP다.

## 원래 WIF 인증 조건 복구 완료 — 2026-10-12

사용자 로컬 IAM 관리자가 현재 provider 조건에서 이번에 추가한 PH workflow/ref/root SHA/called SHA 제한 suffix만 제거했다. describe 결과 기존 repository/owner/environment/main·deploy-tag/event/허용 workflow 조건을 보존한 원래 기본 predicate를 확인했다. 바깥 괄호는 논리적 조건을 변경하지 않는다. SHA 고정 및 PH-only 인증 제한은 더 이상 유지하지 않는다.

실제 read-only 인증 smoke [38187804879](https://github.com/Renagang21/o4o-platform/actions/runs/38187804879)은 main 7ebd3548cb에서 SUCCESS다. WIF auth (read-only) job이 실행·성공했고 WIF_AUTH_PASS를 확인했다. GCP 인증, project 및 기존 core API serving metadata 조회만 수행했으며 배포·삭제·DB write·secret version 조회는 없었다. 제거 결과 기록 PR #492는 main 7ebd3548cb에 병합됐고 main 후속 CI 38187554411도 SUCCESS다.

전용 Cloud 자원 제거/12개 규칙 검증/일시 인증 제한 복구 phase는 완료다. PH-only DB·공용 코드 잔여 제거는 여전히 미완료이며 전체 WO는 ACTIVE·worktree KEEP다. 동일 WO 연속 결과 기록 phase로 지정 worktree의 최신 main 기반 wo/pharmacyhub-auth-restoration-result를 사용한다. 이번 변경은 문서-only, 업무 앱 배포 NOT_APPLICABLE이다.

## 최종 제거 연속 phase — 2026-10-12

사용자는 PH 데이터가 사용자 사용 이력 없는 개발 데이터뿐이며 PH·유사 개발 계획이 없고, 공통화 대상은 이미 서비스별 서브도메인으로 분리됐음을 확인했다. PH 전용 데이터 보존과 런타임 호환 유지, 인쇄 QR 연결 보존 예외를 철회하고 PH 전용 도메인/DNS/인증서 종료까지 승인했다. 공유 Neture/KPA 기능·사용자·조직·제품 master 전체 삭제 승인은 아니다.

최신 main `0db33efda8fb380ac08243fc5286707db414316c`와 지정 worktree의 동일 WO 연속 branch `wo/pharmacyhub-final-code-data-retirement`에서 진행한다. 기존 기준 checkout의 branch·파일은 변경하지 않는다.

- [x] 최신 main과 실제 소비처 조사. 전용 앱/API/배포 job은 이미 없음.
- [x] 서비스·역할·공급 opt-in·fulfillment PH 등록 제거, 공용 membership/약관/조직 처리의 PH 매핑 제거, 사용 참조 없는 KPA `PharmacyHubLayout` 삭제.
- [x] 삭제된 PH scope가 서비스 중립 API로 fallback하지 않도록 요청 경계에서 410 차단. 현재 Neture/KPA·hospital-pharmacy 요청은 유지.
- [x] 읽기 전용 운영 census [38195246677](https://github.com/Renagang21/o4o-platform/actions/runs/38195246677) SUCCESS. DB write 0. PH 전용 테이블 0; 공용 테이블의 PH scope는 아래와 같이 남음.
- [x] 변경 코드 CI·리뷰·main 반영 및 API/Admin/관련 공용 패키지 소비 앱 배포. 결과는 아래 2026-10-12 운영 후속 기록 참조.
- [ ] 실제 schema/FK/공유 소비처를 기준으로 PH row와 전용 종속 row 삭제 계획 고정·단독 운영 창에서 transaction 삭제·잔여 검증.
- [ ] PH-only 공급 scope 19건 제거 시 빈 service_keys가 기본 공급으로 노출되지 않도록 상품 귀속·비활성화/삭제 순서 검증.
- [ ] PH 도메인 DNS 관리 주체·인증서 공유 소비처 조사 후 DNS/PH redirect/전용 인증서 종료. 공유 LB·IP는 유지.
- [ ] 종료 후 PH-only workflow/도구 및 WIF workflow 허용 항목 정리. 현재 workflow는 Demo/Store 정리도 수행하므로 전체 파일을 바로 삭제하지 않음.
- [ ] 과거 migration 변경은 schema 재구축 및 적용 history 정합 조사 후 판정. 이번 phase에서 기존 migration·DB history 삭제/재실행 없음.

운영 census: checkout_orders PH metadata 6건, o4o_payments PH sourceService/metadata 각 6건(겹치므로 합산 금지), supplier_product_offers PH service_keys 19건, offer_service_approvals 18건, offer_service_prices 1건, service_memberships service_key 2건/role 1건(겹침), role_assignments role 3건, roles 5건, platform_services 1건, service_policy_documents 3건, user_policy_acceptances 2건, service_legal_profiles 1건, service_audience_policies 1건, cms_contents 3건, forum_category_requests 1건, media_assets 4건, action_logs 33건, o4o_event_logs 5건. FK는 checkout_payments·content slots·forum posts·media links·role permissions·policy acceptances 등의 종속 관계를 포함한다. 숫자는 scope별 건수이며 삭제 총량이 아니다.

현재 도메인 두 개는 DNS가 기존 LB를 가리키며 12개 synthetic redirect 검사가 302/path/query 일치다. 이는 제거 전 현재 상태이지 최종 보존 정책이 아니다. Cloud census의 run describe는 UNAVAILABLE이며, 다른 성공한 자원 plan에서 확인된 부재를 이번 census 오류만으로 다시 확정하지 않는다.

사용자는 다른 작업이 끝날 때까지 운영 변경 대기를 지시했다. main 통합·DB·DNS·인증서 변경·배포는 해당 종료 확인 후 단독 진행한다. 이 환경에는 직접 GCP 관리 identity가 없다. GitHub production workflow의 읽기 전용 census는 실행 가능하지만 새 DB 삭제/DNS/인증서 삭제는 아직 실행하지 않았다.

검증: focused Jest 12 suites / 220 tests PASS. Admin 타입 검사 PASS. API 타입 검사의 market-trial initialHistory 오류는 main 소스가 아닌 오래된 market-trial dist 때문에 발생했고 패키지 재빌드 후 API 타입 검사 PASS. PH 전용 서비스/도메인 삭제를 위한 직접 GCP 관리자 identity는 없으며 새 운영 write/정리 도구·실행은 미완료다. DB 삭제 전 과거 포럼 partition의 비공개 데이터 격리와 공용 파기 보호 목록은 유지한다. 이 보호용 PH 참조는 서비스 재사용 등록이 아니며 데이터 삭제 후 제거한다.

추가 검증: Node 22.18.0에서 관련 API 회귀 175 suites를 조사해 172 suites PASS, 폐기 전 PH를 현행 서비스로 전제한 승인/복구 3 suites는 현행 서비스 fixture로 정렬 후 모두 PASS. 기존 11 skipped suites는 실행 PASS로 세지 않는다. 신규 retired-request 경계 13 tests PASS. API/Admin/KPA 타입 검사 PASS. Node 24 런타임과 기존 better-sqlite3(Node 22) ABI 차이는 저장소 밖에 설치한 기준 Node 22.18.0으로 해소했고 native DB-backed validity 회귀도 실행됐다. 기존 SQL/기능 assertion을 끄지 않고 폐기된 producer 테스트를 제거·거절 회귀로 대체했다.

### PR #502 리뷰 보강

최초 commit `1763adb714`의 원격 CI [38196980183](https://github.com/Renagang21/o4o-platform/actions/runs/38196980183)은 CI Gate 포함 SUCCESS였다. Codex 리뷰의 P1 두 건/P2 한 건은 별도로 반영한다. 범용 역할 부여는 요청의 prefixed role과 해석된 DB role의 service/name 모두에서 PH를 거절한다(플랫폼 관리자도 예외 없음). multer memory parse 후 업로드 경계에서 다시 검사하고 서비스 upload 자체도 GCS/DB write 전에 거절한다. scope·role 비교는 trim 및 배열을 처리한다. 3개 focused suites 55 tests PASS, API 타입 검사 PASS. multipart/공백 scope/role 배열/DB의 bare-role→PH 매핑 회귀를 추가했다. main 통합·배포·DB/DNS/인증서 변경은 여전히 다른 운영 작업 종료 대기다.

### PR #502 인증 권한·회원 selector 후속 리뷰

`064809e5b6`의 CI [38197765196](https://github.com/Renagang21/o4o-platform/actions/runs/38197765196)은 SUCCESS였다. 추가 P1/P2 대응으로 승인된 PH namespace만 공통 RBAC SSOT에서 제외한다: getActiveRoles/getRoleNames/hasRole/hasAnyRole은 PH를 권한으로 인정하지 않고 assignRole도 PH 재생성을 거절한다. 다른 서비스의 role·유효기간·회수 계약은 유지한다. membershipServiceKey/member role selector도 전역 및 프로필 write 앞에서 거절한다. opaque membership 승인·복구의 폐기 예외는 전용 RetiredServiceError(410/SERVICE_RETIRED)로 응답한다. 7 focused suites의 최종 fixture 정합 후 106 tests PASS, API 타입 검사 PASS. DB 활성 플래그를 바꾸지 않고 인증 capability를 닫으며 실제 DB purge는 계속 대기한다.

### PR #502 DB 카탈로그·guest 발급 후속 리뷰

`d4c0225b8b` P1 리뷰에 따라 활성 RBAC 조회(getActiveRoles/getRoleNames/hasRole/hasAnyRole)도 공통 퇴역 role 판정을 사용한다. 기존 K-Cosmetics admin/operator assignment가 공용 운영 API capability로 남지 않으며, 현역 Neture/KPA 역할과 유효기간 검사는 유지한다. 사용자 목록의 과거 K-Cosmetics 역할 표시는 `(퇴역)`으로 정합했다. DB role row 삭제/비활성화나 전체 token family 파기는 수행하지 않는다. focused 19 tests 및 관련 81 suites 1798 tests PASS, 환경 의존 95 tests는 skipped였다.

퇴역 역할 신규 부여의 내부 SQL 우회도 차단했다. MembershipApprovalService의 승인·복구·activateRoleAssignment는 PH 및 K-Cosmetics namespace를 거절한다. 기존 K-Cosmetics 권한의 반려·정지·회수 매핑은 유지한다. 사용자 승인 대상 필터도 같은 퇴역 role 판정을 사용한다. 퇴역 서비스의 과거 긍정 fixture는 현역 서비스 격리 fixture와 퇴역 승인 거절·회수 회귀로 정합했다. 5 focused suites 133 tests PASS. 이는 기존 K-Cosmetics active 세션의 일괄 회수나 운영 데이터 삭제를 수행한 결과가 아니다.

`3db87c3238`의 기존 계약 종료 정리 리뷰 대응: PH는 신규 createCase를 410으로 거절하되, 저장된 종료 건의 config는 데이터 purge 전까지 내부 정리용으로 유지한다. legacy 종료 건의 media 파기는 PH scope만 허용하는 내부 deleteRetiredAsset을 사용하며 기존 링크/파생/Screen Set/storage 보호 검사를 유지한다. 공용 미디어 API의 PH 접근 금지는 그대로다. DB 통합 fixture는 새 PH 종료 건을 생성하지 않고 역사적 행을 seed하도록 정합했다(실제 운영 DB 테스트 미실행).

운영 단독 진행 재개 후 `b9b383f9ef` 최종 리뷰 2건을 반영했다. 공개 제휴 QR resolver는 ACTIVE 행도 PH scope이면 null로 반환하여 공개 라우트의 404 경계에서 매장 조회·scan write를 중단한다. 최신 main `22955b68f6`의 매장 승인 변경은 PH-only invitation을 관계 UPDATE 전에 STORE_NOT_RESOLVED로 거절하고 invited 상태를 보존한다(해당 회귀 재실행). 2 focused suites 37 tests PASS. 최신 main은 일반 merge로 반영했다. 병합·배포 성공은 실제 workflow 결과 확인 후 기록한다.

`0557e26a05` 후속 세션 리뷰: signed PH access token은 requireAuth에서 DB 조회 전에 401/SERVICE_SESSION_REVOKED, optionalAuth에서는 익명 처리한다. PH refresh token도 동일한 기존 세션 종료 코드로 거절하며 재발급·다른 서비스의 token family 변경은 하지 않는다. 인증 경계 2 tests 및 기존 refresh 계약 포함 25 tests PASS. 사용자는 현재 서비스에서 다시 로그인해야 한다.

이전 commit `f9f9cbcd72` 리뷰의 공개 slug 우회도 반영했다. resolvePublicStore는 slug record를 해석한 직후 PH scope를 410으로 거절하여 공용 매장/태블릿 조회 및 interest 생성이 store 데이터에 접근하기 전에 중단된다. PH namespace·공백·event-offer 회귀 3 tests PASS. 최신 main `63653694b3`을 작업 branch에 일반 merge로 통합했다.

배포 전 후속 미디어 리뷰 대응: PH 자산을 공용 목록 SQL에서 제외하고 UUID 조회·사용처·폴더·metadata·삭제 및 catalog의 locked mutation/relations 조회에서 퇴역 scope를 확인한다. 기존 PH 공개 자산의 타 서비스 재사용을 코드 배포와 purge 사이에도 차단한다. 승인 PH 필터는 공통 helper로 추출해 중복을 줄였다. focused 3 suites 29 tests PASS. 이 기록은 배포 성공 또는 실제 데이터 삭제를 의미하지 않는다.

추가 요청의 퇴역 서비스 역할 정합: PH는 앞선 변경에서 신규 지정 목록·부여 경계를 제거했다. K-Cosmetics의 `cosmetics:*` 운영자 allowlist, admin 역할 서비스 목록, 공용 역할 관리 selector를 제거한다. DB 역할 catalog와 신규 assignRole/회원 역할 지정은 `cosmetics`·`k-cosmetics` 및 두 접두 역할도 거절한다. 과거 타입·registry 메타데이터는 퇴역(deprecated) 표시로 남기고 신규 서비스별 역할 조회에서 제외한다. 기존 cosmetics role row의 운영 DB 일괄 비활성화·전체 API 종료·데이터 삭제는 수행하지 않는다. 활성 권한 조회 제외는 후속 P1 대응을 따른다. 서버 focused 25 tests 및 화면 catalog 정합 10 tests PASS.

`5b351cab40` 후속 리뷰 4건 대응: Local Agent pairing/CORS 허용 목록에서 PH root/www origin을 제거하고, admin QR 안내의 PH 링크를 제거했다. 사용자 단위 및 일괄 승인에서는 PH membership을 루프 전에 제외한다. 재활성화도 퇴역 membership/role을 먼저 제외하여 정상 서비스의 승인·복구를 보존하고 PH-only 요청은 410으로 거절한다. mixed membership의 양쪽 순서·PH-only 승인 및 복구 회귀를 포함한 2 suites 29 tests PASS, Local Agent origin 확인 PASS, API 타입 검사 PASS. 기존 설치된 Local Agent에는 별도 업데이트 반영이 필요하며 도메인 종료 전에 확인한다. 운영 변경은 수행하지 않았다.

후속 리뷰에서 발견된 서비스형 media link의 PH namespace 재생성을 saveLink 서비스 계층에서 DB transaction 전에 410/SERVICE_RETIRED로 거절한다. 신규·수정 링크가 같은 경계를 사용한다. 퇴역 키·공백·prefixed role 4개 회귀 테스트 PASS. GitHub 실행·대기 Actions는 조회 시 0건이었으며, 다른 Cloud/로컬 운영 작업 종료 확인은 별도로 필요하다.

코드 catalog와 별도로 활성 DB 행을 조회하는 공개 PlatformServiceCatalogService 및 RoleService 목록도 PH를 제외한다. PH role의 opaque ID update/delete 및 직접 create는 410으로 거절한다. 내부 DB 조회는 필요한 제거 조사용으로 남기지만 공개 목록·권한·mutation에는 쓰지 않는다. guest serviceId는 전역 selector 및 직접 발급 서비스에서 거절하며, guest 감사 원장의 canonical service/session 필드는 클라이언트 metadata로 덮어쓸 수 없도록 보존한다. DB 활성 행이 있어도 목록/권한에서 제외되는 회귀, opaque role ID mutation, guest 발급/audit 부재를 포함한 4 focused suites 34 tests PASS, API 타입 검사 PASS. 이는 원격 DB/DNS 변경이나 완전 제거 완료가 아니다.


## 운영 후속 — 2026-10-12

PR #502 main 반영 뒤 main `c1bab86c01ea8eeb5d23c4605fca08008cd09bbf`의 CI를 확인했다. 사용자가 누적 계정 삭제 migration 2개를 포함한 배포를 승인했다. [Promote 38245766124](https://github.com/Renagang21/o4o-platform/actions/runs/38245766124)은 SUCCESS, production 상태는 DEPLOYED다. API migration·새 revision readiness·트래픽 전환 후 검증과 admin/neture/kpa-society/lecture/store/kpa-branch 배포가 성공했다. 운영 API의 PH 경로는 410/SERVICE_RETIRED다. 계정 삭제 apply 기능 활성화·실제 계정/GCS 파일 삭제는 실행하지 않았다.

사용자는 가비아의 `pharmacyhub.co.kr` DNS 레코드 4개(A root/www 및 두 ACME CNAME)를 삭제했고 관리자 화면의 레코드 0개를 제시했다. 이는 가비아 설정 완료 증거이며 외부 DNS 캐시 만료 검증·GCP 인증서/맵/URL map 제거 완료 증거는 아니다. PC Local Agent의 업데이트는 담당 에이전트 범위로 확정했으며 이 세션에서 실행하지 않는다.

[최신 read-only census 38247798519](https://github.com/Renagang21/o4o-platform/actions/runs/38247798519)은 SUCCESS, DB write 0. 로그 접근을 다시 확인해 PH namespace 건수와 FK 정의를 읽었다. 전용 테이블 0, 주문/결제 6건·공급 scope 19건 및 기존 회원/역할/정책/미디어 등 scope는 여전히 남아 있다. 각 scope 건수는 중복될 수 있어 삭제 총량으로 합산하지 않는다.

삭제 전 조사 도구는 live incoming FK의 다른 schema 및 실제 종속 행 건수, 대상 table column type, PH-only/mixed 공급 scope를 읽기 전용으로 추가 집계한다. 인증서 조사는 PH SAN을 포함한 legacy/Certificate Manager 인증서, 모든 HTTPS proxy/map entry의 공유 참조, PH DNS authorization을 조회한다. 오류·부분 목록은 complete=false로 기록하며 비공개 row/PEM/credential을 출력하지 않는다. 이 조사 확장은 DB/인증서/URL map 삭제 기능을 추가하지 않는다. 실제 삭제 runner는 위 종속 귀속과 공유 참조를 확인한 뒤 고정한다.

인증서 조사 리뷰 대응: Certificate Manager certificate/DNS authorization은 `--location=-`로 모든 위치를 조회한다. HTTPS proxy의 certificateManagerCertificates 직접 연결도 집계하며 전체 project/location/resource identity로 비교하여 같은 이름의 지역별 자원을 혼동하지 않는다. map entry와 legacy 인증서 참조도 전체 identity를 보존한다. focused 19 tests PASS. 실제 운영 조사·삭제 결과는 아직 아니다.

FK catalog의 name[]를 pg client가 문자열로 읽는 문제를 text[] 집계로 수정했다(PR #513). 분리된 PostgreSQL 16에서 cross-schema incoming FK·PH/Neture 혼합 공급·타 서비스 미디어 참조가 검출되고 census 후 원본 데이터가 유지되는 실제 SQL 검증이 PASS다. 수정한 운영 census 38255309265는 SUCCESS지만 다운로드한 로그에 결과 JSON이 없으므로 삭제 입력/잔여 건수 검증 완료로 해석하지 않는다. 출력은 대형 한 줄 JSON 대신 여러 줄 JSON으로 바꿔 결과 수집을 확인한다. 앞선 38251425660의 인증서 조사는 목록 권한 부족으로 complete=false였다. PH 데이터/인증서/URL map 삭제는 여전히 0건이다. 다른 세션의 main 병합·운영 단독 작업 확인과 읽기 권한 보완이 진행 대기 조건이다.

## 운영 후속 — 2026-10-13

사용자가 다른 작업 종료를 확인했다. PR #518은 최신 main 반영·필수 CI·Codex blocker 부재 확인 후 병합했다(`e6d97c23410ae550101476a18bdc42e315b30435`). 출력 수정 후 [read-only census 38314086152](https://github.com/Renagang21/o4o-platform/actions/runs/38314086152)의 결과 JSON을 수집했다. 공급 scope 19건은 PH-only, mixed 0건이다. 연결 승인 18건·가격 1건·정책 동의 2건·미디어 링크 1건을 확인했다. DNS A 조회는 두 PH 호스트 모두 불가했다. 인증서 조사는 목록 권한 부족으로 여전히 complete=false이며 빈 목록을 자원 부재로 해석하지 않는다.

첫 데이터 제거 범위는 PH 서비스 등록·회원·역할·정책·로그 10개 테이블의 고정 namespace 행 56건 및 해당 역할의 permission bridge다. users/organizations/permission 정의·주문·결제·공급·콘텐츠·미디어·파일은 이 단계에서 삭제하지 않는다. 실제 운영 census와 테이블별 건수가 달라지거나, 혼합 귀속·타 서비스 FK·검토되지 않은 DELETE trigger가 있으면 삭제 전에 중단한다. transaction·table lock·삭제 건수·잔여 검증으로 실패 시 전체 rollback한다. 스키마 변경은 없으며 과거 migration/manifest/fingerprint는 변경하지 않는다.

별도 유지보수 실행은 기존 production workflow의 standalone owner/main/CI/freeze/idle gate를 사용한다. runner는 SQL에 연결하지 않고, 현재 API serving image digest의 일회성 Cloud Run job에 검토된 코드와 기존 socket/Secret Manager binding을 지정한다. plan은 READ ONLY transaction, apply는 SERIALIZABLE transaction·task/retry 1/0이다. 성공한 job은 제거하고, 실패/확인 불가 실행은 보존하여 read-only census 재확인 전 재실행하지 않는다. 분리된 PostgreSQL 16에서 PH 행 제거·Neture/사용자/조직/스키마 보존, cross-schema FK·혼합 귀속·건수 drift·삭제 trigger의 rollback을 확인했다. 이 기록은 production 삭제 완료가 아니다. PC Local Agent 업데이트는 담당 에이전트 범위다.

- [x] PR #518 병합 및 읽을 수 있는 실제 census 결과 확보.
- [x] PH administrative data plan/apply 및 운영 잔여 검증.
- [ ] 주문·결제·공급·콘텐츠·미디어의 비-FK/파일 참조 조사와 후속 삭제.
- [ ] 인증서 목록 권한 보완 후 PH 인증서/map entry/DNS authorization/URL map 종료.

PR #522 리뷰 보완: PH `roles.service_key`와 `roles.name`의 귀속 불일치를 양방향으로 차단한다. apply 전에는 관리자 측 원래 WIF 조건 백업과 해당 main SHA/PH workflow/owner에만 한정된 임시 조건이 필요하다. 코드가 provider의 실제 조건을 정확히 대조하며 다른 workflow/SHA·OR 우회를 허용하지 않는다. 기존 토큰을 가진 실행도 없는 단독 운영 구간을 확인하고, 동일 PH workflow의 concurrency와 함께 다른 운영 writer의 신규 인증을 작업 종료까지 차단한다. `iam.workloadIdentityPoolProviders.get` 읽기 권한이 필요하다. 작업·잔여 검증 뒤 원래 조건을 복구한다. 이 세션에서 기존 PC Local Agent를 변경하지 않는다.

PR #522는 SonarCloud 정렬/복잡도 지적 수정, 관련 56 tests와 PostgreSQL 실검증, 필수 CI·리뷰 해결 후 main `e46f3467892e01f142af8bf58025ac33cd8e6eb7`에 병합했다. post-merge CI 38318999460도 SUCCESS다. 최초 Cloud Run plan 38320131242는 인증 전 safety test에서 중단됐다. 기존 resource-gate 테스트가 실제 workflow의 새 `PH_ADMIN_PURGE=true`를 상속하는 fixture 격리 문제다. DB 접속·job 생성·삭제는 실행하지 않았다. 테스트 환경을 명시적으로 격리하고 PH 입력과 resource retirement의 혼합 거절을 검사한다. 최신 census 38319576225도 인증서 권한 부족 complete=false이며 실제 자원 부재를 증명하지 않는다.

### 2026-10-13 관리 데이터 삭제 및 인증 복구

동일 WO의 연속 단계로 전용 worktree/branch를 유지했다. PR #523의 fixture 격리 수정 후 read-only Cloud Run plan [38322339531](https://github.com/Renagang21/o4o-platform/actions/runs/38322339531)은 SUCCESS였으며 쓰기는 없었다. 관리자가 읽기 권한을 추가한 뒤 census [38324906191](https://github.com/Renagang21/o4o-platform/actions/runs/38324906191)은 인증서 조사 complete=true, blockers 0을 확인했다. PH 전용 `cm-cert-pharmacyhub`, 공유 `o4o-main-cert-map` 안의 PH root/www entry 2개, PH DNS authorization 2개가 남아 있다. 공유 map/proxy/LB는 삭제 대상이 아니다.

필수 CI가 통과한 main `e999db2b9e9460bc5ce9791d64dde35f8f09d081`에서 관리자가 원래 WIF 조건을 로컬 백업하고 정확한 SHA/PH workflow로 임시 제한했다. 실행·대기 중인 다른 Actions가 없음을 확인한 뒤 apply [38334494970](https://github.com/Renagang21/o4o-platform/actions/runs/38334494970)이 SUCCESS, `executionSucceeded=true`, `applied=true`로 종료했다. PH 서비스 등록·회원·역할·정책·로그 10개 테이블의 승인된 행 56건을 삭제했다. 성공한 일회성 Cloud Run job도 제거됐다. 후속 read-only census [38334641874](https://github.com/Renagang21/o4o-platform/actions/runs/38334641874)은 SUCCESS, failed=false, 해당 관리 scope의 잔여 nonzero 항목 0을 확인했다. 관리자는 이후 백업된 원래 조건 복구 및 재조회 검증 결과 `WIF_RESTORED`를 전달했다.

잔여 데이터는 주문 6건·결제 6건, PH-only 공급 제안 19건과 승인 18건·가격 1건, 콘텐츠 3건·게시판 요청 1건·미디어 4건이다. 결제 sourceService/metadata 집계는 같은 행이므로 더하지 않는다. 이 후속 범위와 인증서·URL map은 아직 삭제하지 않았다. 사용자/조직/공유 상품·공급자 master와 migration 이력, PC Local Agent는 이번 실행의 삭제 대상이 아니다.

후속 삭제 준비: 기존 FK census에 포함되지 않는 주문 로그·결제 주문 귀속, 미디어 연결 대상의 PH 콘텐츠 귀속, 다른 서비스 자산의 동일 URL/GCS 경로 사용, Screen Set JSON의 URL 사용과 PH GCS 경로 건수를 추가 read-only 집계한다. 행 ID·URL·파일 경로·인증 정보는 출력하지 않는다. 필요한 컬럼이 없으면 명시적 schema blocker로 남기며 0건으로 해석하지 않는다. 이는 참조 조사를 보완하는 도구이며 전체 비-FK 참조 부재나 삭제 승인/완료를 뜻하지 않는다. 실제 운영 집계 결과를 확인한 뒤 후속 삭제 범위를 확정한다.

PR #527 P2 리뷰 대응: PH 자산에서 출발하는 링크 외에 PH 콘텐츠에서 출발하는 역방향 링크와 Neture/NULL 등 공유 자산의 연결도 집계한다. PH 콘텐츠 삭제 후 dangling entity_id 링크를 남기지 않도록 양방향 근거를 확보하며 공유 자산 자체는 삭제 대상으로 승격하지 않는다.

추가 P2 대응: PH 주문의 전체 결제 연결·정상 PH 결제 연결·고아 PH 결제를 명시적으로 집계하고, PH 결제가 없거나 복수인 주문 건수도 분리한다. 주문 6건/결제 6건이라는 총수만으로 1:1 연결을 추정하지 않는다. 모든 후속 참조 SQL은 조사 대상인 public schema를 명시한다.

그룹 결제 P2 대응: B2B 계약과 실제 `b2b-payment-controller.factory.ts`의 연결 방식에 따라 주문 UUID, 주문 metadata의 paymentGroupId, 결제 metadata의 paymentGroupId/checkoutOrderIds를 함께 해석한다. EXISTS로 한 결제를 여러 주문 수만큼 중복 집계하지 않는다. PH·타 서비스 주문을 함께 포함하는 결제도 별도로 보고하며 삭제 대상으로 자동 승격하지 않는다. 격리된 PostgreSQL 16에서 READ ONLY transaction으로 16개 집계의 정확한 결과를 검증했다(직접 연결·다중 주문 1회 결제·metadata-only 그룹·checkoutOrderIds-only 공유 그룹·고아/누락/중복 결제·역방향 공유 미디어·Screen Set·동일 저장 경로). fixture 컨테이너와 임시 테스트 비밀번호 파일을 제거했다. 이 결과는 production 데이터 삭제가 아니다.

PH 인증서 종료 도구는 실제 조사에서 확인한 Certificate Manager entry 2개 → 전용 인증서 1개 → DNS authorization 2개만 순차 제거하도록 준비한다. 모든 인증서/map entry/proxy를 재조회해 shared SAN·다른 entry·직접 proxy·공유 DNS authorization이면 차단한다. 삭제마다 기존 owner/main/필수 CI/freeze/idle 및 정확한 WIF 임시 제한 gate를 재확인한다. 공유 map·proxy·LB·외부 DNS·URL map은 이 도구에서 변경하지 않는다. 삭제 후 고정 대상 부재와 공유 자원 설정 보존을 재검증한다. 필요한 추가 권한은 `certificatemanager.certmapentries.delete`, `certificatemanager.certs.delete`, `certificatemanager.dnsauthorizations.delete`, `certificatemanager.operations.get`이다. plan은 실제 IAM 누락 권한을 보고하고 apply는 누락 시 첫 삭제 전에 차단한다. 아직 실제 인증서 삭제 완료는 아니다.

SonarCloud 보완: 문자열 정렬의 localeCompare 비교 함수를 명시하고 SDK read/delete dependency를 Promise 반환 함수로 선언했다. 단일 DB connection의 조회와 인증서 의존 순서 삭제는 순차 Promise chain으로 유지한다. 병렬 삭제나 query 실행으로 gate/rollback 경계를 우회하지 않는다. 관련 26 tests와 PostgreSQL 16 실제 16개 집계를 다시 검증했다.

### 2026-10-13 PH 인증서 종료 실행

PR #527은 main `e4c48811b6b414aa8939d639373d9331d2c4c470`에 병합됐으며 post-merge CI 38347390566은 SUCCESS다. Delivery 38348144329는 NO_DEPLOY로 종료해 애플리케이션 배포는 수행하지 않았다. 읽기 전용 census [38347391583](https://github.com/Renagang21/o4o-platform/actions/runs/38347391583)은 SUCCESS, 참조 조사 complete=true였다. PH 주문 로그 6건, PH/타 서비스 주문 공유 결제 0건, PH 콘텐츠 밖의 미디어 링크 1건, GCS 경로를 가진 PH 자산 4건을 확인했다. PH 결제가 없는 주문 1건과 복수 PH 결제 주문 1건이 있어 주문/결제를 1:1로 가정하지 않는다. 이 데이터는 삭제하지 않았다.

첫 인증서 plan 38348151860은 당시 실행 중인 Delivery 때문에 idle gate에서 중단됐으며 삭제는 없었다. Delivery 종료 뒤 plan 38348278165는 SUCCESS였으나 인증서 삭제 권한 4개 누락을 보고했다. 관리자가 해당 권한을 추가한 뒤 [38349009973](https://github.com/Renagang21/o4o-platform/actions/runs/38349009973)은 SUCCESS, missingPermissions=[] 및 PH 전용 대상 5개를 확인했다.

관리자는 원래 WIF 조건을 로컬 `pharmacyhub-cert-retirement-e4c48811b6b414aa8939d639373d9331d2c4c470.json`에 백업하고 해당 main SHA/PH workflow/owner로 임시 제한한 검증 결과 WIF_RESTRICTION_ACTIVE를 전달했다. apply [38349256767](https://github.com/Renagang21/o4o-platform/actions/runs/38349256767)은 SUCCESS, applied=true, targets=[], sharedResourcesPreserved=true, missingPermissions=[]로 종료했다. `cm-entry-pharmacyhub-root`·`cm-entry-pharmacyhub-www`, `cm-cert-pharmacyhub`, `dns-auth-pharmacyhub-root`·`dns-auth-pharmacyhub-www`를 제거하고 재조회로 부재 및 공유 설정 보존을 확인했다. 공유 인증서 map/proxy/LB 및 URL map은 변경하지 않았다.

관리자는 같은 로컬 백업을 사용해 원래 WIF 조건을 복구하고 재조회 검증 결과 `WIF_RESTORED`를 전달했다. 인증서 종료용 임시 SHA/workflow 제한은 해제됐다. 남은 범위는 PH 전용 주문/결제/공급/콘텐츠/미디어·GCS 파일, PH URL map host/matcher 종료다. Gabia DNS 삭제는 앞선 사용자 확인 사항이다. 사용자는 2026-10-13 다른 용도의 활용을 위해 도메인 등록/자동연장은 유지하며 o4o와의 PH 연결만 제거하도록 범위를 확정했다. PC Local Agent는 담당 에이전트 범위다.

후속 URL map 연결 종료 준비: domain_detachment standalone 모드를 추가한다. 고정 application map o4o-global-lb의 PH root/www host rule과 path-matcher-pharmacy-hub만 제거하며, 해당 호스트의 map validation test도 함께 정리한다. 기존 호스트 전체 리다이렉트의 정확한 상태와 PH matcher의 전용 귀속을 확인하고, 타 서비스가 같은 matcher를 공유하거나 부분/예상 밖 상태이면 차단한다. Compute validation과 fingerprint 비교, apply 직전 owner/main/CI/freeze/idle 및 정확한 WIF 제한 gate를 적용한다. 전체 최종 draft 일치와 PH 대상 부재로 공유 설정 보존을 검증하며, 응답 유실·operation 미확인 시 자동 재실행/rollback하지 않고 request/operation 증거를 보존한다. DB/GCS/DNS/인증서/공유 LB 자원은 이 모드에서 변경하지 않는다. focused 35 tests PASS이며 실제 URL map 변경은 아직 수행하지 않았다. 동일 WO 연속 단계로 전용 worktree/branch를 유지한다.

PR #533은 필수 CI와 Codex 리뷰 통과 뒤 병합됐으나 SonarCloud의 API URL 입력 검사가 실패한 것을 병합 전에 처리하지 못했다. 실제 URL map plan/apply는 수행하지 않고 후속 수정으로 호출 목적지를 고정 action/URL/method 목록으로 제한하고 operation path를 검증·URI 인코딩하며 request UUID query를 구조화한다. 임의 URL·path traversal·query injection 회귀를 추가했다. 이 수정의 CI/Sonar 재검증 및 운영 적용은 후속 실행 결과로 기록한다. 도메인 등록/자동연장은 유지하되 o4o의 PH DNS/인증서/URL map·전용 코드/데이터는 제거한다는 사용자 후속 지시를 반영했다.

후속 Sonar 검증에서도 동적 URL fetch 지적이 남아 있어 PR #534 병합/운영 적용을 중단했다. HTTP read/validate는 고정 literal URL만 사용하고, update URL은 고정 origin/path에 코드 내부에서 생성한 UUID query만 추가한다. 원격 operation name은 operation- 접두 및 단일 operand 형태를 검증한 뒤 고정 project/global의 Cloud SDK describe 인자로만 사용한다. 원격 응답/호출자가 목적지 URL·SDK flag·request UUID를 지정할 수 없음을 실제 client 경계 회귀로 검증한다. 검사 억제/quality gate 변경은 하지 않는다.
