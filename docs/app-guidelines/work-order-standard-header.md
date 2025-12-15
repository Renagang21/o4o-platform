# Work Order Standard Header

> **모든 App / 기능 개발에 필수 적용**
> 본 문서는 CLAUDE.md v2.0을 기준으로 하며, 충돌 시 CLAUDE.md를 우선한다.

---

## 1. 브랜치 규칙 (절대 준수)

- develop 브랜치에서 개발 금지
- 반드시 `feature/<app-or-task>` 브랜치에서 진행
- 예: `feature/dropshipping-core-refactor-phase1`

---

## 2. CLAUDE.md 준수

- 본 Work Order는 CLAUDE.md 및 모든 규칙을 따른다
- Branch / AppStore / Hook / Migration-first 규약 필수 적용

---

## 3. 브랜치 전환 규칙

**전환 전:**
```bash
git add .
git commit -m "save state"
```

**전환 후:**
```bash
git pull --rebase
```

---

## 4. AppStore 개발 규칙

- `manifest.ts` & `lifecycle/` 필수 구현
- `manifestRegistry` + `appsCatalog` 등록 필수
- `api-server` 직접 import 금지
- Controller → Service → Entity 구조 준수

---

## 5. Merge 범위 제한

- 본 Work Order에서 생성/수정한 파일만 포함
- 다른 폴더/기능/서비스 변경 금지
- 본인이 수정하지 않은 코드 삭제 금지

---

## 6. Merge 충돌 처리 순서

1. 본인이 작업한 파일 우선 보존
2. 타 작업자의 파일은 변경 유지
3. 판단 불가 시 임의 수정 금지 → 보고

---

## 7. Merge 전 필수 절차

```bash
git checkout develop
git pull --rebase
git checkout <feature-branch>
git rebase develop
```

---

## 8. Merge 후 검증

- dev 환경 빌드 성공
- 본인 작업 영역만 반영되었는지 확인
- 기존 기능 손상 여부 확인

---

## 9. 절대 금지

| 금지 항목 | 사유 |
|-----------|------|
| 타 작업자 코드 삭제 | 작업 충돌 발생 |
| 기존 기능 덮어쓰기 | 플랫폼 안정성 훼손 |
| Core 기능 무단 수정 | FROZEN 정책 위반 |
| Work Order 없이 수정 | 추적 불가 |

---

## Work Order 템플릿

```markdown
# [WORK ORDER] <작업명>

## 헤더 확인
- ☐ 본 Work Order는 work-order-standard-header.md를 준수한다
- ☐ feature/* 브랜치에서 작업한다
- ☐ CLAUDE.md v2.0 규칙을 따른다

## 작업 범위
- 대상 앱:
- 작업 내용:

## 완료 기준 (DoD)
- ☐ 빌드 성공
- ☐ 테스트 통과
- ☐ 문서 업데이트

## 커밋 가이드
git commit -m "feat(<app>): <description>"
```

---

*Created: 2025-12-15*
*Governed by: CLAUDE.md v2.0*
