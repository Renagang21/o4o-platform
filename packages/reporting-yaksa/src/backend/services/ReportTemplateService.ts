import { DataSource, Repository } from 'typeorm';
import { ReportFieldTemplate, ReportFieldDefinition } from '../entities/ReportFieldTemplate.js';

/**
 * CreateTemplateDto
 */
export interface CreateTemplateDto {
  year: number;
  name: string;
  description?: string;
  fields: ReportFieldDefinition[];
  deadline?: string;
  active?: boolean;
}

/**
 * UpdateTemplateDto
 */
export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  fields?: ReportFieldDefinition[];
  deadline?: string;
  active?: boolean;
}

/**
 * ReportTemplateService
 *
 * 신상신고 템플릿 관리 서비스
 */
export class ReportTemplateService {
  private templateRepo: Repository<ReportFieldTemplate>;

  constructor(private dataSource: DataSource) {
    this.templateRepo = dataSource.getRepository(ReportFieldTemplate);
  }

  /**
   * 템플릿 생성
   */
  async create(dto: CreateTemplateDto): Promise<ReportFieldTemplate> {
    // 연도 중복 확인
    const existing = await this.templateRepo.findOne({
      where: { year: dto.year },
    });
    if (existing) {
      throw new Error(`Template for year ${dto.year} already exists`);
    }

    // 필드 유효성 검사
    this.validateFields(dto.fields);

    const template = this.templateRepo.create({
      year: dto.year,
      name: dto.name,
      description: dto.description,
      fields: dto.fields,
      deadline: dto.deadline,
      active: dto.active ?? true,
    });

    return await this.templateRepo.save(template);
  }

