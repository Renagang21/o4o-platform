import { http, HttpResponse } from 'msw'
import type { 
  Widget, 
  WidgetArea,
  WidgetPosition,
  WidgetListResponse, 
  WidgetTemplate,
  CreateWidgetDto,
  UpdateWidgetDto
} from '@o4o/types'

// Mock widget areas
const mockWidgetAreas: WidgetArea[] = [
  {
    id: 'footer-area-1',
    name: '푸터 1',
    description: '푸터 왼쪽 영역',
    position: 'footer-1',
    isActive: true,
    widgets: [],
    settings: {
      columns: 1,
      gap: '1rem',
      padding: '2rem',
      backgroundColor: '#f8fafc'
    }
  },
  {
    id: 'footer-area-2',
    name: '푸터 2',
    description: '푸터 중앙 영역',
    position: 'footer-2',
    isActive: true,
    widgets: [],
    settings: {
      columns: 1,
      gap: '1rem',
      padding: '2rem'
    }
  },
  {
    id: 'footer-area-3',
    name: '푸터 3',
    description: '푸터 오른쪽 영역',
    position: 'footer-3',
    isActive: true,
    widgets: [],
    settings: {
      columns: 1,
      gap: '1rem',
      padding: '2rem'
    }
  },
  {
    id: 'sidebar-main-area',
    name: '메인 사이드바',
    description: '메인 페이지 사이드바',
    position: 'sidebar-main',
    isActive: true,
    widgets: [],
    settings: {
      columns: 1,
      gap: '1.5rem',
      padding: '1.5rem'
    }
  }
]

// Mock widgets
const mockWidgets: Widget[] = [
  {
    id: 'widget-1',
    type: 'text',
    title: '회사 소개',
    content: {
      text: 'O4O Platform은 혁신적인 이커머스 솔루션을 제공합니다. 우리와 함께 성장하세요.',
      autoP: true
    },
    settings: {
      showTitle: true,
      visibility: { desktop: true, tablet: true, mobile: true },
      animation: { type: 'fade', duration: 300, delay: 0 },
      spacing: {
        margin: { top: '0', right: '0', bottom: '1rem', left: '0' },
        padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' }
      },
      styling: { textAlign: 'left' }
    },
    position: 'footer-1',
    order: 1,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'widget-2',
    type: 'contact-info',
    title: '연락처',
    content: {
      address: '서울시 강남구 테헤란로 123',
      phone: '02-1234-5678',
      email: 'contact@o4o.com',
      website: 'https://o4o.com',
      showMap: false
    },
    settings: {
      showTitle: true,
      visibility: { desktop: true, tablet: true, mobile: true },
      animation: { type: 'none', duration: 300, delay: 0 },
      spacing: {
        margin: { top: '0', right: '0', bottom: '1rem', left: '0' },
        padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' }
      },
      styling: { textAlign: 'left' }
    },
    position: 'footer-2',
    order: 1,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'widget-3',
    type: 'social-links',
    title: '소셜 미디어',
    content: {
      links: [
        { platform: 'facebook', url: 'https://facebook.com/o4o' },
        { platform: 'twitter', url: 'https://twitter.com/o4o' },
        { platform: 'instagram', url: 'https://instagram.com/o4o' }
      ],
      style: 'icons',
      size: 'medium',
      openInNewTab: true
    },
    settings: {
      showTitle: true,
      visibility: { desktop: true, tablet: true, mobile: true },
      animation: { type: 'slide', duration: 500, delay: 100 },
      spacing: {
        margin: { top: '0', right: '0', bottom: '1rem', left: '0' },
        padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' }
      },
      styling: { textAlign: 'center' }
    },
    position: 'footer-3',
    order: 1,
    isActive: true,
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16')
  },
  {
    id: 'widget-4',
    type: 'recent-posts',
    title: '최근 게시글',
    content: {
      count: 5,
      showDate: true,
      showExcerpt: false,
      excerptLength: 100
    },
    settings: {
      showTitle: true,
      visibility: { desktop: true, tablet: true, mobile: true },
      animation: { type: 'none', duration: 300, delay: 0 },
      spacing: {
        margin: { top: '0', right: '0', bottom: '1rem', left: '0' },
        padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' }
      },
      styling: { textAlign: 'left' }
    },
    position: 'sidebar-main',
    order: 1,
    isActive: true,
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-17')
  },
  {
    id: 'widget-5',
    type: 'newsletter',
    title: '뉴스레터 구독',
    content: {
      title: '뉴스레터 구독',
      description: '최신 소식과 특별 혜택을 받아보세요',
      placeholder: '이메일 주소를 입력하세요',
      buttonText: '구독하기',
      successMessage: '구독해주셔서 감사합니다!',
      provider: 'custom'
    },
    settings: {
      showTitle: false,
      visibility: { desktop: true, tablet: true, mobile: true },
      animation: { type: 'bounce', duration: 600, delay: 200 },
      spacing: {
        margin: { top: '0', right: '0', bottom: '2rem', left: '0' },
        padding: { top: '1.5rem', right: '1.5rem', bottom: '1.5rem', left: '1.5rem' }
      },
      styling: { textAlign: 'center' }
    },
    position: 'sidebar-main',
    order: 2,
    isActive: true,
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-01-18')
  }
]

