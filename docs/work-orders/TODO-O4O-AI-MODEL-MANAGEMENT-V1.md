# AI 모델 등록·수정·삭제 및 실행 모델 지정 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-21 · **최종 갱신**: 2026-10-21 (Asia/Seoul)
> **근거**: 사용자 요청 — AI 연결의 오래된 모델 삭제, 신규/수정/삭제, 사용하는 모델 지정
> **관련 정본**: [AI 공통 기반](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md) · [기존 AI 운영 관리](WO-O4O-ADMIN-AI-USAGE-MANAGEMENT-V1.md)

## 목표·경계

모델 관리와 실제 실행 선택이 어긋나지 않도록 기존 연결·정책·호출부를 조사한다. 공급자 credential이나 base URL을 브라우저에 노출하지 않고 기존 transport·인가·비용/한도를 유지한다. 모델 등록은 공급자 제공·계정 접근 권한·가격을 검증한 것이 아니다. 운영 설정 변경·유료 호출·DB 직접 변경은 실행하지 않는다. 새 전용 branch/worktree에서 개발·검증·commit·push까지 진행하고 새 PR·병합·배포는 별도 통합 지시에 따른다.

## TODO

- [x] T01 코드 모델 목록·동적 Gemini 목록·정책·기본/강화 모델·직접 호출과 관리자 소비처 조사
- [x] T02 모델 CRUD·사용 모델 지정 저장 계약과 실제 적용 범위 확정
- [x] T03 전체 관리자 전용 API·서버 저장·충돌 및 사용 중 모델 보호 구현
- [x] T04 모델 등록/편집/삭제 및 사용 모델 선택·저장 UI 구현
- [x] T05 실제 호출에 선택 모델 전달·기존 fallback/능력/비용 경계 회귀 검증
- [x] T06 desktop/mobile·타입·빌드·문서 검증 및 한계 기록
- [x] T07 경로별 commit·push·SHA/clean 확인 후 인계

## 최초 조사

AI 운영 관리의 API·모델 연결은 정적 MODEL_WHITELIST 조회이며 쓰기 API가 없다. Gemini에는 별도의 공급자 ListModels 캐시와 기존 정책 선택이 있다. 일반/강화 runtime·편집·정책 scope·고정 직접 호출이 분리돼 있어 목록만 바꾸면 실행에는 적용되지 않는다. 이 차이를 검증하면서 실제 반영 범위를 확정한다.

## 조사·개발 결과

공급자별 모델 CRUD와 사용처별 모델 선택을 기존 관리자 API·UI 및 호출부에 연결했다. 저장은 기존 settings 한 문서의 revision CAS로 원자 처리하며 사용 중 모델 보호·삭제 표식·실패 조회 차단을 구현했다. 모델 선택은 31개 논리적 사용처 중 현재 사용 미확인인 이전 공급자 HUB를 제외한 30개에 연결했다. 번역 두 사용처는 기존 공유 정책을 유지한다. Qwen·DeepSeek 실행 adapter 신규 도입, 통합 중지·전체 비용 이관은 범위 밖이다.

[검증·제한·데이터 정리·인계 기록](../checks/CHECK-O4O-AI-MODEL-MANAGEMENT-V1.md)에 실제 명령과 결과를 기록했다. 새 모델 관리와 관련 회귀는 통과했으나, 추가한 실제 PostgreSQL 검사에서 기존 quota schema rollback spec 두 건의 마지막 migration 가정 불일치를 발견했다. 별도 수정이 필요하며 전체 검증 무실패로 보고하지 않는다. 운영 Google 로그인·유료 공급자·운영 DB 검증은 미실행이다.

개발 종료는 commit·push 및 원격 SHA/clean 확인이다. PR·병합·배포는 이번 요청의 종료 범위에 포함하지 않는다. 통합 전 worktree/branch를 보존한다.

## 2026-10-21 main 통합·배포 TODO (현재)

사용자 추가 지시 `main 으로 병합 -> 배포`에 따라 이 공간이 통합을 담당한다. 위 T01–T07과 당시 push-only 경계는 개발 종료 기록이며, 아래 체크가 현재 통합 상태다. 운영 설정·유료 호출·새 migration은 추가하지 않는다.

- [x] I01 미배포 branch·기존 PR·최신 main 및 원격 이력 확인
- [x] I02 최신 main 통합 및 기존 quota rollback spec의 대상 migration 가정 보완
- [x] I03 격리 PostgreSQL 모델·schema 7건 및 실행/예약 회귀 139건, 관리자 단위 441건 통과
- [x] I04 타입·빌드·desktop/mobile browser·문서 검사 완료 및 경로별 commit/push
- [x] I05 PR 생성·정확한 HEAD CI·Codex 검토·스레드 해결
- [x] I06 최신 main 확인 후 순차 병합·post-merge CI
- [x] I07 Delivery 판정에 따른 운영 배포·실제 serving revision/traffic 확인
- [x] I08 공개 응답·인증 경계 smoke 및 실제 Google/유료 공급자 미검증 범위 보고
- [ ] I09 일회성 PostgreSQL 정리·문서 closure·자기 worktree/branch 안전 정리

I09는 실제 실행 전 완료 표시하지 않는다. 배포 전에는 현재 기능을 운영 적용 완료로 보고하지 않는다.

## 운영 반영·종료 snapshot

기능 PR #754가 main `1adf577e38a7e580f1bbc0499a871c943cecc289`에 병합됐고 운영 배포/공개·인증 경계 검증을 완료했다. 상세 증거는 CHECK의 운영 반영 절을 따른다. 같은 WO의 기존 branch에서 종료 문서만 연속 보완한다.

이 체크는 종료 문서 병합 전 snapshot이다. I09의 일회성 PostgreSQL은 정리했으나 문서 CI·통합과 실제 worktree/branch 정리는 아직 남아 있어 ACTIVE와 미완료 체크를 유지한다. 추가 조사·설계 통합 PR #721도 정리 대상이다. 실제 종료 이후의 최종 상태는 [정리 실행 기록](https://github.com/Renagang21/o4o-platform/pull/754#issuecomment-6314873874)에서 갱신한다. 정리 전에는 완료로 표시하지 않는다.
