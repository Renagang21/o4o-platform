/**
 * 숏코드 컴포넌트 인덱스 및 등록
 */

export { default as ImageShortcode } from './ImageShortcode';
export { default as ProductGridShortcode } from './ProductGridShortcode';
export { default as HeroShortcode } from './HeroShortcode';
export { default as RecentPostsShortcode } from './RecentPostsShortcode';
export { default as ContactFormShortcode } from './ContactFormShortcode';
export { default as ImageGalleryShortcode } from './ImageGalleryShortcode';
export { default as PricingTableShortcode } from './PricingTableShortcode';
export { default as TestimonialsShortcode } from './TestimonialsShortcode';
export { default as FeatureGridShortcode } from './FeatureGridShortcode';
export { default as CallToActionShortcode } from './CallToActionShortcode';

// Shortcode 등록 함수
import { ShortcodeRenderer } from '../../lib/shortcode/renderer';
import ImageShortcode from './ImageShortcode';
import ProductGridShortcode from './ProductGridShortcode';
import HeroShortcode from './HeroShortcode';
import RecentPostsShortcode from './RecentPostsShortcode';
import ContactFormShortcode from './ContactFormShortcode';
import ImageGalleryShortcode from './ImageGalleryShortcode';
import PricingTableShortcode from './PricingTableShortcode';
import TestimonialsShortcode from './TestimonialsShortcode';
import FeatureGridShortcode from './FeatureGridShortcode';
import CallToActionShortcode from './CallToActionShortcode';

