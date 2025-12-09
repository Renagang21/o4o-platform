# Step 25 Phase C-1: CMS Module Migration - Work Order

**Date Created**: 2025-12-04
**Phase**: Step 25 Phase C - CMS Module Migration
**Priority**: HIGH (Last Major Module for API Server V2)
**Estimated Duration**: 12-16 hours
**Status**: 🔴 NOT STARTED

---

## 🎯 Executive Summary

**Mission**: Migrate CMS Module (CPT/ACF/Views/Pages/PageGenerator) from Legacy structure to NextGen V2 Architecture, enabling seamless integration with NextGen Frontend, ViewRenderer, and Site Builder.

**Context**: Phase B (Commerce/Dropshipping/Settlement/Auth) is complete with Build PASS achieved. CMS is the **last major module** requiring V2 migration for Step 25 completion.

**Impact**:
- ✅ Enables NextGen Frontend ViewRenderer integration
- ✅ Unlocks Site Builder page creation functionality
- ✅ Completes API Server V2 Architecture
- ✅ Enables Multi-Site CMS features (Phase D)

---

## 📊 Current State Analysis

### Legacy CMS Architecture (as of 2025-12-04)

**Current Structure**:
```
src/
├── entities/
│   ├── CustomPostType.ts       # CPT definition entity
│   ├── CustomField.ts          # ACF field entity
│   ├── View.ts                 # View template entity
│   └── Page.ts                 # Page content entity
├── services/
│   ├── CustomPostTypeService.ts    # CPT CRUD
│   ├── CustomFieldService.ts       # ACF management
│   ├── ViewService.ts              # View rendering logic
│   ├── PageService.ts              # Page CRUD
│   └── PageGenerator.ts            # Page generation from Views
└── controllers/
    ├── cpt.controller.ts
    ├── acf.controller.ts
    ├── view.controller.ts
    └── page.controller.ts
```

**Issues**:
1. ❌ **Not modular** - Entities scattered in `/entities` (not `/modules/cms/entities`)
2. ❌ **No BaseService pattern** - Services don't extend BaseService
3. ❌ **No BaseController pattern** - Controllers don't follow V2 structure
4. ❌ **Tight coupling** - CPT/ACF/Views/Pages interdependencies unclear
5. ❌ **No NextGen integration** - ViewRenderer can't consume View JSON properly
6. ❌ **No AppStore support** - CMS doesn't work with NextGen app installation
7. ❌ **PageGenerator V1** - Uses legacy View structure, needs V2 redesign

---

## 🎯 Target V2 Architecture

### NextGen CMS Structure

**Goal Structure**:
```
apps/api-server/src/modules/cms/
├── entities/
│   ├── CustomPostType.ts       # CPT definition (V2 enhanced)
│   ├── CustomField.ts          # ACF field definition (V2 enhanced)
│   ├── View.ts                 # View template JSON (V2 with ViewRenderer schema)
│   ├── Page.ts                 # Page content (V2 with metadata)
│   └── index.ts                # Entity exports
├── services/
│   ├── CustomPostTypeService.ts    # Extends BaseService
│   ├── CustomFieldService.ts       # Extends BaseService
│   ├── ViewService.ts              # Extends BaseService
│   ├── PageService.ts              # Extends BaseService
│   ├── PageGeneratorV2.ts          # New V2 page generator
│   └── index.ts                    # Service exports
├── controllers/
│   ├── CustomPostTypeController.ts # Extends BaseController
│   ├── CustomFieldController.ts    # Extends BaseController
│   ├── ViewController.ts           # Extends BaseController
│   ├── PageController.ts           # Extends BaseController
│   └── index.ts                    # Controller exports
├── dto/
│   ├── custom-post-type.dto.ts
│   ├── custom-field.dto.ts
│   ├── view.dto.ts
│   └── page.dto.ts
├── routes/
│   └── cms.routes.ts              # Unified CMS routes
└── index.ts                       # Module exports
```

**Key V2 Features**:
1. ✅ **Modular structure** - All CMS code in `/modules/cms`
2. ✅ **BaseService pattern** - Consistent service architecture
3. ✅ **BaseController pattern** - Unified controller structure
4. ✅ **DTO layer** - Type-safe request/response objects
5. ✅ **ViewRenderer schema** - Views follow NextGen rendering spec
6. ✅ **AppStore ready** - CMS entities support app installation
7. ✅ **PageGenerator V2** - Generates pages from V2 Views

---

## 🔧 Entity Redesign Specifications

### 1. CustomPostType Entity (V2)

**Current Issues**:
- Mixed with core Product/User entities
- No clear schema definition
- No validation rules

**V2 Design**:
```typescript
// apps/api-server/src/modules/cms/entities/CustomPostType.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum CPTStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived'
}

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

@Entity('custom_post_types')
@Index(['slug'], { unique: true })
@Index(['status'])
export class CustomPostType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string; // e.g., 'blog', 'portfolio', 'testimonial'

  @Column({ type: 'varchar', length: 255 })
  name: string; // e.g., 'Blog Posts'

  @Column({ type: 'varchar', length: 50 })
  icon: string; // e.g., 'article', 'camera', 'star'

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb' })
  schema: CPTSchema; // Field definitions

  @Column({ type: 'enum', enum: CPTStatus, default: CPTStatus.DRAFT })
  status: CPTStatus;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean; // Can be used in public pages

  @Column({ type: 'boolean', default: false })
  isHierarchical: boolean; // Supports parent/child posts

  @Column({ type: 'simple-array', nullable: true })
  supportedFeatures?: string[]; // ['comments', 'revisions', 'featured_image']

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper Methods
  isActive(): boolean {
    return this.status === CPTStatus.ACTIVE;
  }

  validateField(fieldName: string, value: any): boolean {
    const field = this.schema.fields.find(f => f.name === fieldName);
    if (!field) return false;

    if (field.required && (value === null || value === undefined)) return false;

    // Add more validation logic
    return true;
  }
}
```

### 2. CustomField Entity (ACF V2)

**Current Issues**:
- No field grouping
- No conditional logic
- No UI positioning

**V2 Design**:
```typescript
// apps/api-server/src/modules/cms/entities/CustomField.ts

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { CustomPostType } from './CustomPostType.js';

export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  EMAIL = 'email',
  URL = 'url',
  DATE = 'date',
  DATETIME = 'datetime',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  FILE = 'file',
  IMAGE = 'image',
  WYSIWYG = 'wysiwyg',
  RELATION = 'relation', // Link to other CPT posts
  REPEATER = 'repeater',
  GROUP = 'group'
}

export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  allowedTypes?: string[]; // For file/image fields
  maxFileSize?: number; // In bytes
}

export interface FieldConditional {
  field: string; // Field name to check
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

@Entity('custom_fields')
@Index(['postTypeId'])
@Index(['key'], { unique: true })
export class CustomField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  postTypeId: string;

  @ManyToOne('CustomPostType', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postTypeId' })
  postType: CustomPostType;

  @Column({ type: 'varchar', length: 100, unique: true })
  key: string; // e.g., 'blog_author', 'portfolio_client'

  @Column({ type: 'varchar', length: 255 })
  label: string; // e.g., 'Author Name', 'Client'

  @Column({ type: 'enum', enum: FieldType })
  type: FieldType;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  placeholder?: string;

  @Column({ type: 'text', nullable: true })
  defaultValue?: string;

  @Column({ type: 'jsonb', nullable: true })
  validation?: FieldValidation;

  @Column({ type: 'jsonb', nullable: true })
  options?: Record<string, any>; // For select, radio, etc.

  @Column({ type: 'jsonb', nullable: true })
  conditional?: FieldConditional[]; // Show field only if conditions met

  @Column({ type: 'integer', default: 0 })
  order: number; // Display order in form

  @Column({ type: 'varchar', length: 50, nullable: true })
  group?: string; // Group fields together (e.g., 'Contact Info')

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper Methods
  validate(value: any): { valid: boolean; error?: string } {
    if (this.validation?.required && !value) {
      return { valid: false, error: `${this.label} is required` };
    }

    if (this.type === FieldType.EMAIL && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { valid: false, error: 'Invalid email format' };
      }
    }

    // Add more validation logic
    return { valid: true };
  }

  checkConditional(fieldValues: Record<string, any>): boolean {
    if (!this.conditional || this.conditional.length === 0) return true;

    return this.conditional.every(cond => {
      const fieldValue = fieldValues[cond.field];

      switch (cond.operator) {
        case 'equals':
          return fieldValue === cond.value;
        case 'not_equals':
          return fieldValue !== cond.value;
        case 'contains':
          return String(fieldValue).includes(cond.value);
        case 'greater_than':
          return Number(fieldValue) > Number(cond.value);
        case 'less_than':
          return Number(fieldValue) < Number(cond.value);
        default:
          return true;
      }
    });
  }
}
```

### 3. View Entity (V2 with ViewRenderer Schema)

**Current Issues**:
- JSON structure not compatible with NextGen ViewRenderer
- No component registry
- No theme support

**V2 Design**:
```typescript
// apps/api-server/src/modules/cms/entities/View.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum ViewType {
  PAGE = 'page',
  SECTION = 'section',
  COMPONENT = 'component',
  LAYOUT = 'layout'
}

export enum ViewStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived'
}

// ViewRenderer-compatible schema
export interface ViewSchema {
  version: string; // e.g., '2.0'
  type: ViewType;

  // Component tree
  components: Array<{
    id: string;
    type: string; // e.g., 'Hero', 'ProductGrid', 'Testimonials'
    props: Record<string, any>;
    children?: Array<any>; // Nested components
    slots?: Record<string, Array<any>>; // Named slots
  }>;

  // Data bindings
  bindings?: Array<{
    source: 'cpt' | 'api' | 'store' | 'static';
    target: string; // Component prop path
    query?: Record<string, any>;
  }>;

  // Styles
  styles?: {
    theme?: string; // Theme name
    customCSS?: string;
    variables?: Record<string, string>; // CSS variables
  };

  // SEO
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
}

@Entity('views')
@Index(['slug'], { unique: true })
@Index(['type'])
@Index(['status'])
export class View {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string; // e.g., 'blog-list', 'product-detail'

  @Column({ type: 'varchar', length: 255 })
  name: string; // e.g., 'Blog List View'

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ViewType })
  type: ViewType;

  @Column({ type: 'enum', enum: ViewStatus, default: ViewStatus.DRAFT })
  status: ViewStatus;

  @Column({ type: 'jsonb' })
  schema: ViewSchema; // ViewRenderer-compatible JSON

  @Column({ type: 'varchar', length: 100, nullable: true })
  postTypeSlug?: string; // Associated CPT (e.g., 'blog')

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[]; // Searchable tags

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper Methods
  isActive(): boolean {
    return this.status === ViewStatus.ACTIVE;
  }

  isCompatibleWithViewRenderer(): boolean {
    return this.schema.version === '2.0' && this.schema.components.length > 0;
  }

  getComponentById(componentId: string): any {
    const findInTree = (components: any[]): any => {
      for (const comp of components) {
        if (comp.id === componentId) return comp;
        if (comp.children) {
          const found = findInTree(comp.children);
          if (found) return found;
        }
        if (comp.slots) {
          for (const slotKey in comp.slots) {
            const found = findInTree(comp.slots[slotKey]);
            if (found) return found;
          }
        }
      }
      return null;
    };

    return findInTree(this.schema.components);
  }
}
```

