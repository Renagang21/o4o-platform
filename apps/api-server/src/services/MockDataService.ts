// Mock data service for development without database
export class MockDataService {
  private static templates = new Map();
  private static pages = new Map();
  
  static initMockData() {
    // Initialize with default homepage template
    this.templates.set('homepage', {
      id: 'mock-homepage-1',
      name: 'homepage',
      type: 'page',
      layoutType: 'custom',
      active: true,
      content: [
        {
          id: 'hero-1',
          type: 'hero',
          content: {
            title: 'Welcome to O4O Platform',
            subtitle: 'Build amazing WordPress-style websites with our modern CMS',
            backgroundImage: '',
            buttons: [
              { text: 'Get Started', url: '/signup', style: 'primary' },
              { text: 'Learn More', url: '/about', style: 'secondary' }
            ]
          },
          settings: {
            height: '600px',
            overlay: true,
            overlayOpacity: 0.5,
            textColor: 'white',
            alignment: 'center'
          }
        },
        {
          id: 'heading-1',
          type: 'heading',
          content: {
            text: 'Features',
            level: 2,
            alignment: 'center'
          }
        },
        {
          id: 'paragraph-1',
          type: 'paragraph',
          content: {
            text: 'Experience the power of a modern content management system with the familiarity of WordPress.',
            alignment: 'center'
          }
        }
      ],
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  static getTemplate(name: string) {
    return this.templates.get(name);
  }

  static updateTemplate(name: string, data: any) {
    this.templates.set(name, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    return this.templates.get(name);
  }

  static getAllTemplates() {
    return Array.from(this.templates.values());
  }

  static getPage(slug: string) {
    return this.pages.get(slug);
  }

  static updatePage(slug: string, data: any) {
    this.pages.set(slug, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    return this.pages.get(slug);
  }
}

// Initialize mock data
MockDataService.initMockData();