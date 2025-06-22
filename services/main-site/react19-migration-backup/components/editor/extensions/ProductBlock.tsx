import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ProductBlockView } from './ProductBlockView'

/**
 * 제품 블록 노드의 속성 정의
 */
export interface ProductBlockAttributes {
  name: string
  description: string
  imageUrl: string
  price: number
  currency?: string
  discountPrice?: number
  tags?: string[]
}

/**
 * 제품 블록 노드의 옵션 정의
 */
export interface ProductBlockOptions {
  HTMLAttributes: Record<string, any>
}

/**
 * 제품 블록 노드의 스키마 정의
 * - type: 'productBlock'
 * - attrs: { name, description, imageUrl, price, currency?, discountPrice?, tags? }
 * - group: 'block'
 * - atom: true
 */
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    productBlock: {
      setProductBlock: (options: ProductBlockAttributes) => ReturnType
    }
  }
}

export const ProductBlock = Node.create<ProductBlockOptions>({
  name: 'productBlock',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: element => element.getAttribute('data-name'),
        renderHTML: attributes => {
          if (!attributes.name) {
            return {}
          }
          return {
            'data-name': attributes.name,
          }
        },
      },
      description: {
        default: null,
        parseHTML: element => element.getAttribute('data-description'),
        renderHTML: attributes => {
          if (!attributes.description) {
            return {}
          }
          return {
            'data-description': attributes.description,
          }
        },
      },
      imageUrl: {
        default: null,
        parseHTML: element => element.getAttribute('data-image-url'),
        renderHTML: attributes => {
          if (!attributes.imageUrl) {
            return {}
          }
          return {
            'data-image-url': attributes.imageUrl,
          }
        },
      },
      price: {
        default: null,
        parseHTML: element => element.getAttribute('data-price'),
        renderHTML: attributes => {
          if (!attributes.price) {
            return {}
          }
          return {
            'data-price': attributes.price,
          }
        },
      },
      currency: {
        default: 'KRW',
        parseHTML: element => element.getAttribute('data-currency'),
        renderHTML: attributes => {
          if (!attributes.currency) {
            return {}
          }
          return {
            'data-currency': attributes.currency,
          }
        },
      },
      discountPrice: {
        default: null,
        parseHTML: element => element.getAttribute('data-discount-price'),
        renderHTML: attributes => {
          if (!attributes.discountPrice) {
            return {}
          }
          return {
            'data-discount-price': attributes.discountPrice,
          }
        },
      },
      tags: {
        default: [],
        parseHTML: element => {
          const tags = element.getAttribute('data-tags')
          return tags ? JSON.parse(tags) : []
        },
        renderHTML: attributes => {
          if (!attributes.tags?.length) {
            return {}
          }
          return {
            'data-tags': JSON.stringify(attributes.tags),
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-product-block]',
        getAttrs: (node) => {
          if (typeof node === 'string') return {}
          const element = node as HTMLElement
          return {
            name: element.getAttribute('data-name'),
            description: element.getAttribute('data-description'),
            imageUrl: element.getAttribute('data-image-url'),
            price: element.getAttribute('data-price'),
            currency: element.getAttribute('data-currency'),
            discountPrice: element.getAttribute('data-discount-price'),
            tags: element.getAttribute('data-tags'),
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-product-block': '',
    })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProductBlockView)
  },

  addCommands() {
    return {
      setProductBlock:
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