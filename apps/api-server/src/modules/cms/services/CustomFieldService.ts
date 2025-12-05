import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { CustomField, FieldType, type FieldValidation, type FieldConditional } from '../entities/CustomField.js';
import logger from '../../../utils/logger.js';

export interface CreateFieldRequest {
  postTypeId: string;
  key: string;
  label: string;
  type: FieldType;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  validation?: FieldValidation;
  options?: Record<string, any>;
  conditional?: FieldConditional[];
  order?: number;
  group?: string;
}

export interface UpdateFieldRequest extends Partial<CreateFieldRequest> {
  isActive?: boolean;
}

export interface FieldFilters {
  postTypeId?: string;
  type?: FieldType;
  group?: string;
  isActive?: boolean;
  search?: string;
}

export class CustomFieldService extends BaseService<CustomField> {
  private static instance: CustomFieldService;
  private fieldRepository: Repository<CustomField>;

  constructor() {
    const fieldRepository = AppDataSource.getRepository(CustomField);
    super(fieldRepository);
    this.fieldRepository = fieldRepository;
  }

  static getInstance(): CustomFieldService {
    if (!CustomFieldService.instance) {
      CustomFieldService.instance = new CustomFieldService();
    }
    return CustomFieldService.instance;
  }

  // CRUD Operations
  async createField(data: CreateFieldRequest): Promise<CustomField> {
    // Validate key uniqueness
    const existing = await this.fieldRepository.findOne({ where: { key: data.key } });
    if (existing) {
      throw new Error(`Field with key '${data.key}' already exists`);
    }

    const field = this.fieldRepository.create({
      ...data,
      isActive: true
    });

    const saved = await this.fieldRepository.save(field);

    logger.info(`[CMS] CustomField created: ${saved.key}`, { id: saved.id, postTypeId: saved.postTypeId });

    return saved;
  }

  async getField(id: string): Promise<CustomField | null> {
    return this.fieldRepository.findOne({
      where: { id },
      relations: ['postType']
    });
  }

  async getFieldByKey(key: string): Promise<CustomField | null> {
    return this.fieldRepository.findOne({ where: { key } });
  }

  async getFieldsForCPT(postTypeId: string): Promise<CustomField[]> {
    return this.fieldRepository.find({
      where: { postTypeId, isActive: true },
      order: { order: 'ASC' }
    });
  }

  async listFields(filters: FieldFilters = {}): Promise<CustomField[]> {
    const { postTypeId, type, group, isActive, search } = filters;

    const query = this.fieldRepository.createQueryBuilder('field');

    if (postTypeId) {
      query.andWhere('field.postTypeId = :postTypeId', { postTypeId });
    }

    if (type) {
      query.andWhere('field.type = :type', { type });
    }

    if (group) {
      query.andWhere('field.group = :group', { group });
    }

    if (isActive !== undefined) {
      query.andWhere('field.isActive = :isActive', { isActive });
    }

    if (search) {
      query.andWhere('(field.label ILIKE :search OR field.key ILIKE :search OR field.description ILIKE :search)', {
        search: `%${search}%`
      });
    }

    query.orderBy('field.order', 'ASC');

    return query.getMany();
  }

  async updateField(id: string, data: UpdateFieldRequest): Promise<CustomField> {
    const field = await this.getField(id);
    if (!field) {
      throw new Error(`Field not found: ${id}`);
    }

    // Validate key uniqueness if changed
    if (data.key && data.key !== field.key) {
      const existing = await this.fieldRepository.findOne({ where: { key: data.key } });
      if (existing) {
        throw new Error(`Field with key '${data.key}' already exists`);
      }
    }

    Object.assign(field, data);
    const updated = await this.fieldRepository.save(field);

    logger.info(`[CMS] CustomField updated: ${updated.key}`, { id: updated.id });

    return updated;
  }

  async deleteField(id: string): Promise<boolean> {
    const result = await this.fieldRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  async reorderFields(postTypeId: string, fieldIds: string[]): Promise<boolean> {
    try {
      // Update order for each field
      await Promise.all(
        fieldIds.map((fieldId, index) =>
          this.fieldRepository.update(
            { id: fieldId, postTypeId },
            { order: index }
          )
        )
      );

      logger.info(`[CMS] Fields reordered for CPT: ${postTypeId}`, { fieldCount: fieldIds.length });

      return true;
    } catch (error: any) {
      logger.error('[CustomFieldService.reorderFields] Error', { error: error.message });
      return false;
    }
  }

  async validateFieldValue(fieldId: string, value: any): Promise<{ valid: boolean; error?: string }> {
    const field = await this.getField(fieldId);
    if (!field) {
      return { valid: false, error: 'Field not found' };
    }

    return field.validate(value);
  }

  async checkFieldConditionals(fieldId: string, fieldValues: Record<string, any>): Promise<boolean> {
    const field = await this.getField(fieldId);
    if (!field) return false;

    return field.checkConditional(fieldValues);
  }

  async getFieldsByGroup(postTypeId: string): Promise<Map<string, CustomField[]>> {
    const fields = await this.getFieldsForCPT(postTypeId);

    const grouped = new Map<string, CustomField[]>();

    fields.forEach(field => {
      const group = field.group || 'default';
      if (!grouped.has(group)) {
        grouped.set(group, []);
      }
      grouped.get(group)!.push(field);
    });

    return grouped;
  }
}
