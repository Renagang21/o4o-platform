import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { YouTubeEmbedView } from './YouTubeEmbedView'

/**
 * YouTube 임베드 노드의 속성 정의
 */
export interface YouTubeEmbedAttributes {
  url: string
  width?: number
  height?: number
}

/**
 * YouTube 임베드 노드의 옵션 정의
 */
export interface YouTubeEmbedOptions {
  HTMLAttributes: Record<string, any>
}

/**
 * YouTube 임베드 노드의 스키마 정의
 * - type: 'youtubeEmbed'
 * - attrs: { url: string, width?: number, height?: number }
 * - group: 'block'
 * - atom: true
 */
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    youtubeEmbed: {
      setYouTubeEmbed: (options: YouTubeEmbedAttributes) => ReturnType
    }
  }
}

export const YouTubeEmbed = Node.create<YouTubeEmbedOptions>({
  name: 'youtubeEmbed',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: element => element.getAttribute('data-url'),
        renderHTML: attributes => {
          if (!attributes.url) {
            return {}
          }
          return {
            'data-url': attributes.url,
          }
        },
      },
      width: {
        default: 560,
        parseHTML: element => element.getAttribute('data-width'),
        renderHTML: attributes => {
          if (!attributes.width) {
            return {}
          }
          return {
            'data-width': attributes.width,
          }
        },
      },
      height: {
        default: 315,
        parseHTML: element => element.getAttribute('data-height'),
        renderHTML: attributes => {
          if (!attributes.height) {
            return {}
          }
          return {
            'data-height': attributes.height,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-youtube-embed]',
        getAttrs: (node) => {
          if (typeof node === 'string') return {}
          const element = node as HTMLElement
          return {
            url: element.getAttribute('data-url'),
            width: element.getAttribute('data-width'),
            height: element.getAttribute('data-height'),
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-youtube-embed': '',
    })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(YouTubeEmbedView)
  },

  addCommands() {
    return {
      setYouTubeEmbed:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
}) 