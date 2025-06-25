# AI 협업시 버전 관리 및 개발 가이드 - O4O Platform

## 🎯 **문서 목적**
AI 도구(Claude, Cursor 등)의 **구 버전 지식**과 **실제 최신 환경** 간의 불일치로 인한 문제를 예방하고 해결하기 위한 종합 가이드

---

## ⚠️ **핵심 문제 인식**

### **AI 버전 불일치 문제**
```
AI 학습 데이터: 구 버전 (예: React 17, Vue 2, Medusa 1.x)
실제 개발 환경: 최신 버전 (예: React 19, Vue 3, Medusa 2.x)
결과: 작동하지 않는 코드 생성 → tsx→html 같은 잘못된 해결책 제시
```

### **발생 시점**
1. **코드 정비/업데이트 작업 시**
2. **새로운 기능 개발 시** 
3. **문제 해결 시** (AI가 구 버전 방식으로 해결책 제시)
4. **라이브러리 업그레이드 후**

---

## 🔧 **AI 작업 시 필수 체크리스트**

### **📋 작업 시작 전 (Every Time)**
- [ ] **현재 프로젝트 버전 정보 AI에게 제공**
- [ ] **최신 문서 링크 공유**
- [ ] **"최신 버전 기준" 명시적 지시**
- [ ] **AI 응답의 버전 적합성 검증**

### **📋 코드 제안 받을 때**
- [ ] 제안된 문법이 현재 버전에서 권장되는 방식인지 확인
- [ ] 구 버전 특징적 패턴(예: class component, options API) 경계
- [ ] 최신 문서와 대조 검증
- [ ] 테스트 환경에서 우선 검증

### **📋 문제 해결 시**
- [ ] AI가 제시한 해결책이 최신 버전 기준인지 확인
- [ ] "구 버전에서 유효했던 해결책"인지 검토
- [ ] 다른 최신 방법은 없는지 추가 검색

---

## 📊 **프로젝트 버전 정보 템플릿**

### **AI에게 제공할 표준 컨텍스트**
```markdown
## 현재 O4O Platform 환경 정보 (2025-06-19 업데이트)

**프로젝트**: O4O Platform
**환경**: [집(sohae) Windows / 직장(home) Linux]

### 주요 도구 버전
- **Node.js**: 22.16.0 (LTS)
- **npm**: 11.4.2
- **TypeScript**: 5.8.3
- **Vue.js**: 3.x (Composition API 사용)
- **Medusa.js**: 2.0 (주의: 1.x와 완전 다름)
- **React**: 19.1.0
- **Express**: 4.18.2

### 중요 설정
- ESM 모듈 시스템 사용
- TypeScript strict 모드
- Vue Composition API + <script setup>
- Medusa 2.0 모듈 아키텍처

### AI에게 요청
**반드시 위 버전들을 기준으로 최신 방식의 코드를 제안해주세요.**
구 버전 방식(Options API, class component 등)은 사용하지 마세요.
```

### **주기적 업데이트 (월 1회)**
```bash
# 현재 버전 정보 수집 스크립트
echo "=== O4O Platform 환경 정보 ===" > version-info.md
echo "업데이트: $(date)" >> version-info.md
echo "" >> version-info.md
echo "### 주요 도구 버전" >> version-info.md
echo "- Node.js: $(node --version)" >> version-info.md
echo "- npm: $(npm --version)" >> version-info.md
echo "- TypeScript: $(npm list typescript --depth=0 2>/dev/null | grep typescript)" >> version-info.md
# ... 다른 패키지들
```

---

## 🚨 **버전 불일치 감지 방법**

### **AI 제안의 위험 신호**
1. **구 버전 문법 사용**
   - Vue Options API 제안 (현재: Composition API)
   - React Class Component 제안 (현재: Function Component)
   - CommonJS require() 제안 (현재: ESM import)

2. **구 버전 해결책**
   - "tsx를 html로 바꿔라"
   - "Vue 2 방식으로 하면 됩니다"
   - "이전 버전에서는..."

3. **의존성 버전 명시 없음**
   - 구체적 버전 언급 없이 일반적인 설명
   - "일반적으로", "보통" 같은 모호한 표현

### **즉시 중단 신호**
- AI가 major 버전 다운그레이드 제안
- 최신 기능을 "지원하지 않는다" 주장
- package.json 대폭 수정 제안

---

## 📚 **도구별 최신 버전 가이드**

### **Node.js (22.16.0)**
```javascript
// ✅ 최신 방식 (ESM)
import { readFile } from 'fs/promises'
import { createServer } from 'http'

// ❌ 구 방식 (CommonJS) - AI가 제안할 수 있음
const fs = require('fs')
const http = require('http')
```

