# 📄 **Step 23 — Multi-Instance Deployment Manager Work Order**

## O4O Platform – Multi-Instance Automatic Deployment Engine

Version: 2025-12
Author: ChatGPT PM
Date: 2025-12-03

---

## 0. 목적

현재 O4O Platform의 운영 구조는:

* 서비스마다 별도 서버(Lightsail) 생성
* repo clone
* pnpm install
* main-site & api-server & admin-dashboard 설치
* AppStore 앱 선택 설치
* 환경 변수 설정
* 배포

이를 **완전히 자동화**하는 시스템이 Step 23의 목표이다.

### Step 23을 완료하면:

✔ 신규 사이트 자동 생성 (예: yaksa.site, neture.co.kr, pharmacy.co.kr 등)
✔ AppStore 앱 자동 설치
✔ CMS 초기화
✔ API Server 초기 데이터 세팅
✔ SSL 인증서 자동 발급
✔ GitHub Actions 자동화 연동
✔ 서비스 수십 개도 문제 없이 운영 가능

즉, "O4O 플랫폼을 SaaS 제품"으로 올리는 기반 기술이다.

---

## 1. 전체 아키텍처 설계

Multi-Instance Deployment Manager는 다음 구조로 구성된다:

```
apps/admin-dashboard/
  src/pages/deployment/manager.tsx     ← 관리 UI
services/deployment-service/
  deploy.ts                              ← Lightsail 배포 스크립트
  template/
      main-site/
      api-server/
      admin-dashboard/
apps/api-server/
  src/modules/deployment/                ← 백엔드 API
```

핵심 컴포넌트:

### ✔ Deployment UI (admin-dashboard)

* 서비스 생성 폼
* 서비스 리스트
* "배포 시작" 버튼
* 진행 상태 표시

### ✔ Deployment API (api-server)

* POST /api/deployment/create
* GET  /api/deployment/status
* POST /api/deployment/install-apps

### ✔ Deployment Script(services/)

* 서버 생성 (Lightsail 혹은 EC2)
* git clone
* pnpm install
* build
* pm2 설치
* nginx 설정
* SSL 설정
* 앱 설치(AppStore → manifest 기반)
* CMS 초기화
* domain binding

---

## 2. Phase 구성 (A~H)

### Phase A — Deployment Module 생성 (API Server)

### Phase B — Deployment Service Shell 생성 (services/)

### Phase C — Server Provisioning (Lightsail CLI)

### Phase D — Repo bootstrap + Build 자동화

### Phase E — AppStore 자동 설치 파이프라인

### Phase F — CMS 초기 데이터 생성

### Phase G — admin-dashboard UI 추가

### Phase H — E2E 테스트

---

## 3. Phase A — Deployment Module 생성 (API Server)

경로:

```
apps/api-server/src/modules/deployment/
```

파일:

* deployment.module.ts
* deployment.controller.ts
* deployment.service.ts
* deployment.entity.ts
* dto/create-instance.dto.ts
* dto/install-apps.dto.ts

### Controller 스펙

```ts
@Controller("deployment")
export class DeploymentController {
  constructor(private service: DeploymentService) {}

  @Post("create")
  createInstance(@Body() dto: CreateInstanceDto) {
    return this.service.createInstance(dto);
  }

  @Get("status/:id")
  status(@Param("id") id: string) {
    return this.service.getStatus(id);
  }

  @Post("install-apps")
  installApps(@Body() dto: InstallAppsDto) {
    return this.service.installApps(dto);
  }

  @Get("list")
  listInstances() {
    return this.service.listInstances();
  }

  @Delete(":id")
  deleteInstance(@Param("id") id: string) {
    return this.service.deleteInstance(id);
  }
}
```

### CreateInstanceDto 예시

```ts
export class CreateInstanceDto {
  domain: string;
  apps: string[];
  region?: string;
  instanceType?: string;
}
```

### Entity 스펙

