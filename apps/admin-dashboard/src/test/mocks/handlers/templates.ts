import { http, HttpResponse } from 'msw'
import type { 
  Template, 
  TemplateListResponse, 
  TemplateLibraryResponse, 
  TemplateLibraryItem,
  CreateTemplateDto,
  UpdateTemplateDto
} from '@o4o/types'

// Mock templates
const mockTemplates: Template[] = [
  {
    id: 'template-1',
    name: '모던 랜딩 페이지',
    description: '깔끔하고 현대적인 디자인의 랜딩 페이지 템플릿',
    type: 'page',
    category: 'landing-page',
    status: 'published',
    blocks: [
      {
        id: 'block-1',
        type: 'hero',
        content: {
          title: 'Welcome to Our Platform',
          subtitle: 'Build amazing experiences with our tools',
          backgroundImage: 'https://images.unsplash.com/photo-1557804506-669a67965ba0',
          buttons: [
            { text: 'Get Started', url: '/signup', style: 'primary' },
            { text: 'Learn More', url: '/about', style: 'secondary' }
          ]
        },
        settings: {
          margin: { top: '0', right: '0', bottom: '2rem', left: '0' },
          padding: { top: '4rem', right: '2rem', bottom: '4rem', left: '2rem' },
          background: { type: 'none' },
          border: {},
          animation: { type: 'fade', duration: 600, delay: 0, trigger: 'page-load' },
          visibility: { desktop: true, tablet: true, mobile: true }
        },
        order: 0
      },
      {
        id: 'block-2',
        type: 'heading',
        content: {
          text: 'Our Features',
          level: 2
        },
        settings: {
          margin: { top: '0', right: '0', bottom: '1rem', left: '0' },
          padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' },
          background: { type: 'none' },
          border: {},
          animation: { type: 'slide', duration: 400, delay: 200, trigger: 'scroll' },
          visibility: { desktop: true, tablet: true, mobile: true }
        },
        order: 1
      }
    ],
    settings: {
      layout: {
        containerWidth: '1200px',
        contentWidth: '100%',
        sidebar: { enabled: false, position: 'right', width: '300px' },
        header: { enabled: true, sticky: false, transparent: false },
        footer: { enabled: true, sticky: false }
      },
      typography: {
        fontFamily: { primary: 'Inter', secondary: 'Inter', monospace: 'Monaco' },
        fontSize: { base: '16px', scale: 1.25 },
        lineHeight: { tight: 1.25, normal: 1.5, loose: 1.75 },
        fontWeight: { normal: 400, medium: 500, bold: 700 }
      },
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#f59e0b',
        background: '#ffffff',
        surface: '#f8fafc',
        text: { primary: '#1e293b', secondary: '#64748b', muted: '#94a3b8' },
        border: '#e2e8f0',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      spacing: { top: '0', right: '0', bottom: '0', left: '0' },
      seo: {
        title: 'Modern Landing Page',
        description: 'A clean and modern landing page template'
      }
    },
    preview: {
      thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
      screenshots: []
    },
    metadata: {
      tags: ['landing', 'modern', 'business'],
      author: 'Template Author',
      version: '1.0.0',
      compatibility: ['react', 'nextjs'],
      usageCount: 45,
      rating: 4.8,
      downloads: 1250,
      featured: true
    },
    createdBy: 'admin',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-07-15')
  },
  {
    id: 'template-2',
    name: '포트폴리오 페이지',
    description: '작품을 멋지게 전시할 수 있는 포트폴리오 템플릿',
    type: 'page',
    category: 'portfolio',
    status: 'published',
    blocks: [
      {
        id: 'block-3',
        type: 'heading',
        content: {
          text: 'My Portfolio',
          level: 1
        },
        settings: {
          margin: { top: '0', right: '0', bottom: '2rem', left: '0' },
          padding: { top: '2rem', right: '1rem', bottom: '1rem', left: '1rem' },
          background: { type: 'none' },
          border: {},
          animation: { type: 'none', duration: 300, delay: 0, trigger: 'page-load' },
          visibility: { desktop: true, tablet: true, mobile: true }
        },
        order: 0
      },
      {
        id: 'block-4',
        type: 'gallery',
        content: {
          images: [
            {
              src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
              alt: 'Portfolio Item 1',
              caption: 'Web Design Project'
            },
            {
              src: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c',
              alt: 'Portfolio Item 2', 
              caption: 'Brand Identity'
            }
          ],
          columns: 3,
          spacing: '1rem'
        },
        settings: {
          margin: { top: '0', right: '0', bottom: '2rem', left: '0' },
          padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' },
          background: { type: 'none' },
          border: {},
          animation: { type: 'zoom', duration: 500, delay: 300, trigger: 'scroll' },
          visibility: { desktop: true, tablet: true, mobile: true }
        },
        order: 1
      }
    ],
    settings: {
      layout: {
        containerWidth: '1200px',
        contentWidth: '100%',
        sidebar: { enabled: false, position: 'right', width: '300px' },
        header: { enabled: true, sticky: false, transparent: false },
        footer: { enabled: true, sticky: false }
      },
      typography: {
        fontFamily: { primary: 'Playfair Display', secondary: 'Inter', monospace: 'Monaco' },
        fontSize: { base: '16px', scale: 1.25 },
        lineHeight: { tight: 1.25, normal: 1.5, loose: 1.75 },
        fontWeight: { normal: 400, medium: 500, bold: 700 }
      },
      colors: {
        primary: '#1f2937',
        secondary: '#6b7280',
        accent: '#f59e0b',
        background: '#ffffff',
        surface: '#f9fafb',
        text: { primary: '#111827', secondary: '#6b7280', muted: '#9ca3af' },
        border: '#e5e7eb',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      spacing: { top: '0', right: '0', bottom: '0', left: '0' },
      seo: {
        title: 'Portfolio Template',
        description: 'Showcase your work beautifully'
      }
    },
    preview: {
      thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      screenshots: []
    },
    metadata: {
      tags: ['portfolio', 'creative', 'showcase'],
      author: 'Creative Studio',
      version: '1.2.0',
      compatibility: ['react', 'vue'],
      usageCount: 28,
      rating: 4.6,
      downloads: 890,
      featured: false
    },
    createdBy: 'admin',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-07-10')
  },
  {
    id: 'template-3',
    name: '블로그 홈페이지',
    description: '블로그 포스트를 보여주는 홈페이지 템플릿',
    type: 'page',
    category: 'blog',
    status: 'draft',
    blocks: [
      {
        id: 'block-5',
        type: 'hero',
        content: {
          title: 'Welcome to My Blog',
          subtitle: 'Thoughts, stories and ideas',
          backgroundImage: '',
          buttons: []
        },
        settings: {
          margin: { top: '0', right: '0', bottom: '2rem', left: '0' },
          padding: { top: '3rem', right: '2rem', bottom: '3rem', left: '2rem' },
          background: { type: 'color', color: '#f3f4f6' },
          border: {},
          animation: { type: 'none', duration: 300, delay: 0, trigger: 'page-load' },
          visibility: { desktop: true, tablet: true, mobile: true }
        },
        order: 0
      }
    ],
    settings: {
      layout: {
        containerWidth: '800px',
        contentWidth: '100%',
        sidebar: { enabled: true, position: 'right', width: '300px' },
        header: { enabled: true, sticky: true, transparent: false },
        footer: { enabled: true, sticky: false }
      },
      typography: {
        fontFamily: { primary: 'Georgia', secondary: 'Inter', monospace: 'Monaco' },
        fontSize: { base: '18px', scale: 1.2 },
        lineHeight: { tight: 1.25, normal: 1.6, loose: 1.8 },
        fontWeight: { normal: 400, medium: 500, bold: 700 }
      },
      colors: {
        primary: '#059669',
        secondary: '#6b7280',
        accent: '#d97706',
        background: '#ffffff',
        surface: '#f9fafb',
        text: { primary: '#111827', secondary: '#4b5563', muted: '#9ca3af' },
        border: '#e5e7eb',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      spacing: { top: '0', right: '0', bottom: '0', left: '0' },
      seo: {
        title: 'Blog Homepage',
        description: 'A beautiful blog homepage template'
      }
    },
    preview: {
      thumbnail: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400',
      screenshots: []
    },
    metadata: {
      tags: ['blog', 'writing', 'content'],
      author: 'Blog Author',
      version: '1.0.0',
      compatibility: ['react', 'gatsby'],
      usageCount: 12,
      rating: 4.2,
      downloads: 456,
      featured: false
    },
    createdBy: 'admin',
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-07-05')
  }
]

// Mock template library items
const mockLibraryItems: TemplateLibraryItem[] = [
  {
    id: 'lib-1',
    name: 'SaaS Landing Pro',
    description: 'Professional SaaS landing page with conversion-optimized design',
    category: 'landing-page',
    preview: {
      thumbnail: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400',
      screenshots: []
    },
    metadata: {
      tags: ['saas', 'landing', 'conversion', 'professional'],
      author: 'Pro Templates',
      version: '2.0.0',
      compatibility: ['react', 'nextjs', 'vue'],
      usageCount: 1250,
      rating: 4.9,
      downloads: 5670
    },
    isPremium: true,
    price: 49,
    popularity: 95,
    featured: true
  },
  {
    id: 'lib-2',
    name: 'Minimal Portfolio',
    description: 'Clean and minimal portfolio template for creatives',
    category: 'portfolio',
    preview: {
      thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      screenshots: []
    },
    metadata: {
      tags: ['portfolio', 'minimal', 'creative', 'clean'],
      author: 'Design Studio',
      version: '1.5.0',
      compatibility: ['react', 'vue', 'angular'],
      usageCount: 890,
      rating: 4.7,
      downloads: 3240
    },
    isPremium: false,
    popularity: 78,
    featured: true
  },
  {
    id: 'lib-3',
    name: 'E-commerce Pro',
    description: 'Complete e-commerce template with product showcase and cart',
    category: 'ecommerce',
    preview: {
      thumbnail: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400',
      screenshots: []
    },
    metadata: {
      tags: ['ecommerce', 'shop', 'products', 'cart'],
      author: 'Commerce Co',
      version: '3.0.0',
      compatibility: ['react', 'nextjs'],
      usageCount: 2100,
      rating: 4.8,
      downloads: 8950
    },
    isPremium: true,
    price: 89,
    popularity: 92,
    featured: true
  },
  {
    id: 'lib-4',
    name: 'Business Corporate',
    description: 'Professional business template for corporate websites',
    category: 'business',
    preview: {
      thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400',
      screenshots: []
    },
    metadata: {
      tags: ['business', 'corporate', 'professional', 'company'],
      author: 'Corp Templates',
      version: '1.8.0',
      compatibility: ['react', 'vue'],
      usageCount: 567,
      rating: 4.5,
      downloads: 2340
    },
    isPremium: false,
    popularity: 65,
    featured: false
  },
  {
    id: 'lib-5',
    name: 'Creative Agency',
    description: 'Bold and creative template for design agencies',
    category: 'creative',
    preview: {
      thumbnail: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400',
      screenshots: []
    },
    metadata: {
      tags: ['creative', 'agency', 'bold', 'design'],
      author: 'Creative Co',
      version: '2.2.0',
      compatibility: ['react', 'gatsby'],
      usageCount: 445,
      rating: 4.6,
      downloads: 1890
    },
    isPremium: true,
    price: 69,
    popularity: 71,
    featured: false
  }
]

// Store data in memory for CRUD operations
let templates = [...mockTemplates]
let libraryItems = [...mockLibraryItems]

export const templateHandlers = [
  // Get templates
  http.get('/api/v1/templates', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '12')
    const search = url.searchParams.get('search')
    const category = url.searchParams.get('category')
    const type = url.searchParams.get('type')
    const status = url.searchParams.get('status')

    let filteredTemplates = [...templates]

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase()
      filteredTemplates = filteredTemplates.filter(template =>
        template.name.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    if (category && category !== 'all') {
      filteredTemplates = filteredTemplates.filter(template => template.category === category)
    }

    if (type && type !== 'all') {
      filteredTemplates = filteredTemplates.filter(template => template.type === type)
    }

    if (status && status !== 'all') {
      filteredTemplates = filteredTemplates.filter(template => template.status === status)
    }

    // Sort by updated date
    filteredTemplates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex)

    const response: TemplateListResponse = {
      templates: paginatedTemplates,
      total: filteredTemplates.length,
      page,
      limit,
      totalPages: Math.ceil(filteredTemplates.length / limit)
    }

    return HttpResponse.json(response)
  }),

  // Get single template
  http.get('/api/v1/templates/:id', ({ params }) => {
    const template = templates.find(t => t.id === params.id)
    if (!template) {
      return HttpResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    return HttpResponse.json(template)
  }),

  // Create template
  http.post('/api/v1/templates', async ({ request }) => {
    const data = await request.json() as CreateTemplateDto
    
    const newTemplate: Template = {
      id: `template-${Date.now()}`,
      name: data.name,
      description: data.description,
      type: data.type,
      category: data.category,
      status: 'draft',
      blocks: data.template?.blocks || [],
      settings: data.template?.settings || {
        layout: {
          containerWidth: '1200px',
          contentWidth: '100%',
          sidebar: { enabled: false, position: 'right', width: '300px' },
          header: { enabled: true, sticky: false, transparent: false },
          footer: { enabled: true, sticky: false }
        },
        typography: {
          fontFamily: { primary: 'Inter', secondary: 'Inter', monospace: 'Monaco' },
          fontSize: { base: '16px', scale: 1.25 },
          lineHeight: { tight: 1.25, normal: 1.5, loose: 1.75 },
          fontWeight: { normal: 400, medium: 500, bold: 700 }
        },
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          accent: '#f59e0b',
          background: '#ffffff',
          surface: '#f8fafc',
          text: { primary: '#1e293b', secondary: '#64748b', muted: '#94a3b8' },
          border: '#e2e8f0',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444'
        },
        spacing: { top: '0', right: '0', bottom: '0', left: '0' },
        seo: {}
      },
      preview: {
        thumbnail: '',
        screenshots: []
      },
      metadata: {
        tags: [],
        author: 'User',
        version: '1.0.0',
        compatibility: ['react'],
        usageCount: 0,
        rating: 0,
        downloads: 0
      },
      createdBy: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    templates.unshift(newTemplate)
    return HttpResponse.json(newTemplate, { status: 201 })
  }),

  // Update template
  http.put('/api/v1/templates/:id', async ({ params, request }) => {
    const data = await request.json() as UpdateTemplateDto
    const index = templates.findIndex(t => t.id === params.id)

    if (index === -1) {
      return HttpResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    templates[index] = {
      ...templates[index],
      ...data,
      updatedAt: new Date(),
      settings: {
        layout: {
          containerWidth: '1200px',
          contentWidth: '800px',
          sidebar: { enabled: false, position: 'right', width: '300px' },
          header: { enabled: true, sticky: false, transparent: false },
          footer: { enabled: true, sticky: false }
        },
        typography: {
          fontFamily: { primary: 'Inter', secondary: 'Georgia', monospace: 'Monaco' },
          fontSize: { base: '16px', scale: 1.25 },
          lineHeight: { tight: 1.25, normal: 1.5, loose: 1.75 },
          fontWeight: { normal: 400, medium: 500, bold: 700 }
        },
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          accent: '#8b5cf6',
          background: '#ffffff',
          surface: '#f8fafc',
          text: { primary: '#1f2937', secondary: '#6b7280', muted: '#9ca3af' },
          border: '#e5e7eb',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444'
        },
        spacing: { top: '2rem', right: '2rem', bottom: '2rem', left: '2rem' },
        seo: {}
      }
    }

    return HttpResponse.json(templates[index])
  }),

  // Delete template
  http.delete('/api/v1/templates/:id', ({ params }) => {
    const index = templates.findIndex(t => t.id === params.id)

    if (index === -1) {
      return HttpResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    templates.splice(index, 1)
    return HttpResponse.json({ success: true })
  }),

  // Duplicate template
  http.post('/api/v1/templates/:id/duplicate', ({ params }) => {
    const original = templates.find(t => t.id === params.id)

    if (!original) {
      return HttpResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const duplicate: Template = {
      ...original,
      id: `template-${Date.now()}`,
      name: `${original.name} (Copy)`,
      status: 'draft',
      metadata: {
        ...original.metadata,
        usageCount: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    templates.unshift(duplicate)
    return HttpResponse.json(duplicate, { status: 201 })
  }),

  // Get template library
  http.get('/api/v1/template-library', ({ request }) => {
    const url = new URL(request.url)
    const search = url.searchParams.get('search')
    const category = url.searchParams.get('category')
    const isPremium = url.searchParams.get('isPremium')
    const rating = url.searchParams.get('rating')

    let filteredItems = [...libraryItems]

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase()
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower) ||
        item.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    if (category) {
      filteredItems = filteredItems.filter(item => item.category === category)
    }

    if (isPremium !== null) {
      filteredItems = filteredItems.filter(item => 
        item.isPremium === (isPremium === 'true')
      )
    }

    if (rating) {
      const minRating = parseFloat(rating)
      filteredItems = filteredItems.filter(item => item.metadata.rating >= minRating)
    }

    // Sort by popularity
    filteredItems.sort((a, b) => b.popularity - a.popularity)

    const response: TemplateLibraryResponse = {
      items: filteredItems,
      total: filteredItems.length,
      page: 1,
      limit: filteredItems.length,
      totalPages: 1,
      categories: ['landing-page', 'portfolio', 'ecommerce', 'business', 'creative'],
      tags: [...new Set(filteredItems.flatMap(item => item.metadata.tags))]
    }

    return HttpResponse.json(response)
  }),

  // Import template from library
  http.post('/api/v1/template-library/:id/import', ({ params }) => {
    const libraryItem = libraryItems.find(item => item.id === params.id)

    if (!libraryItem) {
      return HttpResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Create a new template from library item
    const newTemplate: Template = {
      id: `template-${Date.now()}`,
      name: libraryItem.name,
      description: libraryItem.description,
      type: 'page',
      category: libraryItem.category,
      status: 'draft',
      blocks: [
        {
          id: `block-${Date.now()}`,
          type: 'hero',
          content: {
            title: 'Imported Template',
            subtitle: 'Customize this template to match your needs'
          },
          settings: {
            margin: { top: '0', right: '0', bottom: '2rem', left: '0' },
            padding: { top: '2rem', right: '1rem', bottom: '2rem', left: '1rem' },
            background: { type: 'none' },
            border: {},
            animation: { type: 'none', duration: 300, delay: 0, trigger: 'page-load' },
            visibility: { desktop: true, tablet: true, mobile: true }
          },
          order: 0
        }
      ],
      settings: {
        layout: {
          containerWidth: '1200px',
          contentWidth: '100%',
          sidebar: { enabled: false, position: 'right', width: '300px' },
          header: { enabled: true, sticky: false, transparent: false },
          footer: { enabled: true, sticky: false }
        },
        typography: {
          fontFamily: { primary: 'Inter', secondary: 'Inter', monospace: 'Monaco' },
          fontSize: { base: '16px', scale: 1.25 },
          lineHeight: { tight: 1.25, normal: 1.5, loose: 1.75 },
          fontWeight: { normal: 400, medium: 500, bold: 700 }
        },
        colors: {
          primary: '#3b82f6',
          secondary: '#64748b',
          accent: '#f59e0b',
          background: '#ffffff',
          surface: '#f8fafc',
          text: { primary: '#1e293b', secondary: '#64748b', muted: '#94a3b8' },
          border: '#e2e8f0',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444'
        },
        spacing: { top: '0', right: '0', bottom: '0', left: '0' },
        seo: {}
      },
      preview: libraryItem.preview,
      metadata: {
        ...libraryItem.metadata,
        usageCount: 0
      },
      createdBy: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    templates.unshift(newTemplate)

    // Update download count
    const itemIndex = libraryItems.findIndex(item => item.id === params.id)
    if (itemIndex !== -1) {
      libraryItems[itemIndex].metadata.downloads += 1
    }

    return HttpResponse.json(newTemplate, { status: 201 })
  })
]