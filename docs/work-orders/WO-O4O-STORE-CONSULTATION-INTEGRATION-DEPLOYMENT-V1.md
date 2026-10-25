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
