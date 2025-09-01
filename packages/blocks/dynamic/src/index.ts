import { BlockPlugin } from '@o4o/block-core';
import CPTACFLoopBlock from './blocks/cpt-acf-loop';
import ReusableBlock from './blocks/reusable';
import SpectraFormBlock from './blocks/spectra-forms';

/**
 * Dynamic Blocks Plugin
 * Advanced functionality for developers and power users
 */
class DynamicBlocksPlugin implements BlockPlugin {
  id = 'dynamic-blocks';
  name = 'Dynamic Blocks';
  version = '1.0.0';
  description = 'Dynamic content blocks including CPT loops, reusable blocks, and forms.';
  author = 'O4O Platform Team';
  license = 'MIT';
  
  dependencies = [];
  
  blocks = [
    CPTACFLoopBlock,
    ReusableBlock,
    SpectraFormBlock
  ];
  
  settings = {
    enabled: true,
    autoLoad: false,
    priority: 4,
    loadStrategy: 'on-demand' as const
  };
  
  async activate(): Promise<void> {
    // Dynamic Blocks Plugin activated
    this.loadStyles();
    this.initializeAPIs();
  }
  
  async deactivate(): Promise<void> {
    // Dynamic Blocks Plugin deactivated
    this.removeStyles();
    this.cleanupAPIs();
  }
  
  private loadStyles(): void {
    if (document.getElementById('dynamic-blocks-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'dynamic-blocks-styles';
    style.textContent = `
      /* Dynamic Blocks Styles */
      
      /* CPT ACF Loop */
      .wp-block-cpt-acf-loop {
        margin-bottom: 2rem;
      }
      
      .cpt-loop-content .post-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
        margin: 1.5rem 0;
      }
      
      .post-item {
        padding: 1rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        transition: box-shadow 0.2s;
      }
      
      .post-item:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .post-item h3 {
        margin-top: 0;
        margin-bottom: 0.5rem;
      }
      
      .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        margin-top: 2rem;
      }
      
      .pagination button {
        padding: 0.5rem 1rem;
        background: #007cba;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .pagination button:hover {
        background: #005a87;
      }
      
      /* Reusable Block */
      .wp-block-reusable {
        margin-bottom: 1.5rem;
        position: relative;
      }
      
      .wp-block-reusable-placeholder {
        padding: 2rem;
        background: #f0f0f0;
        border: 2px dashed #ddd;
        text-align: center;
        border-radius: 4px;
      }
      
      .reusable-block-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem;
        background: #f5f5f5;
        border: 1px solid #ddd;
        border-bottom: none;
      }
      
      .reusable-block-content {
        padding: 1rem;
        border: 1px solid #ddd;
        background: white;
      }
      
      /* Spectra Form */
      .wp-block-spectra-form {
        margin-bottom: 2rem;
      }
      
      .spectra-form-preview {
        max-width: 600px;
        margin: 1rem 0;
      }
      
      .form-field {
        margin-bottom: 1rem;
      }
      
      .form-field label {
        display: block;
        margin-bottom: 0.25rem;
        font-weight: 600;
      }
      
      .form-field .required {
        color: #d63638;
        margin-left: 0.25rem;
      }
      
      .form-field input,
      .form-field textarea {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
      }
      
      .form-field textarea {
        min-height: 100px;
        resize: vertical;
      }
      
      .success-message-preview {
        padding: 1rem;
        background: #d4edda;
        border: 1px solid #c3e6cb;
        border-radius: 4px;
        color: #155724;
        margin-top: 1rem;
      }
    `;
    document.head.appendChild(style);
  }
  
  private removeStyles(): void {
    document.getElementById('dynamic-blocks-styles')?.remove();
  }
  
  private initializeAPIs(): void {
    // Initialize any required APIs or connections
    // For ACF integration, REST API setup, etc.
    // Dynamic blocks APIs initialized
  }
  
  private cleanupAPIs(): void {
    // Clean up API connections
    // Dynamic blocks APIs cleaned up
  }
}

export default new DynamicBlocksPlugin();