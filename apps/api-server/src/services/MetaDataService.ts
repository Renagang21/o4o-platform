import { AppDataSource } from '../database/connection';
import { CustomFieldValue, CustomField } from '../entities/CustomField';
import { In } from 'typeorm';
import logger from '../utils/logger';

export interface MetaValue {
  fieldId: string;
  fieldName: string;
  value: string | number | boolean | Date | null | string[] | Record<string, unknown>;
}

export interface ManyMetaResult {
  [entityId: string]: {
    [fieldName: string]: string | number | boolean | Date | null | string[] | Record<string, unknown>;
  };
}

/**
 * 통일된 메타데이터 접근 레이어
 * EAV(Entity-Attribute-Value) 모델을 사용하여 모든 ACF 데이터를 관리
 */
export class MetaDataService {
  private fieldValueRepo = AppDataSource.getRepository(CustomFieldValue);
  private fieldRepo = AppDataSource.getRepository(CustomField);

  /**
   * 단일 개체의 특정 필드 값을 가져옵니다
   * @param entityType 엔티티 타입 ('post', 'user', 'term' 등)
   * @param entityId 엔티티 ID
   * @param fieldId 필드 ID 또는 필드명
   * @returns 필드 값 또는 undefined
   */
  async getMeta(
    entityType: string, 
    entityId: string, 
    fieldId: string
  ): Promise<string | number | boolean | Date | null | string[] | Record<string, unknown> | undefined> {
    try {
      // fieldId가 UUID인지 필드명인지 확인
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fieldId);
      
      let fieldValue: CustomFieldValue | null;
      
      if (isUUID) {
        // fieldId가 UUID인 경우
        fieldValue = await this.fieldValueRepo.findOne({
          where: { entityType, entityId, fieldId },
          relations: ['field']
        });
      } else {
        // fieldId가 필드명인 경우
        fieldValue = await this.fieldValueRepo.findOne({
          where: { entityType, entityId },
          relations: ['field'],
          // field.name으로 조인 조건 추가
        });
        
        // 필드명으로 필터링
        if (fieldValue && fieldValue.field.name !== fieldId) {
          fieldValue = await this.fieldValueRepo
            .createQueryBuilder('fieldValue')
            .leftJoinAndSelect('fieldValue.field', 'field')
            .where('fieldValue.entityType = :entityType', { entityType })
            .andWhere('fieldValue.entityId = :entityId', { entityId })
            .andWhere('field.name = :fieldName', { fieldName: fieldId })
            .getOne();
        }
      }

      return fieldValue?.value;
    } catch (error) {
      logger.error('Failed to get meta value:', error);
      return undefined;
    }
  }

  /**
   * 단일 개체의 특정 필드 값을 저장합니다
   * @param entityType 엔티티 타입
   * @param entityId 엔티티 ID
   * @param fieldId 필드 ID 또는 필드명
   * @param value 저장할 값
   * @returns 성공 여부
   */
  async setMeta(
    entityType: string, 
    entityId: string, 
    fieldId: string, 
    value: string | number | boolean | Date | null | string[] | Record<string, unknown>
  ): Promise<boolean> {
    try {
      // fieldId가 UUID인지 필드명인지 확인
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fieldId);
      
      let actualFieldId: string;
      
      if (isUUID) {
        actualFieldId = fieldId;
      } else {
        // 필드명으로 필드 ID 찾기
        const field = await this.fieldRepo.findOne({
          where: { name: fieldId }
        });
        
        if (!field) {
          logger.warn(`Field not found: ${fieldId}`);
          return false;
        }
        
        actualFieldId = field.id;
      }

      // 기존 값이 있는지 확인
      let fieldValue = await this.fieldValueRepo.findOne({
        where: { entityType, entityId, fieldId: actualFieldId }
      });

      if (fieldValue) {
        // 기존 값 업데이트
        fieldValue.value = value;
        await this.fieldValueRepo.save(fieldValue);
      } else {
        // 새 값 생성
        fieldValue = this.fieldValueRepo.create({
          fieldId: actualFieldId,
          entityType,
          entityId,
          value
        });
        await this.fieldValueRepo.save(fieldValue);
      }

      return true;
    } catch (error) {
      logger.error('Failed to set meta value:', error);
      return false;
    }
  }

  /**
   * 여러 개체의 여러 필드 값을 효율적으로 가져옵니다 (N+1 문제 방지)
   * @param entityType 엔티티 타입
   * @param entityIds 엔티티 ID 배열
   * @param fieldIds 필드 ID 또는 필드명 배열 (선택사항, 없으면 모든 필드)
   * @returns 중첩된 객체 형태의 결과
   */
  async getManyMeta(
    entityType: string, 
    entityIds: string[], 
    fieldIds?: string[]
  ): Promise<ManyMetaResult> {
    try {
      if (entityIds.length === 0) {
        return {};
      }

      const queryBuilder = this.fieldValueRepo
        .createQueryBuilder('fieldValue')
        .leftJoinAndSelect('fieldValue.field', 'field')
        .where('fieldValue.entityType = :entityType', { entityType })
        .andWhere('fieldValue.entityId IN (:...entityIds)', { entityIds });

      // 특정 필드들만 가져오는 경우
      if (fieldIds && fieldIds.length > 0) {
        // UUID와 필드명이 섞여있을 수 있으므로 분리
        const uuidFields = fieldIds.filter(id => 
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
        );
        const nameFields = fieldIds.filter(id => 
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
        );

        const conditions = [];
        
        if (uuidFields.length > 0) {
          conditions.push('fieldValue.fieldId IN (:...uuidFields)');
        }
        
        if (nameFields.length > 0) {
          conditions.push('field.name IN (:...nameFields)');
        }

        if (conditions.length > 0) {
          queryBuilder.andWhere(`(${conditions.join(' OR ')})`, {
            uuidFields,
            nameFields
          });
        }
      }

      const fieldValues = await queryBuilder.getMany();

      // 결과를 중첩 객체로 변환
      const result: ManyMetaResult = {};

      for (const entityId of entityIds) {
        result[entityId] = {};
      }

      for (const fieldValue of fieldValues) {
        if (!result[fieldValue.entityId]) {
          result[fieldValue.entityId] = {};
        }
        
        result[fieldValue.entityId][fieldValue.field.name] = fieldValue.value;
      }

      return result;
    } catch (error) {
      logger.error('Failed to get many meta values:', error);
      return {};
    }
  }

  /**
   * 특정 엔티티의 모든 메타 값을 삭제합니다
   * @param entityType 엔티티 타입
   * @param entityId 엔티티 ID
   * @returns 성공 여부
   */
  async deleteMeta(entityType: string, entityId: string): Promise<boolean> {
    try {
      await this.fieldValueRepo.delete({ entityType, entityId });
      return true;
    } catch (error) {
      logger.error('Failed to delete meta values:', error);
      return false;
    }
  }

  /**
   * 특정 엔티티의 특정 필드 값을 삭제합니다
   * @param entityType 엔티티 타입
   * @param entityId 엔티티 ID
   * @param fieldId 필드 ID 또는 필드명
   * @returns 성공 여부
   */
  async deleteMetaField(entityType: string, entityId: string, fieldId: string): Promise<boolean> {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fieldId);
      
      if (isUUID) {
        await this.fieldValueRepo.delete({ entityType, entityId, fieldId });
      } else {
        const field = await this.fieldRepo.findOne({ where: { name: fieldId } });
        if (field) {
          await this.fieldValueRepo.delete({ entityType, entityId, fieldId: field.id });
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to delete meta field:', error);
      return false;
    }
  }

  /**
   * 여러 필드 값을 한 번에 저장합니다 (트랜잭션 사용)
   * @param entityType 엔티티 타입
   * @param entityId 엔티티 ID
   * @param values 필드명-값 객체
   * @returns 성공 여부
   */
  async setManyMeta(
    entityType: string, 
    entityId: string, 
    values: Record<string, string | number | boolean | Date | null | string[] | Record<string, unknown>>
  ): Promise<boolean> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 기존 값들 삭제
      await queryRunner.manager.delete(CustomFieldValue, { entityType, entityId });

      // 새 값들 저장
      for (const [fieldName, value] of Object.entries(values)) {
        const field = await queryRunner.manager.findOne(CustomField, {
          where: { name: fieldName }
        });

        if (field) {
          const fieldValue = queryRunner.manager.create(CustomFieldValue, {
            fieldId: field.id,
            entityType,
            entityId,
            value
          });
          
          await queryRunner.manager.save(fieldValue);
        }
      }

      await queryRunner.commitTransaction();
      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error('Failed to set many meta values:', error);
      return false;
    } finally {
      await queryRunner.release();
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const metaDataService = new MetaDataService();