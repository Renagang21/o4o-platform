/**
 * Preview Controller - Live preview for theme customizer
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.middleware.js';
import logger from '../../utils/logger.js';

export class PreviewController {
  /**
   * Render preview page with live customizer settings
   */
  static renderPreview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { themeId = 'default' } = req.query;

    // Preview HTML template with PostMessage listener
    const previewHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Theme Preview</title>
  <style id="customizer-styles">
    :root {
      --bg-color: #ffffff;
      --text-color: #333333;
      --link-color: #0073aa;
      --accent-color: #0073aa;
      --header-bg: #23282d;
      --header-text: #ffffff;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      line-height: 1.6;
      transition: all 0.3s ease;
    }

    body.dark-mode {
      --bg-color: #1a1a1a;
      --text-color: #e0e0e0;
      --link-color: #64b5f6;
      --accent-color: #42a5f5;
    }

    .header {
      background-color: var(--header-bg);
      color: var(--header-text);
      padding: 1rem 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .site-logo {
      max-height: 50px;
    }

    .site-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--header-text);
      text-decoration: none;
    }

    .site-tagline {
      font-size: 0.875rem;
      opacity: 0.8;
    }

    .main-nav {
      display: flex;
      gap: 2rem;
      list-style: none;
    }

    .main-nav a {
      color: var(--header-text);
      text-decoration: none;
      transition: opacity 0.2s;
    }

    .main-nav a:hover {
      opacity: 0.8;
    }

    .main-content {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 2rem;
    }

    .hero {
      background: linear-gradient(135deg, var(--accent-color), var(--link-color));
      color: white;
      padding: 4rem 2rem;
      text-align: center;
      margin-bottom: 2rem;
      border-radius: 8px;
    }

    .hero h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }

    .content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      margin-top: 2rem;
    }

    .card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.2s;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .card h3 {
      color: var(--accent-color);
      margin-bottom: 0.5rem;
    }

    a {
      color: var(--link-color);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    .footer {
      background-color: var(--header-bg);
      color: var(--header-text);
      padding: 2rem;
      margin-top: 4rem;
      text-align: center;
    }

    .background-image {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      opacity: 0.1;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }
  </style>
  <style id="additional-css"></style>
</head>
<body>
  <div class="background-image" id="bg-image"></div>
  
  <header class="header">
    <div class="header-content">
      <div class="site-branding">
        <img id="site-logo" class="site-logo" style="display: none;" />
        <div id="site-text">
          <a href="/" class="site-title" id="site-title">My Website</a>
          <p class="site-tagline" id="site-tagline">Just another website</p>
        </div>
      </div>
      
      <nav>
        <ul class="main-nav" id="primary-menu">
          <li><a href="#">Home</a></li>
          <li><a href="#">About</a></li>
          <li><a href="#">Services</a></li>
          <li><a href="#">Blog</a></li>
          <li><a href="#">Contact</a></li>
        </ul>
      </nav>
    </div>
  </header>

  <main class="main-content">
    <div class="hero">
      <h1>Welcome to Your Website</h1>
      <p>This is a live preview of your theme customizations</p>
    </div>

    <div class="content-grid">
      <div class="card">
        <h3>Feature One</h3>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.</p>
        <a href="#">Learn more →</a>
      </div>
      
      <div class="card">
        <h3>Feature Two</h3>
        <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.</p>
        <a href="#">Learn more →</a>
      </div>
      
      <div class="card">
        <h3>Feature Three</h3>
        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
        <a href="#">Learn more →</a>
      </div>
    </div>

    <section style="margin-top: 3rem;">
      <h2>Latest Posts</h2>
      <div id="posts-container">
        <article style="margin: 1rem 0; padding: 1rem 0; border-bottom: 1px solid #e0e0e0;">
          <h3><a href="#">Blog Post Title</a></h3>
          <p>Post excerpt goes here. This is a sample blog post to demonstrate the preview functionality...</p>
        </article>
      </div>
    </section>
  </main>

  <footer class="footer">
    <p>&copy; 2024 My Website. All rights reserved.</p>
    <nav>
      <ul class="main-nav" id="footer-menu" style="justify-content: center; margin-top: 1rem;">
        <li><a href="#">Privacy</a></li>
        <li><a href="#">Terms</a></li>
        <li><a href="#">Sitemap</a></li>
      </ul>
    </nav>
  </footer>

  <script>
    // Listen for customizer messages
    window.addEventListener('message', function(event) {
      // Verify origin if needed
      // if (event.origin !== window.parent.location.origin) return;

      const { type, data, section, device } = event.data;

      if (type === 'initSettings' || type === 'updateSettings') {
        applySettings(data || event.data);
      }

      if (type === 'deviceChange') {
        document.body.className = device === 'mobile' ? 'mobile-view' : 
                                  device === 'tablet' ? 'tablet-view' : '';
      }
    });

    // Apply settings to preview
    function applySettings(settings) {
      if (!settings) return;

      // Site Identity
      if (settings.siteIdentity) {
        const { logo, siteTitle, tagline } = settings.siteIdentity;
        
        const logoEl = document.getElementById('site-logo');
        const textEl = document.getElementById('site-text');
        const titleEl = document.getElementById('site-title');
        const taglineEl = document.getElementById('site-tagline');
        
        if (logo && logoEl) {
          logoEl.src = logo;
          logoEl.style.display = 'block';
          if (textEl) textEl.style.display = 'none';
        } else {
          if (logoEl) logoEl.style.display = 'none';
          if (textEl) textEl.style.display = 'block';
        }
        
        if (titleEl) titleEl.textContent = siteTitle || 'My Website';
        if (taglineEl) taglineEl.textContent = tagline || 'Just another website';
      }

      // Colors
      if (settings.colors) {
        const root = document.documentElement;
        const colors = settings.colors;
        
        root.style.setProperty('--bg-color', colors.backgroundColor || '#ffffff');
        root.style.setProperty('--text-color', colors.textColor || '#333333');
        root.style.setProperty('--link-color', colors.linkColor || '#0073aa');
        root.style.setProperty('--accent-color', colors.accentColor || '#0073aa');
        root.style.setProperty('--header-bg', colors.headerBackgroundColor || '#23282d');
        root.style.setProperty('--header-text', colors.headerTextColor || '#ffffff');
        
        if (colors.darkMode) {
          document.body.classList.add('dark-mode');
        } else {
          document.body.classList.remove('dark-mode');
        }
      }

      // Background Image
      if (settings.backgroundImage) {
        const bgEl = document.getElementById('bg-image');
        if (bgEl) {
          if (settings.backgroundImage.url) {
            bgEl.style.backgroundImage = \`url(\${settings.backgroundImage.url})\`;
            bgEl.style.backgroundSize = settings.backgroundImage.size || 'cover';
            bgEl.style.backgroundPosition = settings.backgroundImage.position || 'center';
            bgEl.style.backgroundRepeat = settings.backgroundImage.repeat || 'no-repeat';
            bgEl.style.backgroundAttachment = settings.backgroundImage.attachment || 'fixed';
            bgEl.style.opacity = '0.1';
          } else {
            bgEl.style.backgroundImage = 'none';
          }
        }
      }

      // Additional CSS
      if (settings.additionalCss !== undefined) {
        const styleEl = document.getElementById('additional-css');
        if (styleEl) {
          styleEl.textContent = settings.additionalCss;
        }
      }

      // Homepage Settings
      if (settings.homepage) {
        const postsContainer = document.getElementById('posts-container');
        if (postsContainer) {
          if (settings.homepage.showOnFront === 'page') {
            postsContainer.style.display = 'none';
          } else {
            postsContainer.style.display = 'block';
          }
        }
      }
    }

    // Send ready message to parent
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'previewReady' }, '*');
    }
  </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(previewHTML);
    
    logger.info('Preview rendered', { themeId });
  });
}

export default PreviewController;