/**
 * WordPress Runtime Environment Setup
 * WordPress 패키지들이 external로 처리되어 있으므로,
 * 런타임에 필요한 전역 wp 객체를 생성합니다.
 */

// WordPress 전역 객체 타입 정의
declare global {
  interface Window {
    wp: {
      blocks?: any;
      blockEditor?: any;
      components?: any;
      element?: any;
      data?: any;
      i18n?: any;
      hooks?: any;
      compose?: any;
      keycodes?: any;
      richText?: any;
      formatLibrary?: any;
      editor?: any;
      coreData?: any;
      domReady?: any;
      apiFetch?: any;
    };
  }
}

/**
 * WordPress 런타임 환경 체크
 */
export const isWordPressAvailable = (): boolean => {
  return typeof window !== 'undefined' && window.wp !== undefined;
};

/**
 * WordPress Mock 객체 생성
 * 실제 WordPress 환경이 없을 때 기본 기능을 제공
 */
export const initializeWordPressRuntime = async () => {
  if (typeof window === 'undefined') return;
  
  // 이미 WordPress가 로드되어 있으면 스킵
  if (window.wp && window.wp.blocks) {
    console.log('WordPress runtime already initialized');
    return;
  }

  console.log('Initializing WordPress runtime environment...');

  // 기본 wp 객체 생성
  window.wp = window.wp || {};

  try {
    // WordPress 패키지들을 동적으로 import
    const modules = await Promise.all([
      import('@wordpress/blocks'),
      import('@wordpress/block-editor'),
      import('@wordpress/components'),
      import('@wordpress/element'),
      import('@wordpress/data'),
      import('@wordpress/i18n'),
      import('@wordpress/hooks'),
      import('@wordpress/compose'),
      import('@wordpress/keycodes'),
    ]);

    // 전역 wp 객체에 모듈 할당
    window.wp.blocks = modules[0];
    window.wp.blockEditor = modules[1];
    window.wp.components = modules[2];
    window.wp.element = modules[3];
    window.wp.data = modules[4];
    window.wp.i18n = modules[5];
    window.wp.hooks = modules[6];
    window.wp.compose = modules[7];
    window.wp.keycodes = modules[8];

    // 기본 블록 등록
    registerDefaultBlocks();
    
    console.log('WordPress runtime initialized successfully');
  } catch (error) {
    console.error('Failed to initialize WordPress runtime:', error);
    
    // Fallback: 최소한의 mock 객체 제공
    createMinimalMockWp();
  }
};

/**
 * 기본 WordPress 블록 등록
 */
const registerDefaultBlocks = () => {
  if (!window.wp?.blocks?.registerBlockType) {
    console.warn('Cannot register blocks: wp.blocks not available');
    return;
  }

  const { registerBlockType, setDefaultBlockName, setFreeformContentHandlerName } = window.wp.blocks;

  // 기본 단락 블록 등록
  if (!window.wp.blocks.getBlockType('core/paragraph')) {
    registerBlockType('core/paragraph', {
      title: '단락',
      category: 'text',
      icon: 'editor-paragraph',
      description: '텍스트 단락을 추가합니다.',
      attributes: {
        content: {
          type: 'string',
          source: 'html',
          selector: 'p',
        },
      },
      edit: () => null,
      save: () => null,
    });
  }

  // 제목 블록 등록
  if (!window.wp.blocks.getBlockType('core/heading')) {
    registerBlockType('core/heading', {
      title: '제목',
      category: 'text',
      icon: 'heading',
      description: '제목을 추가합니다.',
      attributes: {
        content: {
          type: 'string',
          source: 'html',
          selector: 'h1,h2,h3,h4,h5,h6',
        },
        level: {
          type: 'number',
          default: 2,
        },
      },
      edit: () => null,
      save: () => null,
    });
  }

  // 이미지 블록 등록
  if (!window.wp.blocks.getBlockType('core/image')) {
    registerBlockType('core/image', {
      title: '이미지',
      category: 'media',
      icon: 'format-image',
      description: '이미지를 추가합니다.',
      attributes: {
        url: {
          type: 'string',
        },
        alt: {
          type: 'string',
        },
      },
      edit: () => null,
      save: () => null,
    });
  }

  // 리스트 블록 등록
  if (!window.wp.blocks.getBlockType('core/list')) {
    registerBlockType('core/list', {
      title: '목록',
      category: 'text',
      icon: 'editor-ul',
      description: '순서가 있거나 없는 목록을 추가합니다.',
      attributes: {
        values: {
          type: 'string',
          source: 'html',
          selector: 'ul,ol',
        },
        ordered: {
          type: 'boolean',
          default: false,
        },
      },
      edit: () => null,
      save: () => null,
    });
  }

  // 인용 블록 등록
  if (!window.wp.blocks.getBlockType('core/quote')) {
    registerBlockType('core/quote', {
      title: '인용',
      category: 'text',
      icon: 'format-quote',
      description: '인용문을 추가합니다.',
      attributes: {
        value: {
          type: 'string',
          source: 'html',
          selector: 'blockquote',
        },
        citation: {
          type: 'string',
          source: 'html',
          selector: 'cite',
        },
      },
      edit: () => null,
      save: () => null,
    });
  }

  // 코드 블록 등록
  if (!window.wp.blocks.getBlockType('core/code')) {
    registerBlockType('core/code', {
      title: '코드',
      category: 'text',
      icon: 'editor-code',
      description: '코드를 추가합니다.',
      attributes: {
        content: {
          type: 'string',
          source: 'html',
          selector: 'code',
        },
      },
      edit: () => null,
      save: () => null,
    });
  }

  // 구분선 블록 등록
  if (!window.wp.blocks.getBlockType('core/separator')) {
    registerBlockType('core/separator', {
      title: '구분선',
      category: 'design',
      icon: 'minus',
      description: '구분선을 추가합니다.',
      attributes: {},
      edit: () => null,
      save: () => null,
    });
  }

  // 기본 블록 설정
  try {
    setDefaultBlockName('core/paragraph');
    setFreeformContentHandlerName('core/freeform');
  } catch (error) {
    console.warn('Could not set default block names:', error);
  }
};

