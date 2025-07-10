#!/usr/bin/env node

// 컴포넌트 자동 생성 스크립트
// Cursor 1.0 Rules와 연동하여 일관된 컴포넌트 생성

const fs = require('fs').promises;
const path = require('path');

class ComponentGenerator {
  constructor() {
    this.baseDir = path.join(process.cwd(), 'services/main-site/src');
    this.templatesDir = path.join(__dirname, 'templates');
  }

  async generate(componentName, componentType = 'component') {
    console.log(`🎨 ${componentType} '${componentName}' 생성 중...\n`);

    try {
      await this.validateInputs(componentName, componentType);
      await this.createDirectories(componentName, componentType);
      await this.generateFiles(componentName, componentType);
      await this.updateExports(componentName, componentType);
      
      console.log(`\n✅ ${componentType} '${componentName}' 생성 완료!`);
      this.showNextSteps(componentName, componentType);
    } catch (error) {
      console.error('❌ 생성 실패:', error.message);
      process.exit(1);
    }
  }

  async validateInputs(componentName, componentType) {
    // 컴포넌트 이름 검증
    if (!componentName || componentName.length < 2) {
      throw new Error('컴포넌트 이름은 최소 2글자 이상이어야 합니다.');
    }

    if (!/^[A-Z][a-zA-Z0-9]*$/.test(componentName)) {
      throw new Error('컴포넌트 이름은 PascalCase로 작성해야 합니다. (예: UserProfile)');
    }

    // 컴포넌트 타입 검증
    const validTypes = ['component', 'page', 'layout', 'hook'];
    if (!validTypes.includes(componentType)) {
      throw new Error(`지원되지 않는 컴포넌트 타입: ${componentType}. 사용 가능: ${validTypes.join(', ')}`);
    }

    // 중복 확인
    const targetDir = this.getTargetDirectory(componentName, componentType);
    try {
      await fs.access(targetDir);
      throw new Error(`'${componentName}' ${componentType}가 이미 존재합니다.`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  getTargetDirectory(componentName, componentType) {
    switch (componentType) {
      case 'component':
        return path.join(this.baseDir, 'components', componentName);
      case 'page':
        return path.join(this.baseDir, 'pages', componentName);
      case 'layout':
        return path.join(this.baseDir, 'layouts', componentName);
      case 'hook':
        return path.join(this.baseDir, 'hooks');
      default:
        throw new Error(`알 수 없는 컴포넌트 타입: ${componentType}`);
    }
  }

  async createDirectories(componentName, componentType) {
    const targetDir = this.getTargetDirectory(componentName, componentType);
    
    if (componentType !== 'hook') {
      await fs.mkdir(targetDir, { recursive: true });
      console.log(`📁 디렉토리 생성: ${path.relative(process.cwd(), targetDir)}`);
    }
  }

  async generateFiles(componentName, componentType) {
    const templates = this.getTemplates(componentName, componentType);
    
    for (const template of templates) {
      const content = this.processTemplate(template.content, componentName, componentType);
      const filePath = path.join(this.getTargetDirectory(componentName, componentType), template.filename);
      
      await fs.writeFile(filePath, content);
      console.log(`📄 파일 생성: ${path.relative(process.cwd(), filePath)}`);
    }
  }

  getTemplates(componentName, componentType) {
    switch (componentType) {
      case 'component':
        return this.getComponentTemplates(componentName);
      case 'page':
        return this.getPageTemplates(componentName);
      case 'layout':
        return this.getLayoutTemplates(componentName);
      case 'hook':
        return this.getHookTemplates(componentName);
      default:
        throw new Error(`템플릿이 없는 타입: ${componentType}`);
    }
  }

  getComponentTemplates(componentName) {
    return [
      {
        filename: `${componentName}.tsx`,
        content: `import React, { useState, useEffect } from 'react';
import styles from './${componentName}.module.css';

interface ${componentName}Props {
  className?: string;
  children?: React.ReactNode;
}

const ${componentName}: React.FC<${componentName}Props> = ({ 
  className = '',
  children 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 컴포넌트 초기화 로직
    return () => {
      // 클린업 로직
    };
  }, []);

  const handleAction = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 비즈니스 로직 구현
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error}</div>;
  }

  return (
    <div className={\`\${styles.${componentName.toLowerCase()}} \${className}\`.trim()}>
      {children}
    </div>
  );
};

export default ${componentName};
`
      },
      {
        filename: `${componentName}.module.css`,
        content: `.${componentName.toLowerCase()} {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.error {
  color: var(--color-error);
  background-color: var(--color-error-bg);
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid var(--color-error-border);
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .${componentName.toLowerCase()} {
    padding: 0.5rem;
  }
}
`
      },
      {
        filename: `${componentName}.test.tsx`,
        content: `import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ${componentName} from './${componentName}';

describe('${componentName}', () => {
  it('renders correctly', () => {
    render(<${componentName} />);
    
    // 기본 렌더링 테스트
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    render(<${componentName} />);
    
    // 로딩 상태 테스트
    // expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    // 에러 상태 테스트
    // Mock error scenario
  });

  it('handles user interactions', async () => {
    render(<${componentName} />);
    
    // 사용자 상호작용 테스트
    // const button = screen.getByRole('button');
    // fireEvent.click(button);
    
    // await waitFor(() => {
    //   expect(screen.getByText('Expected result')).toBeInTheDocument();
    // });
  });
});
`
      },
      {
        filename: 'index.ts',
        content: `export { default } from './${componentName}';
export type { ${componentName}Props } from './${componentName}';
`
      }
    ];
  }

  getPageTemplates(componentName) {
    return [
      {
        filename: `${componentName}Page.tsx`,
        content: `import React from 'react';
import { Helmet } from 'react-helmet-async';
import styles from './${componentName}Page.module.css';

interface ${componentName}PageProps {
  // Props 정의
}

const ${componentName}Page: React.FC<${componentName}PageProps> = () => {
  return (
    <>
      <Helmet>
        <title>${componentName} - O4O Platform</title>
        <meta name="description" content="${componentName} 페이지입니다." />
      </Helmet>
      
      <div className={styles.page}>
        <header className={styles.header}>
          <h1>${componentName}</h1>
        </header>
        
        <main className={styles.main}>
          {/* 페이지 콘텐츠 */}
        </main>
      </div>
    </>
  );
};

export default ${componentName}Page;
`
      },
      {
        filename: `${componentName}Page.module.css`,
        content: `.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background-color: var(--color-bg-secondary);
  padding: 2rem;
  border-bottom: 1px solid var(--color-border);
}

.header h1 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 2rem;
  font-weight: 600;
}

.main {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

@media (max-width: 768px) {
  .header,
  .main {
    padding: 1rem;
  }
  
  .header h1 {
    font-size: 1.5rem;
  }
}
`
      },
      {
        filename: 'index.ts',
        content: `export { default } from './${componentName}Page';
`
      }
    ];
  }

  getLayoutTemplates(componentName) {
    return [
      {
        filename: `${componentName}Layout.tsx`,
        content: `import React from 'react';
import styles from './${componentName}Layout.module.css';

interface ${componentName}LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const ${componentName}Layout: React.FC<${componentName}LayoutProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={\`\${styles.layout} \${className}\`.trim()}>
      <header className={styles.header}>
        {/* 헤더 콘텐츠 */}
      </header>
      
      <main className={styles.main}>
        {children}
      </main>
      
      <footer className={styles.footer}>
        {/* 푸터 콘텐츠 */}
      </footer>
    </div>
  );
};

export default ${componentName}Layout;
`
      },
      {
        filename: `${componentName}Layout.module.css`,
        content: `.layout {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.header {
  background-color: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  padding: 1rem 2rem;
}

.main {
  flex: 1;
  overflow-y: auto;
}

.footer {
  background-color: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  padding: 1rem 2rem;
  text-align: center;
  color: var(--color-text-secondary);
}
`
      },
      {
        filename: 'index.ts',
        content: `export { default } from './${componentName}Layout';
`
      }
    ];
  }

  getHookTemplates(componentName) {
    const hookName = componentName.startsWith('use') ? componentName : `use${componentName}`;
    
    return [
      {
        filename: `${hookName}.ts`,
        content: `import { useState, useEffect, useCallback } from 'react';

interface ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Options {
  // 옵션 타입 정의
}

interface ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Return {
  // 반환값 타입 정의
  loading: boolean;
  error: string | null;
  // 추가 반환값들
}

export const ${hookName} = (
  options: ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Options = {}
): ${hookName.charAt(3).toUpperCase() + hookName.slice(4)}Return => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 초기화 로직
    
    return () => {
      // 클린업 로직
    };
  }, []);

  const handleAction = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 비즈니스 로직
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    handleAction
  };
};

export default ${hookName};
`
      },
      {
        filename: `${hookName}.test.ts`,
        content: `import { renderHook, act } from '@testing-library/react';
import { ${hookName} } from './${hookName}';

describe('${hookName}', () => {
  it('initializes with correct default values', () => {
    const { result } = renderHook(() => ${hookName}());
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('handles loading state correctly', async () => {
    const { result } = renderHook(() => ${hookName}());
    
    act(() => {
      // 로딩 상태 테스트
    });
    
    expect(result.current.loading).toBe(true);
  });

  it('handles error state correctly', async () => {
    const { result } = renderHook(() => ${hookName}());
    
    // 에러 상태 테스트
  });
});
`
      }
    ];
  }

  processTemplate(template, componentName, componentType) {
    return template
      .replace(/\{\{componentName\}\}/g, componentName)
      .replace(/\{\{componentType\}\}/g, componentType)
      .replace(/\{\{lowerCaseName\}\}/g, componentName.toLowerCase());
  }

  async updateExports(componentName, componentType) {
    // index.ts 파일 업데이트 (컴포넌트별로)
    if (componentType === 'component') {
      const indexPath = path.join(this.baseDir, 'components', 'index.ts');
      await this.addToIndex(indexPath, componentName, `./components/${componentName}`);
    } else if (componentType === 'hook') {
      const indexPath = path.join(this.baseDir, 'hooks', 'index.ts');
      const hookName = componentName.startsWith('use') ? componentName : `use${componentName}`;
      await this.addToIndex(indexPath, hookName, `./${hookName}`);
    }
  }

  async addToIndex(indexPath, exportName, importPath) {
    try {
      let content = '';
      try {
        content = await fs.readFile(indexPath, 'utf8');
      } catch (error) {
        // 파일이 없으면 새로 생성
        await fs.mkdir(path.dirname(indexPath), { recursive: true });
      }

      const exportLine = `export { default as ${exportName} } from '${importPath}';`;
      
      if (!content.includes(exportLine)) {
        content += exportLine + '\n';
        await fs.writeFile(indexPath, content);
        console.log(`📝 Export 추가: ${path.relative(process.cwd(), indexPath)}`);
      }
    } catch (error) {
      console.warn(`⚠️ Export 추가 실패: ${error.message}`);
    }
  }

  showNextSteps(componentName, componentType) {
    console.log('\n🎯 다음 단계:');
    console.log('=' .repeat(40));
    
    switch (componentType) {
      case 'component':
        console.log(`1. 컴포넌트 로직 구현`);
        console.log(`2. 스타일 커스터마이징`);
        console.log(`3. Props 타입 정의 완성`);
        console.log(`4. 테스트 케이스 작성`);
        console.log(`5. Storybook 스토리 생성 (선택사항)`);
        break;
      case 'page':
        console.log(`1. 라우팅 설정에 페이지 추가`);
        console.log(`2. SEO 메타데이터 설정`);
        console.log(`3. 페이지 컴포넌트들 구성`);
        console.log(`4. 접근 권한 설정 (필요시)`);
        break;
      case 'layout':
        console.log(`1. 헤더/푸터 컴포넌트 구현`);
        console.log(`2. 네비게이션 구성`);
        console.log(`3. 반응형 디자인 테스트`);
        console.log(`4. 라우팅에 레이아웃 적용`);
        break;
      case 'hook':
        console.log(`1. 비즈니스 로직 구현`);
        console.log(`2. 타입 정의 완성`);
        console.log(`3. 에러 핸들링 구현`);
        console.log(`4. 성능 최적화 (메모이제이션)`);
        break;
    }
    
    console.log(`\n💡 Cursor에서 '@${componentName}'로 컴포넌트를 참조할 수 있습니다.`);
  }
}

// CLI 인터페이스
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🎨 컴포넌트 생성기

사용법:
  npm run cursor:generate-component -- --name ComponentName --type component
  
옵션:
  --name    컴포넌트 이름 (필수, PascalCase)
  --type    컴포넌트 타입 (component|page|layout|hook)

예시:
  npm run cursor:generate-component -- --name UserProfile --type component
  npm run cursor:generate-component -- --name LoginPage --type page
  npm run cursor:generate-component -- --name MainLayout --type layout
  npm run cursor:generate-component -- --name useApi --type hook
`);
    process.exit(0);
  }

  let componentName = '';
  let componentType = 'component';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      componentName = args[i + 1];
    } else if (args[i] === '--type' && args[i + 1]) {
      componentType = args[i + 1];
    }
  }

  if (!componentName) {
    console.error('❌ --name 옵션이 필요합니다.');
    process.exit(1);
  }

  const generator = new ComponentGenerator();
  generator.generate(componentName, componentType).catch(console.error);
}

module.exports = ComponentGenerator;
