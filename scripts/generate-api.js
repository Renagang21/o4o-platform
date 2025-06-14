#!/usr/bin/env node

// API 엔드포인트 자동 생성 스크립트
// RESTful API 패턴에 따라 일관된 API 구조 생성

const fs = require('fs').promises;
const path = require('path');

class APIGenerator {
  constructor() {
    this.baseDir = path.join(process.cwd(), 'services/api-server/src');
    this.routesDir = path.join(this.baseDir, 'routes');
    this.controllersDir = path.join(this.baseDir, 'controllers');
    this.servicesDir = path.join(this.baseDir, 'services');
    this.entitiesDir = path.join(this.baseDir, 'entities');
    this.dtoDir = path.join(this.baseDir, 'dto');
  }

  async generate(resourceName, operations = ['create', 'read', 'update', 'delete']) {
    console.log(`🚀 API 엔드포인트 '${resourceName}' 생성 중...\n`);

    try {
      await this.validateInputs(resourceName, operations);
      await this.createDirectories();
      await this.generateEntity(resourceName);
      await this.generateDTO(resourceName, operations);
      await this.generateService(resourceName, operations);
      await this.generateController(resourceName, operations);
      await this.generateRouter(resourceName, operations);
      await this.generateTests(resourceName, operations);
      await this.updateMainRouter(resourceName);
      
      console.log(`\n✅ API 엔드포인트 '${resourceName}' 생성 완료!`);
      this.showAPIEndpoints(resourceName, operations);
    } catch (error) {
      console.error('❌ 생성 실패:', error.message);
      process.exit(1);
    }
  }

  async validateInputs(resourceName, operations) {
    if (!resourceName || resourceName.length < 2) {
      throw new Error('리소스 이름은 최소 2글자 이상이어야 합니다.');
    }

    if (!/^[a-z][a-zA-Z0-9]*$/.test(resourceName)) {
      throw new Error('리소스 이름은 camelCase로 작성해야 합니다. (예: user, blogPost)');
    }

    const validOperations = ['create', 'read', 'update', 'delete', 'list'];
    const invalidOps = operations.filter(op => !validOperations.includes(op));
    if (invalidOps.length > 0) {
      throw new Error(`지원되지 않는 작업: ${invalidOps.join(', ')}. 사용 가능: ${validOperations.join(', ')}`);
    }
  }

