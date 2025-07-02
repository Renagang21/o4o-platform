# 🤖 Claude MCP + Cursor IDE 통합 워크플로우

## 📋 **현재 활성화된 MCP 서버들**

### **🔥 실제 사용된 핵심 MCP (이번 세션)**
| MCP 서버 | 용도 | 실제 사용 사례 |
|---------|------|----------------|
| **filesystem** | 로컬 파일 시스템 작업 | ✅ 스크립트 파일 생성, 디렉토리 탐색 |
| **github** | GitHub 저장소 관리 | ✅ o4o-platform 구조 분석, 파일 확인 |
| **sequential-thinking** | 복잡한 문제 해결 | ✅ AWS Lightsail 동기화 문제 분석 |
| **knowledge-graph-memory** | 정보 연관성 관리 | ✅ 프로젝트 정보 저장 및 연결 |

### **⚡ 설정된 추가 MCP들**
| MCP 서버 | 용도 | 활용 시나리오 |
|---------|------|---------------|
| **memory** | 대화 기억 및 컨텍스트 | 장기 프로젝트 진행 상황 기억 |
| **playwright** | 웹 자동화 | E2E 테스트, 웹 스크래핑 |
| **desktop-commander** | 시스템 제어 | 파일 관리, 프로세스 제어 |
| **firecrawl** | 웹 크롤링 | 웹사이트 데이터 수집 |
| **aws-core** | AWS 리소스 관리 | EC2, S3 등 AWS 서비스 제어 |
| **aws-serverless** | AWS 서버리스 | Lambda, API Gateway 관리 |

## 🎯 **Claude + Cursor IDE 협업 워크플로우**

### **Phase 1: 프로젝트 분석 (Claude)**
```typescript
// Cursor에서 프로젝트 개요 작성
/* 
프로젝트: o4o-platform
문제: AWS Lightsail 서버 동기화 최적화 필요
*/

// Claude MCP 활용:
// 1. filesystem: 프로젝트 구조 분석
// 2. github: 저장소 현황 파악  
// 3. sequential-thinking: 문제 해결 전략 수립
```

### **Phase 2: 해결책 생성 (Claude MCP)**
```bash
# Claude가 MCP로 생성한 파일들
setup-selective-sync.sh      # 원클릭 설정
setup-apiserver-sync.sh      # API 서버용
setup-webserver-sync.sh      # 웹 서버용
.github/workflows/selective-deploy.yml  # 자동화
```

### **Phase 3: 코드 개발 (Cursor IDE)**
```typescript
// Cursor에서 개발할 코드들
// Claude가 만든 스크립트를 기반으로 추가 개발

// services/api-server/deployment/sync-manager.ts
export class SyncManager {
  async selectiveSync(serverType: 'api' | 'web') {
    // Claude 스크립트를 TypeScript로 구현
  }
}

// services/main-site/utils/deploy-helper.ts  
export const deployHelper = {
  checkChanges: () => { /* ... */ },
  deployToServer: () => { /* ... */ }
}
```

### **Phase 4: 테스트 및 배포 (Claude + Cursor)**
```bash
# Cursor Terminal에서
npm run test:selective-sync

# Claude MCP로 AWS 서버 확인
# aws-core, aws-serverless MCP 활용
```

## 🔄 **실제 협업 시나리오**

### **시나리오 1: 새 기능 개발**
```typescript
// 1. Cursor에서 코딩
// services/api-server/routes/user.ts
export const userRoutes = {
  // 새로운 사용자 관리 API
}

// 2. Claude에게 요청
// "이 API 변경사항을 o4o-apiserver에만 배포하고 싶어"
// → Claude가 selective sync 스크립트 업데이트
```

### **시나리오 2: 버그 수정**
```typescript
// 1. Cursor에서 버그 발견
// services/main-site/components/Header.tsx
const Header = () => {
  // 버그 수정
}

// 2. Claude에게 문의
// "웹서버만 업데이트하고 API 서버는 건드리지 말아줘"
// → Claude가 webserver 전용 배포 스크립트 실행
```

### **시나리오 3: 인프라 관리**
```bash
# Cursor에서 인프라 코드 작성
# infrastructure/aws/lightsail-config.tf

# Claude MCP로 실제 AWS 리소스 확인
# aws-core MCP: EC2 인스턴스 상태 체크
# aws-serverless MCP: Lambda 함수 배포 상태 확인
```

## 📁 **Cursor 워크스페이스 설정**

### **.cursor/claude-mcp-integration.json**
```json
{
  "mcpIntegration": {
    "enabled": true,
    "autoSync": true,
    "preferredMcpServers": [
      "filesystem",
      "github", 
      "sequential-thinking"
    ],
    "projectSpecific": {
      "o4o-platform": {
        "syncScripts": "./scripts/sync/",
        "deploymentTargets": ["o4o-apiserver", "o4o-webserver"]
      }
    }
  }
}
```

### **Cursor 작업 디렉토리 구조**
```
o4o-platform/
├── .cursor/
│   ├── claude-mcp-integration.json
│   └── workflow-templates/
├── claude-generated/              ← Claude MCP 생성 파일들
│   ├── setup-selective-sync.sh
│   ├── deployment-scripts/
│   └── automation/
├── cursor-development/            ← Cursor 개발 코드
│   ├── api-enhancements/
│   ├── web-improvements/
│   └── infrastructure/
└── services/
    ├── api-server/
    └── main-site/
```

## 🎯 **Best Practices**

### **1. 역할 분담**
- **Claude MCP**: 인프라, 자동화, 문제 분석, 스크립트 생성
- **Cursor IDE**: 비즈니스 로직, UI/UX, 테스트 코드

### **2. 커뮤니케이션 패턴**
```typescript
// Cursor에서 주석으로 Claude와 소통
/*
@Claude: 이 함수를 AWS Lambda로 배포하고 싶어요.
deployment target: o4o-apiserver
sync strategy: selective (api-server only)
*/
export const processPayment = async (data: PaymentData) => {
  // 결제 처리 로직
}
```

### **3. 버전 관리**
```bash
# 브랜치 전략
git checkout -b feature/selective-sync-enhancement
# Claude 스크립트는 claude-generated/ 폴더
# Cursor 코드는 각 서비스 폴더

# 커밋 메시지 컨벤션
# Claude: "🤖 Add selective sync automation"  
# Cursor: "💻 Implement user management API"
```

## 🚀 **실행 가이드**

### **Step 1: Cursor에서 이 파일 생성**
1. Cursor IDE에서 `claude-mcp-integration.md` 파일 생성
2. 이 내용을 복사해서 붙여넣기
3. 프로젝트 루트에 저장

### **Step 2: 워크플로우 테스트**
1. Cursor에서 간단한 코드 변경
2. Claude에게 "이 변경사항을 특정 서버에만 배포해줘" 요청
3. MCP 스크립트 활용 확인

### **Step 3: 팀 공유**
1. 팀원들에게 이 워크플로우 가이드 공유
2. 각자 Cursor 설정 맞춤화
3. Claude MCP 활용법 교육

---

## 🎉 **기대 효과**

- **⚡ 개발 속도**: Claude(분석/자동화) + Cursor(코딩) = 2배 빨라짐
- **🎯 정확성**: 각 도구의 강점을 최대 활용
- **🔄 효율성**: 반복 작업 자동화로 창의적 작업에 집중
- **🚀 배포**: 선택적 동기화로 안전하고 빠른 배포

**Claude MCP와 Cursor IDE가 완벽한 개발 파트너가 됩니다!** 🤝