### 4. Page Entity (V2)

**Current Issues**:
- No versioning
- No draft/publish workflow
- No multi-site support

**V2 Design**:
```typescript
// apps/api-server/src/modules/cms/entities/Page.ts

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import type { View } from './View.js';

export enum PageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  SCHEDULED = 'scheduled',
  ARCHIVED = 'archived'
}

export interface PageVersion {
  version: number;
  content: Record<string, any>;
  updatedBy: string;
  updatedAt: Date;
}

@Entity('pages')
@Index(['slug'], { unique: true })
@Index(['status'])
@Index(['publishedAt'])
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string; // URL path (e.g., 'about-us', 'contact')

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'uuid', nullable: true })
  viewId?: string; // Associated View template

  @ManyToOne('View', { nullable: true })
  @JoinColumn({ name: 'viewId' })
  view?: View;

  @Column({ type: 'jsonb' })
  content: Record<string, any>; // Page-specific data (fills View bindings)

  @Column({ type: 'enum', enum: PageStatus, default: PageStatus.DRAFT })
  status: PageStatus;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt?: Date; // For scheduled publishing

  @Column({ type: 'jsonb', nullable: true })
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
    noIndex?: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  versions?: PageVersion[]; // Version history

  @Column({ type: 'integer', default: 1 })
  currentVersion: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  siteId?: string; // Multi-site support

  @Column({ type: 'simple-array', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper Methods
  isPublished(): boolean {
    return this.status === PageStatus.PUBLISHED &&
           (!this.publishedAt || this.publishedAt <= new Date());
  }

  publish(publishedBy: string): void {
    this.status = PageStatus.PUBLISHED;
    this.publishedAt = new Date();

    // Save current version
    if (!this.versions) this.versions = [];
    this.versions.push({
      version: this.currentVersion,
      content: this.content,
      updatedBy: publishedBy,
      updatedAt: new Date()
    });
  }

  schedule(scheduledAt: Date): void {
    this.status = PageStatus.SCHEDULED;
    this.scheduledAt = scheduledAt;
  }

  revertToVersion(versionNumber: number): boolean {
    const version = this.versions?.find(v => v.version === versionNumber);
    if (!version) return false;

    this.content = version.content;
    this.currentVersion = versionNumber;
    return true;
  }
}
```

---

## 📝 Service Migration Strategy

### Pattern: Extend BaseService

All CMS services will follow the BaseService pattern established in Phase B.

### 1. CustomPostTypeService (V2)

**File**: `apps/api-server/src/modules/cms/services/CustomPostTypeService.ts`

**Structure**:
```typescript
import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { CustomPostType, CPTStatus } from '../entities/CustomPostType.js';
import logger from '../../../utils/logger.js';

export interface CreateCPTRequest {
  slug: string;
  name: string;
  icon: string;
  description?: string;
  schema: any;
  isPublic?: boolean;
  isHierarchical?: boolean;
  supportedFeatures?: string[];
}

export interface UpdateCPTRequest extends Partial<CreateCPTRequest> {
  status?: CPTStatus;
}

export interface CPTFilters {
  status?: CPTStatus;
  isPublic?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export class CustomPostTypeService extends BaseService<CustomPostType> {
  private static instance: CustomPostTypeService;
  private cptRepository: Repository<CustomPostType>;

  constructor() {
    super();
    this.cptRepository = AppDataSource.getRepository(CustomPostType);
  }

  static getInstance(): CustomPostTypeService {
    if (!CustomPostTypeService.instance) {
      CustomPostTypeService.instance = new CustomPostTypeService();
    }
    return CustomPostTypeService.instance;
  }

  // CRUD Operations
  async createCPT(data: CreateCPTRequest): Promise<CustomPostType> {
    // Validate slug uniqueness
    const existing = await this.cptRepository.findOne({ where: { slug: data.slug } });
    if (existing) {
      throw new Error(`CPT with slug '${data.slug}' already exists`);
    }

    const cpt = this.cptRepository.create({
      ...data,
      status: CPTStatus.DRAFT
    });

    const saved = await this.cptRepository.save(cpt);

    logger.info(`[CMS] CustomPostType created: ${saved.slug}`, { id: saved.id });

    return saved;
  }

  async getCPT(id: string): Promise<CustomPostType | null> {
    return this.cptRepository.findOne({ where: { id } });
  }

  async getCPTBySlug(slug: string): Promise<CustomPostType | null> {
    return this.cptRepository.findOne({ where: { slug } });
  }

  async listCPTs(filters: CPTFilters = {}): Promise<{ cpts: CustomPostType[]; total: number }> {
    const { status, isPublic, search, page = 1, limit = 20 } = filters;

    const query = this.cptRepository.createQueryBuilder('cpt');

    if (status) {
      query.andWhere('cpt.status = :status', { status });
    }

    if (isPublic !== undefined) {
      query.andWhere('cpt.isPublic = :isPublic', { isPublic });
    }

    if (search) {
      query.andWhere('(cpt.name ILIKE :search OR cpt.description ILIKE :search)', {
        search: `%${search}%`
      });
    }

    query
      .orderBy('cpt.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [cpts, total] = await query.getManyAndCount();

    return { cpts, total };
  }

  async updateCPT(id: string, data: UpdateCPTRequest): Promise<CustomPostType> {
    const cpt = await this.getCPT(id);
    if (!cpt) {
      throw new Error(`CPT not found: ${id}`);
    }

    // Validate slug uniqueness if changed
    if (data.slug && data.slug !== cpt.slug) {
      const existing = await this.cptRepository.findOne({ where: { slug: data.slug } });
      if (existing) {
        throw new Error(`CPT with slug '${data.slug}' already exists`);
      }
    }

    Object.assign(cpt, data);
    const updated = await this.cptRepository.save(cpt);

    logger.info(`[CMS] CustomPostType updated: ${updated.slug}`, { id: updated.id });

    return updated;
  }

  async deleteCPT(id: string): Promise<boolean> {
    const result = await this.cptRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async activateCPT(id: string): Promise<CustomPostType> {
    return this.updateCPT(id, { status: CPTStatus.ACTIVE });
  }

  async archiveCPT(id: string): Promise<CustomPostType> {
    return this.updateCPT(id, { status: CPTStatus.ARCHIVED });
  }

  // Helper methods for Posts using this CPT
  async getPostCount(cptId: string): Promise<number> {
    // TODO: Query Post entity when implemented
    return 0;
  }
}
```

