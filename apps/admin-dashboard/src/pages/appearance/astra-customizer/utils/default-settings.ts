import { AstraCustomizerSettings } from '../types/customizer-types';

export const getDefaultSettings = (): AstraCustomizerSettings => {
  return {
    // Site Identity
    siteIdentity: {
      logo: {
        desktop: null,
        mobile: null,
        width: {
          desktop: 200,
          tablet: 180,
          mobile: 150,
        },
      },
      siteTitle: {
        show: true,
        text: 'O4O Platform',
        color: {
          normal: '#000000',
          hover: '#0073aa',
        },
        typography: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: { desktop: 30, tablet: 26, mobile: 22 },
          fontWeight: 700,
          lineHeight: { desktop: 1.2, tablet: 1.2, mobile: 1.2 },
          letterSpacing: { desktop: 0, tablet: 0, mobile: 0 },
          textTransform: 'none',
        },
      },
      tagline: {
        show: true,
        text: 'Optimize for Online',
        color: {
          normal: '#666666',
          hover: '#333333',
        },
        typography: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: { desktop: 14, tablet: 13, mobile: 12 },
          fontWeight: 400,
          lineHeight: { desktop: 1.5, tablet: 1.5, mobile: 1.5 },
          letterSpacing: { desktop: 0, tablet: 0, mobile: 0 },
          textTransform: 'none',
        },
      },
      favicon: null,
    },
    
    // Global Colors
    colors: {
      primaryColor: '#0073aa',
      secondaryColor: '#ff6b6b',
      textColor: '#333333',
      linkColor: {
        normal: '#0073aa',
        hover: '#005177',
      },
      borderColor: '#dddddd',
      bodyBackground: '#ffffff',
      contentBackground: '#ffffff',
      palette: {
        color1: '#0073aa',
        color2: '#ff6b6b',
        color3: '#4ecdc4',
        color4: '#f7b731',
        color5: '#5f27cd',
        color6: '#00d2d3',
        color7: '#ff9ff3',
        color8: '#54a0ff',
        color9: '#48dbfb',
      },
    },
    
    // Global Typography
    typography: {
      bodyFont: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: { desktop: 16, tablet: 15, mobile: 14 },
        fontWeight: 400,
        lineHeight: { desktop: 1.65, tablet: 1.6, mobile: 1.5 },
        letterSpacing: { desktop: 0, tablet: 0, mobile: 0 },
        textTransform: 'none',
      },
      headings: {
        h1: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: { desktop: 48, tablet: 40, mobile: 32 },
          fontWeight: 700,
          lineHeight: { desktop: 1.2, tablet: 1.3, mobile: 1.4 },
          letterSpacing: { desktop: -1, tablet: -0.5, mobile: 0 },
          textTransform: 'none',
        },
        h2: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: { desktop: 36, tablet: 32, mobile: 28 },
          fontWeight: 700,
          lineHeight: { desktop: 1.3, tablet: 1.3, mobile: 1.4 },
          letterSpacing: { desktop: -0.5, tablet: 0, mobile: 0 },
          textTransform: 'none',
        },
        h3: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: { desktop: 28, tablet: 24, mobile: 22 },
          fontWeight: 600,
          lineHeight: { desktop: 1.4, tablet: 1.4, mobile: 1.4 },
          letterSpacing: { desktop: 0, tablet: 0, mobile: 0 },
          textTransform: 'none',
        },
        h4: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: { desktop: 22, tablet: 20, mobile: 18 },
          fontWeight: 600,
          lineHeight: { desktop: 1.4, tablet: 1.4, mobile: 1.5 },
          letterSpacing: { desktop: 0, tablet: 0, mobile: 0 },
          textTransform: 'none',
        },
        h5: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: { desktop: 18, tablet: 17, mobile: 16 },
          fontWeight: 600,
          lineHeight: { desktop: 1.5, tablet: 1.5, mobile: 1.5 },
          letterSpacing: { desktop: 0, tablet: 0, mobile: 0 },
          textTransform: 'none',
        },
        h6: {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: { desktop: 16, tablet: 15, mobile: 14 },
          fontWeight: 600,
          lineHeight: { desktop: 1.5, tablet: 1.5, mobile: 1.5 },
          letterSpacing: { desktop: 0, tablet: 0, mobile: 0 },
          textTransform: 'none',
        },
      },
      button: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: { desktop: 14, tablet: 14, mobile: 13 },
        fontWeight: 500,
        lineHeight: { desktop: 1, tablet: 1, mobile: 1 },
        letterSpacing: { desktop: 0.5, tablet: 0.5, mobile: 0.5 },
        textTransform: 'uppercase',
      },
    },
    
    // Container
    container: {
      layout: 'boxed',
      width: {
        desktop: 1200,
        tablet: 992,
        mobile: 544,
      },
      padding: {
        desktop: { top: 0, right: 20, bottom: 0, left: 20 },
        tablet: { top: 0, right: 20, bottom: 0, left: 20 },
        mobile: { top: 0, right: 15, bottom: 0, left: 15 },
      },
      margin: {
        desktop: { top: 0, bottom: 0 },
        tablet: { top: 0, bottom: 0 },
        mobile: { top: 0, bottom: 0 },
      },
    },
    
    // Sidebar
    sidebar: {
      layout: 'right-sidebar',
      width: {
        desktop: 30,
        tablet: 30,
        mobile: 100,
      },
      gap: {
        desktop: 30,
        tablet: 30,
        mobile: 30,
      },
    },
    
    // Header
    header: {
      layout: 'header-main-layout-1',
      sticky: false,
      transparentHeader: false,
      above: {
        enabled: false,
        height: { desktop: 40, tablet: 40, mobile: 40 },
        background: '#f5f5f5',
        content: ['menu', 'search'],
      },
      primary: {
        height: { desktop: 80, tablet: 70, mobile: 60 },
        background: '#ffffff',
        menuAlignment: 'right',
      },
      below: {
        enabled: false,
        height: { desktop: 50, tablet: 50, mobile: 50 },
        background: '#f5f5f5',
        content: ['breadcrumb'],
      },
    },
    
    // Footer
    footer: {
      layout: 'footer-layout-1',
      widgets: {
        enabled: true,
        columns: { desktop: 4, tablet: 2, mobile: 1 },
        background: '#333333',
        textColor: '#ffffff',
        linkColor: {
          normal: '#ffffff',
          hover: '#0073aa',
        },
        padding: {
          desktop: { top: 60, bottom: 60 },
          tablet: { top: 50, bottom: 50 },
          mobile: { top: 40, bottom: 40 },
        },
      },
      bottomBar: {
        enabled: true,
        layout: 'layout-1',
        section1: '© 2025 O4O Platform. All rights reserved.',
        section2: '',
        background: '#1a1a1a',
        textColor: '#999999',
        linkColor: {
          normal: '#999999',
          hover: '#ffffff',
        },
        padding: {
          desktop: { top: 20, bottom: 20 },
          tablet: { top: 20, bottom: 20 },
          mobile: { top: 15, bottom: 15 },
        },
      },
    },
    
    // Blog
    blog: {
      archive: {
        layout: 'blog-layout-1',
        columns: { desktop: 3, tablet: 2, mobile: 1 },
        contentWidth: 'default',
        showFeaturedImage: true,
        imagePosition: 'top',
        imageSize: 'medium',
        meta: {
          showAuthor: true,
          showDate: true,
          showCategory: true,
          showComments: false,
          showReadTime: true,
        },
        excerpt: {
          length: 150,
          readMoreText: 'Read More',
        },
      },
      single: {
        layout: 'default',
        showFeaturedImage: true,
        showBreadcrumb: true,
        showPostNavigation: true,
        showAuthorBox: true,
        showRelatedPosts: true,
        relatedPostsCount: 3,
        meta: {
          showAuthor: true,
          showDate: true,
          showCategory: true,
          showTags: true,
          showComments: true,
          showReadTime: true,
        },
      },
    },
    
    // Custom CSS
    customCSS: '',
    
    // Meta
    _meta: {
      version: '1.0.0',
      lastModified: '2025-01-01T00:00:00.000Z',
      isDirty: false,
    },
  };
};