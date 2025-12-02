# 📄 **Step 13 — 기존 main-site 정리(폐기·이관·아카이브) Work Order**

## O4O Platform NextGen Main-Site Migration

Version: 2025-12
Author: ChatGPT PM
------------------

# 0. 목적

NextGen Frontend (`apps/main-site-nextgen/`)가
이미 **기존 main-site의 모든 기능(Commerce, Dropshipping, Admin, Auth, Customer)**
을 완벽하게 대체할 수 있는 상태로 완성됨.

따라서 다음 단계를 수행한다:

* 기존 `apps/main-site/` 정리(폐기 또는 보관)
* NextGen main-site를 공식 main-site로 승격
* 레거시 코드 정리 → CI/CD 오류 근본 제거
* monorepo 전체의 구조 단순화
* 명확한 경로 관리 및 프로젝트 유지관리성 극대화

---

# 1. 정리 방식 선택 (3가지 옵션)

다음 중 하나를 선택해야 하며, 기본 권장은 "옵션 B"이다.

### ✔ **옵션 A — 완전 삭제**

```
rm -rf apps/main-site
```

* 가장 깔끔한 방법
* CI/CD 즉시 정상화
* 레거시 코드 완전 소멸

### ✔ **옵션 B — 아카이브 폴더로 이동 (권장)**

```
mkdir -p legacy/
mv apps/main-site legacy/main-site
```

* 삭제는 하지 않지만 monorepo 구동에 영향 없음
* CI/CD 대상에서 제외됨
* 참고 자료로 보관 가능
* 가장 안전한 방식

### ✔ **옵션 C — "main-site-old"로 rename**

```
mv apps/main-site apps/main-site-old
```

* 적당히 안전하지만
* 폴더 구조 내에 여전히 남아 CI 스캔에 걸릴 수 있음
* 비추천

→ **정식 권장: 옵션 B (아카이브 보관)**

---

# 2. CI/CD 제외 설정

레거시 main-site를 아카이브하거나 폐기한 후
만약 Monorepo가 여전히 해당 패키지를 스캔한다면
다음 작업을 수행해야 함:

### 2.1 pnpm workspace에서 제외

`pnpm-workspace.yaml` 수정:

```yaml
packages:
  - apps/*
  - packages/*
  - "!legacy/*"
```

### 2.2 GitHub Actions에서 exclude

`.github/workflows/ci.yml`:

```yml
run: pnpm -F "!legacy" -F "!@o4o/dropshipping-core" build
```

또는:

```yml
run: pnpm --filter=!legacy --filter=!@o4o/dropshipping-core build
```

### 2.3 TSConfig에서 exclude

`tsconfig.base.json`:

```json
{
  "exclude": ["legacy", "apps/main-site-old"]
}
```

---

# 3. main-site-nextgen → main-site 승격

다음 명령으로 NextGen을 정식 main-site로 바꾼다:

```
mv apps/main-site apps/main-site-legacy   # 혹은 legacy/main-site
mv apps/main-site-nextgen apps/main-site
```

이제 repo는 아래처럼 정리됨:

```
apps/main-site                 ← NextGen 정식 메인사이트
apps/main-site-legacy          ← 보관
apps/api-server
apps/admin-dashboard
packages/*
services/*
```

---

# 4. CI/CD를 NextGen 기준으로 재설정

### 4.1 GitHub Actions에서 NextGen main-site만 빌드하도록 수정

```yaml
run: pnpm -F apps/main-site build
```

또는 full monorepo 빌드 시:

```yaml
run: pnpm build --filter=!legacy --filter=!apps/main-site-legacy
```

### 4.2 테스트도 NextGen 기준으로 변경

```yaml
run: pnpm test -F apps/main-site
```

---

# 5. nginx / apache / lightsail 환경에서 라우트 변경

기존 main-site 경로(`/home/site/www/main-site`)를
새로운 main-site로 변경해야 함.

Lightsail 예시:

```
rm -rf /var/www/main-site
cp -R /deploy/main-site-nextgen /var/www/main-site
```

혹은 symlink:

```
ln -s /deploy/apps/main-site /var/www/main-site
```

---

# 6. 배포 파이프라인 업데이트

NextGen main-site 기준으로 deploy 스크립트 수정:

```
deploy-main-site.sh:
  cd apps/main-site
  pnpm install
  pnpm build
  rsync ./dist to production
```

---

# 7. 성공 기준 (DoD)

* [ ] 기존 main-site는 monorepo 내에서 완전히 제거 또는 아카이브
* [ ] main-site-nextgen → main-site로 rename 완료
* [ ] CI/CD 빌드 정상화
* [ ] 기존 dropshipping-core 문제 제거됨
* [ ] GitHub Actions 성공
* [ ] NextGen main-site 정상 렌더링
* [ ] 경로 충돌 없음
* [ ] 배포 정상 작동

---

# 8. 예상 작업 시간

총 **1~2시간**

* 폴더 이동/삭제: 5분
* workspace / tsconfig / CI 변경: 20~40분
* 배포 config 업데이트: 20분
* 테스트: 20분

---

# ✔ Step 13 — 기존 main-site 정리 Work Order 생성 완료!

---

이제 이 문서를 개발 채팅방에 붙여넣으면
NextGen main-site로의 **정식 전환(승격)** 작업을 바로 시작할 수 있습니다.
