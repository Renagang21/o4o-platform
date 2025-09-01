import { BlockPlugin } from '@o4o/block-core';
import ParagraphBlock from './blocks/paragraph';
import HeadingBlock from './blocks/heading';
import ListBlock from './blocks/list';
import QuoteBlock from './blocks/quote';
import CodeBlock from './blocks/code';
import HtmlBlock from './blocks/html';

/**
 * Text Content Blocks Plugin
 * Essential text editing blocks for O4O Platform
 */
class TextContentBlocksPlugin implements BlockPlugin {
  id = 'text-content-blocks';
  name = 'Text Content Blocks';
  version = '1.0.0';
  description = 'Essential text editing blocks including paragraph, heading, list, quote, code, and HTML.';
  author = 'O4O Platform Team';
  license = 'MIT';
  
  // No dependencies - this is the core plugin
  dependencies = [];
  
  // All text blocks
  blocks = [
    ParagraphBlock,
    HeadingBlock,
    ListBlock,
    QuoteBlock,
    CodeBlock,
    HtmlBlock
  ];
  
  // Plugin settings
  settings = {
    enabled: true,
    autoLoad: true,
    priority: 1,
    loadStrategy: 'immediate' as const
  };
  
  /**
   * Activate the plugin
   */
  async activate(): Promise<void> {
    // Text Content Blocks Plugin activated
    
    // Load any required styles
    this.loadStyles();
    
    // Initialize block-specific features
    this.initializeBlocks();
  }
  
  /**
   * Deactivate the plugin
   */
  async deactivate(): Promise<void> {
    // Text Content Blocks Plugin deactivated
    
    // Clean up styles
    this.removeStyles();
  }
  
  /**
   * Plugin loaded hook
   */
  onLoad(): void {
    // Text Content Blocks Plugin loaded
  }
  
  /**
   * Plugin unloaded hook
   */
  onUnload(): void {
    // Text Content Blocks Plugin unloaded
  }
  
  /**
   * Get plugin settings
   */
  getSettings() {
    return this.settings;
  }
  
  /**
   * Update plugin settings
   */
  updateSettings(settings: Partial<typeof this.settings>): void {
    this.settings = { ...this.settings, ...settings };
  }
  
  /**
   * Load plugin styles
   */
  private loadStyles(): void {
    // Check if styles are already loaded
    if (document.getElementById('text-content-blocks-styles')) {
      return;
    }
    
    // Create and inject style element
    const style = document.createElement('style');
    style.id = 'text-content-blocks-styles';
    style.textContent = `
      /* Text Content Blocks Styles */
      .wp-block-paragraph {
        margin-bottom: 1em;
      }
      
      .wp-block-paragraph.has-drop-cap:first-letter {
        font-size: 3em;
        line-height: 0.8;
        float: left;
        margin: 0.1em 0.1em 0 0;
      }
      
      .wp-block-heading {
        margin-top: 1.5em;
        margin-bottom: 0.5em;
        font-weight: 600;
      }
      
      .wp-block-list {
        padding-left: 1.5em;
        margin-bottom: 1em;
      }
      
      .wp-block-quote {
        border-left: 4px solid #ddd;
        padding-left: 1em;
        margin: 1.5em 0;
        font-style: italic;
      }
      
      .wp-block-quote cite {
        display: block;
        margin-top: 0.5em;
        font-size: 0.9em;
        font-style: normal;
        text-align: right;
      }
      
      .wp-block-code {
        background: #f4f4f4;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 1em;
        overflow-x: auto;
        font-family: 'Courier New', Courier, monospace;
        font-size: 0.9em;
      }
      
      .wp-block-html {
        margin: 1em 0;
      }
      
      /* Alignment styles */
      .has-text-align-left { text-align: left; }
      .has-text-align-center { text-align: center; }
      .has-text-align-right { text-align: right; }
      
      /* Color styles */
      .has-primary-color { color: var(--wp--preset--color--primary, #007cba); }
      .has-secondary-color { color: var(--wp--preset--color--secondary, #6c757d); }
      .has-primary-background-color { background-color: var(--wp--preset--color--primary, #007cba); }
      .has-secondary-background-color { background-color: var(--wp--preset--color--secondary, #6c757d); }
      
      /* Font size styles */
      .has-small-font-size { font-size: 0.875em; }
      .has-medium-font-size { font-size: 1.125em; }
      .has-large-font-size { font-size: 1.5em; }
      .has-x-large-font-size { font-size: 2em; }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * Remove plugin styles
   */
  private removeStyles(): void {
    const style = document.getElementById('text-content-blocks-styles');
    if (style) {
      style.remove();
    }
  }
  
  /**
   * Initialize block-specific features
   */
  private initializeBlocks(): void {
    // Add any block-specific initialization here
    // For example, register format types, filters, etc.
    
    // Register keyboard shortcuts
    this.registerKeyboardShortcuts();
    
    // Add block variations if needed
    this.registerBlockVariations();
  }
  
  /**
   * Register keyboard shortcuts
   */
  private registerKeyboardShortcuts(): void {
    // Example: Ctrl+Shift+7 for numbered list
    // Example: Ctrl+Shift+8 for bullet list
    // This would integrate with WordPress keyboard shortcuts API
  }
  
  /**
   * Register block variations
   */
  private registerBlockVariations(): void {
    // Example: Large quote variation
    // Example: Code with syntax highlighting variation
  }
}

// Export the plugin instance
export default new TextContentBlocksPlugin();