### 2. CustomFieldService (V2)

**File**: `apps/api-server/src/modules/cms/services/CustomFieldService.ts`

**Key Methods**:
- `createField(postTypeId, data)` - Create ACF field
- `getFieldsForCPT(postTypeId)` - Get all fields for a CPT
- `updateField(id, data)` - Update field definition
- `deleteField(id)` - Delete field
- `reorderFields(postTypeId, fieldIds)` - Change field order
- `validateFieldValue(fieldId, value)` - Validate user input

### 3. ViewService (V2)

**File**: `apps/api-server/src/modules/cms/services/ViewService.ts`

**Key Methods**:
- `createView(data)` - Create View template
- `getView(id)` - Get View by ID
- `getViewBySlug(slug)` - Get View by slug
- `updateView(id, data)` - Update View
- `deleteView(id)` - Delete View
- `activateView(id)` - Set View to ACTIVE
- `validateViewSchema(schema)` - Validate ViewRenderer compatibility
- `getComponentsInView(viewId)` - Extract all components from View
- `cloneView(viewId, newSlug)` - Duplicate View

### 4. PageService (V2)

**File**: `apps/api-server/src/modules/cms/services/PageService.ts`

**Key Methods**:
- `createPage(data)` - Create Page
- `getPage(id)` - Get Page with View relation
- `getPageBySlug(slug)` - Get Page by slug
- `updatePage(id, data)` - Update Page
- `deletePage(id)` - Delete Page
- `publishPage(id, publishedBy)` - Publish Page
- `schedulePage(id, scheduledAt)` - Schedule Page
- `draftPage(id)` - Move Page to DRAFT
- `getVersionHistory(pageId)` - Get all versions
- `revertToVersion(pageId, versionNumber)` - Rollback to version
- `renderPage(slug)` - Get Page + View + data for frontend

### 5. PageGeneratorV2 Service

**File**: `apps/api-server/src/modules/cms/services/PageGeneratorV2.ts`

**Purpose**: Generate Page entities from View templates and CPT data

**Key Methods**:
```typescript
export interface GeneratePageOptions {
  viewSlug: string;
  postTypeSlug?: string;
  slug: string;
  title: string;
  dataBindings?: Record<string, any>;
  siteId?: string;
}

export class PageGeneratorV2 {
  async generatePage(options: GeneratePageOptions): Promise<Page> {
    // 1. Get View template
    const view = await viewService.getViewBySlug(options.viewSlug);
    if (!view) throw new Error('View not found');

    // 2. Validate View is ViewRenderer-compatible
    if (!view.isCompatibleWithViewRenderer()) {
      throw new Error('View is not V2 compatible');
    }

    // 3. Prepare content data
    const content = {
      ...options.dataBindings,
      viewId: view.id,
      generatedAt: new Date().toISOString()
    };

    // 4. Create Page
    const page = await pageService.createPage({
      slug: options.slug,
      title: options.title,
      viewId: view.id,
      content,
      siteId: options.siteId,
      status: PageStatus.DRAFT
    });

    logger.info(`[PageGeneratorV2] Page generated: ${page.slug}`, {
      pageId: page.id,
      viewSlug: options.viewSlug
    });

    return page;
  }

  async generatePagesFromCPT(cptSlug: string, viewSlug: string): Promise<Page[]> {
    // Generate individual pages for each CPT post
    // Used for blog posts, products, etc.
    const cpt = await cptService.getCPTBySlug(cptSlug);
    if (!cpt) throw new Error('CPT not found');

    // TODO: Get all posts for this CPT and generate pages
    // Implementation depends on Post entity (not yet created)

    return [];
  }

  async updatePageFromView(pageId: string): Promise<Page> {
    // Sync Page with latest View changes
    const page = await pageService.getPage(pageId);
    if (!page || !page.viewId) throw new Error('Page or View not found');

    const view = await viewService.getView(page.viewId);
    if (!view) throw new Error('View not found');

    // Update Page content with new View schema
    page.content = {
      ...page.content,
      viewSchema: view.schema,
      lastSyncedAt: new Date().toISOString()
    };

    return pageService.updatePage(pageId, { content: page.content });
  }
}
```

