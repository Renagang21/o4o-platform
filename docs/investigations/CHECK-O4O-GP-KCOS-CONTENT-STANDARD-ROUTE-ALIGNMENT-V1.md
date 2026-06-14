# CHECK-O4O-GP-KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1

> **WO:** `WO-O4O-GP-KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1`
> **상태:** ✅ 종료 고정 (Phase A 백엔드 + Phase B 프론트 + live UI smoke 전부 PASS)
> **일자:** 2026-06-14

---

## 결론

KPA `/content` 회원 작성 콘텐츠 표준을 GlycoPharm / K-Cosmetics 에 백엔드→프론트 순으로 미러링 완료(documents-only). prod live UI smoke 까지 PASS.

```
KPA  /content        = 기준형 (무변경)
GP   /content        = 기준형 적용 완료
KCos /content        = 기준형 적용 완료
/store-hub/content   = 운영자 발행 browse 유지 (영향 없음)
/resources           = 자료실 유지
```

## 커밋

| 단계 | 커밋 | 내용 |
|------|------|------|
| Phase A | `867671c7f` | `body TEXT` 마이그레이션 + GP/KCos 회원 contents CRUD(`POST/GET:id/PATCH/DELETE/POST:id/view`) |
| Phase B | `c6b738e42` | GP/KCos `api/content.ts` + `pages/contents/`(List/Write/Detail) + App.tsx 라우트 |
| Phase B fix | `2f163471f` | contentApi 가 axios `res.data` envelope unwrap (UI smoke 에서 발견) |

## 검증

### 배포 / 마이그레이션
- API/Web deploy 전부 green. `typeorm_migrations` 에 `AddBodyToGpKcosContents20261112000000`(id 545) 적용 확인.

### Phase A API smoke (renagang21, prod)
- GP/KCos 모두 생성/조회/수정/조회수/목록(`my`)/삭제 PASS, `body` 영속 확인.

### Phase B live UI smoke (Playwright, prod)
| 항목 | GP | KCos |
|------|:--:|:--:|
| `/content` 목록 렌더(공통 SearchBar, 비로그인 작성버튼 숨김) | ✅ | ✅ |
| 로그인 후 `새 글 작성` 노출 | ✅ | ✅ |
| 작성 → 상세 자동 이동(`/content/:id`) | ✅ | ✅ |
| 상세 렌더(제목/작성자/조회/태그/본문/링크복사/수정) | ✅ | ✅ |
| 수정 폼 pre-fill → 저장 → 상세 반영 | ✅ | ✅ |
| `/store-hub/content` browse 유지 | ✅ | ✅ |

### smoke 데이터 정리
- 생성한 테스트 콘텐츠(GP 3 / KCos 1) 전부 soft-delete. 회원 콘텐츠 목록 `total=0` 확인.

## smoke 중 발견·수정한 결함

- **contentApi 응답 envelope 미언랩(2f163471f):** `api`(authClient.api)는 axios 인스턴스라 응답 envelope 이 `res.data` 에 위치. 최초 Phase B 코드가 `res.success` 를 직접 참조(잘못된 타입 단언으로 tsc 통과) → POST 201 성공해도 상세 이동 안 됨. `.then(r => r.data)` unwrap + 반환타입 명시로 수정, 재배포 후 재-smoke PASS.

## 불변 정책 준수

- 제품 비종속 · KPA 무변경 · `/store-hub/content` browse 유지 · `/library/content` 복원 없음 · 타 세션 WIP 미접촉(내 파일만 path-specific stage).

---

*End of CHECK-O4O-GP-KCOS-CONTENT-STANDARD-ROUTE-ALIGNMENT-V1*
