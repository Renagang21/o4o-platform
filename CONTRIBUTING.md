# 기여 가이드라인

o4o-platform 이미지 최적화 시스템에 기여해 주셔서 감사합니다! 이 문서는 프로젝트에 기여하는 방법을 안내합니다.

## 🤝 기여 방법

### 1. 이슈 리포트

버그나 개선 사항을 발견하셨다면:

1. 기존 이슈를 먼저 확인해 주세요
2. 새로운 이슈를 생성할 때 다음 정보를 포함해 주세요:
   - 문제 설명
   - 재현 단계
   - 예상 결과 vs 실제 결과
   - 환경 정보 (OS, Node.js 버전 등)
   - 스크린샷 (가능한 경우)

### 2. 기능 제안

새로운 기능을 제안하고 싶다면:

1. 기능의 목적과 사용 사례를 명확히 설명
2. 기존 기능과의 호환성 고려
3. 구현 방법에 대한 아이디어 (선택사항)

### 3. Pull Request

코드 기여를 위한 Pull Request 절차:

1. **Fork & Clone**
   ```bash
   git clone https://github.com/your-username/o4o-platform.git
   cd o4o-platform
   ```

2. **브랜치 생성**
   ```bash
   git checkout -b feature/your-feature-name
   # 또는
   git checkout -b fix/your-bug-fix
   ```

3. **개발 환경 설정**
   ```bash
   npm install
   npm run setup
   ```

4. **코드 작성 및 테스트**
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

5. **커밋**
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

6. **Push 및 PR 생성**
   ```bash
   git push origin feature/your-feature-name
   ```

## 📝 코딩 스타일

### TypeScript/JavaScript

- **ESLint** 규칙을 따라주세요
- **Prettier**로 코드 포맷팅
- 의미 있는 변수명과 함수명 사용
- JSDoc 주석으로 복잡한 함수 문서화

```typescript
/**
 * 이미지를 최적화하고 다중 해상도로 변환합니다
 * @param file - 원본 이미지 파일
 * @param options - 최적화 옵션
 * @returns 처리된 이미지 정보
 */
async function optimizeImage(file: File, options: OptimizeOptions): Promise<ProcessedImage> {
  // 구현...
}
```

### React 컴포넌트

- **함수형 컴포넌트** 우선 사용
- **TypeScript** props 타입 정의
- **Styled Components** 스타일링
- **React Hooks** 적극 활용

```tsx
interface Props {
  image: ProcessedImage
  alt: string
  className?: string
}

export const MyComponent: React.FC<Props> = ({ image, alt, className }) => {
  // 구현...
}
```

### 커밋 메시지

[Conventional Commits](https://www.conventionalcommits.org/) 스타일 사용:

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 스타일 변경 (기능 변경 없음)
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 기타 작업 (빌드, 의존성 관리 등)
```

예시:
```
feat: add WebP format support for image optimization
fix: resolve memory leak in image processing pipeline
docs: update API documentation for upload endpoints
```

## 🧪 테스트

새로운 코드에는 테스트를 포함해 주세요:

```bash
# 테스트 실행
npm test

# 커버리지 확인
npm run test:coverage

# 특정 파일 테스트
npm test ImageProcessor.test.ts
```

### 테스트 작성 가이드

- **단위 테스트**: 개별 함수/컴포넌트
- **통합 테스트**: API 엔드포인트
- **성능 테스트**: 이미지 처리 속도

```typescript
describe('ImageProcessor', () => {
  it('should optimize image correctly', async () => {
    const result = await processor.optimize(mockImage, options)
    expect(result.variants).toHaveProperty('mobile')
    expect(result.metadata.size).toBeLessThan(mockImage.size)
  })
})
```

## 📋 PR 체크리스트

Pull Request 생성 전 확인사항:

- [ ] 코드가 프로젝트 스타일 가이드를 따름
- [ ] 모든 테스트가 통과함
- [ ] 린팅 에러가 없음
- [ ] 타입 체크 통과
- [ ] 새로운 기능에 대한 테스트 작성
- [ ] README.md 업데이트 (필요시)
- [ ] 브레이킹 체인지가 있다면 명시

## 🏗️ 프로젝트 구조 이해

```
src/
├── components/     # React 컴포넌트
├── services/       # 비즈니스 로직
├── hooks/         # React 커스텀 훅
├── utils/         # 유틸리티 함수
├── pages/         # 페이지 컴포넌트
└── server/        # 백엔드 서버
```

## 🎯 우선순위 영역

현재 기여가 특히 필요한 영역:

1. **성능 최적화**
   - 이미지 처리 속도 개선
   - 메모리 사용량 최적화
   - 캐싱 전략 개선

2. **테스트 커버리지**
   - 단위 테스트 추가
   - E2E 테스트 구현
   - 성능 테스트 자동화

3. **접근성 개선**
   - ARIA 라벨 추가
   - 키보드 네비게이션
   - 스크린 리더 지원

4. **국제화 (i18n)**
   - 다국어 지원
   - 로케일별 이미지 최적화

## 🤔 질문이나 도움이 필요하다면

- GitHub Issues에 질문 등록
- 이메일: contribute@o4o-platform.com
- 디스코드: [링크 추가 예정]

## 📜 행동 강령

모든 참여자는 다음을 준수해야 합니다:

- 서로를 존중하고 포용적인 환경 조성
- 건설적인 피드백 제공
- 다양한 의견과 경험 인정
- 프로젝트 목표에 집중

위반 시 경고 또는 프로젝트 참여 제한이 있을 수 있습니다.

---

**함께 더 나은 이미지 최적화 시스템을 만들어 갑시다! 🚀**