/**
 * 최소한의 Mock WordPress 객체 생성
 */
const createMinimalMockWp = () => {
  window.wp = {
    blocks: {
      registerBlockType: () => {},
      getBlockType: () => null,
      setDefaultBlockName: () => {},
      setFreeformContentHandlerName: () => {},
      getBlockTypes: () => [],
      hasBlockSupport: () => false,
      isReusableBlock: () => false,
    },
    blockEditor: {
      BlockControls: () => null,
      InspectorControls: () => null,
      RichText: () => null,
      MediaUpload: () => null,
      BlockAlignmentToolbar: () => null,
      ColorPalette: () => null,
    },
    components: {
      Button: () => null,
      Panel: () => null,
      PanelBody: () => null,
      PanelRow: () => null,
      TextControl: () => null,
      SelectControl: () => null,
      CheckboxControl: () => null,
      RadioControl: () => null,
      RangeControl: () => null,
      ToggleControl: () => null,
      Placeholder: () => null,
      Spinner: () => null,
      Notice: () => null,
      Modal: () => null,
      Popover: () => null,
      Dropdown: () => null,
      DropdownMenu: () => null,
      Toolbar: () => null,
      ToolbarButton: () => null,
      ToolbarGroup: () => null,
      Icon: () => null,
    },
    element: {
      createElement: () => null,
      Fragment: () => null,
      Component: class {},
      useState: () => [null, () => {}],
      useEffect: () => {},
      useRef: () => ({ current: null }),
      useCallback: (fn: any) => fn,
      useMemo: (fn: any) => fn(),
    },
    data: {
      select: () => ({}),
      dispatch: () => ({}),
      subscribe: () => () => {},
      registerStore: () => {},
      useSelect: () => null,
      useDispatch: () => ({}),
    },
    i18n: {
      __: (text: string) => text,
      _x: (text: string) => text,
      _n: (single: string) => single,
      _nx: (single: string) => single,
      sprintf: (format: string, ...args: any[]) => format,
    },
    hooks: {
      addFilter: () => {},
      removeFilter: () => {},
      applyFilters: (name: string, value: any) => value,
      addAction: () => {},
      removeAction: () => {},
      doAction: () => {},
    },
    compose: {
      compose: (...args: any[]) => args[0],
      withState: () => (component: any) => component,
      withInstanceId: () => (component: any) => component,
    },
    keycodes: {
      ENTER: 13,
      ESCAPE: 27,
      SPACE: 32,
      LEFT: 37,
      UP: 38,
      RIGHT: 39,
      DOWN: 40,
      DELETE: 46,
      BACKSPACE: 8,
      TAB: 9,
    },
  };

  console.log('Minimal WordPress mock created');
};

/**
 * WordPress 환경 초기화 헬퍼
 */
export const setupWordPressEnvironment = async () => {
  // DOM이 준비될 때까지 대기
  if (document.readyState === 'loading') {
    await new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', resolve);
    });
  }

  // WordPress 런타임 초기화
  await initializeWordPressRuntime();
  
  return isWordPressAvailable();
};