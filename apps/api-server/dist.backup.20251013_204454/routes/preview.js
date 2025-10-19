"use strict";
/**
 * Preview API Routes - Handle theme customization previews
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const validateDto_1 = require("../middleware/validateDto");
const auth_middleware_1 = require("../middleware/auth.middleware");
const connection_1 = __importDefault(require("../database/connection"));
const User_1 = require("../entities/User");
const logger_1 = __importDefault(require("../utils/logger"));
const Post_1 = require("../entities/Post");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const preview_token_service_1 = require("../services/preview-token.service");
const router = (0, express_1.Router)();
// Apply authentication to protected routes
router.use('/ws', auth_middleware_1.authenticate);
// Handle preflight OPTIONS requests for CORS
router.options('*', (req, res) => {
    // Remove X-Frame-Options to allow iframe access
    res.removeHeader('X-Frame-Options');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://admin.neture.co.kr https://neture.co.kr http://localhost:3000 http://localhost:3001 http://localhost:5173 http://localhost:5174");
    res.status(200).end();
});
/**
 * POST /api/preview/token
 * Issue preview token with jti (JWT ID) for one-time consumption
 * Sprint 2 - P1: Preview Protection
 */
router.post('/token', auth_middleware_1.authenticate, (0, express_validator_1.body)('pageId').isUUID().withMessage('Valid page ID is required'), validateDto_1.validateDto, async (req, res) => {
    var _a, _b;
    const authReq = req;
    const startTime = Date.now();
    try {
        const { pageId } = req.body;
        const userId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        // Generate preview token with jti
        const token = await preview_token_service_1.previewTokenService.generateToken(userId, pageId);
        const ttl = preview_token_service_1.previewTokenService.getTokenTTL();
        const duration = Date.now() - startTime;
        logger_1.default.info('Preview token issued', {
            userId,
            pageId,
            ttl: `${ttl}s`,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
        res.json({
            success: true,
            data: {
                token,
                expiresIn: ttl,
                pageId
            }
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        logger_1.default.error('Preview token issuance error', {
            userId: (_b = authReq.user) === null || _b === void 0 ? void 0 : _b.userId,
            error: error.message,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({
            success: false,
            error: 'Failed to issue preview token',
            message: error.message
        });
    }
});
/**
 * GET /api/preview
 * Generate theme customization preview HTML
 * Sprint 2 - P1: Token-based protection with one-time consumption
 */
router.get('/', (0, express_validator_1.query)('token').isString().withMessage('Preview token is required'), (0, express_validator_1.query)('theme').optional().isString().withMessage('Invalid theme'), (0, express_validator_1.query)('device').optional().isIn(['desktop', 'tablet', 'mobile']).withMessage('Invalid device'), validateDto_1.validateDto, async (req, res) => {
    var _a, _b;
    const startTime = Date.now();
    try {
        const { token, theme = 'twenty-four', device = 'desktop' } = req.query;
        // Verify and consume token (one-time use)
        const tokenResult = await preview_token_service_1.previewTokenService.verifyAndConsumeToken(token);
        if (!tokenResult.valid) {
            const duration = Date.now() - startTime;
            logger_1.default.warn('Preview access denied - Invalid token', {
                error: tokenResult.error,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            });
            // Return appropriate error based on token validation result
            const errorMessages = {
                TOKEN_EXPIRED: 'Preview token has expired (max 10 minutes)',
                TOKEN_CONSUMED: 'Preview token has already been used (one-time only)',
                INVALID_TOKEN: 'Invalid preview token',
                VERIFICATION_ERROR: 'Failed to verify preview token'
            };
            return res.status(403).json({
                success: false,
                error: errorMessages[tokenResult.error] || 'Access denied'
            });
        }
        const { userId, pageId } = tokenResult.payload;
        // Get repositories
        const userRepository = connection_1.default.getRepository(User_1.User);
        const postRepository = connection_1.default.getRepository(Post_1.Post);
        // Get user for customization
        const user = await userRepository.findOne({ where: { id: userId } });
        if (!user) {
            logger_1.default.warn('Preview user not found', { userId, pageId });
            return res.status(404).json({ error: 'User not found' });
        }
        // Get page content
        let pageContent = null;
        const page = await postRepository.findOne({ where: { id: pageId } });
        if (page) {
            pageContent = {
                title: page.title,
                content: page.content,
                zones: (_a = page.meta) === null || _a === void 0 ? void 0 : _a.zones,
                customizations: (_b = page.meta) === null || _b === void 0 ? void 0 : _b.themeCustomizations
            };
        }
        else {
            logger_1.default.warn('Preview page not found', { userId, pageId });
        }
        // Load theme configuration
        const themeConfigPath = path_1.default.join(process.cwd(), `apps/admin-dashboard/public/themes/${theme}`);
        let themeJson = {};
        let zoneConfig = {};
        let themeCss = '';
        try {
            // Load theme.json
            const themeJsonContent = await promises_1.default.readFile(path_1.default.join(themeConfigPath, 'theme.json'), 'utf8');
            themeJson = JSON.parse(themeJsonContent);
            // Load zones.json
            const zoneConfigContent = await promises_1.default.readFile(path_1.default.join(themeConfigPath, 'zones.json'), 'utf8');
            zoneConfig = JSON.parse(zoneConfigContent);
            // Load theme CSS
            themeCss = await promises_1.default.readFile(path_1.default.join(themeConfigPath, 'style.css'), 'utf8');
        }
        catch (error) {
            logger_1.default.error('Error loading theme files:', error);
            return res.status(500).json({ error: 'Failed to load theme configuration' });
        }
        // Generate preview HTML
        const previewHtml = generatePreviewHTML({
            user,
            theme: themeJson,
            zones: zoneConfig,
            css: themeCss,
            device,
            pageContent,
            customizations: (pageContent === null || pageContent === void 0 ? void 0 : pageContent.customizations) || null
        });
        // Set appropriate headers
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        // Sprint 2 - P1: Security headers for preview protection
        // Cache-Control: no-store prevents caching of sensitive preview content
        res.setHeader('Cache-Control', 'no-store');
        // Remove X-Frame-Options to allow iframe access
        res.removeHeader('X-Frame-Options');
        // Minimal frame-ancestors for production security
        const frameAncestors = process.env.NODE_ENV === 'production'
            ? "frame-ancestors 'self' https://admin.neture.co.kr"
            : "frame-ancestors 'self' https://admin.neture.co.kr http://localhost:3000 http://localhost:5173";
        res.setHeader('Content-Security-Policy', frameAncestors);
        // Add CORS headers for iframe access
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        const duration = Date.now() - startTime;
        logger_1.default.info('Preview rendered successfully', {
            userId,
            pageId,
            theme,
            device,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString()
        });
        res.send(previewHtml);
    }
    catch (error) {
        logger_1.default.error('Error generating preview:', error);
        res.status(500).json({ error: 'Failed to generate preview' });
    }
});
/**
 * POST /api/preview/generate
 * Generate preview URL for customization
 */
router.post('/generate', auth_middleware_1.authenticate, async (req, res) => {
    var _a;
    try {
        const { customization, device = 'desktop' } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        // Generate temporary preview token
        const previewToken = `preview-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Store customization temporarily (in production, use Redis or database)
        // For now, we'll generate a URL with parameters
        const previewUrl = `/api/preview?userId=${userId}&theme=twenty-four&device=${device}&token=${previewToken}`;
        // Add CORS headers for iframe access
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.json({ previewUrl });
    }
    catch (error) {
        logger_1.default.error('Error generating preview URL:', error);
        res.status(500).json({ error: 'Failed to generate preview URL' });
    }
});
/**
 * Generate preview HTML
 */
function generatePreviewHTML(options) {
    var _a, _b, _c, _d;
    const { user, theme, zones, css, device, pageContent, customizations } = options;
    // Apply customizations to theme colors if available
    let customizedCss = css;
    if (customizations === null || customizations === void 0 ? void 0 : customizations.colors) {
        const colors = customizations.colors;
        customizedCss = css
            .replace(/--wp--preset--color--primary: #[a-fA-F0-9]{6}/g, `--wp--preset--color--primary: ${colors.primary}`)
            .replace(/--wp--preset--color--secondary: #[a-fA-F0-9]{6}/g, `--wp--preset--color--secondary: ${colors.secondary}`)
            .replace(/--wp--preset--color--accent: #[a-fA-F0-9]{6}/g, `--wp--preset--color--accent: ${colors.accent}`)
            .replace(/--wp--preset--color--background: #[a-fA-F0-9]{6}/g, `--wp--preset--color--background: ${colors.background}`)
            .replace(/--wp--preset--color--foreground: #[a-fA-F0-9]{6}/g, `--wp--preset--color--foreground: ${colors.foreground}`);
    }
    // Generate zone content
    const zoneContent = generateZoneContent(zones, pageContent, customizations);
    // Device-specific viewport meta tag
    const viewportMeta = device === 'mobile'
        ? '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">'
        : '<meta name="viewport" content="width=device-width, initial-scale=1">';
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    ${viewportMeta}
    <title>${((_a = customizations === null || customizations === void 0 ? void 0 : customizations.branding) === null || _a === void 0 ? void 0 : _a.siteName) || (pageContent === null || pageContent === void 0 ? void 0 : pageContent.title) || 'Preview'}</title>
    
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
    ${((_b = customizations === null || customizations === void 0 ? void 0 : customizations.branding) === null || _b === void 0 ? void 0 : _b.logo) ? `
    .wp-block-site-logo img {
        content: url("${customizations.branding.logo}");
        max-height: 60px;
        width: auto;
    }
    ` : ''}
    
    .wp-block-site-title a::before {
        content: "${((_c = customizations === null || customizations === void 0 ? void 0 : customizations.branding) === null || _c === void 0 ? void 0 : _c.siteName) || 'Site Title'}";
    }
    
    .wp-block-site-tagline::before {
        content: "${((_d = customizations === null || customizations === void 0 ? void 0 : customizations.branding) === null || _d === void 0 ? void 0 : _d.tagline) || ''}";
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
</html>`;
}
/**
 * Generate zone content HTML
 */
function generateZoneContent(zoneConfig, pageContent, customizations) {
    const zones = zoneConfig.zones || {};
    const layouts = zoneConfig.layouts || {};
    // Determine layout
    const layout = (pageContent === null || pageContent === void 0 ? void 0 : pageContent.layout) || 'single-column';
    const layoutConfig = layouts[layout];
    if (!layoutConfig) {
        return '<div class="error">Layout not found</div>';
    }
    // Generate content for each zone
    let content = '';
    layoutConfig.zones.forEach((zoneId) => {
        var _a, _b;
        const zone = zones[zoneId];
        if (!zone)
            return;
        const zoneBlocks = ((_b = (_a = pageContent === null || pageContent === void 0 ? void 0 : pageContent.zones) === null || _a === void 0 ? void 0 : _a[zoneId]) === null || _b === void 0 ? void 0 : _b.blocks) || zone.defaultBlocks || [];
        const zoneHtml = generateZoneHTML(zoneId, zone, zoneBlocks, customizations);
        content += `
    <div class="zone-${zoneId}" data-zone="${zoneId}">
      ${zoneHtml}
    </div>`;
    });
    // Wrap content based on layout
    if (layout === 'with-sidebar' || layout === 'full-features') {
        content = content.replace(/(<div class="zone-main".*?<\/div>)/s, '<div class="content-wrapper">$1').replace(/(<div class="zone-sidebar".*?<\/div>)/s, '$1</div>');
    }
    return content;
}
/**
 * Generate HTML for a specific zone
 */
function generateZoneHTML(zoneId, zone, blocks, customizations) {
    if (!blocks || blocks.length === 0) {
        return '<div class="empty-zone">No content</div>';
    }
    return blocks.map(block => generateBlockHTML(block, customizations)).join('\n');
}
/**
 * Generate HTML for a specific block
 */
function generateBlockHTML(block, customizations) {
    var _a, _b, _c, _d;
    const blockType = block.type;
    const attributes = block.attributes || {};
    switch (blockType) {
        case 'core/heading':
            const level = attributes.level || 2;
            const headingContent = attributes.content || 'Heading';
            return `<h${level} class="wp-block-heading">${headingContent}</h${level}>`;
        case 'core/paragraph':
            const paragraphContent = attributes.content || 'This is a paragraph.';
            return `<p class="wp-block-paragraph">${paragraphContent}</p>`;
        case 'core/site-title':
            const siteName = ((_a = customizations === null || customizations === void 0 ? void 0 : customizations.branding) === null || _a === void 0 ? void 0 : _a.siteName) || 'Site Title';
            const titleLevel = attributes.level || 1;
            if (titleLevel === 0) {
                return `<p class="wp-block-site-title"><a href="/">${siteName}</a></p>`;
            }
            return `<h${titleLevel} class="wp-block-site-title"><a href="/">${siteName}</a></h${titleLevel}>`;
        case 'core/site-tagline':
            const tagline = ((_b = customizations === null || customizations === void 0 ? void 0 : customizations.branding) === null || _b === void 0 ? void 0 : _b.tagline) || '';
            return tagline ? `<p class="wp-block-site-tagline">${tagline}</p>` : '';
        case 'core/site-logo':
            const logoUrl = (_c = customizations === null || customizations === void 0 ? void 0 : customizations.branding) === null || _c === void 0 ? void 0 : _c.logo;
            if (logoUrl) {
                return `<div class="wp-block-site-logo"><a href="/"><img src="${logoUrl}" alt="Site Logo" /></a></div>`;
            }
            return `<div class="wp-block-site-logo"><div class="logo-placeholder">Logo</div></div>`;
        case 'core/navigation':
            const navItems = ((_d = customizations === null || customizations === void 0 ? void 0 : customizations.navigation) === null || _d === void 0 ? void 0 : _d.items) || [
                { label: 'Home', url: '/' },
                { label: 'About', url: '/about' },
                { label: 'Contact', url: '/contact' }
            ];
            const navHtml = navItems.map((item) => `<li><a href="${item.url}">${item.label}</a></li>`).join('');
            return `<nav class="wp-block-navigation"><ul>${navHtml}</ul></nav>`;
        case 'core/buttons':
            const innerBlocks = block.innerBlocks || [];
            const buttonsHtml = innerBlocks.map((buttonBlock) => generateBlockHTML(buttonBlock, customizations)).join('');
            return `<div class="wp-block-buttons">${buttonsHtml}</div>`;
        case 'core/button':
            const buttonText = attributes.text || 'Button';
            const buttonUrl = attributes.url || '#';
            return `<div class="wp-block-button"><a class="wp-block-button__link" href="${buttonUrl}">${buttonText}</a></div>`;
        case 'core/separator':
            return `<hr class="wp-block-separator" />`;
        case 'core/group':
            const groupInnerBlocks = block.innerBlocks || [];
            const groupHtml = groupInnerBlocks.map((innerBlock) => generateBlockHTML(innerBlock, customizations)).join('');
            return `<div class="wp-block-group">${groupHtml}</div>`;
        case 'core/columns':
            const columns = block.innerBlocks || [];
            const columnsHtml = columns.map((column) => {
                const columnBlocks = column.innerBlocks || [];
                const columnContent = columnBlocks.map((columnBlock) => generateBlockHTML(columnBlock, customizations)).join('');
                return `<div class="wp-block-column">${columnContent}</div>`;
            }).join('');
            return `<div class="wp-block-columns">${columnsHtml}</div>`;
        default:
            return `<div class="wp-block-unknown">Unknown block: ${blockType}</div>`;
    }
}
exports.default = router;
//# sourceMappingURL=preview.js.map