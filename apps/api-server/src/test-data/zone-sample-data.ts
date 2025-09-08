// import { ZoneBasedContent, ZoneBlock, ThemeCustomization } from '@o4o/types'

// Temporary type definitions
type ZoneBasedContent = any
type ZoneBlock = any
type ThemeCustomization = any

/**
 * Sample Zone-based Content Data for Testing
 */

// Sample blocks for different zones
const headerBlocks: ZoneBlock[] = [
  {
    id: 'header-group-1',
    type: 'core/group',
    attributes: {
      layout: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      className: 'site-header-inner'
    },
    innerBlocks: [
      {
        id: 'site-logo-1',
        type: 'core/site-logo',
        attributes: {
          width: 120,
          isLink: true,
          linkTarget: '_self'
        }
      },
      {
        id: 'nav-1',
        type: 'core/navigation',
        attributes: {
          orientation: 'horizontal',
          className: 'primary-navigation',
          items: [
            { label: 'Home', url: '/' },
            { label: 'About', url: '/about' },
            { label: 'Services', url: '/services' },
            { label: 'Contact', url: '/contact' }
          ]
        }
      },
      {
        id: 'search-1',
        type: 'core/search',
        attributes: {
          placeholder: 'Search...',
          buttonPosition: 'inside'
        }
      }
    ]
  }
]

const heroBlocks: ZoneBlock[] = [
  {
    id: 'hero-cover-1',
    type: 'core/cover',
    attributes: {
      url: '/images/hero-bg.jpg',
      dimRatio: 50,
      minHeight: '60vh',
      contentPosition: 'center center'
    },
    innerBlocks: [
      {
        id: 'hero-heading-1',
        type: 'core/heading',
        attributes: {
          level: 1,
          textAlign: 'center',
          textColor: 'white'
        },
        content: 'Welcome to Our Platform'
      },
      {
        id: 'hero-paragraph-1',
        type: 'core/paragraph',
        attributes: {
          align: 'center',
          fontSize: 'large',
          textColor: 'white'
        },
        content: 'Build amazing websites with our powerful CMS and theme system'
      },
      {
        id: 'hero-buttons-1',
        type: 'core/buttons',
        attributes: {
          layout: 'flex',
          justifyContent: 'center'
        },
        innerBlocks: [
          {
            id: 'hero-button-1',
            type: 'core/button',
            attributes: {
              text: 'Get Started',
              url: '/signup',
              className: 'is-style-fill'
            }
          },
          {
            id: 'hero-button-2',
            type: 'core/button',
            attributes: {
              text: 'Learn More',
              url: '/features',
              className: 'is-style-outline'
            }
          }
        ]
      }
    ]
  }
]

const mainBlocks: ZoneBlock[] = [
  {
    id: 'main-heading-1',
    type: 'core/heading',
    attributes: {
      level: 2
    },
    content: 'Our Features'
  },
  {
    id: 'main-paragraph-1',
    type: 'core/paragraph',
    content: 'Discover the powerful features that make our platform unique.'
  },
  {
    id: 'main-columns-1',
    type: 'core/columns',
    attributes: {
      verticalAlignment: 'top'
    },
    innerBlocks: [
      {
        id: 'column-1',
        type: 'core/column',
        innerBlocks: [
          {
            id: 'feature-1-heading',
            type: 'core/heading',
            attributes: { level: 3 },
            content: 'Zone-based Editor'
          },
          {
            id: 'feature-1-text',
            type: 'core/paragraph',
            content: 'Edit different areas of your page independently with our zone-based editing system.'
          }
        ]
      },
      {
        id: 'column-2',
        type: 'core/column',
        innerBlocks: [
          {
            id: 'feature-2-heading',
            type: 'core/heading',
            attributes: { level: 3 },
            content: 'Theme Customization'
          },
          {
            id: 'feature-2-text',
            type: 'core/paragraph',
            content: 'Customize colors, fonts, and layouts to match your brand perfectly.'
          }
        ]
      },
      {
        id: 'column-3',
        type: 'core/column',
        innerBlocks: [
          {
            id: 'feature-3-heading',
            type: 'core/heading',
            attributes: { level: 3 },
            content: 'Block Library'
          },
          {
            id: 'feature-3-text',
            type: 'core/paragraph',
            content: 'Choose from a rich library of blocks to build your perfect page.'
          }
        ]
      }
    ]
  }
]

