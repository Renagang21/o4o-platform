# PharmacyHub retirement TODO

> 상태: ACTIVE · 2026-10-10 · 사용자 범위: TODO 작성 → 조사로 보정 → 구현·검증·push

## 완전 제거 범위 확정 — 2026-10-10

사용자는 PH 재사용·전용 데이터 보존이 불필요하며 PH 전용 데이터 삭제도 승인했다. 다른 서비스의 공용 행·기능은 삭제 대상이 아니다. 기존 QR 연결용 도메인·DNS·인증서는 유지한다. 기존의 데이터 삭제 승인 대기 문구는 이 명시적 승인으로 해소됐다. 삭제 대상 귀속·FK·타 서비스 영향 확인은 계속 필요하다.

- [x] PR #417 CI·리뷰 확인 후 main 병합.
- [x] 전체 PH 호스트 리다이렉트 초안/실행 옵션 준비(`retire_host=true`). PH default backend·pathRules 참조를 제거하고 다른 host/matcher는 보존. 302·path/query 유지.
- [ ] 새 코드 CI·리뷰·main 통합 후 `retire_host=true, mode=plan`의 변경 전후 map 확인.
- [ ] URL map update·global operation 조회 권한 확인 후 전체 호스트 apply. 실제 QR/tablet·네 경로 규칙·root·기타 경로 302 검증. 실패 시 기존 map 복구.
- [ ] 전체 URL map과 다른 backend/NEG에서 `pharmacy-hub-web` 참조가 없는지 확인. Cloud Run 삭제 권한과 대상 project/region 확인 후 전용 서비스 제거·부재 확인.
- [ ] 현재 DB schema/FK 및 PH 전용 테이블·service_key 행 목록 확인. 공용 조직·사용자·Neture QR/매장 데이터를 PH 문자열만으로 삭제하지 않음. PH 전용 데이터는 transaction 단위 삭제 계획 후 실제 삭제·잔여 건수 확인.
- [ ] 남은 PH 활성 등록·권한·호환 참조를 실제 공용 소비처 기준으로 제거. 과거 migration을 다시 실행하거나 migration 이력을 없애지 않음.
- [ ] 각 운영 실행 결과·잔여 blocker 기록. 지금 운영 apply·Cloud Run·DB 삭제는 미실행.

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