// Mock widget templates
const mockWidgetTemplates: WidgetTemplate[] = [
  {
    id: 'template-1',
    name: '기본 푸터 세트',
    description: '회사 정보, 연락처, 소셜 링크가 포함된 기본 푸터 위젯 세트',
    category: 'content',
    widgets: [
      {
        type: 'text',
        title: '회사 소개',
        content: { text: '귀하의 회사 소개 내용을 입력하세요.', autoP: true },
        settings: {
          showTitle: true,
          visibility: { desktop: true, tablet: true, mobile: true },
          animation: { type: 'none', duration: 300, delay: 0 },
          spacing: {
            margin: { top: '0', right: '0', bottom: '1rem', left: '0' },
            padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' }
          },
          styling: { textAlign: 'left' }
        },
        position: 'footer-1',
        order: 1,
        isActive: true
      },
      {
        type: 'contact-info',
        title: '연락처',
        content: { address: '', phone: '', email: '', showMap: false },
        settings: {
          showTitle: true,
          visibility: { desktop: true, tablet: true, mobile: true },
          animation: { type: 'none', duration: 300, delay: 0 },
          spacing: {
            margin: { top: '0', right: '0', bottom: '1rem', left: '0' },
            padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' }
          },
          styling: { textAlign: 'left' }
        },
        position: 'footer-2',
        order: 1,
        isActive: true
      },
      {
        type: 'social-links',
        title: '팔로우하기',
        content: { links: [], style: 'icons', size: 'medium', openInNewTab: true },
        settings: {
          showTitle: true,
          visibility: { desktop: true, tablet: true, mobile: true },
          animation: { type: 'none', duration: 300, delay: 0 },
          spacing: {
            margin: { top: '0', right: '0', bottom: '1rem', left: '0' },
            padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' }
          },
          styling: { textAlign: 'left' }
        },
        position: 'footer-3',
        order: 1,
        isActive: true
      }
    ],
    preview: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
    isPremium: false,
    downloads: 1247,
    rating: 4.5
  },
  {
    id: 'template-2',
    name: '이커머스 사이드바',
    description: '상품 카테고리, 최근 게시글, 뉴스레터가 포함된 쇼핑몰 사이드바',
    category: 'navigation',
    widgets: [
      {
        type: 'categories',
        title: '상품 카테고리',
        content: { showPostCount: true, showHierarchy: true, hideEmpty: true },
        settings: {
          showTitle: true,
          visibility: { desktop: true, tablet: true, mobile: false },
          animation: { type: 'none', duration: 300, delay: 0 },
          spacing: {
            margin: { top: '0', right: '0', bottom: '2rem', left: '0' },
            padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' }
          },
          styling: { textAlign: 'left' }
        },
        position: 'sidebar-shop',
        order: 1,
        isActive: true
      },
      {
        type: 'recent-posts',
        title: '최근 상품',
        content: { count: 3, showDate: false, showExcerpt: true, excerptLength: 50 },
        settings: {
          showTitle: true,
          visibility: { desktop: true, tablet: true, mobile: false },
          animation: { type: 'none', duration: 300, delay: 0 },
          spacing: {
            margin: { top: '0', right: '0', bottom: '2rem', left: '0' },
            padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' }
          },
          styling: { textAlign: 'left' }
        },
        position: 'sidebar-shop',
        order: 2,
        isActive: true
      }
    ],
    preview: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
    isPremium: false,
    downloads: 892,
    rating: 4.2
  },
  {
    id: 'template-3',
    name: '프리미엄 소셜 허브',
    description: '고급 소셜 미디어 통합과 인터랙티브 요소가 포함된 프리미엄 위젯',
    category: 'social',
    widgets: [
      {
        type: 'social-links',
        title: '소셜 네트워크',
        content: { 
          links: [
            { platform: 'facebook', url: '' },
            { platform: 'twitter', url: '' },
            { platform: 'instagram', url: '' },
            { platform: 'youtube', url: '' },
            { platform: 'linkedin', url: '' }
          ], 
          style: 'buttons', 
          size: 'large', 
          openInNewTab: true 
        },
        settings: {
          showTitle: true,
          visibility: { desktop: true, tablet: true, mobile: true },
          animation: { type: 'bounce', duration: 800, delay: 100 },
          spacing: {
            margin: { top: '0', right: '0', bottom: '2rem', left: '0' },
            padding: { top: '2rem', right: '2rem', bottom: '2rem', left: '2rem' }
          },
          styling: { textAlign: 'center' }
        },
        position: 'footer-1',
        order: 1,
        isActive: true
      }
    ],
    preview: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop',
    isPremium: true,
    downloads: 345,
    rating: 4.8
  },
  {
    id: 'template-4',
    name: '블로그 사이드바 킷',
    description: '검색, 카테고리, 최근 글, 인기 태그가 포함된 완전한 블로그 사이드바',
    category: 'content',
    widgets: [
      {
        type: 'search',
        title: '검색',
        content: { placeholder: '글 검색...', buttonText: '검색', searchCategories: true },
        settings: {
          showTitle: true,
          visibility: { desktop: true, tablet: true, mobile: true },
          animation: { type: 'none', duration: 300, delay: 0 },
          spacing: {
            margin: { top: '0', right: '0', bottom: '2rem', left: '0' },
            padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' }
          },
          styling: { textAlign: 'left' }
        },
        position: 'sidebar-main',
        order: 1,
        isActive: true
      },
      {
        type: 'categories',
        title: '카테고리',
        content: { showPostCount: true, showHierarchy: false, hideEmpty: true },
        settings: {
          showTitle: true,
          visibility: { desktop: true, tablet: true, mobile: true },
          animation: { type: 'none', duration: 300, delay: 0 },
          spacing: {
            margin: { top: '0', right: '0', bottom: '2rem', left: '0' },
            padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' }
          },
          styling: { textAlign: 'left' }
        },
        position: 'sidebar-main',
        order: 2,
        isActive: true
      },
      {
        type: 'recent-posts',
        title: '최근 글',
        content: { count: 5, showDate: true, showExcerpt: false, excerptLength: 100 },
        settings: {
          showTitle: true,
          visibility: { desktop: true, tablet: true, mobile: true },
          animation: { type: 'none', duration: 300, delay: 0 },
          spacing: {
            margin: { top: '0', right: '0', bottom: '2rem', left: '0' },
            padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' }
          },
          styling: { textAlign: 'left' }
        },
        position: 'sidebar-main',
        order: 3,
        isActive: true
      }
    ],
    preview: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=300&fit=crop',
    isPremium: false,
    downloads: 1156,
    rating: 4.6
  },
  {
    id: 'template-5',
    name: '마케팅 최적화 세트',
    description: '뉴스레터, 소셜 증명, CTA가 포함된 전환 최적화 위젯 세트',
    category: 'forms',
    widgets: [
      {
        type: 'newsletter',
        title: '특별 혜택 받기',
        content: {
          title: '🎉 특별 혜택 받기',
          description: '신규 가입자에게 10% 할인 쿠폰을 드립니다!',
          placeholder: '이메일 주소',
          buttonText: '혜택 받기',
          successMessage: '환영합니다! 쿠폰이 전송되었습니다.',
          provider: 'custom'
        },
        settings: {
          showTitle: false,
          visibility: { desktop: true, tablet: true, mobile: true },
          animation: { type: 'slide', duration: 600, delay: 0 },
          spacing: {
            margin: { top: '0', right: '0', bottom: '2rem', left: '0' },
            padding: { top: '2rem', right: '2rem', bottom: '2rem', left: '2rem' }
          },
          styling: { textAlign: 'center' }
        },
        position: 'sidebar-main',
        order: 1,
        isActive: true
      }
    ],
    preview: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
    isPremium: true,
    downloads: 678,
    rating: 4.9
  }
]

