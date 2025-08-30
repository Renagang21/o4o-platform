/**
 * Preview API Routes - Handle theme customization previews
 */

import { Router, Request, Response } from 'express'
import { query } from 'express-validator'
import { validateDto } from '../middleware/validateDto'
import { authenticateToken } from '../middleware/auth'
import AppDataSource from '../database/connection'
import { User } from '../entities/User'
import { Post } from '../entities/Post'
import fs from 'fs/promises'
import path from 'path'

const router = Router()

// Apply authentication to protected routes
router.use('/ws', authenticateToken)

/**
 * GET /api/preview
 * Generate theme customization preview HTML
 */
router.get('/',
  query('userId').isString().withMessage('User ID is required'),
  query('theme').optional().isString().withMessage('Invalid theme'),
  query('device').optional().isIn(['desktop', 'tablet', 'mobile']).withMessage('Invalid device'),
  query('pageId').optional().isUUID().withMessage('Invalid page ID'),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { userId, theme = 'twenty-four', device = 'desktop', pageId } = req.query as Record<string, string>

      // Get repositories
      const userRepository = AppDataSource.getRepository(User)
      const postRepository = AppDataSource.getRepository(Post)

      // Get user for customization
      const user = await userRepository.findOne({ where: { id: userId } })
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      // Get page content if pageId provided
      let pageContent = null
      if (pageId) {
        const page = await postRepository.findOne({ where: { id: pageId } })
        if (page) {
          pageContent = {
            title: page.title,
            content: page.content,
            zones: page.zones,
            customizations: page.themeCustomizations
          }
        }
      }

      // Load theme configuration
      const themeConfigPath = path.join(process.cwd(), `apps/admin-dashboard/public/themes/${theme}`)
      
      let themeJson = {}
      let zoneConfig = {}
      let themeCss = ''

      try {
        // Load theme.json
        const themeJsonContent = await fs.readFile(path.join(themeConfigPath, 'theme.json'), 'utf8')
        themeJson = JSON.parse(themeJsonContent)

        // Load zones.json
        const zoneConfigContent = await fs.readFile(path.join(themeConfigPath, 'zones.json'), 'utf8')
        zoneConfig = JSON.parse(zoneConfigContent)

        // Load theme CSS
        themeCss = await fs.readFile(path.join(themeConfigPath, 'style.css'), 'utf8')
      } catch (error) {
        console.error('Error loading theme files:', error)
        return res.status(500).json({ error: 'Failed to load theme configuration' })
      }

      // Generate preview HTML
      const previewHtml = generatePreviewHTML({
        user,
        theme: themeJson,
        zones: zoneConfig,
        css: themeCss,
        device,
        pageContent,
        customizations: pageContent?.customizations || null
      })

      // Set appropriate headers
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.setHeader('X-Frame-Options', 'SAMEORIGIN')
      
      res.send(previewHtml)

    } catch (error) {
      console.error('Error generating preview:', error)
      res.status(500).json({ error: 'Failed to generate preview' })
    }
  }
)

/**
 * POST /api/preview/generate
 * Generate preview URL for customization
 */