### **Vue.js 3.x**
```vue
<!-- ✅ 최신 방식 (Composition API) -->
<script setup lang="ts">
import { ref, computed } from 'vue'
const count = ref(0)
const doubleCount = computed(() => count.value * 2)
</script>

<!-- ❌ 구 방식 (Options API) - AI가 제안할 수 있음 -->
<script>
export default {
  data() {
    return { count: 0 }
  },
  computed: {
    doubleCount() { return this.count * 2 }
  }
}
</script>
```

### **TypeScript 5.8.3**
```typescript
// ✅ 최신 방식
import type { User } from './types.js'
export const users: User[] = []

// ❌ 구 방식 - AI가 제안할 수 있음
import { User } from './types'  // .js 확장자 없음
const users: User[] = []
export { users }
```

### **Medusa 2.0**
```typescript
// ✅ 최신 방식 (모듈 아키텍처)
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve("query")
  // ...
}

// ❌ 구 방식 (1.x) - AI가 제안할 수 있음
class ProductService extends TransactionBaseService {
  // Medusa 1.x 방식
}
```

---

## 🔄 **워크플로우 프로세스**

### **새로운 기능 개발 시**
1. **환경 정보 AI 제공** → 현재 버전 컨텍스트 전달
2. **요구사항 명시** → "최신 Vue 3 Composition API로"
3. **코드 검증** → 최신 문서와 대조
4. **테스트** → 실제 환경에서 작동 확인

### **문제 해결 시**
1. **문제 상황 + 버전 정보** 동시 제공
2. **"최신 버전 기준 해결책"** 명시 요청
3. **AI 제안 검증** → 구 버전 해결책인지 확인
4. **대안 검토** → 여러 방법 비교

### **코드 리뷰 시**
1. **AI 제안 코드의 버전 적합성** 확인
2. **최신 패턴 준수** 여부 검토
3. **미래 호환성** 고려
4. **팀 표준과 일치성** 확인

---

## 📖 **최신 문서 북마크**

### **필수 참조 문서 (항상 최신 확인)**
- **Vue.js**: https://vuejs.org/guide/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Node.js**: https://nodejs.org/en/docs/
- **Medusa**: https://docs.medusajs.com/
- **React**: https://react.dev/

### **버전 릴리즈 추적**
- **Node.js Releases**: https://nodejs.org/en/about/previous-releases
- **Vue Releases**: https://github.com/vuejs/core/releases
- **TypeScript Releases**: https://github.com/microsoft/TypeScript/releases
- **Medusa Releases**: https://github.com/medusajs/medusa/releases

---

## 🎯 **실전 적용 예시**

### **AI와 대화 시작 템플릿**
```
안녕! O4O Platform에서 [작업내용]을 하려고 해.

현재 환경:
- Node.js 22.16.0, npm 11.4.2
- Vue 3.x (Composition API), TypeScript 5.8.3
- Medusa 2.0 (모듈 아키텍처)

꼭 최신 버전 기준으로 코드를 제안해줘.
구 버전 방식(Options API, CommonJS 등)은 사용하지 말고,
최신 ESM, Composition API, TypeScript 5.8 방식으로 부탁해.
```

### **의심스러운 AI 응답 시**
```
제안해준 코드가 현재 환경(Vue 3, TypeScript 5.8)에 적합한지 확인해줘.
혹시 구 버전 방식이 아닌지 체크하고,
최신 공식 문서 기준으로 다시 검토해줘.
```

---

## 🚀 **팀 공유 및 지속적 개선**

### **팀 공유 방법**
1. **정기 버전 정보 업데이트** (월 1회)
2. **AI 실수 사례 공유** (발견 시 즉시)
3. **최신 패턴 가이드 갱신** (분기별)
4. **신규 도구 추가 시 가이드 확장**

### **개선 프로세스**
1. **AI 버전 불일치 감지** → 사례 문서화
2. **원인 분석** → 패턴 파악
3. **가이드 업데이트** → 예방책 추가
4. **팀 교육** → 전파 및 정착

---

## ✅ **성공 지표**

### **단기 목표 (1개월)**
- [ ] AI 제안 코드의 버전 적합성 95% 이상
- [ ] tsx → html 같은 잘못된 해결책 제거
- [ ] 팀원 모두 버전 컨텍스트 제공 습관화

### **중기 목표 (3개월)**
- [ ] 새로운 AI 실수 패턴 Zero 발생
- [ ] 자동화된 버전 정보 관리 시스템 구축
- [ ] 프로젝트 안정성 대폭 향상

### **장기 목표 (6개월)**
- [ ] AI와 최신 기술 스택의 완벽한 협업 체계
- [ ] 버전 업그레이드 시 무장애 전환
- [ ] 개발 생산성과 코드 품질 동시 향상

---

**📌 마지막 업데이트**: 2025-06-19  
**📌 다음 버전 정보 점검**: 2025-07-19  
**📌 담당자**: 개발팀 전체 (개인별 책임 공유)
