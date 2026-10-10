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