---

## 🎨 Controller Migration

### Pattern: Extend BaseController

All CMS controllers will follow the BaseController pattern.

### Example: CustomPostTypeController

**File**: `apps/api-server/src/modules/cms/controllers/CustomPostTypeController.ts`

```typescript
import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { CustomPostTypeService } from '../services/CustomPostTypeService.js';
import logger from '../../../utils/logger.js';

export class CustomPostTypeController extends BaseController {
  static async createCPT(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const service = CustomPostTypeService.getInstance();

      const cpt = await service.createCPT(data);

      return BaseController.created(res, { cpt }, 'Custom Post Type created successfully');
    } catch (error: any) {
      logger.error('[CustomPostTypeController.createCPT] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getCPT(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = CustomPostTypeService.getInstance();

      const cpt = await service.getCPT(id);

      if (!cpt) {
        return BaseController.notFound(res, 'Custom Post Type not found');
      }

      return BaseController.ok(res, { cpt });
    } catch (error: any) {
      logger.error('[CustomPostTypeController.getCPT] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listCPTs(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = CustomPostTypeService.getInstance();

      const { cpts, total } = await service.listCPTs(filters);

      return BaseController.okPaginated(res, cpts, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        totalPages: Math.ceil(total / (Number(filters.limit) || 20))
      });
    } catch (error: any) {
      logger.error('[CustomPostTypeController.listCPTs] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateCPT(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const service = CustomPostTypeService.getInstance();

      const cpt = await service.updateCPT(id, data);

      return BaseController.ok(res, { cpt }, 'Custom Post Type updated successfully');
    } catch (error: any) {
      logger.error('[CustomPostTypeController.updateCPT] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async deleteCPT(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = CustomPostTypeService.getInstance();

      const deleted = await service.deleteCPT(id);

      if (!deleted) {
        return BaseController.notFound(res, 'Custom Post Type not found');
      }

      return BaseController.ok(res, {}, 'Custom Post Type deleted successfully');
    } catch (error: any) {
      logger.error('[CustomPostTypeController.deleteCPT] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async activateCPT(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = CustomPostTypeService.getInstance();

      const cpt = await service.activateCPT(id);

      return BaseController.ok(res, { cpt }, 'Custom Post Type activated');
    } catch (error: any) {
      logger.error('[CustomPostTypeController.activateCPT] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
```

**Similar Controllers**:
- CustomFieldController
- ViewController
- PageController

---

## 🛣️ Routes Configuration

### Unified CMS Routes

**File**: `apps/api-server/src/modules/cms/routes/cms.routes.ts`

