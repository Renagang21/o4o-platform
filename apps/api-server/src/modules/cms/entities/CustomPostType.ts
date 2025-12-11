/**
 * Re-export from unified CustomPostType entity
 *
 * This file maintains backward compatibility for code importing from
 * modules/cms/entities/CustomPostType. The actual entity is now
 * unified in src/entities/CustomPostType.ts using cms_cpt_types table.
 */

// Re-export the unified entity
export { CustomPostType } from '../../../entities/CustomPostType.js';

// Legacy enum - kept for backward compatibility with existing services
export enum CPTStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived'
}

// Legacy interface - kept for backward compatibility
export interface CPTSchema {
  fields: Array<{
    name: string;
    type: 'text' | 'number' | 'date' | 'select' | 'file' | 'relation';
    required: boolean;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
    };
  }>;
}
