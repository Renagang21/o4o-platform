/**
 * Centralized Block Registry
 * Single source of truth for all block registrations
 */

import { ComponentType } from 'react'

export interface BlockDefinition {
  name: string
  title: string
  category: 'text' | 'media' | 'design' | 'layout' | 'embed' | 'commerce' | 'advanced'
  icon?: string
  description?: string
  keywords?: string[]
  supports?: {
    align?: boolean
    color?: boolean
    spacing?: boolean
    border?: boolean
    className?: boolean
    html?: boolean
  }
  attributes?: Record<string, any>
  priority?: 'high' | 'medium' | 'low'
  component?: ComponentType<any> | (() => Promise<{ default: ComponentType<any> }>)
}

class BlockRegistry {
  private blocks: Map<string, BlockDefinition> = new Map()
  private loadedComponents: Map<string, ComponentType<any>> = new Map()

  constructor() {
    this.registerDefaultBlocks()
  }

  private registerDefaultBlocks() {
    // Text blocks
    this.register({
      name: 'core/paragraph',
      title: 'Paragraph',
      category: 'text',
      icon: 'editor-paragraph',
      description: 'Start with the basic building block of all narrative.',
      keywords: ['text', 'paragraph'],
      priority: 'high',
      component: () => import('./blocks/text/StandardParagraphBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/heading',
      title: 'Heading',
      category: 'text',
      icon: 'heading',
      description: 'Introduce new sections and organize content.',
      keywords: ['title', 'subtitle', 'heading'],
      priority: 'high',
      component: () => import('./blocks/text/StandardHeadingBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/list',
      title: 'List',
      category: 'text',
      icon: 'list',
      description: 'Create a bulleted or numbered list.',
      keywords: ['list', 'bullet', 'numbered', 'ordered', 'unordered'],
      priority: 'high',
      component: () => import('./blocks/text/StandardListBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/quote',
      title: 'Quote',
      category: 'text',
      icon: 'quote',
      description: 'Give quoted text visual emphasis. Great for testimonials.',
      keywords: ['quote', 'blockquote', 'citation', 'testimonial'],
      priority: 'medium',
      component: () => import('./blocks/text/StandardQuoteBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/code',
      title: 'Code',
      category: 'text',
      icon: 'code',
      description: 'Display code with syntax highlighting.',
      keywords: ['code', 'syntax', 'programming', 'highlight'],
      priority: 'medium',
      component: () => import('./blocks/text/StandardCodeBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/preformatted',
      title: 'Preformatted',
      category: 'text',
      icon: 'file-text',
      description: 'Add text that respects your spacing and tabs.',
      keywords: ['preformatted', 'pre', 'text', 'whitespace', 'monospace'],
      priority: 'low',
      component: () => import('./blocks/text/StandardPreformattedBlock').then(m => ({ default: m.default }))
    })

    // Media blocks
    this.register({
      name: 'core/image',
      title: 'Image',
      category: 'media',
      icon: 'format-image',
      description: 'Insert an image to make a visual statement.',
      keywords: ['img', 'photo', 'picture'],
      priority: 'high',
      component: () => import('./blocks/media/StandardImageBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/video',
      title: 'Video',
      category: 'media',
      icon: 'format-video',
      description: 'Embed a video from your media library.',
      keywords: ['movie', 'film'],
      priority: 'medium',
      component: () => import('./blocks/media/StandardVideoBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/gallery',
      title: 'Gallery',
      category: 'media',
      icon: 'layout-grid',
      description: 'Display multiple images in a gallery layout.',
      keywords: ['images', 'photos', 'gallery', 'grid', 'masonry', 'carousel'],
      priority: 'high',
      component: () => import('./blocks/media/StandardGalleryBlock').then(m => ({ default: m.default }))
    })

    // Design blocks
    this.register({
      name: 'core/button',
      title: 'Button',
      category: 'design',
      icon: 'button',
      description: 'Prompt visitors to take action.',
      keywords: ['link', 'cta', 'call to action'],
      priority: 'high',
      component: () => import('./blocks/design/StandardButtonBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/separator',
      title: 'Separator',
      category: 'design',
      icon: 'minus',
      description: 'Create a break between sections.',
      keywords: ['hr', 'divider'],
      priority: 'medium',
      component: () => import('./blocks/design/StandardSeparatorBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/group',
      title: 'Group',
      category: 'design',
      icon: 'folder',
      description: 'Gather blocks in a container.',
      keywords: ['group', 'container', 'wrapper', 'section', 'div'],
      priority: 'high',
      component: () => import('./blocks/design/StandardGroupBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/spacer',
      title: 'Spacer',
      category: 'design',
      icon: 'arrows-up-down',
      description: 'Add white space between blocks.',
      keywords: ['spacer', 'space', 'gap', 'margin', 'padding'],
      priority: 'medium',
      component: () => import('./blocks/design/StandardSpacerBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/social-share',
      title: 'Social Share',
      category: 'design',
      icon: 'share-2',
      description: 'Add social media share buttons.',
      keywords: ['share', 'social', 'facebook', 'twitter', 'kakao'],
      priority: 'medium',
      component: () => import('./blocks/design/StandardSocialShareBlock').then(m => ({ default: m.default }))
    })

    // Layout blocks
    this.register({
      name: 'core/columns',
      title: 'Columns',
      category: 'layout',
      icon: 'columns',
      description: 'Display content in multiple columns.',
      keywords: ['layout', 'columns', 'grid'],
      priority: 'medium',
      component: () => import('./blocks/layout/StandardColumnsBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/table',
      title: 'Table',
      category: 'layout',
      icon: 'table',
      description: 'Insert a table to display data in rows and columns.',
      keywords: ['table', 'data', 'rows', 'columns'],
      priority: 'medium',
      component: () => import('./blocks/layout/StandardTableBlock').then(m => ({ default: m.default }))
    })

    // Embed blocks
    this.register({
      name: 'core/youtube',
      title: 'YouTube',
      category: 'embed',
      icon: 'youtube',
      description: 'Embed a YouTube video.',
      keywords: ['youtube', 'video', 'embed', 'media'],
      priority: 'high',
      component: () => import('./blocks/embed/StandardYouTubeBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/facebook',
      title: 'Facebook',
      category: 'embed',
      icon: 'facebook',
      description: 'Embed a Facebook post, video, or page.',
      keywords: ['facebook', 'social', 'post', 'video', 'embed'],
      priority: 'medium',
      component: () => import('./blocks/embed/StandardFacebookBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/instagram',
      title: 'Instagram',
      category: 'embed',
      icon: 'instagram',
      description: 'Embed an Instagram post, reel, or IGTV.',
      keywords: ['instagram', 'social', 'post', 'reel', 'photo', 'embed'],
      priority: 'medium',
      component: () => import('./blocks/embed/StandardInstagramBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/embed',
      title: 'Embed',
      category: 'embed',
      icon: 'globe',
      description: 'Embed external content via URL or HTML.',
      keywords: ['embed', 'iframe', 'html', 'external', 'widget'],
      priority: 'low',
      component: () => import('./blocks/embed/StandardEmbedBlock').then(m => ({ default: m.default }))
    })
  }

  /**
   * Register a block
   */
  register(definition: BlockDefinition) {
    this.blocks.set(definition.name, definition)
  }

  /**
   * Get block definition
   */
  getBlock(name: string): BlockDefinition | undefined {
    return this.blocks.get(name)
  }

  /**
   * Get all blocks
   */
  getAllBlocks(): BlockDefinition[] {
    return Array.from(this.blocks.values())
  }

  /**
   * Get blocks by category
   */
  getBlocksByCategory(category: string): BlockDefinition[] {
    return this.getAllBlocks().filter(block => block.category === category)
  }

  /**
   * Get blocks by priority
   */
  getBlocksByPriority(priority: 'high' | 'medium' | 'low'): BlockDefinition[] {
    return this.getAllBlocks().filter(block => block.priority === priority)
  }

  /**
   * Load block component
   */
  async loadBlockComponent(name: string): Promise<ComponentType<any> | null> {
    // Check if already loaded
    if (this.loadedComponents.has(name)) {
      return this.loadedComponents.get(name)!
    }

    const block = this.getBlock(name)
    if (!block || !block.component) {
      return null
    }

    try {
      let component: ComponentType<any>
      
      if (typeof block.component === 'function') {
        // Dynamic import
        const module = await block.component()
        component = module.default
      } else {
        // Direct component
        component = block.component
      }

      this.loadedComponents.set(name, component)
      return component
    } catch (error) {
      return null
    }
  }

  /**
   * Load essential blocks (high priority)
   */
  async loadEssentialBlocks(): Promise<void> {
    const essentialBlocks = this.getBlocksByPriority('high')
    await Promise.all(
      essentialBlocks.map(block => this.loadBlockComponent(block.name))
    )
  }

  /**
   * Get block names for inserter
   */
  getBlockNamesForInserter(): string[] {
    return this.getAllBlocks()
      .filter(block => block.priority !== 'low') // Exclude low priority blocks from inserter
      .map(block => block.name)
  }

  /**
   * Check if block exists
   */
  hasBlock(name: string): boolean {
    return this.blocks.has(name)
  }

  /**
   * Remove a block
   */
  unregister(name: string): boolean {
    this.loadedComponents.delete(name)
    return this.blocks.delete(name)
  }
}

// Singleton instance
let registryInstance: BlockRegistry | null = null

export function getBlockRegistry(): BlockRegistry {
  if (!registryInstance) {
    registryInstance = new BlockRegistry()
  }
  return registryInstance
}

// Export default instance
export default getBlockRegistry()