```typescript
import { Router } from 'express';
import {
  CustomPostTypeController,
  CustomFieldController,
  ViewController,
  PageController
} from '../controllers/index.js';
import { requireAuth, requireAdmin } from '../../../common/middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';

const router = Router();

// ========================================
// CUSTOM POST TYPE ROUTES
// ========================================

// POST /api/v1/cms/cpts - Create CPT (Admin)
router.post('/cpts', requireAdmin, asyncHandler(CustomPostTypeController.createCPT));

// GET /api/v1/cms/cpts - List CPTs
router.get('/cpts', requireAuth, asyncHandler(CustomPostTypeController.listCPTs));

// GET /api/v1/cms/cpts/:id - Get CPT by ID
router.get('/cpts/:id', requireAuth, asyncHandler(CustomPostTypeController.getCPT));

// PUT /api/v1/cms/cpts/:id - Update CPT (Admin)
router.put('/cpts/:id', requireAdmin, asyncHandler(CustomPostTypeController.updateCPT));

// DELETE /api/v1/cms/cpts/:id - Delete CPT (Admin)
router.delete('/cpts/:id', requireAdmin, asyncHandler(CustomPostTypeController.deleteCPT));

// POST /api/v1/cms/cpts/:id/activate - Activate CPT (Admin)
router.post('/cpts/:id/activate', requireAdmin, asyncHandler(CustomPostTypeController.activateCPT));

// ========================================
// CUSTOM FIELD (ACF) ROUTES
// ========================================

// POST /api/v1/cms/fields - Create Field (Admin)
router.post('/fields', requireAdmin, asyncHandler(CustomFieldController.createField));

// GET /api/v1/cms/fields - List Fields (filtered by CPT)
router.get('/fields', requireAuth, asyncHandler(CustomFieldController.listFields));

// GET /api/v1/cms/fields/:id - Get Field by ID
router.get('/fields/:id', requireAuth, asyncHandler(CustomFieldController.getField));

// PUT /api/v1/cms/fields/:id - Update Field (Admin)
router.put('/fields/:id', requireAdmin, asyncHandler(CustomFieldController.updateField));

// DELETE /api/v1/cms/fields/:id - Delete Field (Admin)
router.delete('/fields/:id', requireAdmin, asyncHandler(CustomFieldController.deleteField));

// ========================================
// VIEW ROUTES
// ========================================

// POST /api/v1/cms/views - Create View (Admin)
router.post('/views', requireAdmin, asyncHandler(ViewController.createView));

// GET /api/v1/cms/views - List Views
router.get('/views', requireAuth, asyncHandler(ViewController.listViews));

// GET /api/v1/cms/views/:id - Get View by ID
router.get('/views/:id', requireAuth, asyncHandler(ViewController.getView));

// PUT /api/v1/cms/views/:id - Update View (Admin)
router.put('/views/:id', requireAdmin, asyncHandler(ViewController.updateView));

// DELETE /api/v1/cms/views/:id - Delete View (Admin)
router.delete('/views/:id', requireAdmin, asyncHandler(ViewController.deleteView));

// POST /api/v1/cms/views/:id/activate - Activate View (Admin)
router.post('/views/:id/activate', requireAdmin, asyncHandler(ViewController.activateView));

// POST /api/v1/cms/views/:id/clone - Clone View (Admin)
router.post('/views/:id/clone', requireAdmin, asyncHandler(ViewController.cloneView));

// ========================================
// PAGE ROUTES
// ========================================

// POST /api/v1/cms/pages - Create Page (Admin)
router.post('/pages', requireAdmin, asyncHandler(PageController.createPage));

// GET /api/v1/cms/pages - List Pages
router.get('/pages', requireAuth, asyncHandler(PageController.listPages));

// GET /api/v1/cms/pages/:id - Get Page by ID
router.get('/pages/:id', requireAuth, asyncHandler(PageController.getPage));

// PUT /api/v1/cms/pages/:id - Update Page (Admin)
router.put('/pages/:id', requireAdmin, asyncHandler(PageController.updatePage));

// DELETE /api/v1/cms/pages/:id - Delete Page (Admin)
router.delete('/pages/:id', requireAdmin, asyncHandler(PageController.deletePage));

// POST /api/v1/cms/pages/:id/publish - Publish Page (Admin)
router.post('/pages/:id/publish', requireAdmin, asyncHandler(PageController.publishPage));

// POST /api/v1/cms/pages/:id/schedule - Schedule Page (Admin)
router.post('/pages/:id/schedule', requireAdmin, asyncHandler(PageController.schedulePage));

// GET /api/v1/cms/pages/:id/versions - Get Version History
router.get('/pages/:id/versions', requireAuth, asyncHandler(PageController.getVersionHistory));

// POST /api/v1/cms/pages/:id/revert - Revert to Version (Admin)
router.post('/pages/:id/revert', requireAdmin, asyncHandler(PageController.revertToVersion));

// ========================================
// PUBLIC ROUTES (No Auth)
// ========================================

// GET /api/v1/cms/public/page/:slug - Get Published Page by slug (for frontend)
router.get('/public/page/:slug', asyncHandler(PageController.getPublishedPage));

export default router;
```

---

## 📦 DTO Layer

### Example DTOs

**File**: `apps/api-server/src/modules/cms/dto/custom-post-type.dto.ts`

```typescript
import { IsString, IsBoolean, IsOptional, IsEnum, IsObject, IsArray, MinLength, MaxLength } from 'class-validator';
import { CPTStatus } from '../entities/CustomPostType.js';

export class CreateCPTDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  slug: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(50)
  icon: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  schema: any;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  isHierarchical?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportedFeatures?: string[];
}

export class UpdateCPTDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsOptional()
  slug?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  schema?: any;

  @IsEnum(CPTStatus)
  @IsOptional()
  status?: CPTStatus;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsBoolean()
  @IsOptional()
  isHierarchical?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supportedFeatures?: string[];
}

export class CPTQueryDto {
  @IsEnum(CPTStatus)
  @IsOptional()
  status?: CPTStatus;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
```

**Similar DTOs needed**:
- `custom-field.dto.ts`
- `view.dto.ts`
- `page.dto.ts`

---

## ✅ Migration Checklist

### Phase C-1: Entity Migration (Estimated: 3-4 hours)

- [ ] **Step 1.1**: Create `/modules/cms/entities` directory
- [ ] **Step 1.2**: Implement `CustomPostType.ts` entity (V2 with schema support)
- [ ] **Step 1.3**: Implement `CustomField.ts` entity (V2 with validation/conditional)
- [ ] **Step 1.4**: Implement `View.ts` entity (V2 with ViewRenderer schema)
- [ ] **Step 1.5**: Implement `Page.ts` entity (V2 with versioning)
- [ ] **Step 1.6**: Create entity index exports
- [ ] **Step 1.7**: Add entities to TypeORM config (`src/database/data-source.ts`)
- [ ] **Step 1.8**: Generate and run migration for new CMS tables
- [ ] **Step 1.9**: Verify entity relationships in database

### Phase C-2: Service Migration (Estimated: 4-5 hours)

- [ ] **Step 2.1**: Create `/modules/cms/services` directory
- [ ] **Step 2.2**: Implement `CustomPostTypeService.ts` (extends BaseService)
  - [ ] CRUD methods (create, read, update, delete)
  - [ ] Status management (activate, archive)
  - [ ] Listing with filters
- [ ] **Step 2.3**: Implement `CustomFieldService.ts` (extends BaseService)
  - [ ] CRUD methods
  - [ ] Field validation logic
  - [ ] Conditional logic evaluation
  - [ ] Field ordering
- [ ] **Step 2.4**: Implement `ViewService.ts` (extends BaseService)
  - [ ] CRUD methods
  - [ ] ViewRenderer compatibility validation
  - [ ] Component extraction
  - [ ] View cloning