// Store widgets in memory
let widgets = [...mockWidgets]
let widgetAreas = [...mockWidgetAreas]

export const widgetHandlers = [
  // Get all widgets and areas
  http.get('/api/v1/widgets', () => {
    const response: WidgetListResponse = {
      widgets: widgets.sort((a, b) => a.order - b.order),
      areas: widgetAreas,
      total: widgets.length
    }
    return HttpResponse.json(response)
  }),

  // Get single widget
  http.get('/api/v1/widgets/:id', ({ params }) => {
    const widget = widgets.find(w => w.id === params.id)
    if (!widget) {
      return HttpResponse.json({ error: 'Widget not found' }, { status: 404 })
    }
    return HttpResponse.json(widget)
  }),

  // Create widget
  http.post('/api/v1/widgets', async ({ request }) => {
    const data = await request.json() as CreateWidgetDto
    
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: data.type,
      title: data.title,
      content: data.content,
      settings: {
        showTitle: true,
        visibility: { desktop: true, tablet: true, mobile: true },
        animation: { type: 'none', duration: 300, delay: 0 },
        spacing: {
          margin: { top: '0', right: '0', bottom: '1rem', left: '0' },
          padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' }
        },
        styling: { textAlign: 'left' },
        ...data.settings
      },
      position: data.position,
      order: widgets.filter(w => w.position === data.position).length + 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    widgets.push(newWidget)
    return HttpResponse.json(newWidget, { status: 201 })
  }),

  // Update widget
  http.put('/api/v1/widgets/:id', async ({ params, request }) => {
    const data = await request.json() as UpdateWidgetDto
    const index = widgets.findIndex(w => w.id === params.id)

    if (index === -1) {
      return HttpResponse.json({ error: 'Widget not found' }, { status: 404 })
    }

    widgets[index] = {
      ...widgets[index],
      title: data.title || widgets[index].title,
      content: data.content || widgets[index].content,
      settings: {
        ...widgets[index].settings,
        ...data.settings
      },
      position: data.position || widgets[index].position,
      order: data.order !== undefined ? data.order : widgets[index].order,
      isActive: data.isActive !== undefined ? data.isActive : widgets[index].isActive,
      updatedAt: new Date()
    }

    return HttpResponse.json(widgets[index])
  }),

  // Delete widget
  http.delete('/api/v1/widgets/:id', ({ params }) => {
    const index = widgets.findIndex(w => w.id === params.id)
    
    if (index === -1) {
      return HttpResponse.json({ error: 'Widget not found' }, { status: 404 })
    }

    widgets.splice(index, 1)
    return HttpResponse.json({ success: true })
  }),

  // Reorder widgets
  http.patch('/api/v1/widgets/reorder', async ({ request }) => {
    const data = await request.json() as { widgetId: string; newOrder: number; newPosition?: WidgetPosition }
    const { widgetId, newOrder, newPosition } = data
    
    const widget = widgets.find(w => w.id === widgetId)
    if (!widget) {
      return HttpResponse.json({ error: 'Widget not found' }, { status: 404 })
    }

    // Update widget position and order
    widget.order = newOrder
    if (newPosition) {
      widget.position = newPosition
    }
    widget.updatedAt = new Date()

    // Reorder other widgets in the same position
    const samePositionWidgets = widgets.filter(w => 
      w.position === widget.position && w.id !== widgetId
    )
    samePositionWidgets.forEach((w, index) => {
      w.order = index < newOrder - 1 ? index + 1 : index + 2
    })

    return HttpResponse.json(widget)
  }),

  // Get widget templates
  http.get('/api/v1/widget-templates', ({ request }) => {
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const search = url.searchParams.get('search')
    const premium = url.searchParams.get('premium') === 'true'

    let filteredTemplates = [...mockWidgetTemplates]

    if (category && category !== 'all') {
      filteredTemplates = filteredTemplates.filter(t => t.category === category)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filteredTemplates = filteredTemplates.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
      )
    }

    if (premium) {
      filteredTemplates = filteredTemplates.filter(t => t.isPremium)
    }

    return HttpResponse.json({
      templates: filteredTemplates,
      total: filteredTemplates.length
    })
  }),

  // Apply widget template
  http.post('/api/v1/widget-templates/:id/apply', async ({ params, request }) => {
    const data = await request.json() as { targetArea: WidgetPosition; replaceExisting: boolean }
    const { targetArea, replaceExisting } = data
    const template = mockWidgetTemplates.find(t => t.id === params.id)

    if (!template) {
      return HttpResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (template.isPremium) {
      return HttpResponse.json({ error: 'Premium template requires purchase' }, { status: 403 })
    }

    // Remove existing widgets in target area if replaceExisting is true
    if (replaceExisting) {
      widgets = widgets.filter(w => w.position !== targetArea)
    }

    // Create new widgets from template
    const newWidgets: Widget[] = template.widgets.map((templateWidget, index) => {
      const baseWidget: Omit<Widget, 'id' | 'createdAt' | 'updatedAt'> = {
        ...templateWidget,
        position: targetArea,
        order: widgets.filter(w => w.position === targetArea).length + index + 1
      }
      
      return {
        ...baseWidget,
        id: `widget-${Date.now()}-${index}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    widgets.push(...newWidgets)

    // Update template download count
    const templateIndex = mockWidgetTemplates.findIndex(t => t.id === params.id)
    if (templateIndex !== -1) {
      mockWidgetTemplates[templateIndex].downloads += 1
    }

    return HttpResponse.json({ 
      success: true, 
      widgets: newWidgets,
      message: `${newWidgets.length}개의 위젯이 추가되었습니다`
    })
  }),

  // Get widget areas
  http.get('/api/v1/widget-areas', () => {
    return HttpResponse.json({
      areas: widgetAreas,
      total: widgetAreas.length
    })
  }),

  // Update widget area settings
  http.put('/api/v1/widget-areas/:id', async ({ params, request }) => {
    const data = await request.json() as Partial<WidgetArea>
    const index = widgetAreas.findIndex(a => a.id === params.id)

    if (index === -1) {
      return HttpResponse.json({ error: 'Widget area not found' }, { status: 404 })
    }

    widgetAreas[index] = {
      ...widgetAreas[index],
      ...data
    }

    return HttpResponse.json(widgetAreas[index])
  })
]