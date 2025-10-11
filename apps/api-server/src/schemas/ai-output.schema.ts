/**
 * JSON Schema for AI Output Validation
 * Sprint 2 - P2: JSON Schema 검증
 *
 * This schema validates the structure of AI-generated content blocks.
 * Used for frontend validation with Ajv or Zod before save/publish.
 */

export const AI_OUTPUT_SCHEMA_VERSION = '1.0.0';

/**
 * Schema Migrations
 * Sprint 3: Track breaking changes and provide migration paths
 */
export interface SchemaMigration {
  fromVersion: string;
  toVersion: string;
  date: string;
  breaking: boolean;
  changes: string[];
  migrationGuide?: string;
}

export const SCHEMA_MIGRATIONS: SchemaMigration[] = [
  // Example migration (will be used when schema is updated)
  // {
  //   fromVersion: '1.0.0',
  //   toVersion: '1.1.0',
  //   date: '2025-02-01',
  //   breaking: false,
  //   changes: [
  //     'Added support for video blocks',
  //     'Added optional "accessibility" field to image blocks'
  //   ],
  //   migrationGuide: 'No action required. New fields are optional.'
  // }
];

/**
 * Schema Deprecations
 * Sprint 3: Track deprecated fields and provide replacement guidance
 */
export interface SchemaDeprecation {
  field: string;
  deprecatedIn: string;
  removedIn: string;
  replacement?: string;
  reason: string;
}

export const SCHEMA_DEPRECATIONS: SchemaDeprecation[] = [
  // Example deprecation (will be used when schema is updated)
  // {
  //   field: 'core/image.caption',
  //   deprecatedIn: '1.1.0',
  //   removedIn: '2.0.0',
  //   replacement: 'core/image.description',
  //   reason: 'Renamed for consistency with other blocks'
  // }
];

export const AI_OUTPUT_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://neture.co.kr/schemas/ai-output-v1.json',
  title: 'AI Generated Content Output',
  description: 'Schema for validating AI-generated page content blocks',
  type: 'object',
  required: ['blocks'],
  properties: {
    blocks: {
      type: 'array',
      description: 'Array of content blocks',
      items: {
        $ref: '#/definitions/block'
      },
      minItems: 0
    }
  },
  definitions: {
    block: {
      type: 'object',
      required: ['type', 'attributes'],
      properties: {
        type: {
          type: 'string',
          description: 'Block type identifier',
          pattern: '^[a-z0-9]+/[a-z0-9-]+$',
          examples: ['core/paragraph', 'core/heading', 'core/image']
        },
        attributes: {
          type: 'object',
          description: 'Block-specific attributes',
          additionalProperties: true
        },
        innerBlocks: {
          type: 'array',
          description: 'Nested child blocks (for layout blocks)',
          items: {
            $ref: '#/definitions/block'
          }
        }
      },
      additionalProperties: false
    },
    // Core block attribute schemas
    paragraphAttributes: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Paragraph text content',
          minLength: 0,
          maxLength: 10000
        },
        align: {
          type: 'string',
          enum: ['left', 'center', 'right'],
          description: 'Text alignment'
        },
        textColor: {
          type: 'string',
          pattern: '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$',
          description: 'Text color (hex format)'
        },
        backgroundColor: {
          type: 'string',
          pattern: '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$',
          description: 'Background color (hex format)'
        }
      },
      additionalProperties: false
    },
    headingAttributes: {
      type: 'object',
      required: ['content', 'level'],
      properties: {
        content: {
          type: 'string',
          description: 'Heading text',
          minLength: 1,
          maxLength: 200
        },
        level: {
          type: 'integer',
          description: 'Heading level (1-6)',
          minimum: 1,
          maximum: 6
        },
        align: {
          type: 'string',
          enum: ['left', 'center', 'right'],
          description: 'Text alignment'
        }
      },
      additionalProperties: false
    },
    imageAttributes: {
      type: 'object',
      required: ['url', 'alt'],
      properties: {
        url: {
          type: 'string',
          format: 'uri',
          description: 'Image URL',
          pattern: '^https?://'
        },
        alt: {
          type: 'string',
          description: 'Alternative text for accessibility',
          minLength: 0,
          maxLength: 200
        },
        caption: {
          type: 'string',
          description: 'Image caption',
          maxLength: 500
        },
        width: {
          type: 'integer',
          description: 'Image width in pixels',
          minimum: 1,
          maximum: 5000
        },
        height: {
          type: 'integer',
          description: 'Image height in pixels',
          minimum: 1,
          maximum: 5000
        }
      },
      additionalProperties: false
    },
    buttonAttributes: {
      type: 'object',
      required: ['text'],
      properties: {
        text: {
          type: 'string',
          description: 'Button text',
          minLength: 1,
          maxLength: 100
        },
        url: {
          type: 'string',
          description: 'Link URL',
          pattern: '^(https?://|#|/)'
        },
        backgroundColor: {
          type: 'string',
          pattern: '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$',
          description: 'Button background color'
        },
        textColor: {
          type: 'string',
          pattern: '^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$',
          description: 'Button text color'
        },
        borderRadius: {
          type: 'number',
          description: 'Border radius in pixels',
          minimum: 0,
          maximum: 100
        }
      },
      additionalProperties: false
    },
    columnsAttributes: {
      type: 'object',
      properties: {
        columnCount: {
          type: 'integer',
          description: 'Number of columns',
          minimum: 1,
          maximum: 6,
          default: 2
        },
        verticalAlignment: {
          type: 'string',
          enum: ['top', 'center', 'bottom'],
          description: 'Vertical alignment of columns'
        }
      },
      additionalProperties: false
    },
    listAttributes: {
      type: 'object',
      required: ['items'],
      properties: {
        ordered: {
          type: 'boolean',
          description: 'Whether list is ordered (numbered)',
          default: false
        },
        items: {
          type: 'array',
          description: 'List items',
          items: {
            type: 'string',
            minLength: 1,
            maxLength: 500
          },
          minItems: 1,
          maxItems: 100
        }
      },
      additionalProperties: false
    }
  }
};

/**
 * Schema metadata for ETag and version tracking
 */
export interface AIOutputSchemaMetadata {
  schemaVersion: string;
  lastUpdated: string;
  description: string;
}

export const AI_OUTPUT_SCHEMA_METADATA: AIOutputSchemaMetadata = {
  schemaVersion: AI_OUTPUT_SCHEMA_VERSION,
  lastUpdated: new Date().toISOString(),
  description: 'JSON Schema for validating AI-generated content blocks'
};