  async createDirectories() {
    const dirs = [this.routesDir, this.controllersDir, this.servicesDir, this.entitiesDir, this.dtoDir];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async generateEntity(resourceName) {
    const className = this.toPascalCase(resourceName);
    const tableName = this.toSnakeCase(this.toPlural(resourceName));

    const content = `import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

@Entity('${tableName}')
@Index(['createdAt'])
export class ${className} {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // TODO: 추가 필드들을 여기에 정의하세요
  // 예시:
  // @Column({ type: 'varchar', unique: true })
  // email: string;
  //
  // @Column({ type: 'jsonb', nullable: true })
  // metadata?: Record<string, any>;
  //
  // @ManyToOne(() => User, user => user.${this.toPlural(resourceName)})
  // user: User;
}
`;

    const filePath = path.join(this.entitiesDir, `${className}.ts`);
    await fs.writeFile(filePath, content);
    console.log(`📄 Entity 생성: ${path.relative(process.cwd(), filePath)}`);
  }

  async generateDTO(resourceName, operations) {
    const className = this.toPascalCase(resourceName);

    // Create DTO
    if (operations.includes('create')) {
      const createDTOContent = `import { IsString, IsOptional, IsBoolean, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class Create${className}Dto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean = true;

  // TODO: 추가 필드 검증 규칙을 여기에 정의하세요
}
`;

      const createFilePath = path.join(this.dtoDir, `create-${this.toKebabCase(resourceName)}.dto.ts`);
      await fs.writeFile(createFilePath, createDTOContent);
      console.log(`📄 Create DTO 생성: ${path.relative(process.cwd(), createFilePath)}`);
    }

    // Update DTO
    if (operations.includes('update')) {
      const updateDTOContent = `import { IsString, IsOptional, IsBoolean, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class Update${className}Dto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  // TODO: 업데이트 가능한 필드들을 여기에 정의하세요
}
`;

      const updateFilePath = path.join(this.dtoDir, `update-${this.toKebabCase(resourceName)}.dto.ts`);
      await fs.writeFile(updateFilePath, updateDTOContent);
      console.log(`📄 Update DTO 생성: ${path.relative(process.cwd(), updateFilePath)}`);
    }

    // Query DTO (for list operations)
    if (operations.includes('list')) {
      const queryDTOContent = `import { IsOptional, IsString, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class Query${className}Dto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  // TODO: 추가 필터 옵션들을 여기에 정의하세요
}
`;

      const queryFilePath = path.join(this.dtoDir, `query-${this.toKebabCase(resourceName)}.dto.ts`);
      await fs.writeFile(queryFilePath, queryDTOContent);
      console.log(`📄 Query DTO 생성: ${path.relative(process.cwd(), queryFilePath)}`);
    }
  }

  async generateService(resourceName, operations) {
    const className = this.toPascalCase(resourceName);
    const serviceName = `${className}Service`;

    let imports = `import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like } from 'typeorm';
import { ${className} } from '../entities/${className}';`;

    if (operations.includes('create')) {
      imports += `\nimport { Create${className}Dto } from '../dto/create-${this.toKebabCase(resourceName)}.dto';`;
    }
    if (operations.includes('update')) {
      imports += `\nimport { Update${className}Dto } from '../dto/update-${this.toKebabCase(resourceName)}.dto';`;
    }
    if (operations.includes('list')) {
      imports += `\nimport { Query${className}Dto } from '../dto/query-${this.toKebabCase(resourceName)}.dto';`;
    }

    const content = `${imports}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ${serviceName} {
  constructor(
    @InjectRepository(${className})
    private ${resourceName}Repository: Repository<${className}>
  ) {}

${operations.includes('create') ? `
  async create(create${className}Dto: Create${className}Dto): Promise<${className}> {
    try {
      const ${resourceName} = this.${resourceName}Repository.create(create${className}Dto);
      return await this.${resourceName}Repository.save(${resourceName});
    } catch (error) {
      throw new BadRequestException('Failed to create ${resourceName}');
    }
  }
` : ''}

${operations.includes('list') ? `
  async findAll(query${className}Dto: Query${className}Dto): Promise<PaginatedResult<${className}>> {
    const { page, limit, search, isActive, sortBy, sortOrder } = query${className}Dto;
    
    const options: FindManyOptions<${className}> = {
      skip: (page - 1) * limit,
      take: limit,
      order: { [sortBy]: sortOrder },
      where: {}
    };

    // 검색 조건 추가
    if (search) {
      options.where = [
        { name: Like(\`%\${search}%\`) },
        { description: Like(\`%\${search}%\`) }
      ];
    }

    // 활성화 상태 필터
    if (isActive !== undefined) {
      options.where = { ...options.where, isActive };
    }

    const [data, total] = await this.${resourceName}Repository.findAndCount(options);
    
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
` : ''}

${operations.includes('read') ? `
  async findOne(id: string): Promise<${className}> {
    const ${resourceName} = await this.${resourceName}Repository.findOne({ 
      where: { id }
    });
    
    if (!${resourceName}) {
      throw new NotFoundException(\`${className} with ID \${id} not found\`);
    }
    
    return ${resourceName};
  }
` : ''}

${operations.includes('update') ? `
  async update(id: string, update${className}Dto: Update${className}Dto): Promise<${className}> {
    const ${resourceName} = await this.findOne(id);
    
    Object.assign(${resourceName}, update${className}Dto);
    
    try {
      return await this.${resourceName}Repository.save(${resourceName});
    } catch (error) {
      throw new BadRequestException('Failed to update ${resourceName}');
    }
  }
` : ''}

${operations.includes('delete') ? `
  async remove(id: string): Promise<void> {
    const ${resourceName} = await this.findOne(id);
    await this.${resourceName}Repository.remove(${resourceName});
  }

  async softDelete(id: string): Promise<${className}> {
    const ${resourceName} = await this.findOne(id);
    ${resourceName}.isActive = false;
    return await this.${resourceName}Repository.save(${resourceName});
  }
` : ''}

  // TODO: 추가 비즈니스 로직 메서드들을 여기에 구현하세요
  // 예시:
  // async findByUser(userId: string): Promise<${className}[]> {
  //   return this.${resourceName}Repository.find({ where: { userId } });
  // }
}
`;

    const filePath = path.join(this.servicesDir, `${this.toKebabCase(resourceName)}.service.ts`);
    await fs.writeFile(filePath, content);
    console.log(`📄 Service 생성: ${path.relative(process.cwd(), filePath)}`);
  }

  async generateController(resourceName, operations) {
    const className = this.toPascalCase(resourceName);
    const controllerName = `${className}Controller`;
    const serviceName = `${className}Service`;

    let imports = `import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ${serviceName} } from '../services/${this.toKebabCase(resourceName)}.service';
import { AuthGuard } from '../guards/auth.guard';
import { ${className} } from '../entities/${className}';`;

    if (operations.includes('create')) {
      imports += `\nimport { Create${className}Dto } from '../dto/create-${this.toKebabCase(resourceName)}.dto';`;
    }
    if (operations.includes('update')) {
      imports += `\nimport { Update${className}Dto } from '../dto/update-${this.toKebabCase(resourceName)}.dto';`;
    }
    if (operations.includes('list')) {
      imports += `\nimport { Query${className}Dto } from '../dto/query-${this.toKebabCase(resourceName)}.dto';`;
    }

    const content = `${imports}

@ApiTags('${this.toPlural(resourceName)}')
@Controller('api/v1/${this.toKebabCase(this.toPlural(resourceName))}')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ${controllerName} {
  constructor(private readonly ${resourceName}Service: ${serviceName}) {}

${operations.includes('create') ? `
  @Post()
  @ApiOperation({ summary: 'Create a new ${resourceName}' })
  @ApiResponse({ status: 201, description: 'The ${resourceName} has been successfully created.', type: ${className} })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(@Body() create${className}Dto: Create${className}Dto): Promise<{
    success: boolean;
    data: ${className};
    message: string;
  }> {
    try {
      const ${resourceName} = await this.${resourceName}Service.create(create${className}Dto);
      
      return {
        success: true,
        data: ${resourceName},
        message: '${className} created successfully'
      };
    } catch (error) {
      throw error;
    }
  }
` : ''}

${operations.includes('list') ? `
  @Get()
  @ApiOperation({ summary: 'Get all ${this.toPlural(resourceName)} with pagination' })
  @ApiResponse({ status: 200, description: 'List of ${this.toPlural(resourceName)}.', type: [${className}] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(@Query() query${className}Dto: Query${className}Dto): Promise<{
    success: boolean;
    data: any;
    message: string;
  }> {
    try {
      const result = await this.${resourceName}Service.findAll(query${className}Dto);
      
      return {
        success: true,
        data: result,
        message: '${this.toPascalCase(this.toPlural(resourceName))} retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }
` : ''}

${operations.includes('read') ? `
  @Get(':id')
  @ApiOperation({ summary: 'Get a ${resourceName} by ID' })
  @ApiResponse({ status: 200, description: 'The ${resourceName}.', type: ${className} })
  @ApiResponse({ status: 404, description: '${className} not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findOne(@Param('id') id: string): Promise<{
    success: boolean;
    data: ${className};
    message: string;
  }> {
    try {
      const ${resourceName} = await this.${resourceName}Service.findOne(id);
      
      return {
        success: true,
        data: ${resourceName},
        message: '${className} retrieved successfully'
      };
    } catch (error) {
      throw error;
    }
  }
` : ''}

${operations.includes('update') ? `
  @Patch(':id')
  @ApiOperation({ summary: 'Update a ${resourceName}' })
  @ApiResponse({ status: 200, description: 'The ${resourceName} has been successfully updated.', type: ${className} })
  @ApiResponse({ status: 404, description: '${className} not found.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async update(
    @Param('id') id: string,
    @Body() update${className}Dto: Update${className}Dto
  ): Promise<{
    success: boolean;
    data: ${className};
    message: string;
  }> {
    try {
      const ${resourceName} = await this.${resourceName}Service.update(id, update${className}Dto);
      
      return {
        success: true,
        data: ${resourceName},
        message: '${className} updated successfully'
      };
    } catch (error) {
      throw error;
    }
  }
` : ''}

${operations.includes('delete') ? `
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a ${resourceName}' })
  @ApiResponse({ status: 204, description: 'The ${resourceName} has been successfully deleted.' })
  @ApiResponse({ status: 404, description: '${className} not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.${resourceName}Service.remove(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Soft delete a ${resourceName}' })
  @ApiResponse({ status: 200, description: 'The ${resourceName} has been deactivated.', type: ${className} })
  @ApiResponse({ status: 404, description: '${className} not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async deactivate(@Param('id') id: string): Promise<{
    success: boolean;
    data: ${className};
    message: string;
  }> {
    try {
      const ${resourceName} = await this.${resourceName}Service.softDelete(id);
      
      return {
        success: true,
        data: ${resourceName},
        message: '${className} deactivated successfully'
      };
    } catch (error) {
      throw error;
    }
  }
` : ''}
}
`;

    const filePath = path.join(this.controllersDir, `${this.toKebabCase(resourceName)}.controller.ts`);
    await fs.writeFile(filePath, content);
    console.log(`📄 Controller 생성: ${path.relative(process.cwd(), filePath)}`);
  }

  async generateRouter(resourceName, operations) {
    // Express 라우터 버전 (NestJS 대신 Express를 사용하는 경우)
    const className = this.toPascalCase(resourceName);
    
    const content = `import express from 'express';
import { ${this.toKebabCase(resourceName)}Controller } from '../controllers/${this.toKebabCase(resourceName)}.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { ${className} } from '../entities/${className}';

const router = express.Router();
const controller = new ${this.toPascalCase(resourceName)}Controller();

// API 문서용 스키마 정의
export const ${resourceName}Schema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', maxLength: 255 },
    description: { type: 'string', maxLength: 1000 },
    isActive: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'name', 'createdAt', 'updatedAt']
};

${operations.includes('list') ? `
/**
 * @swagger
 * /api/v1/${this.toKebabCase(this.toPlural(resourceName))}:
 *   get:
 *     summary: Get all ${this.toPlural(resourceName)}
 *     tags: [${this.toPascalCase(this.toPlural(resourceName))}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of ${this.toPlural(resourceName)}
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/${className}'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/', authMiddleware, controller.findAll.bind(controller));
` : ''}

${operations.includes('create') ? `
/**
 * @swagger
 * /api/v1/${this.toKebabCase(this.toPlural(resourceName))}:
 *   post:
 *     summary: Create a new ${resourceName}
 *     tags: [${this.toPascalCase(this.toPlural(resourceName))}]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: ${className} created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/${className}'
 */
router.post('/', authMiddleware, validateRequest, controller.create.bind(controller));
` : ''}

${operations.includes('read') ? `
/**
 * @swagger
 * /api/v1/${this.toKebabCase(this.toPlural(resourceName))}/{id}:
 *   get:
 *     summary: Get a ${resourceName} by ID
 *     tags: [${this.toPascalCase(this.toPlural(resourceName))}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: ${className} details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/${className}'
 */
router.get('/:id', authMiddleware, controller.findOne.bind(controller));
` : ''}

${operations.includes('update') ? `
/**
 * @swagger
 * /api/v1/${this.toKebabCase(this.toPlural(resourceName))}/${id}:
 *   patch:
 *     summary: Update a ${resourceName}
 *     tags: [${this.toPascalCase(this.toPlural(resourceName))}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: ${className} updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/${className}'
 */
router.patch('/:id', authMiddleware, validateRequest, controller.update.bind(controller));
` : ''}

${operations.includes('delete') ? `
/**
 * @swagger
 * /api/v1/${this.toKebabCase(this.toPlural(resourceName))}/${id}:
 *   delete:
 *     summary: Delete a ${resourceName}
 *     tags: [${this.toPascalCase(this.toPlural(resourceName))}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: ${className} deleted successfully
 */
router.delete('/:id', authMiddleware, controller.remove.bind(controller));

/**
 * @swagger
 * /api/v1/${this.toKebabCase(this.toPlural(resourceName))}/${id}/deactivate:
 *   patch:
 *     summary: Deactivate a ${resourceName}
 *     tags: [${this.toPascalCase(this.toPlural(resourceName))}]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: ${className} deactivated successfully
 */
router.patch('/:id/deactivate', authMiddleware, controller.deactivate.bind(controller));
` : ''}

export default router;
`;

    const filePath = path.join(this.routesDir, `${this.toKebabCase(resourceName)}.routes.ts`);
    await fs.writeFile(filePath, content);
    console.log(`📄 Router 생성: ${path.relative(process.cwd(), filePath)}`);
  }

  async generateTests(resourceName, operations) {
    const className = this.toPascalCase(resourceName);
    
    // Service 테스트
    const serviceTestContent = `import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ${className}Service } from '../services/${this.toKebabCase(resourceName)}.service';
import { ${className} } from '../entities/${className}';

describe('${className}Service', () => {
  let service: ${className}Service;
  let repository: Repository<${className}>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
    delete: jest.fn()
  };

  const mock${className} = {
    id: 'test-id',
    name: 'Test ${className}',
    description: 'Test description',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ${className}Service,
        {
          provide: getRepositoryToken(${className}),
          useValue: mockRepository
        }
      ]
    }).compile();

