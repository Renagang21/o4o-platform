"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedDefaultBlockPatterns1738500000005 = void 0;
class SeedDefaultBlockPatterns1738500000005 {
    constructor() {
        this.name = 'SeedDefaultBlockPatterns1738500000005';
    }
    async up(queryRunner) {
        var _a;
        // Get a default user ID (system user)
        const systemUser = await queryRunner.query(`
            SELECT id FROM users WHERE email = 'admin@o4o.com' LIMIT 1
        `);
        const userId = ((_a = systemUser[0]) === null || _a === void 0 ? void 0 : _a.id) || '00000000-0000-0000-0000-000000000000';
        // Hero Patterns
        await queryRunner.query(`
            INSERT INTO block_patterns (title, slug, description, content, category, source, featured, visibility, "authorId", preview, metadata)
            VALUES 
            (
                'Hero with Call to Action',
                'hero-with-cta',
                'A hero section with heading, text, and two call-to-action buttons',
                '[{"name": "core/group", "attributes": {"align": "full", "backgroundColor": "primary", "textColor": "white", "style": {"spacing": {"padding": {"top": "100px", "bottom": "100px"}}}}, "innerBlocks": [{"name": "core/heading", "attributes": {"level": 1, "textAlign": "center", "content": "Welcome to Our Platform", "style": {"typography": {"fontSize": "48px"}}}}, {"name": "core/paragraph", "attributes": {"align": "center", "content": "Build amazing websites with our powerful block patterns", "style": {"typography": {"fontSize": "20px"}}}}, {"name": "core/buttons", "attributes": {"layout": {"type": "flex", "justifyContent": "center"}}, "innerBlocks": [{"name": "core/button", "attributes": {"text": "Get Started", "backgroundColor": "white", "textColor": "primary"}}, {"name": "core/button", "attributes": {"text": "Learn More", "className": "is-style-outline"}}]}]}]',
                'hero',
                'core',
                true,
                'public',
                '${userId}',
                '{"html": "<div class=\\"hero-preview\\">Hero Section</div>"}',
                '{"keywords": ["hero", "cta", "header"], "viewportWidth": 1200}'
            ),
            (
                'Split Hero with Image',
                'split-hero-image',
                'Hero section with text on one side and image on the other',
                '[{"name": "core/columns", "attributes": {"align": "full"}, "innerBlocks": [{"name": "core/column", "attributes": {"width": "50%", "verticalAlignment": "center"}, "innerBlocks": [{"name": "core/heading", "attributes": {"level": 1, "content": "Powerful Solutions for Modern Business"}}, {"name": "core/paragraph", "attributes": {"content": "Transform your digital presence with our innovative platform"}}, {"name": "core/buttons", "innerBlocks": [{"name": "core/button", "attributes": {"text": "Start Free Trial"}}]}]}, {"name": "core/column", "attributes": {"width": "50%"}, "innerBlocks": [{"name": "core/image", "attributes": {"url": "/placeholder-hero.jpg", "alt": "Hero Image"}}]}]}]',
                'hero',
                'core',
                true,
                'public',
                '${userId}',
                '{"html": "<div class=\\"hero-split-preview\\">Split Hero</div>"}',
                '{"keywords": ["hero", "split", "image"], "viewportWidth": 1200}'
            );
        `);
        // Header Patterns
        await queryRunner.query(`
            INSERT INTO block_patterns (title, slug, description, content, category, source, featured, visibility, "authorId", preview, metadata)
            VALUES 
            (
                'Simple Navigation Header',
                'simple-nav-header',
                'Basic header with logo and navigation menu',
                '[{"name": "core/group", "attributes": {"tagName": "header", "align": "full", "style": {"spacing": {"padding": {"top": "20px", "bottom": "20px"}}}}, "innerBlocks": [{"name": "core/group", "attributes": {"layout": {"type": "flex", "justifyContent": "space-between"}}, "innerBlocks": [{"name": "core/site-logo", "attributes": {"width": 120}}, {"name": "core/navigation", "attributes": {"overlayMenu": "mobile"}}]}]}]',
                'header',
                'core',
                true,
                'public',
                '${userId}',
                '{"html": "<header class=\\"header-preview\\">Navigation Header</header>"}',
                '{"keywords": ["header", "navigation", "menu"], "viewportWidth": 1200}'
            ),
            (
                'Header with CTA Button',
                'header-with-cta',
                'Header with logo, navigation, and call-to-action button',
                '[{"name": "core/group", "attributes": {"tagName": "header", "align": "full"}, "innerBlocks": [{"name": "core/group", "attributes": {"layout": {"type": "flex", "justifyContent": "space-between", "flexWrap": "wrap"}}, "innerBlocks": [{"name": "core/site-logo", "attributes": {"width": 140}}, {"name": "core/navigation", "attributes": {"overlayMenu": "mobile"}}, {"name": "core/button", "attributes": {"text": "Get Started", "className": "is-style-fill"}}]}]}]',
                'header',
                'core',
                true,
                'public',
                '${userId}',
                '{"html": "<header class=\\"header-cta-preview\\">Header with CTA</header>"}',
                '{"keywords": ["header", "navigation", "cta"], "viewportWidth": 1200}'
            );
        `);
        // Patterns using InnerBlocks
        await queryRunner.query(`
            INSERT INTO block_patterns (title, slug, description, content, category, source, featured, visibility, "authorId", preview, metadata)
            VALUES 
            (
                'Two Column Layout',
                'two-column-layout',
                'A responsive two-column layout with content on both sides',
                '[{"name": "o4o/columns", "attributes": {"columns": 2, "isStackedOnMobile": true, "gap": 30}, "innerBlocks": [{"name": "o4o/column", "attributes": {"width": 50}, "innerBlocks": [{"name": "core/heading", "attributes": {"level": 2, "content": "Left Column"}}, {"name": "core/paragraph", "attributes": {"content": "This is content in the left column. You can add any blocks here."}}]}, {"name": "o4o/column", "attributes": {"width": 50}, "innerBlocks": [{"name": "core/heading", "attributes": {"level": 2, "content": "Right Column"}}, {"name": "core/paragraph", "attributes": {"content": "This is content in the right column. You can add any blocks here."}}]}]}]',
                'general',
                'core',
                true,
                'public',
                '${userId}',
                '{"html": "<div class=\\"columns-preview\\">Two Columns</div>"}',
                '{"keywords": ["columns", "layout", "two-column"], "viewportWidth": 1200}'
            ),
            (
                'Hero with Cover Background',
                'hero-cover-background',
                'Full-width hero section with background image and overlay',
                '[{"name": "o4o/cover", "attributes": {"url": "/placeholder-hero.jpg", "dimRatio": 60, "minHeight": 500, "isDark": true, "hasParallax": true}, "innerBlocks": [{"name": "core/heading", "attributes": {"level": 1, "textAlign": "center", "content": "Welcome to Our Platform", "style": {"typography": {"fontSize": "48px"}, "color": {"text": "#ffffff"}}}}, {"name": "core/paragraph", "attributes": {"align": "center", "content": "Experience the power of modern web design", "style": {"typography": {"fontSize": "20px"}, "color": {"text": "#ffffff"}}}}, {"name": "core/buttons", "attributes": {"layout": {"type": "flex", "justifyContent": "center"}}, "innerBlocks": [{"name": "core/button", "attributes": {"text": "Get Started", "backgroundColor": "white", "textColor": "black"}}]}]}]',
                'hero',
                'core',
                true,
                'public',
                '${userId}',
                '{"html": "<div class=\\"cover-hero-preview\\">Cover Hero</div>"}',
                '{"keywords": ["hero", "cover", "background"], "viewportWidth": 1200}'
            ),
            (
                'Grouped Feature Box',
                'grouped-feature-box',
                'A feature box with icon, heading, and text grouped together',
                '[{"name": "o4o/group", "attributes": {"backgroundColor": "#f8f9fa", "padding": 40, "borderRadius": 8, "layout": "default"}, "innerBlocks": [{"name": "core/image", "attributes": {"width": 64, "height": 64, "align": "center"}}, {"name": "core/heading", "attributes": {"level": 3, "textAlign": "center", "content": "Feature Title"}}, {"name": "core/paragraph", "attributes": {"align": "center", "content": "Describe your amazing feature here. This grouped content can be styled as one unit."}}]}]',
                'features',
                'core',
                true,
                'public',
                '${userId}',
                '{"html": "<div class=\\"group-feature-preview\\">Feature Box</div>"}',
                '{"keywords": ["group", "feature", "box"], "viewportWidth": 400}'
            );
        `);
        // Features Patterns
        await queryRunner.query(`
            INSERT INTO block_patterns (title, slug, description, content, category, source, featured, visibility, "authorId", preview, metadata)
            VALUES 
            (
                'Three Column Features',
                'three-column-features',
                'Feature section with three columns and icons',
                '[{"name": "core/group", "attributes": {"align": "wide", "style": {"spacing": {"padding": {"top": "60px", "bottom": "60px"}}}}, "innerBlocks": [{"name": "core/heading", "attributes": {"textAlign": "center", "level": 2, "content": "Our Features"}}, {"name": "core/paragraph", "attributes": {"align": "center", "content": "Everything you need to build amazing websites"}}, {"name": "core/columns", "attributes": {"style": {"spacing": {"margin": {"top": "40px"}}}}, "innerBlocks": [{"name": "core/column", "attributes": {"style": {"spacing": {"padding": "20px"}}}, "innerBlocks": [{"name": "core/image", "attributes": {"width": 60, "height": 60, "align": "center"}}, {"name": "core/heading", "attributes": {"level": 3, "textAlign": "center", "content": "Fast Performance"}}, {"name": "core/paragraph", "attributes": {"align": "center", "content": "Lightning fast load times for better user experience"}}]}, {"name": "core/column", "attributes": {"style": {"spacing": {"padding": "20px"}}}, "innerBlocks": [{"name": "core/image", "attributes": {"width": 60, "height": 60, "align": "center"}}, {"name": "core/heading", "attributes": {"level": 3, "textAlign": "center", "content": "Responsive Design"}}, {"name": "core/paragraph", "attributes": {"align": "center", "content": "Looks great on all devices and screen sizes"}}]}, {"name": "core/column", "attributes": {"style": {"spacing": {"padding": "20px"}}}, "innerBlocks": [{"name": "core/image", "attributes": {"width": 60, "height": 60, "align": "center"}}, {"name": "core/heading", "attributes": {"level": 3, "textAlign": "center", "content": "Easy to Use"}}, {"name": "core/paragraph", "attributes": {"align": "center", "content": "Intuitive interface that anyone can master"}}]}]}]}]',
                'features',
                'core',
                true,
                'public',
                '${userId}',
                '{"html": "<div class=\\"features-preview\\">Three Features</div>"}',
                '{"keywords": ["features", "columns", "services"], "viewportWidth": 1200}'
            ),
            (
                'Feature Grid with Icons',
                'feature-grid-icons',
                'Grid layout with feature boxes and icons',
                '[{"name": "core/group", "attributes": {"align": "full", "backgroundColor": "light-gray", "style": {"spacing": {"padding": {"top": "80px", "bottom": "80px"}}}}, "innerBlocks": [{"name": "core/group", "attributes": {"layout": {"type": "constrained"}}, "innerBlocks": [{"name": "core/heading", "attributes": {"textAlign": "center", "level": 2, "content": "Why Choose Us"}}, {"name": "core/spacer", "attributes": {"height": "40px"}}, {"name": "core/group", "attributes": {"layout": {"type": "grid", "minimumColumnWidth": "300px"}}, "innerBlocks": [{"name": "core/group", "attributes": {"backgroundColor": "white", "style": {"spacing": {"padding": "30px"}, "border": {"radius": "8px"}}}, "innerBlocks": [{"name": "core/heading", "attributes": {"level": 3, "content": "24/7 Support"}}, {"name": "core/paragraph", "attributes": {"content": "Round the clock customer support"}}]}, {"name": "core/group", "attributes": {"backgroundColor": "white", "style": {"spacing": {"padding": "30px"}, "border": {"radius": "8px"}}}, "innerBlocks": [{"name": "core/heading", "attributes": {"level": 3, "content": "Secure Platform"}}, {"name": "core/paragraph", "attributes": {"content": "Enterprise-grade security for your data"}}]}, {"name": "core/group", "attributes": {"backgroundColor": "white", "style": {"spacing": {"padding": "30px"}, "border": {"radius": "8px"}}}, "innerBlocks": [{"name": "core/heading", "attributes": {"level": 3, "content": "Easy Integration"}}, {"name": "core/paragraph", "attributes": {"content": "Seamlessly integrate with your tools"}}]}, {"name": "core/group", "attributes": {"backgroundColor": "white", "style": {"spacing": {"padding": "30px"}, "border": {"radius": "8px"}}}, "innerBlocks": [{"name": "core/heading", "attributes": {"level": 3, "content": "Analytics"}}, {"name": "core/paragraph", "attributes": {"content": "Detailed insights and reporting"}}]}]}]}]}]',
                'features',
                'core',
                true,
                'public',
                '${userId}',
                '{"html": "<div class=\\"feature-grid-preview\\">Feature Grid</div>"}',
                '{"keywords": ["features", "grid", "boxes"], "viewportWidth": 1200}'
            );
        `);
        // CTA Patterns
        await queryRunner.query(`
            INSERT INTO block_patterns (title, slug, description, content, category, source, featured, visibility, "authorId", preview, metadata)
            VALUES 
            (
                'Simple Call to Action',
                'simple-cta',
                'Basic CTA section with heading and button',
                '[{"name": "core/group", "attributes": {"align": "full", "backgroundColor": "primary", "textColor": "white", "style": {"spacing": {"padding": {"top": "60px", "bottom": "60px"}}}}, "innerBlocks": [{"name": "core/heading", "attributes": {"textAlign": "center", "level": 2, "content": "Ready to Get Started?"}}, {"name": "core/paragraph", "attributes": {"align": "center", "content": "Join thousands of satisfied customers today"}}, {"name": "core/buttons", "attributes": {"layout": {"type": "flex", "justifyContent": "center"}}, "innerBlocks": [{"name": "core/button", "attributes": {"text": "Start Your Free Trial", "backgroundColor": "white", "textColor": "primary", "style": {"spacing": {"padding": {"top": "12px", "bottom": "12px", "left": "24px", "right": "24px"}}}}}]}]}]',
                'cta',
                'core',
                true,
                'public',
                '${userId}',
                '{"html": "<div class=\\"cta-preview\\">Call to Action</div>"}',
                '{"keywords": ["cta", "call to action", "conversion"], "viewportWidth": 1200}'
            ),
            (
                'CTA with Background Image',
                'cta-background-image',
                'Call to action section with background image overlay',
                '[{"name": "core/cover", "attributes": {"url": "/placeholder-bg.jpg", "dimRatio": 70, "minHeight": 400, "contentPosition": "center center", "align": "full"}, "innerBlocks": [{"name": "core/heading", "attributes": {"textAlign": "center", "level": 2, "content": "Transform Your Business Today", "textColor": "white"}}, {"name": "core/paragraph", "attributes": {"align": "center", "content": "Take the first step towards digital transformation", "textColor": "white"}}, {"name": "core/buttons", "attributes": {"layout": {"type": "flex", "justifyContent": "center"}}, "innerBlocks": [{"name": "core/button", "attributes": {"text": "Get Started Now", "className": "is-style-fill"}}, {"name": "core/button", "attributes": {"text": "Learn More", "className": "is-style-outline", "textColor": "white"}}]}]}]',
                'cta',
                'core',
                true,
                'public',
                '${userId}',
                '{"html": "<div class=\\"cta-bg-preview\\">CTA with Background</div>"}',
                '{"keywords": ["cta", "background", "overlay"], "viewportWidth": 1200}'
            );
        `);
        // Footer Patterns
        await queryRunner.query(`
            INSERT INTO block_patterns (title, slug, description, content, category, source, featured, visibility, "authorId", preview, metadata)
            VALUES 
            (
                'Simple Footer',
                'simple-footer',
                'Basic footer with copyright and links',
                '[{"name": "core/group", "attributes": {"tagName": "footer", "align": "full", "backgroundColor": "black", "textColor": "white", "style": {"spacing": {"padding": {"top": "40px", "bottom": "40px"}}}}, "innerBlocks": [{"name": "core/group", "attributes": {"layout": {"type": "flex", "justifyContent": "space-between", "flexWrap": "wrap"}}, "innerBlocks": [{"name": "core/paragraph", "attributes": {"content": "© 2024 Your Company. All rights reserved."}}, {"name": "core/navigation", "attributes": {"overlayMenu": "never", "layout": {"type": "flex"}}}]}]}]',
                'footer',
                'core',
                true,
                'public',
                '${userId}',
                '{"html": "<footer class=\\"footer-preview\\">Simple Footer</footer>"}',
                '{"keywords": ["footer", "copyright", "links"], "viewportWidth": 1200}'
            ),
            (
                'Footer with Columns',
                'footer-columns',
                'Multi-column footer with company info, links, and social media',
                '[{"name": "core/group", "attributes": {"tagName": "footer", "align": "full", "backgroundColor": "black", "textColor": "white", "style": {"spacing": {"padding": {"top": "60px", "bottom": "40px"}}}}, "innerBlocks": [{"name": "core/columns", "attributes": {"style": {"spacing": {"margin": {"bottom": "40px"}}}}, "innerBlocks": [{"name": "core/column", "innerBlocks": [{"name": "core/heading", "attributes": {"level": 3, "content": "About Us"}}, {"name": "core/paragraph", "attributes": {"content": "We are dedicated to providing the best solutions for your business needs."}}]}, {"name": "core/column", "innerBlocks": [{"name": "core/heading", "attributes": {"level": 3, "content": "Quick Links"}}, {"name": "core/list", "attributes": {"ordered": false}, "innerBlocks": [{"name": "core/list-item", "attributes": {"content": "Home"}}, {"name": "core/list-item", "attributes": {"content": "About"}}, {"name": "core/list-item", "attributes": {"content": "Services"}}, {"name": "core/list-item", "attributes": {"content": "Contact"}}]}]}, {"name": "core/column", "innerBlocks": [{"name": "core/heading", "attributes": {"level": 3, "content": "Contact"}}, {"name": "core/paragraph", "attributes": {"content": "Email: info@example.com<br>Phone: (123) 456-7890"}}]}, {"name": "core/column", "innerBlocks": [{"name": "core/heading", "attributes": {"level": 3, "content": "Follow Us"}}, {"name": "core/social-links", "attributes": {"size": "has-normal-icon-size"}}]}]}, {"name": "core/separator", "attributes": {"opacity": "css"}}, {"name": "core/paragraph", "attributes": {"align": "center", "content": "© 2024 Your Company. All rights reserved.", "style": {"spacing": {"margin": {"top": "20px"}}}}}]}]',
                'footer',
                'core',
                true,
                'public',
                '${userId}',
                '{"html": "<footer class=\\"footer-columns-preview\\">Column Footer</footer>"}',
                '{"keywords": ["footer", "columns", "social"], "viewportWidth": 1200}'
            );
        `);
        // Testimonials Patterns
        await queryRunner.query(`
            INSERT INTO block_patterns (title, slug, description, content, category, source, featured, visibility, "authorId", preview, metadata)
            VALUES 
            (
                'Testimonial Cards',
                'testimonial-cards',
                'Three testimonial cards in a row',
                '[{"name": "core/group", "attributes": {"align": "wide", "style": {"spacing": {"padding": {"top": "60px", "bottom": "60px"}}}}, "innerBlocks": [{"name": "core/heading", "attributes": {"textAlign": "center", "level": 2, "content": "What Our Customers Say"}}, {"name": "core/spacer", "attributes": {"height": "40px"}}, {"name": "core/columns", "innerBlocks": [{"name": "core/column", "innerBlocks": [{"name": "core/group", "attributes": {"backgroundColor": "light-gray", "style": {"spacing": {"padding": "30px"}, "border": {"radius": "8px"}}}, "innerBlocks": [{"name": "core/paragraph", "attributes": {"content": "\\"Amazing service and great results! Highly recommended.\\""}}, {"name": "core/paragraph", "attributes": {"content": "<strong>- John Doe</strong><br>CEO, Example Corp"}}]}]}, {"name": "core/column", "innerBlocks": [{"name": "core/group", "attributes": {"backgroundColor": "light-gray", "style": {"spacing": {"padding": "30px"}, "border": {"radius": "8px"}}}, "innerBlocks": [{"name": "core/paragraph", "attributes": {"content": "\\"The best decision we made for our business growth.\\""}}, {"name": "core/paragraph", "attributes": {"content": "<strong>- Jane Smith</strong><br>Marketing Director"}}]}]}, {"name": "core/column", "innerBlocks": [{"name": "core/group", "attributes": {"backgroundColor": "light-gray", "style": {"spacing": {"padding": "30px"}, "border": {"radius": "8px"}}}, "innerBlocks": [{"name": "core/paragraph", "attributes": {"content": "\\"Exceptional quality and outstanding support team.\\""}}, {"name": "core/paragraph", "attributes": {"content": "<strong>- Mike Johnson</strong><br>Founder, StartupXYZ"}}]}]}]}]}]',
                'testimonials',
                'core',
                true,
                'public',
                '${userId}',
                '{"html": "<div class=\\"testimonials-preview\\">Testimonials</div>"}',
                '{"keywords": ["testimonials", "reviews", "social proof"], "viewportWidth": 1200}'
            );
        `);
        // Pricing Patterns
        await queryRunner.query(`
            INSERT INTO block_patterns (title, slug, description, content, category, source, featured, visibility, "authorId", preview, metadata)
            VALUES 
            (
                'Pricing Table',
                'pricing-table',
                'Three-column pricing table with features',
                '[{"name": "core/group", "attributes": {"align": "wide", "style": {"spacing": {"padding": {"top": "60px", "bottom": "60px"}}}}, "innerBlocks": [{"name": "core/heading", "attributes": {"textAlign": "center", "level": 2, "content": "Choose Your Plan"}}, {"name": "core/paragraph", "attributes": {"align": "center", "content": "Select the perfect plan for your needs"}}, {"name": "core/spacer", "attributes": {"height": "40px"}}, {"name": "core/columns", "innerBlocks": [{"name": "core/column", "innerBlocks": [{"name": "core/group", "attributes": {"backgroundColor": "white", "style": {"border": {"width": "1px", "color": "#ddd"}, "spacing": {"padding": "40px"}}}, "innerBlocks": [{"name": "core/heading", "attributes": {"level": 3, "textAlign": "center", "content": "Basic"}}, {"name": "core/paragraph", "attributes": {"align": "center", "content": "<strong style=\\"font-size:36px\\">$9</strong>/month"}}, {"name": "core/list", "innerBlocks": [{"name": "core/list-item", "attributes": {"content": "10 Projects"}}, {"name": "core/list-item", "attributes": {"content": "Basic Support"}}, {"name": "core/list-item", "attributes": {"content": "1 User"}}]}, {"name": "core/buttons", "attributes": {"layout": {"type": "flex", "justifyContent": "center"}}, "innerBlocks": [{"name": "core/button", "attributes": {"text": "Get Started", "width": 100}}]}]}]}, {"name": "core/column", "innerBlocks": [{"name": "core/group", "attributes": {"backgroundColor": "primary", "textColor": "white", "style": {"spacing": {"padding": "40px"}}}, "innerBlocks": [{"name": "core/heading", "attributes": {"level": 3, "textAlign": "center", "content": "Pro"}}, {"name": "core/paragraph", "attributes": {"align": "center", "content": "<strong style=\\"font-size:36px\\">$29</strong>/month"}}, {"name": "core/list", "attributes": {"textColor": "white"}, "innerBlocks": [{"name": "core/list-item", "attributes": {"content": "Unlimited Projects"}}, {"name": "core/list-item", "attributes": {"content": "Priority Support"}}, {"name": "core/list-item", "attributes": {"content": "5 Users"}}]}, {"name": "core/buttons", "attributes": {"layout": {"type": "flex", "justifyContent": "center"}}, "innerBlocks": [{"name": "core/button", "attributes": {"text": "Get Started", "backgroundColor": "white", "textColor": "primary", "width": 100}}]}]}]}, {"name": "core/column", "innerBlocks": [{"name": "core/group", "attributes": {"backgroundColor": "white", "style": {"border": {"width": "1px", "color": "#ddd"}, "spacing": {"padding": "40px"}}}, "innerBlocks": [{"name": "core/heading", "attributes": {"level": 3, "textAlign": "center", "content": "Enterprise"}}, {"name": "core/paragraph", "attributes": {"align": "center", "content": "<strong style=\\"font-size:36px\\">$99</strong>/month"}}, {"name": "core/list", "innerBlocks": [{"name": "core/list-item", "attributes": {"content": "Unlimited Everything"}}, {"name": "core/list-item", "attributes": {"content": "Dedicated Support"}}, {"name": "core/list-item", "attributes": {"content": "Unlimited Users"}}]}, {"name": "core/buttons", "attributes": {"layout": {"type": "flex", "justifyContent": "center"}}, "innerBlocks": [{"name": "core/button", "attributes": {"text": "Contact Sales", "width": 100}}]}]}]}]}]}]',
                'pricing',
                'core',
                true,
                'public',
                '${userId}',
                '{"html": "<div class=\\"pricing-preview\\">Pricing Table</div>"}',
                '{"keywords": ["pricing", "plans", "table"], "viewportWidth": 1200}'
            );
        `);
        // Default block patterns seeded successfully
    }
    async down(queryRunner) {
        // Remove seeded patterns
        await queryRunner.query(`
            DELETE FROM block_patterns WHERE source = 'core'
        `);
        // Default block patterns removed successfully
    }
}
exports.SeedDefaultBlockPatterns1738500000005 = SeedDefaultBlockPatterns1738500000005;
//# sourceMappingURL=1738500000005-SeedDefaultBlockPatterns.js.map