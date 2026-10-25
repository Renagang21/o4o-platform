# 내 매장 상담·컨텐츠·채널 정비 main 통합·배포

> **상태**: ACTIVE
> **작성일**: 2026-10-25 · **최종 갱신**: 2026-10-25
> **사용자 지시**: ‘main에 병합 배포’. 이 공간에서 PR·CI/검토·병합·배포를 진행한다. 만료 상담 정리 운영 활성화 지시를 포함하며 실기기·현장 음성·약사 검수는 사용자가 후속으로 연기했다.
> **기준 main**: `42dddc91b5ee18605c62b9c3e55091137dcd2b7f`
> **대상 branch**: `wo/store-consultation-cleanup-deployment` — 선행 상담·상품 자료·채널 개발을 포함한 단일 인계 branch
> **선행 증거**: [개발 CHECK](../checks/CHECK-O4O-STORE-CONSULTATION-CONTENT-CHANNEL-COMPLETION-V1.md) · [배포 연결 CHECK](../checks/CHECK-O4O-STORE-CONSULTATION-CLEANUP-DEPLOYMENT-V1.md)

## 실행

- [x] 원격 HEAD·PR 유무·현재 main ruleset 확인. 기존 PR 0건, PR 필수/CI Gate/필수 human approval 0 기준. 진행 중 타 Promote와 운영 변경을 겹치지 않음.
- [x] 최신 main 정상 merge(`faecd1705c`). AI 정본의 충돌은 내 매장 §14-2와 최신 회계 §15~17을 함께 보존. 선행 API/Store·정리 job/배포 설정을 유지.
- [ ] 최신 Core/인증 변경과 결합한 API/Store·관련 테스트·build를 확인하고 PR 생성. source HEAD에 고정된 CI·자동 검토·미해결 지적을 확인/처리.
- [ ] 진행 중 운영 배포가 완료된 뒤 최신 main 위치·HEAD·CI/review를 다시 확인하고 PR을 순차 병합. 우회/force push/auto-merge 사용 안 함.
- [ ] post-merge CI·Delivery 판정 확인. API 설정 변경은 MANUAL/GATED. 현재 serving→target 범위에 새 schema/migration이 없는지 확인하고 기존 Promote에서 API/Store를 verified 배포.
- [ ] API/웹 공개 smoke와 실제 serving SHA·상담 cleanup mode/중지 flag를 확인. 관측하지 못한 실제 정리 count·기기/언어/약사 품질은 별도 표시.
- [ ] CHECK/정본·PR에 통합/배포와 검증 한계를 기록하고 정확한 main/remote 상태를 인계.

## 범위

정리 apply는 기존 90초 연결 만료 상태의 현재 전달 본문·미확인 답변/연결 코드를 비우고 epoch를 교체하는 범위다. 기기 등록·게시 상품/컨텐츠·업무 자산은 보존한다. 운영자가 설정한 enabled=false는 이번 배포도 보존한다. 원문 장기 이력·새 Core/권한/schema·의존성·IAM/credential·모델 가격 변경은 없다. 운영 실계정 업무/유료 AI와 실제 기기 검수는 이번에 실행하지 않는다.

직접 GCP identity는 주입되지 않았으므로 기존 production/WIF 배포 경로의 검증 결과를 사용한다. 확인할 수 없는 Cloud Logging count를 설정 반영으로 대신 완료 표시하지 않는다. 실제 DB raw 응답·사용자/매장명·계정값은 저장소/공개 로그에 남기지 않는다.

## 통합 CI 보완

PR #813의 첫 HEAD `7bac1d00e1`은 Codex 지적 0건·보안/품질/웹 build 통과 후 전체 API shard 3에서 실패했다(`40177426528`). 같은 shard를 로컬에서 실행해 `store-production-external-llm-realignment-contract.spec.ts`의 단일 실패를 재현했다(1 FAIL·2,908 PASS·331 SKIP). 사용자가 제공한 CI 실패도 같은 검사/수치다. 기존 검사가 모든 다국어 작성의 `task: 'translate'` 리터럴을 요구해 한국어 원문 작성 분기를 인정하지 못했다.

검사는 한국어 원문 작성/번역 분기와 참조/결과 언어 전달을 확인하도록 보완했다. 함께 점검해 외국어 탭에 기준 본문이 없을 때도 결과 언어가 빠지지 않도록 번역 prompt를 유지했다. UI에서 한국어 첫 작성·원문 있는 영어·원문 없는 영어의 실제 guide 생성과 결과의 편집기 반영/자동 저장·발행 없음 3건을 추가했다. 집중 계약 113·다국어 UI 39·Store build·변경 파일 lint PASS. 최신 HEAD로 필수 CI/자동 검토를 다시 확인한다. 검사를 삭제/skip하거나 gate를 낮추지 않았다.

GitHub 로그 호스트 접근은 환경 허용 목록의 403으로 막혀 있다. 기존 도메인을 보존하고 `results-receiver.actions.githubusercontent.com`만 추가한 초안을 저장했으며 적용/게시 완료로 표시하지 않는다. 로컬 재현과 사용자의 로그로 원인을 확인했고 개발·CI 보완은 계속 진행한다.

수정 HEAD `56e7795b82`의 CI는 API 3개 shard가 모두 통과했다. 웹 build에 포함된 Store 검사에서는 음성 회귀 1건이 실패했다(848건 중 847 PASS). GitHub annotation과 사용자가 제공한 전체 로그에서 같은 `consultation-speech.test.tsx:66`을 확인했다. 음성 이벤트 직후 저장한 DOM 참조로 버튼을 동기 조회하던 검사를 현재 화면 재조회·인식 시작 상태 확인·비동기 ASR callback 완료 후 단언하도록 바꿨다. 원래 조작/문장/명시 실행 검사를 유지하고 예기치 않은 인식 abort 없음도 추가했다. `CI=true`에서 음성 18건의 5개 순서 seed 전부 PASS·Store 전체 848 PASS·lint PASS. 새 HEAD로 CI와 검토를 다시 확인한다.

HEAD `521d375f44`의 자동 검토에서 P2 1건을 확인했다. O4O 취급 상품 원문 endpoint는 `canonical` 매장용 설명만 반환하지만 Picker가 `published`만 허용해 정상 자료를 빈 결과로 처리했다. 실제 controller/DTO 계약에 맞춰 canonical만 선택하도록 수정했다. canonical 응답의 요청 언어/한국어 대체·draft/published 제외·본문 없음/실패/재시도와 명시 삽입을 검증했다. Picker 6건·Store 전체 851건·Store build/lint PASS. 해당 지적은 수정 commit push 후 해결 처리하고 최신 HEAD를 재검토한다.
