import { BlockPlugin } from '@o4o/block-core';

// Layout blocks
import { ColumnsBlock, ColumnBlock } from './blocks/layout/columns';
import GroupBlock from './blocks/layout/group';
import SpacerBlock from './blocks/layout/spacer';
import SeparatorBlock from './blocks/layout/separator';
import CoverBlock from './blocks/layout/cover';

// Media blocks
import ImageBlock from './blocks/media/image';
import VideoBlock from './blocks/media/video';
import GalleryBlock from './blocks/media/gallery';
import AudioBlock from './blocks/media/audio';
import EmbedBlock from './blocks/media/embed';

/**
 * Layout & Media Blocks Plugin
 */
class LayoutMediaBlocksPlugin implements BlockPlugin {
  id = 'layout-media-blocks';
  name = 'Layout & Media Blocks';
  version = '1.0.0';
  description = 'Layout and media blocks for rich content creation.';
  author = 'O4O Platform Team';
  license = 'MIT';
  
  dependencies = [];
  
  blocks = [
    // Layout blocks
    ColumnsBlock,
    ColumnBlock,
    GroupBlock,
    SpacerBlock,
    SeparatorBlock,
    CoverBlock,

    // Media blocks
    ImageBlock,
    VideoBlock,
    GalleryBlock,
    AudioBlock,
    EmbedBlock
  ];
  
  settings = {
    enabled: true,
    autoLoad: false,
    priority: 2,
    loadStrategy: 'lazy' as const
  };
  
  async activate(): Promise<void> {
    // Layout & Media Blocks Plugin activated
    this.loadStyles();
  }
  
  async deactivate(): Promise<void> {
    // Layout & Media Blocks Plugin deactivated
    this.removeStyles();
  }
  
  private loadStyles(): void {
    if (document.getElementById('layout-media-blocks-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'layout-media-blocks-styles';
    style.textContent = `
      /* Layout & Media Blocks Styles */
      .wp-block-columns {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
      }
      
      .wp-block-column {
        flex: 1;
        min-width: 0;
      }
      
      .wp-block-group {
        margin-bottom: 1.5rem;
      }
      
      .wp-block-spacer {
        clear: both;
      }
      
      .wp-block-separator {
        border: none;
        border-bottom: 2px solid currentColor;
        margin: 2rem auto;
        opacity: 0.4;
      }
      
      .wp-block-image {
        margin-bottom: 1.5rem;
      }
      
      .wp-block-image img {
        max-width: 100%;
        height: auto;
      }
      
      .wp-block-video video {
        max-width: 100%;
        height: auto;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .wp-block-columns:not(.is-not-stacked-on-mobile) {
          flex-direction: column;
        }
      }
      
      /* Alignments */
      .alignleft { float: left; margin-right: 1rem; }
      .alignright { float: right; margin-left: 1rem; }
      .aligncenter { display: block; margin: 0 auto; }
      .alignwide { max-width: 1200px; margin: 0 auto; }
      .alignfull { max-width: 100%; }
    `;
    document.head.appendChild(style);
  }
  
  private removeStyles(): void {
    document.getElementById('layout-media-blocks-styles')?.remove();
  }
}

export default new LayoutMediaBlocksPlugin();