    service = module.get<${className}Service>(${className}Service);
    repository = module.get<Repository<${className}>>(getRepositoryToken(${className}));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

${operations.includes('create') ? `
  describe('create', () => {
    it('should create a ${resourceName} successfully', async () => {
      const create${className}Dto = {
        name: 'Test ${className}',
        description: 'Test description'
      };

      mockRepository.create.mockReturnValue(mock${className});
      mockRepository.save.mockResolvedValue(mock${className});

      const result = await service.create(create${className}Dto);

      expect(mockRepository.create).toHaveBeenCalledWith(create${className}Dto);
      expect(mockRepository.save).toHaveBeenCalledWith(mock${className});
      expect(result).toEqual(mock${className});
    });

    it('should throw BadRequestException when creation fails', async () => {
      const create${className}Dto = {
        name: 'Test ${className}',
        description: 'Test description'
      };

      mockRepository.create.mockReturnValue(mock${className});
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(create${className}Dto)).rejects.toThrow(BadRequestException);
    });
  });
` : ''}

${operations.includes('read') ? `
  describe('findOne', () => {
    it('should return a ${resourceName} when found', async () => {
      mockRepository.findOne.mockResolvedValue(mock${className});

      const result = await service.findOne('test-id');

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 'test-id' } });
      expect(result).toEqual(mock${className});
    });

    it('should throw NotFoundException when ${resourceName} not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('test-id')).rejects.toThrow(NotFoundException);
    });
  });
` : ''}

${operations.includes('update') ? `
  describe('update', () => {
    it('should update a ${resourceName} successfully', async () => {
      const update${className}Dto = { name: 'Updated ${className}' };
      const updated${className} = { ...mock${className}, ...update${className}Dto };

      mockRepository.findOne.mockResolvedValue(mock${className});
      mockRepository.save.mockResolvedValue(updated${className});

      const result = await service.update('test-id', update${className}Dto);

      expect(result).toEqual(updated${className});
    });

    it('should throw NotFoundException when ${resourceName} not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('test-id', {})).rejects.toThrow(NotFoundException);
    });
  });
` : ''}

${operations.includes('delete') ? `
  describe('remove', () => {
    it('should remove a ${resourceName} successfully', async () => {
      mockRepository.findOne.mockResolvedValue(mock${className});
      mockRepository.remove.mockResolvedValue(mock${className});

      await service.remove('test-id');

      expect(mockRepository.remove).toHaveBeenCalledWith(mock${className});
    });

    it('should throw NotFoundException when ${resourceName} not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('test-id')).rejects.toThrow(NotFoundException);
    });
  });
` : ''}
});
`;

    const serviceTestPath = path.join(this.baseDir, 'tests', `${this.toKebabCase(resourceName)}.service.test.ts`);
    await fs.mkdir(path.dirname(serviceTestPath), { recursive: true });
    await fs.writeFile(serviceTestPath, serviceTestContent);
    console.log(`📄 Service 테스트 생성: ${path.relative(process.cwd(), serviceTestPath)}`);

    // Controller 테스트
    const controllerTestContent = `import { Test, TestingModule } from '@nestjs/testing';
