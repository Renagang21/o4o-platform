import { DataSource } from 'typeorm';
import { MetaDataService } from '../../services/MetaDataService';
import { CustomField, CustomFieldValue, FieldGroup } from '../../entities/CustomField';

describe('MetaDataService', () => {
  let dataSource: DataSource;
  let metaDataService: MetaDataService;
  let testFieldGroup: FieldGroup;
  let testField: CustomField;

  beforeAll(async () => {
    // 테스트 데이터베이스 연결 설정
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      dropSchema: true,
      entities: [CustomField, CustomFieldValue, FieldGroup],
      synchronize: true,
      logging: false,
    });

    await dataSource.initialize();
    
    // AppDataSource 모킹
    jest.doMock('../../database/connection', () => ({
      AppDataSource: dataSource
    }));

    metaDataService = new MetaDataService();

    // 테스트용 필드 그룹 및 필드 생성
    const fieldGroupRepo = dataSource.getRepository(FieldGroup);
    testFieldGroup = fieldGroupRepo.create({
      title: 'Test Group',
      description: 'Test field group',
      location: [{ param: 'post_type', operator: '==', value: 'post' }],
      active: true,
      order: 0,
      placement: 'normal'
    });
    await fieldGroupRepo.save(testFieldGroup);

    const fieldRepo = dataSource.getRepository(CustomField);
    testField = fieldRepo.create({
      name: 'test_field',
      label: 'Test Field',
      type: 'text',
      required: false,
      order: 0,
      groupId: testFieldGroup.id
    });
    await fieldRepo.save(testField);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    // 각 테스트 전에 field_values 테이블 정리
    const fieldValueRepo = dataSource.getRepository(CustomFieldValue);
    await fieldValueRepo.clear();
  });

  describe('getMeta', () => {
    it('should get meta value by field ID', async () => {
      const fieldValueRepo = dataSource.getRepository(CustomFieldValue);
      
      // 테스트 데이터 생성
      const testValue = fieldValueRepo.create({
        fieldId: testField.id,
        entityType: 'post',
        entityId: 'test-post-id',
        value: 'test value'
      });
      await fieldValueRepo.save(testValue);

      const result = await metaDataService.getMeta('post', 'test-post-id', testField.id);
      expect(result).toBe('test value');
    });

    it('should get meta value by field name', async () => {
      const fieldValueRepo = dataSource.getRepository(CustomFieldValue);
      
      const testValue = fieldValueRepo.create({
        fieldId: testField.id,
        entityType: 'post',
        entityId: 'test-post-id',
        value: 'test value by name'
      });
      await fieldValueRepo.save(testValue);

      const result = await metaDataService.getMeta('post', 'test-post-id', 'test_field');
      expect(result).toBe('test value by name');
    });

    it('should return undefined for non-existent meta', async () => {
      const result = await metaDataService.getMeta('post', 'non-existent-id', 'test_field');
      expect(result).toBeUndefined();
    });

    it('should handle complex data types', async () => {
      const fieldValueRepo = dataSource.getRepository(CustomFieldValue);
      
      const complexValue = {
        nested: { data: 'value' },
        array: [1, 2, 3],
        boolean: true
      };

      const testValue = fieldValueRepo.create({
        fieldId: testField.id,
        entityType: 'post',
        entityId: 'test-post-id',
        value: complexValue
      });
      await fieldValueRepo.save(testValue);

      const result = await metaDataService.getMeta('post', 'test-post-id', testField.id);
      expect(result).toEqual(complexValue);
    });
  });

  describe('setMeta', () => {
    it('should create new meta value', async () => {
      const success = await metaDataService.setMeta('post', 'test-post-id', testField.id, 'new value');
      expect(success).toBe(true);

      const result = await metaDataService.getMeta('post', 'test-post-id', testField.id);
      expect(result).toBe('new value');
    });

    it('should update existing meta value', async () => {
      // 첫 번째 값 설정
      await metaDataService.setMeta('post', 'test-post-id', testField.id, 'initial value');
      
      // 값 업데이트
      const success = await metaDataService.setMeta('post', 'test-post-id', testField.id, 'updated value');
      expect(success).toBe(true);

      const result = await metaDataService.getMeta('post', 'test-post-id', testField.id);
      expect(result).toBe('updated value');
    });

    it('should set meta value by field name', async () => {
      const success = await metaDataService.setMeta('post', 'test-post-id', 'test_field', 'value by name');
      expect(success).toBe(true);

      const result = await metaDataService.getMeta('post', 'test-post-id', 'test_field');
      expect(result).toBe('value by name');
    });

    it('should handle various data types', async () => {
      const testCases = [
        { value: 'string value', type: 'string' },
        { value: 123, type: 'number' },
        { value: true, type: 'boolean' },
        { value: new Date('2023-01-01'), type: 'date' },
        { value: ['a', 'b', 'c'], type: 'array' },
        { value: { key: 'value' }, type: 'object' }
      ];

      for (const testCase of testCases) {
        await metaDataService.setMeta('post', `test-${testCase.type}`, testField.id, testCase.value);
        const result = await metaDataService.getMeta('post', `test-${testCase.type}`, testField.id);
        expect(result).toEqual(testCase.value);
      }
    });
  });

  describe('getManyMeta', () => {
    beforeEach(async () => {
      // 테스트 데이터 준비
      const entities = ['post-1', 'post-2', 'post-3'];
      const values = ['value-1', 'value-2', 'value-3'];

      for (let i = 0; i < entities.length; i++) {
        await metaDataService.setMeta('post', entities[i], testField.id, values[i]);
      }
    });

    it('should get meta values for multiple entities', async () => {
      const result = await metaDataService.getManyMeta('post', ['post-1', 'post-2', 'post-3']);
      
      expect(result).toEqual({
        'post-1': { 'test_field': 'value-1' },
        'post-2': { 'test_field': 'value-2' },
        'post-3': { 'test_field': 'value-3' }
      });
    });

    it('should filter by specific field IDs', async () => {
      const result = await metaDataService.getManyMeta('post', ['post-1', 'post-2'], [testField.id]);
      
      expect(result).toEqual({
        'post-1': { 'test_field': 'value-1' },
        'post-2': { 'test_field': 'value-2' }
      });
    });

    it('should filter by field names', async () => {
      const result = await metaDataService.getManyMeta('post', ['post-1', 'post-2'], ['test_field']);
      
      expect(result).toEqual({
        'post-1': { 'test_field': 'value-1' },
        'post-2': { 'test_field': 'value-2' }
      });
    });

    it('should return empty objects for entities without meta values', async () => {
      const result = await metaDataService.getManyMeta('post', ['non-existent-1', 'non-existent-2']);
      
      expect(result).toEqual({
        'non-existent-1': {},
        'non-existent-2': {}
      });
    });

    it('should handle empty entity list', async () => {
      const result = await metaDataService.getManyMeta('post', []);
      expect(result).toEqual({});
    });
  });

  describe('setManyMeta', () => {
    it('should set multiple meta values in transaction', async () => {
      const values = {
        'test_field': 'bulk value',
        // 다른 필드가 있다면 여기에 추가
      };

      const success = await metaDataService.setManyMeta('post', 'bulk-test-id', values);
      expect(success).toBe(true);

      const result = await metaDataService.getMeta('post', 'bulk-test-id', 'test_field');
      expect(result).toBe('bulk value');
    });

    it('should replace existing values', async () => {
      // 초기 값 설정
      await metaDataService.setMeta('post', 'replace-test-id', 'test_field', 'initial');

      // 새 값들로 교체
      const newValues = {
        'test_field': 'replaced value'
      };

      const success = await metaDataService.setManyMeta('post', 'replace-test-id', newValues);
      expect(success).toBe(true);

      const result = await metaDataService.getMeta('post', 'replace-test-id', 'test_field');
      expect(result).toBe('replaced value');
    });
  });

  describe('deleteMeta', () => {
    beforeEach(async () => {
      await metaDataService.setMeta('post', 'delete-test-id', testField.id, 'to be deleted');
    });

    it('should delete all meta values for an entity', async () => {
      const success = await metaDataService.deleteMeta('post', 'delete-test-id');
      expect(success).toBe(true);

      const result = await metaDataService.getMeta('post', 'delete-test-id', testField.id);
      expect(result).toBeUndefined();
    });
  });

  describe('deleteMetaField', () => {
    beforeEach(async () => {
      await metaDataService.setMeta('post', 'delete-field-test-id', testField.id, 'to be deleted');
    });

    it('should delete specific meta field by field ID', async () => {
      const success = await metaDataService.deleteMetaField('post', 'delete-field-test-id', testField.id);
      expect(success).toBe(true);

      const result = await metaDataService.getMeta('post', 'delete-field-test-id', testField.id);
      expect(result).toBeUndefined();
    });

    it('should delete specific meta field by field name', async () => {
      const success = await metaDataService.deleteMetaField('post', 'delete-field-test-id', 'test_field');
      expect(success).toBe(true);

      const result = await metaDataService.getMeta('post', 'delete-field-test-id', 'test_field');
      expect(result).toBeUndefined();
    });
  });
});