const sidebarBlocks: ZoneBlock[] = [
  {
    id: 'sidebar-search-1',
    type: 'core/search',
    attributes: {
      placeholder: 'Search posts...',
      buttonPosition: 'outside'
    }
  },
  {
    id: 'sidebar-heading-1',
    type: 'core/heading',
    attributes: {
      level: 3
    },
    content: 'Recent Posts'
  },
  {
    id: 'sidebar-latest-posts-1',
    type: 'core/latest-posts',
    attributes: {
      postsToShow: 5,
      displayPostDate: true,
      displayFeaturedImage: true,
      featuredImageSizeSlug: 'thumbnail'
    }
  },
  {
    id: 'sidebar-heading-2',
    type: 'core/heading',
    attributes: {
      level: 3
    },
    content: 'Categories'
  },
  {
    id: 'sidebar-categories-1',
    type: 'core/categories',
    attributes: {
      showHierarchy: true,
      showPostCounts: true
    }
  }
]

const footerBlocks: ZoneBlock[] = [
  {
    id: 'footer-columns-1',
    type: 'core/columns',
    attributes: {
      verticalAlignment: 'top',
      className: 'footer-widgets'
    },
    innerBlocks: [
      {
        id: 'footer-column-1',
        type: 'core/column',
        innerBlocks: [
          {
            id: 'footer-heading-1',
            type: 'core/heading',
            attributes: { level: 3 },
            content: 'About Us'
          },
          {
            id: 'footer-text-1',
            type: 'core/paragraph',
            content: 'We are dedicated to providing the best CMS experience for developers and content creators.'
          }
        ]
      },
      {
        id: 'footer-column-2',
        type: 'core/column',
        innerBlocks: [
          {
            id: 'footer-heading-2',
            type: 'core/heading',
            attributes: { level: 3 },
            content: 'Quick Links'
          },
          {
            id: 'footer-nav-1',
            type: 'core/navigation',
            attributes: {
              orientation: 'vertical',
              items: [
                { label: 'Privacy Policy', url: '/privacy' },
                { label: 'Terms of Service', url: '/terms' },
                { label: 'Support', url: '/support' }
              ]
            }
          }
        ]
      },
      {
        id: 'footer-column-3',
        type: 'core/column',
        innerBlocks: [
          {
            id: 'footer-heading-3',
            type: 'core/heading',
            attributes: { level: 3 },
            content: 'Connect'
          },
          {
            id: 'footer-social-1',
            type: 'core/social-links',
            attributes: {
              iconColor: 'white',
              iconBackgroundColor: 'primary'
            }
          }
        ]
      }
    ]
  },
  {
    id: 'footer-separator-1',
    type: 'core/separator',
    attributes: {
      opacity: 0.2
    }
  },
  {
    id: 'footer-copyright',
    type: 'core/paragraph',
    attributes: {
      align: 'center',
      fontSize: 'small'
    },
    content: '© 2024 Your Company. All rights reserved.'
  }
]