import { ${className}Controller } from '../controllers/${this.toKebabCase(resourceName)}.controller';
import { ${className}Service } from '../services/${this.toKebabCase(resourceName)}.service';

describe('${className}Controller', () => {
  let controller: ${className}Controller;
  let service: ${className}Service;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    softDelete: jest.fn()
  };

  const mock${className} = {
    id: 'test-id',
    name: 'Test ${className}',
    description: 'Test description',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [${className}Controller],
      providers: [
        {
          provide: ${className}Service,
          useValue: mockService
        }
      ]
    }).compile();

    controller = module.get<${className}Controller>(${className}Controller);
    service = module.get<${className}Service>(${className}Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

${operations.includes('create') ? `
  describe('create', () => {
    it('should create a ${resourceName} successfully', async () => {
      const create${className}Dto = {
        name: 'Test ${className}',
        description: 'Test description'
      };

      mockService.create.mockResolvedValue(mock${className});

      const result = await controller.create(create${className}Dto);

      expect(service.create).toHaveBeenCalledWith(create${className}Dto);
      expect(result).toEqual({
        success: true,
        data: mock${className},
        message: '${className} created successfully'
      });
    });
  });
` : ''}

${operations.includes('read') ? `
  describe('findOne', () => {
    it('should return a ${resourceName} by id', async () => {
      mockService.findOne.mockResolvedValue(mock${className});

      const result = await controller.findOne('test-id');

      expect(service.findOne).toHaveBeenCalledWith('test-id');
      expect(result).toEqual({
        success: true,
        data: mock${className},
        message: '${className} retrieved successfully'
      });
    });
  });
` : ''}
});
`;

    const controllerTestPath = path.join(this.baseDir, 'tests', `${this.toKebabCase(resourceName)}.controller.test.ts`);
    await fs.writeFile(controllerTestPath, controllerTestContent);
    console.log(`📄 Controller 테스트 생성: ${path.relative(process.cwd(), controllerTestPath)}`);
  }

  async updateMainRouter(resourceName) {
    const routerPath = path.join(this.baseDir, 'app.ts');
    
    try {
      let content = await fs.readFile(routerPath, 'utf8');
      
      const importLine = `import ${resourceName}Routes from './routes/${this.toKebabCase(resourceName)}.routes';`;
      const useLine = `app.use('/api/v1/${this.toKebabCase(this.toPlural(resourceName))}', ${resourceName}Routes);`;
      
      if (!content.includes(importLine)) {
        // import 추가 (다른 import들 다음에)
        const importIndex = content.lastIndexOf('import ');
        const nextLineIndex = content.indexOf('\n', importIndex);
        content = content.slice(0, nextLineIndex + 1) + importLine + '\n' + content.slice(nextLineIndex + 1);
        
        // 라우터 사용 추가
        if (!content.includes(useLine)) {
          const appUseIndex = content.lastIndexOf('app.use(');
          const nextLineIndex = content.indexOf('\n', appUseIndex);
          content = content.slice(0, nextLineIndex + 1) + useLine + '\n' + content.slice(nextLineIndex + 1);
        }
        
        await fs.writeFile(routerPath, content);
        console.log(`📝 메인 라우터 업데이트: ${path.relative(process.cwd(), routerPath)}`);
      }
    } catch (error) {
      console.warn(`⚠️ 메인 라우터 업데이트 실패: ${error.message}`);
    }
  }

  showAPIEndpoints(resourceName, operations) {
    console.log('\n🌐 생성된 API 엔드포인트:');
    console.log('=' .repeat(50));
    
    const baseUrl = `/api/v1/${this.toKebabCase(this.toPlural(resourceName))}`;
    
    if (operations.includes('list')) {
      console.log(`GET    ${baseUrl}              - ${this.toPlural(resourceName)} 목록 조회`);
    }
    if (operations.includes('create')) {
      console.log(`POST   ${baseUrl}              - ${resourceName} 생성`);
    }
    if (operations.includes('read')) {
      console.log(`GET    ${baseUrl}/:id          - ${resourceName} 상세 조회`);
    }
    if (operations.includes('update')) {
      console.log(`PATCH  ${baseUrl}/:id          - ${resourceName} 수정`);
    }
    if (operations.includes('delete')) {
      console.log(`DELETE ${baseUrl}/:id          - ${resourceName} 삭제`);
      console.log(`PATCH  ${baseUrl}/:id/deactivate - ${resourceName} 비활성화`);
    }
    
    console.log('\n📚 다음 단계:');
    console.log('=' .repeat(40));
    console.log('1. Entity 필드 추가/수정');
    console.log('2. DTO 검증 규칙 추가');
    console.log('3. 비즈니스 로직 구현');
    console.log('4. 테스트 케이스 확장');
    console.log('5. API 문서 확인 (Swagger)');
    console.log('6. 데이터베이스 마이그레이션 실행');
  }

  // 유틸리티 메서드들
  toPascalCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  toKebabCase(str) {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, '');
  }

  toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }

  toPlural(str) {
    if (str.endsWith('y')) {
      return str.slice(0, -1) + 'ies';
    } else if (str.endsWith('s') || str.endsWith('sh') || str.endsWith('ch') || str.endsWith('x') || str.endsWith('z')) {
      return str + 'es';
    } else {
      return str + 's';
    }
  }
}

// CLI 인터페이스
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🚀 API 생성기

사용법:
  npm run cursor:generate-api -- --resource resourceName --operations create,read,update,delete

옵션:
  --resource     리소스 이름 (필수, camelCase)
  --operations   CRUD 작업 목록 (기본값: create,read,update,delete,list)

예시:
  npm run cursor:generate-api -- --resource user --operations create,read,update,delete,list
  npm run cursor:generate-api -- --resource blogPost --operations create,read,list
  npm run cursor:generate-api -- --resource product
`);
    process.exit(0);
  }

  let resourceName = '';
  let operations = ['create', 'read', 'update', 'delete', 'list'];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--resource' && args[i + 1]) {
      resourceName = args[i + 1];
    } else if (args[i] === '--operations' && args[i + 1]) {
      operations = args[i + 1].split(',').map(op => op.trim());
    }
  }

  if (!resourceName) {
    console.error('❌ --resource 옵션이 필요합니다.');
    process.exit(1);
  }

  const generator = new APIGenerator();
  generator.generate(resourceName, operations).catch(console.error);
}

module.exports = APIGenerator;
