import { BlockPlugin } from '@o4o/block-core';
import { ButtonBlock, ButtonsBlock } from './blocks/buttons';
import TableBlock from './blocks/table';
import SearchBlock from './blocks/search';
import NavigationBlock from './blocks/navigation';
import SocialLinksBlock from './blocks/social-links';

/**
 * Interactive Blocks Plugin
 */
class InteractiveBlocksPlugin implements BlockPlugin {
  id = 'interactive-blocks';
  name = 'Interactive Blocks';
  version = '1.0.0';
  description = 'Interactive blocks for user engagement including buttons, tables, search, and navigation.';
  author = 'O4O Platform Team';
  license = 'MIT';
  
  dependencies = [];
  
  blocks = [
    ButtonBlock,
    ButtonsBlock,
    TableBlock,
    SearchBlock,
    NavigationBlock,
    SocialLinksBlock
  ];
  
  settings = {
    enabled: true,
    autoLoad: false,
    priority: 3,
    loadStrategy: 'on-demand' as const
  };
  
  async activate(): Promise<void> {
    // Interactive Blocks Plugin activated
    this.loadStyles();
  }
  
  async deactivate(): Promise<void> {
    // Interactive Blocks Plugin deactivated
    this.removeStyles();
  }
  
  private loadStyles(): void {
    if (document.getElementById('interactive-blocks-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'interactive-blocks-styles';
    style.textContent = `
      /* Interactive Blocks Styles */
      
      /* Buttons */
      .wp-block-buttons {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 1.5rem;
      }
      
      .wp-block-buttons.is-vertical {
        flex-direction: column;
      }
      
      .wp-block-button__link {
        display: inline-block;
        padding: 0.5rem 1rem;
        background: #007cba;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        transition: background 0.2s;
      }
      
      .wp-block-button__link:hover {
        background: #005a87;
      }
      
      .wp-block-button__link.is-style-outline {
        background: transparent;
        border: 2px solid #007cba;
        color: #007cba;
      }
      
      .wp-block-button__link.is-style-outline:hover {
        background: #007cba;
        color: white;
      }
      
      /* Table */
      .wp-block-table {
        margin-bottom: 1.5rem;
        overflow-x: auto;
      }
      
      .wp-block-table table {
        border-collapse: collapse;
        width: 100%;
      }
      
      .wp-block-table td,
      .wp-block-table th {
        border: 1px solid #ddd;
        padding: 0.5rem;
      }
      
      .wp-block-table.has-fixed-layout table {
        table-layout: fixed;
      }
      
      /* Search */
      .wp-block-search {
        margin-bottom: 1.5rem;
      }
      
      .wp-block-search__inside-wrapper {
        display: flex;
        gap: 0.5rem;
      }
      
      .wp-block-search__input {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      
      .wp-block-search__button {
        padding: 0.5rem 1rem;
        background: #007cba;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .wp-block-search__button:hover {
        background: #005a87;
      }
      
      /* Navigation */
      .wp-block-navigation__container {
        display: flex;
        gap: 1.5rem;
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .wp-block-navigation-item a {
        text-decoration: none;
        color: inherit;
      }
      
      .wp-block-navigation-item a:hover {
        text-decoration: underline;
      }
      
      /* Social Links */
      .wp-block-social-links {
        display: flex;
        gap: 0.5rem;
        list-style: none;
        padding: 0;
        margin: 0 0 1.5rem;
      }
      
      .wp-social-link {
        display: block;
      }
      
      .wp-social-link a {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: #f0f0f0;
        border-radius: 50%;
        color: #333;
        transition: all 0.2s;
      }
      
      .wp-social-link a:hover {
        background: #007cba;
        color: white;
      }
      
      .wp-social-link svg {
        width: 20px;
        height: 20px;
      }
    `;
    document.head.appendChild(style);
  }
  
  private removeStyles(): void {
    document.getElementById('interactive-blocks-styles')?.remove();
  }
}

export default new InteractiveBlocksPlugin();