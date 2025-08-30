/**
 * Centralized Block Registry
 * Single source of truth for all block registrations
 */

import { ComponentType } from 'react'

export interface BlockDefinition {
  name: string
  title: string
  category: 'text' | 'media' | 'layout' | 'widgets' | 'embeds'
  icon?: string
  description?: string
  keywords?: string[]
  supports?: {
    align?: boolean
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
      component: () => import('../blocks/ParagraphBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/heading',
      title: 'Heading',
      category: 'text',
      icon: 'heading',
      description: 'Introduce new sections and organize content.',
      keywords: ['title', 'subtitle', 'heading'],
      priority: 'high',
      component: () => import('../blocks/EnhancedHeadingBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/list',
      title: 'List',
      category: 'text',
      icon: 'editor-ul',
      description: 'Create ordered or unordered lists.',
      keywords: ['bullet', 'ordered', 'unordered'],
      priority: 'high',
      component: () => import('../blocks/ListBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/quote',
      title: 'Quote',
      category: 'text',
      icon: 'format-quote',
      description: 'Give quoted text visual emphasis.',
      keywords: ['blockquote', 'cite'],
      priority: 'medium',
      component: () => import('../blocks/QuoteBlock').then(m => ({ default: m.default }))
    })

    this.register({
      name: 'core/code',
      title: 'Code',
      category: 'text',
      icon: 'editor-code',
      description: 'Display code snippets with syntax highlighting.',
      keywords: ['code', 'pre'],
      priority: 'medium',
      component: () => import('../blocks/CodeBlock').then(m => ({ default: m.default }))
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
      component: () => import('../blocks/EnhancedImageBlock').then(m => ({ default: m.default }))
    })

    // Gallery and Video blocks - to be implemented
    // this.register({
    //   name: 'core/gallery',
    //   title: 'Gallery',
    //   category: 'media',
    //   icon: 'format-gallery',
    //   description: 'Display multiple images in a rich gallery.',
    //   keywords: ['images', 'photos'],
    //   priority: 'medium',
    //   component: () => import('../blocks/GalleryBlock').then(m => ({ default: m.default }))
    // })

    // this.register({
    //   name: 'core/video',
    //   title: 'Video',
    //   category: 'media',
    //   icon: 'format-video',
    //   description: 'Embed a video from your media library.',
    //   keywords: ['movie', 'film'],
    //   priority: 'low',
    //   component: () => import('../blocks/VideoBlock').then(m => ({ default: m.default }))
    // })

    // Layout blocks
    this.register({
      name: 'core/columns',
      title: 'Columns',
      category: 'layout',
      icon: 'columns',
      description: 'Display content in multiple columns.',
      keywords: ['layout', 'columns', 'grid'],
      priority: 'medium',
      component: () => import('../blocks/ColumnsBlock').then(m => ({ default: m.default }))
    })

    // Separator and Spacer blocks - to be implemented
    // this.register({
    //   name: 'core/separator',
    //   title: 'Separator',
    //   category: 'layout',
    //   icon: 'minus',
    //   description: 'Create a break between sections.',
    //   keywords: ['hr', 'divider'],
    //   priority: 'low',
    //   component: () => import('../blocks/SeparatorBlock').then(m => ({ default: m.default }))
    // })

    // this.register({
    //   name: 'core/spacer',
    //   title: 'Spacer',
    //   category: 'layout',
    //   icon: 'image-flip-vertical',
    //   description: 'Add white space between blocks.',
    //   keywords: ['space', 'gap'],
    //   priority: 'low',
    //   component: () => import('../blocks/SpacerBlock').then(m => ({ default: m.default }))
    // })

    // Widget blocks
    this.register({
      name: 'core/button',
      title: 'Button',
      category: 'widgets',
      icon: 'button',
      description: 'Prompt visitors to take action.',
      keywords: ['link', 'cta', 'call to action'],
      priority: 'high',
      component: () => import('../blocks/ButtonBlock').then(m => ({ default: m.default }))
    })

    // Social Links block - to be implemented
    // this.register({
    //   name: 'core/social-links',
    //   title: 'Social Links',
    //   category: 'widgets',
    //   icon: 'share',
    //   description: 'Display links to social media profiles.',
    //   keywords: ['social', 'facebook', 'twitter', 'instagram'],
    //   priority: 'low',
    //   component: () => import('../blocks/SocialLinksBlock').then(m => ({ default: m.default }))
    // })

    // Embed blocks - to be implemented
    // this.register({
    //   name: 'core/embed',
    //   title: 'Embed',
    //   category: 'embeds',
    //   icon: 'embed-generic',
    //   description: 'Embed content from external sources.',
    //   keywords: ['iframe', 'embed'],
    //   priority: 'low',
    //   component: () => import('../blocks/EmbedBlock').then(m => ({ default: m.default }))
    // })
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
      console.warn(`Block ${name} not found or has no component`)
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
      console.error(`Failed to load block component ${name}:`, error)
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