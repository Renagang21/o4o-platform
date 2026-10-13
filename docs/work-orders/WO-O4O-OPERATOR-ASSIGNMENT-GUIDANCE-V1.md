# 전체 관리자의 서비스 운영자 지정 후속 안내 보완

> **상태**: COMPLETED
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13
> **근거 WO/IR**: 사용자 지시 — 오프라인 지정 흐름 조사 후 확인한 안내 부족 수정 · [서비스별 운영자 로드맵](WO-O4O-SERVICE-SPECIFIC-OPERATOR-ROADMAP-V1.md)

## 범위와 조사

기준 main: `3c95dc170103f739a3e3a33b20f85350ae0ecef5`.
전체 관리자는 오프라인 요청을 받아 공통 계정과 Google 연결이 있는 사용자를 서비스 운영자로 지정할 수 있다.
서비스 가입 정보가 없으면 지정 경로에서 active로 생성하고, 기존 가입 정보가 있으면 상태와 역할을 보존한다.
Google 미연결 사용자는 본인이 계정 설정의 명시적 연결 절차를 완료할 수 있다.
이 흐름을 막는 결함은 이번 코드 조사에서 확인하지 못했다. 실제 계정 지정·운영 접근은 미검증이다.

지정 성공은 비활성 가입의 승인·복구 완료를 뜻하지 않는다. 기존 화면은 가입 상태 원문을 일시적인 toast로만 알리고 다음 업무를 설명하지 않았다.
검색 결과 없음도 미가입으로 단정했다. 이번 수정은 이 안내를 보완하며 권한·API·가입 상태 전환 계약은 변경하지 않는다.

## 구현과 검증

- [x] 지정 성공 후 화면에 닫을 수 있는 결과 안내를 유지한다.
- [x] active·pending·suspended·rejected·withdrawn별 후속 업무와 미확인 상태의 확인 절차를 안내한다.
- [x] 검색어 확인·공통 계정 준비·본인의 Google 연결을 안내하며 서비스 사전 가입을 필수로 요구하지 않는다.
- [x] 기존 관련 테스트 2파일 11개·Admin 타입 검사·공통 패키지 및 Admin 빌드 통과.
- [x] 합성 계정/응답으로 Chromium 1440px·390px 각각 7상태의 지정 요청·후속 안내·닫기 동작 확인(14개 통과).
- [x] diff 공백 검사·문서 민감정보 검사 통과.
- [x] [PR #529](https://github.com/Renagang21/o4o-platform/pull/529) main 통합: `79ef86063b59cdb7c4b460b4d3f4b223d1be0950`.
- [x] [PR CI](https://github.com/Renagang21/o4o-platform/actions/runs/38341846427) · [main CI](https://github.com/Renagang21/o4o-platform/actions/runs/38342104774) · [main CodeQL](https://github.com/Renagang21/o4o-platform/actions/runs/38342104687) 성공.
- [x] [Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/38342326134) 성공 · `DEPLOYED · deploy: admin` · API/다른 서비스 배포 없음.
- [x] 관리자 홈 HTTP 200 및 운영자 지연 로딩 자산에서 검색·상태·후속 처리·닫기 안내 문구 제공 확인.

실제 계정 작업·운영 DB 변경은 수행하지 않는다. 개별 분회·커뮤니티 내부 운영자 지정은 별도 업무 경계를 유지한다.
문서 정합: 과거 로드맵의 중앙 운영자 용어와 admin 전용 정지 설명은 이번 변경의 정책 근거로 사용하지 않는다. 기존 별도 문서 정비 작업의 변경은 포함하지 않는다.