```ts
@Entity()
export class DeploymentInstance {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  domain: string;

  @Column("simple-array")
  apps: string[];

  @Column()
  status: "pending" | "provisioning" | "installing" | "ready" | "failed";

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  instanceId: string;

  @Column({ type: "text", nullable: true })
  logs: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## 4. Phase B — Deployment Service Shell 생성

폴더:

```
/services/deployment-service/
```

파일:

* deploy.ts
* config.ts
* template/
  * nginx.conf.template
  * ecosystem.config.js.template
  * .env.template
* scripts/
  * setup-node.sh
  * setup-nginx.sh
  * setup-ssl.sh

최소 구조:

```ts
export async function deployInstance({ domain, apps }) {
  await createLightsailInstance(domain);
  await installNodeAndPNPM(domain);
  await cloneO4ORepo(domain);
  await buildMainSite(domain);
  await buildAPIServer(domain);
  await setupNginx(domain);
  await setupSSL(domain);
  await registerDomain(domain);
  await installApps(domain, apps);
  return { success: true };
}
```

---

## 5. Phase C — Server Provisioning (Lightsail)

AWS Lightsail CLI 사용:

```bash
aws lightsail create-instances \
  --instance-names $DOMAIN \
  --availability-zone ap-northeast-2a \
  --blueprint-id amazon_linux_2023 \
  --bundle-id nano_3_0
```

추가 작업:

* 방화벽 설정 (포트 80, 443, 22)
* static IP 할당
* domain route53 등록(Optional)

---

## 6. Phase D — Repo bootstrap + Build 자동화

서버 내 실행 스크립트:

```bash
#!/bin/bash
# setup-instance.sh

git clone https://github.com/Renagang21/o4o-platform.git
cd o4o-platform
pnpm install
pnpm build --filter=apps/main-site
pnpm build --filter=apps/api-server
pm2 start ecosystem.config.js
```

nginx 템플릿을 template/ 폴더에 포함.

---

## 7. Phase E — AppStore 자동 설치 파이프라인

핵심 기능:

```
POST /api/deployment/install-apps
{
  domain: "yaksa-branch01.site",
  apps: ["commerce", "customer", "forum-yaksa"]
}
```

AppStore Loader에서 제공된 manifest 정보를 사용하여
서비스 배포 후 자동 설치.

로직:

* API 서버의 /apps/appstore/install 연동
* NextGen UI가 자동 반영됨
* CMS 초기 페이지 생성

---

## 8. Phase F — CMS 초기화

배포 시 자동 생성되는 페이지(View):

* /home
* /login
* /shop
* /dashboard
* /contact

ViewGenerator 기반으로 기본 페이지 생성 → CMS에 저장.

---

## 9. Phase G — Admin Dashboard UI

경로:

```
apps/admin-dashboard/src/pages/deployment/
```

파일:

* manager.tsx (메인 페이지)
* form.tsx (인스턴스 생성 폼)
* status.tsx (상태 모니터링)
* list.tsx (인스턴스 목록)
* detail.tsx (인스턴스 상세)

기능:

* 새로운 서비스 생성
* 설치된 인스턴스 목록
* 배포 상태
* 앱 설치/제거
* 서버 재시동
* 로그 확인

---

## 10. Phase H — E2E 테스트

테스트 시나리오:

1. admin-dashboard → "서비스 생성" 클릭
2. domain 입력  → 배포 시작
3. Lightsail 인스턴스 자동 생성
4. repo clone + build
5. AppStore 앱 자동 설치
6. CMS 초기 페이지 생성
7. 브라우저 접속
8. 정상 동작 확인

---

## 11. 성공 기준 (DoD)

* [ ] admin-dashboard에서 "새 서비스 생성" 버튼 동작
* [ ] Lightsail 인스턴스 자동 생성
* [ ] platform repo 자동 배포
* [ ] main-site + api-server 정상 기동
* [ ] AppStore 앱 자동 설치
* [ ] CMS 초기 페이지 정상 생성
* [ ] NextGen 페이지 정상 렌더링
* [ ] 배포 실패 없이 작동
* [ ] 로깅/모니터링 가능

---

## 12. 구현 순서

1. **Phase A**: API Server에 Deployment Module 생성
2. **Phase B**: Deployment Service 기본 구조 생성
3. **Phase C**: Lightsail 프로비저닝 스크립트 작성
4. **Phase D**: 자동 빌드/배포 스크립트 작성
5. **Phase E**: AppStore 자동 설치 로직 구현
6. **Phase F**: CMS 초기화 기능 구현
7. **Phase G**: Admin UI 구현
8. **Phase H**: 통합 테스트

---

## ✔ Step 23 — Multi-Instance Deployment Manager Work Order 완료!

이 시스템이 완성되면 O4O Platform은 **진정한 Multi-Instance SaaS**가 됩니다.