router.post('/generate',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { customization, device = 'desktop' } = req.body
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      // Generate temporary preview token
      const previewToken = `preview-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Store customization temporarily (in production, use Redis or database)
      // For now, we'll generate a URL with parameters
      const previewUrl = `/api/preview?userId=${userId}&theme=twenty-four&device=${device}&token=${previewToken}`

      res.json({ previewUrl })

    } catch (error) {
      console.error('Error generating preview URL:', error)
      res.status(500).json({ error: 'Failed to generate preview URL' })
    }
  }
)

/**
 * Generate preview HTML
 */
function generatePreviewHTML(options: {
  user: any
  theme: any
  zones: any
  css: string
  device: string
  pageContent?: any
  customizations?: any
}): string {
  const { user, theme, zones, css, device, pageContent, customizations } = options

  // Apply customizations to theme colors if available
  let customizedCss = css
  if (customizations?.colors) {
    const colors = customizations.colors
    customizedCss = css
      .replace(/--wp--preset--color--primary: #[a-fA-F0-9]{6}/g, `--wp--preset--color--primary: ${colors.primary}`)
      .replace(/--wp--preset--color--secondary: #[a-fA-F0-9]{6}/g, `--wp--preset--color--secondary: ${colors.secondary}`)
      .replace(/--wp--preset--color--accent: #[a-fA-F0-9]{6}/g, `--wp--preset--color--accent: ${colors.accent}`)
      .replace(/--wp--preset--color--background: #[a-fA-F0-9]{6}/g, `--wp--preset--color--background: ${colors.background}`)
      .replace(/--wp--preset--color--foreground: #[a-fA-F0-9]{6}/g, `--wp--preset--color--foreground: ${colors.foreground}`)
  }

  // Generate zone content
  const zoneContent = generateZoneContent(zones, pageContent, customizations)

  // Device-specific viewport meta tag
  const viewportMeta = device === 'mobile' 
    ? '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">'
    : '<meta name="viewport" content="width=device-width, initial-scale=1">'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    ${viewportMeta}
    <title>${customizations?.branding?.siteName || pageContent?.title || 'Preview'}</title>
    
    <!-- Theme CSS -->
    <style>
    ${customizedCss}
    
    /* Device-specific adjustments */
    ${device === 'mobile' ? `
    body {
        font-size: 14px;
    }
    .zone-header {
        padding: var(--wp--preset--spacing--20) var(--wp--preset--spacing--20);
    }
    .wp-block-navigation ul {
        flex-direction: column;
        gap: var(--wp--preset--spacing--10);
    }
    ` : ''}
    
    ${device === 'tablet' ? `
    .content-wrapper {
        flex-direction: column;
    }
    .zone-sidebar {
        flex: none;
        margin-top: var(--wp--preset--spacing--40);
    }
    ` : ''}
    
    /* Preview-specific styles */
    .preview-indicator {
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(59, 130, 246, 0.9);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 9999;
    }
    
    /* Customization-specific styles */
    ${customizations?.branding?.logo ? `
    .wp-block-site-logo img {
        content: url("${customizations.branding.logo}");
        max-height: 60px;
        width: auto;
    }
    ` : ''}
    
    .wp-block-site-title a::before {
        content: "${customizations?.branding?.siteName || 'Site Title'}";
    }
    
    .wp-block-site-tagline::before {
        content: "${customizations?.branding?.tagline || ''}";
    }
    </style>
</head>
<body>
    <!-- Preview indicator -->
    <div class="preview-indicator">
        Preview Mode - ${device}
    </div>

    <!-- Site content -->
    <div class="site">
        ${zoneContent}
    </div>
    
    <!-- Preview JavaScript -->
    <script>
    (function() {
        // Listen for customization updates from parent window
        if (window.parent !== window) {
            window.addEventListener('message', function(event) {
                if (event.data.type === 'customization-update') {
                    updateCustomization(event.data.customization);
                }
            });
        }
        
        function updateCustomization(customization) {
            if (customization.colors) {
                updateColors(customization.colors);
            }
            
            if (customization.branding) {
                updateBranding(customization.branding);
            }
        }
        
        function updateColors(colors) {
            const root = document.documentElement;
            Object.entries(colors).forEach(([key, value]) => {
                root.style.setProperty('--wp--preset--color--' + key.replace(/([A-Z])/g, '-$1').toLowerCase(), value);
            });
        }
        
        function updateBranding(branding) {
            // Update site title
            const siteTitleElements = document.querySelectorAll('.wp-block-site-title a');
            siteTitleElements.forEach(el => {
                if (branding.siteName) {
                    el.textContent = branding.siteName;
                }
            });
            
            // Update site tagline
            const taglineElements = document.querySelectorAll('.wp-block-site-tagline');
            taglineElements.forEach(el => {
                if (branding.tagline) {
                    el.textContent = branding.tagline;
                }
            });
            
            // Update logo
            if (branding.logo) {
                const logoElements = document.querySelectorAll('.wp-block-site-logo img');
                logoElements.forEach(el => {
                    el.src = branding.logo;
                });
            }
        }
        
        // Auto-refresh every 30 seconds if no updates received
        let lastUpdate = Date.now();
        setInterval(() => {
            if (Date.now() - lastUpdate > 30000) {
                window.location.reload();
            }
        }, 30000);
        
        // Mark update timestamp
        window.addEventListener('message', () => {
            lastUpdate = Date.now();
        });
    })();
    </script>
</body>
</html>`
}

/**
 * Generate zone content HTML
 */
