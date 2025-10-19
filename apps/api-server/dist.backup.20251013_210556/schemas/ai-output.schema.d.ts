/**
 * JSON Schema for AI Output Validation
 * Sprint 2 - P2: JSON Schema 검증
 *
 * This schema validates the structure of AI-generated content blocks.
 * Used for frontend validation with Ajv or Zod before save/publish.
 */
export declare const AI_OUTPUT_SCHEMA_VERSION = "1.0.0";
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
export declare const SCHEMA_MIGRATIONS: SchemaMigration[];
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
export declare const SCHEMA_DEPRECATIONS: SchemaDeprecation[];
export declare const AI_OUTPUT_JSON_SCHEMA: {
    $schema: string;
    $id: string;
    title: string;
    description: string;
    type: string;
    required: string[];
    properties: {
        blocks: {
            type: string;
            description: string;
            items: {
                $ref: string;
            };
            minItems: number;
        };
    };
    definitions: {
        block: {
            type: string;
            required: string[];
            properties: {
                type: {
                    type: string;
                    description: string;
                    pattern: string;
                    examples: string[];
                };
                attributes: {
                    type: string;
                    description: string;
                    additionalProperties: boolean;
                };
                innerBlocks: {
                    type: string;
                    description: string;
                    items: {
                        $ref: string;
                    };
                };
            };
            additionalProperties: boolean;
        };
        paragraphAttributes: {
            type: string;
            properties: {
                content: {
                    type: string;
                    description: string;
                    minLength: number;
                    maxLength: number;
                };
                align: {
                    type: string;
                    enum: string[];
                    description: string;
                };
                textColor: {
                    type: string;
                    pattern: string;
                    description: string;
                };
                backgroundColor: {
                    type: string;
                    pattern: string;
                    description: string;
                };
            };
            additionalProperties: boolean;
        };
        headingAttributes: {
            type: string;
            required: string[];
            properties: {
                content: {
                    type: string;
                    description: string;
                    minLength: number;
                    maxLength: number;
                };
                level: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
                align: {
                    type: string;
                    enum: string[];
                    description: string;
                };
            };
            additionalProperties: boolean;
        };
        imageAttributes: {
            type: string;
            required: string[];
            properties: {
                url: {
                    type: string;
                    format: string;
                    description: string;
                    pattern: string;
                };
                alt: {
                    type: string;
                    description: string;
                    minLength: number;
                    maxLength: number;
                };
                caption: {
                    type: string;
                    description: string;
                    maxLength: number;
                };
                width: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
                height: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
            };
            additionalProperties: boolean;
        };
        buttonAttributes: {
            type: string;
            required: string[];
            properties: {
                text: {
                    type: string;
                    description: string;
                    minLength: number;
                    maxLength: number;
                };
                url: {
                    type: string;
                    description: string;
                    pattern: string;
                };
                backgroundColor: {
                    type: string;
                    pattern: string;
                    description: string;
                };
                textColor: {
                    type: string;
                    pattern: string;
                    description: string;
                };
                borderRadius: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                };
            };
            additionalProperties: boolean;
        };
        columnsAttributes: {
            type: string;
            properties: {
                columnCount: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                verticalAlignment: {
                    type: string;
                    enum: string[];
                    description: string;
                };
            };
            additionalProperties: boolean;
        };
        listAttributes: {
            type: string;
            required: string[];
            properties: {
                ordered: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                items: {
                    type: string;
                    description: string;
                    items: {
                        type: string;
                        minLength: number;
                        maxLength: number;
                    };
                    minItems: number;
                    maxItems: number;
                };
            };
            additionalProperties: boolean;
        };
    };
};
/**
 * Schema metadata for ETag and version tracking
 */
export interface AIOutputSchemaMetadata {
    schemaVersion: string;
    lastUpdated: string;
    description: string;
}
export declare const AI_OUTPUT_SCHEMA_METADATA: AIOutputSchemaMetadata;
//# sourceMappingURL=ai-output.schema.d.ts.map