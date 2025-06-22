// 🏠 페이지 콘텐츠 관리 시스템

export interface PageContent {
  slug: string;
  title: string;
  content: string; // HTML
  json: any; // Tiptap JSON
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  author: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
  };
}

export interface PageListItem {
  slug: string;
  title: string;
  status: 'draft' | 'published';
  updatedAt: string;
}

// 기본 페이지 데이터
const getDefaultPageContent = (slug: string): PageContent => ({
  slug,
  title: `${slug} 페이지`,
  content: `
    <h1>📝 ${slug} 페이지</h1>
    <p>이 페이지를 편집하려면 관리자로 로그인한 후 "이 페이지 편집" 버튼을 클릭하세요.</p>
    <p><strong>Notion 스타일 블록 에디터</strong>로 콘텐츠를 자유롭게 구성할 수 있습니다.</p>
    <blockquote>
      <p>💡 <strong>팁:</strong> 이 페이지는 동적으로 생성된 CMS 페이지입니다.</p>
    </blockquote>
  `,
  json: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: `📝 ${slug} 페이지` }]
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: '이 페이지를 편집하려면 관리자로 로그인한 후 "이 페이지 편집" 버튼을 클릭하세요.' }
        ]
      }
    ]
  },
  status: 'published',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  author: 'system'
});

// 페이지 데이터 로드
export const loadPageContent = (slug: string): PageContent => {
  try {
    const saved = localStorage.getItem(`page_content_${slug}`);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('페이지 로드 실패:', error);
  }
  
  return getDefaultPageContent(slug);
};

// 페이지 데이터 저장
export const savePageContent = (content: PageContent): void => {
  try {
    const updatedContent = {
      ...content,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`page_content_${content.slug}`, JSON.stringify(updatedContent));
    
    // 페이지 목록도 업데이트
    updatePageList(content.slug, content.title, content.status);
  } catch (error) {
    console.error('페이지 저장 실패:', error);
    throw error;
  }
};

// 페이지 목록 관리
export const getPageList = (): PageListItem[] => {
  try {
    const saved = localStorage.getItem('page_list');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('페이지 목록 로드 실패:', error);
  }
  
  return [];
};

export const updatePageList = (slug: string, title: string, status: 'draft' | 'published'): void => {
  try {
    const pageList = getPageList();
    const existingIndex = pageList.findIndex(p => p.slug === slug);
    
    const pageItem: PageListItem = {
      slug,
      title,
      status,
      updatedAt: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      pageList[existingIndex] = pageItem;
    } else {
      pageList.push(pageItem);
    }
    
    localStorage.setItem('page_list', JSON.stringify(pageList));
  } catch (error) {
    console.error('페이지 목록 업데이트 실패:', error);
  }
};

// 페이지 삭제
export const deletePage = (slug: string): void => {
  try {
    localStorage.removeItem(`page_content_${slug}`);
    
    const pageList = getPageList();
    const filteredList = pageList.filter(p => p.slug !== slug);
    localStorage.setItem('page_list', JSON.stringify(filteredList));
  } catch (error) {
    console.error('페이지 삭제 실패:', error);
    throw error;
  }
};

// 페이지 존재 확인
export const pageExists = (slug: string): boolean => {
  const saved = localStorage.getItem(`page_content_${slug}`);
  return !!saved;
};

// 페이지 URL 생성
export const getPageEditUrl = (slug: string): string => {
  return `/editor/${slug}`;
};

export const getPageViewUrl = (slug: string): string => {
  return `/page/${slug}`;
};

// Slug 검증
export const isValidSlug = (slug: string): boolean => {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length >= 1 && slug.length <= 100;
};

// Slug 생성 (제목에서)
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // 특수문자 제거
    .replace(/[\s_-]+/g, '-') // 공백을 하이픈으로
    .replace(/^-+|-+$/g, ''); // 앞뒤 하이픈 제거
};
