# PharmacyHub retirement TODO

> 상태: ACTIVE · 2026-10-10 · 사용자 범위: TODO 작성 → 조사로 보정 → 구현·검증·push

## 최초 TODO

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
- [ ] 운영 데이터 삭제는 별도 보존 범위·승인 확인 후 수행. 이번 작업에서 실행하지 않음.

사용자 지정 worktree는 동일 폐기 WO의 연속 phase로 재사용하고 최신 main 기준 `wo/pharmacyhub-qr-retirement-validation`에서 수행한다. 과거 집계·네 probe 필수 기록은 당시 기록이며 현재 범위는 이 TODO를 따른다.
