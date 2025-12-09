# 📄 **Step 14 — Dropshipping-Core 레거시 완전 폐기 Work Order**

## O4O Platform Monorepo Final Cleanup

Version: 2025-12
Author: ChatGPT PM
------------------

# 0. 목적

`@o4o/dropshipping-core` 패키지는:

* TypeScript 빌드 오류가 지속적으로 발생
* `.js` 확장자 import 문제
* `@o4o/organization-core` 의존성 누락
* CI/CD를 지속적으로 실패시킴
* 현재 사용되지 않는 레거시 코드

따라서 다음 작업을 수행한다:

* dropshipping-core 패키지 아카이브 또는 완전 제거
* CI/CD 빌드 파이프라인 정상화
* monorepo 전체 빌드 성공 보장
* 유지보수 부담 제거

---

# 1. 현재 문제 상황

## 1.1 CI/CD 빌드 실패

```
Error: src/backend/cpt/dropshipping-cpt.routes.ts(2,43):
  error TS2307: Cannot find module
  '../../controllers/cpt/DropshippingCPTController.js'
  or its corresponding type declarations.

Error: src/backend/entities/ChannelProductLink.ts(11,27):
  error TS2307: Cannot find module './User.js'
  or its corresponding type declarations.

... (37 more errors)
```

## 1.2 임시 해결책 (현재 상태)

Step 11에서 `build:app-store-packages`에서 제외:

```json
"build:app-store-packages": "pnpm --filter @o4o-apps/forum run build && ..."
```

하지만 이것은 **임시 방편**이며, 근본적인 해결이 필요함.

---

# 2. 정리 방식 선택 (3가지 옵션)

### ✔ **옵션 A — 완전 삭제 (권장)**

```bash
rm -rf packages/dropshipping-core
rm -rf packages/dropshipping-cosmetics  # 관련 패키지
```

**장점:**
- CI/CD 즉시 정상화
- 가장 깔끔한 방법
- 유지보수 부담 제거

**단점:**
- 코드 복구 불가 (git history에는 남음)

### ✔ **옵션 B — 아카이브 폴더로 이동**

```bash
mkdir -p legacy/packages
mv packages/dropshipping-core legacy/packages/
mv packages/dropshipping-cosmetics legacy/packages/
```

**장점:**
- 삭제하지 않고 보관
- 참고 자료로 활용 가능
- 가장 안전한 방식

**단점:**
- 디스크 공간 차지

### ✔ **옵션 C — .backup 확장자로 rename**

```bash
mv packages/dropshipping-core packages/dropshipping-core.backup
```

**장점:**
- 빠른 복구 가능

**단점:**
- workspace에서 명시적 제외 필요
- 구조가 지저분해질 수 있음

→ **정식 권장: 옵션 B (아카이브 보관)**

---

# 3. 작업 절차

## 3.1 아카이브 이동

```bash
# 1. legacy 디렉토리 생성
mkdir -p legacy/packages

# 2. dropshipping 관련 패키지 이동
mv packages/dropshipping-core legacy/packages/
mv packages/dropshipping-cosmetics legacy/packages/

# 3. 확인
ls -la legacy/packages/
```

## 3.2 pnpm workspace 설정 업데이트

`pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
  - packages/*
  - "!packages/*.backup"
  - "!legacy/*"
```

## 3.3 package.json 스크립트 정리

`package.json`:

```json
{
  "scripts": {
    // dropshipping 관련 스크립트 제거 또는 주석 처리
    // "build:dropshipping": "pnpm --filter @o4o/dropshipping-core run build",
    // "typecheck:app-store-packages": "...",

    // 정리된 버전
    "build:app-store-packages": "pnpm --filter @o4o-apps/forum run build && pnpm --filter @o4o-apps/forum-neture run build && pnpm --filter @o4o-apps/forum-yaksa run build"
  }
}
```

## 3.4 GitHub Actions 업데이트

`.github/workflows/ci-pipeline.yml` 또는 관련 워크플로우:

```yaml
- name: Build shared packages
  run: |
    pnpm run build:packages --filter=!legacy --filter=!@o4o/dropshipping-core
```

## 3.5 TypeScript 설정 업데이트

`tsconfig.json` 또는 `tsconfig.base.json`:

```json
{
  "exclude": [
    "node_modules",
    "dist",
    "legacy",
    "**/*.backup"
  ]
}
```

## 3.6 의존성 정리

`package.json`에서 dropshipping-core 관련 의존성 제거:

```bash
# 의존성 검색
grep -r "@o4o/dropshipping" apps/*/package.json packages/*/package.json

# 필요시 제거
# apps/admin-dashboard/package.json 등에서 제거
```

---

# 4. 검증 절차

## 4.1 로컬 빌드 테스트

```bash
# 1. 의존성 재설치
pnpm install

# 2. 전체 빌드 테스트
pnpm run build:packages

# 3. 타입 체크
pnpm run type-check

# 4. 개별 앱 빌드 테스트
cd apps/admin-dashboard && pnpm build
cd apps/main-site-nextgen && pnpm build
```

## 4.2 CI/CD 테스트

```bash
# 1. 변경사항 커밋
git add .
git commit -m "chore: Archive dropshipping-core legacy packages"

# 2. develop 브랜치에 푸시
git push origin develop

# 3. GitHub Actions 확인
# https://github.com/[org]/o4o-platform/actions
```

---

# 5. 롤백 계획

만약 문제가 발생하면:

```bash
# 옵션 A: git revert
git revert HEAD

# 옵션 B: 아카이브에서 복원
mv legacy/packages/dropshipping-core packages/
mv legacy/packages/dropshipping-cosmetics packages/
pnpm install
```

---

# 6. 성공 기준 (DoD)

* [ ] dropshipping-core 패키지가 monorepo에서 제거/아카이브됨
* [ ] pnpm workspace 설정이 업데이트됨
* [ ] package.json 스크립트가 정리됨
* [ ] GitHub Actions CI/CD 빌드 성공
* [ ] 로컬 빌드 테스트 성공
* [ ] 타입 체크 통과
* [ ] admin-dashboard 빌드 성공
* [ ] main-site-nextgen 빌드 성공
* [ ] 의존성 충돌 없음

---

# 7. 예상 작업 시간

총 **30분 ~ 1시간**

* 아카이브 이동: 5분
* workspace 설정 업데이트: 10분
* package.json 정리: 10분
* CI/CD 설정 업데이트: 10분
* 테스트 및 검증: 15-30분

---

# 8. 추가 고려사항

## 8.1 admin-dashboard의 dropshipping 기능

만약 admin-dashboard가 dropshipping-core를 사용 중이라면:

1. 해당 기능을 비활성화하거나
2. 간단한 stub 구현으로 대체하거나
3. API 서버에서 직접 처리하도록 변경

## 8.2 API 서버 확인

```bash
# API 서버에서 dropshipping 관련 import 확인
grep -r "@o4o/dropshipping-core" apps/api-server/

# 필요시 제거 또는 대체
```

## 8.3 데이터베이스 영향

- dropshipping-core의 Entity 정의가 제거되므로
- 관련 테이블이 있다면 별도 마이그레이션 필요
- 하지만 대부분의 경우 API 서버에서 관리됨

---

# 9. 장기 계획

dropshipping 기능이 실제로 필요하다면:

1. **새로운 아키텍처로 재구현**
   - NextGen 방식 적용
   - TypeScript 5.x 호환
   - 모듈 시스템 최신화

2. **API 서버로 통합**
   - 프론트엔드 패키지로 분리하지 않음
   - API 엔드포인트로만 제공

3. **외부 서비스로 분리**
   - 마이크로서비스 아키텍처
   - 독립적인 dropshipping 서비스

---

# ✔ Step 14 — Dropshipping-Core 레거시 완전 폐기 Work Order 생성 완료!

---

이제 이 문서를 개발 채팅방에 붙여넣으면
**dropshipping-core 정리 작업**을 바로 시작할 수 있습니다.

이 작업이 완료되면:
- CI/CD가 완전히 안정화됩니다
- monorepo 구조가 깔끔해집니다
- NextGen 전환이 완전히 완료됩니다