- [ ] **Step 2.5**: Implement `PageService.ts` (extends BaseService)
  - [ ] CRUD methods
  - [ ] Publishing workflow (draft → published)
  - [ ] Scheduling
  - [ ] Version management
- [ ] **Step 2.6**: Implement `PageGeneratorV2.ts`
  - [ ] Generate pages from Views
  - [ ] CPT-based page generation
  - [ ] View synchronization
- [ ] **Step 2.7**: Create service index exports
- [ ] **Step 2.8**: Write unit tests for each service

### Phase C-3: Controller Migration (Estimated: 2-3 hours)

- [ ] **Step 3.1**: Create `/modules/cms/controllers` directory
- [ ] **Step 3.2**: Implement `CustomPostTypeController.ts` (extends BaseController)
  - [ ] CRUD endpoints
  - [ ] Activation endpoint
- [ ] **Step 3.3**: Implement `CustomFieldController.ts` (extends BaseController)
  - [ ] CRUD endpoints
  - [ ] Reordering endpoint
- [ ] **Step 3.4**: Implement `ViewController.ts` (extends BaseController)
  - [ ] CRUD endpoints
  - [ ] Activation endpoint
  - [ ] Cloning endpoint
- [ ] **Step 3.5**: Implement `PageController.ts` (extends BaseController)
  - [ ] CRUD endpoints
  - [ ] Publishing endpoints
  - [ ] Version management endpoints
  - [ ] Public page rendering endpoint
- [ ] **Step 3.6**: Create controller index exports

### Phase C-4: DTO & Routes (Estimated: 1-2 hours)

- [ ] **Step 4.1**: Create `/modules/cms/dto` directory
- [ ] **Step 4.2**: Create `custom-post-type.dto.ts` with class-validator decorators
- [ ] **Step 4.3**: Create `custom-field.dto.ts` with class-validator decorators
- [ ] **Step 4.4**: Create `view.dto.ts` with class-validator decorators
- [ ] **Step 4.5**: Create `page.dto.ts` with class-validator decorators
- [ ] **Step 4.6**: Create DTO index exports
- [ ] **Step 4.7**: Create `/modules/cms/routes/cms.routes.ts`
- [ ] **Step 4.8**: Configure route validation middleware
- [ ] **Step 4.9**: Add CMS routes to main app (`src/index.ts`)

### Phase C-5: Integration & Testing (Estimated: 2-3 hours)

- [ ] **Step 5.1**: Create test database seeding for CMS entities
- [ ] **Step 5.2**: Write integration tests for CustomPostType flow
- [ ] **Step 5.3**: Write integration tests for CustomField flow
- [ ] **Step 5.4**: Write integration tests for View flow
- [ ] **Step 5.5**: Write integration tests for Page flow
- [ ] **Step 5.6**: Write integration tests for PageGenerator
- [ ] **Step 5.7**: Test ViewRenderer compatibility
- [ ] **Step 5.8**: Test Site Builder integration
- [ ] **Step 5.9**: Run full test suite (`npm test`)

### Phase C-6: Migration & Cleanup (Estimated: 1-2 hours)

- [ ] **Step 6.1**: Identify legacy CMS files to deprecate
- [ ] **Step 6.2**: Add deprecation warnings to legacy services
- [ ] **Step 6.3**: Update references to use new CMS V2 modules
- [ ] **Step 6.4**: Remove unused legacy code (after verification)
- [ ] **Step 6.5**: Update documentation
- [ ] **Step 6.6**: Generate migration completion report

---

## ⏱️ Time Estimation

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **C-1: Entity Migration** | 9 tasks | 3-4 hours |
| **C-2: Service Migration** | 8 tasks | 4-5 hours |
| **C-3: Controller Migration** | 6 tasks | 2-3 hours |
| **C-4: DTO & Routes** | 9 tasks | 1-2 hours |
| **C-5: Integration & Testing** | 9 tasks | 2-3 hours |
| **C-6: Migration & Cleanup** | 6 tasks | 1-2 hours |
| **TOTAL** | **47 tasks** | **12-16 hours** |

---

## 🎯 Success Criteria

### Phase C-1 Complete When:
- ✅ All 4 entities created (CustomPostType, CustomField, View, Page)
- ✅ Entities follow V2 patterns (proper TypeORM decorators, helper methods)
- ✅ Database migration successful (tables created with correct schema)
- ✅ Entity relationships verified

### Phase C-2 Complete When:
- ✅ All 5 services created (CPT, Field, View, Page, PageGenerator)
- ✅ All services extend BaseService
- ✅ All CRUD operations functional
- ✅ Unit tests passing for each service

### Phase C-3 Complete When:
- ✅ All 4 controllers created (CPT, Field, View, Page)
- ✅ All controllers extend BaseController
- ✅ All endpoints return proper BaseController responses

### Phase C-4 Complete When:
- ✅ All 4 DTO files created with validation decorators
- ✅ CMS routes configured and mounted
- ✅ Validation middleware working

### Phase C-5 Complete When:
- ✅ Integration tests written and passing
- ✅ ViewRenderer compatibility verified
- ✅ Site Builder can create pages using CMS V2 API

### Phase C-6 Complete When:
- ✅ Legacy code deprecated/removed
- ✅ Documentation updated
- ✅ Migration report generated
- ✅ Build PASS (0 errors)

---

## 🔴 Risk Management

### High Priority Risks

