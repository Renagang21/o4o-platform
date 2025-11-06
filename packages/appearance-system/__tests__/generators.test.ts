/**
 * Snapshot tests for CSS generators
 * Phase 2: Core generators (Button, Breadcrumb, ScrollToTop)
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateButtonCSS,
  generateBreadcrumbCSS,
  generateScrollToTopCSS,
  generateAllCSS,
  defaultTokens,
  type ButtonOptions,
  type BreadcrumbOptions,
  type ScrollToTopOptions,
} from '../src/index.js';

describe('CSS Generators', () => {
  describe('generateButtonCSS', () => {
    it('generates default button styles', () => {
      const css = generateButtonCSS(defaultTokens);
      // Phase 6: Legacy variables removed
      expect(css).toContain('--o4o-button-bg');
      expect(css).toContain('.wp-element-button');
      expect(css).toContain('background-color: var(--o4o-button-bg');
      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);
    });

    it('generates button with custom colors', () => {
      const options: ButtonOptions = {
        backgroundColor: '#ff0000',
        textColor: '#ffffff',
        hoverBackgroundColor: '#cc0000',
      };
      const css = generateButtonCSS(defaultTokens, options);
      expect(css).toContain('#ff0000');
      expect(css).toContain('#cc0000');
      expect(css).toContain('--button-primary-bg-hover');
    });

    it('generates outline button variant', () => {
      const options: ButtonOptions = {
        variant: 'outline',
        borderWidth: 2,
      };
      const css = generateButtonCSS(defaultTokens, options);
      expect(css).toContain('.btn-outline');
      expect(css).toContain('border:');
    });
  });

  describe('generateBreadcrumbCSS', () => {
    it('generates default breadcrumb styles', () => {
      const css = generateBreadcrumbCSS(defaultTokens);
      // Phase 6: Legacy variables removed
      expect(css).toContain('--o4o-breadcrumb-text');
      expect(css).toContain('.ast-breadcrumbs');
      expect(css).toContain('color: var(--o4o-breadcrumb-text');
      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);
    });

    it('generates breadcrumb with custom colors', () => {
      const options: BreadcrumbOptions = {
        textColor: '#333333',
        linkColor: '#0066cc',
        separatorColor: '#999999',
        fontSize: 16,
      };
      const css = generateBreadcrumbCSS(defaultTokens, options);
      expect(css).toContain('#333333');
      expect(css).toContain('#0066cc');
      expect(css).toContain('16px');
    });

    it('generates breadcrumb with custom separator', () => {
      const options: BreadcrumbOptions = {
        separator: '>',
      };
      const css = generateBreadcrumbCSS(defaultTokens, options);
      expect(css).toContain('content: ">"');
    });
  });

  describe('generateScrollToTopCSS', () => {
    it('generates default scroll-to-top styles', () => {
      const css = generateScrollToTopCSS(defaultTokens);
      // Phase 6: Legacy variables removed
      expect(css).toContain('--o4o-scroll-top-bg');
      expect(css).toContain('.ast-scroll-to-top');
      expect(css).toContain('position: fixed');
      expect(css).toContain('z-index: 999');
      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);
    });

    it('generates disabled scroll-to-top', () => {
      const options: ScrollToTopOptions = {
        enabled: false,
      };
      const css = generateScrollToTopCSS(defaultTokens, options);
      expect(css).toContain('disabled');
      expect(css.length).toBeLessThan(100);
    });

    it('generates scroll-to-top with custom position', () => {
      const options: ScrollToTopOptions = {
        position: { bottom: 50, right: 50 },
        size: 48,
        borderRadius: 24,
      };
      const css = generateScrollToTopCSS(defaultTokens, options);
      expect(css).toContain('50px');
      expect(css).toContain('48px');
      expect(css).toContain('24px');
    });

    it('generates scroll-to-top with lift hover effect', () => {
      const options: ScrollToTopOptions = {
        hoverEffect: 'lift',
      };
      const css = generateScrollToTopCSS(defaultTokens, options);
      expect(css).toContain('translateY');
    });

    it('generates scroll-to-top with fade hover effect', () => {
      const options: ScrollToTopOptions = {
        hoverEffect: 'fade',
      };
      const css = generateScrollToTopCSS(defaultTokens, options);
      expect(css).toContain('opacity: 0.8');
    });
  });

  describe('generateAllCSS', () => {
    it('combines all CSS generators', () => {
      const css = generateAllCSS(defaultTokens);
      expect(css).toContain('O4O Appearance System');
      // Phase 6: Legacy variables removed - now using --o4o-* only
      expect(css).toContain('--o4o-button-bg');
      expect(css).toContain('--o4o-breadcrumb-text');
      expect(css).toContain('--o4o-scroll-top-bg');
      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(500);
    });
  });
});