function generateZoneContent(zoneConfig: any, pageContent: any, customizations: any): string {
  const zones = zoneConfig.zones || {}
  const layouts = zoneConfig.layouts || {}
  
  // Determine layout
  const layout = pageContent?.layout || 'single-column'
  const layoutConfig = layouts[layout]
  
  if (!layoutConfig) {
    return '<div class="error">Layout not found</div>'
  }

  // Generate content for each zone
  let content = ''
  
  layoutConfig.zones.forEach((zoneId: string) => {
    const zone = zones[zoneId]
    if (!zone) return
    
    const zoneBlocks = pageContent?.zones?.[zoneId]?.blocks || zone.defaultBlocks || []
    const zoneHtml = generateZoneHTML(zoneId, zone, zoneBlocks, customizations)
    
    content += `
    <div class="zone-${zoneId}" data-zone="${zoneId}">
      ${zoneHtml}
    </div>`
  })
  
  // Wrap content based on layout
  if (layout === 'with-sidebar' || layout === 'full-features') {
    content = content.replace(
      /(<div class="zone-main".*?<\/div>)/s,
      '<div class="content-wrapper">$1'
    ).replace(
      /(<div class="zone-sidebar".*?<\/div>)/s,
      '$1</div>'
    )
  }
  
  return content
}

/**
 * Generate HTML for a specific zone
 */
function generateZoneHTML(zoneId: string, zone: any, blocks: any[], customizations: any): string {
  if (!blocks || blocks.length === 0) {
    return '<div class="empty-zone">No content</div>'
  }

  return blocks.map(block => generateBlockHTML(block, customizations)).join('\n')
}

/**
 * Generate HTML for a specific block
 */
function generateBlockHTML(block: any, customizations: any): string {
  const blockType = block.type
  const attributes = block.attributes || {}
  
  switch (blockType) {
    case 'core/heading':
      const level = attributes.level || 2
      const headingContent = attributes.content || 'Heading'
      return `<h${level} class="wp-block-heading">${headingContent}</h${level}>`
      
    case 'core/paragraph':
      const paragraphContent = attributes.content || 'This is a paragraph.'
      return `<p class="wp-block-paragraph">${paragraphContent}</p>`
      
    case 'core/site-title':
      const siteName = customizations?.branding?.siteName || 'Site Title'
      const titleLevel = attributes.level || 1
      if (titleLevel === 0) {
        return `<p class="wp-block-site-title"><a href="/">${siteName}</a></p>`
      }
      return `<h${titleLevel} class="wp-block-site-title"><a href="/">${siteName}</a></h${titleLevel}>`
      
    case 'core/site-tagline':
      const tagline = customizations?.branding?.tagline || ''
      return tagline ? `<p class="wp-block-site-tagline">${tagline}</p>` : ''
      
    case 'core/site-logo':
      const logoUrl = customizations?.branding?.logo
      if (logoUrl) {
        return `<div class="wp-block-site-logo"><a href="/"><img src="${logoUrl}" alt="Site Logo" /></a></div>`
      }
      return `<div class="wp-block-site-logo"><div class="logo-placeholder">Logo</div></div>`
      
    case 'core/navigation':
      const navItems = customizations?.navigation?.items || [
        { label: 'Home', url: '/' },
        { label: 'About', url: '/about' },
        { label: 'Contact', url: '/contact' }
      ]
      const navHtml = navItems.map((item: any) => 
        `<li><a href="${item.url}">${item.label}</a></li>`
      ).join('')
      return `<nav class="wp-block-navigation"><ul>${navHtml}</ul></nav>`
      
    case 'core/buttons':
      const innerBlocks = block.innerBlocks || []
      const buttonsHtml = innerBlocks.map((buttonBlock: any) => 
        generateBlockHTML(buttonBlock, customizations)
      ).join('')
      return `<div class="wp-block-buttons">${buttonsHtml}</div>`
      
    case 'core/button':
      const buttonText = attributes.text || 'Button'
      const buttonUrl = attributes.url || '#'
      return `<div class="wp-block-button"><a class="wp-block-button__link" href="${buttonUrl}">${buttonText}</a></div>`
      
    case 'core/separator':
      return `<hr class="wp-block-separator" />`
      
    case 'core/group':
      const groupInnerBlocks = block.innerBlocks || []
      const groupHtml = groupInnerBlocks.map((innerBlock: any) => 
        generateBlockHTML(innerBlock, customizations)
      ).join('')
      return `<div class="wp-block-group">${groupHtml}</div>`
      
    case 'core/columns':
      const columns = block.innerBlocks || []
      const columnsHtml = columns.map((column: any) => {
        const columnBlocks = column.innerBlocks || []
        const columnContent = columnBlocks.map((columnBlock: any) => 
          generateBlockHTML(columnBlock, customizations)
        ).join('')
        return `<div class="wp-block-column">${columnContent}</div>`
      }).join('')
      return `<div class="wp-block-columns">${columnsHtml}</div>`
      
    default:
      return `<div class="wp-block-unknown">Unknown block: ${blockType}</div>`
  }
}

export default router