**Risk 1: ViewRenderer Schema Incompatibility**
- **Impact**: Views created in CMS can't be rendered by NextGen ViewRenderer
- **Mitigation**:
  - Define ViewRenderer schema specification FIRST
  - Validate all View entities against schema
  - Test with real ViewRenderer before proceeding

**Risk 2: Legacy Code Dependencies**
- **Impact**: Other modules still depend on old CMS structure
- **Mitigation**:
  - Search codebase for imports from legacy CMS (`src/entities/CustomPostType`, etc.)
  - Create adapter layer if needed
  - Update dependencies incrementally

**Risk 3: Database Migration Data Loss**
- **Impact**: Existing CMS data lost during migration
- **Mitigation**:
  - Backup database before migration
  - Write data migration script if legacy data exists
  - Test migration on staging first

### Medium Priority Risks

**Risk 4: Performance Issues with JSONB Queries**
- **Impact**: Slow queries on View/Page schema fields
- **Mitigation**:
  - Add GIN indexes for JSONB columns
  - Optimize queries with specific JSON path access
  - Consider caching for frequently accessed Views

**Risk 5: Complex Conditional Logic in ACF**
- **Impact**: Field conditional evaluation becomes too slow
- **Mitigation**:
  - Keep conditional logic simple (max 3 conditions per field)
  - Cache conditional evaluation results
  - Consider moving complex logic to frontend

---

## 📚 Reference Documents

**V2 Architecture Patterns**:
- BaseService: `src/common/base.service.ts`
- BaseController: `src/common/base.controller.ts`
- Module Structure: `src/modules/commerce/` (reference example)

**ViewRenderer Schema**:
- NextGen ViewRenderer Spec: `apps/main-site-nextgen/docs/view-renderer.md` (if exists)
- Component Registry: `apps/main-site-nextgen/src/components/registry.ts`

**Site Builder Integration**:
- Site Builder Page Creation: `apps/admin-dashboard/src/features/site-builder/`

**Database**:
- TypeORM Config: `apps/api-server/src/database/data-source.ts`
- Migration Guide: `apps/api-server/docs/migrations.md`

---

## 🚀 Getting Started

### Recommended Workflow

1. **Review Phase B Patterns** - Study existing V2 modules (Commerce, Dropshipping)
2. **Start with Entities** - Foundation for everything else
3. **Implement Services** - Business logic layer
4. **Add Controllers** - API endpoints
5. **Create DTOs & Routes** - Request/response validation
6. **Test Integration** - Verify end-to-end flow
7. **Migrate & Cleanup** - Remove legacy code

### First Steps (Phase C-1 Start)

```bash
# 1. Create module directory structure
mkdir -p apps/api-server/src/modules/cms/{entities,services,controllers,dto,routes}

# 2. Create entity files
touch apps/api-server/src/modules/cms/entities/{CustomPostType,CustomField,View,Page,index}.ts

# 3. Verify current database state
npm run typeorm -- migration:show

# 4. Begin implementation (start with CustomPostType entity)
```

### Development Commands

```bash
# Run build to check for errors
npm run build

# Run type checking
npx tsc --noEmit

# Generate migration after entity changes
npm run typeorm -- migration:generate -n CMSModuleV2

# Run migrations
npm run typeorm -- migration:run

# Run tests
npm test

# Run specific test suite
npm test -- cms
```

---

## 📝 Progress Tracking

Use this checklist to track progress through Phase C:

### Overall Progress

- [ ] **Phase C-1**: Entity Migration (0/9 tasks)
- [ ] **Phase C-2**: Service Migration (0/8 tasks)
- [ ] **Phase C-3**: Controller Migration (0/6 tasks)
- [ ] **Phase C-4**: DTO & Routes (0/9 tasks)
- [ ] **Phase C-5**: Integration & Testing (0/9 tasks)
- [ ] **Phase C-6**: Migration & Cleanup (0/6 tasks)

**Total**: 0/47 tasks (0%)

---

## 🎉 Completion Report Template

When Phase C is complete, generate a report using this template:

```markdown
# Phase C: CMS Module Migration - Completion Report

**Date Completed**: [DATE]
**Duration**: [ACTUAL HOURS]
**Tasks Completed**: 47/47 (100%)

## Achievements
- ✅ CMS V2 entities created and migrated
- ✅ All services follow BaseService pattern
- ✅ All controllers follow BaseController pattern
- ✅ ViewRenderer compatibility verified
- ✅ Site Builder integration working
- ✅ Build PASS (0 errors)

## Entities Created
1. CustomPostType (V2)
2. CustomField (V2)
3. View (V2)
4. Page (V2)

## Services Implemented
1. CustomPostTypeService
2. CustomFieldService
3. ViewService
4. PageService
5. PageGeneratorV2

## Test Results
- Integration Tests: [X] passing
- Unit Tests: [X] passing
- E2E Tests: [X] passing

## Next Steps
- Phase D: Multi-Site CMS Features
- Phase E: Advanced Page Builder
```

---

## 📞 Support & Questions

**Technical Questions**: Refer to Phase B completion reports and V2 architecture docs

**Blockers**: Document in `docs/api-server/blockers/phase_c_blockers.md`

**Progress Updates**: Update this Work Order checklist regularly

---

**Work Order Created**: 2025-12-04
**Created By**: Claude (Rena)
**Status**: 🔴 READY TO START

🚀 **Phase C-1: CMS Module Migration - Let's Begin!** 🚀