// Complete zone-based content samples
export const singleColumnSample: ZoneBasedContent = {
  zones: {
    header: {
      id: 'header',
      name: 'Header',
      type: 'header',
      editable: true,
      blocks: headerBlocks,
      constraints: {
        allowedBlocks: ['core/site-logo', 'core/navigation', 'core/search', 'core/group'],
        maxBlocks: 10,
        minBlocks: 1,
        required: true,
        singleton: false,
        allowNesting: true,
        maxNestingLevel: 2
      },
      settings: {
        sticky: true,
        height: 'auto',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e5e5'
      }
    },
    hero: {
      id: 'hero',
      name: 'Hero',
      type: 'hero',
      editable: true,
      blocks: heroBlocks,
      constraints: {
        allowedBlocks: ['core/cover', 'core/media-text', 'core/columns'],
        maxBlocks: 5,
        minBlocks: 0,
        required: false,
        singleton: true,
        allowNesting: true,
        maxNestingLevel: 3
      },
      settings: {
        fullWidth: true,
        minHeight: '50vh'
      }
    },
    main: {
      id: 'main',
      name: 'Main Content',
      type: 'main',
      editable: true,
      blocks: mainBlocks,
      constraints: {
        allowedBlocks: [],
        maxBlocks: null,
        minBlocks: 1,
        required: true,
        singleton: false,
        allowNesting: true,
        maxNestingLevel: 5
      },
      settings: {
        maxWidth: '840px',
        padding: '2rem',
        minHeight: '60vh'
      }
    },
    footer: {
      id: 'footer',
      name: 'Footer',
      type: 'footer',
      editable: true,
      blocks: footerBlocks,
      constraints: {
        allowedBlocks: ['core/paragraph', 'core/columns', 'core/navigation', 'core/social-links'],
        maxBlocks: 20,
        minBlocks: 1,
        required: true,
        singleton: false,
        allowNesting: true,
        maxNestingLevel: 3
      },
      settings: {
        backgroundColor: '#1a1a1a',
        textColor: '#ffffff',
        padding: '3rem 2rem 2rem'
      }
    }
  },
  layout: 'single-column',
  version: '1.0.0',
  useZones: true
}

export const twoColumnSample: ZoneBasedContent = {
  ...singleColumnSample,
  zones: {
    ...singleColumnSample.zones,
    sidebar: {
      id: 'sidebar',
      name: 'Sidebar',
      type: 'sidebar',
      editable: true,
      blocks: sidebarBlocks,
      constraints: {
        allowedBlocks: ['core/search', 'core/latest-posts', 'core/categories', 'core/heading'],
        maxBlocks: 15,
        minBlocks: 0,
        required: false,
        singleton: false,
        allowNesting: true,
        maxNestingLevel: 3
      },
      settings: {
        position: 'relative',
        width: '300px',
        sticky: true,
        stickyOffset: 80,
        backgroundColor: '#f8f8f8',
        padding: '1.5rem',
        borderRadius: '8px'
      }
    }
  },
  layout: 'two-column'
}

// Sample theme customization
export const sampleThemeCustomization: ThemeCustomization = {
  branding: {
    logo: '/uploads/logo.png',
    favicon: '/uploads/favicon.ico',
    siteName: 'O4O Platform',
    tagline: 'Your Complete CMS Solution'
  },
  colors: {
    primary: '#007cba',
    secondary: '#6c757d',
    accent: '#28a745',
    text: '#1e1e1e',
    background: '#ffffff',
    customPalette: [
      { name: 'Dark Blue', slug: 'dark-blue', color: '#003d6b' },
      { name: 'Light Gray', slug: 'light-gray', color: '#f5f5f5' }
    ]
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '16px',
    lineHeight: 1.6,
    headingFontFamily: 'Georgia, serif',
    headingFontWeight: '700'
  },
  businessInfo: {
    companyName: 'Neture Corporation',
    phone: '+82-2-1234-5678',
    email: 'contact@neture.co.kr',
    address: '123 Gangnam-gu, Seoul, South Korea',
    socialLinks: {
      facebook: 'https://facebook.com/neture',
      twitter: 'https://twitter.com/neture',
      instagram: 'https://instagram.com/neture',
      linkedin: 'https://linkedin.com/company/neture'
    }
  },
  navigation: {
    menuItems: [
      { id: '1', label: 'Home', url: '/' },
      { id: '2', label: 'Products', url: '/products', children: [
        { id: '2-1', label: 'All Products', url: '/products/all' },
        { id: '2-2', label: 'Categories', url: '/products/categories' }
      ]},
      { id: '3', label: 'About', url: '/about' },
      { id: '4', label: 'Contact', url: '/contact' }
    ],
    footerLinks: [
      { id: 'f1', label: 'Privacy Policy', url: '/privacy' },
      { id: 'f2', label: 'Terms of Service', url: '/terms' },
      { id: 'f3', label: 'Sitemap', url: '/sitemap' }
    ]
  },
  customCSS: `
    .site-header { box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .primary-navigation a:hover { color: var(--wp--preset--color--primary); }
  `
}