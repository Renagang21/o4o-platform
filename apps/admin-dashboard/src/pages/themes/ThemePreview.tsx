import { FC, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  X, 
  Monitor, 
  Tablet, 
  Smartphone,
  RotateCw,
  Settings,
  Palette,
  Layout,
  Type,
  Save,
  ChevronLeft,
  ChevronRight,
  Home,
  FileText,
  ShoppingCart,
  User,
  Grid,
  Moon,
  Sun
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface ThemePreviewData {
  theme: {
    id: string;
    name: string;
    version: string;
    colorSchemes?: any[];
    layoutOptions?: any;
    typography?: any;
  };
  styles: string[];
  scripts: string[];
  templates: any[];
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';
type PageType = 'home' | 'blog' | 'shop' | 'about' | 'contact';

const ThemePreview: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [previewData, setPreviewData] = useState<ThemePreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [darkMode, setDarkMode] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [customizations, setCustomizations] = useState({
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
    fontFamily: 'Inter',
    fontSize: '16px',
    containerWidth: '1200px',
    sidebarPosition: 'right' as 'left' | 'right' | 'none'
  });

  useEffect(() => {
    fetchPreviewData();
  }, [id]);

  useEffect(() => {
    applyCustomizations();
  }, [customizations, darkMode]);

  const fetchPreviewData = async () => {
    try {
      setLoading(true);
      // In production, fetch from API
      // const response = await api.get(`/v1/themes/${id}/preview`);
      // setPreviewData(response.data.data);
      
      // Mock data for development
      setPreviewData(getMockPreviewData());
    } catch (error) {
      console.error('Error fetching preview data:', error);
      toast.error('Failed to load theme preview');
    } finally {
      setLoading(false);
    }
  };

  const getMockPreviewData = (): ThemePreviewData => ({
    theme: {
      id: '1',
      name: 'Modern Business',
      version: '2.1.0',
      colorSchemes: [
        { name: 'Default', colors: { primary: '#3b82f6', secondary: '#8b5cf6' } },
        { name: 'Ocean', colors: { primary: '#0ea5e9', secondary: '#06b6d4' } },
        { name: 'Forest', colors: { primary: '#10b981', secondary: '#059669' } },
        { name: 'Sunset', colors: { primary: '#f97316', secondary: '#f59e0b' } }
      ],
      layoutOptions: {
        containerWidth: ['1000px', '1200px', '1400px', 'full'],
        sidebarPosition: ['left', 'right', 'none']
      },
      typography: {
        fonts: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins'],
        sizes: ['14px', '16px', '18px']
      }
    },
    styles: [],
    scripts: [],
    templates: []
  });

  const getDeviceWidth = () => {
    switch (deviceMode) {
      case 'mobile':
        return '375px';
      case 'tablet':
        return '768px';
      case 'desktop':
      default:
        return '100%';
    }
  };

  const applyCustomizations = () => {
    if (!iframeRef.current?.contentWindow) return;
    
    const iframeDoc = iframeRef.current.contentWindow.document;
    const style = iframeDoc.createElement('style');
    style.innerHTML = `
      :root {
        --primary-color: ${customizations.primaryColor};
        --secondary-color: ${customizations.secondaryColor};
        --font-family: ${customizations.fontFamily}, sans-serif;
        --font-size: ${customizations.fontSize};
        --container-width: ${customizations.containerWidth};
        --theme-mode: ${darkMode ? 'dark' : 'light'};
      }
      
      ${darkMode ? `
        body {
          background-color: #1a1a1a !important;
          color: #ffffff !important;
        }
        .header, .footer {
          background-color: #2a2a2a !important;
        }
      ` : ''}
      
      body {
        font-family: var(--font-family);
        font-size: var(--font-size);
      }
      
      .container {
        max-width: var(--container-width);
        margin: 0 auto;
      }
      
      .primary-color {
        color: var(--primary-color);
      }
      
      .secondary-color {
        color: var(--secondary-color);
      }
      
      .primary-bg {
        background-color: var(--primary-color);
      }
      
      .secondary-bg {
        background-color: var(--secondary-color);
      }
    `;
    
    // Remove existing custom style if any
    const existingStyle = iframeDoc.getElementById('theme-customizations');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    style.id = 'theme-customizations';
    iframeDoc.head.appendChild(style);
  };

  const renderPreviewContent = () => {
    const pages = {
      home: `
        <div class="header primary-bg">
          <div class="container">
            <h1 style="color: white; padding: 20px 0;">Modern Business</h1>
            <nav style="padding-bottom: 20px;">
              <a href="#" style="color: white; margin-right: 20px;">Home</a>
              <a href="#" style="color: white; margin-right: 20px;">About</a>
              <a href="#" style="color: white; margin-right: 20px;">Services</a>
              <a href="#" style="color: white; margin-right: 20px;">Blog</a>
              <a href="#" style="color: white;">Contact</a>
            </nav>
          </div>
        </div>
        
        <div class="hero secondary-bg" style="padding: 60px 0; text-align: center;">
          <div class="container">
            <h2 style="color: white; font-size: 2.5em; margin-bottom: 20px;">Welcome to Modern Business</h2>
            <p style="color: white; font-size: 1.2em; margin-bottom: 30px;">Professional solutions for your business needs</p>
            <button style="background: white; color: var(--primary-color); padding: 12px 30px; border: none; border-radius: 5px; font-size: 1.1em; cursor: pointer;">Get Started</button>
          </div>
        </div>
        
        <div class="features" style="padding: 60px 0;">
          <div class="container">
            <h3 style="text-align: center; font-size: 2em; margin-bottom: 40px;" class="primary-color">Our Features</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px;">
              <div style="text-align: center; padding: 20px;">
                <div style="width: 60px; height: 60px; background: var(--primary-color); border-radius: 50%; margin: 0 auto 20px;"></div>
                <h4>Fast Performance</h4>
                <p>Lightning fast loading speeds for better user experience</p>
              </div>
              <div style="text-align: center; padding: 20px;">
                <div style="width: 60px; height: 60px; background: var(--secondary-color); border-radius: 50%; margin: 0 auto 20px;"></div>
                <h4>Responsive Design</h4>
                <p>Looks great on all devices and screen sizes</p>
              </div>
              <div style="text-align: center; padding: 20px;">
                <div style="width: 60px; height: 60px; background: var(--primary-color); border-radius: 50%; margin: 0 auto 20px;"></div>
                <h4>SEO Optimized</h4>
                <p>Built with search engines in mind</p>
              </div>
            </div>
          </div>
        </div>
      `,
      blog: `
        <div class="header primary-bg">
          <div class="container">
            <h1 style="color: white; padding: 20px 0;">Blog</h1>
          </div>
        </div>
        
        <div class="blog-content" style="padding: 40px 0;">
          <div class="container">
            <article style="margin-bottom: 40px; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
              <h2 class="primary-color">Getting Started with Modern Business Theme</h2>
              <p style="color: #666; margin: 10px 0;">Published on January 15, 2024</p>
              <p>Learn how to set up and customize the Modern Business theme for your website. This comprehensive guide covers installation, configuration, and best practices...</p>
              <a href="#" class="secondary-color">Read More →</a>
            </article>
            
            <article style="margin-bottom: 40px; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
              <h2 class="primary-color">10 Tips for Better Website Performance</h2>
              <p style="color: #666; margin: 10px 0;">Published on January 10, 2024</p>
              <p>Discover essential tips and techniques to optimize your website's performance. From image optimization to caching strategies...</p>
              <a href="#" class="secondary-color">Read More →</a>
            </article>
          </div>
        </div>
      `,
      shop: `
        <div class="header primary-bg">
          <div class="container">
            <h1 style="color: white; padding: 20px 0;">Shop</h1>
          </div>
        </div>
        
        <div class="shop-content" style="padding: 40px 0;">
          <div class="container">
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;">
              <div style="border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
                <div style="height: 200px; background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));"></div>
                <div style="padding: 15px;">
                  <h3>Product Name</h3>
                  <p style="color: #666;">Brief product description</p>
                  <p style="font-size: 1.5em; color: var(--primary-color); margin: 10px 0;">$99.99</p>
                  <button style="width: 100%; padding: 10px; background: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer;">Add to Cart</button>
                </div>
              </div>
              <div style="border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden;">
                <div style="height: 200px; background: linear-gradient(135deg, var(--secondary-color), var(--primary-color));"></div>
                <div style="padding: 15px;">
                  <h3>Product Name</h3>
                  <p style="color: #666;">Brief product description</p>
                  <p style="font-size: 1.5em; color: var(--primary-color); margin: 10px 0;">$149.99</p>
                  <button style="width: 100%; padding: 10px; background: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer;">Add to Cart</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      about: `
        <div class="header primary-bg">
          <div class="container">
            <h1 style="color: white; padding: 20px 0;">About Us</h1>
          </div>
        </div>
        
        <div class="about-content" style="padding: 40px 0;">
          <div class="container">
            <h2 class="primary-color" style="margin-bottom: 20px;">Our Story</h2>
            <p style="line-height: 1.8; margin-bottom: 20px;">Founded in 2020, Modern Business has been helping companies transform their digital presence. We believe in creating beautiful, functional websites that drive results.</p>
            <p style="line-height: 1.8; margin-bottom: 30px;">Our team of experts specializes in web design, development, and digital marketing solutions tailored to your business needs.</p>
            
            <h3 class="secondary-color" style="margin-bottom: 20px;">Our Values</h3>
            <ul style="line-height: 2;">
              <li>Quality First - We never compromise on quality</li>
              <li>Customer Success - Your success is our success</li>
              <li>Innovation - Always staying ahead of the curve</li>
              <li>Transparency - Open and honest communication</li>
            </ul>
          </div>
        </div>
      `,
      contact: `
        <div class="header primary-bg">
          <div class="container">
            <h1 style="color: white; padding: 20px 0;">Contact Us</h1>
          </div>
        </div>
        
        <div class="contact-content" style="padding: 40px 0;">
          <div class="container">
            <div style="max-width: 600px; margin: 0 auto;">
              <form>
                <div style="margin-bottom: 20px;">
                  <label style="display: block; margin-bottom: 5px;">Name</label>
                  <input type="text" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" />
                </div>
                <div style="margin-bottom: 20px;">
                  <label style="display: block; margin-bottom: 5px;">Email</label>
                  <input type="email" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" />
                </div>
                <div style="margin-bottom: 20px;">
                  <label style="display: block; margin-bottom: 5px;">Message</label>
                  <textarea style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; min-height: 150px;"></textarea>
                </div>
                <button type="submit" style="width: 100%; padding: 12px; background: var(--primary-color); color: white; border: none; border-radius: 5px; font-size: 1.1em; cursor: pointer;">Send Message</button>
              </form>
            </div>
          </div>
        </div>
      `
    };

    return pages[currentPage];
  };

  const handleApplyTheme = async () => {
    try {
      // In production, save theme activation
      // await api.post(`/v1/themes/${id}/activate`, { customizations });
      
      toast.success('테마가 적용되었습니다');
      navigate('/themes');
    } catch (error) {
      console.error('Error applying theme:', error);
      toast.error('테마 적용에 실패했습니다');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/themes/marketplace')}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            뒤로
          </Button>
          <h1 className="text-lg font-semibold">
            {previewData?.theme.name} - 미리보기
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Device Mode Selector */}
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={deviceMode === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDeviceMode('desktop')}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              variant={deviceMode === 'tablet' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDeviceMode('tablet')}
            >
              <Tablet className="w-4 h-4" />
            </Button>
            <Button
              variant={deviceMode === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDeviceMode('mobile')}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Dark Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          
          {/* Customize Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCustomizing(!customizing)}
          >
            <Settings className="w-4 h-4 mr-1" />
            사용자 정의
          </Button>
          
          {/* Apply Theme Button */}
          <Button onClick={handleApplyTheme}>
            <Save className="w-4 h-4 mr-1" />
            테마 적용
          </Button>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-2">
        <span className="text-sm text-gray-600 mr-2">페이지:</span>
        {(['home', 'blog', 'shop', 'about', 'contact'] as PageType[]).map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentPage(page)}
          >
            {page === 'home' && <Home className="w-4 h-4 mr-1" />}
            {page === 'blog' && <FileText className="w-4 h-4 mr-1" />}
            {page === 'shop' && <ShoppingCart className="w-4 h-4 mr-1" />}
            {page === 'about' && <User className="w-4 h-4 mr-1" />}
            {page === 'contact' && <Grid className="w-4 h-4 mr-1" />}
            {page.charAt(0).toUpperCase() + page.slice(1)}
          </Button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Customization Panel */}
        {customizing && (
          <div className="w-80 bg-white border-r overflow-y-auto">
            <div className="p-4 space-y-6">
              {/* Colors */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  색상
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">기본 색상</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customizations.primaryColor}
                        onChange={(e) => setCustomizations({
                          ...customizations,
                          primaryColor: e.target.value
                        })}
                        className="w-12 h-8 border rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customizations.primaryColor}
                        onChange={(e) => setCustomizations({
                          ...customizations,
                          primaryColor: e.target.value
                        })}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">보조 색상</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customizations.secondaryColor}
                        onChange={(e) => setCustomizations({
                          ...customizations,
                          secondaryColor: e.target.value
                        })}
                        className="w-12 h-8 border rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customizations.secondaryColor}
                        onChange={(e) => setCustomizations({
                          ...customizations,
                          secondaryColor: e.target.value
                        })}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Color Schemes */}
                {previewData?.theme.colorSchemes && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-2">색상 스키마</label>
                    <div className="grid grid-cols-2 gap-2">
                      {previewData.theme.colorSchemes.map((scheme: any, index: number) => (
                        <button
                          key={index}
                          onClick={() => setCustomizations({
                            ...customizations,
                            primaryColor: scheme.colors.primary,
                            secondaryColor: scheme.colors.secondary
                          })}
                          className="p-2 border rounded text-sm hover:bg-gray-50"
                        >
                          <div className="flex gap-1 mb-1">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: scheme.colors.primary }}
                            />
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: scheme.colors.secondary }}
                            />
                          </div>
                          <span className="text-xs">{scheme.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Typography */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  타이포그래피
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">폰트</label>
                    <select
                      value={customizations.fontFamily}
                      onChange={(e) => setCustomizations({
                        ...customizations,
                        fontFamily: e.target.value
                      })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      {previewData?.theme.typography?.fonts.map((font: string) => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">크기</label>
                    <select
                      value={customizations.fontSize}
                      onChange={(e) => setCustomizations({
                        ...customizations,
                        fontSize: e.target.value
                      })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      {previewData?.theme.typography?.sizes.map((size: string) => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Layout */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Layout className="w-4 h-4" />
                  레이아웃
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">컨테이너 너비</label>
                    <select
                      value={customizations.containerWidth}
                      onChange={(e) => setCustomizations({
                        ...customizations,
                        containerWidth: e.target.value
                      })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      {previewData?.theme.layoutOptions?.containerWidth.map((width: string) => (
                        <option key={width} value={width}>{width}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">사이드바 위치</label>
                    <select
                      value={customizations.sidebarPosition}
                      onChange={(e) => setCustomizations({
                        ...customizations,
                        sidebarPosition: e.target.value as 'left' | 'right' | 'none'
                      })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      {previewData?.theme.layoutOptions?.sidebarPosition.map((position: string) => (
                        <option key={position} value={position}>
                          {position === 'none' ? '없음' : position === 'left' ? '왼쪽' : '오른쪽'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Frame */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div
            className="bg-white shadow-2xl transition-all duration-300"
            style={{
              width: getDeviceWidth(),
              height: deviceMode === 'mobile' ? '667px' : deviceMode === 'tablet' ? '1024px' : '90%',
              maxWidth: '100%',
              borderRadius: deviceMode === 'mobile' ? '20px' : '8px',
              overflow: 'hidden'
            }}
          >
            <iframe
              ref={iframeRef}
              srcDoc={`
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    * {
                      margin: 0;
                      padding: 0;
                      box-sizing: border-box;
                    }
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                      line-height: 1.6;
                    }
                  </style>
                </head>
                <body>
                  ${renderPreviewContent()}
                </body>
                </html>
              `}
              className="w-full h-full border-0"
              onLoad={applyCustomizations}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemePreview;