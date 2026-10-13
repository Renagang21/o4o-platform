# 공급자 이미지·콘텐츠·모바일 정비

> **상태**: ACTIVE
> **작성일**: 2026-10-13 · **최종 갱신**: 2026-10-13 (KST)
> **근거**: 사용자 — 다음 작업을 작게 나누지 말고 진행. 공급자 코드 정비 5차, commit → push까지.

## TODO와 최신 모집단

조사 전에 `/workspace/artifacts/supplier-code-phase5-todo.md`를 작성했다.
최신 main `75a28d931`에서 전용 clone/`wo/supplier-code-phase5`를 만들고,
이전 승인 push `dd07ab8ec`를 dependency merge했다. 과거 checkout/branch는 보존했다.
현재 route/mount·controller/service·웹 API·raw-source 계약과 공통 에디터 소비처를 재조사한 뒤 TODO를 보정했다.

정본: [Role Workspace §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[Supplier Boundary](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md),
[Shared Module Protocol](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md).

- [x] 최초 TODO → 최신 main·코드·문서·소비처 점검 → 범위 보정
- [x] 원래 이미지/가져오기/라이브러리/설명서 HTTP 검사와 모바일 재현
- [x] 이미지 접근/HTTP, 라이브러리 접근·조회/쓰기/제공 책임 분리
- [x] STORE 설명서 offer 소유·Master 연결 조회와 저장 위임을 authoring 서비스로 이동
- [x] 이미지 fetch 리다이렉트 안전 검사와 credential URL 사전 거부 보완
- [x] Drawer viewport 제한과 공통 이미지 도구막대의 위치/폭/resize 보완
- [x] 회귀·AST·타입·빌드·lint·PC/mobile·공유 소비처 검증
- [ ] 명시적 파일 commit → 전용 branch push → 원격 일치 확인

## 한 묶음의 구현

| 영역 | 구현 |
|---|---|
| 이미지 5개 API | 기존 public factory/route/인가 순서를 유지. `supplier-images/access.ts`의 상태/소유 판정과 `handlers.ts`의 전송·업로드·대표/삭제 처리로 분리. controller 310 → 115행 |
| 라이브러리 8개 API | 기존 singleton/default router와 순서를 유지. 별도 legacy gate, 조회/생성·수정·삭제/제공 handler로 분리. facade 359 → 109행 |
| STORE 설명서 3개 API | `SupplierStoreDescriptionAuthoringService`가 공급자 offer의 소유/Master 연결을 조회하고 기존 shared draft writer에 위임. 요청 검증·HTTP 오류/응답·철회 정책은 유지 |
| 가져오기 2개 API | 이미 얇은 controller는 변경하지 않음. 복사 모드/부분 실패·blob 프록시·header 계약 검증 추가 |
| 안전한 이미지 fetch | 초기 URL뿐 아니라 각 redirect target의 protocol/host/IP/DNS/same-origin을 검사한 뒤 다음 요청. 공유 timeout, 최대 5회 이동, 중간 response body 정리. 사용자정보 포함 URL은 fetch 전에 INVALID_URL로 거부하고, 복사/업로드 실패 로그에는 입력 URL을 넣지 않음 |
| 모바일 Drawer | `w-full max-w-[480px]`로 PC 480px를 유지하고 작은 viewport 안에 제한 |
| 공통 RTE 이미지 메뉴 | 기존 폭/정렬/삭제·저장 API를 유지. 실제 메뉴 크기로 위치 제한, 그룹 wrapping, ResizeObserver/resize listener 및 cleanup으로 좁은 영역·화면 크기 변경 대응 |

이미지의 살아 있는 자기 offer 소유, image/master 일치, `supplier_upload`/created_by,
다른 출처 대표·thumbnail 보호, GCS 삭제 범위, OCR 위임은 원본과 대조했다.
라이브러리 public/linked/active 구분, ContentMeta fallback, document/media 입력, 타인 소유 404,
canonical handoff target과 reused 200은 유지한다. 기존 서로 다른 gate를 합치지 않았다.
STORE 설명서의 sanitizer·검수/철회·SharedProductDescriptionService는 변경하지 않았다.

초기 URL만 확인하고 fetch의 자동 redirect를 허용하던 방어 공백을 fixture로 재현했다.
정상 same-origin 이동과 복사/프록시 bytes는 유지하며 내부·다른 origin 이동을 다음 fetch 전에 차단한다.
userinfo 거부는 네트워크에 전달하기 전의 검사이며 실제 인증정보 전송 성공을 주장하지 않는다.
외부 endpoint·props·입출력 envelope·인가/역할·정산·schema·package/lockfile·CI·정본 정책 변경은 없다.

## 검증·종료 범위

동일 정비 트랙 [CHECK 5차 절](../checks/CHECK-O4O-SUPPLIER-PRODUCT-UI-CODE-CLEANUP-V1.md)에
공유 소비처 영향 매트릭스와 명령/증거를 기록했다. 최종 fetch에서도 main은 `75a28d931`이다.
실계정/운영 DB·실제 저장소/외부 URL 사용은 사용자 유예대로 NOT_RUN.
PR/main merge·배포는 종료 범위 밖이다. 임시 브라우저 서버 5192를 종료했다.

문서 정합: 해당 없음 — 정본 정책 변경이나 이번 범위의 추가 문서 drift 없음.