export function registerShortcodes() {
  // Image shortcode
  ShortcodeRenderer.register('image', ImageShortcode, {
    category: 'Media',
    description: 'Insert optimized images with automatic format conversion',
    icon: '🖼️',
    preview: '[Image]',
    schema: {
      required: ['id'],
      attributes: {
        id: { type: 'string', description: 'Media file ID' },
        size: { type: 'string', enum: ['thumbnail', 'small', 'medium', 'large', 'original'], default: 'medium' },
        alt: { type: 'string', description: 'Alternative text' },
        caption: { type: 'string', description: 'Image caption' },
        link: { type: 'string', description: 'Link URL' },
        target: { type: 'string', enum: ['_self', '_blank'], default: '_self' },
        lazy: { type: 'boolean', default: true },
        format: { type: 'string', enum: ['auto', 'webp', 'avif', 'jpg'], default: 'auto' }
      }
    }
  });

  // Product Grid shortcode
  ShortcodeRenderer.register('product-grid', ProductGridShortcode, {
    category: 'E-commerce',
    description: 'Display products in a grid layout',
    icon: '🛍️',
    preview: '[Product Grid]',
    schema: {
      attributes: {
        category: { type: 'string', description: 'Product category' },
        limit: { type: 'number', default: 6 },
        columns: { type: 'number', default: 3 },
        featured: { type: 'boolean', default: false },
        orderby: { type: 'string', enum: ['name', 'price', 'date'], default: 'name' },
        order: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
        show_price: { type: 'boolean', default: true },
        show_add_to_cart: { type: 'boolean', default: true },
        show_description: { type: 'boolean', default: false }
      }
    }
  });

  // Hero shortcode
  ShortcodeRenderer.register('hero', HeroShortcode, {
    category: 'Layout',
    description: 'Create hero sections with background and call-to-action',
    icon: '🎯',
    preview: '[Hero Section]',
    schema: {
      attributes: {
        title: { type: 'string', default: 'Welcome' },
        subtitle: { type: 'string' },
        bg: { type: 'string', description: 'Background image ID' },
        bg_color: { type: 'string', description: 'Background color' },
        bg_overlay: { type: 'string', default: '0.3' },
        text_color: { type: 'string', enum: ['white', 'black', 'gray'], default: 'white' },
        text_align: { type: 'string', enum: ['left', 'center', 'right'], default: 'center' },
        height: { type: 'string', enum: ['small', 'medium', 'large', 'full', 'auto'], default: 'large' },
        cta_text: { type: 'string' },
        cta_link: { type: 'string' },
        cta_style: { type: 'string', enum: ['primary', 'secondary', 'outline', 'ghost'], default: 'primary' }
      }
    }
  });

  // Recent Posts shortcode
  ShortcodeRenderer.register('recent-posts', RecentPostsShortcode, {
    category: 'Content',
    description: 'Display recent posts from the blog',
    icon: '📝',
    preview: '[Recent Posts]',
    schema: {
      attributes: {
        count: { type: 'number', default: 5 },
        category: { type: 'string' },
        type: { type: 'string', default: 'post' },
        show_excerpt: { type: 'boolean', default: true },
        show_author: { type: 'boolean', default: true },
        show_date: { type: 'boolean', default: true },
        order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
      }
    }
  });

  // Contact Form shortcode
  ShortcodeRenderer.register('contact-form', ContactFormShortcode, {
    category: 'Forms',
    description: 'Create contact forms with custom fields',
    icon: '📧',
    preview: '[Contact Form]',
    schema: {
      attributes: {
        fields: { type: 'string', default: 'name,email,message' },
        title: { type: 'string', default: 'Contact Us' },
        submit_text: { type: 'string', default: 'Send Message' },
        success_message: { type: 'string', default: 'Thank you! Your message has been sent.' },
        to_email: { type: 'string' },
        subject: { type: 'string', default: 'New Contact Form Submission' }
      }
    }
  });

  // Image Gallery shortcode
  ShortcodeRenderer.register('image-gallery', ImageGalleryShortcode, {
    category: 'Media',
    description: 'Create image galleries with lightbox',
    icon: '🖼️',
    preview: '[Image Gallery]',
    schema: {
      required: ['ids'],
      attributes: {
        ids: { type: 'string', description: 'Comma-separated image IDs' },
        columns: { type: 'number', default: 3 },
        size: { type: 'string', enum: ['thumbnail', 'small', 'medium', 'large'], default: 'medium' },
        show_captions: { type: 'boolean', default: false },
        link_to: { type: 'string', enum: ['lightbox', 'file', 'none'], default: 'lightbox' }
      }
    }
  });

  // Pricing Table shortcode
  ShortcodeRenderer.register('pricing-table', PricingTableShortcode, {
    category: 'Business',
    description: 'Display pricing plans in a table format',
    icon: '💰',
    preview: '[Pricing Table]',
    schema: {
      attributes: {
        plans: { type: 'string', default: 'basic,pro,enterprise' },
        featured: { type: 'string', default: 'pro' },
        currency: { type: 'string', default: '₩' },
        period: { type: 'string', enum: ['month', 'year'], default: 'month' }
      }
    }
  });

  // Testimonials shortcode
  ShortcodeRenderer.register('testimonials', TestimonialsShortcode, {
    category: 'Content',
    description: 'Display customer testimonials',
    icon: '💬',
    preview: '[Testimonials]',
    schema: {
      attributes: {
        count: { type: 'number', default: 3 },
        layout: { type: 'string', enum: ['grid', 'carousel'], default: 'grid' },
        show_images: { type: 'boolean', default: true }
      }
    }
  });

  // Feature Grid shortcode
  ShortcodeRenderer.register('feature-grid', FeatureGridShortcode, {
    category: 'Layout',
    description: 'Display features in a grid layout',
    icon: '⭐',
    preview: '[Feature Grid]',
    schema: {
      attributes: {
        features: { type: 'string', default: 'speed,security,scalability' },
        columns: { type: 'number', default: 3 },
        icon_style: { type: 'string', enum: ['outline', 'filled'], default: 'outline' }
      }
    }
  });

  // Call to Action shortcode
  ShortcodeRenderer.register('call-to-action', CallToActionShortcode, {
    category: 'Marketing',
    description: 'Create call-to-action buttons and sections',
    icon: '🎯',
    preview: '[Call to Action]',
    schema: {
      attributes: {
        text: { type: 'string', default: '시작하기' },
        link: { type: 'string', default: '#' },
        style: { type: 'string', enum: ['primary', 'secondary', 'success', 'warning', 'danger', 'outline', 'ghost', 'gradient'], default: 'primary' },
        size: { type: 'string', enum: ['small', 'medium', 'large', 'xl'], default: 'medium' },
        title: { type: 'string' },
        description: { type: 'string' },
        bg_color: { type: 'string' },
        text_color: { type: 'string' },
        alignment: { type: 'string', enum: ['left', 'center', 'right'], default: 'center' },
        full_width: { type: 'boolean', default: false },
        target: { type: 'string', enum: ['_self', '_blank'], default: '_self' }
      }
    }
  });

  console.log('✅ Shortcodes registered successfully');
}

// 숏코드 카테고리별 목록
export const shortcodeCategories = {
  'Media': ['image', 'image-gallery'],
  'E-commerce': ['product-grid'],
  'Layout': ['hero', 'feature-grid'],
  'Content': ['recent-posts', 'testimonials'],
  'Forms': ['contact-form'],
  'Business': ['pricing-table'],
  'Marketing': ['call-to-action']
};

// 인기 숏코드 목록
export const popularShortcodes = [
  'image',
  'hero',
  'product-grid',
  'contact-form',
  'call-to-action'
];