  /**
   * 템플릿 수정
   */
  async update(id: string, dto: UpdateTemplateDto): Promise<ReportFieldTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new Error(`Template "${id}" not found`);
    }

    if (dto.fields) {
      this.validateFields(dto.fields);
    }

    Object.assign(template, dto);
    return await this.templateRepo.save(template);
  }

  /**
   * 템플릿 조회 (ID)
   */
  async findById(id: string): Promise<ReportFieldTemplate | null> {
    return await this.templateRepo.findOne({ where: { id } });
  }

  /**
   * 템플릿 조회 (연도)
   */
  async findByYear(year: number): Promise<ReportFieldTemplate | null> {
    return await this.templateRepo.findOne({ where: { year } });
  }

  /**
   * 활성 템플릿 조회 (연도)
   */
  async findActiveByYear(year: number): Promise<ReportFieldTemplate | null> {
    return await this.templateRepo.findOne({
      where: { year, active: true },
    });
  }

  /**
   * 현재 연도 활성 템플릿 조회
   */
  async findCurrentActive(): Promise<ReportFieldTemplate | null> {
    const currentYear = new Date().getFullYear();
    return await this.findActiveByYear(currentYear);
  }

  /**
   * 모든 템플릿 목록
   */
  async list(filter?: { active?: boolean }): Promise<ReportFieldTemplate[]> {
    const qb = this.templateRepo.createQueryBuilder('template');

    if (filter?.active !== undefined) {
      qb.andWhere('template.active = :active', { active: filter.active });
    }

    qb.orderBy('template.year', 'DESC');

    return await qb.getMany();
  }

  /**
   * 템플릿 삭제
   *
   * 해당 템플릿을 사용한 신고서가 있으면 삭제 불가
   */
  async delete(id: string): Promise<void> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new Error(`Template "${id}" not found`);
    }

    // TODO: 사용 중인 신고서 확인
    // const reportCount = await this.dataSource.getRepository(AnnualReport).count({
    //   where: { templateId: id },
    // });
    // if (reportCount > 0) {
    //   throw new Error(`Cannot delete template with ${reportCount} reports`);
    // }

    await this.templateRepo.delete({ id });
  }

  /**
   * 템플릿 활성화/비활성화
   */
  async setActive(id: string, active: boolean): Promise<ReportFieldTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new Error(`Template "${id}" not found`);
    }

    // 같은 연도의 다른 템플릿 비활성화 (활성화 시)
    if (active) {
      await this.templateRepo.update(
        { year: template.year, active: true },
        { active: false }
      );
    }

    template.active = active;
    return await this.templateRepo.save(template);
  }

  /**
   * 템플릿 복제 (새 연도용)
   */
  async duplicateForYear(sourceId: string, targetYear: number): Promise<ReportFieldTemplate> {
    const source = await this.templateRepo.findOne({ where: { id: sourceId } });
    if (!source) {
      throw new Error(`Source template "${sourceId}" not found`);
    }

    // 대상 연도 중복 확인
    const existing = await this.templateRepo.findOne({
      where: { year: targetYear },
    });
    if (existing) {
      throw new Error(`Template for year ${targetYear} already exists`);
    }

    const newTemplate = this.templateRepo.create({
      year: targetYear,
      name: `${targetYear}년 신상신고서`,
      description: source.description,
      fields: source.fields,
      active: false, // 기본 비활성
    });

    return await this.templateRepo.save(newTemplate);
  }

  /**
   * 필드 유효성 검사
   */
  private validateFields(fields: ReportFieldDefinition[]): void {
    if (!Array.isArray(fields) || fields.length === 0) {
      throw new Error('Template must have at least one field');
    }

    const keys = new Set<string>();
    for (const field of fields) {
      // 필수 속성 확인
      if (!field.key || !field.label || !field.type) {
        throw new Error('Each field must have key, label, and type');
      }

      // 키 중복 확인
      if (keys.has(field.key)) {
        throw new Error(`Duplicate field key: ${field.key}`);
      }
      keys.add(field.key);

      // select 타입 옵션 확인
      if ((field.type === 'select' || field.type === 'multiselect') && !field.options?.length) {
        throw new Error(`Field "${field.key}" (${field.type}) must have options`);
      }
    }
  }

  /**
   * 기본 템플릿 생성 (install 시)
   */
  async createDefaultTemplate(year: number): Promise<ReportFieldTemplate> {
    const defaultFields: ReportFieldDefinition[] = [
      {
        key: 'licenseNumber',
        label: '면허번호',
        type: 'text',
        required: true,
        readonly: true,
        source: 'member.licenseNumber',
        group: 'basic',
        order: 1,
      },
      {
        key: 'name',
        label: '성명',
        type: 'text',
        required: true,
        readonly: true,
        source: 'member.name',
        group: 'basic',
        order: 2,
      },
      {
        key: 'birthdate',
        label: '생년월일',
        type: 'date',
        required: true,
        readonly: true,
        source: 'member.birthdate',
        group: 'basic',
        order: 3,
      },
      {
        key: 'phone',
        label: '연락처',
        type: 'phone',
        required: true,
        source: 'member.phone',
        group: 'contact',
        order: 4,
      },
      {
        key: 'email',
        label: '이메일',
        type: 'email',
        required: false,
        source: 'member.email',
        group: 'contact',
        order: 5,
      },
      {
        key: 'workplaceType',
        label: '근무형태',
        type: 'select',
        required: true,
        options: [
          { value: 'pharmacy_owner', label: '개국약사' },
          { value: 'pharmacy_employee', label: '근무약사' },
          { value: 'hospital', label: '병원약사' },
          { value: 'industry', label: '제약회사' },
          { value: 'government', label: '공무원' },
          { value: 'academic', label: '학계' },
          { value: 'retired', label: '휴업' },
          { value: 'other', label: '기타' },
        ],
        group: 'workplace',
        order: 6,
        syncToMembership: true,
        syncTarget: 'metadata.workplaceType',
      },
      {
        key: 'pharmacyName',
        label: '근무지명',
        type: 'text',
        required: false,
        source: 'member.pharmacyName',
        group: 'workplace',
        order: 7,
        hint: '약국명, 병원명, 회사명 등',
      },
      {
        key: 'pharmacyAddress',
        label: '근무지 주소',
        type: 'address',
        required: false,
        source: 'member.pharmacyAddress',
        group: 'workplace',
        order: 8,
      },
      {
        key: 'categoryChange',
        label: '회원분류 변경',
        type: 'select',
        required: false,
        options: [
          { value: '', label: '변경 없음' },
          { value: 'regular', label: '정회원' },
          { value: 'associate', label: '준회원' },
          { value: 'retired', label: '휴업약사' },
          { value: 'honorary', label: '명예회원' },
        ],
        group: 'membership',
        order: 9,
        syncToMembership: true,
        syncTarget: 'categoryId',
        hint: '회원 분류 변경이 필요한 경우 선택',
      },
      {
        key: 'organizationChange',
        label: '소속 지부/분회 변경',
        type: 'organization',
        required: false,
        group: 'membership',
        order: 10,
        syncToMembership: true,
        syncTarget: 'organizationId',
        hint: '소속 변경이 필요한 경우 선택',
      },
      {
        key: 'remarks',
        label: '비고',
        type: 'textarea',
        required: false,
        group: 'etc',
        order: 11,
        hint: '기타 특이사항이 있으면 기재',
      },
    ];

    return await this.create({
      year,
      name: `${year}년 신상신고서`,
      description: `${year}년도 약사 신상신고 양식입니다.`,
      fields: defaultFields,
      active: true,
    });
  }
}
